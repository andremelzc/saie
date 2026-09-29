import { importarDocentes } from '../../../src/importers/docentes.importer';

describe('Importador Masivo de Docentes y Credenciales (Issue 1.8)', () => {
  let mockPrisma: any;

  beforeEach(() => {
    mockPrisma = {
      cuenta: {
        upsert: jest.fn().mockResolvedValue({ id: 'cuenta-docente-123' }),
      },
      docente: {
        upsert: jest.fn().mockResolvedValue({ id: 'docente-123', codigoDocente: 'D001' }),
      },
    };
  });

  it('debe registrar docentes y crear sus cuentas con rol DOCENTE', async () => {
    const datos = [
      {
        codigoDocente: 'D001',
        nombre: 'Dr. Carlos Mendoza',
        correoInstitucional: 'carlos.mendoza@unmsm.edu.pe',
        departamento: 'Ingeniería de Software',
      },
    ];

    const resultado = await importarDocentes(datos, mockPrisma);

    expect(resultado.docentesProcesados).toBe(1);
    expect(resultado.cuentasCreadas).toBe(1);
    expect(resultado.errores).toHaveLength(0);

    expect(mockPrisma.cuenta.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({
          usuarioLogin: 'D001',
          rol: 'DOCENTE',
          debeCambiarClave: true,
        }),
      }),
    );

    expect(mockPrisma.docente.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({
          codigoDocente: 'D001',
          nombre: 'Dr. Carlos Mendoza',
        }),
      }),
    );
  });
});
