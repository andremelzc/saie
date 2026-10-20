import { createContext } from 'react';

export type TonoAvisoGlobal = 'exito' | 'error' | 'info';

export interface ValorContextoAvisos {
  mostrar: (tono: TonoAvisoGlobal, texto: string) => void;
}

export const ContextoAvisos = createContext<ValorContextoAvisos | null>(null);
