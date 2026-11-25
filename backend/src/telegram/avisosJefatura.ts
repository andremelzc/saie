import { PrioridadIncidencia, PrismaClient, TipoAlerta, TipoIncidencia } from '@prisma/client';
import { AlertaCreadaEvento, IncidenciaRegistradaEvento } from '../events/tipos';
import { logger } from '../lib/logger';
import { ClienteTelegram } from './cliente';
import { ColaEnvios, colaEnvios } from './cola';
import { enviarConReintentos } from './notificador';

/**
 * Issue 4.60: avisos inmediatos a Jefatura de Laboratorios por Telegram.
 *
 * Las cuentas de Jefatura no se vinculan con Telegram como los alumnos: el destino es uno o
 * varios chats configurados en `TELEGRAM_CHAT_JEFATURA` (por ejemplo, el grupo de Jefatura),
 * separados por comas. Sin esa variable no se avisa y el sistema funciona igual.
 */

const TIPO_INCIDENCIA: Record<TipoIncidencia, string> = {
  EQUIPO_NO_OPERATIVO: 'Equipo no operativo',
  SOFTWARE_FALTANTE: 'Software faltante',
  OTRO: 'Otro',
};

const TIPO_ALERTA: Record<TipoAlerta, string> = {
  SOFTWARE: 'software',
  CAPACIDAD: 'capacidad',
  ACCESIBILIDAD: 'accesibilidad',
};

/** La descripción de una incidencia puede ser larga: en el aviso basta el comienzo. */
const MAX_DESCRIPCION = 200;

const UUID = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi;

export interface DependenciasAvisoJefatura {
  prisma: Pick<PrismaClient, 'incidencia' | 'espacio'>;
  cliente: ClienteTelegram;
  chats: string[];
  cola?: ColaEnvios;
  esperar?: (ms: number) => Promise<void>;
}

export interface ResumenAvisoJefatura {
  destinatarios: number;
  enviados: number;
  fallidos: number;
}

/** Lee `TELEGRAM_CHAT_JEFATURA` («-100123,-100456») y descarta los valores vacíos. */
export function chatsDeJefatura(valor = process.env.TELEGRAM_CHAT_JEFATURA): string[] {
  return (valor ?? '')
    .split(',')
    .map((chat) => chat.trim())
    .filter(Boolean);
}

function recortar(texto: string): string {
  const limpio = texto.replace(/\s+/g, ' ').trim();
  return limpio.length > MAX_DESCRIPCION ? `${limpio.slice(0, MAX_DESCRIPCION - 1)}…` : limpio;
}

export interface DatosAvisoIncidencia {
  identificadorSeguimiento: string;
  tipo: TipoIncidencia;
  descripcion: string;
  espacio: string;
  curso: string;
  seccion: string;
}

/** Texto del aviso de una incidencia de prioridad alta. */
export function formatearAvisoIncidencia(datos: DatosAvisoIncidencia): string {
  return [
    'Incidencia de prioridad alta',
    '',
    `Código: ${datos.identificadorSeguimiento}`,
    `Tipo: ${TIPO_INCIDENCIA[datos.tipo]}`,
    `Espacio: ${datos.espacio}`,
    `Clase: ${datos.curso} - Sección ${datos.seccion}`,
    `Descripción: ${recortar(datos.descripcion)}`,
    '',
    'Revísala en SAIE, en Incidencias.',
  ].join('\n');
}

/** Texto del aviso de una alerta nueva. El motivo ya es una frase; se le quitan los UUID. */
export function formatearAvisoAlerta(
  evento: Pick<AlertaCreadaEvento, 'tipo' | 'motivo' | 'asignacionesAfectadas'>,
  espacio: string,
): string {
  const motivo = evento.motivo
    .replace(UUID, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
  const afectadas =
    evento.asignacionesAfectadas === 1
      ? '1 sección afectada'
      : `${evento.asignacionesAfectadas} secciones afectadas`;
  return [
    `Nueva alerta de ${TIPO_ALERTA[evento.tipo]}`,
    '',
    `Espacio: ${espacio}`,
    `Motivo: ${motivo}`,
    `Afecta a: ${afectadas}`,
    '',
    'Revísala en SAIE, en Alertas.',
  ].join('\n');
}

/** Envía el texto a cada chat de Jefatura. Un fallo en un chat no impide los demás. */
export async function enviarAJefatura(
  texto: string,
  { cliente, chats, cola = colaEnvios, esperar }: Omit<DependenciasAvisoJefatura, 'prisma'>,
): Promise<ResumenAvisoJefatura> {
  const resumen: ResumenAvisoJefatura = { destinatarios: chats.length, enviados: 0, fallidos: 0 };
  for (const chat of chats) {
    const resultado = await enviarConReintentos(cliente, chat, texto, cola, esperar);
    if (resultado === 'ENVIADO') {
      resumen.enviados++;
    } else {
      resumen.fallidos++;
      // Nunca se registra el chat: identifica a un grupo o a una persona.
      logger.error({ resultado }, 'No se pudo avisar a Jefatura por Telegram');
    }
  }
  return resumen;
}

/** Manejador de `incidencia.registrada`: solo las de prioridad alta generan aviso. */
export async function avisarIncidenciaAJefatura(
  evento: IncidenciaRegistradaEvento,
  deps: DependenciasAvisoJefatura,
): Promise<ResumenAvisoJefatura | null> {
  if (evento.prioridad !== PrioridadIncidencia.ALTA || deps.chats.length === 0) return null;

  const incidencia = await deps.prisma.incidencia.findUnique({
    where: { id: evento.incidenciaId },
    include: {
      espacio: { select: { identificador: true } },
      asignacion: { select: { seccion: { select: { codigoSeccion: true, curso: true } } } },
    },
  });
  if (!incidencia) return null;

  const texto = formatearAvisoIncidencia({
    identificadorSeguimiento: incidencia.identificadorSeguimiento,
    tipo: incidencia.tipo,
    descripcion: incidencia.descripcion,
    espacio: incidencia.espacio.identificador,
    curso: `${incidencia.asignacion.seccion.curso.codigo} ${incidencia.asignacion.seccion.curso.nombre}`,
    seccion: incidencia.asignacion.seccion.codigoSeccion,
  });
  return enviarAJefatura(texto, deps);
}

/**
 * Manejador de `alerta.creada`: avisa de las alertas de los laboratorios (software y capacidad).
 * Las de accesibilidad son de Coordinación y hablan de alumnos con movilidad reducida, un dato de
 * salud que no sale por Telegram (RNF-11).
 */
export async function avisarAlertaAJefatura(
  evento: AlertaCreadaEvento,
  deps: DependenciasAvisoJefatura,
): Promise<ResumenAvisoJefatura | null> {
  if (evento.tipo === TipoAlerta.ACCESIBILIDAD || deps.chats.length === 0) return null;

  const espacio = await deps.prisma.espacio.findUnique({
    where: { id: evento.espacioId },
    select: { identificador: true },
  });
  return enviarAJefatura(
    formatearAvisoAlerta(evento, espacio?.identificador ?? 'sin espacio'),
    deps,
  );
}
