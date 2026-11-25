import { registrarPeriodosDeLaPlantilla } from '../../../src/services/plantilla.seed';

function dbMock(vigente: unknown = null) {
  return {
    periodo: {
      upsert: jest.fn().mockResolvedValue({}),
      findFirst: jest.fn().mockResolvedValue(vigente),
      update: jest.fn().mockResolvedValue({}),
    },
  } as any;
}

describe('registrarPeriodosDeLaPlantilla (Issue 4.64)', () => {
  it('registra cada periodo una sola vez y deja vigente el más reciente si no había ninguno', async () => {
    const db = dbMock();
    await registrarPeriodosDeLaPlantilla(db, ['2026-2', '2026-1', '2026-2']);

    expect(db.periodo.upsert).toHaveBeenCalledTimes(2);
    expect(db.periodo.update).toHaveBeenCalledWith({
      where: { codigo: '2026-2' },
      data: { estado: 'VIGENTE' },
    });
  });

  it('no cambia el vigente si ya había uno', async () => {
    const db = dbMock({ codigo: '2026-2' });
    await registrarPeriodosDeLaPlantilla(db, ['2027-1']);

    expect(db.periodo.upsert).toHaveBeenCalledTimes(1);
    expect(db.periodo.update).not.toHaveBeenCalled();
  });

  it('sin secciones no activa nada', async () => {
    const db = dbMock();
    await registrarPeriodosDeLaPlantilla(db, []);
    expect(db.periodo.update).not.toHaveBeenCalled();
  });
});
