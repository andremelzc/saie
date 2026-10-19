import { EstadoAsignacion, PrismaClient, TipoEventoAuditoria } from '@prisma/client';
import {
  AsignacionVerificable,
  ResultadoVerificacion,
  verificarCorrida,
} from '../rules/verificadorCorrida';
import { cargarContextoEspacios } from './motor.service';

/**
 * Issue 2.17 — Verificación posterior a la corrida.
 *
 * Arma las entradas de la regla pura `verificarCorrida` a partir del estado persistido y la
 * registra en la auditoría. Se ejecuta sobre las asignaciones VIGENTE y ESCALADA del periodo
 * completo: así el modo por sección también detecta dobles reservas cruzadas con otras secciones.
 */
export async function verificarCorridaPeriodo(
  periodo: string,
  prisma: PrismaClient,
  corridaId?: string,
): Promise<ResultadoVerificacion> {
  const [contexto, asignacionesDb] = await Promise.all([
    cargarContextoEspacios(prisma),
    prisma.asignacion.findMany({
      where: {
        seccion: { periodo },
        estado: { in: [EstadoAsignacion.VIGENTE, EstadoAsignacion.ESCALADA] },
      },
      include: {
        espacios: true,
        seccion: { include: { horarios: true, matriculas: true } },
      },
    }),
  ]);

  const asignaciones: AsignacionVerificable[] = asignacionesDb.map((asignacion) => ({
    id: asignacion.id,
    seccionId: asignacion.seccionId,
    codigoSeccion: asignacion.seccion.codigoSeccion,
    estado: asignacion.estado,
    espacioIds: asignacion.espacios.map((e) => e.espacioId),
    motivoEscalamiento: asignacion.motivoEscalamiento,
    alumnosMatriculados: asignacion.seccion.matriculas.length,
    tipoEspacioRequerido: asignacion.seccion.tipoEspacioRequerido,
    stackSoftwareRequerido: asignacion.seccion.stackSoftwareRequerido,
    horarios: asignacion.seccion.horarios.map((h) => ({
      diaSemana: h.diaSemana,
      horaInicio: h.horaInicio,
      horaFin: h.horaFin,
    })),
  }));

  const verificacion = verificarCorrida({
    asignaciones,
    espacios: contexto.todosLosEspacios,
    obtenerVecinosContiguos: contexto.obtenerVecinos,
  });

  await registrarVerificacionEnAuditoria(verificacion, prisma, corridaId);

  return verificacion;
}

/**
 * Deja constancia del resultado en `registros_auditoria` con un único asiento por corrida, para
 * que la trazabilidad responda "¿cómo sabemos que la corrida quedó correcta?".
 */
async function registrarVerificacionEnAuditoria(
  verificacion: ResultadoVerificacion,
  prisma: PrismaClient,
  corridaId?: string,
): Promise<void> {
  const etiquetaCorrida = corridaId ? ` (corrida ${corridaId})` : '';
  const detalle = verificacion.conforme
    ? `Verificación conforme${etiquetaCorrida}: ${verificacion.totalRevisadas} asignaciones revisadas sin violaciones (Issue 2.17).`
    : `Verificación con ${verificacion.totalViolaciones} violación(es)${etiquetaCorrida} (Issue 2.17): ${verificacion.reglas
        .filter((r) => r.violaciones.length > 0)
        .map((r) => `${r.regla} (${r.violaciones.length})`)
        .join(', ')}.`;

  await prisma.registroAuditoria.create({
    data: {
      tipoEvento: TipoEventoAuditoria.VERIFICACION,
      detalle,
    },
  });
}
