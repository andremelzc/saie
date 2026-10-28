import bcrypt from 'bcrypt';
import { PrismaClient, RolCuenta } from '@prisma/client';
import { importarMatriculas } from '../../../src/importers/matriculas.importer';
import { importarDocentes } from '../../../src/importers/docentes.importer';

describe('Issue 1.14: Claves iniciales no derivables del código de usuario', () => {
  let mockPrisma: any;

  beforeEach(() => {
    mockPrisma = {
      cuenta: {
        findUnique: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockImplementation(async ({ data }) => ({
          id: `cuenta-${data.usuarioLogin}`,
          ...data,
        })),
        upsert: jest.fn(),
      },
      alumno: {
        upsert: jest.fn().mockResolvedValue({ id: 'alumno-1', codigo: '22200101' }),
      },
      docente: {
        upsert: jest.fn().mockResolvedValue({ id: 'docente-1', codigoDocente: 'D1001' }),
      },
      curso: {
        findUnique: jest.fn().mockResolvedValue({ id: 'curso-1', codigo: 'CS101' }),
      },
      seccion: {
        findUnique: jest.fn().mockResolvedValue({ id: 'sec-1', codigoSeccion: 'S1' }),
      },
      matricula: {
        upsert: jest.fn().mockResolvedValue({ id: 'mat-1' }),
      },
    };
  });

  it('al importar matrículas, genera una clave aleatoria no derivable del código del alumno y la retorna en clavesIniciales', async () => {
    const filas = [
      {
        codigoAlumno: '22200101',
        nombre: 'Estudiante Ejemplo',
        correo: 'estudiante@unmsm.edu.pe',
        movilidadReducida: false,
        codigoCurso: 'CS101',
        codigoSeccion: 'S1',
        periodo: '2026-1',
        crearCuentaAcceso: true,
      },
    ];

    const res = await importarMatriculas(filas, mockPrisma);

    expect(res.alumnosProcesados).toBe(1);
    expect(res.cuentasCreadas).toBe(1);
    expect(res.clavesIniciales).toBeDefined();
    expect(res.clavesIniciales).toHaveLength(1);

    const credencial = res.clavesIniciales![0];
    expect(credencial.codigo).toBe('22200101');
    expect(credencial.rol).toBe(RolCuenta.ALUMNO);
    expect(credencial.claveInicial).not.toBe('22200101');
    expect(credencial.claveInicial.length).toBeGreaterThanOrEqual(8);

    // Verificar que la base de datos almacene solo el hash y no la clave en texto claro
    const cuentaCreadaCall = mockPrisma.cuenta.create.mock.calls[0][0];
    expect(cuentaCreadaCall.data.usuarioLogin).toBe('22200101');
    expect(cuentaCreadaCall.data.debeCambiarClave).toBe(true);
    expect(cuentaCreadaCall.data.claveHash).not.toBe(credencial.claveInicial);

    const coincideHash = await bcrypt.compare(
      credencial.claveInicial,
      cuentaCreadaCall.data.claveHash,
    );
    expect(coincideHash).toBe(true);
  });

  it('al importar docentes, genera una clave aleatoria no derivable del código del docente y la retorna en clavesIniciales', async () => {
    const filas = [
      {
        codigoDocente: 'D1001',
        nombre: 'Profesor Ejemplo',
        correoInstitucional: 'profesor@unmsm.edu.pe',
        departamento: 'Sistemas',
      },
    ];

    const res = await importarDocentes(filas, mockPrisma as PrismaClient);

    expect(res.docentesProcesados).toBe(1);
    expect(res.cuentasCreadas).toBe(1);
    expect(res.clavesIniciales).toBeDefined();
    expect(res.clavesIniciales).toHaveLength(1);

    const credencial = res.clavesIniciales![0];
    expect(credencial.codigo).toBe('D1001');
    expect(credencial.rol).toBe(RolCuenta.DOCENTE);
    expect(credencial.claveInicial).not.toBe('D1001');
    expect(credencial.claveInicial.length).toBeGreaterThanOrEqual(8);

    const cuentaCreadaCall = mockPrisma.cuenta.create.mock.calls[0][0];
    expect(cuentaCreadaCall.data.usuarioLogin).toBe('D1001');
    expect(cuentaCreadaCall.data.debeCambiarClave).toBe(true);
    expect(cuentaCreadaCall.data.claveHash).not.toBe(credencial.claveInicial);

    const coincideHash = await bcrypt.compare(
      credencial.claveInicial,
      cuentaCreadaCall.data.claveHash,
    );
    expect(coincideHash).toBe(true);
  });
});
