import { PrioridadIncidencia, TipoAlerta } from '@prisma/client';

/**
 * Issue 4.60: `registrarManejadores` conecta los avisos a Jefatura solo si hay token de Telegram y
 * un chat de destino. Cada prueba carga el módulo de cero porque recuerda si ya se registró.
 */

const ENV = { ...process.env };

function cargar() {
  const avisos = {
    avisarIncidenciaAJefatura: jest.fn().mockResolvedValue(null),
    avisarAlertaAJefatura: jest.fn().mockResolvedValue(null),
  };
  const notificador = { avisarCambioDeAsignacion: jest.fn().mockResolvedValue(undefined) };
  jest.doMock('../../../src/telegram/cliente', () => ({
    crearClienteTelegram: jest.fn().mockReturnValue({}),
  }));
  jest.doMock('../../../src/lib/prisma', () => ({ prisma: {} }));
  jest.doMock('../../../src/telegram/avisosJefatura', () => ({
    ...jest.requireActual('../../../src/telegram/avisosJefatura'),
    ...avisos,
  }));
  jest.doMock('../../../src/telegram/notificador', () => notificador);

  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { registrarManejadores } = require('../../../src/events/registro');
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { bus } = require('../../../src/events/bus');
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { logger } = require('../../../src/lib/logger');
  const advertencia = jest.spyOn(logger, 'warn').mockImplementation(() => logger);
  return { registrarManejadores, bus, avisos, notificador, advertencia };
}

describe('registrarManejadores (Issues 3.26 y 4.60)', () => {
  beforeEach(() => {
    jest.resetModules();
    process.env = { ...ENV };
  });

  afterAll(() => {
    process.env = ENV;
  });

  it('sin token de Telegram no suscribe nada y lo avisa', async () => {
    delete process.env.TELEGRAM_BOT_TOKEN;
    const { registrarManejadores, bus, avisos, advertencia } = cargar();

    registrarManejadores();
    await bus.emitir('incidencia.registrada', {
      incidenciaId: 'i1',
      prioridad: PrioridadIncidencia.ALTA,
    });

    expect(avisos.avisarIncidenciaAJefatura).not.toHaveBeenCalled();
    expect(advertencia).toHaveBeenCalledWith(expect.stringContaining('TELEGRAM_BOT_TOKEN'));
  });

  it('con token pero sin chat de Jefatura solo avisa a los alumnos', async () => {
    process.env.TELEGRAM_BOT_TOKEN = 'token';
    delete process.env.TELEGRAM_CHAT_JEFATURA;
    const { registrarManejadores, bus, avisos, notificador, advertencia } = cargar();

    registrarManejadores();
    await bus.emitir('asignacion.cambiada', {} as never);
    await bus.emitir('incidencia.registrada', {
      incidenciaId: 'i1',
      prioridad: PrioridadIncidencia.ALTA,
    });

    expect(notificador.avisarCambioDeAsignacion).toHaveBeenCalledTimes(1);
    expect(avisos.avisarIncidenciaAJefatura).not.toHaveBeenCalled();
    expect(advertencia).toHaveBeenCalledWith(expect.stringContaining('TELEGRAM_CHAT_JEFATURA'));
  });

  it('con token y chat avisa a Jefatura de incidencias y alertas, una sola vez', async () => {
    process.env.TELEGRAM_BOT_TOKEN = 'token';
    process.env.TELEGRAM_CHAT_JEFATURA = '-1001, -1002';
    const { registrarManejadores, bus, avisos } = cargar();

    registrarManejadores();
    registrarManejadores(); // la segunda llamada no duplica las suscripciones
    const incidencia = { incidenciaId: 'i1', prioridad: PrioridadIncidencia.ALTA };
    const alerta = {
      alertaId: 'a1',
      tipo: TipoAlerta.SOFTWARE,
      espacioId: 'e1',
      motivo: 'm',
      asignacionesAfectadas: 1,
    };
    await bus.emitir('incidencia.registrada', incidencia);
    await bus.emitir('alerta.creada', alerta);

    expect(avisos.avisarIncidenciaAJefatura).toHaveBeenCalledTimes(1);
    expect(avisos.avisarIncidenciaAJefatura).toHaveBeenCalledWith(
      incidencia,
      expect.objectContaining({ chats: ['-1001', '-1002'] }),
    );
    expect(avisos.avisarAlertaAJefatura).toHaveBeenCalledTimes(1);
    expect(avisos.avisarAlertaAJefatura).toHaveBeenCalledWith(
      alerta,
      expect.objectContaining({ chats: ['-1001', '-1002'] }),
    );
  });
});
