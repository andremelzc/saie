import { Manejador, MapaEventos, NombreEvento } from './tipos';

type ManejadorGenerico = (contenido: never) => void | Promise<void>;

/**
 * Issue 2.16: bus de eventos interno al proceso, tipado por evento.
 *
 * Es deliberadamente ligero (sin broker externo): el emisor no conoce a quien escucha, y quien
 * escucha no puede afectar al emisor. Un manejador que lanza un error o rechaza su promesa se
 * captura y se registra solo el tipo de error (nunca el mensaje, que podría traer datos
 * sensibles); el resto de manejadores se ejecuta igual.
 */
export class BusEventos {
  private readonly manejadores = new Map<NombreEvento, Set<ManejadorGenerico>>();

  /** Suscribe un manejador y devuelve la función para darlo de baja. */
  suscribir<K extends NombreEvento>(evento: K, manejador: Manejador<K>): () => void {
    const conjunto = this.manejadores.get(evento) ?? new Set<ManejadorGenerico>();
    conjunto.add(manejador as ManejadorGenerico);
    this.manejadores.set(evento, conjunto);
    return () => conjunto.delete(manejador as ManejadorGenerico);
  }

  /**
   * Entrega el evento a todos sus manejadores. La promesa devuelta nunca rechaza y se resuelve
   * cuando todos terminaron; el emisor no necesita esperarla (`void bus.emitir(...)`).
   *
   * Debe llamarse DESPUÉS de confirmar la transacción que originó el evento, nunca dentro.
   */
  async emitir<K extends NombreEvento>(evento: K, contenido: MapaEventos[K]): Promise<void> {
    const lista = [...(this.manejadores.get(evento) ?? [])];
    await Promise.all(
      lista.map(async (manejador) => {
        try {
          await (manejador as Manejador<K>)(contenido);
        } catch (error: unknown) {
          const tipo = error instanceof Error ? error.name : 'desconocido';
          console.error(`[eventos] El manejador de '${evento}' falló: ${tipo}`);
        }
      }),
    );
  }

  /** Quita todos los manejadores (útil al apagar el servidor o aislar pruebas). */
  limpiar(): void {
    this.manejadores.clear();
  }
}

/** Bus único del proceso. */
export const bus = new BusEventos();
