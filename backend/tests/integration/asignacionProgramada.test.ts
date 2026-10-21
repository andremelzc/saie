const prismaMock: any = {
  seccion: { findFirst: jest.fn(), findUnique: jest.fn() },
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

jest.mock('../../src/services/motor.service', () => ({
  procesarAsignacionSeccionIndividual: jest.fn(),
  procesarCorridaBatchPeriodo: jest.fn(),
}));

jest.mock('../../src/services/verificador.service', () => ({
  verificarCorridaPeriodo: jest.fn(),
}));

import request from 'supertest';
import { createApp } from '../../src/app';
import { procesarCorridaBatchPeriodo } from '../../src/services/motor.service';
import { verificarCorridaPeriodo } from '../../src/services/verificador.service';

const TOKEN = 'token-programada-de-pruebas';
const app = createApp();

beforeEach(() => {
  jest.clearAllMocks();
  process.env.ASIGNACION_PROGRAMADA_TOKEN = TOKEN;
  prismaMock.seccion.findFirst.mockResolvedValue({ periodo: '2026-1' });

  (procesarCorridaBatchPeriodo as jest.Mock).mockResolvedValue({
    corridaId: 'corrida-prog',
    resultados: [
      {
        seccionId: 's1',
        codigoSeccion: '1',
        cursoId: 'c',
        estado: 'VIGENTE',
        espacioIds: ['e1'],
        huellaEntrada: 'h',
      },
    ],
  });
  (verificarCorridaPeriodo as jest.Mock).mockResolvedValue({
    conforme: true,
    totalRevisadas: 1,
    totalViolaciones: 0,
    reglas: [],
  });
});

afterAll(() => {
  delete process.env.ASIGNACION_PROGRAMADA_TOKEN;
});

describe('POST /api/v1/asignaciones/programada (Issue 2.18)', () => {
  it('responde 503 si el token de servicio no está configurado (falla cerrado)', async () => {
    delete process.env.ASIGNACION_PROGRAMADA_TOKEN;

    const res = await request(app)
      .post('/api/v1/asignaciones/programada')
      .set('Authorization', `Bearer ${TOKEN}`);

    expect(res.status).toBe(503);
    expect(procesarCorridaBatchPeriodo).not.toHaveBeenCalled();
  });

  it('responde 401 si falta la cabecera Authorization', async () => {
    const res = await request(app).post('/api/v1/asignaciones/programada');
    expect(res.status).toBe(401);
  });

  it('responde 403 con un token incorrecto', async () => {
    const res = await request(app)
      .post('/api/v1/asignaciones/programada')
      .set('Authorization', 'Bearer token-falso');

    expect(res.status).toBe(403);
    expect(procesarCorridaBatchPeriodo).not.toHaveBeenCalled();
  });

  it('con token válido ejecuta la corrida del periodo vigente sin exigir JWT', async () => {
    const res = await request(app)
      .post('/api/v1/asignaciones/programada')
      .set('Authorization', `Bearer ${TOKEN}`);

    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({
      modo: 'periodo',
      periodo: '2026-1',
      corridaId: 'corrida-prog',
      asignadas: 1,
      verificacion: { conforme: true },
    });
    // La corrida se marca con origen TIEMPO para la auditoría.
    expect(procesarCorridaBatchPeriodo).toHaveBeenCalledWith('2026-1', prismaMock, 'TIEMPO');
  });

  it('responde 409 si ya hay una corrida en curso (el workflow reintenta)', async () => {
    let liberar!: () => void;
    (procesarCorridaBatchPeriodo as jest.Mock).mockImplementation(
      () =>
        new Promise((resolve) => {
          liberar = () => resolve({ corridaId: 'c', resultados: [] });
        }),
    );

    const primera = request(app)
      .post('/api/v1/asignaciones/programada')
      .set('Authorization', `Bearer ${TOKEN}`)
      .then((r) => r);
    await new Promise((r) => setTimeout(r, 100));

    const segunda = await request(app)
      .post('/api/v1/asignaciones/programada')
      .set('Authorization', `Bearer ${TOKEN}`);
    expect(segunda.status).toBe(409);

    liberar();
    expect((await primera).status).toBe(200);
  });
});
