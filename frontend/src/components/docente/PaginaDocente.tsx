import React from 'react';
import CabeceraAlumno from '../estudiante/CabeceraAlumno';
import { Contenedor } from '../ui/Contenedor';
import { EnlaceSaltar, ID_CONTENIDO } from '../ui/EnlaceSaltar';
import { RUTAS } from '../../config/rutas';
import { useTituloPagina } from '../../hooks/useTituloPagina';
import NavegacionDocente from './NavegacionDocente';

export interface PaginaDocenteProps {
  titulo: string;
  descripcion?: string;
  /** Acciones o datos rápidos a la derecha del título. */
  acciones?: React.ReactNode;
  children: React.ReactNode;
}

/**
 * Marco común del portal docente: la misma cabecera, barra de navegación y ancho que el área del
 * estudiante, para que los portales se vean y se recorran igual.
 */
export const PaginaDocente: React.FC<PaginaDocenteProps> = ({
  titulo,
  descripcion,
  acciones,
  children,
}) => {
  useTituloPagina(titulo);
  return (
    <div className="flex min-h-screen flex-col bg-saie-canvas pb-20 text-saie-text lg:pb-0">
      <EnlaceSaltar />
      <CabeceraAlumno ancho="normal" inicio={RUTAS.inicioDocente} />
      <NavegacionDocente />
      <Contenedor
        como="main"
        ancho="normal"
        id={ID_CONTENIDO}
        tabIndex={-1}
        className="flex flex-1 flex-col gap-4 py-4 focus:outline-none"
      >
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="min-w-0">
            <h1 className="m-0 text-2xl font-bold leading-8 tracking-tight text-saie-text sm:text-3xl">
              {titulo}
            </h1>
            {descripcion && <p className="m-0 mt-0.5 text-sm text-saie-muted">{descripcion}</p>}
          </div>
          {acciones}
        </div>
        {children}
      </Contenedor>
    </div>
  );
};

export default PaginaDocente;
