import { TipoAlerta } from '@prisma/client';
import {
  registrarAlerta,
  registrarAlertaDesdeDeteccion,
} from '../../../src/services/alerta.service';

function dbMock(pendientes: any[] = []) {
  return {
    alerta: {
      findMany: jest.fn().mockResolvedValue(pendientes),
      create: jest.fn().mockImplementation(async ({ data }) => ({
        id: 'nueva',
        tipo: data.tipo,
        espacioId: data.espacioId,
        motivo: data.motivo,
      })),
      update: jest.fn().mockImplementation(async ({ where, data }) => ({
        id: where.id,
        tipo: 'SOFTWARE',
        espacioId: 'L1',
        motivo: data.motivo,
      })),
    },
  } as any;
}

describe('Persistencia única de alertas (Issue 4.5)', () => {
  it('crea una alerta PENDIENTE con tipo, espacio, motivo y todas las asignaciones afectadas', async () => {
    const db = dbMock();

    const res = await registrarAlerta(
      {
        tipo: TipoAlerta.SOFTWARE,
        espacioId: 'L1',
        motivo: 'Falta Docker',
        asignacionIds: ['a1', 'a2'],
      },
      db,
    );

    expect(res).toMatchObject({
      id: 'nueva',
      tipo: 'SOFTWARE',
      creada: true,
      asignacionesAfectadas: 2,
    });
    expect(db.alerta.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        tipo: 'SOFTWARE',
        espacioId: 'L1',
        motivo: 'Falta Docker',
        estado: 'PENDIENTE',
        asignacionesAfectadas: { create: [{ asignacionId: 'a1' }, { asignacionId: 'a2' }] },
      }),
    });
  });

  it('no crea nada si no hay asignaciones afectadas', async () => {
    const db = dbMock();
    const res = await registrarAlerta(
      { tipo: TipoAlerta.CAPACIDAD, espacioId: 'L1', motivo: 'x', asignacionIds: [] },
      db,
    );
    expect(res).toBeNull();
    expect(db.alerta.create).not.toHaveBeenCalled();
    expect(db.alerta.findMany).not.toHaveBeenCalled();
  });

  it('actualiza en lugar de duplicar una alerta pendiente idéntica (sin importar el orden)', async () => {
    const db = dbMock([
      { id: 'existente', asignacionesAfectadas: [{ asignacionId: 'a2' }, { asignacionId: 'a1' }] },
    ]);

    const res = await registrarAlerta(
      {
        tipo: TipoAlerta.SOFTWARE,
        espacioId: 'L1',
        motivo: 'nuevo motivo',
        asignacionIds: ['a1', 'a2'],
      },
      db,
    );

    expect(res).toMatchObject({ id: 'existente', creada: false });
    expect(db.alerta.create).not.toHaveBeenCalled();
    expect(db.alerta.update).toHaveBeenCalledWith({
      where: { id: 'existente' },
      data: { motivo: 'nuevo motivo', fechaDeteccion: expect.any(Date) },
    });
  });

  it('solo considera pendientes del mismo espacio y tipo al buscar duplicados', async () => {
    const db = dbMock();
    await registrarAlerta(
      { tipo: TipoAlerta.CAPACIDAD, espacioId: 'L9', motivo: 'm', asignacionIds: ['a1'] },
      db,
    );
    expect(db.alerta.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { espacioId: 'L9', tipo: 'CAPACIDAD', estado: 'PENDIENTE' },
      }),
    );
  });

  it('crea una alerta nueva si el conjunto de asignaciones afectadas es distinto', async () => {
    const db = dbMock([{ id: 'existente', asignacionesAfectadas: [{ asignacionId: 'a1' }] }]);

    const res = await registrarAlerta(
      { tipo: TipoAlerta.SOFTWARE, espacioId: 'L1', motivo: 'm', asignacionIds: ['a1', 'a2'] },
      db,
    );

    expect(res?.creada).toBe(true);
    expect(db.alerta.update).not.toHaveBeenCalled();
  });

  it('deduplica ids repetidos de asignaciones', async () => {
    const db = dbMock();
    const res = await registrarAlerta(
      { tipo: TipoAlerta.SOFTWARE, espacioId: 'L1', motivo: 'm', asignacionIds: ['a1', 'a1'] },
      db,
    );
    expect(res?.asignacionesAfectadas).toBe(1);
  });

  it('registrarAlertaDesdeDeteccion arma el motivo con curso, grupo y detalle', async () => {
    const db = dbMock();

    await registrarAlertaDesdeDeteccion(
      TipoAlerta.SOFTWARE,
      'L1',
      'Lab 01',
      [
        {
          asignacionId: 'a1',
          seccionId: 's1',
          codigoCurso: 'ISW101',
          nombreCurso: 'Programación',
          codigoSeccion: '2',
          detalle: 'Lab 01 no tiene instalado: Docker',
        },
      ],
      db,
    );

    const motivo = db.alerta.create.mock.calls[0][0].data.motivo as string;
    expect(motivo).toContain('Software incompatible');
    expect(motivo).toContain('Lab 01');
    expect(motivo).toContain('ISW101');
    expect(motivo).toContain('sec. 2');
    expect(motivo).toContain('Docker');
  });

  it('registrarAlertaDesdeDeteccion con lista vacía no persiste', async () => {
    const db = dbMock();
    expect(
      await registrarAlertaDesdeDeteccion(TipoAlerta.CAPACIDAD, 'L1', 'Lab', [], db),
    ).toBeNull();
    expect(db.alerta.create).not.toHaveBeenCalled();
  });
});
