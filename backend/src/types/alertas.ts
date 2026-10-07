import { TipoAlerta } from '@prisma/client';

/** Asignación vigente que quedó incompatible o sin capacidad tras un cambio en un espacio. */
export interface AsignacionAfectadaDTO {
  asignacionId: string;
  seccionId: string;
  codigoCurso: string;
  nombreCurso: string;
  codigoSeccion: string;
  /** Detalle específico del problema para esta asignación (software faltante, déficit de aforo). */
  detalle: string;
}

/** Cambio de capacidad de un espacio a evaluar (Issue 4.4). Solo se informa lo que cambió. */
export interface CambioCapacidad {
  /** Nuevo conteo de PCs malogradas (solo aplica a laboratorios). */
  pcsMalogradas?: number | null;
  /** Nuevo aforo nominal (aula o laboratorio). */
  aforoNominal?: number;
}

export interface EntradaAlerta {
  tipo: TipoAlerta;
  espacioId: string;
  motivo: string;
  asignacionIds: string[];
}

export interface AlertaRegistradaDTO {
  id: string;
  tipo: TipoAlerta;
  espacioId: string;
  motivo: string;
  asignacionesAfectadas: number;
  /** `false` cuando se actualizó una alerta pendiente idéntica en lugar de crear otra. */
  creada: boolean;
}
