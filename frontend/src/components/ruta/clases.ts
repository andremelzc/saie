import type { DiaSemana } from '../../types/consulta';
import type { CursoMatriculadoDTO } from '../../types/horario';
import { ABREVIATURA_DIA, diaDeFecha, formatearHora, minutosDeFecha } from '../../utils/horario';

type Proxima = NonNullable<CursoMatriculadoDTO['proximaSesion']>;

const SEMANA: DiaSemana[] = [
  'LUNES',
  'MARTES',
  'MIERCOLES',
  'JUEVES',
  'VIERNES',
  'SABADO',
  'DOMINGO',
];

const MINUTOS_POR_DIA = 24 * 60;

const aMinutos = (hora: string) => {
  const [h, m] = hora.split(':').map(Number);
  return h * 60 + (m || 0);
};

/**
 * Minutos desde `ahora` hasta que empieza la próxima sesión (0 si está en curso). Las sesiones
 * vienen con día de la semana y hora, no con fecha: se cuenta hacia delante dentro de la semana.
 */
export function minutosHastaSesion(proxima: Proxima, ahora: Date): number {
  const hoy = SEMANA.indexOf(diaDeFecha(ahora));
  const dia = SEMANA.indexOf(proxima.diaSemana);
  const ahoraMin = minutosDeFecha(ahora);
  const inicio = aMinutos(proxima.horaInicio);
  const fin = aMinutos(proxima.horaFin);
  const dias = (dia - hoy + 7) % 7;
  if (dias === 0 && ahoraMin >= inicio && ahoraMin < fin) return 0;
  const minutos = dias * MINUTOS_POR_DIA + inicio - ahoraMin;
  return minutos >= 0 ? minutos : minutos + 7 * MINUTOS_POR_DIA;
}

/** «En curso», «Hoy 14:00», «Mañana 08:00» o «Mié 10:00». */
export function etiquetaDeProxima(proxima: Proxima, ahora: Date): string {
  const hora = formatearHora(proxima.horaInicio);
  if (minutosHastaSesion(proxima, ahora) === 0) return 'En curso ahora';
  const hoy = SEMANA.indexOf(diaDeFecha(ahora));
  const dias = (SEMANA.indexOf(proxima.diaSemana) - hoy + 7) % 7;
  if (dias === 0) return `Hoy ${hora}`;
  if (dias === 1) return `Mañana ${hora}`;
  return `${ABREVIATURA_DIA[proxima.diaSemana]} ${hora}`;
}

/**
 * Las clases ordenadas por cuándo toca la siguiente sesión; las que no tienen, al final y en el
 * orden en que llegaron.
 */
export function ordenarPorProxima(
  cursos: CursoMatriculadoDTO[],
  ahora: Date,
): CursoMatriculadoDTO[] {
  const minutos = (c: CursoMatriculadoDTO) =>
    c.proximaSesion ? minutosHastaSesion(c.proximaSesion, ahora) : Number.MAX_SAFE_INTEGER;
  return [...cursos].sort((a, b) => minutos(a) - minutos(b));
}
