const prismaMock: any = {};

jest.mock('../../src/lib/prisma', () => ({
  __esModule: true,
  get prisma() {
    return prismaMock;
  },
  get default() {
    return prismaMock;
  },
}));

jest.mock('../../src/services/importacion.service', () => ({
  ejecutarImportacion: jest.fn(),
}));

import request from 'supertest';
import { RolCuenta } from '@prisma/client';
import { createApp } from '../../src/app';
import { firmarToken } from '../../src/services/auth.service';
import { ejecutarImportacion } from '../../src/services/importacion.service';

process.env.JWT_SECRET = 'secreto-de-pruebas';

const app = createApp();
const bearer = (rol: RolCuenta) => `Bearer ${firmarToken({ sub: 'cuenta-1', rol })}`;
const coordinacion = bearer(RolCuenta.COORDINACION_ACADEMICA);

const resultado = {
  tipo: 'horarios',
  filasRecibidas: 1,
  procesados: { horariosProcesados: 1 },
  errores: [],
  exitosa: true,
  asignacion: { disparada: false, motivo: 'faltan matrículas', resumen: null },
};

beforeEach(() => {
  jest.clearAllMocks();
  (ejecutarImportacion as jest.Mock).mockResolvedValue(resultado);
});

describe('POST /api/v1/import/:tipo (Issue 1.6)', () => {
  it('rechaza sin token (401)', async () => {
    const res = await request(app).post('/api/v1/import/horarios').send([{}]);
    expect(res.status).toBe(401);
    expect(ejecutarImportacion).not.toHaveBeenCalled();
  });

  it('solo permite Coordinación: el resto de roles recibe 403', async () => {
    for (const rol of [RolCuenta.JEFATURA_LABORATORIOS, RolCuenta.DOCENTE, RolCuenta.ALUMNO]) {
      const res = await request(app)
        .post('/api/v1/import/horarios')
        .set('Authorization', bearer(rol))
        .send([{}]);
      expect(res.status).toBe(403);
    }
    expect(ejecutarImportacion).not.toHaveBeenCalled();
  });

  it('responde 404 ante un tipo de importación desconocido', async () => {
    const res = await request(app)
      .post('/api/v1/import/notas')
      .set('Authorization', coordinacion)
      .send([{}]);

    expect(res.status).toBe(404);
    expect(res.body.message).toContain('cursos-secciones');
    expect(ejecutarImportacion).not.toHaveBeenCalled();
  });

  it('importa un arreglo JSON de filas', async () => {
    const filas = [{ codigoCurso: 'C1' }];
    const res = await request(app)
      .post('/api/v1/import/horarios')
      .set('Authorization', coordinacion)
      .send(filas);

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ success: true, data: resultado });
    expect(ejecutarImportacion).toHaveBeenCalledWith('horarios', filas, prismaMock);
  });

  it('importa un objeto JSON con la propiedad datos', async () => {
    const res = await request(app)
      .post('/api/v1/import/docentes')
      .set('Authorization', coordinacion)
      .send({ datos: [{ codigoDocente: 'D1' }] });

    expect(res.status).toBe(200);
    expect(ejecutarImportacion).toHaveBeenCalledWith(
      'docentes',
      [{ codigoDocente: 'D1' }],
      prismaMock,
    );
  });

  it('importa un CSV enviado como text/csv y lo convierte a filas', async () => {
    const csv = 'codigoCurso,diaSemana,horaInicio\nC1,Miércoles,08:00\n';
    const res = await request(app)
      .post('/api/v1/import/horarios')
      .set('Authorization', coordinacion)
      .set('Content-Type', 'text/csv')
      .send(csv);

    expect(res.status).toBe(200);
    expect(ejecutarImportacion).toHaveBeenCalledWith(
      'horarios',
      [{ codigoCurso: 'C1', diaSemana: 'MIERCOLES', horaInicio: '08:00' }],
      prismaMock,
    );
  });

  it('acepta un cuerpo mayor al límite de 100 kb de los parsers globales', async () => {
    const filas = Array.from({ length: 4000 }, (_, i) => ({
      codigoAlumno: `2220${i}`,
      nombre: 'Alumno de prueba con nombre largo',
      correo: `alumno${i}@unmsm.edu.pe`,
    }));
    expect(JSON.stringify(filas).length).toBeGreaterThan(100 * 1024);

    const res = await request(app)
      .post('/api/v1/import/matriculas')
      .set('Authorization', coordinacion)
      .send(filas);

    expect(res.status).toBe(200);
  });

  it('responde 400 si el cuerpo no trae filas', async () => {
    const res = await request(app)
      .post('/api/v1/import/horarios')
      .set('Authorization', coordinacion)
      .send([]);

    expect(res.status).toBe(400);
    expect(res.body.message).toContain('no contiene filas');
  });

  it('responde 400 si no se envía cuerpo', async () => {
    const res = await request(app)
      .post('/api/v1/import/horarios')
      .set('Authorization', coordinacion);

    expect(res.status).toBe(400);
  });

  it('responde 400 ante un CSV mal formado', async () => {
    const res = await request(app)
      .post('/api/v1/import/horarios')
      .set('Authorization', coordinacion)
      .set('Content-Type', 'text/csv')
      .send('a,b,c\n1,2\n');

    expect(res.status).toBe(400);
    expect(res.body.message).toContain('CSV');
  });

  it('responde 400 ante un JSON mal formado', async () => {
    const res = await request(app)
      .post('/api/v1/import/horarios')
      .set('Authorization', coordinacion)
      .set('Content-Type', 'application/json')
      .send('{"datos": [');

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('no filtra el detalle de un error interno', async () => {
    const consola = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    (ejecutarImportacion as jest.Mock).mockRejectedValue(new Error('conexión a la base caída'));

    const res = await request(app)
      .post('/api/v1/import/horarios')
      .set('Authorization', coordinacion)
      .send([{}]);

    expect(res.status).toBe(500);
    expect(JSON.stringify(res.body)).not.toContain('conexión');
    consola.mockRestore();
  });
});
