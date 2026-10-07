// Prueba de las rutas HTTP del Sprint 3 con Prisma simulado: verifica el contrato de
// autenticación (401/403) y el cableado de controladores sin necesitar base de datos.
const prismaMock: any = {
  cuenta: { findUnique: jest.fn() },
  alumno: { findUnique: jest.fn() },
  docente: { findUnique: jest.fn() },
  seccion: { findFirst: jest.fn(), findMany: jest.fn() },
  matricula: { findMany: jest.fn() },
  espacio: { findUnique: jest.fn(), findMany: jest.fn(), update: jest.fn() },
  espacioResponsable: { findUnique: jest.fn() },
  historialEspacio: { create: jest.fn() },
  asignacion: { findMany: jest.fn(), findFirst: jest.fn() },
  alerta: { findMany: jest.fn(), create: jest.fn(), update: jest.fn() },
  incidencia: { create: jest.fn() },
  $transaction: jest.fn((fn: (tx: unknown) => unknown) => fn(prismaMock)),
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
import { firmarToken } from '../../src/services/auth.service';

process.env.JWT_SECRET = 'secreto-de-pruebas';

const app = createApp();
const bearer = (rol: RolCuenta, sub = 'cuenta-1') => `Bearer ${firmarToken({ sub, rol })}`;

beforeEach(() => {
  jest.clearAllMocks();
  prismaMock.$transaction.mockImplementation((fn: (tx: unknown) => unknown) => fn(prismaMock));
});

describe('Login por rol (Issues 4.8, 3.21, 7.1)', () => {
  function cuenta(rol: RolCuenta, debeCambiarClave = true) {
    return {
      id: 'c1',
      rol,
      usuarioLogin: 'u',
      claveHash: bcrypt.hashSync('clave123', 4),
      debeCambiarClave,
    };
  }

  it.each([
    ['/api/v1/auth/admin/login', RolCuenta.COORDINACION_ACADEMICA, { usuario: 'u' }],
    ['/api/v1/auth/admin/login', RolCuenta.JEFATURA_LABORATORIOS, { usuario: 'u' }],
    ['/api/v1/auth/alumno/login', RolCuenta.ALUMNO, { codigo: 'u' }],
    ['/api/v1/auth/docente/login', RolCuenta.DOCENTE, { codigo: 'u' }],
  ])('%s emite token para %s e informa debeCambiarClave', async (ruta, rol, credencial) => {
    prismaMock.cuenta.findUnique.mockResolvedValue(cuenta(rol));

    const res = await request(app)
      .post(ruta)
      .send({ ...credencial, clave: 'clave123' });

    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({ rol, debeCambiarClave: true });
    expect(typeof res.body.data.token).toBe('string');
  });

  it('rechaza con 401 una cuenta de otro rol en cada login', async () => {
    prismaMock.cuenta.findUnique.mockResolvedValue(cuenta(RolCuenta.DOCENTE));
    for (const ruta of ['/api/v1/auth/admin/login', '/api/v1/auth/alumno/login']) {
      const res = await request(app).post(ruta).send({ usuario: 'u', clave: 'clave123' });
      expect(res.status).toBe(401);
    }
  });

  it('rechaza con 401 una clave incorrecta y con 400 un cuerpo incompleto', async () => {
    prismaMock.cuenta.findUnique.mockResolvedValue(cuenta(RolCuenta.ALUMNO));
    const mala = await request(app)
      .post('/api/v1/auth/alumno/login')
      .send({ codigo: 'u', clave: 'x' });
    expect(mala.status).toBe(401);

    const incompleto = await request(app).post('/api/v1/auth/alumno/login').send({ clave: 'x' });
    expect(incompleto.status).toBe(400);
  });
});

describe('Panel administrativo: autenticación y rol (Issue 4.8)', () => {
  const rutas = [
    '/api/v1/admin/laboratorios/L1/software',
    '/api/v1/admin/laboratorios/L1/pcs-malogradas',
  ];

  it.each(rutas)('%s rechaza peticiones sin token con 401', async (ruta) => {
    expect((await request(app).post(ruta).send({})).status).toBe(401);
    expect(
      (await request(app).post(ruta).set('Authorization', 'Bearer invalido').send({})).status,
    ).toBe(401);
  });

  it.each(rutas)('%s rechaza tokens de alumno y docente con 403', async (ruta) => {
    for (const rol of [RolCuenta.ALUMNO, RolCuenta.DOCENTE]) {
      const res = await request(app).post(ruta).set('Authorization', bearer(rol)).send({});
      expect(res.status).toBe(403);
    }
  });

  it('valida el cuerpo con 400 antes de tocar la base de datos', async () => {
    const auth = bearer(RolCuenta.COORDINACION_ACADEMICA);
    const sw = await request(app)
      .post('/api/v1/admin/laboratorios/L1/software')
      .set('Authorization', auth)
      .send({ softwareInstalado: 'no-es-lista' });
    const pcs = await request(app)
      .post('/api/v1/admin/laboratorios/L1/pcs-malogradas')
      .set('Authorization', auth)
      .send({ pcsMalogradas: -1 });

    expect(sw.status).toBe(400);
    expect(pcs.status).toBe(400);
    expect(prismaMock.espacio.findUnique).not.toHaveBeenCalled();
  });

  it('404 con mensaje claro si el laboratorio no existe', async () => {
    prismaMock.espacio.findUnique.mockResolvedValue(null);
    const res = await request(app)
      .post('/api/v1/admin/laboratorios/nope/software')
      .set('Authorization', bearer(RolCuenta.COORDINACION_ACADEMICA))
      .send({ softwareInstalado: ['Git'] });

    expect(res.status).toBe(404);
    expect(res.body.message).toContain('no existe');
  });

  it('403 si Jefatura no es responsable del laboratorio', async () => {
    prismaMock.espacio.findUnique.mockResolvedValue({
      id: 'L1',
      identificador: 'Lab 01',
      tipo: 'LABORATORIO',
      aforoNominal: 30,
      softwareInstalado: [],
      pcsMalogradas: 0,
    });
    prismaMock.espacioResponsable.findUnique.mockResolvedValue(null);

    const res = await request(app)
      .post('/api/v1/admin/laboratorios/L1/pcs-malogradas')
      .set('Authorization', bearer(RolCuenta.JEFATURA_LABORATORIOS))
      .send({ pcsMalogradas: 2 });

    expect(res.status).toBe(403);
    expect(prismaMock.espacio.update).not.toHaveBeenCalled();
  });

  it('422 si el conteo de PCs excede el aforo nominal', async () => {
    prismaMock.espacio.findUnique.mockResolvedValue({
      id: 'L1',
      identificador: 'Lab 01',
      tipo: 'LABORATORIO',
      aforoNominal: 30,
      softwareInstalado: [],
      pcsMalogradas: 0,
    });

    const res = await request(app)
      .post('/api/v1/admin/laboratorios/L1/pcs-malogradas')
      .set('Authorization', bearer(RolCuenta.COORDINACION_ACADEMICA))
      .send({ pcsMalogradas: 99 });

    expect(res.status).toBe(422);
  });
});

describe('Portal del alumno: solo rol ALUMNO (Issues 3.10–3.12)', () => {
  const rutas = [
    '/api/v1/estudiante/horario',
    '/api/v1/estudiante/cursos',
    '/api/v1/estudiante/perfil',
  ];

  it.each(rutas)('GET %s rechaza sin token (401) y con rol docente/admin (403)', async (ruta) => {
    expect((await request(app).get(ruta)).status).toBe(401);
    for (const rol of [
      RolCuenta.DOCENTE,
      RolCuenta.COORDINACION_ACADEMICA,
      RolCuenta.JEFATURA_LABORATORIOS,
    ]) {
      expect((await request(app).get(ruta).set('Authorization', bearer(rol))).status).toBe(403);
    }
  });

  it('el perfil se resuelve por la cuenta del token y no se cachea', async () => {
    prismaMock.alumno.findUnique.mockResolvedValue({
      codigo: '22200101',
      nombre: 'Ana',
      correo: 'a@x.pe',
      dni: '12345678',
      fechaNacimiento: null,
      telefono: null,
      direccion: null,
      fichaMedica: {
        tipoSangre: 'O+',
        alergias: null,
        condicionEspecial: null,
        contactoEmergencia: null,
      },
    });

    const res = await request(app)
      .get('/api/v1/estudiante/perfil')
      .set('Authorization', bearer(RolCuenta.ALUMNO, 'cuenta-ana'));

    expect(res.status).toBe(200);
    expect(res.headers['cache-control']).toBe('no-store');
    expect(prismaMock.alumno.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { cuentaId: 'cuenta-ana' } }),
    );
    expect(res.body.data.fichaMedica.tipoSangre).toBe('O+');
  });

  it('PATCH perfil rechaza con 400 datos con formato inválido', async () => {
    const res = await request(app)
      .patch('/api/v1/estudiante/perfil')
      .set('Authorization', bearer(RolCuenta.ALUMNO))
      .send({ datosPersonales: { dni: 'abc', telefono: '1' } });

    expect(res.status).toBe(400);
    expect(res.body.errors.length).toBeGreaterThanOrEqual(2);
  });

  it('horario rechaza un día inválido con 400', async () => {
    const res = await request(app)
      .get('/api/v1/estudiante/horario?dia=someday')
      .set('Authorization', bearer(RolCuenta.ALUMNO));
    expect(res.status).toBe(400);
  });

  it('la consulta pública por código sigue sin exigir login', async () => {
    prismaMock.alumno.findUnique.mockResolvedValue(null);
    const res = await request(app).get('/api/v1/consulta/alumno/22200101');
    expect(res.status).toBe(404); // llega al controlador (no 401)
  });
});

describe('Portal docente: solo rol DOCENTE (Issues 7.2, 7.3, 7.5)', () => {
  const rutas: Array<['get' | 'post', string]> = [
    ['get', '/api/v1/docente/horario'],
    ['get', '/api/v1/docente/espacios/explorador'],
    ['post', '/api/v1/docente/incidencias'],
  ];

  it.each(rutas)(
    '%s %s rechaza sin token (401) y con rol alumno/admin (403)',
    async (metodo, ruta) => {
      expect((await request(app)[metodo](ruta)).status).toBe(401);
      for (const rol of [RolCuenta.ALUMNO, RolCuenta.COORDINACION_ACADEMICA]) {
        expect((await request(app)[metodo](ruta).set('Authorization', bearer(rol))).status).toBe(
          403,
        );
      }
    },
  );

  it('explorador valida filtros con 400', async () => {
    const auth = bearer(RolCuenta.DOCENTE);
    const piso = await request(app)
      .get('/api/v1/docente/espacios/explorador?piso=abc')
      .set('Authorization', auth);
    const tipo = await request(app)
      .get('/api/v1/docente/espacios/explorador?tipo=PATIO')
      .set('Authorization', auth);
    const franjaIncompleta = await request(app)
      .get('/api/v1/docente/espacios/explorador?dia=LUNES')
      .set('Authorization', auth);

    expect(piso.status).toBe(400);
    expect(tipo.status).toBe(400);
    expect(franjaIncompleta.status).toBe(400);
  });

  it('explorador responde 200 con los espacios filtrados', async () => {
    prismaMock.espacio.findMany.mockResolvedValue([
      {
        id: 'a1',
        identificador: 'Aula 101',
        tipo: 'AULA_TEORICA',
        pabellon: 'A',
        piso: 1,
        aforoNominal: 40,
        pcsMalogradas: null,
      },
    ]);
    prismaMock.asignacion.findMany.mockResolvedValue([]);

    const res = await request(app)
      .get(
        '/api/v1/docente/espacios/explorador?tipo=AULA_TEORICA&pabellon=A&piso=1&dia=lunes&horaInicio=08:00&horaFin=10:00',
      )
      .set('Authorization', bearer(RolCuenta.DOCENTE));

    expect(res.status).toBe(200);
    expect(res.body.data.espacios).toEqual([
      expect.objectContaining({ id: 'a1', disponible: true }),
    ]);
  });

  it('crear incidencia responde 201 con el identificador de seguimiento', async () => {
    prismaMock.docente.findUnique.mockResolvedValue({ id: 'doc-1' });
    prismaMock.asignacion.findFirst.mockResolvedValue({
      id: 'asig-1',
      espacios: [{ espacioId: 'e1' }],
    });
    prismaMock.incidencia.create.mockImplementation(async ({ data }: any) => ({
      ...data,
      fechaReporte: new Date(),
    }));

    const res = await request(app)
      .post('/api/v1/docente/incidencias')
      .set('Authorization', bearer(RolCuenta.DOCENTE))
      .send({
        asignacionId: 'asig-1',
        espacioId: 'e1',
        tipo: 'SOFTWARE_FALTANTE',
        descripcion: 'Falta instalar Docker',
        prioridad: 'ALTA',
      });

    expect(res.status).toBe(201);
    expect(res.body.data.identificadorSeguimiento).toMatch(/^INC-[0-9A-F]{8}$/);
  });

  it('crear incidencia rechaza con 400 un cuerpo inválido', async () => {
    const res = await request(app)
      .post('/api/v1/docente/incidencias')
      .set('Authorization', bearer(RolCuenta.DOCENTE))
      .send({ asignacionId: 'a', espacioId: 'e', tipo: 'NO_EXISTE', descripcion: 'ok ok ok' });
    expect(res.status).toBe(400);
  });
});
