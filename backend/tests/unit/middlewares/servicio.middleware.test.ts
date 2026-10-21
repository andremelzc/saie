import { NextFunction, Request, Response } from 'express';
import { tokenServicioGuard } from '../../../src/middlewares/servicio.middleware';

function mockResponse() {
  const res: Partial<Response> = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res as Response;
}

describe('Middleware: tokenServicioGuard', () => {
  const VAR_NAME = 'TEST_SERVICE_SECRET';

  afterEach(() => {
    delete process.env[VAR_NAME];
  });

  it('debe responder 503 si la variable de entorno no está configurada', () => {
    delete process.env[VAR_NAME];
    const guard = tokenServicioGuard(VAR_NAME);

    const req = { headers: {} } as Request;
    const res = mockResponse();
    const next = jest.fn() as NextFunction;

    guard(req, res, next);

    expect(res.status).toHaveBeenCalledWith(503);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: 'El servicio no está configurado',
    });
    expect(next).not.toHaveBeenCalled();
  });

  it('debe responder 401 si no se envía la cabecera Authorization o está vacía', () => {
    process.env[VAR_NAME] = 'secret-token-123';
    const guard = tokenServicioGuard(VAR_NAME);

    const req = { headers: {} } as Request;
    const res = mockResponse();
    const next = jest.fn() as NextFunction;

    guard(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: 'Token de servicio ausente',
    });
    expect(next).not.toHaveBeenCalled();
  });

  it('debe responder 403 si el token no coincide', () => {
    process.env[VAR_NAME] = 'secret-token-123';
    const guard = tokenServicioGuard(VAR_NAME);

    const req = {
      headers: { authorization: 'Bearer token-equivocado' },
    } as Request;
    const res = mockResponse();
    const next = jest.fn() as NextFunction;

    guard(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: 'Token de servicio incorrecto',
    });
    expect(next).not.toHaveBeenCalled();
  });

  it('debe llamar a next() si el token coincide exactamente', () => {
    process.env[VAR_NAME] = 'secret-token-123';
    const guard = tokenServicioGuard(VAR_NAME);

    const req = {
      headers: { authorization: 'Bearer secret-token-123' },
    } as Request;
    const res = mockResponse();
    const next = jest.fn() as NextFunction;

    guard(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });
});
