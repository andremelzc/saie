const prismaMock: any = {
  seccion: { findUnique: jest.fn(), findFirst: jest.fn() },
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

import request from 'supertest';
import { RolCuenta } from '@prisma/client';
import { createApp } from '../../src/app';
import { firmarToken } from '../../src/services/auth.service';
import {
  procesarAsignacionSeccionIndividual,
  procesarCorridaBatchPeriodo,
} from '../../src/services/motor.service';

process.env.JWT_SECRET = 'secreto-de-pruebas';

const app = createApp();
const bearer = (rol: RolCuenta) => `Bearer ${firmarToken({ sub: 'cuenta-1', rol })}`;
const coordinacion = bearer(RolCuenta.COORDINACION_ACADEMICA);

beforeEach(() => {
  jest.clearAllMocks();
  prismaMock.seccion.findFirst.mockResolvedValue({ periodo: '2026-1' });
});

describe('POST /api/v1/asignaciones (Issue 2.15)', () => {
  const rutas = ['/api/v1/asignaciones/batch', '/api/v1/asignaciones/seccion/s1'];

  it.each(rutas)('%s rechaza sin token (401)', async (ruta) => {
    expect((await request(app).post(ruta)).status).toBe(401);
  });

  it.each(rutas)('%s solo permite Coordinación: el resto de roles recibe 403', async (ruta) => {
    for (const rol of [RolCuenta.JEFATURA_LABORATORIOS, RolCuenta.DOCENTE, RolCuenta.ALUMNO]) {
      const res = await request(app).post(ruta).set('Authorization', bearer(rol));
      expect(res.status).toBe(403);
    }
    expect(procesarCorridaBatchPeriodo).not.toHaveBeenCalled();
    expect(procesarAsignacionSeccionIndividual).not.toHaveBeenCalled();
  });

  it('batch: ejecuta la corrida del periodo vigente y devuelve el resumen', async () => {
    (procesarCorridaBatchPeriodo as jest.Mock).mockResolvedValue({
      corridaId: 'corrida-1',
      resultados: [
        {
          seccionId: 's1',
          codigoSeccion: '1',
          cursoId: 'c',
          estado: 'VIGENTE',
          espacioIds: ['e1'],
          huellaEntrada: 'h',
        },
        {
          seccionId: 's2',
          codigoSeccion: '2',
          cursoId: 'c',
          estado: 'ESCALADA',
          espacioIds: [],
          huellaEntrada: 'h',
          motivoEscalamiento: 'x',
        },
      ],
    });

    const res = await request(app)
      .post('/api/v1/asignaciones/batch')
      .set('Authorization', coordinacion);

    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({
      corridaId: 'corrida-1',
      asignadas: 1,
      mantenidas: 0,
      escaladas: 1,
    });
  });

  it('seccion/:id: ejecuta solo esa sección', async () => {
    prismaMock.seccion.findUnique.mockResolvedValue({ id: 's1', periodo: '2026-1' });
    (procesarAsignacionSeccionIndividual as jest.Mock).mockResolvedValue({
      seccionId: 's1',
      codigoSeccion: '1',
      cursoId: 'c',
      estado: 'VIGENTE',
      espacioIds: ['e1'],
      huellaEntrada: 'h',
    });

    const res = await request(app)
      .post('/api/v1/asignaciones/seccion/s1')
      .set('Authorization', coordinacion);

    expect(res.status).toBe(200);
    expect(res.body.data.modo).toBe('seccion');
    expect(procesarCorridaBatchPeriodo).not.toHaveBeenCalled();
  });

  it('seccion/:id: 404 si la sección no existe', async () => {
    prismaMock.seccion.findUnique.mockResolvedValue(null);
    const res = await request(app)
      .post('/api/v1/asignaciones/seccion/nope')
      .set('Authorization', coordinacion);
    expect(res.status).toBe(404);
  });

  it('409 mientras hay una corrida en curso', async () => {
    let liberar!: () => void;
    (procesarCorridaBatchPeriodo as jest.Mock).mockImplementation(
      () =>
        new Promise((resolve) => {
          liberar = () => resolve({ corridaId: 'c', resultados: [] });
        }),
    );

    const primera = request(app)
      .post('/api/v1/asignaciones/batch')
      .set('Authorization', coordinacion)
      .then((r) => r);
    await new Promise((r) => setTimeout(r, 100));

    const segunda = await request(app)
      .post('/api/v1/asignaciones/batch')
      .set('Authorization', coordinacion);
    expect(segunda.status).toBe(409);

    liberar();
    expect((await primera).status).toBe(200);
  });
});
