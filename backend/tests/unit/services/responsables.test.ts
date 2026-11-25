import { RolCuenta, TipoEspacio } from '@prisma/client';
import {
  vincularJefaturaConLaboratorios,
  vincularLaboratorioConJefatura,
} from '../../../src/services/responsables.service';

function crearDb(cuentas: { id: string }[], laboratorios: { id: string }[]) {
  return {
    cuenta: { findMany: jest.fn().mockResolvedValue(cuentas) },
    espacio: { findMany: jest.fn().mockResolvedValue(laboratorios) },
    espacioResponsable: {
      createMany: jest.fn().mockImplementation(async ({ data }: { data: unknown[] }) => ({
        count: data.length,
      })),
    },
  };
}

describe('Jefatura a cargo de los laboratorios (Issue 4.59, riesgo R17)', () => {
  describe('vincularJefaturaConLaboratorios', () => {
    it('vincula cada cuenta de Jefatura con cada laboratorio, sin duplicar', async () => {
      const db = crearDb([{ id: 'jef-1' }], [{ id: 'lab-1' }, { id: 'lab-2' }]);

      const creados = await vincularJefaturaConLaboratorios(db as never);

      expect(creados).toBe(2);
      expect(db.cuenta.findMany).toHaveBeenCalledWith({
        where: { rol: RolCuenta.JEFATURA_LABORATORIOS },
        select: { id: true },
      });
      expect(db.espacio.findMany).toHaveBeenCalledWith({
        where: { tipo: TipoEspacio.LABORATORIO },
        select: { id: true },
      });
      expect(db.espacioResponsable.createMany).toHaveBeenCalledWith({
        data: [
          { cuentaId: 'jef-1', espacioId: 'lab-1' },
          { cuentaId: 'jef-1', espacioId: 'lab-2' },
        ],
        skipDuplicates: true,
      });
    });

    it('no escribe nada si no hay cuentas de Jefatura', async () => {
      const db = crearDb([], [{ id: 'lab-1' }]);

      expect(await vincularJefaturaConLaboratorios(db as never)).toBe(0);
      expect(db.espacioResponsable.createMany).not.toHaveBeenCalled();
    });

    it('no escribe nada si no hay laboratorios', async () => {
      const db = crearDb([{ id: 'jef-1' }], []);

      expect(await vincularJefaturaConLaboratorios(db as never)).toBe(0);
      expect(db.espacioResponsable.createMany).not.toHaveBeenCalled();
    });
  });

  describe('vincularLaboratorioConJefatura', () => {
    it('deja un laboratorio nuevo a cargo de todas las cuentas de Jefatura', async () => {
      const db = crearDb([{ id: 'jef-1' }, { id: 'jef-2' }], []);

      await vincularLaboratorioConJefatura('lab-nuevo', db as never);

      expect(db.espacioResponsable.createMany).toHaveBeenCalledWith({
        data: [
          { cuentaId: 'jef-1', espacioId: 'lab-nuevo' },
          { cuentaId: 'jef-2', espacioId: 'lab-nuevo' },
        ],
        skipDuplicates: true,
      });
    });

    it('no escribe nada si no hay cuentas de Jefatura', async () => {
      const db = crearDb([], []);

      await vincularLaboratorioConJefatura('lab-nuevo', db as never);

      expect(db.espacioResponsable.createMany).not.toHaveBeenCalled();
    });
  });
});
