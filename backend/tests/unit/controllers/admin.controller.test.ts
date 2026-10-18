import { Request, Response } from 'express';
import { RolCuenta, TipoAlerta, TipoEspacio } from '@prisma/client';
import {
  altaAlumno,
  altaDocente,
  altaEspacio,
  consultarMapaOcupacion,
  editarEspacio,
  listarAlertas,
  listarEscaladas,
  listarEspaciosAdmin,
  listarIncidenciasReportadas,
  obtenerEspacio,
  registrarPcsMalogradasLaboratorio,
  registrarSoftwareLaboratorio,
  resolverAlertaPendiente,
  resolverIncidencia,
  restablecerClaveUsuario,
} from '../../../src/controllers/admin.controller';
import { listarAlertasActivas, resolverAlerta } from '../../../src/services/alerta.service';
import {
  actualizarEspacio,
  crearEspacio,
  listarEspacios,
  obtenerEspacioAdmin,
} from '../../../src/services/espacioAdmin.service';
import { cerrarIncidencia, listarIncidencias } from '../../../src/services/incidenciaAdmin.service';
import {
  registrarCambioPcsMalogradas,
  registrarCambioSoftware,
} from '../../../src/services/laboratorio.service';
import { obtenerOcupacionPorPiso } from '../../../src/services/ocupacion.service';
import { restablecerClave } from '../../../src/services/restablecerClave.service';
import { listarSeccionesEscaladas } from '../../../src/services/revision.service';
import { crearAlumno, crearDocente } from '../../../src/services/usuario.service';

jest.mock('../../../src/services/alerta.service', () => ({
  listarAlertasActivas: jest.fn(),
  resolverAlerta: jest.fn(),
}));

jest.mock('../../../src/services/laboratorio.service', () => ({
  registrarCambioPcsMalogradas: jest.fn(),
  registrarCambioSoftware: jest.fn(),
}));

jest.mock('../../../src/services/ocupacion.service', () => ({
  obtenerOcupacionPorPiso: jest.fn(),
}));

jest.mock('../../../src/services/revision.service', () => ({
  listarSeccionesEscaladas: jest.fn(),
}));

jest.mock('../../../src/services/incidenciaAdmin.service', () => {
  const actual = jest.requireActual('../../../src/services/incidenciaAdmin.service');
  return {
    ...actual,
    cerrarIncidencia: jest.fn(),
    listarIncidencias: jest.fn(),
  };
});

jest.mock('../../../src/services/usuario.service', () => {
  const actual = jest.requireActual('../../../src/services/usuario.service');
  return {
    ...actual,
    crearAlumno: jest.fn(),
    crearDocente: jest.fn(),
  };
});

jest.mock('../../../src/services/espacioAdmin.service', () => {
  const actual = jest.requireActual('../../../src/services/espacioAdmin.service');
  return {
    ...actual,
    actualizarEspacio: jest.fn(),
    crearEspacio: jest.fn(),
    listarEspacios: jest.fn(),
    obtenerEspacioAdmin: jest.fn(),
  };
});

jest.mock('../../../src/services/restablecerClave.service', () => {
  const actual = jest.requireActual('../../../src/services/restablecerClave.service');
  return {
    ...actual,
    restablecerClave: jest.fn(),
  };
});

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

const authAdmin = { sub: 'admin-1', rol: RolCuenta.COORDINACION_ACADEMICA };

describe('Admin Controller (Sprint 4)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('registrarSoftwareLaboratorio', () => {
    it('debe responder 400 si el id es inválido o el body supera límites', async () => {
      const req = {
        params: { id: '' },
        body: { softwareInstalado: [] },
        auth: authAdmin,
      } as unknown as Request;
      const res = mockResponse();

      await registrarSoftwareLaboratorio(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('debe responder 200 al registrar software correctamente', async () => {
      const mockRes = { laboratorioId: 'lab-1', softwareInstalado: ['Docker', 'Node.js'] };
      (registrarCambioSoftware as jest.Mock).mockResolvedValue(mockRes);

      const req = {
        params: { id: 'lab-1' },
        body: { softwareInstalado: ['Docker', 'Node.js'] },
        auth: authAdmin,
      } as unknown as Request;
      const res = mockResponse();

      await registrarSoftwareLaboratorio(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ success: true, data: mockRes });
    });
  });

  describe('registrarPcsMalogradasLaboratorio', () => {
    it('debe responder 400 si pcsMalogradas es negativo', async () => {
      const req = {
        params: { id: 'lab-1' },
        body: { pcsMalogradas: -5 },
        auth: authAdmin,
      } as unknown as Request;
      const res = mockResponse();

      await registrarPcsMalogradasLaboratorio(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('debe responder 200 al registrar pcs malogradas', async () => {
      const mockRes = { laboratorioId: 'lab-1', pcsMalogradas: 2 };
      (registrarCambioPcsMalogradas as jest.Mock).mockResolvedValue(mockRes);

      const req = {
        params: { id: 'lab-1' },
        body: { pcsMalogradas: 2 },
        auth: authAdmin,
      } as unknown as Request;
      const res = mockResponse();

      await registrarPcsMalogradasLaboratorio(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ success: true, data: mockRes });
    });
  });

  describe('listarAlertas y resolverAlertaPendiente', () => {
    it('debe responder 400 si el tipo de alerta no es válido', async () => {
      const req = {
        query: { tipo: 'TIPO_INEXISTENTE' },
        auth: authAdmin,
      } as unknown as Request;
      const res = mockResponse();

      await listarAlertas(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('debe responder 200 con alertas filtradas', async () => {
      const mockAlertas = [{ id: 'alt-1', tipo: TipoAlerta.SOFTWARE }];
      (listarAlertasActivas as jest.Mock).mockResolvedValue(mockAlertas);

      const req = {
        query: { tipo: 'SOFTWARE', espacioId: 'esp-1' },
        auth: authAdmin,
      } as unknown as Request;
      const res = mockResponse();

      await listarAlertas(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ success: true, data: mockAlertas });
    });

    it('debe responder 400 si el id de alerta está vacío al resolver', async () => {
      const req = {
        params: { id: '' },
        auth: authAdmin,
      } as unknown as Request;
      const res = mockResponse();

      await resolverAlertaPendiente(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('debe responder 200 al resolver alerta', async () => {
      const mockRes = { id: 'alt-1', estado: 'RESUELTA' };
      (resolverAlerta as jest.Mock).mockResolvedValue(mockRes);

      const req = {
        params: { id: 'alt-1' },
        auth: authAdmin,
      } as unknown as Request;
      const res = mockResponse();

      await resolverAlertaPendiente(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ success: true, data: mockRes });
    });
  });

  describe('consultarMapaOcupacion', () => {
    it('debe responder 200 con ocupación por piso', async () => {
      const mockData = { pabellon: 'A', piso: 1, espacios: [] };
      (obtenerOcupacionPorPiso as jest.Mock).mockResolvedValue(mockData);

      const req = {
        query: { pabellon: 'A', piso: '1' },
      } as unknown as Request;
      const res = mockResponse();

      await consultarMapaOcupacion(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ success: true, data: mockData });
    });
  });

  describe('listarEscaladas', () => {
    it('debe responder 400 si el periodo tiene formato inválido', async () => {
      const req = {
        query: { periodo: 'periodo-invalido' },
      } as unknown as Request;
      const res = mockResponse();

      await listarEscaladas(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('debe responder 200 con secciones escaladas', async () => {
      const mockData = [{ seccionId: 's1', motivo: 'SIN_ESPACIO' }];
      (listarSeccionesEscaladas as jest.Mock).mockResolvedValue(mockData);

      const req = {
        query: { periodo: '2026-1' },
      } as unknown as Request;
      const res = mockResponse();

      await listarEscaladas(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ success: true, data: mockData });
    });
  });

  describe('listarIncidenciasReportadas y resolverIncidencia', () => {
    it('debe responder 200 al listar incidencias', async () => {
      (listarIncidencias as jest.Mock).mockResolvedValue([]);

      const req = {
        query: { estado: 'PENDIENTE' },
        auth: authAdmin,
      } as unknown as Request;
      const res = mockResponse();

      await listarIncidenciasReportadas(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('debe responder 200 al resolver incidencia con comentario', async () => {
      const mockRes = { id: 'inc-1', estado: 'RESUELTA' };
      (cerrarIncidencia as jest.Mock).mockResolvedValue(mockRes);

      const req = {
        params: { id: 'inc-1' },
        body: { estado: 'RESUELTA', comentario: 'Solucionado el equipo' },
        auth: authAdmin,
      } as unknown as Request;
      const res = mockResponse();

      await resolverIncidencia(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  describe('altaAlumno y altaDocente', () => {
    it('debe responder 201 al dar de alta un alumno', async () => {
      const mockAlumno = { id: 'a1', codigo: '20201111' };
      (crearAlumno as jest.Mock).mockResolvedValue(mockAlumno);

      const req = {
        body: { codigo: '20201111', nombre: 'Carlos Perez', correo: 'carlos@unmsm.edu.pe' },
        auth: authAdmin,
      } as unknown as Request;
      const res = mockResponse();

      await altaAlumno(req, res);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({ success: true, data: mockAlumno });
    });

    it('debe responder 201 al dar de alta un docente', async () => {
      const mockDocente = { id: 'd1', codigoDocente: 'D999' };
      (crearDocente as jest.Mock).mockResolvedValue(mockDocente);

      const req = {
        body: {
          codigoDocente: 'D999',
          nombre: 'Prof. Mario',
          correoInstitucional: 'mario@unmsm.edu.pe',
          departamento: 'Sistemas',
        },
        auth: authAdmin,
      } as unknown as Request;
      const res = mockResponse();

      await altaDocente(req, res);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({ success: true, data: mockDocente });
    });
  });

  describe('espacios admin', () => {
    it('debe responder 200 al listar espacios', async () => {
      (listarEspacios as jest.Mock).mockResolvedValue([]);

      const req = {
        query: { tipo: TipoEspacio.AULA_TEORICA },
        auth: authAdmin,
      } as unknown as Request;
      const res = mockResponse();

      await listarEspaciosAdmin(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('debe responder 200 al obtener un espacio por id', async () => {
      const mockEspacio = { id: 'esp-1', identificador: '101' };
      (obtenerEspacioAdmin as jest.Mock).mockResolvedValue(mockEspacio);

      const req = {
        params: { id: 'esp-1' },
        auth: authAdmin,
      } as unknown as Request;
      const res = mockResponse();

      await obtenerEspacio(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('debe responder 201 al crear espacio', async () => {
      const mockCreado = { id: 'esp-nuevo', identificador: '102' };
      (crearEspacio as jest.Mock).mockResolvedValue(mockCreado);

      const req = {
        body: {
          identificador: '102',
          pabellon: 'A',
          piso: 1,
          tipo: TipoEspacio.AULA_TEORICA,
          aforoNominal: 40,
        },
        auth: authAdmin,
      } as unknown as Request;
      const res = mockResponse();

      await altaEspacio(req, res);

      expect(res.status).toHaveBeenCalledWith(201);
    });

    it('debe responder 200 al editar espacio', async () => {
      const mockEditado = { id: 'esp-1', aforoNominal: 50 };
      (actualizarEspacio as jest.Mock).mockResolvedValue(mockEditado);

      const req = {
        params: { id: 'esp-1' },
        body: { aforoNominal: 50 },
        auth: authAdmin,
      } as unknown as Request;
      const res = mockResponse();

      await editarEspacio(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  describe('restablecerClaveUsuario', () => {
    it('debe responder 200 y fijar Cache-Control: no-store', async () => {
      const mockData = { claveTemporal: 'temp12345' };
      (restablecerClave as jest.Mock).mockResolvedValue(mockData);

      const req = {
        body: { usuario: '20201111' },
        auth: authAdmin,
      } as unknown as Request;
      const res = mockResponse();

      await restablecerClaveUsuario(req, res);

      expect(res.setHeader).toHaveBeenCalledWith('Cache-Control', 'no-store');
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ success: true, data: mockData });
    });
  });
});
