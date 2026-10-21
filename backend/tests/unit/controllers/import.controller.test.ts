import { Request, Response } from 'express';
import { importarDatos } from '../../../src/controllers/import.controller';
import { extraerFilas } from '../../../src/lib/archivoImportacion';
import { ejecutarImportacion } from '../../../src/services/importacion.service';

jest.mock('../../../src/lib/archivoImportacion', () => ({
  extraerFilas: jest.fn(),
}));

jest.mock('../../../src/services/importacion.service', () => ({
  ejecutarImportacion: jest.fn(),
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

describe('Import Controller (Issue 1.6)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('debe responder 404 si el tipo de importación es desconocido', async () => {
    const req = {
      params: { tipo: 'tipo-invalido' },
    } as unknown as Request;
    const res = mockResponse();

    await importarDatos(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        message: expect.stringContaining('Tipo de importación desconocido'),
      }),
    );
  });

  it('debe responder 200 al procesar una importación válida de horarios', async () => {
    const mockFilas = [{ dia: 'LUNES' }];
    const mockResultado = { resultado: { horariosProcesados: 1, errores: [] } };
    (extraerFilas as jest.Mock).mockReturnValue(mockFilas);
    (ejecutarImportacion as jest.Mock).mockResolvedValue(mockResultado);

    const req = {
      params: { tipo: 'horarios' },
      body: mockFilas,
    } as unknown as Request;
    const res = mockResponse();

    await importarDatos(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      data: mockResultado,
    });
    expect(extraerFilas).toHaveBeenCalledWith('horarios', mockFilas);
    expect(ejecutarImportacion).toHaveBeenCalledWith('horarios', mockFilas, expect.anything());
  });

  it('debe responder con error si ejecutarImportacion falla', async () => {
    (extraerFilas as jest.Mock).mockReturnValue([]);
    (ejecutarImportacion as jest.Mock).mockRejectedValue(new Error('Fallo crítico en importación'));

    const req = {
      params: { tipo: 'docentes' },
      body: [],
    } as unknown as Request;
    const res = mockResponse();

    await importarDatos(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
  });
});
