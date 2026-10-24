/** Id de la pestaña `valor` de un `SelectorSegmentado` con `idBase` (Issue 3.46). */
export const idPestana = (idBase: string, valor: string) => `${idBase}-pestana-${valor}`;

/** Id del panel que controla la pestaña `valor` de un `SelectorSegmentado` con `idBase`. */
export const idPanelPestana = (idBase: string, valor: string) => `${idBase}-panel-${valor}`;
