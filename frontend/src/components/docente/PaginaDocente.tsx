import React from 'react';
import { Link } from 'react-router-dom';
import CabeceraPortal from '../CabeceraPortal';
import { EnlaceSaltar, ID_CONTENIDO } from '../ui/EnlaceSaltar';
import { RUTAS } from '../../config/rutas';
import { useTituloPagina } from '../../hooks/useTituloPagina';

export interface PaginaDocenteProps {
  titulo: string;
  descripcion?: string;
  /** Sin enlace de vuelta en la propia portada del portal. */
  conVolver?: boolean;
  /** `ancho` para tablas y horarios; `normal` para formularios y listas. */
  ancho?: 'normal' | 'ancho';
  acciones?: React.ReactNode;
  children: React.ReactNode;
}

/** Marco común de las pantallas del portal docente: cabecera, salto al contenido y título. */
export const PaginaDocente: React.FC<PaginaDocenteProps> = ({
  titulo,
  descripcion,
  conVolver = true,
  ancho = 'normal',
  acciones,
  children,
}) => {
  useTituloPagina(titulo);
  return (
    <div className="min-h-screen bg-saie-canvas text-saie-text">
      <EnlaceSaltar />
      <CabeceraPortal portal="Docente" />
      <main
        id={ID_CONTENIDO}
        tabIndex={-1}
        className={`mx-auto flex w-full flex-col gap-6 px-4 py-8 focus:outline-none ${
          ancho === 'ancho' ? 'max-w-6xl' : 'max-w-3xl'
        }`}
      >
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="flex min-w-0 flex-col gap-1">
            {conVolver && (
              <Link to={RUTAS.inicioDocente} className="text-sm text-saie-primary">
                ← Volver al portal del docente
              </Link>
            )}
            <h1 className="m-0 text-2xl font-bold tracking-tight sm:text-3xl">{titulo}</h1>
            {descripcion && <p className="m-0 text-sm text-saie-muted">{descripcion}</p>}
          </div>
          {acciones}
        </div>
        {children}
      </main>
    </div>
  );
};

export default PaginaDocente;
