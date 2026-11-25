// Issue 7.19 (riesgo R45): foto de la incidencia por HTTP, con Prisma simulado.
const prismaMock: any = {
  docente: { findUnique: jest.fn() },
  incidencia: { findFirst: jest.fn(), count: jest.fn() },
  imagenIncidencia: { upsert: jest.fn(), findUnique: jest.fn() },
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

/** Un PNG mínimo: la firma de 8 bytes y algo de contenido. */
const PNG = Buffer.concat([
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  Buffer.alloc(32, 1),
]);
const RUTA = '/api/v1/docente/incidencias/inc-1/imagen';

beforeEach(() => {
  jest.clearAllMocks();
  prismaMock.docente.findUnique.mockResolvedValue({ id: 'doc-1' });
  prismaMock.incidencia.findFirst.mockResolvedValue({ id: 'inc-1', estado: 'PENDIENTE' });
  prismaMock.incidencia.count.mockResolvedValue(1);
  prismaMock.imagenIncidencia.upsert.mockResolvedValue({});
});

describe('Foto de la incidencia (Issue 7.19)', () => {
  it('el docente adjunta una imagen a su incidencia pendiente', async () => {
    const res = await request(app)
      .post(RUTA)
      .set('Authorization', bearer(RolCuenta.DOCENTE))
      .set('Content-Type', 'image/png')
      .send(PNG);

    expect(res.status).toBe(201);
    expect(res.body.data).toEqual({ tipoMime: 'image/png', tamanoBytes: PNG.length });
    expect(prismaMock.incidencia.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'inc-1', docenteId: 'doc-1' } }),
    );
    expect(prismaMock.imagenIncidencia.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ where: { incidenciaId: 'inc-1' } }),
    );
  });

  it('exige token y rol docente', async () => {
    expect((await request(app).post(RUTA)).status).toBe(401);
    const res = await request(app)
      .post(RUTA)
      .set('Authorization', bearer(RolCuenta.ALUMNO))
      .set('Content-Type', 'image/png')
      .send(PNG);
    expect(res.status).toBe(403);
  });

  it('rechaza con 415 lo que no es imagen, aunque diga serlo', async () => {
    const pdf = await request(app)
      .post(RUTA)
      .set('Authorization', bearer(RolCuenta.DOCENTE))
      .set('Content-Type', 'application/pdf')
      .send(Buffer.from('%PDF-1.7'));
    expect(pdf.status).toBe(415);

    const disfrazado = await request(app)
      .post(RUTA)
      .set('Authorization', bearer(RolCuenta.DOCENTE))
      .set('Content-Type', 'image/jpeg')
      .send(Buffer.from('<script>alert(1)</script>'));
    expect(disfrazado.status).toBe(415);
    expect(prismaMock.imagenIncidencia.upsert).not.toHaveBeenCalled();
  });

  it('rechaza con 413 una imagen de más de 2 MB', async () => {
    const grande = Buffer.concat([PNG, Buffer.alloc(2 * 1024 * 1024, 0)]);
    const res = await request(app)
      .post(RUTA)
      .set('Authorization', bearer(RolCuenta.DOCENTE))
      .set('Content-Type', 'image/png')
      .send(grande);
    expect(res.status).toBe(413);
    expect(res.body.message).toContain('2 MB');
    expect(prismaMock.imagenIncidencia.upsert).not.toHaveBeenCalled();
  });

  it('404 si la incidencia no es del docente y 409 si ya se resolvió', async () => {
    prismaMock.incidencia.findFirst.mockResolvedValueOnce(null);
    const ajena = await request(app)
      .post(RUTA)
      .set('Authorization', bearer(RolCuenta.DOCENTE))
      .set('Content-Type', 'image/png')
      .send(PNG);
    expect(ajena.status).toBe(404);

    prismaMock.incidencia.findFirst.mockResolvedValueOnce({ id: 'inc-1', estado: 'RESUELTA' });
    const resuelta = await request(app)
      .post(RUTA)
      .set('Authorization', bearer(RolCuenta.DOCENTE))
      .set('Content-Type', 'image/png')
      .send(PNG);
    expect(resuelta.status).toBe(409);
  });

  it('Jefatura ve la imagen con su tipo, sin que el navegador la reinterprete', async () => {
    prismaMock.imagenIncidencia.findUnique.mockResolvedValue({
      tipoMime: 'image/png',
      datos: PNG,
    });
    const res = await request(app)
      .get('/api/v1/admin/incidencias/inc-1/imagen')
      .set('Authorization', bearer(RolCuenta.JEFATURA_LABORATORIOS, 'cuenta-jef'));

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toBe('image/png');
    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(Buffer.from(res.body).equals(PNG)).toBe(true);
    // Jefatura solo ve las incidencias de los laboratorios a su cargo.
    expect(prismaMock.incidencia.count).toHaveBeenCalledWith({
      where: { id: 'inc-1', espacio: { responsables: { some: { cuentaId: 'cuenta-jef' } } } },
    });
  });

  it('404 si la incidencia no tiene foto o no es visible', async () => {
    prismaMock.imagenIncidencia.findUnique.mockResolvedValue(null);
    const sinFoto = await request(app)
      .get('/api/v1/admin/incidencias/inc-1/imagen')
      .set('Authorization', bearer(RolCuenta.COORDINACION_ACADEMICA));
    expect(sinFoto.status).toBe(404);

    prismaMock.incidencia.count.mockResolvedValue(0);
    const ajena = await request(app).get(RUTA).set('Authorization', bearer(RolCuenta.DOCENTE));
    expect(ajena.status).toBe(404);
  });
});
