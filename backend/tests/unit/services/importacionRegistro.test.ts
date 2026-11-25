import {
  obtenerUltimasImportaciones,
  registrarImportacion,
} from '../../../src/services/importacionRegistro.service';

describe('registrarImportacion (Issue 4.54)', () => {
  function db() {
    return { importacion: { create: jest.fn().mockResolvedValue({}) } } as any;
  }

  it('una carga sin filas rechazadas queda EXITOSA, con la cuenta y las cifras', async () => {
    const prisma = db();
    await registrarImportacion(prisma, {
      tipo: 'cursos-secciones',
      cuentaId: 'cuenta-1',
      filasRecibidas: 10,
      errores: [],
    });

    expect(prisma.importacion.create).toHaveBeenCalledWith({
      data: {
        tipo: 'CURSOS_SECCIONES',
        cuentaId: 'cuenta-1',
        filasRecibidas: 10,
        filasAceptadas: 10,
        filasRechazadas: 0,
        resultado: 'EXITOSA',
      },
    });
  });

  it('con filas rechazadas queda CON_ERRORES y separa aceptadas de rechazadas', async () => {
    const prisma = db();
    await registrarImportacion(prisma, {
      tipo: 'matriculas',
      cuentaId: 'cuenta-1',
      filasRecibidas: 10,
      errores: ['Fila 2: código inválido', 'Fila 5: curso inexistente'],
    });

    expect(prisma.importacion.create.mock.calls[0][0].data).toMatchObject({
      tipo: 'MATRICULAS',
      filasAceptadas: 8,
      filasRechazadas: 2,
      resultado: 'CON_ERRORES',
    });
  });

  it('las rechazadas nunca superan las recibidas (un error de archivo completo)', async () => {
    const prisma = db();
    await registrarImportacion(prisma, {
      tipo: 'horarios',
      cuentaId: null,
      filasRecibidas: 1,
      errores: ['a', 'b', 'c'],
    });

    expect(prisma.importacion.create.mock.calls[0][0].data).toMatchObject({
      cuentaId: null,
      filasAceptadas: 0,
      filasRechazadas: 1,
      resultado: 'CON_ERRORES',
    });
  });

  it('traduce cada tipo de importación a su tipo de archivo', async () => {
    const prisma = db();
    for (const tipo of ['cursos-secciones', 'horarios', 'matriculas', 'docentes'] as const) {
      await registrarImportacion(prisma, { tipo, cuentaId: 'c', filasRecibidas: 1, errores: [] });
    }
    expect(prisma.importacion.create.mock.calls.map((c: any) => c[0].data.tipo)).toEqual([
      'CURSOS_SECCIONES',
      'HORARIOS',
      'MATRICULAS',
      'DOCENTES',
    ]);
  });
});

describe('obtenerUltimasImportaciones (Issue 4.54)', () => {
  function fila(tipo: string, extra: Record<string, unknown> = {}) {
    return {
      id: `imp-${tipo}`,
      tipo,
      cuentaId: 'cuenta-1',
      fecha: new Date('2026-11-10T15:30:00Z'),
      filasRecibidas: 10,
      filasAceptadas: 9,
      filasRechazadas: 1,
      resultado: 'CON_ERRORES',
      ...extra,
    };
  }

  function db(porTipo: Record<string, unknown> = {}, cuentas: unknown[] = []) {
    return {
      importacion: {
        findFirst: jest
          .fn()
          .mockImplementation(async ({ where }: any) => porTipo[where.tipo] ?? null),
      },
      cuenta: { findMany: jest.fn().mockResolvedValue(cuentas) },
    } as any;
  }

  it('devuelve la última de cada tipo y null para los que nunca se cargaron', async () => {
    const prisma = db(
      { MATRICULAS: fila('MATRICULAS'), HORARIOS: fila('HORARIOS', { resultado: 'EXITOSA' }) },
      [{ id: 'cuenta-1', usuarioLogin: 'coordinacion', alumno: null, docente: null }],
    );

    const res = await obtenerUltimasImportaciones(undefined, prisma);

    expect(Object.keys(res).sort()).toEqual([
      'cursos-secciones',
      'docentes',
      'horarios',
      'matriculas',
    ]);
    expect(res['cursos-secciones']).toBeNull();
    expect(res.docentes).toBeNull();
    expect(res.matriculas).toEqual({
      tipo: 'matriculas',
      fecha: '2026-11-10T15:30:00.000Z',
      cuenta: { id: 'cuenta-1', nombre: 'coordinacion' },
      filasRecibidas: 10,
      filasAceptadas: 9,
      filasRechazadas: 1,
      resultado: 'CON_ERRORES',
    });
    expect(res.horarios?.resultado).toBe('EXITOSA');
  });

  it('pide a la base la más reciente de cada tipo', async () => {
    const prisma = db();
    await obtenerUltimasImportaciones(undefined, prisma);

    expect(prisma.importacion.findFirst).toHaveBeenCalledTimes(4);
    expect(prisma.importacion.findFirst).toHaveBeenCalledWith({
      where: { tipo: 'DOCENTES' },
      orderBy: { fecha: 'desc' },
    });
  });

  it('con tipo devuelve solo ese tipo', async () => {
    const prisma = db({ DOCENTES: fila('DOCENTES') });
    const res = await obtenerUltimasImportaciones('docentes', prisma);

    expect(Object.keys(res)).toEqual(['docentes']);
    expect(prisma.importacion.findFirst).toHaveBeenCalledTimes(1);
  });

  it('si la cuenta ya no existe, la importación se devuelve con cuenta null', async () => {
    const prisma = db({ DOCENTES: fila('DOCENTES', { cuentaId: 'cuenta-borrada' }) }, []);
    const res = await obtenerUltimasImportaciones('docentes', prisma);
    expect(res.docentes?.cuenta).toBeNull();
    expect(res.docentes?.filasAceptadas).toBe(9);
  });

  it('sin ninguna importación no consulta cuentas', async () => {
    const prisma = db();
    await obtenerUltimasImportaciones(undefined, prisma);
    expect(prisma.cuenta.findMany).not.toHaveBeenCalled();
  });
});
