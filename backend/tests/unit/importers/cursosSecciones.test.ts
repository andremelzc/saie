import { TipoEspacio } from '@prisma/client';
import { importarCursosYSecciones } from '../../../src/importers/cursosSecciones.importer';

describe('Importador de Cursos y Secciones (Issue 1.3)', () => {
  let mockPrisma: any;

  beforeEach(() => {
    mockPrisma = {
      curso: {
        upsert: jest.fn().mockImplementation(({ where, create }) => Promise.resolve({ id: 'curso-123', ...create })),
      },
      seccion: {
        upsert: jest.fn().mockImplementation(({ create }) => Promise.resolve({ id: 'seccion-123', ...create })),
      },
    };
  });

  it('debe procesar exitosamente un listado válido de cursos y secciones', async () => {
    const datos = [
      {
        codigoCurso: '2020101',
        nombreCurso: 'Algorítmica I',
        codigoSeccion: 'S1',
        periodo: '2026-1',
        tipoEspacioRequerido: TipoEspacio.LABORATORIO,
        stackSoftwareRequerido: ['Python 3.11', 'VS Code'],
      },
      {
        codigoCurso: '2020102',
        nombreCurso: 'Matemática Discreta',
        codigoSeccion: 'S2',
        periodo: '2026-1',
        tipoEspacioRequerido: TipoEspacio.AULA_TEORICA,
      },
    ];

    const resultado = await importarCursosYSecciones(datos, mockPrisma);

    expect(resultado.cursosProcesados).toBe(2);
    expect(resultado.seccionesProcesadas).toBe(2);
    expect(resultado.errores).toHaveLength(0);
    expect(mockPrisma.curso.upsert).toHaveBeenCalledTimes(2);
    expect(mockPrisma.seccion.upsert).toHaveBeenCalledTimes(2);
  });

  it('debe omitir el stack de software cuando el tipo de espacio es AULA_TEORICA', async () => {
    const datos = [
      {
        codigoCurso: '2020102',
        nombreCurso: 'Matemática Discreta',
        codigoSeccion: 'S1',
        periodo: '2026-1',
        tipoEspacioRequerido: TipoEspacio.AULA_TEORICA,
        stackSoftwareRequerido: ['Ignorado'],
      },
    ];

    await importarCursosYSecciones(datos, mockPrisma);

    expect(mockPrisma.seccion.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({
          stackSoftwareRequerido: [],
        }),
      })
    );
  });

  it('debe retornar errores descriptivos ante filas con datos inválidos', async () => {
    const datos = [
      {
        codigoCurso: '', // Vacío -> Inválido
        nombreCurso: 'Algorítmica',
        codigoSeccion: 'S1',
        periodo: '2026-1',
        tipoEspacioRequerido: 'TIPO_INVALIDO',
      },
    ];

    const resultado = await importarCursosYSecciones(datos, mockPrisma);

    expect(resultado.cursosProcesados).toBe(0);
    expect(resultado.errores.length).toBeGreaterThan(0);
  });
});
