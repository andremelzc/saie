import type { TonoBadge } from '../components/ui/BadgeEstado';
import type {
  CategoriaSoftware,
  EstadoSolicitud,
  SolicitudSoftwareDTO,
} from '../types/solicitudesSoftware';

export const ESTADO_SOLICITUD: Record<EstadoSolicitud, { etiqueta: string; tono: TonoBadge }> = {
  PENDIENTE: { etiqueta: 'Pendiente', tono: 'advertencia' },
  APROBADA: { etiqueta: 'Aprobada', tono: 'exito' },
  RECHAZADA: { etiqueta: 'Rechazada', tono: 'peligro' },
};

export const CATEGORIAS_SOFTWARE: { valor: CategoriaSoftware; etiqueta: string }[] = [
  { valor: 'SISTEMA_OPERATIVO', etiqueta: 'Sistema operativo' },
  { valor: 'IDE', etiqueta: 'Entorno de desarrollo (IDE)' },
  { valor: 'LENGUAJE', etiqueta: 'Lenguaje o compilador' },
  { valor: 'BASE_DATOS', etiqueta: 'Base de datos' },
  { valor: 'REDES', etiqueta: 'Redes' },
  { valor: 'SIMULACION', etiqueta: 'Simulación' },
  { valor: 'OFIMATICA', etiqueta: 'Ofimática' },
  { valor: 'OTRO', etiqueta: 'Otro' },
];

export function etiquetaCategoria(categoria: CategoriaSoftware | null): string {
  return CATEGORIAS_SOFTWARE.find((c) => c.valor === categoria)?.etiqueta ?? 'Sin categoría';
}

/** «Docker 24.0» o solo «Docker» si la solicitud no indica versión. */
export function nombreConVersion(solicitud: Pick<SolicitudSoftwareDTO, 'nombre' | 'version'>) {
  return solicitud.version ? `${solicitud.nombre} ${solicitud.version}` : solicitud.nombre;
}
