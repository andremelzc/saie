import React from 'react';
import { Link } from 'react-router-dom';
import { clasesBoton } from './clasesBoton';
import type { TamanoBoton, VarianteBoton } from './clasesBoton';

export interface BotonEnlaceProps {
  /** Ruta interna de la aplicación. */
  to: string;
  variante?: VarianteBoton;
  tamano?: TamanoBoton;
  anchoCompleto?: boolean;
  className?: string;
  children: React.ReactNode;
}

/**
 * Enlace con el aspecto de un `Boton`: para navegar (cambia la ruta) sin que el usuario
 * perciba una diferencia visual con una acción. Un enlace es un `<a>`, no un `<button>`, así
 * que se abre con Enter y se puede abrir en otra pestaña.
 */
export const BotonEnlace: React.FC<BotonEnlaceProps> = ({
  to,
  variante = 'secundario',
  tamano = 'md',
  anchoCompleto = false,
  className = '',
  children,
}) => (
  <Link to={to} className={`${clasesBoton(variante, tamano, anchoCompleto)} ${className}`}>
    {children}
  </Link>
);

export default BotonEnlace;
