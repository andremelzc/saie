import { Request, Response } from 'express';
import {
  consultarPorCodigoAlumno,
  consultarPorCodigoCurso,
} from '../../../src/controllers/consulta.controller';
import {
  obtenerAsignacionPorAlumno,
  obtenerAsignacionPorCurso,
} from '../../../src/services/consulta.service';

jest.mock('../../../src/services/consulta.service', () => ({
  obtenerAsignacionPorAlumno: jest.fn(),
  obtenerAsignacionPorCurso: jest.fn(),
}));

jest.mock('../../../src/lib/prisma', () => ({
  prisma: {},
}));

function mockResponse() {
  const res: Partial<Response> = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res as Response;
}

describe('Consulta Controller (Issues 3.2 y 3.4)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('consultarPorCodigoAlumno', () => {
    it('debe responder 400 si el código de alumno está vacío o no es válido', async () => {
      const req = { params: { codigoAlumno: '' } } as unknown as Request;
      const res = mockResponse();

      await consultarPorCodigoAlumno(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: 'Parámetros inválidos',
        }),
      );
    });

    it('debe responder 404 si el estudiante no existe', async () => {
      (obtenerAsignacionPorAlumno as jest.Mock).mockResolvedValue(null);

      const req = { params: { codigoAlumno: '20209999' } } as unknown as Request;
      const res = mockResponse();

      await consultarPorCodigoAlumno(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'No se encontró ningún estudiante con el código 20209999',
      });
    });

    it('debe responder 200 con la información si el estudiante existe', async () => {
      const mockData = { alumno: { codigo: '20200001', nombre: 'Juan' }, cursos: [] };
      (obtenerAsignacionPorAlumno as jest.Mock).mockResolvedValue(mockData);

      const req = { params: { codigoAlumno: '20200001' } } as unknown as Request;
      const res = mockResponse();

      await consultarPorCodigoAlumno(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: mockData,
      });
    });

    it('debe responder 500 si ocurre un error de tipo Error en el servicio', async () => {
      (obtenerAsignacionPorAlumno as jest.Mock).mockRejectedValue(new Error('Fallo de BD'));

      const req = { params: { codigoAlumno: '20200001' } } as unknown as Request;
      const res = mockResponse();

      await consultarPorCodigoAlumno(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Fallo de BD',
      });
    });

    it('debe responder 500 con mensaje genérico si el error lanzado no es instancia de Error', async () => {
      (obtenerAsignacionPorAlumno as jest.Mock).mockRejectedValue(
        'Error inesperado de tipo string',
      );

      const req = { params: { codigoAlumno: '20200001' } } as unknown as Request;
      const res = mockResponse();

      await consultarPorCodigoAlumno(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Error interno del servidor',
      });
    });
  });

  describe('consultarPorCodigoCurso', () => {
    it('debe responder 400 si el código de curso está vacío o no es válido', async () => {
      const req = { params: { codigoCurso: '' } } as unknown as Request;
      const res = mockResponse();

      await consultarPorCodigoCurso(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: 'Parámetros inválidos',
        }),
      );
    });

    it('debe responder 404 si el curso no existe', async () => {
      (obtenerAsignacionPorCurso as jest.Mock).mockResolvedValue(null);

      const req = { params: { codigoCurso: 'CURSO999' } } as unknown as Request;
      const res = mockResponse();

      await consultarPorCodigoCurso(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'No se encontró ningún curso con el código CURSO999',
      });
    });

    it('debe responder 200 con la información si el curso existe', async () => {
      const mockData = { curso: { codigo: 'ISW101', nombre: 'Algoritmos' }, secciones: [] };
      (obtenerAsignacionPorCurso as jest.Mock).mockResolvedValue(mockData);

      const req = { params: { codigoCurso: 'ISW101' } } as unknown as Request;
      const res = mockResponse();

      await consultarPorCodigoCurso(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: mockData,
      });
    });

    it('debe responder 500 si ocurre un error de tipo Error en el servicio', async () => {
      (obtenerAsignacionPorCurso as jest.Mock).mockRejectedValue(new Error('Fallo de conexión'));

      const req = { params: { codigoCurso: 'ISW101' } } as unknown as Request;
      const res = mockResponse();

      await consultarPorCodigoCurso(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Fallo de conexión',
      });
    });

    it('debe responder 500 con mensaje genérico si el error no es Error', async () => {
      (obtenerAsignacionPorCurso as jest.Mock).mockRejectedValue(null);

      const req = { params: { codigoCurso: 'ISW101' } } as unknown as Request;
      const res = mockResponse();

      await consultarPorCodigoCurso(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Error interno del servidor',
      });
    });
  });
});
