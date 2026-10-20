import React, { useState } from 'react';
import LayoutAdmin from '../../components/admin/LayoutAdmin';
import { importarCsv } from '../../services/admin';
import { mensajeDeError } from '../../services/estudiante';
import { PLANTILLAS, descargarPlantilla } from '../../config/plantillas';
import type { PlantillaCSV } from '../../config/plantillas';
import type { ResultadoImportacionDTO, TipoImportacion } from '../../types/admin';

/**
 * Issue 1.9 — cuatro flujos de carga independientes. Cada zona tiene su propio archivo, botón y
 * resultado; los errores por fila se muestran tal como los devuelve el backend. La pantalla
 * incluye, además, la guía de carga (orden, manejo de periodos, formatos) y la descarga de las
 * plantillas con el encabezado exacto que espera cada importador.
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
  {
    tipo: 'docentes',
    titulo: '4. Docentes',
    descripcion: 'Docentes de la Facultad y sus cuentas de acceso.',
  },
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

/** Bloque plegable de la guía. */
const BloqueGuia: React.FC<{ titulo: string; abierto?: boolean; children: React.ReactNode }> = ({
  titulo,
  abierto = false,
  children,
}) => (
  <details
    open={abierto}
    className="rounded-xl border border-saie-divider bg-white shadow-[var(--saie-shadow-1)]"
  >
    <summary className="cursor-pointer list-none px-5 py-4 text-base font-bold text-saie-text marker:content-none hover:text-saie-primary">
      {titulo}
    </summary>
    <div className="border-t border-saie-divider px-5 py-4 text-sm leading-6 text-saie-text">
      {children}
    </div>
  </details>
);

/** Guía de carga: orden, periodos, qué hace el sistema y formatos admitidos. */
const GuiaCarga: React.FC = () => (
  <section aria-labelledby="titulo-guia" className="flex flex-col gap-3">
    <h2 id="titulo-guia" className="m-0 text-lg font-bold text-saie-text">
      Cómo cargar los datos de un semestre
    </h2>

    <BloqueGuia titulo="1. Orden de carga" abierto>
      <ol className="m-0 pl-5">
        <li>
          <strong>Cursos y secciones.</strong> Crea el catálogo de cursos y sus secciones del
          periodo. Es el primero porque los otros archivos buscan la sección por (curso, sección,
          periodo).
        </li>
        <li>
          <strong>Horarios.</strong> Asigna el día y la hora de cada bloque. Si la sección todavía
          no existe, la fila se rechaza.
        </li>
        <li>
          <strong>Matrículas.</strong> Registra los alumnos por sección. Con{' '}
          <code>crearCuentaAcceso</code> en true, además se crea la cuenta de acceso del alumno (su
          código como clave inicial).
        </li>
        <li>
          <strong>Docentes</strong> (opcional). Alta de docentes y sus cuentas de acceso.
        </li>
      </ol>
      <p className="m-0 mt-3">
        Los cuatro archivos son independientes y se pueden recargar cuando quieras: la carga es
        idempotente, así que volver a subir el mismo archivo actualiza los datos en vez de
        duplicarlos. Si subes horarios o matrículas antes que las secciones, verás el error{' '}
        <em>«No existe la sección … para el curso … en el periodo …»</em>.
      </p>
    </BloqueGuia>

    <BloqueGuia titulo="2. El periodo académico y el periodo vigente">
      <p className="m-0">
        Cada fila lleva su <code>periodo</code> (por ejemplo <code>2026-2</code>). Un mismo curso
        puede existir en varios periodos a la vez: el periodo no se borra, se agrega.
      </p>
      <p className="m-0 mt-3">
        El <strong>periodo vigente</strong> es el semestre que el sistema tiene en mente. Se define
        con la variable <code>PERIODO_VIGENTE</code> del backend; si no está configurada, se toma el
        periodo más reciente entre las secciones cargadas. Solo el periodo vigente es el que se
        asigna.
      </p>
      <ul className="m-0 mt-3 pl-5">
        <li>
          <strong>Recargar el semestre en curso:</strong> vuelve a subir los archivos con el mismo{' '}
          <code>periodo</code>. Las secciones, horarios y matrículas se actualizan en el sitio y las
          asignaciones que siguen siendo válidas se conservan.
        </li>
        <li>
          <strong>Abrir un semestre nuevo:</strong> sube los archivos con el nuevo periodo (por
          ejemplo <code>2027-1</code>). Se insertan las secciones nuevas y los datos del semestre
          anterior quedan intactos. Como el nuevo periodo es el más reciente, pasa a ser el vigente
          y es el que se asigna.
        </li>
        <li>
          <strong>Fijar el semestre a mano:</strong> si el backend define{' '}
          <code>PERIODO_VIGENTE</code>, ese valor manda sobre la regla del periodo más reciente.
          Úsalo cuando quieras asignar explícitamente un semestre que no sea el último cargado.
        </li>
      </ul>
    </BloqueGuia>

    <BloqueGuia titulo="3. Qué hace el sistema después de cada carga">
      <p className="m-0">
        Si la carga termina sin filas rechazadas, el sistema intenta disparar la{' '}
        <strong>corrida de asignación</strong> del periodo vigente. La corrida solo se ejecuta si
        ese periodo ya tiene secciones, horarios y matrículas cargados; si falta algo, el resultado
        lo explica («Asignación no ejecutada: el periodo 2026-2 aún no tiene cargados: horarios»).
      </p>
      <p className="m-0 mt-3">
        La asignación es idempotente: repetirla no duplica aulas, conserva lo que sigue siendo
        válido y recalcula lo demás. También puedes dispararla a mano desde{' '}
        <strong>Inicio → «Ejecutar asignación del periodo»</strong> y reintentar desde ahí una
        sección escalada.
      </p>
    </BloqueGuia>

    <BloqueGuia titulo="4. Formatos admitidos">
      <ul className="m-0 pl-5">
        <li>
          CSV con encabezado. Separador <code>,</code> o <code>;</code> (Excel en español exporta
          con <code>;</code>). BOM opcional.
        </li>
        <li>
          Máximo <strong>20 000 filas</strong> y <strong>10 MB</strong> por envío.
        </li>
        <li>
          Booleanos: <code>true/false</code>, <code>1/0</code>, <code>si/no</code>.
        </li>
        <li>
          Horas en <code>HH:mm</code> (24 horas); la hora de fin debe ser posterior a la de inicio.
        </li>
        <li>
          Días: <code>LUNES</code>…<code>DOMINGO</code> (acepta minúsculas y sin tilde).
        </li>
        <li>
          Tipo de espacio: <code>AULA_TEORICA</code> o <code>LABORATORIO</code>.
        </li>
        <li>
          Software requerido: nombres del catálogo separados por <code>|</code>.
        </li>
      </ul>
    </BloqueGuia>

    <BloqueGuia titulo="5. Errores frecuentes">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-saie-canvas text-xs uppercase tracking-wide text-saie-muted">
            <tr>
              <th className="px-3 py-2">Mensaje</th>
              <th className="px-3 py-2">Causa</th>
              <th className="px-3 py-2">Qué hacer</th>
            </tr>
          </thead>
          <tbody>
            {[
              [
                'No existe la sección … para el curso … en el periodo …',
                'Se cargaron horarios o matrículas antes que las secciones.',
                'Carga primero «Cursos y secciones» de ese periodo.',
              ],
              [
                'SOFTWARE_NO_REGISTRADO',
                'El nombre del software no existe en el catálogo.',
                'Da de alta el software en el catálogo o corrige el nombre.',
              ],
              [
                'La hora de inicio debe ser menor a la hora de fin',
                'Bloque con las horas invertidas.',
                'Corrige horaInicio y horaFin.',
              ],
              [
                'Correo electrónico inválido',
                'El correo está mal escrito o trae espacios.',
                'Corrige la columna correo.',
              ],
              [
                'Fila N: …',
                'Esa fila se rechaza; el resto del archivo sí se guarda.',
                'Corrige la fila y vuelve a subir el archivo (no duplica nada).',
              ],
            ].map(([mensaje, causa, accion]) => (
              <tr key={mensaje} className="border-t border-saie-divider align-top">
                <td className="px-3 py-2 font-medium">{mensaje}</td>
                <td className="px-3 py-2 text-saie-muted">{causa}</td>
                <td className="px-3 py-2 text-saie-muted">{accion}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </BloqueGuia>
  </section>
);

/** Tarjeta de una plantilla: descarga del CSV y detalle de sus columnas. */
const TarjetaPlantilla: React.FC<{ plantilla: PlantillaCSV }> = ({ plantilla }) => (
  <article className="flex flex-col gap-3 rounded-xl border border-saie-divider bg-white p-5 shadow-[var(--saie-shadow-1)]">
    <header className="flex flex-col gap-1">
      <h3 className="m-0 text-base font-bold text-saie-text">{plantilla.titulo}</h3>
      <p className="m-0 text-sm text-saie-muted">{plantilla.descripcion}</p>
    </header>

    <button
      type="button"
      onClick={() => descargarPlantilla(plantilla)}
      className="inline-flex min-h-11 w-fit items-center gap-2 rounded-lg border border-saie-primary px-4 text-sm font-semibold text-saie-primary transition-colors hover:bg-saie-primary hover:text-white"
    >
      <span aria-hidden="true">↓</span>
      Descargar plantilla
    </button>

    <div className="overflow-x-auto">
      <table className="w-full text-left text-xs">
        <thead className="bg-saie-canvas uppercase tracking-wide text-saie-muted">
          <tr>
            <th className="px-2 py-2">Columna</th>
            <th className="px-2 py-2">Obligatoria</th>
            <th className="px-2 py-2">Qué es</th>
            <th className="px-2 py-2">Ejemplo</th>
          </tr>
        </thead>
        <tbody>
          {plantilla.columnas.map((columna) => (
            <tr key={columna.nombre} className="border-t border-saie-divider align-top">
              <td className="px-2 py-2 font-mono font-semibold text-saie-text">{columna.nombre}</td>
              <td className="px-2 py-2 text-saie-muted">{columna.obligatorio ? 'Sí' : 'No'}</td>
              <td className="px-2 py-2 text-saie-muted">{columna.descripcion}</td>
              <td className="px-2 py-2 font-mono text-saie-muted">{columna.ejemplo}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </article>
);

/** Plantillas oficiales: encabezado exacto y una fila de ejemplo lista para editar. */
const PlantillasCarga: React.FC = () => (
  <section aria-labelledby="titulo-plantillas" className="flex flex-col gap-3">
    <div>
      <h2 id="titulo-plantillas" className="m-0 text-lg font-bold text-saie-text">
        Plantillas de carga
      </h2>
      <p className="m-0 mt-1 text-sm text-saie-muted">
        Cada plantilla trae el encabezado exacto que espera el sistema y una fila de ejemplo.
        Descárgala, reemplaza la fila por tus datos y súbela tal cual, sin cambiar el nombre de las
        columnas.
      </p>
    </div>
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      {PLANTILLAS.map((p) => (
        <TarjetaPlantilla key={p.tipo} plantilla={p} />
      ))}
    </div>
  </section>
);

export const CargaDatos: React.FC = () => (
  <LayoutAdmin
    titulo="Carga de datos maestros"
    subtitulo="Cada archivo se carga por separado y puede volver a cargarse cuando quieras."
  >
    <GuiaCarga />
    <PlantillasCarga />

    <section aria-labelledby="titulo-zonas" className="flex flex-col gap-3">
      <h2 id="titulo-zonas" className="m-0 text-lg font-bold text-saie-text">
        Cargar un archivo
      </h2>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {FLUJOS.map((f) => (
          <ZonaCarga key={f.tipo} {...f} />
        ))}
      </div>
    </section>
  </LayoutAdmin>
);

export default CargaDatos;
