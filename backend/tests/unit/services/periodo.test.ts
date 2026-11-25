import { EstadoAsignacion, EstadoPeriodo, RolCuenta } from '@prisma/client';
import {
  NuevoPeriodoSchema,
  activarPeriodo,
  asegurarPeriodoEscribible,
  cerrarPeriodo,
  listarPeriodos,
  obtenerPeriodoVigente,
  registrarPeriodo,
} from '../../../src/services/periodo.service';

const auth = { sub: 'cuenta-1', rol: RolCuenta.COORDINACION_ACADEMICA } as any;

function fila(codigo: string, estado: EstadoPeriodo, id = `id-${codigo}`) {
  return { id, codigo, estado, fechaInicio: null, fechaFin: null };
}

function dbMock(periodos: ReturnType<typeof fila>[] = []) {
  const db: any = {
    periodo: {
      findFirst: jest.fn(
        async ({ where }: any) => periodos.find((p) => p.estado === where.estado) ?? null,
      ),
      findUnique: jest.fn(
        async ({ where }: any) => periodos.find((p) => p.codigo === where.codigo) ?? null,
      ),
      findMany: jest.fn(async () => [...periodos].sort((a, b) => b.codigo.localeCompare(a.codigo))),
      create: jest.fn(async ({ data }: any) => ({
        id: 'nuevo',
        fechaInicio: null,
        fechaFin: null,
        ...data,
      })),
      update: jest.fn(async ({ where, data }: any) => ({
        ...periodos.find((p) => p.id === where.id)!,
        ...data,
      })),
    },
    asignacion: { updateMany: jest.fn().mockResolvedValue({ count: 3 }) },
    registroAuditoria: { create: jest.fn().mockResolvedValue({}) },
  };
  db.$transaction = jest.fn((fn: (tx: unknown) => unknown) => fn(db));
  return db;
}

describe('obtenerPeriodoVigente (Issue 4.64)', () => {
  const original = process.env.PERIODO_VIGENTE;
  afterEach(() => {
    if (original === undefined) delete process.env.PERIODO_VIGENTE;
    else process.env.PERIODO_VIGENTE = original;
  });

  it('devuelve el periodo en estado VIGENTE', async () => {
    const db = dbMock([
      fila('2026-2', EstadoPeriodo.VIGENTE),
      fila('2027-1', EstadoPeriodo.EN_PREPARACION),
    ]);
    expect(await obtenerPeriodoVigente(db)).toBe('2026-2');
  });

  it('devuelve null si Coordinación no activó ninguno', async () => {
    const db = dbMock([fila('2027-1', EstadoPeriodo.EN_PREPARACION)]);
    expect(await obtenerPeriodoVigente(db)).toBeNull();
  });

  it('ignora la variable PERIODO_VIGENTE (ya no se usa)', async () => {
    process.env.PERIODO_VIGENTE = '2030-1';
    const db = dbMock([fila('2026-2', EstadoPeriodo.VIGENTE)]);
    expect(await obtenerPeriodoVigente(db)).toBe('2026-2');
  });
});

describe('listarPeriodos', () => {
  it('lista los registrados del más reciente al más antiguo con el vigente', async () => {
    const db = dbMock([
      fila('2026-1', EstadoPeriodo.CERRADO),
      fila('2026-2', EstadoPeriodo.VIGENTE),
    ]);
    const r = await listarPeriodos(db);
    expect(r.vigente).toBe('2026-2');
    expect(r.periodos).toEqual(['2026-2', '2026-1']);
    expect(r.registrados[0]).toEqual({
      codigo: '2026-2',
      fechaInicio: null,
      fechaFin: null,
      estado: 'VIGENTE',
    });
  });

  it('muestra las fechas como AAAA-MM-DD', async () => {
    const db = dbMock([
      {
        ...fila('2026-2', EstadoPeriodo.VIGENTE),
        fechaInicio: new Date('2026-08-17T00:00:00Z'),
        fechaFin: new Date('2026-12-19T00:00:00Z'),
      } as any,
    ]);
    const r = await listarPeriodos(db);
    expect(r.registrados[0]).toMatchObject({ fechaInicio: '2026-08-17', fechaFin: '2026-12-19' });
  });

  it('sin periodos devuelve vacío y vigente null', async () => {
    expect(await listarPeriodos(dbMock())).toEqual({
      vigente: null,
      periodos: [],
      registrados: [],
    });
  });
});

describe('asegurarPeriodoEscribible (R50)', () => {
  it('acepta un periodo en preparación o vigente', async () => {
    const db = dbMock([
      fila('2026-2', EstadoPeriodo.VIGENTE),
      fila('2027-1', EstadoPeriodo.EN_PREPARACION),
    ]);
    await expect(asegurarPeriodoEscribible(db, '2026-2')).resolves.toBeUndefined();
    await expect(asegurarPeriodoEscribible(db, '2027-1')).resolves.toBeUndefined();
  });

  it('rechaza un periodo cerrado con 409', async () => {
    const db = dbMock([fila('2026-1', EstadoPeriodo.CERRADO)]);
    await expect(asegurarPeriodoEscribible(db, '2026-1')).rejects.toMatchObject({
      status: 409,
      message: 'El periodo 2026-1 está cerrado y solo admite consulta',
    });
  });

  it('rechaza un periodo no registrado con 422', async () => {
    await expect(asegurarPeriodoEscribible(dbMock(), '2030-1')).rejects.toMatchObject({
      status: 422,
    });
  });
});

describe('NuevoPeriodoSchema', () => {
  it('normaliza 2026-II a 2026-2', () => {
    expect(NuevoPeriodoSchema.parse({ codigo: '2026-II' }).codigo).toBe('2026-2');
  });

  it('rechaza un código inválido', () => {
    expect(NuevoPeriodoSchema.safeParse({ codigo: '2026-3' }).success).toBe(false);
  });

  it('rechaza fechas mal escritas o con el fin antes del inicio', () => {
    const base = { codigo: '2026-2' };
    expect(NuevoPeriodoSchema.safeParse({ ...base, fechaInicio: '17/08/2026' }).success).toBe(
      false,
    );
    expect(NuevoPeriodoSchema.safeParse({ ...base, fechaInicio: '2026-13-45' }).success).toBe(
      false,
    );
    expect(
      NuevoPeriodoSchema.safeParse({ ...base, fechaInicio: '2026-12-01', fechaFin: '2026-08-01' })
        .success,
    ).toBe(false);
  });

  it('acepta fechas válidas', () => {
    expect(
      NuevoPeriodoSchema.safeParse({
        codigo: '2026-2',
        fechaInicio: '2026-08-17',
        fechaFin: '2026-12-19',
      }).success,
    ).toBe(true);
  });
});

describe('registrarPeriodo', () => {
  it('lo crea en preparación y deja asiento en la auditoría', async () => {
    const db = dbMock();
    const r = await registrarPeriodo({ codigo: '2027-1', fechaInicio: '2027-03-15' }, auth, db);
    expect(r).toMatchObject({ codigo: '2027-1', estado: 'EN_PREPARACION' });
    expect(db.periodo.create.mock.calls[0][0].data.fechaInicio).toEqual(
      new Date('2027-03-15T00:00:00Z'),
    );
    expect(db.registroAuditoria.create).toHaveBeenCalledTimes(1);
    expect(db.registroAuditoria.create.mock.calls[0][0].data).toMatchObject({
      tipoEvento: 'CAMBIO_PERIODO',
      cuentaId: 'cuenta-1',
    });
  });

  it('guarda también la fecha de fin', async () => {
    const db = dbMock();
    await registrarPeriodo({ codigo: '2027-1', fechaFin: '2027-07-20' }, auth, db);
    expect(db.periodo.create.mock.calls[0][0].data.fechaFin).toEqual(
      new Date('2027-07-20T00:00:00Z'),
    );
  });

  it('409 si el periodo ya está registrado', async () => {
    const db = dbMock([fila('2026-2', EstadoPeriodo.VIGENTE)]);
    await expect(registrarPeriodo({ codigo: '2026-2' }, auth, db)).rejects.toMatchObject({
      status: 409,
    });
    expect(db.periodo.create).not.toHaveBeenCalled();
  });
});

describe('activarPeriodo (R51)', () => {
  it('cierra el vigente anterior, archiva sus asignaciones y activa el nuevo en un solo paso', async () => {
    const db = dbMock([
      fila('2026-2', EstadoPeriodo.VIGENTE),
      fila('2027-1', EstadoPeriodo.EN_PREPARACION),
    ]);
    const r = await activarPeriodo('2027-1', auth, db);

    expect(r.estado).toBe('VIGENTE');
    expect(db.$transaction).toHaveBeenCalledTimes(1);
    expect(db.periodo.update).toHaveBeenCalledWith({
      where: { id: 'id-2026-2' },
      data: { estado: EstadoPeriodo.CERRADO },
    });
    expect(db.asignacion.updateMany).toHaveBeenCalledWith({
      where: {
        seccion: { periodo: '2026-2' },
        estado: { in: [EstadoAsignacion.VIGENTE, EstadoAsignacion.ESCALADA] },
      },
      data: { estado: EstadoAsignacion.HISTORICA },
    });
    expect(db.registroAuditoria.create).toHaveBeenCalledTimes(2);
  });

  it('activa el primer periodo cuando no hay vigente', async () => {
    const db = dbMock([fila('2026-2', EstadoPeriodo.EN_PREPARACION)]);
    await activarPeriodo('2026-2', auth, db);
    expect(db.asignacion.updateMany).not.toHaveBeenCalled();
    expect(db.registroAuditoria.create).toHaveBeenCalledTimes(1);
  });

  it('404 si no existe, 409 si ya es el vigente o si está cerrado', async () => {
    const db = dbMock([
      fila('2026-2', EstadoPeriodo.VIGENTE),
      fila('2026-1', EstadoPeriodo.CERRADO),
    ]);
    await expect(activarPeriodo('2030-1', auth, db)).rejects.toMatchObject({ status: 404 });
    await expect(activarPeriodo('2026-2', auth, db)).rejects.toMatchObject({ status: 409 });
    await expect(activarPeriodo('2026-1', auth, db)).rejects.toMatchObject({
      status: 409,
      message: expect.stringContaining('no se puede reactivar'),
    });
    expect(db.$transaction).not.toHaveBeenCalled();
  });
});

describe('cerrarPeriodo', () => {
  it('cierra el periodo y archiva sus asignaciones', async () => {
    const db = dbMock([fila('2026-2', EstadoPeriodo.VIGENTE)]);
    const r = await cerrarPeriodo('2026-2', auth, db);
    expect(r.estado).toBe('CERRADO');
    expect(db.asignacion.updateMany).toHaveBeenCalledTimes(1);
    expect(db.registroAuditoria.create).toHaveBeenCalledTimes(1);
  });

  it('404 si no existe y 409 si ya está cerrado', async () => {
    const db = dbMock([fila('2026-1', EstadoPeriodo.CERRADO)]);
    await expect(cerrarPeriodo('2030-1', auth, db)).rejects.toMatchObject({ status: 404 });
    await expect(cerrarPeriodo('2026-1', auth, db)).rejects.toMatchObject({ status: 409 });
  });
});
