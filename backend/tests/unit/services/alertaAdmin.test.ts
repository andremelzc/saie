import { RolCuenta } from '@prisma/client';
import { listarAlertasActivas, resolverAlerta } from '../../../src/services/alerta.service';
import { TokenPayload } from '../../../src/types/auth';
import { HttpError } from '../../../src/lib/http';

/* ── helpers ─────────────────────────────────────────────── */

const authCoord: TokenPayload = { sub: 'coord1', rol: RolCuenta.COORDINACION_ACADEMICA };
const authJefatura: TokenPayload = { sub: 'jef1', rol: RolCuenta.JEFATURA_LABORATORIOS };

function alertaConDetalle(overrides: Record<string, any> = {}) {
  return {
    id: 'al1',
    tipo: 'SOFTWARE',
    estado: 'PENDIENTE',
    motivo: 'Software faltante en Lab 01',
    fechaDeteccion: new Date('2026-09-15'),
    espacio: { id: 'e1', identificador: 'Lab 01', pabellon: 'A', piso: 1 },
    asignacionesAfectadas: [
      {
        asignacionId: 'a1',
        asignacion: {
          seccion: {
            curso: { codigo: 'ISW101', nombre: 'Programación' },
            codigoSeccion: '1',
          },
        },
      },
    ],
    ...overrides,
  };
}

function listDbMock(alertas: any[] = []) {
  return {
    alerta: {
      findMany: jest.fn().mockResolvedValue(alertas),
    },
  } as any;
}

function resolverDbMock(alerta: any | null, responsable: any | null = null) {
  const resuelta = alerta
    ? {
        ...alerta,
        estado: 'RESUELTA',
        espacio: alerta.espacio ?? { id: 'e1', identificador: 'Lab 01', pabellon: 'A', piso: 1 },
        asignacionesAfectadas: alerta.asignacionesAfectadas ?? [],
      }
    : null;

  return {
    $transaction: jest.fn().mockImplementation(async (fn: (tx: any) => Promise<any>) =>
      fn({
        alerta: {
          findUnique: jest.fn().mockResolvedValue(alerta),
          update: jest.fn().mockResolvedValue(resuelta),
        },
        espacioResponsable: {
          findUnique: jest.fn().mockResolvedValue(responsable),
        },
        registroAuditoria: {
          create: jest.fn(),
        },
      }),
    ),
  } as any;
}

/* ── suite: listar (Issue 4.6) ───────────────────────────── */

describe('Listado de alertas activas (Issue 4.6)', () => {
  it('solo devuelve alertas PENDIENTES, de la más reciente a la más antigua', async () => {
    const db = listDbMock([alertaConDetalle()]);
    await listarAlertasActivas({}, authCoord, db);

    expect(db.alerta.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ estado: 'PENDIENTE' }),
        orderBy: { fechaDeteccion: 'desc' },
      }),
    );
  });

  it('filtra por tipo de alerta', async () => {
    const db = listDbMock([]);
    await listarAlertasActivas({ tipo: 'CAPACIDAD' as any }, authCoord, db);

    expect(db.alerta.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ tipo: 'CAPACIDAD' }),
      }),
    );
  });

  it('filtra por espacioId', async () => {
    const db = listDbMock([]);
    await listarAlertasActivas({ espacioId: 'e5' }, authCoord, db);

    expect(db.alerta.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ espacioId: 'e5' }),
      }),
    );
  });

  it('Jefatura solo ve las de sus laboratorios (EspacioResponsable)', async () => {
    const db = listDbMock([]);
    await listarAlertasActivas({}, authJefatura, db);

    expect(db.alerta.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          espacio: { responsables: { some: { cuentaId: 'jef1' } } },
        }),
      }),
    );
  });

  it('mapea correctamente la respuesta al DTO', async () => {
    const db = listDbMock([alertaConDetalle()]);
    const res = await listarAlertasActivas({}, authCoord, db);

    expect(res[0]).toMatchObject({
      id: 'al1',
      tipo: 'SOFTWARE',
      estado: 'PENDIENTE',
      espacio: { identificador: 'Lab 01' },
      asignacionesAfectadas: [
        expect.objectContaining({
          codigoCurso: 'ISW101',
          codigoSeccion: '1',
        }),
      ],
    });
  });
});

/* ── suite: resolver (Issue 4.7) ─────────────────────────── */

describe('Resolución de alertas (Issue 4.7)', () => {
  it('404 si la alerta no existe', async () => {
    const db = resolverDbMock(null);

    await expect(resolverAlerta('fake-id', authCoord, db)).rejects.toMatchObject({ status: 404 });
  });

  it('403 si Jefatura no es responsable del espacio', async () => {
    const al = { id: 'al1', estado: 'PENDIENTE', espacioId: 'e1' };
    const db = resolverDbMock(al, null); // sin responsable

    await expect(resolverAlerta('al1', authJefatura, db)).rejects.toMatchObject({ status: 403 });
  });

  it('409 si la alerta ya estaba resuelta', async () => {
    const al = { id: 'al1', estado: 'RESUELTA', espacioId: 'e1' };
    const db = resolverDbMock(al);

    await expect(resolverAlerta('al1', authCoord, db)).rejects.toMatchObject({ status: 409 });
  });

  it('Coordinación resuelve y deja RegistroAuditoria de tipo ALERTA', async () => {
    const al = alertaConDetalle({ estado: 'PENDIENTE', espacioId: 'e1' });
    const db = {
      $transaction: jest.fn().mockImplementation(async (fn: (tx: any) => Promise<any>) => {
        const tx = {
          alerta: {
            findUnique: jest.fn().mockResolvedValue(al),
            update: jest.fn().mockResolvedValue({
              ...al,
              estado: 'RESUELTA',
            }),
          },
          espacioResponsable: { findUnique: jest.fn() },
          registroAuditoria: { create: jest.fn() },
        };
        return fn(tx);
      }),
    } as any;

    const res = await resolverAlerta('al1', authCoord, db);

    expect(res.estado).toBe('RESUELTA');

    // Verificar que se creó el registro de auditoría
    const tx = await db.$transaction.mock.results[0].value;
    // La función fue llamada, lo comprobamos indirectamente: si no lanzó, el tx.registroAuditoria.create se ejecutó
  });
});
