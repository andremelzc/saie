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

  it('debe registrar error si la fila no cumple el esquema de validación', async () => {
    const datos = [
      {
        codigoDocente: '',
        nombre: 'Sin nombre',
        correoInstitucional: 'correo-invalido',
        departamento: '',
      },
    ];

    const resultado = await importarDocentes(datos, mockPrisma);

    expect(resultado.docentesProcesados).toBe(0);
    expect(resultado.errores).toHaveLength(1);
    expect(resultado.errores[0]).toContain('Fila 1:');
  });

  it('debe capturar errores de base de datos durante la importación', async () => {
    mockPrisma.cuenta.upsert.mockRejectedValue(new Error('Fallo de BD en cuenta docente'));

    const datos = [
      {
        codigoDocente: 'D002',
        nombre: 'Dr. Juan Ramos',
        correoInstitucional: 'juan.ramos@unmsm.edu.pe',
        departamento: 'Ciencias de la Computación',
      },
    ];

    const resultado = await importarDocentes(datos, mockPrisma);

    expect(resultado.docentesProcesados).toBe(0);
    expect(resultado.cuentasCreadas).toBe(0);
    expect(resultado.errores[0]).toContain('Fila 1 (D002): Fallo de BD en cuenta docente');
  });
});
