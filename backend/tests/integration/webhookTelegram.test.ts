const prismaMock: any = {
  seccion: { findFirst: jest.fn().mockResolvedValue({ periodo: '2026-1' }) },
  vinculacionTelegram: {
    findMany: jest.fn().mockResolvedValue([]),
    findUnique: jest.fn().mockResolvedValue(null),
    updateMany: jest.fn().mockResolvedValue({ count: 0 }),
    upsert: jest.fn().mockResolvedValue({}),
  },
  alumno: { findUnique: jest.fn() },
  cuenta: { findUnique: jest.fn() },
  $transaction: jest.fn((fn: any) => fn(prismaMock)),
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

// Mock del cliente telegram para no hacer peticiones de red reales
jest.mock('../../src/telegram/cliente', () => {
  const original = jest.requireActual('../../src/telegram/cliente');
  return {
    ...original,
    crearClienteTelegram: jest.fn(() => ({
      enviarMensaje: jest.fn().mockResolvedValue(undefined),
      borrarMensaje: jest.fn().mockResolvedValue(undefined),
    })),
  };
});

import request from 'supertest';
import { createApp } from '../../src/app';

const WEBHOOK_SECRET = 'test-webhook-secret';
const RESUMEN_TOKEN = 'test-resumen-token';

process.env.TELEGRAM_WEBHOOK_SECRET = WEBHOOK_SECRET;
process.env.RESUMEN_DIARIO_TOKEN = RESUMEN_TOKEN;
process.env.TELEGRAM_BOT_TOKEN = 'test-bot-token';

const app = createApp();

beforeEach(() => {
  jest.clearAllMocks();
});

describe('Integración Telegram (Issue #255)', () => {
  describe('POST /api/v1/telegram/webhook (Issue 3.25)', () => {
    it('responde 401 si falta el encabezado X-Telegram-Bot-Api-Secret-Token', async () => {
      const res = await request(app)
        .post('/api/v1/telegram/webhook')
        .send({ update_id: 1, message: { text: '/start', chat: { id: 1, type: 'private' } } });

      expect(res.status).toBe(401);
    });

    it('responde 401 si el secreto del encabezado es incorrecto', async () => {
      const res = await request(app)
        .post('/api/v1/telegram/webhook')
        .set('x-telegram-bot-api-secret-token', 'secreto-invalido')
        .send({ update_id: 1, message: { text: '/start', chat: { id: 1, type: 'private' } } });

      expect(res.status).toBe(401);
    });

    it('responde 200 siempre cuando el secreto es válido', async () => {
      const res = await request(app)
        .post('/api/v1/telegram/webhook')
        .set('x-telegram-bot-api-secret-token', WEBHOOK_SECRET)
        .send({
          update_id: 1,
          message: {
            message_id: 10,
            text: '/start',
            chat: { id: 12345, type: 'private' },
          },
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  describe('POST /api/v1/telegram/resumen-diario (Issue 3.27)', () => {
    it('responde 401 si falta la cabecera Authorization', async () => {
      const res = await request(app).post('/api/v1/telegram/resumen-diario');
      expect(res.status).toBe(401);
    });

    it('responde 403 si el token de servicio es incorrecto', async () => {
      const res = await request(app)
        .post('/api/v1/telegram/resumen-diario')
        .set('Authorization', 'Bearer token-falso');

      expect(res.status).toBe(403);
    });

    it('responde 200 con el resumen de envíos cuando el token de servicio es correcto', async () => {
      const res = await request(app)
        .post('/api/v1/telegram/resumen-diario')
        .set('Authorization', `Bearer ${RESUMEN_TOKEN}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toBeDefined();
      expect(res.body.data).toHaveProperty('destinatarios');
      expect(res.body.data).toHaveProperty('enviados');
    });
  });
});
