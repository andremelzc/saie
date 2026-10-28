import {
  EstadoAlerta,
  Prisma,
  PrismaClient,
  RolCuenta,
  TipoAlerta,
  TipoEventoAuditoria,
} from '@prisma/client';
import { HttpError } from '../lib/http';
import {
  AlertaDTO,
  AlertaRegistradaDTO,
  AsignacionAfectadaDTO,
  EntradaAlerta,
  FiltrosAlertas,
} from '../types/alertas';
import { TokenPayload } from '../types/auth';
import { verificarAccesoEspacio } from './acceso.service';

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

const INCLUIR_ALERTA = {
  espacio: true,
  asignacionesAfectadas: {
    include: { asignacion: { include: { seccion: { include: { curso: true } } } } },
  },
} satisfies Prisma.AlertaInclude;

type AlertaConDetalle = Prisma.AlertaGetPayload<{ include: typeof INCLUIR_ALERTA }>;

function aAlertaDTO(alerta: AlertaConDetalle): AlertaDTO {
  return {
    id: alerta.id,
    tipo: alerta.tipo,
    estado: alerta.estado,
    motivo: alerta.motivo,
    fechaDeteccion: alerta.fechaDeteccion,
    espacio: {
      id: alerta.espacio.id,
      identificador: alerta.espacio.identificador,
      pabellon: alerta.espacio.pabellon,
      piso: alerta.espacio.piso,
    },
    asignacionesAfectadas: alerta.asignacionesAfectadas
      .map((x) => ({
        asignacionId: x.asignacionId,
        codigoCurso: x.asignacion.seccion.curso.codigo,
        nombreCurso: x.asignacion.seccion.curso.nombre,
        codigoSeccion: x.asignacion.seccion.codigoSeccion,
      }))
      .sort(
        (a, b) =>
          a.codigoCurso.localeCompare(b.codigoCurso) ||
          a.codigoSeccion.localeCompare(b.codigoSeccion),
      ),
  };
}

/**
 * Issue 4.6: alertas activas (PENDIENTES), de la más reciente a la más antigua. Coordinación
 * ve todas; Jefatura solo las de los laboratorios que tiene a su cargo (EspacioResponsable).
 */
export async function listarAlertasActivas(
  filtros: FiltrosAlertas,
  auth: TokenPayload,
  db: Pick<PrismaClient, 'alerta'>,
): Promise<AlertaDTO[]> {
  const soloResponsable =
    auth.rol === RolCuenta.JEFATURA_LABORATORIOS
      ? { espacio: { responsables: { some: { cuentaId: auth.sub } } } }
      : {};

  const pagina = filtros.pagina ?? 1;
  const limite = filtros.limite ?? 50;

  const alertas = await db.alerta.findMany({
    where: {
      estado: EstadoAlerta.PENDIENTE,
      ...(filtros.tipo && { tipo: filtros.tipo }),
      ...(filtros.espacioId && { espacioId: filtros.espacioId }),
      ...soloResponsable,
    },
    include: INCLUIR_ALERTA,
    orderBy: { fechaDeteccion: 'desc' },
    skip: (pagina - 1) * limite,
    take: limite,
  });

  return alertas.map(aAlertaDTO);
}

/**
 * Issue 4.7: marca una alerta como resuelta y deja constancia en la auditoría. Jefatura solo
 * puede resolver las de sus laboratorios (403); una alerta ya resuelta responde 409.
 */
export async function resolverAlerta(
  alertaId: string,
  auth: TokenPayload,
  prisma: Pick<PrismaClient, '$transaction'>,
): Promise<AlertaDTO> {
  return prisma.$transaction(async (tx) => {
    const alerta = await tx.alerta.findUnique({ where: { id: alertaId } });
    if (!alerta) {
      throw new HttpError(404, `La alerta con ID '${alertaId}' no existe`);
    }

    await verificarAccesoEspacio(auth, alerta.espacioId, tx);

    if (alerta.estado === EstadoAlerta.RESUELTA) {
      throw new HttpError(409, 'La alerta ya fue resuelta');
    }

    const resuelta = await tx.alerta.update({
      where: { id: alerta.id },
      data: { estado: EstadoAlerta.RESUELTA },
      include: INCLUIR_ALERTA,
    });

    await tx.registroAuditoria.create({
      data: {
        tipoEvento: TipoEventoAuditoria.ALERTA,
        alertaId: alerta.id,
        detalle: `Alerta ${alerta.tipo} resuelta por la cuenta ${auth.sub}`,
      },
    });

    return aAlertaDTO(resuelta);
  });
}
