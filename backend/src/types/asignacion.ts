import { DiaSemana, EstadoAsignacion, TipoEspacio } from '@prisma/client';
import { BloqueCandidato, EspacioConexo } from '../rules/buscarBloqueContiguo';
import { HorarioSlot } from '../services/disponibilidad.service';
import { AsignacionParalelaUbicacion } from '../rules/cercaniaParalelas';

export enum MotivoEscalamientoTipo {
  CAPACIDAD_INSUFICIENTE = 'CAPACIDAD_INSUFICIENTE',
  SOFTWARE_FALTANTE = 'SOFTWARE_FALTANTE',
  HORARIO_BLOQUEADO = 'HORARIO_BLOQUEADO',
  CONTIGUEDAD_NO_ALCANZADA = 'CONTIGUEDAD_NO_ALCANZADA',
  SIN_ESPACIOS_DISPONIBLES = 'SIN_ESPACIOS_DISPONIBLES',
  SIN_HORARIOS_DEFINIDOS = 'SIN_HORARIOS_DEFINIDOS',
}

export interface DetalleEscalamiento {
  tipo: MotivoEscalamientoTipo;
  descripcion: string;
  detallesTecnicos?: Record<string, any>;
}

export interface SeccionInputMotor {
  id: string;
  cursoId: string;
  codigoCurso?: string;
  nombreCurso?: string;
  codigoSeccion: string;
  periodo: string;
  tipoEspacioRequerido: TipoEspacio;
  stackSoftwareRequerido?: string[];
  alumnosMatriculados: number;
  movilidadReducida?: boolean;
  horarios: HorarioSlot[];
}

export interface ResultadoOrquestacion {
  seccionId: string;
  codigoSeccion: string;
  cursoId: string;
  estado: EstadoAsignacion;
  bloqueAsignado?: BloqueCandidato;
  espacioIds: string[];
  motivoEscalamiento?: string;
  detalleEscalamiento?: DetalleEscalamiento;
  puntajeCercania?: number;
  fallbackPiso1Aplicado?: boolean;
  motivoFallbackPiso1?: string;
  huellaEntrada: string;
  conservadaPorIdempotencia?: boolean;
}

export interface ResumenConteoEspacio {
  total: number;
  asignadas: number;
  escaladas: number;
  conservadas: number;
}

export interface ResultadoCorridaBatch {
  corridaId: string;
  periodo: string;
  fechaEjecucion: Date;
  totalSecciones: number;
  asignadas: number;
  escaladas: number;
  conservadas: number;
  desglosePorTipoEspacio: Record<TipoEspacio, ResumenConteoEspacio>;
  resultados: ResultadoOrquestacion[];
}

export interface AsignacionExistenteContexto {
  id: string;
  seccionId: string;
  estado: EstadoAsignacion;
  espacioIds: string[];
  horarios: HorarioSlot[];
  huellaEntrada?: string | null;
  motivoEscalamiento?: string | null;
}
