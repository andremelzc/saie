import { importarMatriculas } from '../../../src/importers/matriculas.importer';

describe('Importador de Matrículas y Cuentas de Alumno (Issues 1.5 y 1.7)', () => {
  let mockPrisma: any;

  beforeEach(() => {
    mockPrisma = {
      cuenta: {
        upsert: jest.fn().mockResolvedValue({ id: 'cuenta-alumno-123' }),
      },
      alumno: {
        upsert: jest.fn().mockResolvedValue({ id: 'alumno-123', codigo: '22200101' }),
      },
      curso: {
        findUnique: jest.fn().mockResolvedValue({ id: 'curso-123', codigo: '2020101' }),
      },
      seccion: {
        findUnique: jest.fn().mockResolvedValue({ id: 'seccion-123', codigoSeccion: 'S1' }),
      },
      matricula: {
        upsert: jest.fn().mockResolvedValue({ id: 'matricula-123' }),
      },
    };
  });

  it('debe registrar un alumno, su cuenta y su matrícula conservando el flag de movilidad reducida', async () => {
    const datos = [
      {
        codigoAlumno: '22200101',
        nombre: 'Juan Pérez',
        correo: 'juan.perez@unmsm.edu.pe',
        movilidadReducida: true,
        codigoCurso: '2020101',
        codigoSeccion: 'S1',
        periodo: '2026-1',
        crearCuentaAcceso: true,
      },
    ];

    const resultado = await importarMatriculas(datos, mockPrisma);

    expect(resultado.alumnosProcesados).toBe(1);
    expect(resultado.cuentasCreadas).toBe(1);
    expect(resultado.matriculasProcesadas).toBe(1);
    expect(resultado.errores).toHaveLength(0);

    expect(mockPrisma.cuenta.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({
          usuarioLogin: '22200101',
          rol: 'ALUMNO',
        }),
      })
    );

    expect(mockPrisma.matricula.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({
          movilidadReducida: true,
        }),
      })
    );
  });
});
