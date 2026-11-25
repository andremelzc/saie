import { Request, Response } from 'express';
import { previsualizarImportacion } from '../../../src/controllers/import.controller';
import { extraerFilas } from '../../../src/lib/archivoImportacion';
import { calcularVistaPrevia } from '../../../src/services/vistaPreviaImportacion.service';

jest.mock('../../../src/lib/archivoImportacion', () => ({ extraerFilas: jest.fn() }));
jest.mock('../../../src/services/vistaPreviaImportacion.service', () => ({
  calcularVistaPrevia: jest.fn(),
}));
jest.mock('../../../src/lib/prisma', () => ({ prisma: {} }));

function mockResponse() {
  const res: Partial<Response> = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res as Response;
}

describe('POST /import/:tipo/vista-previa (Issue 1.17)', () => {
  beforeEach(() => jest.clearAllMocks());

  it('responde 200 con la vista previa del archivo', async () => {
    const filas = [{ codigoAlumno: 'A1' }];
    const vista = { tipo: 'matriculas', cambios: { matriculasRetiradas: 1 } };
    jest.mocked(extraerFilas).mockReturnValue(filas);
    jest.mocked(calcularVistaPrevia).mockResolvedValue(vista as never);
    const res = mockResponse();

    await previsualizarImportacion(
      { params: { tipo: 'matriculas' }, body: 'csv' } as unknown as Request,
      res,
    );

    expect(extraerFilas).toHaveBeenCalledWith('matriculas', 'csv');
    expect(calcularVistaPrevia).toHaveBeenCalledWith('matriculas', filas, expect.anything());
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ success: true, data: vista });
  });

  it('responde 404 si el tipo de importación es desconocido', async () => {
    const res = mockResponse();
    await previsualizarImportacion({ params: { tipo: 'otro' } } as unknown as Request, res);
    expect(res.status).toHaveBeenCalledWith(404);
    expect(calcularVistaPrevia).not.toHaveBeenCalled();
  });

  it('responde con error si el cálculo falla', async () => {
    jest.mocked(extraerFilas).mockReturnValue([]);
    jest.mocked(calcularVistaPrevia).mockRejectedValue(new Error('fallo'));
    const res = mockResponse();
    await previsualizarImportacion(
      { params: { tipo: 'horarios' }, body: [] } as unknown as Request,
      res,
    );
    expect(res.status).toHaveBeenCalledWith(500);
  });
});
