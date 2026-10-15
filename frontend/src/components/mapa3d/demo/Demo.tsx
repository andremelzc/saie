// Demostración del mapa 3D (solo desarrollo). Usa datos de ejemplo y el plano borrador generado
// con `tools/planos`; no llama al backend.
import { useMemo, useState } from 'react';
import Mapa3DLazy from '../Mapa3DLazy';
import type { EspacioMapa, EstadoOcupacion } from '../tipos';
import planoUrl from './piso-1.borrador.svg?url';
import planoTexto from './piso-1.borrador.svg?raw';

const ESTADOS: EstadoOcupacion[] = ['DISPONIBLE', 'OCUPADO', 'OCUPADO', 'ALERTA_ACTIVA'];

/** Un espacio de ejemplo por cada aula, laboratorio o auditorio del plano. */
function espaciosDeEjemplo(svg: string): EspacioMapa[] {
  const figuras = [
    ...svg.matchAll(/id="([^"]+)" class="(?:espacio )?(aula|laboratorio|auditorio)"/g),
  ];
  return figuras.map(([, id, clase], i) => ({
    id,
    tipo: clase === 'laboratorio' ? 'LABORATORIO' : 'AULA_TEORICA',
    estado: ESTADOS[i % ESTADOS.length],
  }));
}

// Con `?pisos=3` se repite el borrador en varios pisos para probar la vista de edificio completo.
const PISOS = Math.min(
  3,
  Math.max(1, Number(new URLSearchParams(location.search).get('pisos')) || 1),
);
const planos = Object.fromEntries(Array.from({ length: PISOS }, (_, i) => [i + 1, planoUrl]));

export default function Demo() {
  const espacios = useMemo(() => espaciosDeEjemplo(planoTexto), []);
  const [elegido, setElegido] = useState<string | null>(null);
  const [bloque, setBloque] = useState(false);
  const resaltados = useMemo(
    () => (bloque ? espacios.slice(0, 3).map((e) => e.id) : []),
    [bloque, espacios],
  );

  return (
    <main className="mx-auto flex max-w-6xl flex-col gap-3 p-4">
      <header className="flex flex-wrap items-center gap-4">
        <h1 className="text-xl font-semibold text-indigo-950">
          Mapa 3D — demostración (plano borrador)
        </h1>
        <label className="flex items-center gap-2 text-sm text-slate-700">
          <input type="checkbox" checked={bloque} onChange={(e) => setBloque(e.target.checked)} />
          Resaltar un bloque asignado
        </label>
        <p aria-live="polite" className="text-sm text-slate-700">
          Seleccionado: <strong>{elegido ?? 'ninguno'}</strong>
        </p>
      </header>
      <div className="h-[75vh] rounded-lg border border-slate-200 bg-slate-50">
        <Mapa3DLazy
          planos={planos}
          espacios={espacios}
          resaltados={resaltados}
          onSeleccionar={setElegido}
          fallback={
            <p className="p-4">Este navegador no soporta WebGL: se mostraría el mapa 2D.</p>
          }
        />
      </div>
    </main>
  );
}
