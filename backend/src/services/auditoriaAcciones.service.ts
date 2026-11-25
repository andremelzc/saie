import { Prisma, PrismaClient, TipoEventoAuditoria } from '@prisma/client';

/**
 * Issue 4.58 — Auditoría de las acciones de personas.
 *
 * El motor y las alertas ya dejaban asiento en `RegistroAuditoria`; editar un espacio, una
 * sección o el software de un laboratorio no. Este módulo registra esos cambios con la cuenta
 * que los hizo y una lista `[{ campo, anterior, nuevo }]`, para responder «¿quién cambió esto?».
 *
 * Reglas (RNF-09): solo se auditan campos de negocio que el servicio ya valida; nunca claves,
 * tokens ni datos de la ficha médica. Si no cambió ningún valor no se crea asiento.
 */

/** Valores que se guardan: escalares o listas de textos (por ejemplo, el software instalado). */
export type ValorAuditado = string | number | boolean | string[] | null;

export interface CambioCampo {
  campo: string;
  anterior: ValorAuditado;
  nuevo: ValorAuditado;
}

export type CamposAuditados = Record<string, { anterior: ValorAuditado; nuevo: ValorAuditado }>;

function iguales(a: ValorAuditado, b: ValorAuditado): boolean {
  if (Array.isArray(a) && Array.isArray(b)) {
    // Las listas son conjuntos: el orden no cuenta como cambio.
    const ordenadas = (l: string[]) => [...l].sort((x, y) => x.localeCompare(y, 'es'));
    return JSON.stringify(ordenadas(a)) === JSON.stringify(ordenadas(b));
  }
  return a === b;
}

/** Deja solo los campos cuyo valor realmente cambió. */
export function calcularCambios(campos: CamposAuditados): CambioCampo[] {
  return Object.entries(campos)
    .filter(([, { anterior, nuevo }]) => !iguales(anterior, nuevo))
    .map(([campo, { anterior, nuevo }]) => ({ campo, anterior, nuevo }));
}

function mostrar(valor: ValorAuditado): string {
  if (valor === null) return '—';
  if (Array.isArray(valor)) return valor.length === 0 ? '(ninguno)' : valor.join(', ');
  return String(valor);
}

/** «aforoNominal: 30 → 35; piso: 1 → 2» (texto de `detalle`, sin identificadores internos). */
export function describirCambios(cambios: CambioCampo[]): string {
  return cambios.map((c) => `${c.campo}: ${mostrar(c.anterior)} → ${mostrar(c.nuevo)}`).join('; ');
}

export interface AccionDePersona {
  tipoEvento: Extract<
    TipoEventoAuditoria,
    'EDICION_ESPACIO' | 'EDICION_SECCION' | 'CAMBIO_LABORATORIO' | 'CAMBIO_PERIODO'
  >;
  /** Cuenta que hizo el cambio (`auth.sub`). */
  cuentaId: string;
  /** Qué se editó, en lenguaje llano («Espacio A-101 editado»). */
  descripcion: string;
  cambios: CambioCampo[];
  espacioId?: string;
  seccionId?: string;
}

/**
 * Registra una acción de persona. Se llama dentro de la misma transacción que el cambio, de modo
 * que el asiento y el cambio se confirman o se revierten juntos. Devuelve `false` si no hubo
 * cambios que registrar.
 */
export async function registrarAccionDePersona(
  db: Pick<PrismaClient, 'registroAuditoria'>,
  accion: AccionDePersona,
): Promise<boolean> {
  if (accion.cambios.length === 0) return false;

  await db.registroAuditoria.create({
    data: {
      tipoEvento: accion.tipoEvento,
      cuentaId: accion.cuentaId,
      espaciosIds: accion.espacioId ? [accion.espacioId] : [],
      seccionId: accion.seccionId ?? null,
      cambios: accion.cambios as unknown as Prisma.InputJsonValue,
      detalle: `${accion.descripcion}: ${describirCambios(accion.cambios)}`,
    },
  });
  return true;
}
