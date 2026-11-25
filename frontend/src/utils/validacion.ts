/**
 * Reglas de validación compartidas por los formularios (Issue 3.41). Cada regla devuelve el
 * mensaje de error o `null`; `validarCampo` aplica las reglas en orden y se queda con el primer
 * error. Las mismas reglas se usan al salir del campo y al enviar, así el criterio es uno solo.
 */
export type Regla = (valor: string) => string | null;

export const requerido =
  (mensaje = 'Este dato es obligatorio.'): Regla =>
  (valor) =>
    valor.trim() === '' ? mensaje : null;

export const longitudMaxima =
  (maximo: number): Regla =>
  (valor) =>
    valor.trim().length > maximo ? `Usa como máximo ${maximo} caracteres.` : null;

export const patron =
  (expresion: RegExp, mensaje: string): Regla =>
  (valor) =>
    valor.trim() === '' || expresion.test(valor.trim()) ? null : mensaje;

export function validarCampo(valor: string, reglas: readonly Regla[]): string | null {
  for (const regla of reglas) {
    const error = regla(valor);
    if (error) return error;
  }
  return null;
}
