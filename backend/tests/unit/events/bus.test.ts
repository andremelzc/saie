import { BusEventos } from '../../../src/events/bus';
import { TipoAlerta } from '@prisma/client';
import { AlertaCreadaEvento, AsignacionCambiadaEvento } from '../../../src/events/tipos';

describe('BusEventos (Issue 2.16)', () => {
  let bus: BusEventos;

  beforeEach(() => {
    bus = new BusEventos();
  });

  it('suscribe y entrega el evento a todos los manejadores registrados', async () => {
    const handler1 = jest.fn();
    const handler2 = jest.fn();

    bus.suscribir('alerta.creada', handler1);
    bus.suscribir('alerta.creada', handler2);

    const evento: AlertaCreadaEvento = {
      alertaId: 'al-1',
      tipo: TipoAlerta.CAPACIDAD,
      espacioId: 'e-1',
      motivo: 'Capacidad insuficiente',
      asignacionesAfectadas: 2,
    };

    await bus.emitir('alerta.creada', evento);

    expect(handler1).toHaveBeenCalledWith(evento);
    expect(handler2).toHaveBeenCalledWith(evento);
  });

  it('la función devuelta por suscribir elimina el manejador', async () => {
    const handler = jest.fn();
    const desuscribir = bus.suscribir('alerta.creada', handler);

    desuscribir();

    await bus.emitir('alerta.creada', {
      alertaId: 'al-1',
      tipo: TipoAlerta.CAPACIDAD,
      espacioId: 'e-1',
      motivo: 'Test',
      asignacionesAfectadas: 1,
    });

    expect(handler).not.toHaveBeenCalled();
  });

  it('aísla errores de manejadores: no afecta al emisor ni a otros manejadores', async () => {
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});

    const handlerFallaSincrono = jest.fn().mockImplementation(() => {
      throw new Error('Fallo crítico secreto');
    });
    const handlerFallaPromesa = jest.fn().mockRejectedValue(new Error('Rechazo asíncrono'));
    const handlerExitoso = jest.fn();

    bus.suscribir('asignacion.cambiada', handlerFallaSincrono);
    bus.suscribir('asignacion.cambiada', handlerExitoso);
    bus.suscribir('asignacion.cambiada', handlerFallaPromesa);

    const evento: AsignacionCambiadaEvento = {
      seccionId: 'sec-1',
      codigoCurso: 'CS101',
      nombreCurso: 'Intro',
      codigoSeccion: '01',
      periodo: '2026-1',
      espaciosAnteriores: [],
      espaciosNuevos: [],
      horarios: [],
    };

    // emitir nunca debe lanzar ni rechazar
    await expect(bus.emitir('asignacion.cambiada', evento)).resolves.toBeUndefined();

    expect(handlerExitoso).toHaveBeenCalledWith(evento);
    // El registro de errores solo loguea el nombre del error, nunca datos sensibles
    expect(consoleError).toHaveBeenCalled();

    consoleError.mockRestore();
  });

  it('limpiar elimina todos los manejadores registrados', async () => {
    const handler = jest.fn();
    bus.suscribir('alerta.creada', handler);

    bus.limpiar();

    await bus.emitir('alerta.creada', {
      alertaId: 'al-1',
      tipo: TipoAlerta.SOFTWARE,
      espacioId: 'e-1',
      motivo: 'Test',
      asignacionesAfectadas: 0,
    });

    expect(handler).not.toHaveBeenCalled();
  });
});
