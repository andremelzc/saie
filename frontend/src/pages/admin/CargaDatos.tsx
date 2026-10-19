import React, { useState } from 'react';
import LayoutAdmin from '../../components/admin/LayoutAdmin';
import { importarCsv } from '../../services/admin';
import { mensajeDeError } from '../../services/estudiante';
import type { ResultadoImportacionDTO, TipoImportacion } from '../../types/admin';

/**
 * Issue 1.9 — tres flujos de carga independientes. Cada zona tiene su propio archivo, botón y
 * resultado; los errores por fila se muestran tal como los devuelve el backend.
 */

const FLUJOS: { tipo: TipoImportacion; titulo: string; descripcion: string }[] = [
  {
    tipo: 'cursos-secciones',
    titulo: '1. Cursos y secciones',
    descripcion: 'Catálogo de cursos y sus secciones del periodo.',
  },
  {
    tipo: 'horarios',
    titulo: '2. Horarios',
    descripcion: 'Bloques de día y hora de cada sección.',
  },
  { tipo: 'matriculas', titulo: '3. Matrículas', descripcion: 'Alumnos matriculados por sección.' },
];

function leerArchivo(archivo: File): Promise<string> {
  if (typeof archivo.text === 'function') return archivo.text();
  return new Promise((resolve, reject) => {
    const lector = new FileReader();
    lector.onload = () => resolve(String(lector.result ?? ''));
    lector.onerror = () => reject(lector.error);
    lector.readAsText(archivo);
  });
}

export const ZonaCarga: React.FC<{
  tipo: TipoImportacion;
  titulo: string;
  descripcion: string;
}> = ({ tipo, titulo, descripcion }) => {
  const [archivo, setArchivo] = useState<File | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [resultado, setResultado] = useState<ResultadoImportacionDTO | null>(null);
  const [error, setError] = useState<string | null>(null);
  const idInput = `archivo-${tipo}`;

  async function enviar() {
    if (!archivo) return;
    setEnviando(true);
    setError(null);
    setResultado(null);
    try {
      setResultado(await importarCsv(tipo, await leerArchivo(archivo)));
    } catch (e) {
      setError(mensajeDeError(e));
    } finally {
      setEnviando(false);
    }
  }

  return (
    <section
      aria-label={titulo}
      className="flex flex-col gap-3 rounded-xl border border-saie-divider bg-white p-5 shadow-[var(--saie-shadow-1)]"
    >
      <div>
        <h2 className="m-0 text-base font-bold text-saie-text">{titulo}</h2>
        <p className="m-0 text-sm text-saie-muted">{descripcion}</p>
      </div>

      <label
        htmlFor={idInput}
        className="flex cursor-pointer flex-col items-center gap-1 rounded-lg border-2 border-dashed border-saie-divider bg-saie-canvas px-4 py-6 text-center text-sm text-saie-muted hover:border-saie-primary"
      >
        <span className="font-semibold text-saie-primary">
          {archivo ? archivo.name : 'Elegir archivo CSV'}
        </span>
        <span className="text-xs">
          {archivo ? `${(archivo.size / 1024).toFixed(1)} KB` : 'Máx. 10 MB'}
        </span>
        <input
          id={idInput}
          type="file"
          accept=".csv,text/csv"
          className="sr-only"
          onChange={(e) => {
            setArchivo(e.target.files?.[0] ?? null);
            setResultado(null);
            setError(null);
          }}
        />
      </label>

      <button
        type="button"
        onClick={enviar}
        disabled={!archivo || enviando}
        className="rounded-lg bg-saie-primary px-4 py-2 text-sm font-semibold text-white hover:bg-saie-primary-dark disabled:cursor-not-allowed disabled:opacity-50"
      >
        {enviando ? 'Importando…' : 'Importar'}
      </button>

      {error && (
        <p role="alert" className="m-0 rounded-lg bg-[#FBE9E9] px-3 py-2 text-sm text-saie-danger">
          {error}
        </p>
      )}

      {resultado && (
        <div
          role="status"
          className={`flex flex-col gap-2 rounded-lg px-3 py-2 text-sm ${resultado.exitosa ? 'bg-[#E8F3E9] text-saie-success' : 'bg-[#FDF0E1] text-[#B45309]'}`}
        >
          <p className="m-0 font-semibold">
            {resultado.exitosa
              ? `Importación exitosa: ${resultado.filasRecibidas} filas.`
              : `${resultado.errores.length} fila(s) rechazada(s) de ${resultado.filasRecibidas}.`}
          </p>
          {Object.keys(resultado.procesados).length > 0 && (
            <p className="m-0 text-xs">
              {Object.entries(resultado.procesados)
                .map(([k, v]) => `${k}: ${v}`)
                .join(' · ')}
            </p>
          )}
          {resultado.errores.length > 0 && (
            <ul className="m-0 max-h-40 list-disc overflow-auto pl-5 text-xs text-saie-text">
              {resultado.errores.map((e, i) => (
                <li key={i}>{e}</li>
              ))}
            </ul>
          )}
          {resultado.asignacion && (
            <p className="m-0 text-xs text-saie-text">
              {resultado.asignacion.disparada && resultado.asignacion.resumen
                ? `Asignación ejecutada: ${resultado.asignacion.resumen.asignadas} asignadas, ${resultado.asignacion.resumen.escaladas} escaladas.`
                : `Asignación no ejecutada: ${resultado.asignacion.motivo ?? ''}`}
            </p>
          )}
        </div>
      )}
    </section>
  );
};

export const CargaDatos: React.FC = () => (
  <LayoutAdmin
    titulo="Carga de datos maestros"
    subtitulo="Cada archivo se carga por separado y puede volver a cargarse cuando quieras."
  >
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
      {FLUJOS.map((f) => (
        <ZonaCarga key={f.tipo} {...f} />
      ))}
    </div>
  </LayoutAdmin>
);

export default CargaDatos;
