export interface UbicacionAccesibilidad {
  piso: number;
  /** Distancia en metros hasta el ascensor; `null` si el espacio no la tiene registrada. */
  distanciaAscensor?: number | null;
}

export interface MarcaAccesibilidad {
  /** El espacio se puede alcanzar sin salvar escaleras. */
  accesible: boolean;
  /** El acceso al espacio requiere usar el ascensor (está en un piso superior). */
  accesoPorAscensor: boolean;
}

/**
 * HU-04 (criterio 3) / RF-16: marca de accesibilidad de un espacio para mostrarla en la consulta.
 *
 * - El Piso 1 es accesible de forma directa: no hay escaleras de por medio.
 * - En pisos superiores el acceso es por ascensor; el espacio es accesible cuando tiene registrada
 *   su distancia al ascensor, es decir, cuando el ascensor da servicio a ese piso.
 *
 * Es una derivación pura de la ubicación: no decide la asignación (eso lo hace el motor), solo
 * describe el resultado para que la interfaz lo comunique.
 */
export function marcarAccesibilidad({
  piso,
  distanciaAscensor,
}: UbicacionAccesibilidad): MarcaAccesibilidad {
  const accesoPorAscensor = piso > 1;
  const accesible = piso === 1 || distanciaAscensor != null;
  return { accesible, accesoPorAscensor };
}
