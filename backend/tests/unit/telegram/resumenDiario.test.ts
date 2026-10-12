import { DiaSemana } from '@prisma/client';
import { ClienteTelegram, ErrorTelegram } from '../../../src/telegram/cliente';
import { ColaEnvios } from '../../../src/telegram/cola';
import {
  ClaseDelDia,
  enviarResumenesDiarios,
  fechaEnLima,
  formatearResumenDiario,
} from '../../../src/telegram/resumenDiario.service';

describe('fechaEnLima y formatearResumenDiario (Issue 3.27)', () => {
  it('fechaEnLima devuelve AAAA-MM-DD en hora de Lima', () => {
    // 2026-10-12 03:00 UTC = 2026-10-11 22:00 Lima (UTC-5)
    const fechaUtc = new Date('2026-10-12T03:00:00.000Z');
    expect(fechaEnLima(fechaUtc)).toBe('2026-10-11');

    // 2026-10-12 15:00 UTC = 2026-10-12 10:00 Lima
    const fechaTarde = new Date('2026-10-12T15:00:00.000Z');
    expect(fechaEnLima(fechaTarde)).toBe('2026-10-12');
  });

  it('formatea el resumen con las clases ordenadas por hora de inicio', () => {
    const clases: ClaseDelDia[] = [
      {
        horaInicio: '14:00',
        horaFin: '16:00',
        codigoCurso: 'CS202',
        nombreCurso: 'Base de Datos',
        codigoSeccion: '02',
        espacios: ['Lab 102'],
      },
      {
        horaInicio: '08:00',
        horaFin: '10:00',
        codigoCurso: 'CS101',
        nombreCurso: 'Algoritmos',
        codigoSeccion: '01',
        espacios: ['Aula 201'],
      },
    ];

    const texto = formatearResumenDiario(DiaSemana.LUNES, '2026-03-23', clases);

    expect(texto).toContain('Tus clases de hoy, Lunes 23/03');
    // Algoritmos (08:00) debe aparecer antes que Base de Datos (14:00)
    const posAlgo = texto.indexOf('08:00-10:00  CS101');
    const posBd = texto.indexOf('14:00-16:00  CS202');
    expect(posAlgo).toBeLessThan(posBd);
  });

  it('muestra "aula por confirmar" cuando la clase no tiene espacios asignados', () => {
    const clases: ClaseDelDia[] = [
      {
        horaInicio: '10:00',
        horaFin: '12:00',
        codigoCurso: 'CS301',
        nombreCurso: 'Redes',
        codigoSeccion: '01',
        espacios: [],
      },
    ];

    const texto = formatearResumenDiario(DiaSemana.MIERCOLES, '2026-03-25', clases);
    expect(texto).toContain('aula por confirmar');
  });

  it('cumple RNF-11: el resumen nunca contiene datos médicos ni de salud', () => {
    const clases: ClaseDelDia[] = [
      {
        horaInicio: '08:00',
        horaFin: '10:00',
        codigoCurso: 'CS101',
        nombreCurso: 'Algoritmos',
        codigoSeccion: '01',
        espacios: ['Aula 101'],
      },
    ];
    const texto = formatearResumenDiario(DiaSemana.LUNES, '2026-03-23', clases);

    const terminosProhibidos = [
      'salud',
      'medica',
      'médica',
      'movilidad',
      'discapacidad',
      'reducida',
      'ficha',
      'sangre',
    ];
    terminosProhibidos.forEach((t) => expect(texto.toLowerCase()).not.toContain(t));
  });
});

describe('enviarResumenesDiarios (Issue 3.27)', () => {
  let cliente: jest.Mocked<ClienteTelegram>;
  let cola: ColaEnvios;

  beforeEach(() => {
    cliente = {
      enviarMensaje: jest.fn().mockResolvedValue(undefined),
      borrarMensaje: jest.fn().mockResolvedValue(undefined),
    };
    cola = new ColaEnvios(0);
  });

  it('retorna resumen en ceros si no hay periodo vigente', async () => {
    const prisma = {
      seccion: { findFirst: jest.fn().mockResolvedValue(null) },
    } as any;

    const res = await enviarResumenesDiarios({ prisma, cliente, cola });

    expect(res).toEqual({
      destinatarios: 0,
      enviados: 0,
      sinClases: 0,
      desactivados: 0,
      fallidos: 0,
    });
    expect(cliente.enviarMensaje).not.toHaveBeenCalled();
  });

  it('envía resumen de clases a alumnos vinculados que tienen clases hoy', async () => {
    const ahora = new Date('2026-03-23T15:00:00.000Z'); // Lunes 10:00 Lima

    const matricula = {
      seccion: {
        codigoSeccion: '01',
        curso: { codigo: 'CS101', nombre: 'Algoritmos' },
        horarios: [{ horaInicio: '08:00', horaFin: '10:00' }],
        asignaciones: [
          {
            espacios: [{ espacio: { identificador: 'Aula 201' } }],
          },
        ],
      },
    };

    const prisma = {
      seccion: { findFirst: jest.fn().mockResolvedValue({ periodo: '2026-1' }) },
      vinculacionTelegram: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: 'v1',
            chatId: '777',
            fechaUltimoResumen: null,
            alumno: { matriculas: [matricula] },
          },
        ]),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
    } as any;

    const res = await enviarResumenesDiarios({ prisma, cliente, cola }, ahora);

    expect(res.destinatarios).toBe(1);
    expect(res.enviados).toBe(1);
    expect(res.sinClases).toBe(0);

    expect(cliente.enviarMensaje).toHaveBeenCalledWith(
      '777',
      expect.stringContaining('CS101 - Algoritmos'),
    );
  });

  it('idempotencia: si otra ejecución ya reclamó el día (count = 0), no envía', async () => {
    const ahora = new Date('2026-03-23T15:00:00.000Z');

    const prisma = {
      seccion: { findFirst: jest.fn().mockResolvedValue({ periodo: '2026-1' }) },
      vinculacionTelegram: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: 'v1',
            chatId: '777',
            fechaUltimoResumen: null,
            alumno: {
              matriculas: [
                {
                  seccion: {
                    codigoSeccion: '01',
                    curso: { codigo: 'CS101', nombre: 'Algoritmos' },
                    horarios: [{ horaInicio: '08:00', horaFin: '10:00' }],
                    asignaciones: [],
                  },
                },
              ],
            },
          },
        ]),
        updateMany: jest.fn().mockResolvedValue({ count: 0 }), // Reclamo falló
      },
    } as any;

    const res = await enviarResumenesDiarios({ prisma, cliente, cola }, ahora);

    expect(res.destinatarios).toBe(1);
    expect(res.enviados).toBe(0);
    expect(cliente.enviarMensaje).not.toHaveBeenCalled();
  });

  it('si el alumno bloqueó el bot (403), desactiva la vinculación', async () => {
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    const ahora = new Date('2026-03-23T15:00:00.000Z');

    const prisma = {
      seccion: { findFirst: jest.fn().mockResolvedValue({ periodo: '2026-1' }) },
      vinculacionTelegram: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: 'v-bloq',
            chatId: '888',
            fechaUltimoResumen: null,
            alumno: {
              matriculas: [
                {
                  seccion: {
                    codigoSeccion: '01',
                    curso: { codigo: 'CS101', nombre: 'Algoritmos' },
                    horarios: [{ horaInicio: '08:00', horaFin: '10:00' }],
                    asignaciones: [],
                  },
                },
              ],
            },
          },
        ]),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
    } as any;

    cliente.enviarMensaje.mockRejectedValue(new ErrorTelegram(403, 'Forbidden: blocked'));

    const res = await enviarResumenesDiarios({ prisma, cliente, cola }, ahora);

    expect(res.desactivados).toBe(1);
    expect(res.enviados).toBe(0);

    // Debe registrar la desactivación
    expect(prisma.vinculacionTelegram.updateMany).toHaveBeenCalledWith({
      where: { id: 'v-bloq' },
      data: expect.objectContaining({ activo: false }),
    });

    warnSpy.mockRestore();
  });

  it('si el envío falla, restaura fechaUltimoResumen para permitir reintento posterior', async () => {
    const errSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    const ahora = new Date('2026-03-23T15:00:00.000Z');
    const fechaPrevia = new Date('2026-03-20T00:00:00.000Z');

    const prisma = {
      seccion: { findFirst: jest.fn().mockResolvedValue({ periodo: '2026-1' }) },
      vinculacionTelegram: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: 'v-fail',
            chatId: '999',
            fechaUltimoResumen: fechaPrevia,
            alumno: {
              matriculas: [
                {
                  seccion: {
                    codigoSeccion: '01',
                    curso: { codigo: 'CS101', nombre: 'Algoritmos' },
                    horarios: [{ horaInicio: '08:00', horaFin: '10:00' }],
                    asignaciones: [],
                  },
                },
              ],
            },
          },
        ]),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
    } as any;

    cliente.enviarMensaje.mockRejectedValue(new ErrorTelegram(500, 'Server Error'));
    const esperar = jest.fn().mockResolvedValue(undefined);

    const res = await enviarResumenesDiarios({ prisma, cliente, cola, esperar }, ahora);

    expect(res.fallidos).toBe(1);
    expect(res.enviados).toBe(0);

    // Debe restaurar fechaUltimoResumen al valor anterior
    expect(prisma.vinculacionTelegram.updateMany).toHaveBeenCalledWith({
      where: { id: 'v-fail' },
      data: { fechaUltimoResumen: fechaPrevia },
    });

    errSpy.mockRestore();
  });
});
