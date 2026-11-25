jest.mock('../../../src/lib/logger', () => ({
  logger: { warn: jest.fn(), info: jest.fn(), error: jest.fn() },
}));

import {
  ID_BLOQUEO_CORRIDA,
  adquirirCandado,
  establecerClienteCandado,
  hayCorridaEnCurso,
  liberarCandado,
  urlSesionCandado,
} from '../../../src/lib/candadoCorrida';
import { ejecutarAsignacionADemanda } from '../../../src/services/asignacionDemanda.service';
import { logger } from '../../../src/lib/logger';

jest.mock('../../../src/services/motor.service', () => ({
  procesarAsignacionSeccionIndividual: jest.fn(),
  procesarCorridaBatchPeriodo: jest.fn().mockRejectedValue(new Error('falla del motor')),
}));
jest.mock('../../../src/services/verificador.service', () => ({
  verificarCorridaPeriodo: jest.fn(),
}));

const warn = logger.warn as jest.Mock;

/**
 * Cliente falso de una sola sesión: recuerda si esa sesión tiene el lock, como Postgres. Un
 * `pg_advisory_unlock` en una sesión que no lo tiene devuelve false.
 */
function clienteSesion() {
  let tieneLock = false;
  const consultas: string[] = [];
  const cliente = {
    consultas,
    $queryRaw: jest.fn(async (partes: TemplateStringsArray, ...valores: unknown[]) => {
      const sql = partes.join('?');
      consultas.push(sql);
      expect(valores).toEqual([ID_BLOQUEO_CORRIDA]);
      if (sql.includes('pg_try_advisory_lock')) {
        tieneLock = true;
        return [{ locked: true }];
      }
      const unlocked = tieneLock;
      tieneLock = false;
      return [{ unlocked }];
    }),
    $disconnect: jest.fn(async () => {
      tieneLock = false;
    }),
    get tieneLock() {
      return tieneLock;
    },
  };
  return cliente;
}

beforeEach(() => {
  jest.clearAllMocks();
  delete process.env.CANDADO_CORRIDA_LEASE_MS;
  establecerClienteCandado(null);
});

describe('Candado de corridas seguro con el pooler (lib/candadoCorrida)', () => {
  it('toma y suelta el advisory lock en el mismo cliente de sesión', async () => {
    const cliente = clienteSesion();
    establecerClienteCandado(cliente);

    expect(await adquirirCandado()).toBe(true);
    expect(hayCorridaEnCurso()).toBe(true);
    expect(cliente.tieneLock).toBe(true);

    await liberarCandado();

    expect(cliente.consultas).toHaveLength(2);
    expect(cliente.consultas[0]).toContain('pg_try_advisory_lock');
    expect(cliente.consultas[1]).toContain('pg_advisory_unlock');
    expect(cliente.tieneLock).toBe(false);
    expect(hayCorridaEnCurso()).toBe(false);
    expect(warn).not.toHaveBeenCalled();
    expect(cliente.$disconnect).not.toHaveBeenCalled();
  });

  it('no deja el candado tomado si la corrida falla (se suelta en finally)', async () => {
    const cliente = clienteSesion();
    establecerClienteCandado(cliente);
    const prisma = {
      periodo: {
        findFirst: jest.fn().mockResolvedValue({ codigo: '2026-2' }),
        findUnique: jest.fn().mockResolvedValue({ estado: 'VIGENTE' }),
      },
    } as any;

    await expect(ejecutarAsignacionADemanda(undefined, prisma)).rejects.toThrow('falla del motor');

    expect(hayCorridaEnCurso()).toBe(false);
    expect(cliente.tieneLock).toBe(false);
    // Se puede volver a tomar enseguida.
    expect(await adquirirCandado()).toBe(true);
    await liberarCandado();
  });

  it('si pg_advisory_unlock devuelve false lo registra y cierra la sesión', async () => {
    const cliente = {
      $queryRaw: jest
        .fn()
        .mockResolvedValueOnce([{ locked: true }])
        .mockResolvedValueOnce([{ unlocked: false }]),
      $disconnect: jest.fn().mockResolvedValue(undefined),
    };
    establecerClienteCandado(cliente);

    await adquirirCandado();
    await liberarCandado();

    expect(warn).toHaveBeenCalledWith(expect.stringContaining('pg_advisory_unlock devolvió false'));
    // Cerrar la sesión hace que Postgres suelte cualquier lock que retuviera.
    expect(cliente.$disconnect).toHaveBeenCalledTimes(1);
    expect(hayCorridaEnCurso()).toBe(false);
  });

  it('si el unlock falla, cierra la sesión y suelta el candado en memoria', async () => {
    const cliente = {
      $queryRaw: jest
        .fn()
        .mockResolvedValueOnce([{ locked: true }])
        .mockRejectedValueOnce(new Error('conexión cerrada')),
      $disconnect: jest.fn().mockResolvedValue(undefined),
    };
    establecerClienteCandado(cliente);

    await adquirirCandado();
    await liberarCandado();

    expect(cliente.$disconnect).toHaveBeenCalledTimes(1);
    expect(warn).toHaveBeenCalled();
    expect(hayCorridaEnCurso()).toBe(false);
  });

  it('devuelve false si otra instancia tiene el lock, sin quedar tomado en memoria', async () => {
    establecerClienteCandado({
      $queryRaw: jest.fn().mockResolvedValue([{ locked: false }]),
      $disconnect: jest.fn(),
    });

    expect(await adquirirCandado()).toBe(false);
    expect(hayCorridaEnCurso()).toBe(false);
  });

  it('sin DIRECT_URL usa solo el candado en memoria', async () => {
    establecerClienteCandado(null);

    expect(await adquirirCandado()).toBe(true);
    expect(await adquirirCandado()).toBe(false);
    await liberarCandado();
    expect(await adquirirCandado()).toBe(true);
    await liberarCandado();
  });

  it('si la base no responde al tomar el lock, conserva el candado en memoria', async () => {
    establecerClienteCandado({
      $queryRaw: jest.fn().mockRejectedValue(new Error('sin conexión')),
      $disconnect: jest.fn().mockResolvedValue(undefined),
    });

    expect(await adquirirCandado()).toBe(true);
    expect(hayCorridaEnCurso()).toBe(true);
    expect(warn).toHaveBeenCalled();
    await liberarCandado();
    expect(hayCorridaEnCurso()).toBe(false);
  });

  it('da por abandonado un candado que supera el lease', async () => {
    process.env.CANDADO_CORRIDA_LEASE_MS = '1000';
    const ahora = jest.spyOn(Date, 'now').mockReturnValue(0);
    const cliente = clienteSesion();
    establecerClienteCandado(cliente);
    try {
      expect(await adquirirCandado()).toBe(true);
      ahora.mockReturnValue(500);
      expect(await adquirirCandado()).toBe(false);

      ahora.mockReturnValue(5000);
      expect(await adquirirCandado()).toBe(true);
      expect(warn).toHaveBeenCalledWith(
        expect.objectContaining({ transcurridoMs: 5000 }),
        expect.stringContaining('lease'),
      );
      await liberarCandado();
      expect(cliente.tieneLock).toBe(false);
    } finally {
      ahora.mockRestore();
    }
  });

  it('la URL de sesión usa una sola conexión y quita el modo pgbouncer', () => {
    const url = urlSesionCandado(
      'postgresql://u:p@aws-0-x.pooler.supabase.com:5432/postgres?pgbouncer=true',
    );
    expect(url).toContain('connection_limit=1');
    expect(url).not.toContain('pgbouncer');
    expect(url).toContain(':5432/');
  });
});
