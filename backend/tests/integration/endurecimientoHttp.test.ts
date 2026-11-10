// Issue 1.12 — Cabeceras de seguridad (helmet) y límite de intentos en los logins y en la
// consulta pública. Los límites se activan de forma explícita y con valores bajos, ANTES de
// crear la aplicación: el resto de las pruebas corre con los límites apagados (NODE_ENV=test).
process.env.JWT_SECRET = 'secreto-de-pruebas';
process.env.RATE_LIMIT_DISABLED = 'false';
process.env.RATE_LIMIT_LOGIN_MAX_USUARIO = '3';
process.env.RATE_LIMIT_LOGIN_MAX_IP = '6';
process.env.RATE_LIMIT_LOGIN_VENTANA_MS = '60000';
process.env.RATE_LIMIT_CONSULTA_MAX = '4';
process.env.RATE_LIMIT_CONSULTA_VENTANA_MS = '60000';

const prismaMock: any = {
  cuenta: { findUnique: jest.fn() },
  alumno: { findUnique: jest.fn() },
  docente: { findUnique: jest.fn() },
  seccion: { findMany: jest.fn(), findFirst: jest.fn() },
  matricula: { findMany: jest.fn() },
  asignacion: { findMany: jest.fn() },
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

import bcrypt from 'bcrypt';
import request from 'supertest';
import { RolCuenta } from '@prisma/client';
import { createApp } from '../../src/app';

const app = createApp();

beforeEach(() => {
  jest.clearAllMocks();
  // Cuenta inexistente: todo intento de login es un 401.
  prismaMock.cuenta.findUnique.mockResolvedValue(null);
  prismaMock.alumno.findUnique.mockResolvedValue(null);
  prismaMock.docente.findUnique.mockResolvedValue(null);
});

describe('Cabeceras de seguridad (helmet)', () => {
  it('las respuestas incluyen las cabeceras de helmet y no anuncian Express', async () => {
    const res = await request(app).get('/api/health');
    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['x-frame-options']).toBeDefined();
    expect(res.headers['strict-transport-security']).toBeDefined();
    expect(res.headers['x-powered-by']).toBeUndefined();
  });

  it('también están presentes en los errores (404)', async () => {
    const res = await request(app).get('/api/no-existe');
    expect(res.status).toBe(404);
    expect(res.headers['x-content-type-options']).toBe('nosniff');
  });
});

describe('Límite de intentos en los logins', () => {
  it('tras 3 intentos fallidos del mismo usuario responde 429 con Retry-After y mensaje en español', async () => {
    for (let i = 0; i < 3; i++) {
      const res = await request(app)
        .post('/api/v1/auth/admin/login')
        .send({ usuario: 'coordinacion', clave: 'incorrecta' });
      expect(res.status).toBe(401);
    }

    const bloqueado = await request(app)
      .post('/api/v1/auth/admin/login')
      .send({ usuario: 'Coordinacion', clave: 'incorrecta' });

    expect(bloqueado.status).toBe(429);
    expect(bloqueado.body).toEqual({
      success: false,
      message: 'Demasiados intentos. Espera un momento e inténtalo de nuevo.',
    });
    expect(Number(bloqueado.headers['retry-after'])).toBeGreaterThan(0);
    // Un intento bloqueado no llega a consultar la base.
    expect(prismaMock.cuenta.findUnique).toHaveBeenCalledTimes(3);
  });

  it('el bloqueo de un usuario no afecta a otro usuario', async () => {
    const res = await request(app)
      .post('/api/v1/auth/docente/login')
      .send({ codigo: 'D-0001', clave: 'incorrecta' });
    expect(res.status).toBe(401);
  });

  it('los intentos correctos no consumen el cupo', async () => {
    prismaMock.cuenta.findUnique.mockResolvedValue({
      id: 'c1',
      rol: RolCuenta.ALUMNO,
      usuarioLogin: '20200001',
      claveHash: bcrypt.hashSync('clave123', 4),
      activa: true,
      debeCambiarClave: false,
    });
    prismaMock.alumno.findUnique.mockResolvedValue({ id: 'a1', codigo: '20200001' });

    for (let i = 0; i < 5; i++) {
      const res = await request(app)
        .post('/api/v1/auth/alumno/login')
        .send({ codigo: '20200001', clave: 'clave123' });
      expect(res.status).toBe(200);
    }
  });

  it('aplica también un límite por IP aunque se cambie de usuario', async () => {
    const estados: number[] = [];
    for (let i = 0; i < 6; i++) {
      const res = await request(app)
        .post('/api/v1/auth/alumno/login')
        .send({ codigo: `2020${i}`, clave: 'incorrecta' });
      estados.push(res.status);
    }
    expect(estados).toContain(429);
  });
});

describe('Límite de la consulta pública', () => {
  it('responde 429 con la forma uniforme al superar el límite por IP, sin afectar el uso normal', async () => {
    const estados: number[] = [];
    for (let i = 0; i < 6; i++) {
      const res = await request(app).get('/api/v1/consulta/alumno/20200001');
      estados.push(res.status);
      if (res.status === 429) {
        expect(res.body.success).toBe(false);
        expect(res.headers['retry-after']).toBeDefined();
      }
    }
    expect(estados.slice(0, 4).every((s) => s !== 429)).toBe(true);
    expect(estados.slice(4)).toEqual([429, 429]);
  });
});
