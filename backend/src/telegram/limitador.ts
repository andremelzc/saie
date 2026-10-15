/**
 * Limita los intentos fallidos de vinculación por `chat_id` (Issue 3.25): tras `maxFallos`
 * intentos fallidos dentro de la ventana, el chat queda bloqueado un tiempo. Sin esto, alguien
 * podría adivinar la clave de un alumno desde el bot.
 *
 * Vive en memoria: se reinicia si el contenedor se reinicia o se suspende. Es una defensa de
 * mejor esfuerzo; la clave sigue protegida por bcrypt.
 */
export class LimitadorIntentos {
  private readonly fallos = new Map<string, { cuenta: number; desde: number; hasta?: number }>();

  constructor(
    private readonly maxFallos = 5,
    private readonly ventanaMs = 15 * 60_000,
    private readonly bloqueoMs = 15 * 60_000,
    private readonly ahora: () => number = Date.now,
  ) {}

  /** Segundos que faltan para que el chat pueda volver a intentar, o `null` si no está bloqueado. */
  segundosDeBloqueo(chatId: string): number | null {
    this.purgar();
    const registro = this.fallos.get(chatId);
    if (!registro?.hasta) return null;
    const restante = registro.hasta - this.ahora();
    return restante > 0 ? Math.ceil(restante / 1000) : null;
  }

  registrarFallo(chatId: string): void {
    const ahora = this.ahora();
    const previo = this.fallos.get(chatId);
    const vigente = previo && ahora - previo.desde < this.ventanaMs ? previo : undefined;
    const cuenta = (vigente?.cuenta ?? 0) + 1;
    this.fallos.set(chatId, {
      cuenta,
      desde: vigente?.desde ?? ahora,
      hasta: cuenta >= this.maxFallos ? ahora + this.bloqueoMs : undefined,
    });
  }

  /** Tras una vinculación correcta se olvidan los fallos previos. */
  limpiar(chatId: string): void {
    this.fallos.delete(chatId);
  }

  /** Descarta los registros vencidos para que el mapa no crezca sin límite. */
  private purgar(): void {
    const ahora = this.ahora();
    for (const [chatId, r] of this.fallos) {
      const vencidoBloqueo = r.hasta !== undefined && r.hasta <= ahora;
      const vencidaVentana = r.hasta === undefined && ahora - r.desde >= this.ventanaMs;
      if (vencidoBloqueo || vencidaVentana) this.fallos.delete(chatId);
    }
  }
}

export const limitadorIntentos = new LimitadorIntentos();
