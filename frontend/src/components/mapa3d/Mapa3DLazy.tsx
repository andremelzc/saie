import { lazy, Suspense } from 'react';
import type { Mapa3DProps } from './tipos';

const Mapa3D = lazy(() => import('./Mapa3D'));

/** Carga diferida de la maqueta 3D: three.js solo se descarga cuando se muestra el mapa. */
export default function Mapa3DLazy(props: Mapa3DProps) {
  return (
    <Suspense
      fallback={
        <p
          role="status"
          className="flex h-full min-h-80 items-center justify-center text-slate-600"
        >
          Cargando el mapa 3D…
        </p>
      }
    >
      <Mapa3D {...props} />
    </Suspense>
  );
}
