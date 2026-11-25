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
  /** 429: el backend limita los intentos de inicio de sesión y las consultas públicas. */
  demasiadosIntentos: 'Demasiados intentos. Espera un momento e inténtalo de nuevo.',
} as const;

/** Texto cuando un código del backend no tiene traducción (y se avisa en la consola). */
export const TEXTO_NO_DISPONIBLE = 'No disponible';

/**
 * Glosario de la asignación de aulas (Issue 3.52). La interfaz habla de «asignación automática»,
 * «comprobación», «incumplimiento» y «requiere revisión»; los nombres internos del equipo
 * («motor», «corrida», «verificador», «reglas duras», «violación», «escalamiento») solo aparecen
 * bajo «Detalle técnico». Las frases que se repiten en varias pantallas se redactan aquí.
 */
export const TEXTOS_ASIGNACION = {
  /** Título del resultado de la comprobación posterior a la asignación (antes «Veredicto del verificador»). */
  tituloComprobacion: 'Comprobación de la asignación',
  sinNadaQueComprobar: 'No hubo asignaciones que comprobar en esta asignación automática.',
  /** Distintivo corto cuando no hubo nada que comprobar. */
  distintivoSinNada: 'Sin asignaciones que comprobar',
  /** «Asignación automática del 9 nov., 09:00» (antes «Corrida del …»). */
  asignacionDel: (cuando: string) => `Asignación automática del ${cuando}`,
  asignacionIndividualDel: (cuando: string) => `Asignación individual del ${cuando}`,
  nota: 'Comprobación automática posterior a la asignación. Los incumplimientos quedan registrados en el historial.',
} as const;
