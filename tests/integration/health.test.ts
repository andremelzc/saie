// Mock del cliente Prisma para evitar que instancie PrismaClient sin driver adapter
// en entornos de test sin base de datos configurada (Prisma 7 con prisma.config.ts).
jest.mock('../../backend/src/lib/prisma', () => ({
  __esModule: true,
  prisma: {
    $connect: jest.fn(),
    $disconnect: jest.fn(),
  },
  default: {
    $connect: jest.fn(),
    $disconnect: jest.fn(),
  },
}));

import request from 'supertest';
import { createApp } from '../../backend/src/app';

describe('Integracion API - Health Check', () => {
  const app = createApp();

  it('GET /api/health debe responder 200 con status ok', async () => {
    const response = await request(app).get('/api/health');

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('status', 'ok');
    expect(response.body).toHaveProperty('service', 'saie-backend');
    expect(response.body).toHaveProperty('timestamp');
  });

  it('GET /api/ruta-inexistente debe responder 404', async () => {
    const response = await request(app).get('/api/ruta-inexistente');

    expect(response.status).toBe(404);
    expect(response.body).toHaveProperty('error', 'Not Found');
  });
});
