import { EstadoAsignacion, TipoEspacio } from '@prisma/client';
import { EspacioConexo } from './buscarBloqueContiguo';
import { calcularCapacidadReal } from './calcularCapacidadReal';
import { validarSoftwareLaboratorio } from './validarSoftware';
import { haySolapamientoHorario, HorarioSlot } from '../services/disponibilidad.service';
import { SoftwareRequeridoInput } from '../types/software';

/** Reglas duras que el verificador comprueba al cerrar una corrida (Issue 2.17). */
export const REGLAS_VERIFICACION = {
  DOBLE_RESERVA: 'DOBLE_RESERVA',
  CAPACIDAD_SUFICIENTE: 'CAPACIDAD_SUFICIENTE',
  TIPO_HOMOGENEO: 'TIPO_HOMOGENEO',
  BLOQUE_CONTIGUO: 'BLOQUE_CONTIGUO',
  SOFTWARE_COMPLETO: 'SOFTWARE_COMPLETO',
  ESCALADA_CON_MOTIVO: 'ESCALADA_CON_MOTIVO',
  UNA_VIGENTE_POR_SECCION: 'UNA_VIGENTE_POR_SECCION',
} as const;

export type ReglaVerificacion = (typeof REGLAS_VERIFICACION)[keyof typeof REGLAS_VERIFICACION];

const DESCRIPCIONES: Record<ReglaVerificacion, string> = {
  DOBLE_RESERVA:
    'Ningún espacio alberga dos asignaciones vigentes con horarios solapados (0 dobles reservas).',
  CAPACIDAD_SUFICIENTE:
    'La capacidad real del bloque asignado cubre a todos los alumnos matriculados.',
  TIPO_HOMOGENEO:
    'El bloque asignado usa un único tipo de espacio y coincide con el requerido por la sección.',
  BLOQUE_CONTIGUO:
    'El bloque asignado es contiguo: todos sus espacios son alcanzables por vecindad, en el mismo piso y pabellón.',
  SOFTWARE_COMPLETO:
    'Cada laboratorio del bloque tiene instalado todo el software requerido por la sección.',
  ESCALADA_CON_MOTIVO: 'Toda sección escalada declara el motivo del escalamiento.',
  UNA_VIGENTE_POR_SECCION: 'Cada sección tiene como máximo una asignación vigente.',
};

/** Orden estable en que se devuelven las reglas, para una salida determinista. */
const ORDEN_REGLAS: ReglaVerificacion[] = [
  REGLAS_VERIFICACION.DOBLE_RESERVA,
  REGLAS_VERIFICACION.CAPACIDAD_SUFICIENTE,
  REGLAS_VERIFICACION.TIPO_HOMOGENEO,
  REGLAS_VERIFICACION.BLOQUE_CONTIGUO,
  REGLAS_VERIFICACION.SOFTWARE_COMPLETO,
  REGLAS_VERIFICACION.ESCALADA_CON_MOTIVO,
  REGLAS_VERIFICACION.UNA_VIGENTE_POR_SECCION,
];

export interface AsignacionVerificable {
  id: string;
  seccionId: string;
  codigoSeccion: string;
  estado: EstadoAsignacion;
  espacioIds: string[];
  motivoEscalamiento?: string | null;
  alumnosMatriculados: number;
  tipoEspacioRequerido: TipoEspacio;
  /** Stack exigido por la sección, ya resuelto contra el catálogo (Issue 4.28). */
  softwareRequerido?: SoftwareRequeridoInput[] | null;
  horarios: HorarioSlot[];
}

export interface ViolacionVerificacion {
  regla: ReglaVerificacion;
  asignacionId: string;
  seccionId: string;
  codigoSeccion: string;
  detalle: string;
}

export interface ResultadoReglaVerificacion {
  regla: ReglaVerificacion;
  descripcion: string;
  /** Asignaciones evaluadas por esta regla (las que no aplican no se cuentan). */
  revisadas: number;
  /** Asignaciones evaluadas que no presentan ninguna violación de esta regla. */
  cumplen: number;
  violaciones: ViolacionVerificacion[];
}

export interface ResultadoVerificacion {
  /** `true` si ninguna regla reportó violaciones. */
  conforme: boolean;
  totalRevisadas: number;
  totalViolaciones: number;
  reglas: ResultadoReglaVerificacion[];
}

export interface VerificarCorridaInput {
  asignaciones: AsignacionVerificable[];
  espacios: EspacioConexo[];
  obtenerVecinosContiguos: (espacioId: string) => string[];
}

interface AcumuladorRegla {
  regla: ReglaVerificacion;
  descripcion: string;
  revisadas: Set<string>;
  violaciones: ViolacionVerificacion[];
}

function crearAcumulador(regla: ReglaVerificacion): AcumuladorRegla {
  return {
    regla,
    descripcion: DESCRIPCIONES[regla],
    revisadas: new Set<string>(),
    violaciones: [],
  };
}

function registrarViolacion(
  acumulador: AcumuladorRegla,
  asignacion: AsignacionVerificable,
  detalle: string,
): void {
  acumulador.revisadas.add(asignacion.id);
  acumulador.violaciones.push({
    regla: acumulador.regla,
    asignacionId: asignacion.id,
    seccionId: asignacion.seccionId,
    codigoSeccion: asignacion.codigoSeccion,
    detalle,
  });
}

/** Determina si un conjunto de espacios forma un bloque conexo en el mismo piso y pabellón. */
function bloqueEsContiguo(
  espacioIds: string[],
  mapaEspacios: Map<string, EspacioConexo>,
  obtenerVecinosContiguos: (espacioId: string) => string[],
): boolean {
  if (espacioIds.length <= 1) {
    return true;
  }

  const conjunto = new Set(espacioIds);
  const primero = mapaEspacios.get(espacioIds[0]);
  if (!primero) {
    return false;
  }

  const visitados = new Set<string>();
  const cola = [espacioIds[0]];

  while (cola.length > 0) {
    const actual = cola.shift()!;
    if (visitados.has(actual)) {
      continue;
    }
    visitados.add(actual);

    for (const vecinoId of obtenerVecinosContiguos(actual)) {
      if (!conjunto.has(vecinoId) || visitados.has(vecinoId)) {
        continue;
      }
      const vecino = mapaEspacios.get(vecinoId);
      // La contigüidad solo vale dentro del mismo piso y pabellón (el grafo ya separa por tipo).
      if (!vecino || vecino.piso !== primero.piso || vecino.pabellon !== primero.pabellon) {
        continue;
      }
      cola.push(vecinoId);
    }
  }

  return visitados.size === espacioIds.length;
}

/** Software requerido que falta en al menos un laboratorio del bloque. */
function softwareFaltanteEnBloque(
  asignacion: AsignacionVerificable,
  mapaEspacios: Map<string, EspacioConexo>,
): string[] {
  const requerido = asignacion.softwareRequerido ?? [];
  if (requerido.length === 0) {
    return [];
  }

  const faltantes: string[] = [];
  for (const espacioId of asignacion.espacioIds) {
    const espacio = mapaEspacios.get(espacioId);
    if (!espacio) {
      faltantes.push(`espacio ${espacioId} inexistente`);
      continue;
    }
    const resultado = validarSoftwareLaboratorio(espacio.softwareInstalado, requerido);
    if (!resultado.cumple) {
      faltantes.push(`${espacio.identificador}: falta ${resultado.softwareFaltante.join(', ')}`);
    }
  }
  return faltantes;
}

/**
 * Issue 2.17: Verifica las asignaciones VIGENTE y ESCALADA contra las reglas duras del motor.
 *
 * Es una función pura: no accede a la base de datos. Quien la invoca (el servicio del Issue 2.17)
 * arma las entradas cargando el estado persistido tras la corrida. Devuelve, por regla, cuántas
 * asignaciones se revisaron, cuántas cumplen y la lista de violaciones halladas.
 */
export function verificarCorrida(input: VerificarCorridaInput): ResultadoVerificacion {
  const { asignaciones, espacios, obtenerVecinosContiguos } = input;
  const mapaEspacios = new Map(espacios.map((e) => [e.id, e]));

  // Solo se verifican las asignaciones que reservan o esperan un espacio.
  const revisables = asignaciones.filter(
    (a) => a.estado === EstadoAsignacion.VIGENTE || a.estado === EstadoAsignacion.ESCALADA,
  );
  const vigentes = revisables.filter((a) => a.estado === EstadoAsignacion.VIGENTE);
  const escaladas = revisables.filter((a) => a.estado === EstadoAsignacion.ESCALADA);

  const acumuladores = new Map<ReglaVerificacion, AcumuladorRegla>(
    ORDEN_REGLAS.map((regla) => [regla, crearAcumulador(regla)]),
  );
  const dobleReserva = acumuladores.get(REGLAS_VERIFICACION.DOBLE_RESERVA)!;
  const capacidad = acumuladores.get(REGLAS_VERIFICACION.CAPACIDAD_SUFICIENTE)!;
  const tipo = acumuladores.get(REGLAS_VERIFICACION.TIPO_HOMOGENEO)!;
  const contiguo = acumuladores.get(REGLAS_VERIFICACION.BLOQUE_CONTIGUO)!;
  const software = acumuladores.get(REGLAS_VERIFICACION.SOFTWARE_COMPLETO)!;
  const escalada = acumuladores.get(REGLAS_VERIFICACION.ESCALADA_CON_MOTIVO)!;
  const unica = acumuladores.get(REGLAS_VERIFICACION.UNA_VIGENTE_POR_SECCION)!;

  // 1) Doble reserva: mismo espacio con horarios solapados en dos asignaciones vigentes distintas.
  for (const asignacion of vigentes) {
    dobleReserva.revisadas.add(asignacion.id);
  }
  for (let i = 0; i < vigentes.length; i++) {
    for (let j = i + 1; j < vigentes.length; j++) {
      const a = vigentes[i];
      const b = vigentes[j];
      // Dos vigentes de la misma sección no son una doble reserva: lo cubre UNA_VIGENTE_POR_SECCION.
      if (a.seccionId === b.seccionId) {
        continue;
      }
      const compartidos = a.espacioIds.filter((id) => b.espacioIds.includes(id));
      if (compartidos.length === 0) {
        continue;
      }
      const solapan = a.horarios.some((h) => b.horarios.some((g) => haySolapamientoHorario(h, g)));
      if (!solapan) {
        continue;
      }
      const lista = compartidos.join(', ');
      registrarViolacion(
        dobleReserva,
        a,
        `Comparte el espacio [${lista}] con la sección ${b.codigoSeccion} en horarios solapados.`,
      );
      registrarViolacion(
        dobleReserva,
        b,
        `Comparte el espacio [${lista}] con la sección ${a.codigoSeccion} en horarios solapados.`,
      );
    }
  }

  // 2) Capacidad real del bloque >= alumnos matriculados.
  for (const asignacion of vigentes) {
    capacidad.revisadas.add(asignacion.id);
    const capacidadReal = asignacion.espacioIds.reduce((total, espacioId) => {
      const espacio = mapaEspacios.get(espacioId);
      return total + (espacio ? calcularCapacidadReal(espacio) : 0);
    }, 0);
    if (capacidadReal < asignacion.alumnosMatriculados) {
      registrarViolacion(
        capacidad,
        asignacion,
        `Capacidad real ${capacidadReal} < ${asignacion.alumnosMatriculados} matriculados.`,
      );
    }
  }

  // 3) Tipo de espacio homogéneo y coincidente con el requerido.
  for (const asignacion of vigentes) {
    tipo.revisadas.add(asignacion.id);
    if (asignacion.espacioIds.length === 0) {
      registrarViolacion(tipo, asignacion, 'La asignación vigente no tiene espacios.');
      continue;
    }
    const tipos = new Set(
      asignacion.espacioIds.map((espacioId) => mapaEspacios.get(espacioId)?.tipo),
    );
    if (tipos.size !== 1) {
      registrarViolacion(
        tipo,
        asignacion,
        'El bloque mezcla tipos de espacio o referencia uno inexistente.',
      );
      continue;
    }
    const tipoUnico = [...tipos][0];
    if (tipoUnico !== asignacion.tipoEspacioRequerido) {
      registrarViolacion(
        tipo,
        asignacion,
        `El bloque es de tipo ${tipoUnico} y la sección requiere ${asignacion.tipoEspacioRequerido}.`,
      );
    }
  }

  // 4) Bloque contiguo.
  for (const asignacion of vigentes) {
    contiguo.revisadas.add(asignacion.id);
    if (!bloqueEsContiguo(asignacion.espacioIds, mapaEspacios, obtenerVecinosContiguos)) {
      registrarViolacion(contiguo, asignacion, 'El bloque asignado no es contiguo.');
    }
  }

  // 5) Stack de software completo en los laboratorios (las aulas teóricas no lo requieren).
  for (const asignacion of vigentes) {
    if (asignacion.tipoEspacioRequerido !== TipoEspacio.LABORATORIO) {
      continue;
    }
    software.revisadas.add(asignacion.id);
    const faltantes = softwareFaltanteEnBloque(asignacion, mapaEspacios);
    if (faltantes.length > 0) {
      registrarViolacion(software, asignacion, `Software faltante: ${faltantes.join('; ')}.`);
    }
  }

  // 6) Toda sección escalada declara su motivo.
  for (const asignacion of escaladas) {
    escalada.revisadas.add(asignacion.id);
    if (!asignacion.motivoEscalamiento || asignacion.motivoEscalamiento.trim() === '') {
      registrarViolacion(escalada, asignacion, 'La sección ESCALADA no declara motivo.');
    }
  }

  // 7) Una sola asignación vigente por sección.
  const vigentesPorSeccion = new Map<string, number>();
  for (const asignacion of vigentes) {
    vigentesPorSeccion.set(
      asignacion.seccionId,
      (vigentesPorSeccion.get(asignacion.seccionId) ?? 0) + 1,
    );
  }
  for (const asignacion of revisables) {
    unica.revisadas.add(asignacion.id);
    const total = vigentesPorSeccion.get(asignacion.seccionId) ?? 0;
    if (total > 1 && asignacion.estado === EstadoAsignacion.VIGENTE) {
      registrarViolacion(
        unica,
        asignacion,
        `La sección ${asignacion.codigoSeccion} tiene ${total} asignaciones vigentes.`,
      );
    }
  }

  const reglas: ResultadoReglaVerificacion[] = ORDEN_REGLAS.map((regla) => {
    const acumulador = acumuladores.get(regla)!;
    const conViolacion = new Set(acumulador.violaciones.map((v) => v.asignacionId));
    return {
      regla: acumulador.regla,
      descripcion: acumulador.descripcion,
      revisadas: acumulador.revisadas.size,
      cumplen: acumulador.revisadas.size - conViolacion.size,
      violaciones: acumulador.violaciones,
    };
  });

  const totalViolaciones = reglas.reduce((total, r) => total + r.violaciones.length, 0);

  return {
    conforme: totalViolaciones === 0,
    totalRevisadas: revisables.length,
    totalViolaciones,
    reglas,
  };
}
