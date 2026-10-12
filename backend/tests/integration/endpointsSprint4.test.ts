const prismaMock: any = {
  cuenta: { findUnique: jest.fn(), update: jest.fn() },
  alumno: { findUnique: jest.fn(), create: jest.fn() },
  docente: { findUnique: jest.fn(), create: jest.fn() },
  espacio: { findUnique: jest.fn(), findMany: jest.fn(), create: jest.fn(), update: jest.fn() },
  espacioResponsable: { findUnique: jest.fn(), findMany: jest.fn() },
  espacioContiguo: { findMany: jest.fn(), deleteMany: jest.fn(), createMany: jest.fn() },
  asignacion: { findUnique: jest.fn(), findMany: jest.fn() },
  alerta: { findMany: jest.fn(), findUnique: jest.fn(), update: jest.fn() },
  incidencia: { findMany: jest.fn(), findUnique: jest.fn(), update: jest.fn() },
  registroAuditoria: { create: jest.fn() },
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

import request from 'supertest';
import {
  RolCuenta,
  TipoEspacio,
  EstadoAlerta,
  TipoAlerta,
  EstadoIncidencia,
  PrioridadIncidencia,
  TipoIncidencia,
} from '@prisma/client';
import { createApp } from '../../src/app';
import { firmarToken } from '../../src/services/auth.service';

process.env.JWT_SECRET = 'secreto-de-pruebas';

const app = createApp();
const bearer = (rol: RolCuenta, sub = 'cuenta-1') => `Bearer ${firmarToken({ sub, rol })}`;

beforeEach(() => {
  jest.clearAllMocks();
  prismaMock.$transaction.mockImplementation((fn: (tx: unknown) => unknown) => fn(prismaMock));
});

describe('Endpoints Sprint 4 (Issue #267)', () => {
  describe('Protección transversal por rol', () => {
    it('rechaza 401 sin token en rutas admin', async () => {
      const res = await request(app).get('/api/v1/admin/alertas');
      expect(res.status).toBe(401);
    });

    it('rechaza 403 para rol ALUMNO o DOCENTE en panel admin', async () => {
      const resAlumno = await request(app)
        .get('/api/v1/admin/alertas')
        .set('Authorization', bearer(RolCuenta.ALUMNO));
      expect(resAlumno.status).toBe(403);

      const resDocente = await request(app)
        .get('/api/v1/admin/espacios')
        .set('Authorization', bearer(RolCuenta.DOCENTE));
      expect(resDocente.status).toBe(403);
    });

    it('rechaza 403 a JEFATURA_LABORATORIOS en rutas exclusivas de Coordinación', async () => {
      const tokenJefatura = bearer(RolCuenta.JEFATURA_LABORATORIOS);

      const resEspacio = await request(app)
        .post('/api/v1/admin/espacios')
        .set('Authorization', tokenJefatura)
        .send({
          identificador: 'A101',
          tipo: 'AULA_TEORICA',
          pabellon: 'A',
          piso: 1,
          aforoNominal: 30,
        });
      expect(resEspacio.status).toBe(403);

      const resAlumno = await request(app)
        .post('/api/v1/admin/alumnos')
        .set('Authorization', tokenJefatura)
        .send({ codigo: 'A2026', nombre: 'Test', correo: 't@test.com' });
      expect(resAlumno.status).toBe(403);

      const resDocente = await request(app)
        .post('/api/v1/admin/docentes')
        .set('Authorization', tokenJefatura)
        .send({
          codigoDocente: 'D2026',
          nombre: 'Test',
          correoInstitucional: 't@test.com',
          departamento: 'Sistemas',
        });
      expect(resDocente.status).toBe(403);

      const resReset = await request(app)
        .post('/api/v1/admin/usuarios/restablecer-clave')
        .set('Authorization', tokenJefatura)
        .send({ usuario: 'A2026' });
      expect(resReset.status).toBe(403);
    });
  });

  describe('Alertas (GET /admin/alertas y PATCH /admin/alertas/:id/resolver)', () => {
    it('GET /admin/alertas responde 200 con la lista de alertas pendientes', async () => {
      prismaMock.alerta.findMany.mockResolvedValue([
        {
          id: 'al-1',
          tipo: TipoAlerta.CAPACIDAD,
          motivo: 'Aforo superado',
          estado: EstadoAlerta.PENDIENTE,
          fechaDeteccion: new Date(),
          espacio: {
            id: 'e1',
            identificador: 'L101',
            tipo: TipoEspacio.LABORATORIO,
            pabellon: 'B',
            piso: 1,
            aforoNominal: 20,
            softwareInstalado: [],
            pcsMalogradas: 0,
          },
          asignacionesAfectadas: [],
        },
      ]);

      const res = await request(app)
        .get('/api/v1/admin/alertas')
        .set('Authorization', bearer(RolCuenta.COORDINACION_ACADEMICA));

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].id).toBe('al-1');
    });

    it('PATCH /admin/alertas/:id/resolver responde 200 al resolver', async () => {
      prismaMock.alerta.findUnique.mockResolvedValue({
        id: 'al-1',
        estado: EstadoAlerta.PENDIENTE,
        espacioId: 'e1',
      });
      prismaMock.alerta.update.mockResolvedValue({
        id: 'al-1',
        tipo: TipoAlerta.CAPACIDAD,
        estado: EstadoAlerta.RESUELTA,
        motivo: 'Resuelto',
        fechaDeteccion: new Date(),
        espacio: {
          id: 'e1',
          identificador: 'L101',
          pabellon: 'B',
          piso: 1,
        },
        asignacionesAfectadas: [],
      });

      const res = await request(app)
        .patch('/api/v1/admin/alertas/al-1/resolver')
        .set('Authorization', bearer(RolCuenta.COORDINACION_ACADEMICA));

      expect(res.status).toBe(200);
      expect(res.body.data.estado).toBe(EstadoAlerta.RESUELTA);
    });
  });

  describe('Mapa de Ocupación (GET /admin/mapa-ocupacion)', () => {
    it('responde 400 si falta el parámetro piso', async () => {
      const res = await request(app)
        .get('/api/v1/admin/mapa-ocupacion')
        .set('Authorization', bearer(RolCuenta.COORDINACION_ACADEMICA));
      expect(res.status).toBe(400);
    });

    it('responde 200 con los espacios del piso', async () => {
      prismaMock.espacio.findMany.mockResolvedValue([]);

      const res = await request(app)
        .get('/api/v1/admin/mapa-ocupacion?piso=2&pabellon=A')
        .set('Authorization', bearer(RolCuenta.COORDINACION_ACADEMICA));

      expect(res.status).toBe(200);
      expect(res.body.data.espacios).toBeDefined();
    });
  });

  describe('Secciones Escaladas (GET /admin/secciones-escaladas)', () => {
    it('responde 200 con la lista de secciones', async () => {
      prismaMock.asignacion.findMany.mockResolvedValue([]);

      const res = await request(app)
        .get('/api/v1/admin/secciones-escaladas?periodo=2026-1')
        .set('Authorization', bearer(RolCuenta.COORDINACION_ACADEMICA));

      expect(res.status).toBe(200);
      expect(res.body.data.secciones).toEqual([]);
      expect(res.body.data.total).toBe(0);
    });
  });

  describe('Incidencias (GET /admin/incidencias y PATCH /admin/incidencias/:id/resolver)', () => {
    it('GET /admin/incidencias responde 200 con lista', async () => {
      prismaMock.incidencia.findMany.mockResolvedValue([]);

      const res = await request(app)
        .get('/api/v1/admin/incidencias')
        .set('Authorization', bearer(RolCuenta.COORDINACION_ACADEMICA));

      expect(res.status).toBe(200);
      expect(res.body.data).toEqual([]);
    });

    it('PATCH /admin/incidencias/:id/resolver responde 200 al cerrar', async () => {
      prismaMock.incidencia.findUnique.mockResolvedValue({
        id: 'inc-1',
        espacioId: 'e-1',
        estado: EstadoIncidencia.PENDIENTE,
      });
      prismaMock.incidencia.update.mockResolvedValue({
        id: 'inc-1',
        tipo: TipoIncidencia.EQUIPO_NO_OPERATIVO,
        asignacionId: 'asig-1',
        espacioId: 'e-1',
        estado: EstadoIncidencia.RESUELTA,
        docenteId: 'doc-1',
        descripcion: 'Problema resuelto',
        prioridad: PrioridadIncidencia.MEDIA,
        evidencia: null,
        fechaReporte: new Date(),
        identificadorSeguimiento: 'INC-12345678',
        comentarioCierre: 'Se reparó la PC',
        fechaCierre: new Date(),
        espacio: {
          id: 'e-1',
          identificador: 'L1',
          tipo: TipoEspacio.LABORATORIO,
          pabellon: 'B',
          piso: 1,
          aforoNominal: 20,
          softwareInstalado: [],
          pcsMalogradas: 0,
        },
        docente: { codigoDocente: 'D01', nombre: 'Profesor X' },
        asignacion: {
          seccion: {
            curso: { codigo: 'CS101', nombre: 'Intro' },
            codigoSeccion: '01',
          },
        },
      });

      const res = await request(app)
        .patch('/api/v1/admin/incidencias/inc-1/resolver')
        .set('Authorization', bearer(RolCuenta.COORDINACION_ACADEMICA))
        .send({ estado: 'RESUELTA', comentario: 'Se reparó la PC con éxito' });

      expect(res.status).toBe(200);
      expect(res.body.data.estado).toBe(EstadoIncidencia.RESUELTA);
    });
  });

  describe('Altas de Alumnos y Docentes (POST /admin/alumnos y POST /admin/docentes)', () => {
    it('POST /admin/alumnos responde 201 al crear alumno', async () => {
      prismaMock.alumno.findUnique.mockResolvedValue(null);
      prismaMock.cuenta.findUnique.mockResolvedValue(null);
      prismaMock.alumno.create.mockResolvedValue({
        id: 'al-nuevo',
        codigo: 'A2026111',
        nombre: 'Nuevo Alumno',
      });

      const res = await request(app)
        .post('/api/v1/admin/alumnos')
        .set('Authorization', bearer(RolCuenta.COORDINACION_ACADEMICA))
        .send({ codigo: 'A2026111', nombre: 'Nuevo Alumno', correo: 'nalumno@test.edu' });

      expect(res.status).toBe(201);
      expect(res.body.data.codigo).toBe('A2026111');
      expect(res.body.data.debeCambiarClave).toBe(true);
    });

    it('POST /admin/docentes responde 201 al crear docente', async () => {
      prismaMock.docente.findUnique.mockResolvedValue(null);
      prismaMock.cuenta.findUnique.mockResolvedValue(null);
      prismaMock.docente.create.mockResolvedValue({
        id: 'doc-nuevo',
        codigoDocente: 'D2026111',
        nombre: 'Nuevo Docente',
      });

      const res = await request(app)
        .post('/api/v1/admin/docentes')
        .set('Authorization', bearer(RolCuenta.COORDINACION_ACADEMICA))
        .send({
          codigoDocente: 'D2026111',
          nombre: 'Nuevo Docente',
          correoInstitucional: 'ndocente@test.edu',
          departamento: 'Sistemas',
        });

      expect(res.status).toBe(201);
      expect(res.body.data.codigo).toBe('D2026111');
      expect(res.body.data.rol).toBe(RolCuenta.DOCENTE);
    });
  });

  describe('Restablecer clave (POST /admin/usuarios/restablecer-clave)', () => {
    it('responde 200 con nueva clave generada', async () => {
      prismaMock.alumno.findUnique.mockResolvedValue({
        id: 'al-1',
        codigo: 'A2026111',
        nombre: 'Alumno Test',
        cuentaId: 'c-1',
      });
      prismaMock.cuenta.findUnique.mockResolvedValue({
        id: 'c-1',
        rol: RolCuenta.ALUMNO,
      });
      prismaMock.cuenta.update.mockResolvedValue({ id: 'c-1' });

      const res = await request(app)
        .post('/api/v1/admin/usuarios/restablecer-clave')
        .set('Authorization', bearer(RolCuenta.COORDINACION_ACADEMICA))
        .send({ usuario: 'A2026111' });

      expect(res.status).toBe(200);
      expect(res.body.data.claveInicial).toBeDefined();
      expect(res.body.data.debeCambiarClave).toBe(true);
    });
  });

  describe('Cambiar clave (POST /auth/cambiar-clave)', () => {
    it('responde 401 si no hay token', async () => {
      const res = await request(app)
        .post('/api/v1/auth/cambiar-clave')
        .send({ claveActual: '123', claveNueva: '456' });
      expect(res.status).toBe(401);
    });
  });
});
