/**
 * Tests del middleware de autenticación — Issue 5.28 / #376 (QA: Angel14den)
 *
 * Cubre los casos del Issue 4.45 (#335) que el PR #377 introdujo:
 *  1. Cuenta con debeCambiarClave en ruta protegida → 403 CLAVE_DEBE_CAMBIARSE
 *  2. Esa misma cuenta en POST /auth/cambiar-clave (authGuardCambioClave) → pasa
 *  3. Token sin la marca debeCambiarClave → se comporta como antes (authGuard normal)
 *  4. Token sin JWT → 401
 *  5. Token inválido → 401
 *  6. authGuard y authGuardCambioClave exponen req.auth correctamente
 */
import { Request, Response } from 'express';
import { RolCuenta } from '@prisma/client';
import {
  authGuard,
  authGuardCambioClave,
  CODIGO_CLAVE_DEBE_CAMBIARSE,
} from '../../../src/middlewares/auth.middleware';
import { firmarToken } from '../../../src/services/auth.service';

// JWT_SECRET debe estar disponible para firmarToken
const SECRET = 'secreto-de-pruebas-middleware';

beforeAll(() => {
  process.env.JWT_SECRET = SECRET;
  process.env.JWT_EXPIRES_IN = '1h';
});

afterAll(() => {
  delete process.env.JWT_SECRET;
  delete process.env.JWT_EXPIRES_IN;
});

function mockRes() {
  const res: any = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res as Response & { status: jest.Mock; json: jest.Mock };
}

// ── Tokens de utilidad ─────────────────────────────────────────────────────────

function tokenNormal(rol: RolCuenta = RolCuenta.ALUMNO, sub = 'c-1') {
  return firmarToken({ sub, rol });
}

function tokenConMarca(rol: RolCuenta = RolCuenta.ALUMNO, sub = 'c-2') {
  return firmarToken({ sub, rol, debeCambiarClave: true });
}

// ──────────────────────────────────────────────────────────────────────────────

describe('authGuard — Issue 4.45 (#335 / #376)', () => {
  describe('Peticiones sin token o con token inválido', () => {
    it('rechaza con 401 cuando no hay encabezado Authorization', () => {
      const res = mockRes();
      const next = jest.fn();
      authGuard({ headers: {} } as Request, res, next);
      expect(res.status).toHaveBeenCalledWith(401);
      expect(next).not.toHaveBeenCalled();
    });

    it('rechaza con 401 cuando el esquema no es Bearer', () => {
      for (const authorization of ['Basic abc', 'Token xyz', 'Bearer']) {
        const res = mockRes();
        const next = jest.fn();
        authGuard({ headers: { authorization } } as Request, res, next);
        expect(res.status).toHaveBeenCalledWith(401);
        expect(next).not.toHaveBeenCalled();
      }
    });

    it('rechaza con 401 cuando el token Bearer está manipulado o es basura', () => {
      for (const t of ['Bearer no-es-un-jwt', `Bearer ${tokenNormal().slice(0, -3)}abc`]) {
        const res = mockRes();
        const next = jest.fn();
        authGuard({ headers: { authorization: t } } as Request, res, next);
        expect(res.status).toHaveBeenCalledWith(401);
        expect(next).not.toHaveBeenCalled();
      }
    });
  });

  describe('Caso 1 — cuenta con debeCambiarClave accede a ruta protegida con authGuard', () => {
    it('responde 403 con code CLAVE_DEBE_CAMBIARSE', () => {
      const token = tokenConMarca(RolCuenta.COORDINACION_ACADEMICA, 'c-admin');
      const req = {
        headers: { authorization: `Bearer ${token}` },
      } as Request;
      const res = mockRes();
      const next = jest.fn();

      authGuard(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ code: CODIGO_CLAVE_DEBE_CAMBIARSE }),
      );
      expect(next).not.toHaveBeenCalled();
    });

    it('responde 403 para cualquier rol con debeCambiarClave', () => {
      const roles = [
        RolCuenta.ALUMNO,
        RolCuenta.DOCENTE,
        RolCuenta.COORDINACION_ACADEMICA,
        RolCuenta.JEFATURA_LABORATORIOS,
      ];
      for (const rol of roles) {
        const token = tokenConMarca(rol, `c-${rol}`);
        const req = { headers: { authorization: `Bearer ${token}` } } as Request;
        const res = mockRes();
        const next = jest.fn();

        authGuard(req, res, next);

        expect(res.status).toHaveBeenCalledWith(403);
        expect(res.json).toHaveBeenCalledWith(
          expect.objectContaining({ code: CODIGO_CLAVE_DEBE_CAMBIARSE }),
        );
        expect(next).not.toHaveBeenCalled();
      }
    });
  });

  describe('Caso 3 — token sin la marca debeCambiarClave se comporta como antes', () => {
    it('deja pasar y expone req.auth correctamente', () => {
      const token = tokenNormal(RolCuenta.ALUMNO, 'c-alumno');
      const req = { headers: { authorization: `Bearer ${token}` } } as Request;
      const res = mockRes();
      const next = jest.fn();

      authGuard(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
      // req.auth no incluye debeCambiarClave cuando no está en el token
      expect((req as any).auth).toMatchObject({ sub: 'c-alumno', rol: RolCuenta.ALUMNO });
      expect((req as any).auth.debeCambiarClave).toBeUndefined();
    });

    it('deja pasar para cualquier rol sin la marca', () => {
      const roles = [
        RolCuenta.ALUMNO,
        RolCuenta.DOCENTE,
        RolCuenta.COORDINACION_ACADEMICA,
        RolCuenta.JEFATURA_LABORATORIOS,
      ];
      for (const rol of roles) {
        const token = tokenNormal(rol, `c-${rol}`);
        const req = { headers: { authorization: `Bearer ${token}` } } as Request;
        const res = mockRes();
        const next = jest.fn();

        authGuard(req, res, next);

        expect(next).toHaveBeenCalled();
      }
    });
  });
});

// ──────────────────────────────────────────────────────────────────────────────

describe('authGuardCambioClave — Issue 4.45 (#335 / #376)', () => {
  describe('Caso 2 — cuenta con debeCambiarClave puede usar POST /auth/cambiar-clave', () => {
    it('deja pasar a una cuenta cuyo token tiene debeCambiarClave=true', () => {
      const token = tokenConMarca(RolCuenta.ALUMNO, 'c-pendiente');
      const req = { headers: { authorization: `Bearer ${token}` } } as Request;
      const res = mockRes();
      const next = jest.fn();

      authGuardCambioClave(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('expone req.auth con la marca debeCambiarClave intacta', () => {
      const token = tokenConMarca(RolCuenta.COORDINACION_ACADEMICA, 'c-admin');
      const req = { headers: { authorization: `Bearer ${token}` } } as Request;
      const next = jest.fn();

      authGuardCambioClave(req, mockRes(), next);

      expect(next).toHaveBeenCalled();
      expect((req as any).auth).toMatchObject({
        sub: 'c-admin',
        rol: RolCuenta.COORDINACION_ACADEMICA,
        debeCambiarClave: true,
      });
    });

    it('también deja pasar a cuentas sin la marca (comportamiento normal)', () => {
      const token = tokenNormal(RolCuenta.DOCENTE, 'c-docente');
      const req = { headers: { authorization: `Bearer ${token}` } } as Request;
      const res = mockRes();
      const next = jest.fn();

      authGuardCambioClave(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it('sigue rechazando con 401 si no hay token', () => {
      const res = mockRes();
      const next = jest.fn();
      authGuardCambioClave({ headers: {} } as Request, res, next);
      expect(res.status).toHaveBeenCalledWith(401);
      expect(next).not.toHaveBeenCalled();
    });
  });
});
