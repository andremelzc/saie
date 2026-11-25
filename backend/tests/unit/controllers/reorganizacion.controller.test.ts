import { Request, Response } from 'express';
import {
  consultarReorganizacion,
  ejecutarReorganizacion,
} from '../../../src/controllers/asignacion.controller';
import { HttpError } from '../../../src/lib/http';
import {
  reorganizarConPrioridad,
  vistaPreviaReorganizacion,
} from '../../../src/services/reorganizacion.service';

jest.mock('../../../src/services/reorganizacion.service', () => ({
  reorganizarConPrioridad: jest.fn(),
  vistaPreviaReorganizacion: jest.fn(),
}));
jest.mock('../../../src/lib/prisma', () => ({ prisma: {} }));

function mockResponse() {
  const res: Partial<Response> = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res as Response;
}

describe('controlador de la reorganización (Issue 2.26)', () => {
  beforeEach(() => jest.clearAllMocks());

  it('GET responde 200 con la ventana y la simulación', async () => {
    const vista = { disponible: true, simulacion: { cambianDeAula: 2 } };
    jest.mocked(vistaPreviaReorganizacion).mockResolvedValue(vista as never);
    const res = mockResponse();
    await consultarReorganizacion({} as Request, res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ success: true, data: vista });
  });

  it('GET responde con error si el servicio falla', async () => {
    jest.mocked(vistaPreviaReorganizacion).mockRejectedValue(new Error('x'));
    const res = mockResponse();
    await consultarReorganizacion({} as Request, res);
    expect(res.status).toHaveBeenCalledWith(500);
  });

  it('POST responde 200 con el resumen de la corrida', async () => {
    jest.mocked(reorganizarConPrioridad).mockResolvedValue({ asignadas: 3 } as never);
    const res = mockResponse();
    await ejecutarReorganizacion({} as Request, res);
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it('POST responde 409 fuera de la ventana', async () => {
    jest
      .mocked(reorganizarConPrioridad)
      .mockRejectedValue(new HttpError(409, 'Solo se permite al inicio del ciclo'));
    const res = mockResponse();
    await ejecutarReorganizacion({} as Request, res);
    expect(res.status).toHaveBeenCalledWith(409);
  });
});
