import { Request, Response } from 'express';
import {
  listarAccesibilidadAdmin,
  resolverAccesibilidadAdmin,
} from '../../../src/controllers/accesibilidad.controller';
import {
  listarAccesibilidad,
  resolverSolicitudAccesibilidad,
} from '../../../src/services/accesibilidad.service';

jest.mock('../../../src/services/accesibilidad.service', () => ({
  ...jest.requireActual('../../../src/services/accesibilidad.service'),
  listarAccesibilidad: jest.fn(),
  resolverSolicitudAccesibilidad: jest.fn(),
}));
jest.mock('../../../src/lib/prisma', () => ({ prisma: {} }));

function mockResponse() {
  const res: Partial<Response> = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res as Response;
}

const AUTH = { sub: 'cuenta-coord', rol: 'COORDINACION_ACADEMICA' };

describe('controlador de accesibilidad (Issue 3.60)', () => {
  beforeEach(() => jest.clearAllMocks());

  it('GET responde 200 con pendientes y aprobadas', async () => {
    const vista = { periodo: '2026-2', pendientes: [], aprobadas: [] };
    jest.mocked(listarAccesibilidad).mockResolvedValue(vista);
    const res = mockResponse();
    await listarAccesibilidadAdmin({} as Request, res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ success: true, data: vista });
  });

  it('GET responde con error si el servicio falla', async () => {
    jest.mocked(listarAccesibilidad).mockRejectedValue(new Error('x'));
    const res = mockResponse();
    await listarAccesibilidadAdmin({} as Request, res);
    expect(res.status).toHaveBeenCalledWith(500);
  });

  it('PATCH resuelve con la decisión y la cuenta del token', async () => {
    jest.mocked(resolverSolicitudAccesibilidad).mockResolvedValue({ id: 'sol-1' } as never);
    const res = mockResponse();
    await resolverAccesibilidadAdmin(
      {
        params: { id: 'sol-1' },
        body: { decision: 'RECHAZAR', motivo: 'Falta confirmar' },
        auth: AUTH,
      } as unknown as Request,
      res,
    );
    expect(resolverSolicitudAccesibilidad).toHaveBeenCalledWith(
      'sol-1',
      AUTH,
      { decision: 'RECHAZAR', motivo: 'Falta confirmar' },
      expect.anything(),
    );
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it('PATCH responde 400 si falta el motivo del rechazo', async () => {
    const res = mockResponse();
    await resolverAccesibilidadAdmin(
      { params: { id: 'sol-1' }, body: { decision: 'RECHAZAR' }, auth: AUTH } as unknown as Request,
      res,
    );
    expect(res.status).toHaveBeenCalledWith(400);
    expect(resolverSolicitudAccesibilidad).not.toHaveBeenCalled();
  });
});
