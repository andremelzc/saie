import {
  estadoReorganizacion,
  reorganizarConPrioridad,
  SEMANAS_POR_DEFECTO,
  semanasDeReorganizacion,
  vistaPreviaReorganizacion,
} from '../../../src/services/reorganizacion.service';
import { ejecutarReorganizacionConPrioridad } from '../../../src/services/asignacionDemanda.service';
import { simularReorganizacion } from '../../../src/services/motor.service';
import { obtenerPeriodoVigente } from '../../../src/services/periodo.service';

jest.mock('../../../src/services/periodo.service', () => ({ obtenerPeriodoVigente: jest.fn() }));
jest.mock('../../../src/services/motor.service', () => ({ simularReorganizacion: jest.fn() }));
jest.mock('../../../src/services/asignacionDemanda.service', () => ({
  ejecutarReorganizacionConPrioridad: jest.fn(),
}));

const INICIO = new Date('2026-08-24T00:00:00.000Z');
const crearPrisma = (fechaInicio: Date | null = INICIO) => ({
  periodo: { findUnique: jest.fn().mockResolvedValue(fechaInicio ? { fechaInicio } : null) },
});
const comoPrisma = (p: ReturnType<typeof crearPrisma>) => p as never;
const dia = (texto: string) => new Date(`${texto}T12:00:00.000Z`);

describe('reorganización con prioridad (Issue 2.26)', () => {
  const ENV = process.env.REORGANIZACION_SEMANAS;

  beforeEach(() => {
    jest.clearAllMocks();
    delete process.env.REORGANIZACION_SEMANAS;
    jest.mocked(obtenerPeriodoVigente).mockResolvedValue('2026-2');
  });

  afterAll(() => {
    if (ENV === undefined) delete process.env.REORGANIZACION_SEMANAS;
    else process.env.REORGANIZACION_SEMANAS = ENV;
  });

  describe('semanasDeReorganizacion', () => {
    it.each([
      [undefined, SEMANAS_POR_DEFECTO],
      ['', SEMANAS_POR_DEFECTO],
      ['abc', SEMANAS_POR_DEFECTO],
      ['-1', SEMANAS_POR_DEFECTO],
      ['1.5', SEMANAS_POR_DEFECTO],
      ['0', 0],
      ['3', 3],
    ])('«%s» → %i semanas', (valor, esperado) => {
      expect(semanasDeReorganizacion(valor)).toBe(esperado);
    });
  });

  describe('estadoReorganizacion', () => {
    it('sin periodo vigente no está disponible', async () => {
      jest.mocked(obtenerPeriodoVigente).mockResolvedValue(null);
      const estado = await estadoReorganizacion(comoPrisma(crearPrisma()), dia('2026-08-25'));
      expect(estado).toMatchObject({ disponible: false, periodo: null, desde: null });
      expect(estado.motivo).toContain('periodo vigente');
    });

    it('sin fecha de inicio del periodo no está disponible', async () => {
      const estado = await estadoReorganizacion(comoPrisma(crearPrisma(null)), dia('2026-08-25'));
      expect(estado).toMatchObject({ disponible: false, periodo: '2026-2' });
      expect(estado.motivo).toContain('fecha de inicio');
    });

    it('antes del inicio del ciclo no está disponible', async () => {
      const estado = await estadoReorganizacion(comoPrisma(crearPrisma()), dia('2026-08-20'));
      expect(estado).toMatchObject({ disponible: false, desde: '2026-08-24', hasta: '2026-09-07' });
      expect(estado.motivo).toContain('2026-08-24');
    });

    it('dentro de la ventana está disponible, incluido su último día', async () => {
      for (const hoy of ['2026-08-24', '2026-09-01', '2026-09-07']) {
        const estado = await estadoReorganizacion(comoPrisma(crearPrisma()), dia(hoy));
        expect(estado).toMatchObject({ disponible: true, motivo: null, semanas: 2 });
      }
    });

    it('después de la ventana remite a la asignación manual', async () => {
      const estado = await estadoReorganizacion(comoPrisma(crearPrisma()), dia('2026-09-08'));
      expect(estado.disponible).toBe(false);
      expect(estado.motivo).toContain('asignación manual');
    });

    it('usa las semanas configuradas', async () => {
      process.env.REORGANIZACION_SEMANAS = '4';
      const estado = await estadoReorganizacion(comoPrisma(crearPrisma()), dia('2026-09-15'));
      expect(estado).toMatchObject({ disponible: true, semanas: 4, hasta: '2026-09-21' });
    });
  });

  describe('vistaPreviaReorganizacion', () => {
    it('dentro de la ventana simula los cambios', async () => {
      const simulacion = {
        totalEscaladas: 3,
        escaladasConAula: 2,
        cambianDeAula: 5,
        pierdenAula: 1,
      };
      jest.mocked(simularReorganizacion).mockResolvedValue(simulacion);
      const vista = await vistaPreviaReorganizacion(comoPrisma(crearPrisma()), dia('2026-08-25'));
      expect(simularReorganizacion).toHaveBeenCalledWith('2026-2', expect.anything());
      expect(vista.simulacion).toEqual(simulacion);
    });

    it('fuera de la ventana no simula', async () => {
      const vista = await vistaPreviaReorganizacion(comoPrisma(crearPrisma()), dia('2026-10-01'));
      expect(vista.simulacion).toBeNull();
      expect(simularReorganizacion).not.toHaveBeenCalled();
    });
  });

  describe('reorganizarConPrioridad', () => {
    it('dentro de la ventana ejecuta la corrida del periodo vigente', async () => {
      jest
        .mocked(ejecutarReorganizacionConPrioridad)
        .mockResolvedValue({ modo: 'periodo' } as never);
      await reorganizarConPrioridad(comoPrisma(crearPrisma()), dia('2026-08-25'));
      expect(ejecutarReorganizacionConPrioridad).toHaveBeenCalledWith('2026-2', expect.anything());
    });

    it('fuera de la ventana responde 409 con el motivo', async () => {
      await expect(
        reorganizarConPrioridad(comoPrisma(crearPrisma()), dia('2026-10-01')),
      ).rejects.toMatchObject({
        status: 409,
        message: expect.stringContaining('inicio del ciclo'),
      });
      expect(ejecutarReorganizacionConPrioridad).not.toHaveBeenCalled();
    });
  });
});
