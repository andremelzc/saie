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
import { logger } from '../../src/lib/logger';
import { reiniciarTrabajosImportacion } from '../../src/services/trabajosImportacion';

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
  reiniciarTrabajosImportacion();
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
    // Issue 4.54: la importación recibe la cuenta que cargó el archivo.
    expect(ejecutarImportacion).toHaveBeenCalledWith(
      'horarios',
      filas,
      prismaMock,
      'cuenta-1',
      expect.any(Function),
    );
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
      'cuenta-1',
      expect.any(Function),
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
      'cuenta-1',
      expect.any(Function),
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
    const consola = jest.spyOn(logger, 'error').mockImplementation(() => undefined);
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

describe('Importación en segundo plano (Issue 1.19)', () => {
  const esperarTerminado = async (id: string) => {
    for (let i = 0; i < 20; i++) {
      const res = await request(app)
        .get(`/api/v1/import/trabajos/${id}`)
        .set('Authorization', coordinacion);
      if (res.body.data.estado !== 'EN_CURSO') return res;
      await new Promise((r) => setTimeout(r, 5));
    }
    throw new Error('la importación no terminó');
  };

  it('responde 202 con el identificador y luego entrega el resultado', async () => {
    const res = await request(app)
      .post('/api/v1/import/horarios/trabajos')
      .set('Authorization', coordinacion)
      .send([{ codigoCurso: 'C1' }]);

    expect(res.status).toBe(202);
    expect(res.body.data).toMatchObject({ tipo: 'horarios', estado: 'EN_CURSO', total: 1 });

    const final = await esperarTerminado(res.body.data.id);
    expect(final.status).toBe(200);
    expect(final.body.data).toMatchObject({ estado: 'TERMINADO', resultado });
  });

  it('rechaza con 409 una segunda importación del mismo tipo mientras otra está en curso', async () => {
    (ejecutarImportacion as jest.Mock).mockReturnValue(new Promise(() => undefined));
    const primera = await request(app)
      .post('/api/v1/import/matriculas/trabajos')
      .set('Authorization', coordinacion)
      .send([{}]);
    expect(primera.status).toBe(202);

    for (const ruta of ['/api/v1/import/matriculas/trabajos', '/api/v1/import/matriculas']) {
      const segunda = await request(app).post(ruta).set('Authorization', coordinacion).send([{}]);
      expect(segunda.status).toBe(409);
    }
  });

  it('404 con un identificador desconocido, 404 para un tipo desconocido y 403 sin permiso', async () => {
    const desconocido = await request(app)
      .get('/api/v1/import/trabajos/no-existe')
      .set('Authorization', coordinacion);
    expect(desconocido.status).toBe(404);

    const tipo = await request(app)
      .post('/api/v1/import/otro/trabajos')
      .set('Authorization', coordinacion)
      .send([{}]);
    expect(tipo.status).toBe(404);

    const alumno = await request(app)
      .post('/api/v1/import/horarios/trabajos')
      .set('Authorization', bearer(RolCuenta.ALUMNO))
      .send([{}]);
    expect(alumno.status).toBe(403);
  });
});
