import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import LayoutAdmin from '../../components/admin/LayoutAdmin';
import { VeredictoVerificacion } from '../../components/admin/VeredictoVerificacion';
import { SelectorSegmentado } from '../../components/estudiante/SelectorSegmentado';
import { Acordeon } from '../../components/ui/Acordeon';
import { Aviso } from '../../components/ui/Aviso';
import { BadgeEstado } from '../../components/ui/BadgeEstado';
import { Boton } from '../../components/ui/Boton';
import { Drawer } from '../../components/ui/Drawer';
import { PLANTILLAS, descargarPlantilla } from '../../config/plantillas';
import type { PlantillaCSV } from '../../config/plantillas';
import { usePantallaAncha } from '../../hooks/usePantallaAncha';
import { importarCsv } from '../../services/admin';
import { mensajeDeError } from '../../services/estudiante';
import type { ResultadoImportacionDTO, TipoImportacion } from '../../types/admin';
import { formatearFechaCorta } from '../../utils/admin';

/**
 * Issue 1.9 — cuatro flujos de carga independientes. Las zonas van primero y en orden; la guía
 * y las plantillas viven en un drawer para que no tapen la tarea principal. Cada zona conserva
 * su archivo, su resultado y su última carga.
 */

type EstadoFlujo = 'sin-cargar' | 'con-errores' | 'cargado';
type Ayuda = 'guia' | 'plantillas';

interface Flujo {
  tipo: TipoImportacion;
  titulo: string;
  descripcion: string;
}

const FLUJOS: Flujo[] = [
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
  {
    tipo: 'matriculas',
    titulo: '3. Matrículas',
    descripcion: 'Alumnos matriculados por sección.',
  },
  {
    tipo: 'docentes',
    titulo: '4. Docentes',
    descripcion: 'Docentes de la Facultad y sus cuentas de acceso.',
  },
];

const ETIQUETAS_PROCESADOS: Record<string, string> = {
  cursos: 'cursos',
  secciones: 'secciones',
  bloques: 'bloques de horario',
  alumnos: 'alumnos',
  matriculas: 'matrículas',
  docentes: 'docentes',
  cuentas: 'cuentas de acceso',
  asignaciones: 'asignaciones',
};

const CLAVE_ALMACEN = 'saie.carga.ultima.';

function humanizar(clave: string): string {
  return clave.replace(/([a-z])([A-Z])/g, '$1 $2').toLowerCase();
}

function textoFilasConProblemas(cantidad: number): string {
  return cantidad === 1 ? '1 fila con problemas' : `${cantidad} filas con problemas`;
}

function textoSecciones(cantidad: number): string {
  return cantidad === 1 ? '1 sección' : `${cantidad} secciones`;
}

function leerUltimaCarga(tipo: TipoImportacion): string | null {
  try {
    return localStorage.getItem(`${CLAVE_ALMACEN}${tipo}`);
  } catch {
    return null;
  }
}

function leerArchivo(archivo: File): Promise<string> {
  if (typeof archivo.text === 'function') return archivo.text();
  return new Promise((resolve, reject) => {
    const lector = new FileReader();
    lector.onload = () => resolve(String(lector.result ?? ''));
    lector.onerror = () => reject(lector.error);
    lector.readAsText(archivo);
  });
}

function descargarErrores(tipo: TipoImportacion, errores: string[]) {
  if (typeof URL.createObjectURL !== 'function') return;
  const filas = errores.map((error, indice) => `"${indice + 1}","${error.replaceAll('"', '""')}"`);
  const contenido = ['fila,error', ...filas].join('\n');
  const blob = new Blob([contenido], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const enlace = document.createElement('a');
  enlace.href = url;
  enlace.download = `errores-${tipo}.csv`;
  document.body.appendChild(enlace);
  enlace.click();
  enlace.remove();
  // Revocar en el siguiente ciclo: algunos navegadores cancelan la descarga si se revoca antes.
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

const ESTADOS_INICIALES: Record<TipoImportacion, EstadoFlujo> = {
  'cursos-secciones': 'sin-cargar',
  horarios: 'sin-cargar',
  matriculas: 'sin-cargar',
  docentes: 'sin-cargar',
};

/** Distintivo del estado de una zona de carga. */
function insigniaDeEstado(
  estado: EstadoFlujo,
  enviando: boolean,
): { tono: 'info' | 'exito' | 'advertencia' | 'neutro'; texto: string } {
  if (enviando) return { tono: 'info', texto: 'Importando' };
  if (estado === 'cargado') return { tono: 'exito', texto: 'Cargado' };
  if (estado === 'con-errores') return { tono: 'advertencia', texto: 'Con errores' };
  return { tono: 'neutro', texto: 'Sin cargar' };
}

/** Resumen de lo que hizo la asignación tras la carga. */
function textoAsignacion(asignacion: NonNullable<ResultadoImportacionDTO['asignacion']>): string {
  const resumen = asignacion.resumen;
  if (!asignacion.disparada || !resumen) {
    return `No se asignaron aulas: ${asignacion.motivo ?? 'motivo no informado'}.`;
  }
  return `Asignación de aulas: ${textoSecciones(resumen.asignadas)} con aula nueva, ${textoSecciones(resumen.mantenidas)} ${resumen.mantenidas === 1 ? 'que conserva' : 'que conservan'} la suya y ${textoSecciones(resumen.escaladas)} ${resumen.escaladas === 1 ? 'pendiente' : 'pendientes'} de revisión.`;
}

/**
 * Zona de arrastre y selección del CSV. Es un `<label>` que envuelve al input oculto, para que
 * el foco con el teclado llegue al campo de archivo (visible con el foco del navegador).
 */
const ZonaArchivo: React.FC<{
  idInput: string;
  idAyuda: string;
  archivo: File | null;
  arrastrando: boolean;
  enviando: boolean;
  onArrastrando: (valor: boolean) => void;
  onSeleccionar: (archivo: File | null) => void;
}> = ({ idInput, idAyuda, archivo, arrastrando, enviando, onArrastrando, onSeleccionar }) => (
  <>
    <label
      htmlFor={idInput}
      onDragOver={(e) => {
        e.preventDefault();
        if (!enviando) onArrastrando(true);
      }}
      onDragLeave={() => onArrastrando(false)}
      onDrop={(e) => {
        e.preventDefault();
        onArrastrando(false);
        if (!enviando) onSeleccionar(e.dataTransfer.files?.[0] ?? null);
      }}
      className={`flex min-h-28 cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed px-4 py-6 text-center text-sm transition-colors focus-within:border-saie-primary focus-within:ring-3 focus-within:ring-saie-primary/20 ${
        arrastrando
          ? 'border-saie-primary bg-saie-primary/5'
          : 'border-saie-border bg-saie-canvas hover:border-saie-primary'
      } ${enviando ? 'pointer-events-none opacity-60' : ''}`}
    >
      {archivo ? (
        <>
          <span className="max-w-full break-all font-semibold text-saie-primary">
            {archivo.name}
          </span>
          <span className="text-xs text-saie-muted">
            {(archivo.size / 1024).toFixed(1)} KB · listo para importar
          </span>
        </>
      ) : (
        <>
          <span className="font-semibold text-saie-primary">
            Arrastra tu CSV o elige un archivo
          </span>
          <span className="text-xs text-saie-muted">Máx. 10 MB · solo archivos .csv</span>
        </>
      )}
      <input
        id={idInput}
        type="file"
        accept=".csv,text/csv"
        className="sr-only"
        disabled={enviando}
        aria-describedby={idAyuda}
        onChange={(e) => onSeleccionar(e.target.files?.[0] ?? null)}
      />
    </label>
    <p id={idAyuda} className="m-0 text-xs text-saie-muted">
      Se aceptan archivos .csv de hasta 10 MB. La primera fila debe tener los nombres de las
      columnas.
    </p>

    {archivo && (
      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => onSeleccionar(null)}
          disabled={enviando}
          className="min-h-11 cursor-pointer rounded-lg px-2 text-sm font-semibold text-saie-primary hover:underline disabled:cursor-not-allowed disabled:opacity-50"
        >
          Quitar archivo
        </button>
      </div>
    )}
  </>
);

/** Resultado de la importación: resumen, errores descargables y siguiente paso. */
const PanelResultado: React.FC<{
  resultado: ResultadoImportacionDTO;
  tipo: TipoImportacion;
  onCorregir: () => void;
  onSiguiente?: () => void;
  etiquetaSiguiente?: string;
}> = ({ resultado, tipo, onCorregir, onSiguiente, etiquetaSiguiente }) => {
  const conProblemas = resultado.errores.length > 0;
  const haySiguiente = resultado.exitosa && Boolean(onSiguiente) && Boolean(etiquetaSiguiente);

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-saie-divider bg-saie-canvas p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <output className="m-0 block text-sm font-bold text-saie-text">
          {resultado.exitosa
            ? 'Carga completada sin errores'
            : `La carga tiene ${textoFilasConProblemas(resultado.errores.length)}`}
        </output>
        <BadgeEstado tono={resultado.exitosa ? 'exito' : 'advertencia'}>
          {resultado.exitosa ? 'Sin errores' : `${resultado.errores.length} con problemas`}
        </BadgeEstado>
      </div>
      <p className="m-0 text-sm text-saie-muted">
        {/*
          Cada importador genera una entrada por fila rechazada (las varias incidencias de
          validación de una misma fila se unen en un solo mensaje), así que la resta es
          exacta: son las filas que sí se guardaron.
        */}
        {resultado.filasRecibidas} filas leídas ·{' '}
        {resultado.filasRecibidas - resultado.errores.length} guardadas
        {resultado.errores.length > 0 && ` · ${resultado.errores.length} con problemas`}
      </p>

      {Object.keys(resultado.procesados).length > 0 && (
        <dl className="m-0 grid grid-cols-2 gap-2 text-sm sm:grid-cols-3">
          {Object.entries(resultado.procesados).map(([clave, valor]) => (
            <div key={clave} className="rounded-lg bg-white px-3 py-2">
              <dt className="text-xs text-saie-muted">
                {ETIQUETAS_PROCESADOS[clave] ?? humanizar(clave)}
              </dt>
              <dd className="m-0 text-lg font-bold text-saie-text">{valor}</dd>
            </div>
          ))}
        </dl>
      )}

      {conProblemas && (
        <>
          <Aviso tono="advertencia">
            {tipo !== 'docentes' && (
              <strong>No se asignaron aulas porque el archivo tiene filas con problemas. </strong>
            )}
            Corrige esas filas y sube el archivo de nuevo; las demás ya se guardaron.
          </Aviso>
          <div className="flex flex-wrap gap-2">
            <Boton
              variante="secundario"
              tamano="sm"
              onClick={() => descargarErrores(tipo, resultado.errores)}
            >
              Descargar errores (CSV)
            </Boton>
            <Boton variante="fantasma" tamano="sm" onClick={onCorregir}>
              Corregir y volver a subir
            </Boton>
          </div>
          <Acordeon
            titulo={`Ver ${textoFilasConProblemas(resultado.errores.length)}`}
            abiertoInicial
          >
            <ul className="m-0 max-h-48 list-disc overflow-auto pl-5 text-sm text-saie-text">
              {resultado.errores.map((e, i) => (
                <li key={i}>{e}</li>
              ))}
            </ul>
          </Acordeon>
        </>
      )}

      {resultado.asignacion && (
        <p className="m-0 text-sm text-saie-text">{textoAsignacion(resultado.asignacion)}</p>
      )}

      {haySiguiente && (
        <div>
          <Boton variante="secundario" tamano="sm" onClick={onSiguiente}>
            Continuar con {etiquetaSiguiente} →
          </Boton>
        </div>
      )}
    </div>
  );
};

export const ZonaCarga: React.FC<{
  tipo: TipoImportacion;
  titulo: string;
  descripcion: string;
  estado: EstadoFlujo;
  ultimaCarga: string | null;
  onEstado: (tipo: TipoImportacion, estado: EstadoFlujo, fecha: string) => void;
  onSiguiente?: () => void;
  etiquetaSiguiente?: string;
}> = ({
  tipo,
  titulo,
  descripcion,
  estado,
  ultimaCarga,
  onEstado,
  onSiguiente,
  etiquetaSiguiente,
}) => {
  const [archivo, setArchivo] = useState<File | null>(null);
  const [arrastrando, setArrastrando] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [resultado, setResultado] = useState<ResultadoImportacionDTO | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [errorArchivo, setErrorArchivo] = useState<string | null>(null);
  const idInput = `archivo-${tipo}`;
  const idAyuda = `ayuda-${tipo}`;

  function limpiarInput() {
    const input = document.getElementById(idInput) as HTMLInputElement | null;
    if (input) input.value = '';
  }

  function seleccionar(nuevo: File | null) {
    if (!nuevo) {
      setArchivo(null);
      setResultado(null);
      setError(null);
      setErrorArchivo(null);
      limpiarInput();
      return;
    }
    if (!nuevo.name.toLowerCase().endsWith('.csv')) {
      setArchivo(null);
      setErrorArchivo('El archivo debe ser un CSV (.csv).');
      setResultado(null);
      setError(null);
      limpiarInput();
      return;
    }
    if (nuevo.size > 10 * 1024 * 1024) {
      setArchivo(null);
      setErrorArchivo('El archivo no puede superar 10 MB.');
      setResultado(null);
      setError(null);
      limpiarInput();
      return;
    }
    setArchivo(nuevo);
    setErrorArchivo(null);
    setResultado(null);
    setError(null);
  }

  async function enviar() {
    if (!archivo || enviando) return;
    setEnviando(true);
    setError(null);
    setResultado(null);
    try {
      const respuesta = await importarCsv(tipo, await leerArchivo(archivo));
      setResultado(respuesta);
      onEstado(tipo, respuesta.exitosa ? 'cargado' : 'con-errores', new Date().toISOString());
    } catch (e) {
      setError(mensajeDeError(e));
    } finally {
      setEnviando(false);
      limpiarInput();
    }
  }

  function corregir() {
    setResultado(null);
    setError(null);
    setErrorArchivo(null);
    setArchivo(null);
    limpiarInput();
    document.getElementById(idInput)?.focus();
  }

  const insignia = insigniaDeEstado(estado, enviando);

  return (
    <section
      id={`carga-${tipo}`}
      tabIndex={-1}
      aria-label={titulo}
      className="flex h-full scroll-mt-24 flex-col gap-3 rounded-xl border border-saie-divider bg-white p-5 shadow-[var(--saie-shadow-1)] focus:outline-3 focus:outline-offset-2 focus:outline-saie-primary"
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <h2 className="m-0 text-base font-bold text-saie-text">{titulo}</h2>
          <p className="m-0 text-sm text-saie-muted">{descripcion}</p>
        </div>
        <BadgeEstado tono={insignia.tono}>{insignia.texto}</BadgeEstado>
      </div>
      {ultimaCarga && (
        <p className="m-0 text-xs text-saie-muted">
          Última carga: {formatearFechaCorta(ultimaCarga)}
        </p>
      )}

      <ZonaArchivo
        idInput={idInput}
        idAyuda={idAyuda}
        archivo={archivo}
        arrastrando={arrastrando}
        enviando={enviando}
        onArrastrando={setArrastrando}
        onSeleccionar={seleccionar}
      />

      {errorArchivo && <Aviso tono="error">{errorArchivo}</Aviso>}
      {error && <Aviso tono="error">{error}</Aviso>}

      <div className="mt-auto flex flex-col gap-2">
        <Boton
          onClick={enviar}
          disabled={!archivo || enviando}
          cargando={enviando}
          textoCargando="Importando…"
          anchoCompleto
          motivoDeshabilitado={
            !archivo ? 'Elige un archivo para habilitar la importación.' : undefined
          }
        >
          Importar
        </Boton>
      </div>

      {resultado && (
        <PanelResultado
          resultado={resultado}
          tipo={tipo}
          onCorregir={corregir}
          onSiguiente={onSiguiente}
          etiquetaSiguiente={etiquetaSiguiente}
        />
      )}

      {resultado?.asignacion?.resumen && (
        <VeredictoVerificacion verificacion={resultado.asignacion.resumen.verificacion} />
      )}
    </section>
  );
};

const ERRORES_FRECUENTES = [
  {
    mensaje: 'No existe la sección … para el curso … en el periodo …',
    causa: 'Se cargaron horarios o matrículas antes que las secciones.',
    accion: 'Carga primero «Cursos y secciones» de ese periodo.',
  },
  {
    mensaje: 'El software no está registrado',
    causa: 'El nombre del software no existe en el catálogo.',
    accion: 'Da de alta el software en el catálogo o corrige el nombre.',
  },
  {
    mensaje: 'La hora de inicio debe ser menor a la hora de fin',
    causa: 'Bloque con las horas invertidas.',
    accion: 'Corrige la hora de inicio y la hora de fin.',
  },
  {
    mensaje: 'Correo electrónico inválido',
    causa: 'El correo está mal escrito o trae espacios.',
    accion: 'Corrige la columna del correo.',
  },
  {
    mensaje: 'Fila N: …',
    causa: 'Esa fila no se guarda; el resto del archivo sí.',
    accion: 'Corrige la fila y vuelve a subir el archivo (no duplica nada).',
  },
];

/** Guía de carga: orden, periodos, qué hace el sistema y formatos admitidos. */
const GuiaCarga: React.FC = () => (
  <Acordeon titulo="¿Cómo funciona la carga?">
    <div className="flex flex-col gap-6">
      <section>
        <h3 className="m-0 text-base font-bold text-saie-text">1. Orden de carga</h3>
        <ol className="m-0 mt-2 pl-5">
          <li>
            <strong>Cursos y secciones.</strong> Crea el catálogo de cursos y sus secciones del
            periodo. Es el primero porque los otros archivos buscan la sección por curso, sección y
            periodo.
          </li>
          <li>
            <strong>Horarios.</strong> Asigna el día y la hora de cada bloque. Si la sección todavía
            no existe, la fila no se guarda.
          </li>
          <li>
            <strong>Matrículas.</strong> Registra los alumnos por sección. Si el archivo marca que
            se cree la cuenta de acceso, el alumno podrá entrar con su código como clave inicial.
          </li>
          <li>
            <strong>Docentes</strong> (opcional). Registra docentes y sus cuentas de acceso.
          </li>
        </ol>
        <p className="m-0 mt-3">
          Los cuatro archivos son independientes y se pueden volver a subir cuando quieras: los
          datos se actualizan en vez de duplicarse. Si subes horarios o matrículas antes que las
          secciones, verás el error «No existe la sección … para el curso … en el periodo …».
        </p>
      </section>

      <section>
        <h3 className="m-0 text-base font-bold text-saie-text">2. El periodo académico</h3>
        <p className="m-0 mt-2">
          Cada fila lleva su <strong>periodo</strong> (por ejemplo, 2026-2). Un mismo curso puede
          existir en varios periodos a la vez: el periodo no se borra, se agrega.
        </p>
        <p className="m-0 mt-3">
          El <strong>periodo actual</strong> es el semestre que el sistema está asignando.
          Normalmente es el más reciente que hayas cargado; si tu institución lo fija manualmente,
          se usa el valor que haya configurado la persona administradora.
        </p>
        <ul className="m-0 mt-3 pl-5">
          <li>
            <strong>Volver a subir el semestre en curso:</strong> usa los mismos archivos y el mismo
            periodo. Las secciones, horarios y matrículas se actualizan en el sitio y las
            asignaciones que siguen siendo válidas se conservan.
          </li>
          <li>
            <strong>Abrir un semestre nuevo:</strong> sube los archivos con el nuevo periodo (por
            ejemplo, 2027-1). Se agregan las secciones nuevas y los datos del semestre anterior
            quedan intactos. Como el nuevo periodo es el más reciente, pasa a ser el actual.
          </li>
          <li>
            <strong>Asignar un semestre anterior:</strong> pídele a la persona administradora que
            indique el periodo actual; no lo cambies desde la carga.
          </li>
        </ul>
      </section>

      <section>
        <h3 className="m-0 text-base font-bold text-saie-text">
          3. Qué hace el sistema después de cada carga
        </h3>
        <p className="m-0 mt-2">
          Si la carga termina sin filas con problemas, el sistema{' '}
          <strong>asigna las aulas del periodo actual</strong>. La asignación solo se hace si ese
          periodo ya tiene secciones, horarios y matrículas cargados; si falta algo, el resultado lo
          explica.
        </p>
        <p className="m-0 mt-3">
          Puedes repetir la asignación sin miedo: no duplica aulas, conserva lo que sigue siendo
          válido y recalcula lo demás. También puedes iniciarla manualmente desde{' '}
          <strong>Inicio → «Asignar aulas del periodo»</strong> y volver a intentarlo con una
          sección que necesite revisión.
        </p>
      </section>

      <section>
        <h3 className="m-0 text-base font-bold text-saie-text">4. Formatos admitidos</h3>
        <ul className="m-0 mt-2 pl-5">
          <li>
            CSV con una primera fila de títulos. Separador coma o punto y coma (Excel en español
            suele usar punto y coma).
          </li>
          <li>
            Máximo <strong>20 000 filas</strong> y <strong>10 MB</strong> por envío.
          </li>
          <li>Para los campos de sí o no, escribe «sí» o «no».</li>
          <li>
            Horas en formato de 24 horas (HH:mm); la hora de fin debe ser posterior a la de inicio.
          </li>
          <li>Días: lunes a domingo (se aceptan minúsculas y sin tilde).</li>
          <li>Tipo de espacio: aula teórica o laboratorio.</li>
          <li>Si una sección requiere varios programas, sepáralos con una barra vertical (|).</li>
        </ul>
      </section>

      <section>
        <h3 className="m-0 text-base font-bold text-saie-text">5. Errores frecuentes</h3>
        <div className="mt-2 flex flex-col gap-3">
          {ERRORES_FRECUENTES.map((e) => (
            <div
              key={e.mensaje}
              className="rounded-lg border border-saie-divider bg-saie-canvas p-3"
            >
              <p className="m-0 font-semibold text-saie-text">{e.mensaje}</p>
              <p className="m-0 mt-1 text-sm">
                <strong>Causa:</strong> {e.causa}
              </p>
              <p className="m-0 text-sm">
                <strong>Qué hacer:</strong> {e.accion}
              </p>
            </div>
          ))}
        </div>
      </section>
    </div>
  </Acordeon>
);

/** Tarjeta de una plantilla: descarga del CSV y detalle de sus columnas. */
const TarjetaPlantilla: React.FC<{ plantilla: PlantillaCSV }> = ({ plantilla }) => {
  // En pantallas estrechas las columnas se apilan en una lista: una tabla de cuatro columnas no
  // cabe a 320 px. Solo existe una de las dos versiones en el DOM.
  const esPantallaAncha = usePantallaAncha(640);

  return (
    <article className="flex flex-col gap-3 rounded-xl border border-saie-divider bg-white p-5 shadow-[var(--saie-shadow-1)]">
      <header className="flex flex-col gap-1">
        <h3 className="m-0 text-base font-bold text-saie-text">{plantilla.titulo}</h3>
        <p className="m-0 text-sm text-saie-muted">{plantilla.descripcion}</p>
      </header>

      <div>
        <Boton variante="secundario" tamano="sm" onClick={() => descargarPlantilla(plantilla)}>
          <span aria-hidden="true">↓</span> Descargar plantilla
        </Boton>
      </div>

      <Acordeon titulo={`Ver columnas (${plantilla.columnas.length})`}>
        {esPantallaAncha ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-saie-canvas uppercase tracking-wide text-saie-muted">
                <tr>
                  <th scope="col" className="px-2 py-2">
                    Columna
                  </th>
                  <th scope="col" className="px-2 py-2">
                    Obligatoria
                  </th>
                  <th scope="col" className="px-2 py-2">
                    Qué es
                  </th>
                  <th scope="col" className="px-2 py-2">
                    Ejemplo
                  </th>
                </tr>
              </thead>
              <tbody>
                {plantilla.columnas.map((columna) => (
                  <tr key={columna.nombre} className="border-t border-saie-divider align-top">
                    <td className="px-2 py-2 font-mono font-semibold text-saie-text">
                      {columna.nombre}
                    </td>
                    <td className="px-2 py-2 text-saie-muted">
                      {columna.obligatorio ? 'Sí' : 'No'}
                    </td>
                    <td className="px-2 py-2 text-saie-muted">{columna.descripcion}</td>
                    <td className="px-2 py-2 font-mono text-saie-muted">{columna.ejemplo}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <dl className="m-0 flex flex-col gap-3">
            {plantilla.columnas.map((columna) => (
              <div
                key={columna.nombre}
                className="rounded-lg border border-saie-divider bg-saie-canvas p-3"
              >
                <dt className="font-mono font-semibold text-saie-text">
                  {columna.nombre}{' '}
                  <span className="font-sans text-xs font-normal text-saie-muted">
                    ({columna.obligatorio ? 'obligatoria' : 'opcional'})
                  </span>
                </dt>
                <dd className="m-0 mt-1 text-sm text-saie-text">
                  {columna.descripcion}
                  <span className="mt-1 block font-mono text-xs text-saie-muted">
                    Ejemplo: {columna.ejemplo}
                  </span>
                </dd>
              </div>
            ))}
          </dl>
        )}
      </Acordeon>
    </article>
  );
};

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
    <div className="grid grid-cols-1 gap-4">
      {PLANTILLAS.map((p) => (
        <TarjetaPlantilla key={p.tipo} plantilla={p} />
      ))}
    </div>
  </section>
);

const OPCIONES_AYUDA = [
  { valor: 'guia' as const, etiqueta: 'Guía' },
  { valor: 'plantillas' as const, etiqueta: 'Plantillas' },
];

export const CargaDatos: React.FC = () => {
  const { hash } = useLocation();
  const [guiaAbierta, setGuiaAbierta] = useState(false);
  const [pestanaAyuda, setPestanaAyuda] = useState<Ayuda>('guia');
  const [estados, setEstados] = useState<Record<TipoImportacion, EstadoFlujo>>(ESTADOS_INICIALES);
  const [ultimas, setUltimas] = useState<Record<TipoImportacion, string | null>>(() => ({
    'cursos-secciones': leerUltimaCarga('cursos-secciones'),
    horarios: leerUltimaCarga('horarios'),
    matriculas: leerUltimaCarga('matriculas'),
    docentes: leerUltimaCarga('docentes'),
  }));

  function marcarEstado(tipo: TipoImportacion, estado: EstadoFlujo, fecha: string) {
    setEstados((prev) => ({ ...prev, [tipo]: estado }));
    setUltimas((prev) => ({ ...prev, [tipo]: fecha }));
    try {
      localStorage.setItem(`${CLAVE_ALMACEN}${tipo}`, fecha);
    } catch {
      // El almacenamiento puede estar deshabilitado; la pantalla sigue funcionando.
    }
  }

  function irAZona(tipo: TipoImportacion) {
    const zona = document.getElementById(`carga-${tipo}`);
    if (!zona) return;
    zona.scrollIntoView?.({ behavior: 'smooth', block: 'start' });
    zona.focus({ preventScroll: true });
  }

  // Enlace profundo desde el motivo de escalamiento (p. ej. «Cargar horario» → #carga-horarios).
  useEffect(() => {
    if (!hash) return;
    const destino = document.getElementById(hash.slice(1));
    destino?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [hash]);

  return (
    <LayoutAdmin
      titulo="Carga de datos"
      subtitulo="Sube un archivo por vez. Cada carga es independiente y se puede repetir."
      acciones={
        <Boton variante="secundario" onClick={() => setGuiaAbierta(true)}>
          Guía y plantillas
        </Boton>
      }
    >
      <p className="m-0 rounded-xl border border-saie-divider bg-white px-4 py-3 text-sm text-saie-muted">
        Sigue el orden 1 → 2 → 3 → 4. Si un archivo tiene filas con problemas, las demás sí se
        guardan, pero no se asignan aulas en ese periodo.
      </p>

      <section aria-labelledby="titulo-zonas" className="flex flex-col gap-3">
        <h2 id="titulo-zonas" className="m-0 text-lg font-bold text-saie-text">
          Cargar un archivo
        </h2>
        <div className="grid grid-cols-1 items-stretch gap-4 lg:grid-cols-2">
          {FLUJOS.map((flujo, indice) => {
            const siguiente = FLUJOS[indice + 1];
            return (
              <ZonaCarga
                key={flujo.tipo}
                {...flujo}
                estado={estados[flujo.tipo]}
                ultimaCarga={ultimas[flujo.tipo]}
                onEstado={marcarEstado}
                onSiguiente={siguiente ? () => irAZona(siguiente.tipo) : undefined}
                etiquetaSiguiente={
                  siguiente ? siguiente.titulo.replace(/^\d+\.\s*/, '') : undefined
                }
              />
            );
          })}
        </div>
      </section>

      <Drawer
        abierto={guiaAbierta}
        onCerrar={() => setGuiaAbierta(false)}
        titulo="Guía y plantillas"
      >
        <div className="flex flex-col gap-4">
          <SelectorSegmentado<Ayuda>
            opciones={OPCIONES_AYUDA}
            valor={pestanaAyuda}
            onCambiar={setPestanaAyuda}
            etiquetaGrupo="Contenido de ayuda"
            className="w-full"
          />
          {pestanaAyuda === 'guia' ? <GuiaCarga /> : <PlantillasCarga />}
        </div>
      </Drawer>
    </LayoutAdmin>
  );
};

export default CargaDatos;
