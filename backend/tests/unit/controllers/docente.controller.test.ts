import { Request, Response } from 'express';
import {
  crearIncidencia,
  explorarEspaciosDocente,
  obtenerEstadoLaboratorio,
  obtenerHorario,
} from '../../../src/controllers/docente.controller';
import {
  explorarEspacios,
  obtenerEstadoLaboratorioDocente,
  obtenerHorarioDocente,
  registrarIncidencia,
} from '../../../src/services/docente.service';

jest.mock('../../../src/services/docente.service', () => {
  const actual = jest.requireActual('../../../src/services/docente.service');
  return {
    ...actual,
    explorarEspacios: jest.fn(),
    obtenerEstadoLaboratorioDocente: jest.fn(),
    obtenerHorarioDocente: jest.fn(),
    registrarIncidencia: jest.fn(),
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

describe('Docente Controller (Issues 7.2 - 7.5)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('obtenerHorario', () => {
    it('debe responder 400 si el día no es válido', async () => {
      const req = {
        query: { dia: 'DIANOPERMITIDO' },
        auth: { sub: 'docente-1', rol: 'DOCENTE' },
      } as unknown as Request;
      const res = mockResponse();

      await obtenerHorario(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('debe responder 200 con el horario filtrado por día', async () => {
      const mockHorario = [{ diaSemana: 'MARTES', horaInicio: '14:00', horaFin: '16:00' }];
      (obtenerHorarioDocente as jest.Mock).mockResolvedValue(mockHorario);

      const req = {
        query: { dia: 'MARTES' },
        auth: { sub: 'docente-1', rol: 'DOCENTE' },
      } as unknown as Request;
      const res = mockResponse();

      await obtenerHorario(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: mockHorario,
      });
      expect(obtenerHorarioDocente).toHaveBeenCalledWith('docente-1', 'MARTES', expect.anything());
    });

    it('debe responder 200 con el horario completo sin día', async () => {
      (obtenerHorarioDocente as jest.Mock).mockResolvedValue([]);

      const req = {
        query: {},
        auth: { sub: 'docente-1', rol: 'DOCENTE' },
      } as unknown as Request;
      const res = mockResponse();

      await obtenerHorario(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(obtenerHorarioDocente).toHaveBeenCalledWith('docente-1', undefined, expect.anything());
    });
  });

  describe('explorarEspaciosDocente', () => {
    it('debe responder 400 si la franja es incompleta (solo dia sin horas)', async () => {
      const req = {
        query: { dia: 'LUNES' },
        auth: { sub: 'docente-1', rol: 'DOCENTE' },
      } as unknown as Request;
      const res = mockResponse();

      await explorarEspaciosDocente(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('debe responder 400 si horaInicio es posterior o igual a horaFin', async () => {
      const req = {
        query: { dia: 'LUNES', horaInicio: '12:00', horaFin: '10:00' },
        auth: { sub: 'docente-1', rol: 'DOCENTE' },
      } as unknown as Request;
      const res = mockResponse();

      await explorarEspaciosDocente(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('debe responder 200 con espacios disponibles consultando una franja completa', async () => {
      const mockEspacios = [{ id: 'esp-1', identificador: 'Aula 201' }];
      (explorarEspacios as jest.Mock).mockResolvedValue(mockEspacios);

      const req = {
        query: {
          dia: 'LUNES',
          horaInicio: '08:00',
          horaFin: '10:00',
          pabellon: 'A',
          piso: '2',
          soloDisponibles: 'true',
        },
        auth: { sub: 'docente-1', rol: 'DOCENTE' },
      } as unknown as Request;
      const res = mockResponse();

      await explorarEspaciosDocente(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: mockEspacios,
      });
      expect(explorarEspacios).toHaveBeenCalledWith(
        {
          tipo: undefined,
          pabellon: 'A',
          piso: 2,
          capacidadMinima: undefined,
          soloDisponibles: true,
          franja: { diaSemana: 'LUNES', horaInicio: '08:00', horaFin: '10:00' },
        },
        expect.anything(),
      );
    });

    it('debe responder 200 sin franja horaria (usa momento actual)', async () => {
      (explorarEspacios as jest.Mock).mockResolvedValue([]);

      const req = {
        query: { pabellon: 'B' },
        auth: { sub: 'docente-1', rol: 'DOCENTE' },
      } as unknown as Request;
      const res = mockResponse();

      await explorarEspaciosDocente(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(explorarEspacios).toHaveBeenCalledWith(
        expect.objectContaining({
          franja: undefined,
        }),
        expect.anything(),
      );
    });
  });

  describe('crearIncidencia', () => {
    it('debe responder 400 si el cuerpo no cumple el esquema', async () => {
      const req = {
        body: { descripcion: '' },
        auth: { sub: 'docente-1', rol: 'DOCENTE' },
      } as unknown as Request;
      const res = mockResponse();

      await crearIncidencia(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('debe responder 201 al registrar una incidencia correctamente', async () => {
      const mockIncidencia = { id: 'inc-1', identificadorSeguimiento: 'INC-001' };
      (registrarIncidencia as jest.Mock).mockResolvedValue(mockIncidencia);

      const req = {
        body: {
          asignacionId: 'asig-1',
          espacioId: 'esp-1',
          tipo: 'EQUIPO_NO_OPERATIVO',
          descripcion: 'El proyector no enciende',
          prioridad: 'ALTA',
        },
        auth: { sub: 'docente-1', rol: 'DOCENTE' },
      } as unknown as Request;
      const res = mockResponse();

      await crearIncidencia(req, res);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: mockIncidencia,
      });
    });
  });

  describe('obtenerEstadoLaboratorio', () => {
    it('debe responder 400 si espacioId está vacío', async () => {
      const req = {
        params: { espacioId: '' },
        auth: { sub: 'docente-1', rol: 'DOCENTE' },
      } as unknown as Request;
      const res = mockResponse();

      await obtenerEstadoLaboratorio(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('debe responder 200 con el estado del laboratorio', async () => {
      const mockEstado = { espacioId: 'lab-1', softwareInstalado: ['Node.js'] };
      (obtenerEstadoLaboratorioDocente as jest.Mock).mockResolvedValue(mockEstado);

      const req = {
        params: { espacioId: 'lab-1' },
        auth: { sub: 'docente-1', rol: 'DOCENTE' },
      } as unknown as Request;
      const res = mockResponse();

      await obtenerEstadoLaboratorio(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: mockEstado,
      });
      expect(obtenerEstadoLaboratorioDocente).toHaveBeenCalledWith(
        'docente-1',
        'lab-1',
        expect.anything(),
      );
    });
  });
});
