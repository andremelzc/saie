import { Request, Response } from 'express';
import { RolCuenta } from '@prisma/client';
import {
  cambiarClaveCuenta,
  loginAdmin,
  loginAlumno,
  loginDocente,
} from '../../../src/controllers/auth.controller';
import {
  iniciarSesion,
  firmarToken,
  obtenerJwtExpiresIn,
} from '../../../src/services/auth.service';
import { cambiarClave } from '../../../src/services/cuenta.service';

/**
 * Mock de auth.service:
 * - iniciarSesion: mock puro
 * - firmarToken: mock que devuelve un token predecible
 * - obtenerJwtExpiresIn: mock que devuelve '8h'
 * - el resto de exportaciones (ROLES_ADMIN, etc.) se toma de la implementación real
 */
jest.mock('../../../src/services/auth.service', () => {
  const actual = jest.requireActual('../../../src/services/auth.service');
  return {
    ...actual,
    iniciarSesion: jest.fn(),
    firmarToken: jest.fn().mockReturnValue('jwt-token-nuevo'),
    obtenerJwtExpiresIn: jest.fn().mockReturnValue('8h'),
  };
});

jest.mock('../../../src/services/cuenta.service', () => {
  const actual = jest.requireActual('../../../src/services/cuenta.service');
  return {
    ...actual,
    cambiarClave: jest.fn(),
  };
});

jest.mock('../../../src/lib/prisma', () => ({
  prisma: {},
}));

function mockResponse() {
  const res: Partial<Response> = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res as Response;
}

describe('Auth Controller (Issues 4.8, 3.21, 7.1, 4.21, 4.45)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('loginAdmin', () => {
    it('debe responder 400 si falta tanto usuario como codigo', async () => {
      const req = {
        body: { clave: 'secret123' },
      } as unknown as Request;
      const res = mockResponse();

      await loginAdmin(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          errors: expect.arrayContaining([
            expect.stringContaining('El usuario o código es requerido'),
          ]),
        }),
      );
    });

    it('debe responder 400 si falta la clave', async () => {
      const req = {
        body: { usuario: 'admin' },
      } as unknown as Request;
      const res = mockResponse();

      await loginAdmin(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('debe responder 200 con token al iniciar sesión con usuario válido', async () => {
      const mockResultado = {
        token: 'jwt-admin-token',
        cuenta: { id: 'c-admin', rol: RolCuenta.COORDINACION_ACADEMICA },
      };
      (iniciarSesion as jest.Mock).mockResolvedValue(mockResultado);

      const req = {
        body: { usuario: 'admin', clave: 'claveSegura123' },
      } as unknown as Request;
      const res = mockResponse();

      await loginAdmin(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: mockResultado,
      });
      expect(iniciarSesion).toHaveBeenCalledWith(
        'admin',
        'claveSegura123',
        expect.arrayContaining([RolCuenta.COORDINACION_ACADEMICA, RolCuenta.JEFATURA_LABORATORIOS]),
        expect.anything(),
      );
    });
  });

  describe('loginAlumno', () => {
    it('debe responder 200 al iniciar sesión con codigo de alumno', async () => {
      const mockResultado = {
        token: 'jwt-alumno-token',
        cuenta: { id: 'c-alumno', rol: RolCuenta.ALUMNO },
      };
      (iniciarSesion as jest.Mock).mockResolvedValue(mockResultado);

      const req = {
        body: { codigo: '20200001', clave: '20200001' },
      } as unknown as Request;
      const res = mockResponse();

      await loginAlumno(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: mockResultado,
      });
      expect(iniciarSesion).toHaveBeenCalledWith(
        '20200001',
        '20200001',
        [RolCuenta.ALUMNO],
        expect.anything(),
      );
    });
  });

  describe('loginDocente', () => {
    it('debe responder 200 al iniciar sesión con codigo de docente', async () => {
      const mockResultado = {
        token: 'jwt-docente-token',
        cuenta: { id: 'c-docente', rol: RolCuenta.DOCENTE },
      };
      (iniciarSesion as jest.Mock).mockResolvedValue(mockResultado);

      const req = {
        body: { codigo: 'D001', clave: 'D001' },
      } as unknown as Request;
      const res = mockResponse();

      await loginDocente(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: mockResultado,
      });
      expect(iniciarSesion).toHaveBeenCalledWith(
        'D001',
        'D001',
        [RolCuenta.DOCENTE],
        expect.anything(),
      );
    });
  });

  describe('cambiarClaveCuenta (Issue 4.21, 4.45/#335)', () => {
    it('debe responder 400 si los campos no cumplen el esquema', async () => {
      const req = {
        body: { claveActual: '', claveNueva: 'corta' },
        auth: { sub: 'c-1', rol: 'ALUMNO' },
      } as unknown as Request;
      const res = mockResponse();

      await cambiarClaveCuenta(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('debe responder 200 con el nuevo contrato: incluye token y expiresIn (Issue 4.45)', async () => {
      // El nuevo contrato de cambiar-clave devuelve { ...data, token, expiresIn }
      // para que el usuario siga operando sin volver a iniciar sesión.
      const mockData = { mensaje: 'Clave actualizada correctamente' };
      (cambiarClave as jest.Mock).mockResolvedValue(mockData);

      const req = {
        body: { claveActual: 'anterior123', claveNueva: 'nuevaSegura123' },
        auth: { sub: 'c-1', rol: 'ALUMNO' },
      } as unknown as Request;
      const res = mockResponse();

      await cambiarClaveCuenta(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      // La respuesta incluye token nuevo (sin la marca debeCambiarClave) y expiresIn
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: { ...mockData, token: 'jwt-token-nuevo', expiresIn: '8h' },
      });
      expect(cambiarClave).toHaveBeenCalledWith(
        'c-1',
        { claveActual: 'anterior123', claveNueva: 'nuevaSegura123' },
        expect.anything(),
      );
    });

    it('debe generar el token nuevo sin la marca debeCambiarClave (Issue 4.45)', async () => {
      // firmarToken debe recibir { sub, rol } SIN debeCambiarClave para que el token
      // saliente no tenga la restricción aunque el usuario la tenía antes.
      const mockData = { mensaje: 'Clave actualizada correctamente' };
      (cambiarClave as jest.Mock).mockResolvedValue(mockData);

      const req = {
        body: { claveActual: 'anterior123', claveNueva: 'nuevaSegura123' },
        auth: { sub: 'c-2', rol: 'COORDINACION_ACADEMICA', debeCambiarClave: true },
      } as unknown as Request;
      const res = mockResponse();

      await cambiarClaveCuenta(req, res);

      expect(firmarToken).toHaveBeenCalledWith({ sub: 'c-2', rol: 'COORDINACION_ACADEMICA' });
    });

    it('debe responder 200 para cuentas de cualquier rol al cambiar clave', async () => {
      const rolesACubrir = [
        RolCuenta.ALUMNO,
        RolCuenta.DOCENTE,
        RolCuenta.COORDINACION_ACADEMICA,
        RolCuenta.JEFATURA_LABORATORIOS,
      ] as const;

      for (const rol of rolesACubrir) {
        (cambiarClave as jest.Mock).mockResolvedValue({ mensaje: 'ok' });
        const req = {
          body: { claveActual: 'anterior123', claveNueva: 'nuevaSegura123' },
          auth: { sub: `c-${rol}`, rol },
        } as unknown as Request;
        const res = mockResponse();

        await cambiarClaveCuenta(req, res);

        expect(res.status).toHaveBeenCalledWith(200);
        jest.clearAllMocks();
        (firmarToken as jest.Mock).mockReturnValue('jwt-token-nuevo');
        (obtenerJwtExpiresIn as jest.Mock).mockReturnValue('8h');
      }
    });
  });
});
