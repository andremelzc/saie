import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { RolCuenta } from '@prisma/client';
import { Request, Response } from 'express';
import {
  firmarToken,
  iniciarSesion,
  ROLES_ADMIN,
  verificarToken,
} from '../../../src/services/auth.service';
import { authGuard, roleGuard } from '../../../src/middlewares/auth.middleware';
import { HttpError } from '../../../src/lib/http';

const SECRET = 'secreto-de-pruebas';

function crearCuenta(rol: RolCuenta, clave = 'clave123', debeCambiarClave = true) {
  return {
    id: `cuenta-${rol}`,
    rol,
    usuarioLogin: 'usuario',
    claveHash: bcrypt.hashSync(clave, 4),
    debeCambiarClave,
  };
}

function prismaCon(cuenta: ReturnType<typeof crearCuenta> | null) {
  return { cuenta: { findUnique: jest.fn().mockResolvedValue(cuenta) } } as any;
}

describe('Autenticación JWT por rol (Issues 4.8, 3.21, 7.1)', () => {
  beforeAll(() => {
    process.env.JWT_SECRET = SECRET;
    process.env.JWT_EXPIRES_IN = '1h';
  });

  describe('iniciarSesion', () => {
    it('emite un JWT con el id de la cuenta y su rol, e informa debeCambiarClave', async () => {
      const cuenta = crearCuenta(RolCuenta.COORDINACION_ACADEMICA, 'clave123', true);
      const res = await iniciarSesion('usuario', 'clave123', ROLES_ADMIN, prismaCon(cuenta));

      expect(res.rol).toBe(RolCuenta.COORDINACION_ACADEMICA);
      expect(res.debeCambiarClave).toBe(true);
      const decoded = jwt.verify(res.token, SECRET) as jwt.JwtPayload;
      expect(decoded.sub).toBe(cuenta.id);
      expect(decoded.rol).toBe(RolCuenta.COORDINACION_ACADEMICA);
    });

    it('informa debeCambiarClave=false cuando la cuenta ya cambió su clave', async () => {
      const cuenta = crearCuenta(RolCuenta.ALUMNO, 'clave123', false);
      const res = await iniciarSesion('usuario', 'clave123', [RolCuenta.ALUMNO], prismaCon(cuenta));
      expect(res.debeCambiarClave).toBe(false);
    });

    it('distingue por rol: el token de alumno, docente y jefatura lleva su propio rol', async () => {
      for (const rol of [RolCuenta.ALUMNO, RolCuenta.DOCENTE, RolCuenta.JEFATURA_LABORATORIOS]) {
        const res = await iniciarSesion('u', 'clave123', [rol], prismaCon(crearCuenta(rol)));
        expect(verificarToken(res.token)?.rol).toBe(rol);
      }
    });

    it('rechaza clave incorrecta con 401', async () => {
      const cuenta = crearCuenta(RolCuenta.ALUMNO);
      await expect(
        iniciarSesion('usuario', 'otra', [RolCuenta.ALUMNO], prismaCon(cuenta)),
      ).rejects.toMatchObject({ status: 401 });
    });

    it('rechaza una cuenta inexistente con el mismo mensaje que una clave incorrecta', async () => {
      const inexistente = await iniciarSesion('x', 'y', [RolCuenta.ALUMNO], prismaCon(null)).catch(
        (e) => e,
      );
      const claveMala = await iniciarSesion(
        'usuario',
        'mala',
        [RolCuenta.ALUMNO],
        prismaCon(crearCuenta(RolCuenta.ALUMNO)),
      ).catch((e) => e);

      expect(inexistente).toBeInstanceOf(HttpError);
      expect(inexistente.status).toBe(401);
      expect(inexistente.message).toBe(claveMala.message);
    });

    it('rechaza credenciales válidas de otro rol (docente no entra por el login de alumno)', async () => {
      const docente = crearCuenta(RolCuenta.DOCENTE);
      await expect(
        iniciarSesion('usuario', 'clave123', [RolCuenta.ALUMNO], prismaCon(docente)),
      ).rejects.toMatchObject({ status: 401 });
      await expect(
        iniciarSesion('usuario', 'clave123', ROLES_ADMIN, prismaCon(docente)),
      ).rejects.toMatchObject({ status: 401 });
    });
  });

  describe('verificarToken', () => {
    it('acepta un token propio y devuelve id y rol', () => {
      const token = firmarToken({ sub: 'c1', rol: RolCuenta.DOCENTE });
      expect(verificarToken(token)).toEqual({ sub: 'c1', rol: RolCuenta.DOCENTE });
    });

    it('rechaza token firmado con otro secreto, manipulado, expirado o basura', () => {
      const ajeno = jwt.sign({ rol: 'ALUMNO' }, 'otro-secreto', { subject: 'c1' });
      const expirado = jwt.sign({ rol: 'ALUMNO' }, SECRET, { subject: 'c1', expiresIn: -10 });
      const buenoManipulado =
        firmarToken({ sub: 'c1', rol: RolCuenta.ALUMNO }).slice(0, -3) + 'abc';

      expect(verificarToken(ajeno)).toBeNull();
      expect(verificarToken(expirado)).toBeNull();
      expect(verificarToken(buenoManipulado)).toBeNull();
      expect(verificarToken('no-es-un-jwt')).toBeNull();
    });

    it('rechaza un token sin rol', () => {
      expect(verificarToken(jwt.sign({}, SECRET, { subject: 'c1' }))).toBeNull();
    });
  });

  describe('middlewares authGuard y roleGuard', () => {
    function respuesta() {
      const res: any = {};
      res.status = jest.fn().mockReturnValue(res);
      res.json = jest.fn().mockReturnValue(res);
      return res as Response & { status: jest.Mock; json: jest.Mock };
    }

    it('authGuard rechaza peticiones sin token con 401', () => {
      const res = respuesta();
      const next = jest.fn();
      authGuard({ headers: {} } as Request, res, next);
      expect(res.status).toHaveBeenCalledWith(401);
      expect(next).not.toHaveBeenCalled();
    });

    it('authGuard rechaza esquemas distintos de Bearer y tokens inválidos', () => {
      for (const authorization of ['Basic abc', 'Bearer', 'Bearer token-malo']) {
        const res = respuesta();
        const next = jest.fn();
        authGuard({ headers: { authorization } } as Request, res, next);
        expect(res.status).toHaveBeenCalledWith(401);
        expect(next).not.toHaveBeenCalled();
      }
    });

    it('authGuard deja pasar un token válido y expone req.auth', () => {
      const token = firmarToken({ sub: 'c9', rol: RolCuenta.ALUMNO });
      const req = { headers: { authorization: `Bearer ${token}` } } as Request;
      const next = jest.fn();
      authGuard(req, respuesta(), next);
      expect(next).toHaveBeenCalled();
      expect(req.auth).toEqual({ sub: 'c9', rol: RolCuenta.ALUMNO });
    });

    it('roleGuard responde 403 si el rol no está permitido y deja pasar si lo está', () => {
      const guard = roleGuard(RolCuenta.COORDINACION_ACADEMICA);

      const resNo = respuesta();
      const nextNo = jest.fn();
      guard({ auth: { sub: 'c', rol: RolCuenta.DOCENTE } } as Request, resNo, nextNo);
      expect(resNo.status).toHaveBeenCalledWith(403);
      expect(nextNo).not.toHaveBeenCalled();

      const nextSi = jest.fn();
      guard(
        { auth: { sub: 'c', rol: RolCuenta.COORDINACION_ACADEMICA } } as Request,
        respuesta(),
        nextSi,
      );
      expect(nextSi).toHaveBeenCalled();
    });

    it('roleGuard responde 401 si no hubo authGuard antes', () => {
      const res = respuesta();
      roleGuard(RolCuenta.ALUMNO)({} as Request, res, jest.fn());
      expect(res.status).toHaveBeenCalledWith(401);
    });
  });
});
