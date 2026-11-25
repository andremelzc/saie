import { useEffect, useState } from 'react';

/**
 * Devuelve `valor` tras `esperaMs` sin cambios (por defecto 300 ms). Sirve para que escribir en
 * un campo de búsqueda genere una sola petición cuando la persona hace una pausa, y no una por
 * tecla (Issue 4.41).
 */
export function useValorDiferido<T>(valor: T, esperaMs = 300): T {
  const [diferido, setDiferido] = useState(valor);

  useEffect(() => {
    const temporizador = setTimeout(() => setDiferido(valor), esperaMs);
    return () => clearTimeout(temporizador);
  }, [valor, esperaMs]);

  return diferido;
}
