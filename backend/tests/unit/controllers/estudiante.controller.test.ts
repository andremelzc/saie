import { Request, Response } from 'express';
import {
  actualizarPerfil,
  consultarMapaOcupacion,
  listarCursos,
  obtenerHorario,
  obtenerPerfil,
  obtenerRuta,
} from '../../../src/controllers/estudiante.controller';
import {
  actualizarPerfilAlumno,
  listarCursosAlumno,
  obtenerHorarioAlumno,
  obtenerPerfilAlumno,
  obtenerRutaAlumnoPorAsignacionId,
} from '../../../src/services/alumno.service';
import { obtenerMapaLectura } from '../../../src/services/ocupacion.service';

jest.mock('../../../src/services/alumno.service', () => {
  const actual = jest.requireActual('../../../src/services/alumno.service');
  return {
    ...actual,
    actualizarPerfilAlumno: jest.fn(),
    listarCursosAlumno: jest.fn(),
    obtenerHorarioAlumno: jest.fn(),
    obtenerPerfilAlumno: jest.fn(),
    obtenerRutaAlumnoPorAsignacionId: jest.fn(),
  };
});

jest.mock('../../../src/services/ocupacion.service', () => ({
  obtenerMapaLectura: jest.fn(),
}));

jest.mock('../../../src/lib/prisma', () => ({
  prisma: {},
}));

function mockResponse() {
  const res: Partial<Response> = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  res.setHeader = jest.fn().mockReturnValue(res);
  return res as Response;
}

describe('Estudiante Controller (Issues 3.10 - 3.15)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('obtenerHorario', () => {
    it('debe responder 400 si el día es inválido', async () => {
      const req = {
        query: { dia: 'INVALIDO' },
        auth: { sub: 'alumno-1', rol: 'ALUMNO' },
      } as unknown as Request;
      const res = mockResponse();

      await obtenerHorario(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
        }),
      );
    });

    it('debe responder 200 con el horario filtrado por día válido', async () => {
      const mockHorario = [{ diaSemana: 'LUNES', horaInicio: '08:00', horaFin: '10:00' }];
      (obtenerHorarioAlumno as jest.Mock).mockResolvedValue(mockHorario);

      const req = {
        query: { dia: 'LUNES' },
        auth: { sub: 'alumno-1', rol: 'ALUMNO' },
      } as unknown as Request;
      const res = mockResponse();

      await obtenerHorario(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: mockHorario,
      });
      expect(obtenerHorarioAlumno).toHaveBeenCalledWith('alumno-1', 'LUNES', expect.anything());
    });

    it('debe responder 200 sin día especificado', async () => {
      (obtenerHorarioAlumno as jest.Mock).mockResolvedValue([]);

      const req = {
        query: {},
        auth: { sub: 'alumno-1', rol: 'ALUMNO' },
      } as unknown as Request;
      const res = mockResponse();

      await obtenerHorario(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(obtenerHorarioAlumno).toHaveBeenCalledWith('alumno-1', undefined, expect.anything());
    });
  });

  describe('listarCursos', () => {
    it('debe responder 200 con los cursos del alumno', async () => {
      const mockCursos = [{ id: 'c1', nombre: 'Algoritmos' }];
      (listarCursosAlumno as jest.Mock).mockResolvedValue(mockCursos);

      const req = {
        auth: { sub: 'alumno-1', rol: 'ALUMNO' },
      } as unknown as Request;
      const res = mockResponse();

      await listarCursos(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: mockCursos,
      });
    });

    it('debe manejar errores del servicio', async () => {
      (listarCursosAlumno as jest.Mock).mockRejectedValue(new Error('Error en BD'));

      const req = {
        auth: { sub: 'alumno-1', rol: 'ALUMNO' },
      } as unknown as Request;
      const res = mockResponse();

      await listarCursos(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  describe('obtenerPerfil', () => {
    it('debe responder 200 y fijar Cache-Control: no-store', async () => {
      const mockPerfil = { codigo: '20200001', nombre: 'Ana' };
      (obtenerPerfilAlumno as jest.Mock).mockResolvedValue(mockPerfil);

      const req = {
        auth: { sub: 'alumno-1', rol: 'ALUMNO' },
      } as unknown as Request;
      const res = mockResponse();

      await obtenerPerfil(req, res);

      expect(res.setHeader).toHaveBeenCalledWith('Cache-Control', 'no-store');
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: mockPerfil,
      });
    });
  });

  describe('actualizarPerfil', () => {
    it('debe responder 400 si el payload es inválido', async () => {
      const req = {
        body: { datosPersonales: { dni: 'invalido-123' } },
        auth: { sub: 'alumno-1', rol: 'ALUMNO' },
      } as unknown as Request;
      const res = mockResponse();

      await actualizarPerfil(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('debe responder 200 y actualizar el perfil correctamente', async () => {
      const mockActualizado = { codigo: '20200001', telefono: '999888777' };
      (actualizarPerfilAlumno as jest.Mock).mockResolvedValue(mockActualizado);

      const req = {
        body: { datosPersonales: { telefono: '999888777' } },
        auth: { sub: 'alumno-1', rol: 'ALUMNO' },
      } as unknown as Request;
      const res = mockResponse();

      await actualizarPerfil(req, res);

      expect(res.setHeader).toHaveBeenCalledWith('Cache-Control', 'no-store');
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: mockActualizado,
      });
    });
  });

  describe('consultarMapaOcupacion', () => {
    it('debe responder 400 si faltan parámetros requeridos como pabellon o piso', async () => {
      const req = {
        query: { pabellon: '' },
      } as unknown as Request;
      const res = mockResponse();

      await consultarMapaOcupacion(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('debe responder 200 con el mapa de ocupación', async () => {
      const mockMapa = { pabellon: 'A', piso: 1, espacios: [] };
      (obtenerMapaLectura as jest.Mock).mockResolvedValue(mockMapa);

      const req = {
        query: { pabellon: 'A', piso: '1' },
      } as unknown as Request;
      const res = mockResponse();

      await consultarMapaOcupacion(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: mockMapa,
      });
    });
  });

  describe('obtenerRuta', () => {
    it('debe responder 400 si no se proporciona el ID de asignación', async () => {
      const req = {
        params: {},
        auth: { sub: 'alumno-1', rol: 'ALUMNO' },
      } as unknown as Request;
      const res = mockResponse();

      await obtenerRuta(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Debe proporcionar el ID de asignación',
      });
    });

    it('debe responder 200 con la ruta del alumno para asignacionId string', async () => {
      const mockRuta = { asignacionId: 'asig-1', tramos: [] };
      (obtenerRutaAlumnoPorAsignacionId as jest.Mock).mockResolvedValue(mockRuta);

      const req = {
        params: { asignacionId: 'asig-1' },
        auth: { sub: 'alumno-1', rol: 'ALUMNO' },
      } as unknown as Request;
      const res = mockResponse();

      await obtenerRuta(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: mockRuta,
      });
    });

    it('debe soportar asignacionId como array', async () => {
      const mockRuta = { asignacionId: 'asig-array-1', tramos: [] };
      (obtenerRutaAlumnoPorAsignacionId as jest.Mock).mockResolvedValue(mockRuta);

      const req = {
        params: { asignacionId: ['asig-array-1', 'asig-array-2'] },
        auth: { sub: 'alumno-1', rol: 'ALUMNO' },
      } as unknown as Request;
      const res = mockResponse();

      await obtenerRuta(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(obtenerRutaAlumnoPorAsignacionId).toHaveBeenCalledWith(
        'alumno-1',
        'asig-array-1',
        expect.anything(),
      );
    });
  });
});
