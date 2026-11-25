import { PrioridadIncidencia, TipoAlerta, TipoIncidencia } from '@prisma/client';
import { AlertaCreadaEvento } from '../../../src/events/tipos';
import { logger } from '../../../src/lib/logger';
import {
  avisarAlertaAJefatura,
  avisarIncidenciaAJefatura,
  chatsDeJefatura,
  DependenciasAvisoJefatura,
  enviarAJefatura,
  formatearAvisoAlerta,
  formatearAvisoIncidencia,
} from '../../../src/telegram/avisosJefatura';
import { ClienteTelegram, ErrorTelegram } from '../../../src/telegram/cliente';
import { ColaEnvios } from '../../../src/telegram/cola';

const INCIDENCIA_BD = {
  id: 'inc-1',
  identificadorSeguimiento: 'INC-3F9A2C1B',
  tipo: TipoIncidencia.EQUIPO_NO_OPERATIVO,
  descripcion: 'No funciona ningún proyector',
  espacio: { identificador: 'LAB-301' },
  asignacion: {
    seccion: { codigoSeccion: '2', curso: { codigo: 'CC-205', nombre: 'Programación' } },
  },
};

const ALERTA: AlertaCreadaEvento = {
  alertaId: 'al-1',
  tipo: TipoAlerta.SOFTWARE,
  espacioId: 'esp-1',
  motivo: 'Software faltante en LAB-301: CC-205 sec. 2 pide StarUML 6',
  asignacionesAfectadas: 2,
};

function crearDeps(chats = ['-1001']) {
  const cliente: jest.Mocked<ClienteTelegram> = {
    enviarMensaje: jest.fn().mockResolvedValue(undefined),
    borrarMensaje: jest.fn().mockResolvedValue(undefined),
  };
  const prisma = {
    incidencia: { findUnique: jest.fn().mockResolvedValue(INCIDENCIA_BD) },
    espacio: { findUnique: jest.fn().mockResolvedValue({ identificador: 'LAB-301' }) },
  };
  const deps: DependenciasAvisoJefatura = {
    prisma: prisma as unknown as DependenciasAvisoJefatura['prisma'],
    cliente,
    chats,
    cola: new ColaEnvios(0),
    esperar: jest.fn().mockResolvedValue(undefined),
  };
  return { deps, cliente, prisma };
}

describe('chatsDeJefatura (Issue 4.60)', () => {
  it('separa por comas y descarta los vacíos', () => {
    expect(chatsDeJefatura(' -1001 , ,-1002,')).toEqual(['-1001', '-1002']);
  });

  it('sin variable devuelve una lista vacía', () => {
    expect(chatsDeJefatura('')).toEqual([]);
  });

  it('lee TELEGRAM_CHAT_JEFATURA si no se le pasa valor', () => {
    const previo = process.env.TELEGRAM_CHAT_JEFATURA;
    process.env.TELEGRAM_CHAT_JEFATURA = '-1003';
    expect(chatsDeJefatura()).toEqual(['-1003']);
    delete process.env.TELEGRAM_CHAT_JEFATURA;
    expect(chatsDeJefatura()).toEqual([]);
    if (previo !== undefined) process.env.TELEGRAM_CHAT_JEFATURA = previo;
  });
});

describe('formatearAvisoIncidencia (Issue 4.60)', () => {
  const base = {
    identificadorSeguimiento: 'INC-3F9A2C1B',
    tipo: TipoIncidencia.SOFTWARE_FALTANTE,
    descripcion: 'Falta StarUML',
    espacio: 'LAB-301',
    curso: 'CC-205 Programación',
    seccion: '2',
  };

  it('incluye código, tipo legible, espacio, clase y descripción', () => {
    const texto = formatearAvisoIncidencia(base);
    expect(texto).toContain('Incidencia de prioridad alta');
    expect(texto).toContain('Código: INC-3F9A2C1B');
    expect(texto).toContain('Tipo: Software faltante');
    expect(texto).toContain('Espacio: LAB-301');
    expect(texto).toContain('Clase: CC-205 Programación - Sección 2');
    expect(texto).toContain('Descripción: Falta StarUML');
    expect(texto).not.toContain('SOFTWARE_FALTANTE');
  });

  it('recorta las descripciones largas y une los saltos de línea', () => {
    const texto = formatearAvisoIncidencia({
      ...base,
      descripcion: `uno\n\ndos ${'x'.repeat(400)}`,
    });
    const linea = texto.split('\n').find((l) => l.startsWith('Descripción:')) ?? '';
    expect(linea.startsWith('Descripción: uno dos')).toBe(true);
    expect(linea.endsWith('…')).toBe(true);
    expect(linea.length).toBe('Descripción: '.length + 200);
  });
});

describe('formatearAvisoAlerta (Issue 4.60)', () => {
  it('muestra el tipo, el espacio, el motivo y las secciones afectadas', () => {
    const texto = formatearAvisoAlerta(ALERTA, 'LAB-301');
    expect(texto).toContain('Nueva alerta de software');
    expect(texto).toContain('Espacio: LAB-301');
    expect(texto).toContain('Motivo: Software faltante en LAB-301');
    expect(texto).toContain('Afecta a: 2 secciones afectadas');
  });

  it('usa el singular con una sección y quita los UUID del motivo', () => {
    const texto = formatearAvisoAlerta(
      {
        tipo: TipoAlerta.CAPACIDAD,
        asignacionesAfectadas: 1,
        motivo: 'Capacidad en 7c1e2b4a-0f00-4bd1-9c55-1a2b3c4d5e6f  insuficiente',
      },
      'AULA-101',
    );
    expect(texto).toContain('Nueva alerta de capacidad');
    expect(texto).toContain('Afecta a: 1 sección afectada');
    expect(texto).toContain('Motivo: Capacidad en insuficiente');
  });
});

describe('enviarAJefatura (Issue 4.60)', () => {
  it('envía a cada chat y cuenta los fallidos sin detenerse ni registrar el chat', async () => {
    const { deps, cliente } = crearDeps(['-1001', '-1002']);
    cliente.enviarMensaje
      .mockRejectedValueOnce(new ErrorTelegram(400, 'Bad Request: chat not found'))
      .mockResolvedValueOnce(undefined);
    const error = jest.spyOn(logger, 'error').mockImplementation(() => logger);

    const resumen = await enviarAJefatura('hola', deps);

    expect(resumen).toEqual({ destinatarios: 2, enviados: 1, fallidos: 1 });
    expect(cliente.enviarMensaje).toHaveBeenCalledTimes(2);
    expect(JSON.stringify(error.mock.calls)).not.toContain('-1001');
    error.mockRestore();
  });
});

describe('avisarIncidenciaAJefatura (Issue 4.60)', () => {
  it('avisa de una incidencia de prioridad alta con sus datos', async () => {
    const { deps, cliente, prisma } = crearDeps();

    const resumen = await avisarIncidenciaAJefatura(
      { incidenciaId: 'inc-1', prioridad: PrioridadIncidencia.ALTA },
      deps,
    );

    expect(resumen).toEqual({ destinatarios: 1, enviados: 1, fallidos: 0 });
    expect(prisma.incidencia.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'inc-1' } }),
    );
    const [chat, texto] = cliente.enviarMensaje.mock.calls[0];
    expect(chat).toBe('-1001');
    expect(texto).toContain('INC-3F9A2C1B');
    expect(texto).toContain('Clase: CC-205 Programación - Sección 2');
  });

  it.each([PrioridadIncidencia.BAJA, PrioridadIncidencia.MEDIA])(
    'no avisa de una incidencia de prioridad %s',
    async (prioridad) => {
      const { deps, cliente, prisma } = crearDeps();
      const resumen = await avisarIncidenciaAJefatura({ incidenciaId: 'inc-1', prioridad }, deps);
      expect(resumen).toBeNull();
      expect(prisma.incidencia.findUnique).not.toHaveBeenCalled();
      expect(cliente.enviarMensaje).not.toHaveBeenCalled();
    },
  );

  it('no hace nada sin chats configurados', async () => {
    const { deps, cliente } = crearDeps([]);
    const resumen = await avisarIncidenciaAJefatura(
      { incidenciaId: 'inc-1', prioridad: PrioridadIncidencia.ALTA },
      deps,
    );
    expect(resumen).toBeNull();
    expect(cliente.enviarMensaje).not.toHaveBeenCalled();
  });

  it('no avisa si la incidencia ya no existe', async () => {
    const { deps, cliente, prisma } = crearDeps();
    prisma.incidencia.findUnique.mockResolvedValue(null);
    const resumen = await avisarIncidenciaAJefatura(
      { incidenciaId: 'inc-x', prioridad: PrioridadIncidencia.ALTA },
      deps,
    );
    expect(resumen).toBeNull();
    expect(cliente.enviarMensaje).not.toHaveBeenCalled();
  });
});

describe('avisarAlertaAJefatura (Issue 4.60)', () => {
  it('avisa de una alerta nueva de software con el identificador del espacio', async () => {
    const { deps, cliente } = crearDeps();

    const resumen = await avisarAlertaAJefatura(ALERTA, deps);

    expect(resumen).toEqual({ destinatarios: 1, enviados: 1, fallidos: 0 });
    expect(cliente.enviarMensaje.mock.calls[0][1]).toContain('Espacio: LAB-301');
  });

  it('usa «sin espacio» si el espacio ya no existe', async () => {
    const { deps, cliente, prisma } = crearDeps();
    prisma.espacio.findUnique.mockResolvedValue(null);
    await avisarAlertaAJefatura({ ...ALERTA, tipo: TipoAlerta.CAPACIDAD }, deps);
    expect(cliente.enviarMensaje.mock.calls[0][1]).toContain('Espacio: sin espacio');
  });

  it('no avisa de las alertas de accesibilidad (dato de salud, RNF-11)', async () => {
    const { deps, cliente, prisma } = crearDeps();
    const resumen = await avisarAlertaAJefatura(
      { ...ALERTA, tipo: TipoAlerta.ACCESIBILIDAD },
      deps,
    );
    expect(resumen).toBeNull();
    expect(prisma.espacio.findUnique).not.toHaveBeenCalled();
    expect(cliente.enviarMensaje).not.toHaveBeenCalled();
  });

  it('no hace nada sin chats configurados', async () => {
    const { deps, cliente } = crearDeps([]);
    expect(await avisarAlertaAJefatura(ALERTA, deps)).toBeNull();
    expect(cliente.enviarMensaje).not.toHaveBeenCalled();
  });
});
