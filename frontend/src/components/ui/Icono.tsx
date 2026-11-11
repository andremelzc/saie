import React from 'react';

/** Ícono lineal (24 px, trazo de 2 px) decorativo: el texto que lo acompaña lleva el significado. */
export const Icono: React.FC<{ trazo: string; className?: string }> = ({
  trazo,
  className = 'h-3.5 w-3.5',
}) => (
  <svg
    className={className}
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    viewBox="0 0 24 24"
    aria-hidden="true"
  >
    <path d={trazo} />
  </svg>
);

export default Icono;
