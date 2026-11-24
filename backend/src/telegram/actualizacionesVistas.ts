/**
 * Issue 3.64 (riesgo R46 de la auditoría): si el servidor tarda en responder (por ejemplo, mientras
 * Render despierta), Telegram vuelve a entregar la misma actualización. Este registro recuerda los
 * últimos `update_id` procesados para descartar las repetidas.
 *
 * Basta con memoria: los reintentos llegan a la misma instancia que recibió la primera entrega. El
 * tamaño está acotado para que el registro no crezca sin límite.
 */
export class ActualizacionesVistas {
  private readonly ids = new Set<number>();
  private readonly orden: number[] = [];

  constructor(private readonly capacidad = 1000) {}

  /** `true` si el id ya se había visto; si no, lo registra y devuelve `false`. */
  yaVista(updateId: number): boolean {
    if (this.ids.has(updateId)) return true;
    this.ids.add(updateId);
    this.orden.push(updateId);
    if (this.orden.length > this.capacidad) {
      this.ids.delete(this.orden.shift()!);
    }
    return false;
  }
}

export const actualizacionesVistas = new ActualizacionesVistas();
