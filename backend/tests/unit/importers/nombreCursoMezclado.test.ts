import { TipoEspacio } from '@prisma/client';
import {
  CursoSeccionSchema,
  MENSAJE_NOMBRE_CURSO_MEZCLADO,
  nombreCursoMezclado,
} from '../../../src/importers/cursosSecciones.importer';

/** El nombre real de 202SW0302 en los datos: dos cursos pegados al extraer el PDF (R47). */
const NOMBRE_CORRUPTO =
  'ESTADÍSTICA Y PROBABILIDADES 4.0 1 -- 30 7 -- VIERNES 08:00 - 11:00 -- VIERNES 11:00 - 13:00 202SW0303 - FISICA ELÉCTRÓNICA';

const fila = (nombreCurso: string, codigoCurso = '202SW0302') => ({
  codigoCurso,
  nombreCurso,
  codigoSeccion: '1',
  periodo: '2026-2',
  tipoEspacioRequerido: TipoEspacio.AULA_TEORICA,
});

describe('nombreCursoMezclado (Issue 1.20)', () => {
  it('detecta el nombre corrupto real de 202SW0302', () => {
    expect(nombreCursoMezclado(NOMBRE_CORRUPTO, '202SW0302')).toBe(true);
  });

  it.each([
    ['una hora', 'Cálculo 08:00'],
    ['el separador --', 'Cálculo -- teoría'],
    ['el código de otro curso', 'Física Electrónica 202SW0303'],
  ])('rechaza un nombre con %s', (_motivo, nombre) => {
    expect(nombreCursoMezclado(nombre, '202SW0302')).toBe(true);
  });

  it('acepta un nombre que contiene su propio código, sin importar mayúsculas', () => {
    expect(nombreCursoMezclado('Estadística 202sw0302', '202SW0302')).toBe(false);
  });

  it.each([
    'ESTADÍSTICA Y PROBABILIDADES',
    'Física I',
    'Cálculo II',
    'Base de Datos 2',
    'C++ 2026',
  ])('acepta el nombre normal «%s»', (nombre) => {
    expect(nombreCursoMezclado(nombre, '202SW0302')).toBe(false);
  });
});

describe('CursoSeccionSchema rechaza nombres mezclados (Issue 1.20)', () => {
  it('marca el error en nombreCurso con un mensaje claro', () => {
    const resultado = CursoSeccionSchema.safeParse(fila(NOMBRE_CORRUPTO));
    expect(resultado.success).toBe(false);
    if (resultado.success) return;
    expect(resultado.error.issues).toEqual([
      expect.objectContaining({ path: ['nombreCurso'], message: MENSAJE_NOMBRE_CURSO_MEZCLADO }),
    ]);
  });

  it('acepta la fila con el nombre corregido', () => {
    expect(CursoSeccionSchema.safeParse(fila('ESTADÍSTICA Y PROBABILIDADES')).success).toBe(true);
  });
});
