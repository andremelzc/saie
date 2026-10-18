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
import { RolCuenta } from '@prisma/client';
import { createApp } from '../../src/app';
import { firmarToken } from '../../src/services/auth.service';

const WEBHOOK_SECRET = 'test-webhook-secret';
const RESUMEN_TOKEN = 'test-resumen-token';

process.env.TELEGRAM_WEBHOOK_SECRET = WEBHOOK_SECRET;
process.env.RESUMEN_DIARIO_TOKEN = RESUMEN_TOKEN;
process.env.TELEGRAM_BOT_TOKEN = 'test-bot-token';
process.env.JWT_SECRET = 'secreto-de-pruebas';
delete process.env.TELEGRAM_BOT_USERNAME;

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

  describe('Perfil del alumno: vinculación de Telegram (Issue 3.28)', () => {
    const bearer = (rol: RolCuenta = RolCuenta.ALUMNO, sub = 'cuenta-1') =>
      `Bearer ${firmarToken({ sub, rol })}`;

    it('GET /estudiante/telegram rechaza sin token (401) y con rol no alumno (403)', async () => {
      expect((await request(app).get('/api/v1/estudiante/telegram')).status).toBe(401);

      const docente = await request(app)
        .get('/api/v1/estudiante/telegram')
        .set('Authorization', bearer(RolCuenta.DOCENTE));
      expect(docente.status).toBe(403);
    });

    it('GET responde el estado de la vinculación del alumno del token (sin exponer el chat)', async () => {
      prismaMock.alumno.findUnique.mockResolvedValue({ id: 'alu-1' });
      prismaMock.vinculacionTelegram.findUnique.mockResolvedValue({
        activo: true,
        chatId: '99999',
        fechaVinculacion: new Date('2026-03-01T12:00:00.000Z'),
        fechaBaja: null,
      });

      const res = await request(app)
        .get('/api/v1/estudiante/telegram')
        .set('Authorization', bearer());

      expect(res.status).toBe(200);
      expect(res.body.data).toMatchObject({ vinculado: true, botUsername: null });
      expect(JSON.stringify(res.body.data)).not.toContain('99999');
      expect(prismaMock.vinculacionTelegram.findUnique).toHaveBeenCalledWith({
        where: { alumnoId: 'alu-1' },
      });
    });

    it('DELETE da de baja la propia vinculación y responde el estado desvinculado', async () => {
      prismaMock.alumno.findUnique.mockResolvedValue({ id: 'alu-1' });
      prismaMock.vinculacionTelegram.updateMany.mockResolvedValue({ count: 1 });
      prismaMock.vinculacionTelegram.findUnique.mockResolvedValue({
        activo: false,
        fechaVinculacion: new Date('2026-03-01T12:00:00.000Z'),
        fechaBaja: new Date('2026-04-01T12:00:00.000Z'),
      });

      const res = await request(app)
        .delete('/api/v1/estudiante/telegram')
        .set('Authorization', bearer());

      expect(res.status).toBe(200);
      expect(res.body.data.vinculado).toBe(false);
      expect(prismaMock.vinculacionTelegram.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { alumnoId: 'alu-1', activo: true } }),
      );
    });
  });
});
