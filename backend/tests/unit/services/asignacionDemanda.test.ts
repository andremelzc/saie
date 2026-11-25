jest.mock('../../../src/services/motor.service', () => ({
  procesarAsignacionSeccionIndividual: jest.fn(),
  procesarCorridaBatchPeriodo: jest.fn(),
}));

jest.mock('../../../src/services/verificador.service', () => ({
  verificarCorridaPeriodo: jest.fn(),
}));

import {
  ejecutarAsignacionADemanda,
  hayCorridaEnCurso,
} from '../../../src/services/asignacionDemanda.service';
import {
  procesarAsignacionSeccionIndividual,
  procesarCorridaBatchPeriodo,
} from '../../../src/services/motor.service';
import { verificarCorridaPeriodo } from '../../../src/services/verificador.service';
import { establecerClienteCandado } from '../../../src/lib/candadoCorrida';

const individual = procesarAsignacionSeccionIndividual as jest.Mock;
const batch = procesarCorridaBatchPeriodo as jest.Mock;
const verificar = verificarCorridaPeriodo as jest.Mock;

/** Resultado de verificación conforme reutilizable (Issue 2.17). */
function verificacionConforme() {
  return { conforme: true, totalRevisadas: 0, totalViolaciones: 0, reglas: [] };
}

function resultado(seccionId: string, estado: string, extra: Record<string, unknown> = {}) {
  return {
    seccionId,
    codigoSeccion: '1',
    cursoId: 'c',
    estado,
    espacioIds: estado === 'VIGENTE' ? ['e1'] : [],
    huellaEntrada: 'h',
    ...extra,
  };
}

function prismaMock(seccion: unknown = { id: 's1', periodo: '2026-1' }, periodo = '2026-1') {
  return {
    seccion: { findUnique: jest.fn().mockResolvedValue(seccion) },
    periodo: {
      findFirst: jest.fn().mockResolvedValue(periodo ? { codigo: periodo } : null),
      findUnique: jest.fn().mockResolvedValue({ estado: 'VIGENTE' }),
    },
  } as any;
}

beforeEach(() => {
  jest.clearAllMocks();
  // Sin cliente de sesión: solo el candado en memoria (cada prueba puede inyectar uno).
  establecerClienteCandado(null);
  verificar.mockResolvedValue(verificacionConforme());
});

describe('Asignación a demanda (Issue 2.15)', () => {
  describe('con id de sección', () => {
    it('409 y no reasigna si la sección es de un periodo cerrado (Issue 4.64)', async () => {
      const prisma = prismaMock();
      prisma.periodo.findUnique.mockResolvedValue({ estado: 'CERRADO' });

      await expect(ejecutarAsignacionADemanda('s1', prisma)).rejects.toMatchObject({
        status: 409,
      });
      expect(individual).not.toHaveBeenCalled();
    });

    it('ejecuta solo la orquestación de esa sección y resume el resultado', async () => {
      individual.mockResolvedValue(resultado('s1', 'VIGENTE'));
      const prisma = prismaMock();

      const res = await ejecutarAsignacionADemanda('s1', prisma);

      expect(individual).toHaveBeenCalledWith('s1', prisma);
      expect(batch).not.toHaveBeenCalled();
      expect(res).toMatchObject({
        modo: 'seccion',
        periodo: '2026-1',
        corridaId: null,
        totalSecciones: 1,
        asignadas: 1,
        mantenidas: 0,
        escaladas: 0,
        verificacion: { conforme: true },
      });
      // Issue 2.17: la verificación corre sobre el periodo de la sección.
      expect(verificar).toHaveBeenCalledWith('2026-1', prisma);
    });

    it('404 si la sección no existe, sin invocar al motor', async () => {
      const prisma = prismaMock(null);
      await expect(ejecutarAsignacionADemanda('nope', prisma)).rejects.toMatchObject({
        status: 404,
      });
      expect(individual).not.toHaveBeenCalled();
    });

    it('reintentar una sección ESCALADA la reevalúa y puede quedar asignada', async () => {
      individual.mockResolvedValue(
        resultado('s1', 'VIGENTE', { conservadaPorIdempotencia: false }),
      );
      const res = await ejecutarAsignacionADemanda('s1', prismaMock());
      expect(individual).toHaveBeenCalledTimes(1);
      expect(res.asignadas).toBe(1);
      expect(res.escaladas).toBe(0);
    });

    it('si sigue sin poder asignarse, informa la sección escalada con su motivo', async () => {
      individual.mockResolvedValue(
        resultado('s1', 'ESCALADA', { motivoEscalamiento: 'CAPACIDAD_INSUFICIENTE: faltan 10' }),
      );
      const res = await ejecutarAsignacionADemanda('s1', prismaMock());
      expect(res.escaladas).toBe(1);
      expect(res.resultados[0].motivoEscalamiento).toContain('CAPACIDAD_INSUFICIENTE');
    });

    it('una asignación vigente sin cambios cuenta como mantenida', async () => {
      individual.mockResolvedValue(resultado('s1', 'VIGENTE', { conservadaPorIdempotencia: true }));
      const res = await ejecutarAsignacionADemanda('s1', prismaMock());
      expect(res).toMatchObject({ asignadas: 0, mantenidas: 1, escaladas: 0 });
    });
  });

  describe('sin id de sección (corrida completa)', () => {
    it('ejecuta la corrida batch del periodo vigente y devuelve resumen e id de corrida', async () => {
      batch.mockResolvedValue({
        corridaId: 'corrida-123',
        resultados: [
          resultado('s1', 'VIGENTE'),
          resultado('s2', 'VIGENTE', { conservadaPorIdempotencia: true }),
          resultado('s3', 'ESCALADA', { motivoEscalamiento: 'x' }),
        ],
      });
      const prisma = prismaMock();

      const res = await ejecutarAsignacionADemanda(undefined, prisma);

      expect(batch).toHaveBeenCalledWith('2026-1', prisma, 'DEMANDA');
      expect(individual).not.toHaveBeenCalled();
      expect(res).toMatchObject({
        modo: 'periodo',
        periodo: '2026-1',
        corridaId: 'corrida-123',
        totalSecciones: 3,
        asignadas: 1,
        mantenidas: 1,
        escaladas: 1,
        verificacion: { conforme: true },
      });
      expect(verificar).toHaveBeenCalledWith('2026-1', prisma, 'corrida-123');
    });

    it('periodo sin datos: responde con ceros y no invoca al motor', async () => {
      const res = await ejecutarAsignacionADemanda(undefined, prismaMock(null, ''));
      expect(batch).not.toHaveBeenCalled();
      expect(verificar).not.toHaveBeenCalled();
      expect(res).toMatchObject({
        periodo: null,
        totalSecciones: 0,
        asignadas: 0,
        escaladas: 0,
        verificacion: null,
      });
    });
  });

  describe('corridas simultáneas', () => {
    it('rechaza con 409 una segunda corrida mientras hay otra en curso, y no lanza otra', async () => {
      let liberar!: () => void;
      batch.mockImplementation(
        () =>
          new Promise((resolve) => {
            liberar = () => resolve({ corridaId: 'c1', resultados: [] });
          }),
      );

      const primera = ejecutarAsignacionADemanda(undefined, prismaMock());
      await new Promise((r) => setImmediate(r));
      expect(hayCorridaEnCurso()).toBe(true);

      await expect(ejecutarAsignacionADemanda(undefined, prismaMock())).rejects.toMatchObject({
        status: 409,
      });
      await expect(ejecutarAsignacionADemanda('s1', prismaMock())).rejects.toMatchObject({
        status: 409,
      });
      expect(batch).toHaveBeenCalledTimes(1);
      expect(individual).not.toHaveBeenCalled();

      liberar();
      await primera;
      expect(hayCorridaEnCurso()).toBe(false);
    });

    it('libera el candado aunque el motor falle, para poder reintentar', async () => {
      batch.mockRejectedValueOnce(new Error('falla del motor'));
      await expect(ejecutarAsignacionADemanda(undefined, prismaMock())).rejects.toThrow(
        'falla del motor',
      );
      expect(hayCorridaEnCurso()).toBe(false);

      batch.mockResolvedValueOnce({ corridaId: 'c2', resultados: [] });
      await expect(ejecutarAsignacionADemanda(undefined, prismaMock())).resolves.toMatchObject({
        corridaId: 'c2',
      });
    });

    it('libera el candado también cuando la sección no existe (404)', async () => {
      await expect(ejecutarAsignacionADemanda('nope', prismaMock(null))).rejects.toMatchObject({
        status: 404,
      });
      expect(hayCorridaEnCurso()).toBe(false);
    });

    describe('bloqueo en base para varias instancias (Issue 5.33 / R28)', () => {
      it('rechaza con 409 si otra instancia ya tiene el advisory lock en PostgreSQL', async () => {
        const prisma = prismaMock();
        establecerClienteCandado({
          $queryRaw: jest.fn().mockResolvedValue([{ locked: false }]),
          $disconnect: jest.fn(),
        } as any);

        await expect(ejecutarAsignacionADemanda(undefined, prisma)).rejects.toMatchObject({
          status: 409,
        });
        expect(batch).not.toHaveBeenCalled();
        expect(hayCorridaEnCurso()).toBe(false);
      });

      it('adquiere y libera el advisory lock en la base si está disponible', async () => {
        batch.mockResolvedValue({ corridaId: 'c-adv', resultados: [] });
        const prisma = prismaMock();
        prisma.$queryRaw = jest.fn();
        const cliente = {
          $queryRaw: jest
            .fn()
            .mockResolvedValueOnce([{ locked: true }])
            .mockResolvedValueOnce([{ unlocked: true }]),
          $disconnect: jest.fn(),
        };
        establecerClienteCandado(cliente as any);

        const res = await ejecutarAsignacionADemanda(undefined, prisma);

        expect(res.corridaId).toBe('c-adv');
        // Lock y unlock van por el cliente de sesión propio, nunca por el de la aplicación
        // (que en producción pasa por el pooler en modo transacción).
        expect(cliente.$queryRaw).toHaveBeenCalledTimes(2);
        expect(prisma.$queryRaw).not.toHaveBeenCalled();
        expect(hayCorridaEnCurso()).toBe(false);
      });
    });
  });
});
