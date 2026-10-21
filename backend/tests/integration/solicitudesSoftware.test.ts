// Pruebas HTTP del flujo de solicitudes de software (Issue 4.29) con Prisma simulado: verifican
// el contrato de autenticación por rol, la validación Zod y el cableado de los controladores.
const DOCENTE = { id: 'doc-1', nombre: 'Dra. García', codigoDocente: 'D001' };

function solicitudDB(overrides: Record<string, unknown> = {}) {
  return {
    id: 'sol-1',
    docenteId: 'doc-1',
    seccionId: null,
    nombre: 'MATLAB',
    version: 'R2023b',
    categoria: null,
    justificacion: 'Señales',
    estado: 'PENDIENTE',
    fechaSolicitud: new Date('2026-03-01T10:00:00Z'),
    resueltaPorId: null,
    fechaResolucion: null,
    motivoRechazo: null,
    softwareId: null,
    docente: DOCENTE,
    seccion: null,
    software: null,
    ...overrides,
  };
}

const prismaMock: any = {
  docente: { findUnique: jest.fn().mockResolvedValue(DOCENTE) },
  seccion: { findUnique: jest.fn().mockResolvedValue(null) },
  software: {
    findUnique: jest.fn().mockResolvedValue(null),
    create: jest.fn().mockImplementation(async ({ data }) => ({
      id: 'sw-nuevo',
      activo: true,
      ...data,
    })),
  },
  solicitudSoftware: {
    create: jest.fn().mockImplementation(async ({ data }) => solicitudDB(data)),
    findUnique: jest.fn().mockResolvedValue(null),
    findMany: jest.fn().mockResolvedValue([]),
    count: jest.fn().mockResolvedValue(0),
    update: jest.fn().mockImplementation(async ({ data }) => solicitudDB(data)),
  },
  seccionSoftware: { createMany: jest.fn().mockResolvedValue({ count: 1 }) },
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
import { RolCuenta } from '@prisma/client';
import { createApp } from '../../src/app';
import { firmarToken } from '../../src/services/auth.service';

process.env.JWT_SECRET = 'secreto-de-pruebas';

const app = createApp();
const bearer = (rol: RolCuenta, sub = 'cuenta-1') => `Bearer ${firmarToken({ sub, rol })}`;

const DOCENTE_URL = '/api/v1/docente/solicitudes-software';
const ADMIN_URL = '/api/v1/admin/solicitudes-software';

const cuerpoValido = {
  nombre: 'MATLAB R2023b',
  version: '',
  categoria: 'SIMULACION',
  justificacion: 'Para el laboratorio de señales',
};

beforeEach(() => {
  jest.clearAllMocks();
  prismaMock.$transaction.mockImplementation((fn: (tx: unknown) => unknown) => fn(prismaMock));
  // `mockClear` no borra las implementaciones: se reestablece lo que cada prueba modifica.
  prismaMock.docente.findUnique.mockResolvedValue(DOCENTE);
  prismaMock.seccion.findUnique.mockResolvedValue(null);
  prismaMock.software.findUnique.mockResolvedValue(null);
  prismaMock.solicitudSoftware.findUnique.mockResolvedValue(null);
  prismaMock.solicitudSoftware.findMany.mockResolvedValue([]);
  prismaMock.solicitudSoftware.count.mockResolvedValue(0);
});

describe('Solicitudes de software — autenticación y rol (Issue 4.29)', () => {
  it.each([DOCENTE_URL, ADMIN_URL])('%s rechaza sin token con 401', async (ruta) => {
    expect((await request(app).get(ruta)).status).toBe(401);
    expect((await request(app).get(ruta).set('Authorization', 'Bearer invalido')).status).toBe(401);
  });

  it('el portal del docente exige rol DOCENTE', async () => {
    for (const rol of [RolCuenta.ALUMNO, RolCuenta.COORDINACION_ACADEMICA]) {
      const res = await request(app).get(DOCENTE_URL).set('Authorization', bearer(rol));
      expect(res.status).toBe(403);
    }
    const ok = await request(app).get(DOCENTE_URL).set('Authorization', bearer(RolCuenta.DOCENTE));
    expect(ok.status).toBe(200);
  });

  it('el listado administrativo admite Coordinación y Jefatura, no al docente', async () => {
    expect(
      (await request(app).get(ADMIN_URL).set('Authorization', bearer(RolCuenta.DOCENTE))).status,
    ).toBe(403);

    for (const rol of [RolCuenta.COORDINACION_ACADEMICA, RolCuenta.JEFATURA_LABORATORIOS]) {
      const res = await request(app).get(ADMIN_URL).set('Authorization', bearer(rol));
      expect(res.status).toBe(200);
      expect(res.body.data).toMatchObject({ items: [], total: 0, page: 1, limit: 50 });
    }
  });

  it('aprobar y rechazar son solo de Coordinación', async () => {
    const jefatura = bearer(RolCuenta.JEFATURA_LABORATORIOS);

    for (const accion of ['aprobar', 'rechazar']) {
      const res = await request(app)
        .patch(`${ADMIN_URL}/sol-1/${accion}`)
        .set('Authorization', jefatura)
        .send({ motivoRechazo: 'x', agregarASeccion: false });
      expect(res.status).toBe(403);
    }
  });
});

describe('Solicitudes de software — portal del docente (Issue 4.29)', () => {
  it('crea la solicitud y responde 201 con el estado y el nombre separado de la versión', async () => {
    const res = await request(app)
      .post(DOCENTE_URL)
      .set('Authorization', bearer(RolCuenta.DOCENTE, 'cuenta-doc'))
      .send(cuerpoValido);

    expect(res.status).toBe(201);
    expect(res.body.data).toMatchObject({
      nombre: 'MATLAB',
      version: 'R2023b',
      estado: 'PENDIENTE',
    });
    expect(prismaMock.docente.findUnique).toHaveBeenCalledWith({
      where: { cuentaId: 'cuenta-doc' },
    });
  });

  it('valida el cuerpo con 400 antes de tocar la base de datos', async () => {
    const res = await request(app)
      .post(DOCENTE_URL)
      .set('Authorization', bearer(RolCuenta.DOCENTE))
      .send({ nombre: '', justificacion: '' });

    expect(res.status).toBe(400);
    expect(prismaMock.solicitudSoftware.create).not.toHaveBeenCalled();
  });

  it('409 e informa el id existente si el software ya está en el catálogo', async () => {
    prismaMock.software.findUnique.mockResolvedValue({ id: 'sw-matlab', activo: true });

    const res = await request(app)
      .post(DOCENTE_URL)
      .set('Authorization', bearer(RolCuenta.DOCENTE))
      .send(cuerpoValido);

    expect(res.status).toBe(409);
    expect(res.body.message).toContain('sw-matlab');
    expect(prismaMock.solicitudSoftware.create).not.toHaveBeenCalled();
  });

  it('lista solo las solicitudes de la cuenta autenticada', async () => {
    prismaMock.solicitudSoftware.findMany.mockResolvedValue([solicitudDB()]);

    const res = await request(app)
      .get(DOCENTE_URL)
      .set('Authorization', bearer(RolCuenta.DOCENTE, 'cuenta-doc'));

    expect(res.status).toBe(200);
    expect(res.body.data[0]).toMatchObject({ id: 'sol-1', estado: 'PENDIENTE' });
    expect(prismaMock.solicitudSoftware.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { docenteId: 'doc-1' } }),
    );
  });
});

describe('Solicitudes de software — resolución (Issue 4.29)', () => {
  it('aprueba: crea el software, marca la solicitud e informa si quedó en la sección', async () => {
    prismaMock.solicitudSoftware.findUnique.mockResolvedValue(solicitudDB());

    const res = await request(app)
      .patch(`${ADMIN_URL}/sol-1/aprobar`)
      .set('Authorization', bearer(RolCuenta.COORDINACION_ACADEMICA, 'coord-1'))
      .send({ agregarASeccion: false });

    expect(res.status).toBe(200);
    expect(res.body.data.agregadaASeccion).toBe(false);
    expect(prismaMock.software.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ nombre: 'MATLAB', version: 'R2023b' }),
      }),
    );
    expect(prismaMock.solicitudSoftware.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ estado: 'APROBADA', resueltaPorId: 'coord-1' }),
      }),
    );
  });

  it('404 si la solicitud no existe y 409 si ya fue resuelta', async () => {
    const noExiste = await request(app)
      .patch(`${ADMIN_URL}/sol-x/aprobar`)
      .set('Authorization', bearer(RolCuenta.COORDINACION_ACADEMICA))
      .send({ agregarASeccion: false });
    expect(noExiste.status).toBe(404);

    prismaMock.solicitudSoftware.findUnique.mockResolvedValue(
      solicitudDB({ estado: 'RECHAZADA', motivoRechazo: 'no' }),
    );
    const yaResuelta = await request(app)
      .patch(`${ADMIN_URL}/sol-1/aprobar`)
      .set('Authorization', bearer(RolCuenta.COORDINACION_ACADEMICA))
      .send({ agregarASeccion: false });
    expect(yaResuelta.status).toBe(409);
  });

  it('rechaza con 400 si falta el motivo y 200 si lo indica', async () => {
    const sinMotivo = await request(app)
      .patch(`${ADMIN_URL}/sol-1/rechazar`)
      .set('Authorization', bearer(RolCuenta.COORDINACION_ACADEMICA))
      .send({});
    expect(sinMotivo.status).toBe(400);

    prismaMock.solicitudSoftware.findUnique.mockResolvedValue(solicitudDB());
    const res = await request(app)
      .patch(`${ADMIN_URL}/sol-1/rechazar`)
      .set('Authorization', bearer(RolCuenta.COORDINACION_ACADEMICA, 'coord-1'))
      .send({ motivoRechazo: 'Ya está en el catálogo' });

    expect(res.status).toBe(200);
    expect(prismaMock.solicitudSoftware.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          estado: 'RECHAZADA',
          motivoRechazo: 'Ya está en el catálogo',
        }),
      }),
    );
  });
});
