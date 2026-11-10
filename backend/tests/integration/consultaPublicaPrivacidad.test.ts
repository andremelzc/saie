// Issue 3.37 / RNF-09 — La consulta pública (sin sesión) no expone el correo ni datos de salud.
// La prueba falla si aparece cualquier campo de `alumno` fuera de la lista permitida.
const prismaMock: any = {
  alumno: { findUnique: jest.fn() },
  curso: { findUnique: jest.fn() },
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

const app = createApp();

const CAMPOS_PERMITIDOS_DEL_ALUMNO = ['codigo', 'nombre'];
const PROHIBIDOS = /correo|movilidad|ficha|salud|condicion|@unmsm\.edu\.pe/i;

beforeEach(() => {
  jest.clearAllMocks();
});

describe('Consulta pública de alumno: datos personales mínimos (Issue 3.37)', () => {
  it('devuelve solo código y nombre de pila, aunque el alumno tenga correo y movilidad reducida', async () => {
    prismaMock.alumno.findUnique.mockResolvedValue({
      id: 'alu-1',
      codigo: '20200001',
      nombre: 'Valeria López Quispe',
      correo: 'valeria.lopez@unmsm.edu.pe',
      fichaMedica: { condicionAccesibilidad: 'MOVILIDAD_REDUCIDA' },
      matriculas: [
        {
          movilidadReducida: true,
          seccion: {
            codigoSeccion: '1',
            periodo: '2026-1',
            curso: { codigo: 'CC-101', nombre: 'Curso 1' },
            docente: null,
            horarios: [],
            asignaciones: [],
          },
        },
      ],
    });

    const res = await request(app).get('/api/v1/consulta/alumno/20200001');

    expect(res.status).toBe(200);
    expect(Object.keys(res.body.data.alumno).sort()).toEqual(CAMPOS_PERMITIDOS_DEL_ALUMNO);
    expect(res.body.data.alumno).toEqual({ codigo: '20200001', nombre: 'Valeria' });
    expect(JSON.stringify(res.body)).not.toMatch(PROHIBIDOS);
    // El resto de la consulta sigue funcionando.
    expect(res.body.data.asignaciones).toHaveLength(1);
  });

  it('un alumno inexistente sigue respondiendo 404 sin datos personales', async () => {
    prismaMock.alumno.findUnique.mockResolvedValue(null);
    const res = await request(app).get('/api/v1/consulta/alumno/22200101');
    expect(res.status).toBe(404);
    expect(JSON.stringify(res.body)).not.toMatch(PROHIBIDOS);
  });
});
