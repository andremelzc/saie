import { useContext } from 'react';
import { ContextoAvisos, type ValorContextoAvisos } from './avisosContexto';

export function useAvisos(): ValorContextoAvisos {
  const contexto = useContext(ContextoAvisos);
  if (!contexto) throw new Error('useAvisos debe usarse dentro de <ProveedorAvisos>');
  return contexto;
}
