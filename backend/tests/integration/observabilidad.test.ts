// Issue 1.15 — X-Request-Id en todas las respuestas y en el log, /health con verificación de la
// base de datos (503 si falla o no responde) y requestId en los errores 500.
process.env.HEALTH_DB_TIMEOUT_MS = '100';

const prismaMock: any = {
  $queryRaw: jest.fn(),
  cuenta: { findUnique: jest.fn() },
  alumno: { findUnique: jest.fn() },
};

jest.mock('../../src/lib/prisma', () => ({
  __esModule: true,
  get prisma() {
    return prismaMock;
  },
  get default() {
    return prismaMock;
  },
}));

import request from 'supertest';
import { createApp } from '../../src/app';
import { logger } from '../../src/lib/logger';

const app = createApp();
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

beforeEach(() => {
  jest.clearAllMocks();
  prismaMock.$queryRaw.mockResolvedValue([{ '?column?': 1 }]);
});

describe('X-Request-Id', () => {
  it('toda respuesta lo trae, incluidos los 404', async () => {
    const ok = await request(app).get('/api/health');
    const noExiste = await request(app).get('/api/v1/no-existe');
    expect(ok.headers['x-request-id']).toMatch(UUID);
    expect(noExiste.status).toBe(404);
    expect(noExiste.headers['x-request-id']).toMatch(UUID);
  });

  it('cada petición recibe un id distinto', async () => {
    const a = await request(app).get('/api/health');
    const b = await request(app).get('/api/health');
    expect(a.headers['x-request-id']).not.toBe(b.headers['x-request-id']);
  });

  it('reutiliza el id del cliente si tiene forma segura y descarta el que no', async () => {
    const propio = await request(app).get('/api/health').set('X-Request-Id', 'front-abc12345');
    expect(propio.headers['x-request-id']).toBe('front-abc12345');

    const malo = await request(app).get('/api/health').set('X-Request-Id', 'corto');
    expect(malo.headers['x-request-id']).toMatch(UUID);
  });

  it('el id queda en el log de la petición, con método, ruta sin query y estado', async () => {
    const info = jest.spyOn(logger, 'info').mockImplementation(() => undefined);
    const res = await request(app).get('/api/health?secreto=1');
    const lineas = info.mock.calls.map((c) => c[0] as Record<string, unknown>);
    info.mockRestore();

    const linea = lineas.find((l) => l.requestId === res.headers['x-request-id']);
    expect(linea).toMatchObject({ metodo: 'GET', ruta: '/api/health', estado: 200 });
    expect(JSON.stringify(linea)).not.toContain('secreto');
    expect(typeof linea?.duracionMs).toBe('number');
  });

  it('se expone a CORS para que el frontend pueda leerlo', async () => {
    const res = await request(app).get('/api/health').set('Origin', 'http://localhost:5173');
    expect(res.headers['access-control-expose-headers']).toMatch(/X-Request-Id/i);
  });
});

describe('GET /api/health', () => {
  it('responde 200 con database ok cuando la base responde', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ status: 'ok', database: 'ok', service: 'saie-backend' });
    expect(prismaMock.$queryRaw).toHaveBeenCalledTimes(1);
  });

  it('responde 503 cuando la consulta a la base falla, sin exponer el motivo', async () => {
    prismaMock.$queryRaw.mockRejectedValue(new Error('connection refused db.interna:5432'));
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(503);
    expect(res.body).toMatchObject({ status: 'error', database: 'unavailable' });
    expect(JSON.stringify(res.body)).not.toMatch(/refused|5432|interna/);
    expect(res.headers['x-request-id']).toMatch(UUID);
  });

  it('responde 503 cuando la base no contesta antes del tiempo máximo', async () => {
    prismaMock.$queryRaw.mockReturnValue(new Promise(() => undefined));
    const inicio = Date.now();
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(503);
    expect(res.body.database).toBe('unavailable');
    expect(Date.now() - inicio).toBeLessThan(2000);
  });
});

describe('requestId en los errores 500', () => {
  it('un error no controlado en un controlador devuelve el requestId igual al de la cabecera', async () => {
    prismaMock.cuenta.findUnique.mockRejectedValue(new Error('fallo técnico sensible'));
    const error = jest.spyOn(logger, 'error').mockImplementation(() => undefined);

    const res = await request(app)
      .post('/api/v1/auth/admin/login')
      .send({ usuario: 'coordinacion', clave: 'x' });
    const llamadas = error.mock.calls.map((c) => JSON.stringify(c[0]));
    error.mockRestore();

    expect(res.status).toBe(500);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toBe('Error interno del servidor');
    expect(res.body.requestId).toBe(res.headers['x-request-id']);
    expect(JSON.stringify(res.body)).not.toMatch(/sensible/);
    // El log lleva el mismo id para poder seguir el error.
    expect(llamadas.some((l) => l.includes(res.body.requestId))).toBe(true);
  });
});
