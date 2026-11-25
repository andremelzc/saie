/**
 * «1 sección» o «3 secciones»: cantidad con el sustantivo en el número correcto. Sustituye a los
 * plurales con paréntesis («sección(es)») que se leían como un formulario sin pulir.
 */
export function plural(cantidad: number, singular: string, pluralTexto: string): string {
  return `${cantidad} ${cantidad === 1 ? singular : pluralTexto}`;
}
