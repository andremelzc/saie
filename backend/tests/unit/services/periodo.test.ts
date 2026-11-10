import { listarPeriodos, obtenerPeriodoVigente } from '../../../src/services/periodo.service';

describe('Periodo Service', () => {
  const originalEnv = process.env.PERIODO_VIGENTE;

  afterEach(() => {
    if (originalEnv !== undefined) {
      process.env.PERIODO_VIGENTE = originalEnv;
    } else {
      delete process.env.PERIODO_VIGENTE;
    }
  });

  it('retorna el periodo configurado en la variable de entorno PERIODO_VIGENTE si existe', async () => {
    process.env.PERIODO_VIGENTE = '2026-1';
    const mockDb = {
      seccion: {
        findFirst: jest.fn(),
      },
    } as any;

    const res = await obtenerPeriodoVigente(mockDb);

    expect(res).toBe('2026-1');
    expect(mockDb.seccion.findFirst).not.toHaveBeenCalled();
  });

  it('retorna el periodo mas reciente de la base si no hay variable de entorno', async () => {
    delete process.env.PERIODO_VIGENTE;
    const mockDb = {
      seccion: {
        findFirst: jest.fn().mockResolvedValue({ periodo: '2025-2' }),
      },
    } as any;

    const res = await obtenerPeriodoVigente(mockDb);

    expect(res).toBe('2025-2');
    expect(mockDb.seccion.findFirst).toHaveBeenCalledWith({
      orderBy: { periodo: 'desc' },
      select: { periodo: true },
    });
  });

  it('retorna null si no hay variable ni secciones en la base', async () => {
    delete process.env.PERIODO_VIGENTE;
    const mockDb = {
      seccion: {
        findFirst: jest.fn().mockResolvedValue(null),
      },
    } as any;

    const res = await obtenerPeriodoVigente(mockDb);

    expect(res).toBeNull();
  });
});

describe('listarPeriodos (Issue 4.42)', () => {
  const originalEnv = process.env.PERIODO_VIGENTE;

  afterEach(() => {
    if (originalEnv !== undefined) {
      process.env.PERIODO_VIGENTE = originalEnv;
    } else {
      delete process.env.PERIODO_VIGENTE;
    }
  });

  it('devuelve los periodos distintos del más reciente al más antiguo y el vigente', async () => {
    delete process.env.PERIODO_VIGENTE;
    const mockDb = {
      seccion: {
        findMany: jest
          .fn()
          .mockResolvedValue([{ periodo: '2026-2' }, { periodo: '2026-1' }, { periodo: '2025-2' }]),
        findFirst: jest.fn().mockResolvedValue({ periodo: '2026-2' }),
      },
    } as any;

    const res = await listarPeriodos(mockDb);

    expect(res).toEqual({ vigente: '2026-2', periodos: ['2026-2', '2026-1', '2025-2'] });
    expect(mockDb.seccion.findMany).toHaveBeenCalledWith({
      distinct: ['periodo'],
      orderBy: { periodo: 'desc' },
      select: { periodo: true },
    });
  });

  it('usa PERIODO_VIGENTE como vigente cuando está configurado', async () => {
    process.env.PERIODO_VIGENTE = '2026-1';
    const mockDb = {
      seccion: {
        findMany: jest.fn().mockResolvedValue([{ periodo: '2026-2' }, { periodo: '2026-1' }]),
        findFirst: jest.fn(),
      },
    } as any;

    const res = await listarPeriodos(mockDb);

    expect(res.vigente).toBe('2026-1');
    expect(res.periodos).toEqual(['2026-2', '2026-1']);
  });

  it('sin secciones devuelve periodos vacío y vigente null', async () => {
    delete process.env.PERIODO_VIGENTE;
    const mockDb = {
      seccion: {
        findMany: jest.fn().mockResolvedValue([]),
        findFirst: jest.fn().mockResolvedValue(null),
      },
    } as any;

    const res = await listarPeriodos(mockDb);

    expect(res).toEqual({ vigente: null, periodos: [] });
  });
});
