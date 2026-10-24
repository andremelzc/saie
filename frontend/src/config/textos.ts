/**
 * Textos de interfaz compartidos por varias pantallas. Es el único lugar donde se redactan los
 * mensajes de error genéricos: así el tono es el mismo en todo el sistema y se pueden cambiar
 * sin buscar la frase en cada pantalla.
 */

export const TEXTOS_ERROR = {
  /** Cualquier fallo sin causa conocida. */
  generico: 'Inténtalo de nuevo en unos minutos.',
  sinConexion: 'No hay conexión con el servidor. Revisa tu internet e inténtalo de nuevo.',
  /** Una petición agotó el tiempo de espera: no es lo mismo que no tener conexión. */
  tiempoAgotado:
    'La operación tardó más de lo esperado. Puede que se haya completado: actualiza para comprobarlo.',
  sesionVencida: 'Tu sesión venció. Vuelve a iniciar sesión.',
  sinPermiso: 'No tienes permiso para hacer esta acción.',
  noEncontrado: 'No encontramos lo que buscas. Puede que ya no exista: actualiza la página.',
  servidor: 'Algo salió mal de nuestro lado. Inténtalo de nuevo en unos minutos.',
  datosInvalidos: 'Revisa los datos ingresados.',
} as const;

/** Texto cuando un código del backend no tiene traducción (y se avisa en la consola). */
export const TEXTO_NO_DISPONIBLE = 'No disponible';
