import { TipoEspacio } from '@prisma/client';
import {
  agruparClases,
  encabezadoGrupo,
  etiquetaTipoClase,
  grupoDeSeccion,
  rotuloClase,
} from '../../../src/lib/clasesAgrupadas';

const clase = (
  codigoCurso: string,
  codigoSeccion: string,
  tipoEspacioRequerido: TipoEspacio,
  horaInicio: string,
  horaFin: string,
) => ({
  codigoCurso,
  nombreCurso: `Curso ${codigoCurso}`,
  codigoSeccion,
  tipoEspacioRequerido,
  horaInicio,
  horaFin,
});

describe('clasesAgrupadas (Issue 3.62)', () => {
  it('obtiene el grupo de la sección con o sin el sufijo -LAB', () => {
    expect(grupoDeSeccion('2')).toBe('2');
    expect(grupoDeSeccion('2-LAB')).toBe('2');
    expect(grupoDeSeccion('2-lab')).toBe('2');
    expect(grupoDeSeccion(' 10-LAB ')).toBe('10');
  });

  it('rotula el tipo de clase según el tipo de espacio requerido', () => {
    expect(etiquetaTipoClase(TipoEspacio.AULA_TEORICA)).toBe('Teoría');
    expect(etiquetaTipoClase(TipoEspacio.LABORATORIO)).toBe('Laboratorio');
    expect(
      rotuloClase({ codigoSeccion: '2-LAB', tipoEspacioRequerido: TipoEspacio.LABORATORIO }),
    ).toBe('Grupo 2 · Laboratorio');
  });

  it('junta teoría y laboratorio del mismo curso y grupo, en orden de hora', () => {
    const grupos = agruparClases([
      clase('202SW0805', '2-LAB', TipoEspacio.LABORATORIO, '20:00', '22:00'),
      clase('202SW0101', '1', TipoEspacio.AULA_TEORICA, '08:00', '10:00'),
      clase('202SW0805', '2', TipoEspacio.AULA_TEORICA, '18:00', '20:00'),
    ]);

    expect(grupos.map((g) => `${g.codigoCurso}/${g.grupo}`)).toEqual([
      '202SW0101/1',
      '202SW0805/2',
    ]);
    expect(grupos[1].clases.map((c) => c.codigoSeccion)).toEqual(['2', '2-LAB']);
    expect(encabezadoGrupo(grupos[1])).toBe('202SW0805 - Curso 202SW0805 (Grupo 2)');
  });

  it('no mezcla grupos distintos del mismo curso', () => {
    const grupos = agruparClases([
      clase('202SW0805', '1', TipoEspacio.AULA_TEORICA, '08:00', '10:00'),
      clase('202SW0805', '2', TipoEspacio.AULA_TEORICA, '08:00', '10:00'),
    ]);
    expect(grupos.map((g) => g.grupo)).toEqual(['1', '2']);
  });
});
