import type { RegistroAuditoriaDTO } from '../types/admin';
import { describirMotivoEscalamiento } from './admin';
import { etiquetaReglaVerificacion } from './diccionarios';
import { formatearFechaCorta } from './fechas';
import { plural } from './texto';

/**
 * Issue 4.49 — frases legibles a partir del texto que deja el motor de asignación.
 *
 * El backend guarda en `detalle` (auditoría), `violacion.detalle` (verificador) y `alerta.motivo`
 * un texto pensado para soporte: UUID de espacios y corridas, códigos de reglas y comparaciones
 * como «30 < 35». Aquí se reconoce cada forma conocida y se reescribe en lenguaje llano, con el
 * aula y su ubicación en lugar del UUID. El texto crudo no se pierde: la pantalla lo muestra
 * solo bajo «Detalle técnico».
 *
 * Mientras el backend no envíe los campos estructurados (Issue 4.48), los UUID de espacios se
 * cruzan con el listado de espacios (`obtenerEspacios`).
 */

/** Lo mínimo de un espacio para nombrarlo: «Aula 102 (Pabellón C, piso 3)». */
export interface EspacioNombrable {
  id: string;
  identificador: string;
  pabellon: string;
  piso: number;
}

export type EspaciosPorId = ReadonlyMap<string, EspacioNombrable>;

const UUID = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi;

/** Índice id → espacio para pasar a las funciones de este módulo. */
export function indexarEspacios(espacios: readonly EspacioNombrable[] | null | undefined) {
  return new Map((espacios ?? []).map((e) => [e.id, e])) as EspaciosPorId;
}

/** «Pabellón C» sin repetir la palabra si ya viene en el nombre («Pabellón Nuevo»). */
function nombrePabellon(nombre: string): string {
  return /pabell/i.test(nombre) ? nombre : `Pabellón ${nombre}`;
}

/** «Aula 102 (Pabellón C, piso 3)»; si el espacio no está en el listado, «un espacio». */
export function nombrarEspacio(id: string, espacios: EspaciosPorId): string {
  const e = espacios.get(id);
  return e ? `${e.identificador} (${nombrePabellon(e.pabellon)}, piso ${e.piso})` : 'un espacio';
}

/** «Aula 102 y Aula 103 (Pabellón C, piso 3)»: agrupa la ubicación si todas comparten piso. */
export function nombrarEspacios(ids: readonly string[], espacios: EspaciosPorId): string {
  if (ids.length === 0) return 'ningún espacio';
  const conocidos = ids.map((id) => espacios.get(id));
  const todos = conocidos.every((e) => e !== undefined);
  if (todos && ids.length > 1) {
    const lugares = new Set(conocidos.map((e) => `${e!.pabellon}|${e!.piso}`));
    if (lugares.size === 1) {
      const nombres = conocidos.map((e) => e!.identificador);
      const ultimo = nombres.pop();
      return `${nombres.join(', ')} y ${ultimo} (${nombrePabellon(conocidos[0]!.pabellon)}, piso ${conocidos[0]!.piso})`;
    }
  }
  const nombres = ids.map((id) => nombrarEspacio(id, espacios));
  if (nombres.length === 1) return nombres[0];
  const ultimo = nombres.pop();
  return `${nombres.join(', ')} y ${ultimo}`;
}

/** Cambia los UUID que queden en un texto por el nombre del espacio (o los quita). */
export function sinIdentificadores(texto: string, espacios: EspaciosPorId): string {
  return texto
    .replace(/\[([^\]]*)\]/g, (todo, dentro: string) => {
      const ids = dentro.match(UUID);
      return ids && ids.length > 0 ? nombrarEspacios(ids, espacios) : todo;
    })
    .replace(UUID, (id) => (espacios.has(id) ? nombrarEspacio(id, espacios) : ''))
    .replace(/\s*\(\s*\)/g, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

function idsEntreCorchetes(texto: string): string[] {
  return texto.match(UUID) ?? [];
}

function motivoLlano(motivo: string): string {
  const { etiqueta, descripcion } = describirMotivoEscalamiento(motivo);
  return descripcion && descripcion !== 'Sin motivo registrado.'
    ? `${etiqueta}: ${descripcion}`
    : etiqueta;
}

/** Nombre de la sección del registro: «CC-101 · 1». */
function nombreSeccion(r: RegistroAuditoriaDTO): string {
  return r.seccion ? `${r.seccion.codigoCurso} · ${r.seccion.codigoSeccion}` : 'La sección';
}

export interface FraseRegistro {
  /** Lo que se muestra en la tabla o la tarjeta. */
  frase: string;
  /** Contexto corto: «Corrida del 12 oct, 10:32» o `null` si no viene de una corrida. */
  contexto: string | null;
  /** El texto del motor tal cual, para el bloque «Detalle técnico». */
  tecnico: string;
}

/**
 * Frase de un registro de auditoría. Formas que deja el backend hoy:
 *  - `Asignación automática exitosa a espacios: [ids] (Puntaje cercanía: N)`
 *  - `Sección escalada a revisión manual: [CODIGO] descripción`
 *  - `[Origen: X] Corrida Batch [id] - Asignada a: [ids]` / `- Escalada: motivo`
 *  - `Verificación conforme (corrida id): N asignaciones revisadas sin violaciones.`
 *  - `Verificación con N violación(es) (corrida id): REGLA (n), REGLA (n).`
 *  - `Alerta TIPO resuelta por la cuenta id`
 * Lo que no se reconoce se muestra sin UUID.
 */
export function fraseDeRegistro(r: RegistroAuditoriaDTO, espacios: EspaciosPorId): FraseRegistro {
  const texto = r.detalle.trim();
  const tecnico = r.detalle;
  const corrida = /corrida/i.test(texto) ? `Corrida del ${formatearFechaCorta(r.fechaHora)}` : null;
  const seccion = nombreSeccion(r);

  const asignadaIndividual = texto.match(
    /^Asignaci[oó]n autom[aá]tica exitosa a espacios:\s*\[([^\]]*)\]/i,
  );
  if (asignadaIndividual) {
    return {
      frase: `${seccion} pasó a ${nombrarEspacios(idsEntreCorchetes(asignadaIndividual[1]), espacios)}`,
      contexto: corrida,
      tecnico,
    };
  }

  const escaladaIndividual = texto.match(/^Secci[oó]n escalada a revisi[oó]n manual:\s*(.*)$/is);
  if (escaladaIndividual) {
    return {
      frase: `${seccion} pasó a revisión. ${motivoLlano(escaladaIndividual[1])}`,
      contexto: corrida,
      tecnico,
    };
  }

  const enCorrida = texto.match(/Corrida Batch \[[^\]]*\]\s*-\s*(.*)$/is);
  if (enCorrida) {
    const resto = enCorrida[1];
    const asignada = resto.match(/^Asignada a:\s*\[([^\]]*)\]/i);
    if (asignada) {
      return {
        frase: `${seccion} pasó a ${nombrarEspacios(idsEntreCorchetes(asignada[1]), espacios)}`,
        contexto: corrida,
        tecnico,
      };
    }
    const escalada = resto.match(/^Escalada:\s*(.*)$/is);
    if (escalada) {
      return {
        frase: `${seccion} pasó a revisión. ${motivoLlano(escalada[1])}`,
        contexto: corrida,
        tecnico,
      };
    }
  }

  const conforme = texto.match(/^Verificaci[oó]n conforme.*?:\s*(\d+)\s+asignaciones/i);
  if (conforme) {
    const total = Number(conforme[1]);
    return {
      frase: `Comprobación correcta: ${plural(total, 'asignación revisada', 'asignaciones revisadas')}, sin incumplimientos`,
      contexto: corrida,
      tecnico,
    };
  }

  const noConforme = texto.match(
    /^Verificaci[oó]n con (\d+) violaci[oó]n\(es\)[^:]*:\s*(.*?)\.?$/is,
  );
  if (noConforme) {
    const total = Number(noConforme[1]);
    const reglas = [...noConforme[2].matchAll(/([A-Z_]+)\s*\((\d+)\)/g)].map(
      ([, regla, n]) => `${etiquetaReglaVerificacion(regla).toLowerCase()} (${n})`,
    );
    return {
      frase: `Comprobación con ${plural(total, 'incumplimiento', 'incumplimientos')}${reglas.length > 0 ? `: ${reglas.join(', ')}` : ''}`,
      contexto: corrida,
      tecnico,
    };
  }

  const alertaResuelta = texto.match(/^Alerta (\w+) resuelta/i);
  if (alertaResuelta) {
    const tipo = alertaResuelta[1].toUpperCase();
    const etiqueta =
      tipo === 'SOFTWARE' ? 'de software' : tipo === 'CAPACIDAD' ? 'de capacidad' : '';
    return {
      frase: `Se marcó como resuelta una alerta ${etiqueta}`.trim(),
      contexto: null,
      tecnico,
    };
  }

  return {
    frase: sinIdentificadores(texto.replace(/^\[Origen:[^\]]*\]\s*/i, ''), espacios),
    contexto: corrida,
    tecnico,
  };
}

/** Incumplimiento del verificador sin UUID ni comparaciones del motor. */
export function fraseDeViolacion(detalle: string, espacios: EspaciosPorId): string {
  const texto = detalle.trim();
  const comparte = texto.match(
    /^Comparte el espacio \[([^\]]*)\] con la secci[oó]n (\S+) en horarios solapados/i,
  );
  if (comparte) {
    return `Comparte ${nombrarEspacios(idsEntreCorchetes(comparte[1]), espacios)} con la sección ${comparte[2]} a la misma hora.`;
  }
  const capacidad = texto.match(/^Capacidad real (\d+)\s*<\s*(\d+) matriculados/i);
  if (capacidad) {
    return `El espacio admite ${capacidad[1]} personas y hay ${capacidad[2]} matriculados.`;
  }
  if (/ESCALADA no declara motivo/i.test(texto)) {
    return 'La sección está en revisión sin motivo registrado.';
  }
  return sinIdentificadores(
    texto
      .replace(/\bespacio [0-9a-f-]{36} inexistente\b/gi, 'un espacio que ya no existe')
      .replace(/\bAULA_TEORICA\b/g, 'aula teórica')
      .replace(/\bLABORATORIO\b/g, 'laboratorio'),
    espacios,
  );
}

/** Motivo de una alerta en lenguaje llano (el texto del motor queda en «Detalle técnico»). */
export function fraseDeMotivoAlerta(motivo: string): string {
  const texto = motivo.trim();
  const capacidad = texto.match(
    /^Capacidad real del bloque (\d+)\s*<\s*(\d+) alumnos matriculados/i,
  );
  if (capacidad) {
    return `Caben ${capacidad[1]} personas y hay ${capacidad[2]} alumnos matriculados.`;
  }
  const software = texto.match(/^(.+?) no tiene instalado:\s*(.+)$/i);
  if (software) {
    return `Falta instalar en ${software[1]}: ${software[2]}.`;
  }
  return texto
    .replace(UUID, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

/** Si la frase legible es distinta del texto crudo, vale la pena ofrecer el «Detalle técnico». */
export function tieneDetalleTecnico(frase: string, crudo: string): boolean {
  return frase.trim() !== crudo.trim();
}
