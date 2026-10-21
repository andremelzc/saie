import { ComparacionVersion, TipoEspacio } from '@prisma/client';
import { importarCursosYSecciones } from '../../../src/importers/cursosSecciones.importer';

/** Catálogo simulado: el importador resuelve cada nombre contra `(nombreNormalizado, version)`. */
const CATALOGO: Record<
  string,
  { id: string; nombre: string; nombreNormalizado: string; version: string }
> = {
  'python|3.11': {
    id: 'sw-python',
    nombre: 'Python',
    nombreNormalizado: 'python',
    version: '3.11',
  },
  'vs code|': { id: 'sw-vscode', nombre: 'VS Code', nombreNormalizado: 'vs code', version: '' },
};

function buscarEnCatalogo(nombreNormalizado: string, version: string) {
  return CATALOGO[`${nombreNormalizado}|${version}`] ?? null;
}

describe('Importador de Cursos y Secciones (Issue 1.3 / 4.28)', () => {
  let mockPrisma: any;

  beforeEach(() => {
    mockPrisma = {
      curso: {
        upsert: jest
          .fn()
          .mockImplementation(({ where, create }) =>
            Promise.resolve({ id: 'curso-123', ...create }),
          ),
      },
      seccion: {
        upsert: jest
          .fn()
          .mockImplementation(({ create }) => Promise.resolve({ id: 'seccion-123', ...create })),
      },
      software: {
        findUnique: jest
          .fn()
          .mockImplementation(({ where }) =>
            Promise.resolve(
              buscarEnCatalogo(
                where.nombreNormalizado_version.nombreNormalizado,
                where.nombreNormalizado_version.version,
              ),
            ),
          ),
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

    // Los textos se convierten en relaciones del catálogo: EXACTA si hay versión, CUALQUIERA si no.
    const seccionLab = mockPrisma.seccion.upsert.mock.calls[0][0];
    expect(seccionLab.create.softwareRequerido.create).toEqual([
      { softwareId: 'sw-python', comparacionVersion: ComparacionVersion.EXACTA },
      { softwareId: 'sw-vscode', comparacionVersion: ComparacionVersion.CUALQUIERA },
    ]);
    expect(seccionLab.create).not.toHaveProperty('stackSoftwareRequerido');
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
          softwareRequerido: { create: [] },
        }),
      }),
    );
    expect(mockPrisma.software.findUnique).not.toHaveBeenCalled();
  });

  it('reporta SOFTWARE_NO_REGISTRADO y no crea la sección si el nombre no está en el catálogo', async () => {
    const datos = [
      {
        codigoCurso: '2020101',
        nombreCurso: 'Algorítmica I',
        codigoSeccion: 'S1',
        periodo: '2026-1',
        tipoEspacioRequerido: TipoEspacio.LABORATORIO,
        stackSoftwareRequerido: ['Python 3.11', 'Figma'],
      },
    ];

    const resultado = await importarCursosYSecciones(datos, mockPrisma);

    expect(resultado.seccionesProcesadas).toBe(0);
    expect(resultado.errores).toHaveLength(1);
    expect(resultado.errores[0]).toContain('SOFTWARE_NO_REGISTRADO');
    expect(resultado.errores[0]).toContain('Figma');
    expect(mockPrisma.curso.upsert).not.toHaveBeenCalled();
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

  it('debe capturar y registrar excepciones durante la inserción en base de datos', async () => {
    mockPrisma.curso.upsert.mockRejectedValue(new Error('Fallo de BD en curso'));

    const datos = [
      {
        codigoCurso: '2020999',
        nombreCurso: 'Curso Prueba',
        codigoSeccion: 'S1',
        periodo: '2026-1',
        tipoEspacioRequerido: TipoEspacio.AULA_TEORICA,
      },
    ];

    const resultado = await importarCursosYSecciones(datos, mockPrisma);

    expect(resultado.cursosProcesados).toBe(0);
    expect(resultado.errores).toHaveLength(1);
    expect(resultado.errores[0]).toContain('Fila 1 (2020999-S1): Fallo de BD en curso');
  });
});
