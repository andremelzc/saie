import { EstadoAlerta, Prisma, TipoAlerta } from '@prisma/client';
import { AlertaRegistradaDTO, AsignacionAfectadaDTO, EntradaAlerta } from '../types/alertas';

type Db = Prisma.TransactionClient;

function mismoConjunto(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  const setA = new Set(a);
  return b.every((id) => setA.has(id));
}

/**
 * Issue 4.5: mecanismo único de persistencia para alertas de software y de capacidad.
 *
 * - Sin asignaciones afectadas no se crea nada (devuelve `null`).
 * - Si ya existe una alerta PENDIENTE idéntica (mismo espacio, tipo y mismo conjunto de
 *   asignaciones afectadas) se actualiza su motivo y fecha de detección en lugar de duplicarla.
 * - Una alerta puede afectar a varias asignaciones.
 */
export async function registrarAlerta(
  entrada: EntradaAlerta,
  db: Db,
): Promise<AlertaRegistradaDTO | null> {
  const asignacionIds = [...new Set(entrada.asignacionIds)];
  if (asignacionIds.length === 0) {
    return null;
  }

  const pendientes = await db.alerta.findMany({
    where: {
      espacioId: entrada.espacioId,
      tipo: entrada.tipo,
      estado: EstadoAlerta.PENDIENTE,
    },
    include: { asignacionesAfectadas: true },
  });

  const identica = pendientes.find((p) =>
    mismoConjunto(
      p.asignacionesAfectadas.map((x) => x.asignacionId),
      asignacionIds,
    ),
  );

  if (identica) {
    const actualizada = await db.alerta.update({
      where: { id: identica.id },
      data: { motivo: entrada.motivo, fechaDeteccion: new Date() },
    });
    return {
      id: actualizada.id,
      tipo: actualizada.tipo,
      espacioId: actualizada.espacioId,
      motivo: actualizada.motivo,
      asignacionesAfectadas: asignacionIds.length,
      creada: false,
    };
  }

  const creada = await db.alerta.create({
    data: {
      tipo: entrada.tipo,
      espacioId: entrada.espacioId,
      motivo: entrada.motivo,
      estado: EstadoAlerta.PENDIENTE,
      asignacionesAfectadas: {
        create: asignacionIds.map((asignacionId) => ({ asignacionId })),
      },
    },
  });

  return {
    id: creada.id,
    tipo: creada.tipo,
    espacioId: creada.espacioId,
    motivo: creada.motivo,
    asignacionesAfectadas: asignacionIds.length,
    creada: true,
  };
}

/**
 * Convierte el resultado de una detección (Issue 4.3 o 4.4) en una alerta persistida,
 * con un motivo que nombra los cursos y grupos afectados.
 */
export async function registrarAlertaDesdeDeteccion(
  tipo: TipoAlerta,
  espacioId: string,
  identificadorEspacio: string,
  afectadas: AsignacionAfectadaDTO[],
  db: Db,
): Promise<AlertaRegistradaDTO | null> {
  if (afectadas.length === 0) {
    return null;
  }

  const etiqueta = tipo === 'SOFTWARE' ? 'Software incompatible' : 'Capacidad insuficiente';
  const detalle = afectadas
    .map((a) => `${a.codigoCurso} sec. ${a.codigoSeccion} (${a.detalle})`)
    .join('; ');

  return registrarAlerta(
    {
      tipo,
      espacioId,
      motivo: `${etiqueta} en ${identificadorEspacio}: ${detalle}`,
      asignacionIds: afectadas.map((a) => a.asignacionId),
    },
    db,
  );
}
