import { Request, Response } from 'express';
import { RolCuenta } from '@prisma/client';
import {
  cambiarClaveCuenta,
  loginAdmin,
  loginAlumno,
  loginDocente,
} from '../../../src/controllers/auth.controller';
import { iniciarSesion } from '../../../src/services/auth.service';
import { cambiarClave } from '../../../src/services/cuenta.service';

jest.mock('../../../src/services/auth.service', () => {
  const actual = jest.requireActual('../../../src/services/auth.service');
  return {
    ...actual,
    iniciarSesion: jest.fn(),
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

describe('Auth Controller (Issues 4.8, 3.21, 7.1, 4.21)', () => {
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

  describe('cambiarClaveCuenta', () => {
    it('debe responder 400 si los campos no cumplen el esquema', async () => {
      const req = {
        body: { claveActual: '', claveNueva: 'corta' },
        auth: { sub: 'c-1', rol: 'ALUMNO' },
      } as unknown as Request;
      const res = mockResponse();

      await cambiarClaveCuenta(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('debe responder 200 al cambiar clave exitosamente', async () => {
      const mockData = { mensaje: 'Clave actualizada correctamente' };
      (cambiarClave as jest.Mock).mockResolvedValue(mockData);

      const req = {
        body: { claveActual: 'anterior123', claveNueva: 'nuevaSegura123' },
        auth: { sub: 'c-1', rol: 'ALUMNO' },
      } as unknown as Request;
      const res = mockResponse();

      await cambiarClaveCuenta(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: mockData,
      });
      expect(cambiarClave).toHaveBeenCalledWith(
        'c-1',
        { claveActual: 'anterior123', claveNueva: 'nuevaSegura123' },
        expect.anything(),
      );
    });
  });
});
