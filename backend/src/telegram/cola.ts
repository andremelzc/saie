/**
 * Cola de envíos a Telegram: serializa las tareas y deja un intervalo mínimo entre una y otra
 * para respetar el límite de la Bot API (alrededor de 30 mensajes por segundo en total).
 *
 * Es global al proceso a propósito: una corrida de asignación puede disparar muchos eventos
 * a la vez y cada uno enviaría sus mensajes por su cuenta; con una sola cola el ritmo total se
 * mantiene bajo el límite sin importar cuántos manejadores corran.
 */
export class ColaEnvios {
  private ultima: Promise<unknown> = Promise.resolve();

  constructor(
    private readonly intervaloMs = 40,
    private readonly dormir: (ms: number) => Promise<void> = (ms) =>
      new Promise((resolver) => setTimeout(resolver, ms)),
  ) {}

  /** Ejecuta `tarea` cuando le toca y devuelve su resultado (o su error). */
  encolar<T>(tarea: () => Promise<T>): Promise<T> {
    const resultado = this.ultima.then(tarea);
    // La siguiente tarea espera el intervalo, tenga éxito o falle esta.
    this.ultima = resultado.then(
      () => this.dormir(this.intervaloMs),
      () => this.dormir(this.intervaloMs),
    );
    return resultado;
  }
}

export const colaEnvios = new ColaEnvios();
