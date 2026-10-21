import { DiaSemana } from '@prisma/client';
import { AsignacionCambiadaEvento } from '../../../src/events/tipos';
import { ClienteTelegram, ErrorTelegram } from '../../../src/telegram/cliente';
import { ColaEnvios } from '../../../src/telegram/cola';
import {
  avisarCambioDeAsignacion,
  enviarConReintentos,
  formatearAvisoCambioAula,
} from '../../../src/telegram/notificador';

function eventoBase(): AsignacionCambiadaEvento {
  return {
    seccionId: 'sec-1',
    codigoCurso: 'ISW301',
    nombreCurso: 'Ingeniería de Software',
    codigoSeccion: '01',
    periodo: '2026-1',
    espaciosAnteriores: [{ id: 'e1', identificador: 'Aula 101' }],
    espaciosNuevos: [{ id: 'e2', identificador: 'Lab 201' }],
    horarios: [
      {
        diaSemana: DiaSemana.LUNES,
        horaInicio: '08:00',
        horaFin: '10:00',
      },
      {
        diaSemana: DiaSemana.MIERCOLES,
        horaInicio: '10:00',
        horaFin: '12:00',
      },
    ],
  };
}

describe('formatearAvisoCambioAula (Issue 3.26)', () => {
  it('formatea el texto con el curso, sección, aula anterior, nueva y horario', () => {
    const texto = formatearAvisoCambioAula(eventoBase());

    expect(texto).toContain('Cambio de aula');
    expect(texto).toContain('ISW301 - Ingeniería de Software');
    expect(texto).toContain('Sección: 01');
    expect(texto).toContain('Antes: Aula 101');
    expect(texto).toContain('Ahora: Lab 201');
    expect(texto).toContain('Horario: Lunes 08:00-10:00; Miércoles 10:00-12:00');
  });

  it('muestra "sin aula" y "sin horario registrado" cuando faltan datos', () => {
    const evento = {
      ...eventoBase(),
      espaciosAnteriores: [],
      espaciosNuevos: [],
      horarios: [],
    };
    const texto = formatearAvisoCambioAula(evento);

    expect(texto).toContain('Antes: sin aula');
    expect(texto).toContain('Ahora: sin aula');
    expect(texto).toContain('Horario: sin horario registrado');
  });

  it('cumple RNF-11: nunca incluye datos de salud ni de movilidad reducida', () => {
    const texto = formatearAvisoCambioAula(eventoBase());

    const terminosProhibidos = [
      'salud',
      'medica',
      'médica',
      'movilidad',
      'discapacidad',
      'reducida',
      'ficha',
      'alergia',
      'sangre',
    ];

    terminosProhibidos.forEach((termino) => {
      expect(texto.toLowerCase()).not.toContain(termino);
    });
  });
});

describe('enviarConReintentos (Issue 3.26)', () => {
  let cliente: jest.Mocked<ClienteTelegram>;
  let cola: ColaEnvios;

  beforeEach(() => {
    cliente = {
      enviarMensaje: jest.fn().mockResolvedValue(undefined),
      borrarMensaje: jest.fn().mockResolvedValue(undefined),
    };
    cola = new ColaEnvios(0);
  });

  it('envía con éxito al primer intento', async () => {
    const resultado = await enviarConReintentos(cliente, '123', 'hola', cola);
    expect(resultado).toBe('ENVIADO');
    expect(cliente.enviarMensaje).toHaveBeenCalledTimes(1);
  });

  it('retorna BLOQUEADO inmediatamente sin reintentar si el usuario bloqueó el bot (403)', async () => {
    cliente.enviarMensaje.mockRejectedValue(new ErrorTelegram(403, 'Forbidden: bot was blocked'));
    const esperar = jest.fn();

    const resultado = await enviarConReintentos(cliente, '123', 'hola', cola, esperar);

    expect(resultado).toBe('BLOQUEADO');
    expect(cliente.enviarMensaje).toHaveBeenCalledTimes(1);
    expect(esperar).not.toHaveBeenCalled();
  });

  it('reintenta errores transitorios (red código 0, 429, 500) y si luego tiene éxito retorna ENVIADO', async () => {
    cliente.enviarMensaje
      .mockRejectedValueOnce(new ErrorTelegram(0, 'Network failure'))
      .mockRejectedValueOnce(new ErrorTelegram(429, 'Too Many Requests'))
      .mockResolvedValueOnce(undefined);

    const esperar = jest.fn().mockResolvedValue(undefined);

    const resultado = await enviarConReintentos(cliente, '123', 'hola', cola, esperar);

    expect(resultado).toBe('ENVIADO');
    expect(cliente.enviarMensaje).toHaveBeenCalledTimes(3);
    expect(esperar).toHaveBeenCalledTimes(2);
    expect(esperar).toHaveBeenNthCalledWith(1, 1000);
    expect(esperar).toHaveBeenNthCalledWith(2, 2000);
  });

  it('retorna FALLIDO si agota los 3 intentos con error transitorio', async () => {
    cliente.enviarMensaje.mockRejectedValue(new ErrorTelegram(502, 'Bad Gateway'));
    const esperar = jest.fn().mockResolvedValue(undefined);

    const resultado = await enviarConReintentos(cliente, '123', 'hola', cola, esperar);

    expect(resultado).toBe('FALLIDO');
    expect(cliente.enviarMensaje).toHaveBeenCalledTimes(3);
  });

  it('retorna FALLIDO de inmediato para error no transitorio (ej. 400)', async () => {
    cliente.enviarMensaje.mockRejectedValue(new ErrorTelegram(400, 'Bad Request: chat not found'));
    const esperar = jest.fn();

    const resultado = await enviarConReintentos(cliente, '123', 'hola', cola, esperar);

    expect(resultado).toBe('FALLIDO');
    expect(cliente.enviarMensaje).toHaveBeenCalledTimes(1);
    expect(esperar).not.toHaveBeenCalled();
  });
});

describe('avisarCambioDeAsignacion (Issue 3.26)', () => {
  let cliente: jest.Mocked<ClienteTelegram>;
  let cola: ColaEnvios;

  beforeEach(() => {
    cliente = {
      enviarMensaje: jest.fn().mockResolvedValue(undefined),
      borrarMensaje: jest.fn().mockResolvedValue(undefined),
    };
    cola = new ColaEnvios(0);
  });

  it('no envía nada si no hay alumnos con vinculación activa', async () => {
    const prisma = {
      vinculacionTelegram: {
        findMany: jest.fn().mockResolvedValue([]),
        updateMany: jest.fn(),
      },
    } as any;

    const resumen = await avisarCambioDeAsignacion(eventoBase(), { prisma, cliente, cola });

    expect(resumen).toEqual({
      destinatarios: 0,
      enviados: 0,
      desactivados: 0,
      fallidos: 0,
    });
    expect(cliente.enviarMensaje).not.toHaveBeenCalled();
  });

  it('envía a los alumnos vinculados y cuenta los enviados', async () => {
    const prisma = {
      vinculacionTelegram: {
        findMany: jest.fn().mockResolvedValue([
          { id: 'v1', chatId: '1001' },
          { id: 'v2', chatId: '1002' },
        ]),
        updateMany: jest.fn(),
      },
    } as any;

    const resumen = await avisarCambioDeAsignacion(eventoBase(), { prisma, cliente, cola });

    expect(resumen.destinatarios).toBe(2);
    expect(resumen.enviados).toBe(2);
    expect(cliente.enviarMensaje).toHaveBeenCalledWith('1001', expect.stringContaining('ISW301'));
    expect(cliente.enviarMensaje).toHaveBeenCalledWith('1002', expect.stringContaining('ISW301'));
  });

  it('desactiva la vinculación en la BD si el alumno bloqueó el bot (403)', async () => {
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

    const prisma = {
      vinculacionTelegram: {
        findMany: jest.fn().mockResolvedValue([{ id: 'v-bloq', chatId: '9999' }]),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
    } as any;

    cliente.enviarMensaje.mockRejectedValue(new ErrorTelegram(403, 'Forbidden: bot was blocked'));

    const resumen = await avisarCambioDeAsignacion(eventoBase(), { prisma, cliente, cola });

    expect(resumen.destinatarios).toBe(1);
    expect(resumen.desactivados).toBe(1);
    expect(resumen.enviados).toBe(0);

    expect(prisma.vinculacionTelegram.updateMany).toHaveBeenCalledWith({
      where: { id: 'v-bloq' },
      data: expect.objectContaining({ activo: false, fechaBaja: expect.any(Date) }),
    });

    warnSpy.mockRestore();
  });

  it('cuenta como fallido si agota reintentos y no propaga la excepción', async () => {
    const errSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    const prisma = {
      vinculacionTelegram: {
        findMany: jest.fn().mockResolvedValue([{ id: 'v-fail', chatId: '8888' }]),
        updateMany: jest.fn(),
      },
    } as any;

    cliente.enviarMensaje.mockRejectedValue(new ErrorTelegram(500, 'Internal Server Error'));

    const esperar = jest.fn().mockResolvedValue(undefined);
    const resumen = await avisarCambioDeAsignacion(eventoBase(), {
      prisma,
      cliente,
      cola,
      esperar,
    });

    expect(resumen.destinatarios).toBe(1);
    expect(resumen.fallidos).toBe(1);
    expect(resumen.enviados).toBe(0);

    errSpy.mockRestore();
  });
});
