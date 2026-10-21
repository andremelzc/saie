import { Request, Response } from 'express';
import { RolCuenta, TipoAlerta, TipoEspacio } from '@prisma/client';
import {
  altaAlumno,
  altaDocente,
  altaEspacio,
  consultarMapaOcupacion,
  consultarReporteAsignaciones,
  editarEspacio,
  editarSeccion,
  listarAlertas,
  listarAuditoria,
  listarDocentes,
  listarEscaladas,
  listarEspaciosAdmin,
  listarHistorial,
  listarIncidenciasReportadas,
  listarRegistrosAuditoria,
  listarSeccionesAdmin,
  obtenerEspacio,
  obtenerSeccion,
  registrarPcsMalogradasLaboratorio,
  registrarSoftwareLaboratorio,
  resolverAlertaPendiente,
  resolverIncidencia,
  restablecerClaveUsuario,
} from '../../../src/controllers/admin.controller';
import {
  generarReporteAsignaciones,
  listarAuditoria as listarAuditoriaServicio,
  listarHistorialAsignaciones,
} from '../../../src/services/auditoria.service';
import {
  actualizarSeccion as actualizarSeccionServicio,
  listarDocentesParaAsignar,
  listarSecciones,
  obtenerSeccionAdmin,
} from '../../../src/services/seccionAdmin.service';
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

jest.mock('../../../src/services/seccionAdmin.service', () => {
  const actual = jest.requireActual('../../../src/services/seccionAdmin.service');
  return {
    ...actual,
    actualizarSeccion: jest.fn(),
    listarDocentesParaAsignar: jest.fn(),
    listarSecciones: jest.fn(),
    obtenerSeccionAdmin: jest.fn(),
  };
});

jest.mock('../../../src/services/auditoria.service', () => ({
  generarReporteAsignaciones: jest.fn(),
  listarAuditoria: jest.fn(),
  listarHistorialAsignaciones: jest.fn(),
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
        body: { softwareIds: [] },
        auth: authAdmin,
      } as unknown as Request;
      const res = mockResponse();

      await registrarSoftwareLaboratorio(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('debe responder 200 al registrar software correctamente', async () => {
      const mockRes = { laboratorioId: 'lab-1', softwareInstalado: [] };
      (registrarCambioSoftware as jest.Mock).mockResolvedValue(mockRes);

      const req = {
        params: { id: 'lab-1' },
        body: {
          softwareIds: [
            '00000000-0000-4000-8000-000000000001',
            '00000000-0000-4000-8000-000000000002',
          ],
        },
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

  describe('gestion individual de secciones (Issue 4.31)', () => {
    it('debe responder 200 al listar secciones', async () => {
      const mockData = { items: [], total: 0, pagina: 1, limite: 50 };
      (listarSecciones as jest.Mock).mockResolvedValue(mockData);

      const req = {
        query: { periodo: '2026-2', q: 'algorit' },
        auth: authAdmin,
      } as unknown as Request;
      const res = mockResponse();

      await listarSeccionesAdmin(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ success: true, data: mockData });
    });

    it('debe responder 400 si el tipo de espacio no es valido', async () => {
      const req = {
        query: { tipo: 'SALON' },
        auth: authAdmin,
      } as unknown as Request;
      const res = mockResponse();

      await listarSeccionesAdmin(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('debe responder 200 al obtener una seccion', async () => {
      const mockData = { id: 'sec-1', codigoSeccion: '1' };
      (obtenerSeccionAdmin as jest.Mock).mockResolvedValue(mockData);

      const req = {
        params: { id: 'sec-1' },
        auth: authAdmin,
      } as unknown as Request;
      const res = mockResponse();

      await obtenerSeccion(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ success: true, data: mockData });
    });

    it('debe responder 400 al editar sin ningun campo', async () => {
      const req = {
        params: { id: 'sec-1' },
        body: {},
        auth: authAdmin,
      } as unknown as Request;
      const res = mockResponse();

      await editarSeccion(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('debe responder 200 al editar una seccion', async () => {
      const mockData = { seccion: { id: 'sec-1' }, alertas: [] };
      (actualizarSeccionServicio as jest.Mock).mockResolvedValue(mockData);

      const req = {
        params: { id: 'sec-1' },
        body: { tipoEspacioRequerido: 'LABORATORIO' },
        auth: authAdmin,
      } as unknown as Request;
      const res = mockResponse();

      await editarSeccion(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ success: true, data: mockData });
    });

    it('debe responder 200 al listar los docentes', async () => {
      const mockData = [{ id: 'd1', codigoDocente: 'D001', nombre: 'Dra. Garcia' }];
      (listarDocentesParaAsignar as jest.Mock).mockResolvedValue(mockData);

      const req = { auth: authAdmin } as unknown as Request;
      const res = mockResponse();

      await listarDocentes(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ success: true, data: mockData });
    });
  });

  describe('auditoria, historial e informe (Issues 4.32 y 4.33)', () => {
    it('debe responder 400 si el tipo de evento no es valido', async () => {
      const req = {
        query: { tipo: 'INVENTADO' },
        auth: authAdmin,
      } as unknown as Request;
      const res = mockResponse();

      await listarRegistrosAuditoria(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('debe responder 200 al listar la auditoria', async () => {
      const mockData = { items: [], total: 0, pagina: 1, limite: 50 };
      (listarAuditoriaServicio as jest.Mock).mockResolvedValue(mockData);

      const req = {
        query: { tipo: 'ASIGNACION' },
        auth: authAdmin,
      } as unknown as Request;
      const res = mockResponse();

      await listarRegistrosAuditoria(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ success: true, data: mockData });
    });

    it('debe responder 400 si el estado del historial no es valido', async () => {
      const req = {
        query: { estado: 'INVENTADO' },
        auth: authAdmin,
      } as unknown as Request;
      const res = mockResponse();

      await listarHistorial(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('debe responder 200 al listar el historial de asignaciones', async () => {
      const mockData = { items: [], total: 0, pagina: 1, limite: 50 };
      (listarHistorialAsignaciones as jest.Mock).mockResolvedValue(mockData);

      const req = {
        query: { periodo: '2026-2', estado: 'HISTORICA' },
        auth: authAdmin,
      } as unknown as Request;
      const res = mockResponse();

      await listarHistorial(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ success: true, data: mockData });
    });

    it('debe responder 400 si el periodo del informe no es valido', async () => {
      const req = {
        query: { periodo: '2026' },
        auth: authAdmin,
      } as unknown as Request;
      const res = mockResponse();

      await consultarReporteAsignaciones(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('debe responder 200 con el informe de salones', async () => {
      const mockData = { periodo: '2026-2', secciones: [], totales: {} };
      (generarReporteAsignaciones as jest.Mock).mockResolvedValue(mockData);

      const req = {
        query: { periodo: '2026-2' },
        auth: authAdmin,
      } as unknown as Request;
      const res = mockResponse();

      await consultarReporteAsignaciones(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ success: true, data: mockData });
    });
  });
});
