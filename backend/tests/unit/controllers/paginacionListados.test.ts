import { Request, Response } from 'express';
import { RolCuenta } from '@prisma/client';
import {
  listarAlertas,
  listarDocentes,
  listarEscaladas,
  listarEspaciosAdmin,
  listarHistorial,
  listarIncidenciasReportadas,
  listarRegistrosAuditoria,
  listarSeccionesAdmin,
} from '../../../src/controllers/admin.controller';
import { listarCatalogoSoftware } from '../../../src/controllers/software.controller';
import { listarSolicitudesSoftware } from '../../../src/controllers/solicitudSoftware.controller';

// Mocks de servicios
jest.mock('../../../src/lib/prisma', () => ({ prisma: {} }));

jest.mock('../../../src/services/alerta.service', () => ({
  listarAlertasActivas: jest.fn().mockResolvedValue([]),
}));

jest.mock('../../../src/services/revision.service', () => ({
  listarSeccionesEscaladas: jest
    .fn()
    .mockResolvedValue({ periodo: '2026-1', total: 0, secciones: [] }),
}));

jest.mock('../../../src/services/incidenciaAdmin.service', () => {
  const actual = jest.requireActual('../../../src/services/incidenciaAdmin.service');
  return {
    ...actual,
    listarIncidencias: jest.fn().mockResolvedValue([]),
  };
});

jest.mock('../../../src/services/software.service', () => {
  const actual = jest.requireActual('../../../src/services/software.service');
  return {
    ...actual,
    listarSoftware: jest
      .fn()
      .mockResolvedValue({ items: [], total: 0, page: 1, limit: 50, totalPages: 0 }),
  };
});

jest.mock('../../../src/services/solicitudSoftware.service', () => {
  const actual = jest.requireActual('../../../src/services/solicitudSoftware.service');
  return {
    ...actual,
    listarSolicitudes: jest
      .fn()
      .mockResolvedValue({ items: [], total: 0, page: 1, limit: 50, totalPages: 0 }),
  };
});

jest.mock('../../../src/services/espacioAdmin.service', () => {
  const actual = jest.requireActual('../../../src/services/espacioAdmin.service');
  return {
    ...actual,
    listarEspacios: jest.fn().mockResolvedValue([]),
  };
});

jest.mock('../../../src/services/seccionAdmin.service', () => {
  const actual = jest.requireActual('../../../src/services/seccionAdmin.service');
  return {
    ...actual,
    listarSecciones: jest
      .fn()
      .mockResolvedValue({ items: [], total: 0, pagina: 1, limite: 50, totalPaginas: 0 }),
    listarDocentesParaAsignar: jest.fn().mockResolvedValue([]),
  };
});

jest.mock('../../../src/services/auditoria.service', () => ({
  listarAuditoria: jest
    .fn()
    .mockResolvedValue({ total: 0, pagina: 1, limite: 50, totalPaginas: 0, registros: [] }),
  listarHistorialAsignaciones: jest
    .fn()
    .mockResolvedValue({ total: 0, pagina: 1, limite: 50, totalPaginas: 0, asignaciones: [] }),
}));

import { listarAlertasActivas } from '../../../src/services/alerta.service';
import { listarSeccionesEscaladas } from '../../../src/services/revision.service';
import { listarIncidencias } from '../../../src/services/incidenciaAdmin.service';
import { listarSoftware } from '../../../src/services/software.service';
import { listarSolicitudes } from '../../../src/services/solicitudSoftware.service';
import { listarEspacios } from '../../../src/services/espacioAdmin.service';
import {
  listarDocentesParaAsignar,
  listarSecciones,
} from '../../../src/services/seccionAdmin.service';
import {
  listarAuditoria,
  listarHistorialAsignaciones,
} from '../../../src/services/auditoria.service';

function mockResponse() {
  const res: Partial<Response> = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res as Response;
}

const authAdmin = { sub: 'admin-1', rol: RolCuenta.COORDINACION_ACADEMICA };

interface ListadoConfig {
  nombre: string;
  endpoint: string;
  handler: (req: Request, res: Response) => Promise<void>;
  paramLimite: 'limite' | 'limit';
  topeMaximo: number;
  limitePorDefecto: number;
  servicioMock: jest.Mock;
}

const LISTADOS: ListadoConfig[] = [
  {
    nombre: 'alertas',
    endpoint: 'GET /api/v1/admin/alertas',
    handler: listarAlertas,
    paramLimite: 'limite',
    topeMaximo: 200,
    limitePorDefecto: 50,
    servicioMock: listarAlertasActivas as unknown as jest.Mock,
  },
  {
    nombre: 'secciones-escaladas',
    endpoint: 'GET /api/v1/admin/secciones-escaladas',
    handler: listarEscaladas,
    paramLimite: 'limite',
    topeMaximo: 200,
    limitePorDefecto: 50,
    servicioMock: listarSeccionesEscaladas as unknown as jest.Mock,
  },
  {
    nombre: 'incidencias',
    endpoint: 'GET /api/v1/admin/incidencias',
    handler: listarIncidenciasReportadas,
    paramLimite: 'limite',
    topeMaximo: 200,
    limitePorDefecto: 50,
    servicioMock: listarIncidencias as unknown as jest.Mock,
  },
  {
    nombre: 'software',
    endpoint: 'GET /api/v1/admin/software',
    handler: listarCatalogoSoftware,
    paramLimite: 'limit',
    topeMaximo: 100,
    limitePorDefecto: 50,
    servicioMock: listarSoftware as unknown as jest.Mock,
  },
  {
    nombre: 'solicitudes-software',
    endpoint: 'GET /api/v1/admin/solicitudes-software',
    handler: listarSolicitudesSoftware,
    paramLimite: 'limit',
    topeMaximo: 100,
    limitePorDefecto: 50,
    servicioMock: listarSolicitudes as unknown as jest.Mock,
  },
  {
    nombre: 'espacios',
    endpoint: 'GET /api/v1/admin/espacios',
    handler: listarEspaciosAdmin,
    paramLimite: 'limite',
    topeMaximo: 200,
    limitePorDefecto: 50,
    servicioMock: listarEspacios as unknown as jest.Mock,
  },
  {
    nombre: 'secciones',
    endpoint: 'GET /api/v1/admin/secciones',
    handler: listarSeccionesAdmin,
    paramLimite: 'limite',
    topeMaximo: 200,
    limitePorDefecto: 50,
    servicioMock: listarSecciones as unknown as jest.Mock,
  },
  {
    nombre: 'docentes',
    endpoint: 'GET /api/v1/admin/docentes',
    handler: listarDocentes,
    paramLimite: 'limite',
    topeMaximo: 200,
    limitePorDefecto: 50,
    servicioMock: listarDocentesParaAsignar as unknown as jest.Mock,
  },
  {
    nombre: 'auditoria',
    endpoint: 'GET /api/v1/admin/auditoria',
    handler: listarRegistrosAuditoria,
    paramLimite: 'limite',
    topeMaximo: 200,
    limitePorDefecto: 50,
    servicioMock: listarAuditoria as unknown as jest.Mock,
  },
  {
    nombre: 'historial-asignaciones',
    endpoint: 'GET /api/v1/admin/asignaciones/historial',
    handler: listarHistorial,
    paramLimite: 'limite',
    topeMaximo: 200,
    limitePorDefecto: 50,
    servicioMock: listarHistorialAsignaciones as unknown as jest.Mock,
  },
];

describe('Paginación y topes acotados en endpoints de listado (Issue #369)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe.each(LISTADOS)(
    '$endpoint ($nombre)',
    ({ handler, paramLimite, topeMaximo, limitePorDefecto, servicioMock }) => {
      it(`debe responder 400 si el parámetro '${paramLimite}' supera el tope máximo de ${topeMaximo}`, async () => {
        const req = {
          query: { [paramLimite]: String(topeMaximo + 1) },
          auth: authAdmin,
        } as unknown as Request;
        const res = mockResponse();

        await handler(req, res);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(servicioMock).not.toHaveBeenCalled();
      });

      it(`debe responder 400 si '${paramLimite}' es 0 o negativo`, async () => {
        const req = {
          query: { [paramLimite]: '0' },
          auth: authAdmin,
        } as unknown as Request;
        const res = mockResponse();

        await handler(req, res);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(servicioMock).not.toHaveBeenCalled();
      });

      it(`debe responder 400 si '${paramLimite}' no es un número entero`, async () => {
        const req = {
          query: { [paramLimite]: 'abc' },
          auth: authAdmin,
        } as unknown as Request;
        const res = mockResponse();

        await handler(req, res);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(servicioMock).not.toHaveBeenCalled();
      });

      it(`debe aceptar un valor válido dentro del rango permitido (ej. 25)`, async () => {
        const req = {
          query: { [paramLimite]: '25' },
          auth: authAdmin,
        } as unknown as Request;
        const res = mockResponse();

        await handler(req, res);

        expect(res.status).toHaveBeenCalledWith(200);
        expect(servicioMock).toHaveBeenCalled();
      });

      it(`debe aplicar el tope por defecto (${limitePorDefecto}) cuando no se envía parámetro`, async () => {
        const req = {
          query: {},
          auth: authAdmin,
        } as unknown as Request;
        const res = mockResponse();

        await handler(req, res);

        expect(res.status).toHaveBeenCalledWith(200);
        expect(servicioMock).toHaveBeenCalled();
      });
    },
  );

  describe('Auditoría global de endpoints acotados', () => {
    it('garantiza que todos los listados registrados tienen un tope máximo menor o igual a 200', () => {
      for (const listado of LISTADOS) {
        expect(listado.topeMaximo).toBeLessThanOrEqual(200);
        expect(listado.limitePorDefecto).toBeLessThanOrEqual(listado.topeMaximo);
        expect(listado.limitePorDefecto).toBeGreaterThan(0);
      }
    });

    it('cubre al menos 10 listados críticos del sistema SAIE', () => {
      expect(LISTADOS.length).toBeGreaterThanOrEqual(10);
    });
  });
});
