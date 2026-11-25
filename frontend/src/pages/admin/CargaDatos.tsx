import React, { useEffect, useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { RUTAS } from '../../config/rutas';
import LayoutAdmin from '../../components/admin/LayoutAdmin';
import { VeredictoVerificacion } from '../../components/admin/VeredictoVerificacion';
import { SelectorSegmentado } from '../../components/ui/SelectorSegmentado';
import { idPanelPestana, idPestana } from '../../components/ui/idsPestanas';
import { Acordeon } from '../../components/ui/Acordeon';
import { Aviso } from '../../components/ui/Aviso';
import { BadgeEstado } from '../../components/ui/BadgeEstado';
import { Boton } from '../../components/ui/Boton';
import { DialogoConfirmacion } from '../../components/ui/DialogoConfirmacion';
import { Drawer } from '../../components/ui/Drawer';
import { PLANTILLAS, descargarPlantilla } from '../../config/plantillas';
import type { PlantillaCSV } from '../../config/plantillas';
import { useAccion } from '../../hooks/useAccion';
import { useCarga } from '../../hooks/useCarga';
import {
  importarCsv,
  obtenerUltimasImportaciones,
  obtenerVistaPreviaImportacion,
} from '../../services/admin';
import type {
  ResultadoImportacionDTO,
  TipoImportacion,
  UltimaImportacionDTO,
  VistaPreviaImportacionDTO,
} from '../../types/admin';
import { leerArchivoCsv } from '../../utils/archivoCsv';
import { textoAvanceImportacion } from '../../utils/admin';
import { agruparErroresPorTipo } from '../../utils/erroresImportacion';
import { formatearFechaCorta } from '../../utils/fechas';
import { plural } from '../../utils/texto';

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

/** Última carga de un tipo: fecha, resultado y de dónde sale el dato. */
interface UltimaCarga {
  fecha: string;
  estado: Exclude<EstadoFlujo, 'sin-cargar'>;
  /**
   * `servidor`: registrada en la base (Issue 4.54), la misma para cualquier navegador y persona.
   * `navegador`: respaldo local cuando el servidor no responde; la pantalla lo rotula así.
   */
  origen: 'servidor' | 'navegador';
  /** Quién la cargó, si el servidor lo sabe. */
  cuenta?: string | null;
}

/** Issue 4.55 — la última carga según el servidor, con su resultado y quién la hizo. */
function desdeServidor(u: UltimaImportacionDTO): UltimaCarga {
  return {
    fecha: u.fecha,
    estado: u.resultado === 'EXITOSA' ? 'cargado' : 'con-errores',
    origen: 'servidor',
    cuenta: u.cuenta?.nombre ?? null,
  };
}

/**
 * Respaldo local (Issue 4.55): si el servidor no responde, se usa la última carga recordada en
 * este navegador, junto con su resultado para que el distintivo y la fecha no se contradigan
 * («Sin cargar» con una fecha de última carga). Las entradas antiguas (solo la fecha) se leen
 * como una carga correcta.
 */
function leerUltimaCarga(tipo: TipoImportacion): UltimaCarga | null {
  try {
    const crudo = localStorage.getItem(`${CLAVE_ALMACEN}${tipo}`);
    if (!crudo) return null;
    if (crudo.startsWith('{')) {
      const valor = JSON.parse(crudo) as Partial<UltimaCarga>;
      if (typeof valor.fecha !== 'string') return null;
      return {
        fecha: valor.fecha,
        estado: valor.estado === 'con-errores' ? 'con-errores' : 'cargado',
        origen: 'navegador',
      };
    }
    return Number.isNaN(Date.parse(crudo))
      ? null
      : { fecha: crudo, estado: 'cargado', origen: 'navegador' };
  } catch {
    return null;
  }
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

/** Distintivo del estado de una zona de carga. */
function insigniaDeEstado(
  estado: EstadoFlujo,
  enviando: boolean,
  consultando = false,
): { tono: 'info' | 'exito' | 'advertencia' | 'neutro'; texto: string } {
  if (enviando) return { tono: 'info', texto: 'Importando' };
  // Mientras llega la respuesta del servidor no se afirma «Sin cargar»: puede haber una carga.
  if (consultando && estado === 'sin-cargar') return { tono: 'neutro', texto: 'Consultando…' };
  if (estado === 'cargado') return { tono: 'exito', texto: 'Cargado' };
  if (estado === 'con-errores') return { tono: 'advertencia', texto: 'Con errores' };
  return { tono: 'neutro', texto: 'Sin cargar' };
}

/** Resumen de lo que hizo la asignación tras la carga. */
/**
 * Filas que quedaron guardadas. Desde el Issue 1.16 la carga es «todo o nada»: con algún error no
 * se guarda ninguna. Si el backend todavía no informa `guardadas`, se usa el cálculo anterior.
 */
function filasGuardadas(resultado: ResultadoImportacionDTO): number {
  if (resultado.guardadas === undefined) return resultado.filasRecibidas - resultado.errores.length;
  if (resultado.parcial) return Math.max(0, resultado.filasRecibidas - resultado.errores.length);
  return resultado.guardadas ? resultado.filasRecibidas : 0;
}

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
          <span className="text-sm text-saie-muted">
            {(archivo.size / 1024).toFixed(1)} KB · listo para importar
          </span>
        </>
      ) : (
        <>
          <span className="font-semibold text-saie-primary">
            Arrastra tu CSV o elige un archivo
          </span>
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
    <p id={idAyuda} className="m-0 text-sm text-saie-muted">
      Se aceptan archivos .csv de hasta 10 MB. La primera fila debe tener los nombres de las
      columnas.
    </p>

    {archivo && (
      <div className="flex justify-end">
        <Boton
          variante="fantasma"
          tamano="sm"
          onClick={() => onSeleccionar(null)}
          disabled={enviando}
        >
          Quitar archivo
        </Boton>
      </div>
    )}
  </>
);

/** Resultado de la importación dentro del drawer: resumen, errores descargables y pasos. */
const PanelResultado: React.FC<{
  resultado: ResultadoImportacionDTO;
  tipo: TipoImportacion;
  onCorregir: () => void;
}> = ({ resultado, tipo, onCorregir }) => {
  const conProblemas = resultado.errores.length > 0;

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-saie-divider bg-saie-canvas p-4">
      {/*
        El resumen («N filas leídas · M guardadas») está una sola vez, en la tarjeta de la zona
        de carga. Aquí solo va el detalle (Issue 4.53). Desde el Issue 1.16 la carga es «todo o
        nada»: si hay errores no se guarda ninguna fila.
      */}
      {Object.keys(resultado.procesados).length > 0 && (
        <dl className="m-0 grid grid-cols-2 gap-2 text-sm sm:grid-cols-3">
          {Object.entries(resultado.procesados).map(([clave, valor]) => (
            <div key={clave} className="rounded-lg bg-white px-3 py-2">
              <dt className="text-sm text-saie-muted">
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
            {resultado.parcial ? (
              <>
                <strong>El archivo falló a medias: las filas sin problema ya se guardaron. </strong>
                Corrige las filas de la lista y sube el archivo de nuevo; repetir la carga no
                duplica datos
              </>
            ) : (
              <>
                <strong>
                  No se guardó ninguna fila porque el archivo tiene filas con problemas.{' '}
                </strong>
                Corrige todas las filas de la lista y sube el archivo de nuevo
              </>
            )}
            {tipo !== 'docentes' ? '; después se asignarán las aulas.' : '.'}
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
          <ErroresAgrupados errores={resultado.errores} />
        </>
      )}

      {resultado.advertencias && resultado.advertencias.length > 0 && (
        <Aviso tono="info">
          <strong>Revisa estos avisos. </strong>
          El archivo se guardó, pero conviene revisarlos:
          <ul className="m-0 mt-1 list-disc pl-5">
            {resultado.advertencias.slice(0, FILAS_POR_GRUPO).map((a) => (
              <li key={a}>{a}</li>
            ))}
          </ul>
          {resultado.advertencias.length > FILAS_POR_GRUPO && (
            <p className="m-0 mt-1">
              Y {resultado.advertencias.length - FILAS_POR_GRUPO} aviso(s) más.
            </p>
          )}
        </Aviso>
      )}

      {resultado.asignacion && (
        <p className="m-0 text-sm text-saie-text">{textoAsignacion(resultado.asignacion)}</p>
      )}
    </div>
  );
};

/** Cuántas filas de cada tipo de error se listan; el resto se descarga en el CSV. */
const FILAS_POR_GRUPO = 20;

/**
 * Los errores de la importación agrupados por tipo, con su conteo (Issue 4.53). Cada grupo muestra
 * solo sus primeras filas: un archivo de miles de filas con problemas no debe pintar miles de
 * líneas. «Descargar errores (CSV)» trae todos.
 */
const ErroresAgrupados: React.FC<{ errores: string[] }> = ({ errores }) => {
  const grupos = useMemo(() => agruparErroresPorTipo(errores), [errores]);
  return (
    <div className="flex flex-col gap-2">
      {grupos.map((grupo, i) => (
        <Acordeon
          key={grupo.tipo}
          titulo={`${grupo.tipo} (${textoFilasConProblemas(grupo.errores.length)})`}
          abiertoInicial={i === 0}
        >
          <ul className="m-0 list-disc pl-5 text-sm text-saie-text">
            {grupo.errores.slice(0, FILAS_POR_GRUPO).map((e, j) => (
              <li key={j}>{e}</li>
            ))}
          </ul>
          {grupo.errores.length > FILAS_POR_GRUPO && (
            <p className="m-0 mt-2 text-sm text-saie-muted">
              Se muestran las primeras {FILAS_POR_GRUPO} de {grupo.errores.length}. Descarga el CSV
              para ver todas.
            </p>
          )}
        </Acordeon>
      ))}
    </div>
  );
};

/**
 * Resumen compacto del resultado que vive dentro de la tarjeta. El detalle completo (procesados,
 * errores descargables y veredicto) abre un drawer con un clic: así la carga de un archivo no
 * apila el resultado hacia abajo ni desplaza las demás zonas.
 */
const ResumenResultado: React.FC<{
  resultado: ResultadoImportacionDTO;
  onSiguiente?: () => void;
  etiquetaSiguiente?: string;
  onAbrir: () => void;
}> = ({ resultado, onSiguiente, etiquetaSiguiente, onAbrir }) => {
  const haySiguiente = resultado.exitosa && Boolean(onSiguiente) && Boolean(etiquetaSiguiente);

  return (
    <div className="flex flex-col gap-2 rounded-xl border border-saie-divider bg-saie-canvas p-3">
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
        {resultado.filasRecibidas} filas leídas · {filasGuardadas(resultado)} guardadas
        {resultado.errores.length > 0 && ` · ${resultado.errores.length} con problemas`}
        {(resultado.advertencias?.length ?? 0) > 0 &&
          ` · ${resultado.advertencias!.length} ${resultado.advertencias!.length === 1 ? 'aviso' : 'avisos'}`}
      </p>
      {resultado.asignacion && (
        <p className="m-0 text-sm text-saie-text">{textoAsignacion(resultado.asignacion)}</p>
      )}
      <div className="flex flex-wrap gap-2">
        <Boton variante="secundario" tamano="sm" onClick={onAbrir}>
          Ver el resultado completo
        </Boton>
        {haySiguiente && (
          <Boton variante="primario" tamano="sm" onClick={onSiguiente}>
            Continuar con {etiquetaSiguiente} →
          </Boton>
        )}
      </div>
    </div>
  );
};

/** Cuántos retiros se listan en la confirmación; el resto se resume. */
const MAX_RETIROS_VISIBLES = 8;

/** Lo que la importación cambiaría (Issue 1.17): frases y, si se quita algo, qué se quita. */
export const DescripcionVistaPrevia: React.FC<{ vista: VistaPreviaImportacionDTO }> = ({
  vista,
}) => {
  const restantes = vista.retiros.length - MAX_RETIROS_VISIBLES;
  return (
    <div className="flex flex-col gap-3">
      <ul className="m-0 flex list-disc flex-col gap-1 pl-5">
        {vista.frases.map((frase) => (
          <li key={frase}>{frase}.</li>
        ))}
      </ul>
      {vista.retiros.length > 0 && (
        <div className="flex flex-col gap-1">
          <p className="m-0 font-semibold">Se quitará:</p>
          <ul className="m-0 flex list-none flex-col gap-0.5 p-0 text-saie-muted">
            {vista.retiros.slice(0, MAX_RETIROS_VISIBLES).map((r) => (
              <li key={r}>{r}</li>
            ))}
          </ul>
          {restantes > 0 && (
            <p className="m-0 text-saie-muted">
              y {plural(restantes, 'cambio más', 'cambios más')}.
            </p>
          )}
        </div>
      )}
      {vista.advertencias.length > 0 && (
        <p className="m-0 text-saie-muted">
          {plural(vista.advertencias.length, 'aviso', 'avisos')}: los verás en el resultado.
        </p>
      )}
    </div>
  );
};

export const ZonaCarga: React.FC<{
  tipo: TipoImportacion;
  titulo: string;
  descripcion: string;
  estado: EstadoFlujo;
  ultimaCarga: UltimaCarga | null;
  /** `true` mientras se consulta la última carga al servidor. */
  consultando?: boolean;
  onEstado: (tipo: TipoImportacion, estado: EstadoFlujo, fecha: string) => void;
  onSiguiente?: () => void;
  etiquetaSiguiente?: string;
}> = ({
  tipo,
  titulo,
  descripcion,
  estado,
  ultimaCarga,
  consultando = false,
  onEstado,
  onSiguiente,
  etiquetaSiguiente,
}) => {
  const [archivo, setArchivo] = useState<File | null>(null);
  const [arrastrando, setArrastrando] = useState(false);
  const { ejecutar } = useAccion();
  const [enviando, setEnviando] = useState(false);
  const [avance, setAvance] = useState<{ procesadas: number; total: number } | null>(null);
  const [resultado, setResultado] = useState<ResultadoImportacionDTO | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [errorArchivo, setErrorArchivo] = useState<string | null>(null);
  // El detalle del resultado vive en un drawer: la tarjeta solo conserva el resumen.
  const [detalleAbierto, setDetalleAbierto] = useState(false);
  // Issue 1.17: vista previa a la espera de que Coordinación la confirme.
  const [previa, setPrevia] = useState<{
    contenido: string;
    vista: VistaPreviaImportacionDTO;
  } | null>(null);
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

  /**
   * Issue 1.17 (R35): antes de importar se pide la vista previa (qué se agrega, qué se quita y qué
   * secciones quedan inactivas) y Coordinación la confirma. Si el archivo tiene errores no hay
   * nada que confirmar: se importa directamente y el resultado los lista, como antes.
   */
  async function enviar() {
    if (!archivo || enviando) return;
    setEnviando(true);
    setError(null);
    setResultado(null);
    setAvance(null);
    const salida = await ejecutar(
      async () => {
        const contenido = await leerArchivoCsv(archivo);
        return { contenido, vista: await obtenerVistaPreviaImportacion(tipo, contenido) };
      },
      { avisarError: false },
    );
    if (!salida?.ok) {
      if (salida) setError(salida.error);
      setEnviando(false);
      return;
    }
    if (salida.valor.vista.errores.length > 0) {
      await importar(salida.valor.contenido);
      return;
    }
    setPrevia(salida.valor);
    setEnviando(false);
  }

  async function importar(contenido: string) {
    setEnviando(true);
    setAvance(null);
    // El error se muestra en línea, junto a la zona de carga.
    const salida = await ejecutar(
      () => importarCsv(tipo, contenido, (procesadas, total) => setAvance({ procesadas, total })),
      { avisarError: false },
    );
    setAvance(null);
    if (salida?.ok) {
      setResultado(salida.valor);
      onEstado(tipo, salida.valor.exitosa ? 'cargado' : 'con-errores', new Date().toISOString());
    } else if (salida) {
      setError(salida.error);
    }
    setEnviando(false);
    limpiarInput();
  }

  function confirmarPrevia() {
    if (!previa) return;
    const { contenido } = previa;
    setPrevia(null);
    void importar(contenido);
  }

  function corregir() {
    setResultado(null);
    setError(null);
    setErrorArchivo(null);
    setArchivo(null);
    setDetalleAbierto(false);
    limpiarInput();
    // Tras el cierre del drawer, este devuelve el foco a quien lo abrió (que ya no existe):
    // el foco manda al campo de archivo, que es el siguiente paso natural.
    setTimeout(() => document.getElementById(idInput)?.focus(), 0);
  }

  const insignia = insigniaDeEstado(estado, enviando, consultando);

  return (
    <section
      id={`carga-${tipo}`}
      tabIndex={-1}
      aria-label={titulo}
      aria-busy={enviando}
      className="flex h-full scroll-mt-24 flex-col gap-3 rounded-xl border border-saie-divider bg-white p-5 shadow-sm focus:outline-3 focus:outline-offset-2 focus:outline-saie-primary"
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <h2 className="m-0 text-base font-bold text-saie-text">{titulo}</h2>
          <p className="m-0 text-sm text-saie-muted">{descripcion}</p>
        </div>
        <BadgeEstado tono={insignia.tono}>{insignia.texto}</BadgeEstado>
      </div>
      {ultimaCarga && (
        <p className="m-0 text-sm text-saie-muted">
          {ultimaCarga.origen === 'servidor'
            ? `Última carga: ${formatearFechaCorta(ultimaCarga.fecha)}${
                ultimaCarga.cuenta ? ` · ${ultimaCarga.cuenta}` : ''
              }`
            : `Última carga en este navegador: ${formatearFechaCorta(ultimaCarga.fecha)}`}
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

      {/* Región viva siempre presente: si se montara con el texto, el lector no lo anunciaría. */}
      <p role="status" className={enviando ? 'm-0 text-sm text-saie-muted' : 'sr-only'}>
        {enviando ? textoAvanceImportacion(avance) : ''}
      </p>
      {errorArchivo && <Aviso tono="error">{errorArchivo}</Aviso>}
      {error && <Aviso tono="error">{error}</Aviso>}

      <div className="mt-auto flex flex-col gap-2">
        <Boton
          // Solo la zona con archivo elegido tiene el botón principal: las cuatro cargas son
          // independientes y la vista no debe tener cuatro primarios a la vez.
          variante={archivo ? 'primario' : 'secundario'}
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
        <ResumenResultado
          resultado={resultado}
          onSiguiente={onSiguiente}
          etiquetaSiguiente={etiquetaSiguiente}
          onAbrir={() => setDetalleAbierto(true)}
        />
      )}

      <DialogoConfirmacion
        abierto={previa !== null}
        titulo="¿Importar este archivo?"
        descripcion={previa && <DescripcionVistaPrevia vista={previa.vista} />}
        textoConfirmar="Confirmar e importar"
        variante={previa && previa.vista.retiros.length > 0 ? 'peligro' : 'primario'}
        onConfirmar={confirmarPrevia}
        onCancelar={() => setPrevia(null)}
      />

      {/*
        El detalle del resultado (procesados, errores descargables y veredicto del verificador)
        se consulta bajo demanda en el drawer: no se apila dentro de la tarjeta ni desplaza
        las demás zonas de carga hacia abajo.
      */}
      <Drawer
        abierto={detalleAbierto}
        onCerrar={() => setDetalleAbierto(false)}
        titulo="Resultado de la carga"
        subtitulo={titulo}
      >
        {resultado ? (
          <div className="flex flex-col gap-4">
            <PanelResultado resultado={resultado} tipo={tipo} onCorregir={corregir} />
            {resultado.asignacion?.resumen?.verificacion && (
              <VeredictoVerificacion verificacion={resultado.asignacion.resumen.verificacion} />
            )}
          </div>
        ) : null}
      </Drawer>
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
          Cada fila lleva su <strong>periodo</strong> (por ejemplo, 2026-2; también se acepta
          2026-II). Solo se puede cargar en un periodo <strong>registrado</strong> en la pantalla{' '}
          <Link to={RUTAS.periodosAdmin}>Periodos</Link> que no esté cerrado.
        </p>
        <p className="m-0 mt-3">
          El <strong>periodo vigente</strong> es el semestre que el sistema asigna y que ven alumnos
          y docentes. Cargar datos nunca lo cambia: solo cambia al activar otro periodo en Periodos.
        </p>
        <ul className="m-0 mt-3 pl-5">
          <li>
            <strong>Volver a subir el semestre en curso:</strong> usa el mismo periodo. Para cada
            sección incluida en el archivo, sus matrículas y horarios pasan a ser exactamente los
            del archivo: los alumnos que ya no figuran quedan retirados. Las asignaciones que siguen
            siendo válidas se conservan.
          </li>
          <li>
            <strong>Preparar un semestre nuevo:</strong> registra primero el periodo (por ejemplo,
            2027-1) en Periodos y luego sube sus archivos. Queda en preparación: nadie lo ve hasta
            que lo actives.
          </li>
          <li>
            <strong>Semestres cerrados:</strong> son de solo consulta; la carga los rechaza.
          </li>
        </ul>
      </section>

      <section>
        <h3 className="m-0 text-base font-bold text-saie-text">
          3. Qué hace el sistema después de cada carga
        </h3>
        <p className="m-0 mt-2">
          Si la carga termina sin filas con problemas, el sistema{' '}
          <strong>asigna las aulas del periodo vigente</strong>. La asignación solo se hace si ese
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
  return (
    <article className="flex flex-col gap-3 rounded-xl border border-saie-divider bg-white p-5 shadow-sm">
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
        {/* Tabla desde `sm` y lista apilada por debajo: una tabla de cuatro columnas no cabe a 320 px. */}
        <div className="hidden overflow-x-auto sm:block">
          <table className="w-full text-left text-sm">
            <thead className="bg-saie-canvas text-saie-muted">
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
                  <td className="px-2 py-2 text-saie-muted">{columna.obligatorio ? 'Sí' : 'No'}</td>
                  <td className="px-2 py-2 text-saie-muted">{columna.descripcion}</td>
                  <td className="px-2 py-2 font-mono text-saie-muted">{columna.ejemplo}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <dl className="m-0 flex flex-col gap-3 sm:hidden">
          {plantilla.columnas.map((columna) => (
            <div
              key={columna.nombre}
              className="rounded-lg border border-saie-divider bg-saie-canvas p-3"
            >
              <dt className="font-mono font-semibold text-saie-text">
                {columna.nombre}{' '}
                <span className="font-sans text-sm font-normal text-saie-muted">
                  ({columna.obligatorio ? 'obligatoria' : 'opcional'})
                </span>
              </dt>
              <dd className="m-0 mt-1 text-sm text-saie-text">
                {columna.descripcion}
                <span className="mt-1 block font-mono text-sm text-saie-muted">
                  Ejemplo: {columna.ejemplo}
                </span>
              </dd>
            </div>
          ))}
        </dl>
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
  // Issue 4.55: la última carga sale del servidor, igual en cualquier navegador y para cualquier
  // persona de Coordinación. El estado de cada zona sale de la misma fuente que su fecha: nunca
  // «Sin cargar» con fecha.
  const servidor = useCarga(obtenerUltimasImportaciones, { clave: 'importaciones:ultima' });
  // Cargas hechas en esta visita: se muestran al instante, sin esperar a que el servidor responda.
  const [deEstaVisita, setDeEstaVisita] = useState<Partial<Record<TipoImportacion, UltimaCarga>>>(
    {},
  );
  const consultando = servidor.cargando && servidor.datos === null;

  function ultimaDe(tipo: TipoImportacion): UltimaCarga | null {
    const reciente = deEstaVisita[tipo] ?? null;
    if (servidor.datos) {
      const registrada = servidor.datos[tipo];
      const delServidor = registrada ? desdeServidor(registrada) : null;
      if (
        reciente &&
        (!delServidor || Date.parse(reciente.fecha) > Date.parse(delServidor.fecha))
      ) {
        return reciente;
      }
      return delServidor;
    }
    if (consultando) return reciente;
    // El servidor no respondió: respaldo local, rotulado «en este navegador».
    return reciente ?? leerUltimaCarga(tipo);
  }

  function marcarEstado(tipo: TipoImportacion, estado: EstadoFlujo, fecha: string) {
    if (estado === 'sin-cargar') return;
    // La carga la procesó el servidor: es un dato oficial aunque aún no se sepa quién la registró.
    setDeEstaVisita((prev) => ({ ...prev, [tipo]: { fecha, estado, origen: 'servidor' } }));
    servidor.recargar();
    // Se sigue recordando en el navegador como respaldo por si el servidor no responde luego.
    try {
      localStorage.setItem(`${CLAVE_ALMACEN}${tipo}`, JSON.stringify({ fecha, estado }));
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
            const ultima = ultimaDe(flujo.tipo);
            return (
              <ZonaCarga
                key={flujo.tipo}
                {...flujo}
                estado={ultima?.estado ?? 'sin-cargar'}
                ultimaCarga={ultima}
                consultando={consultando}
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
        tamano="lg"
      >
        <div className="flex flex-col gap-4">
          <SelectorSegmentado<Ayuda>
            opciones={OPCIONES_AYUDA}
            valor={pestanaAyuda}
            onCambiar={setPestanaAyuda}
            etiquetaGrupo="Contenido de ayuda"
            idBase="ayuda-carga"
            className="w-full"
          />
          <div
            role="tabpanel"
            id={idPanelPestana('ayuda-carga', pestanaAyuda)}
            aria-labelledby={idPestana('ayuda-carga', pestanaAyuda)}
          >
            {pestanaAyuda === 'guia' ? <GuiaCarga /> : <PlantillasCarga />}
          </div>
        </div>
      </Drawer>
    </LayoutAdmin>
  );
};

export default CargaDatos;
