import React, { useMemo, useState } from 'react';
import { Aviso } from '../ui/Aviso';
import { BadgeEstado } from '../ui/BadgeEstado';
import { Boton } from '../ui/Boton';
import { CLASE_AYUDA, CLASE_CAMPO, CLASE_ETIQUETA } from '../ui/campos';
import { useCarga } from '../../hooks/useCarga';
import { crearEspacio, editarEspacio, obtenerCatalogoActivo } from '../../services/admin';
import { mensajeDeError } from '../../services/estudiante';
import type {
  CampoEspacio,
  CambiosEspacio,
  EspacioAdminDTO,
  ListadoSoftwareDTO,
  ResultadoEdicionEspacioDTO,
  TipoEspacio,
} from '../../types/admin';

/**
 * Issue 4.15 — alta y edición de un espacio con los campos acotados por el rol.
 *
 * El backend decide qué se puede editar (`camposEditables`); el formulario solo muestra esos
 * campos y, al editar, envía únicamente los que cambian. Un campo fuera de lo permitido se
 * rechaza con 403, así que mandarlos «por si acaso» rompería el guardado.
 *
 * El alta es solo de Coordinación Académica (así lo define el endpoint) y sí envía todos los
 * campos del espacio, incluidos los de laboratorio cuando el tipo es laboratorio.
 *
 * La lógica (validación, cálculo de cambios y presentación) está partida en piezas pequeñas:
 * cada campo se valida por separado y cada grupo de campos es un componente, para que el
 * formulario se pueda leer y mantener por partes.
 */

const CAMPOS_COORDINACION: CampoEspacio[] = [
  'identificador',
  'pabellon',
  'piso',
  'aforoNominal',
  'contiguos',
  'habilitado',
  'descripcionUso',
];
const CAMPOS_LABORATORIO: CampoEspacio[] = ['softwareIds', 'pcsMalogradas'];

interface EstadoFormulario {
  tipo: TipoEspacio;
  identificador: string;
  pabellon: string;
  piso: string;
  aforoNominal: string;
  descripcionUso: string;
  habilitado: boolean;
  pcsMalogradas: string;
  softwareIds: string[];
  contiguos: string[];
}

export interface FormularioEspacioProps {
  /** `crear` habilita el alta (solo Coordinación); `editar` respeta `camposEditables`. */
  modo: 'crear' | 'editar';
  /** Espacio a editar. En el alta no existe todavía. */
  espacio?: EspacioAdminDTO;
  /** Espacios visibles en el panel: permiten elegir contiguos y mostrar su identificador. */
  espacios: EspacioAdminDTO[];
  onGuardado: (resultado: ResultadoEdicionEspacioDTO) => void;
  onCancelar: () => void;
}

function estadoInicial(espacio: EspacioAdminDTO): EstadoFormulario {
  return {
    tipo: espacio.tipo,
    identificador: espacio.identificador,
    pabellon: espacio.pabellon,
    piso: String(espacio.piso),
    aforoNominal: String(espacio.aforoNominal),
    descripcionUso: espacio.descripcionUso ?? '',
    habilitado: espacio.habilitado,
    pcsMalogradas: espacio.pcsMalogradas == null ? '' : String(espacio.pcsMalogradas),
    softwareIds: (espacio.softwareInstalado ?? []).map((s) => s.id),
    contiguos: [...espacio.contiguos],
  };
}

function estadoInicialAlta(): EstadoFormulario {
  return {
    tipo: 'AULA_TEORICA',
    identificador: '',
    pabellon: '',
    piso: '',
    aforoNominal: '',
    descripcionUso: '',
    habilitado: true,
    pcsMalogradas: '',
    softwareIds: [],
    contiguos: [],
  };
}

function mismoConjunto(a: string[], b: string[]): boolean {
  const conjuntoB = new Set(b);
  if (a.length !== conjuntoB.size) return false;
  return a.every((id) => conjuntoB.has(id));
}

function esEntero(v: string): boolean {
  return v.trim() !== '' && Number.isInteger(Number(v));
}

/** Aforo que se usa para validar las PCs: el del formulario si se puede editar, si no el actual. */
function aforoEfectivo(form: EstadoFormulario, campos: Set<CampoEspacio>, actual: number): number {
  if (campos.has('aforoNominal') && esEntero(form.aforoNominal)) return Number(form.aforoNominal);
  return actual;
}

/* ------------------------------------------------------------------ *
 * Validación: una función por campo. Cada una devuelve el mensaje de
 * error o `undefined` cuando el valor es válido.
 * ------------------------------------------------------------------ */

function errorIdentificador(valor: string): string | undefined {
  const limpio = valor.trim();
  if (!limpio) return 'El código del espacio es obligatorio.';
  if (limpio.length > 60) return 'El código no puede superar 60 caracteres.';
  return undefined;
}

function errorPabellon(valor: string): string | undefined {
  const limpio = valor.trim();
  if (!limpio) return 'El pabellón es obligatorio.';
  if (limpio.length > 40) return 'El pabellón no puede superar 40 caracteres.';
  return undefined;
}

function errorPiso(valor: string): string | undefined {
  if (!esEntero(valor)) return 'El piso debe ser un número entero.';
  return undefined;
}

function errorAforo(valor: string, habilitado: boolean): string | undefined {
  if (!esEntero(valor) || Number(valor) < 0) {
    return 'El aforo debe ser un número entero mayor o igual a 0.';
  }
  if (habilitado && Number(valor) < 1) {
    return 'Un espacio habilitado necesita un aforo mayor a 0.';
  }
  return undefined;
}

function errorPcs(valor: string, original: string, aforo: number): string | undefined {
  const vacio = valor.trim() === '';
  const teniaValor = original.trim() !== '';
  if (vacio && teniaValor) {
    return 'Escribe 0 si no hay PCs malogradas: el dato no se puede borrar.';
  }
  if (!vacio && (!esEntero(valor) || Number(valor) < 0)) {
    return 'Las PCs malogradas deben ser un número entero mayor o igual a 0.';
  }
  if (!vacio && Number(valor) > aforo) {
    return 'Las PCs malogradas no pueden superar el aforo nominal.';
  }
  return undefined;
}

function errorDescripcion(valor: string): string | undefined {
  if (valor.trim().length > 120) return 'La descripción no puede superar 120 caracteres.';
  return undefined;
}

interface ReglaValidacion {
  campo: CampoEspacio;
  error: (
    form: EstadoFormulario,
    original: EstadoFormulario,
    campos: Set<CampoEspacio>,
    espacio: EspacioAdminDTO | undefined,
  ) => string | undefined;
}

/** Una regla por campo: cada una sabe validar su propio valor. */
const REGLAS_VALIDACION: ReglaValidacion[] = [
  { campo: 'identificador', error: (form) => errorIdentificador(form.identificador) },
  { campo: 'pabellon', error: (form) => errorPabellon(form.pabellon) },
  { campo: 'piso', error: (form) => errorPiso(form.piso) },
  { campo: 'aforoNominal', error: (form) => errorAforo(form.aforoNominal, form.habilitado) },
  {
    campo: 'pcsMalogradas',
    error: (form, original, campos, espacio) =>
      errorPcs(
        form.pcsMalogradas,
        original.pcsMalogradas,
        aforoEfectivo(form, campos, espacio?.aforoNominal ?? 0),
      ),
  },
  { campo: 'descripcionUso', error: (form) => errorDescripcion(form.descripcionUso) },
];

function validar(
  form: EstadoFormulario,
  campos: Set<CampoEspacio>,
  original: EstadoFormulario,
  espacio: EspacioAdminDTO | undefined,
): Record<string, string> {
  const errores: Record<string, string> = {};

  for (const regla of REGLAS_VALIDACION) {
    if (!campos.has(regla.campo)) continue;
    const error = regla.error(form, original, campos, espacio);
    if (error) errores[regla.campo] = error;
  }

  return errores;
}

/* ------------------------------------------------------------------ *
 * Cálculo de cambios: una función por grupo de campos.
 * ------------------------------------------------------------------ */

function cambiosDeIdentificacion(
  form: EstadoFormulario,
  original: EstadoFormulario,
  campos: Set<CampoEspacio>,
): CambiosEspacio {
  const cambios: CambiosEspacio = {};
  if (campos.has('identificador') && form.identificador.trim() !== original.identificador.trim()) {
    cambios.identificador = form.identificador.trim();
  }
  if (campos.has('pabellon') && form.pabellon.trim() !== original.pabellon.trim()) {
    cambios.pabellon = form.pabellon.trim();
  }
  if (campos.has('piso') && Number(form.piso) !== Number(original.piso)) {
    cambios.piso = Number(form.piso);
  }
  return cambios;
}

function cambiosDeCapacidad(
  form: EstadoFormulario,
  original: EstadoFormulario,
  campos: Set<CampoEspacio>,
): CambiosEspacio {
  const cambios: CambiosEspacio = {};
  if (campos.has('aforoNominal') && Number(form.aforoNominal) !== Number(original.aforoNominal)) {
    cambios.aforoNominal = Number(form.aforoNominal);
  }
  if (campos.has('habilitado') && form.habilitado !== original.habilitado) {
    cambios.habilitado = form.habilitado;
  }
  if (campos.has('descripcionUso')) {
    const nuevo = form.descripcionUso.trim();
    if (nuevo !== original.descripcionUso.trim()) {
      // Cadena vacía: borrar el rótulo (el backend acepta `null`).
      cambios.descripcionUso = nuevo === '' ? null : nuevo;
    }
  }
  return cambios;
}

function cambiosDeLaboratorio(
  form: EstadoFormulario,
  original: EstadoFormulario,
  campos: Set<CampoEspacio>,
): CambiosEspacio {
  const cambios: CambiosEspacio = {};
  if (campos.has('softwareIds') && !mismoConjunto(form.softwareIds, original.softwareIds)) {
    cambios.softwareIds = [...form.softwareIds];
  }
  if (campos.has('pcsMalogradas') && form.pcsMalogradas.trim() !== original.pcsMalogradas.trim()) {
    cambios.pcsMalogradas = Number(form.pcsMalogradas);
  }
  return cambios;
}

function cambiosDeContiguos(
  form: EstadoFormulario,
  original: EstadoFormulario,
  campos: Set<CampoEspacio>,
): CambiosEspacio {
  const cambios: CambiosEspacio = {};
  if (campos.has('contiguos') && !mismoConjunto(form.contiguos, original.contiguos)) {
    cambios.contiguos = [...form.contiguos];
  }
  return cambios;
}

function calcularCambios(
  form: EstadoFormulario,
  original: EstadoFormulario,
  campos: Set<CampoEspacio>,
): CambiosEspacio {
  return {
    ...cambiosDeIdentificacion(form, original, campos),
    ...cambiosDeCapacidad(form, original, campos),
    ...cambiosDeLaboratorio(form, original, campos),
    ...cambiosDeContiguos(form, original, campos),
  };
}

/** Motivo por el que no se puede guardar, o `undefined` si sí se puede. */
function motivoDeGuardado(hayCambios: boolean, hayErrores: boolean): string | undefined {
  if (!hayCambios) return 'No hay cambios para guardar.';
  if (hayErrores) return 'Corrige los campos marcados antes de guardar.';
  return undefined;
}

/** Casilla con su etiqueta: el patrón se repite en software y contiguos. */
const Casilla: React.FC<{
  id: string;
  marcada: boolean;
  onCambio: (marcada: boolean) => void;
  children: React.ReactNode;
}> = ({ id, marcada, onCambio, children }) => (
  <label
    className="flex min-h-11 cursor-pointer items-center gap-3 rounded-lg px-2 text-sm hover:bg-saie-canvas"
    htmlFor={id}
  >
    <input
      id={id}
      type="checkbox"
      className="h-6 w-6 shrink-0 accent-saie-primary"
      checked={marcada}
      onChange={(e) => onCambio(e.target.checked)}
    />
    <span>{children}</span>
  </label>
);

/**
 * Etiqueta de campo. Los campos obligatorios llevan asterisco visible y el texto
 * «(obligatorio)» para lectores de pantalla (Guía de Estilos §4.5).
 */
const EtiquetaCampo: React.FC<{
  htmlFor: string;
  obligatorio?: boolean;
  children: React.ReactNode;
}> = ({ htmlFor, obligatorio = false, children }) => (
  <label htmlFor={htmlFor} className={`${CLASE_ETIQUETA} flex items-center gap-1`}>
    <span>{children}</span>
    {obligatorio && (
      <>
        <span className="font-bold text-saie-danger" aria-hidden="true">
          *
        </span>
        <span className="sr-only">(obligatorio)</span>
      </>
    )}
  </label>
);

/** Error de campo: texto bajo el control, con icono y en rojo (Guía de Estilos §4.5 y §5.3). */
const ErrorCampo: React.FC<{ id: string; children: React.ReactNode }> = ({ id, children }) => (
  <p id={id} role="alert" className="m-0 flex items-start gap-1.5 text-sm text-saie-danger">
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="mt-0.5 h-4 w-4 shrink-0"
    >
      <path d="M12 9v4m0 4h.01M10.29 3.86 1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
    </svg>
    <span>{children}</span>
  </p>
);

/** Campo en error: borde de 2 px en rojo (Guía de Estilos §4.5). */
function claseCampo(error?: string): string {
  return error ? `${CLASE_CAMPO} border-2 border-saie-danger` : CLASE_CAMPO;
}

type CambiarCampo = <K extends keyof EstadoFormulario>(
  campo: K,
  valor: EstadoFormulario[K],
) => void;

/** Identificación: código, pabellón y piso. */
const GrupoIdentificacion: React.FC<{
  form: EstadoFormulario;
  errores: Record<string, string>;
  cambiar: CambiarCampo;
}> = ({ form, errores, cambiar }) => (
  <fieldset className="flex flex-col gap-3 border-0 p-0">
    <legend className="m-0 text-base font-bold text-saie-text">Identificación</legend>

    <div className="flex flex-col gap-1">
      <EtiquetaCampo htmlFor="espacio-identificador" obligatorio>
        Código del espacio
      </EtiquetaCampo>
      <input
        id="espacio-identificador"
        type="text"
        value={form.identificador}
        onChange={(e) => cambiar('identificador', e.target.value)}
        aria-required="true"
        aria-invalid={errores.identificador ? true : undefined}
        aria-describedby={errores.identificador ? 'error-identificador' : undefined}
        className={claseCampo(errores.identificador)}
      />
      {errores.identificador && (
        <ErrorCampo id="error-identificador">{errores.identificador}</ErrorCampo>
      )}
    </div>

    <div className="flex flex-col gap-1">
      <EtiquetaCampo htmlFor="espacio-pabellon" obligatorio>
        Pabellón
      </EtiquetaCampo>
      <input
        id="espacio-pabellon"
        type="text"
        value={form.pabellon}
        onChange={(e) => cambiar('pabellon', e.target.value)}
        aria-required="true"
        aria-invalid={errores.pabellon ? true : undefined}
        aria-describedby={errores.pabellon ? 'error-pabellon' : undefined}
        className={claseCampo(errores.pabellon)}
      />
      {errores.pabellon && <ErrorCampo id="error-pabellon">{errores.pabellon}</ErrorCampo>}
    </div>

    <div className="flex flex-col gap-1">
      <EtiquetaCampo htmlFor="espacio-piso" obligatorio>
        Piso
      </EtiquetaCampo>
      <input
        id="espacio-piso"
        type="number"
        inputMode="numeric"
        step={1}
        value={form.piso}
        onChange={(e) => cambiar('piso', e.target.value)}
        aria-required="true"
        aria-invalid={errores.piso ? true : undefined}
        aria-describedby={errores.piso ? 'error-piso' : undefined}
        className={claseCampo(errores.piso)}
      />
      {errores.piso && <ErrorCampo id="error-piso">{errores.piso}</ErrorCampo>}
    </div>
  </fieldset>
);

/** Capacidad y estado: aforo, disponibilidad y rótulo. */
const GrupoCapacidad: React.FC<{
  form: EstadoFormulario;
  errores: Record<string, string>;
  cambiar: CambiarCampo;
}> = ({ form, errores, cambiar }) => (
  <fieldset className="flex flex-col gap-3 border-0 p-0">
    <legend className="m-0 text-base font-bold text-saie-text">Capacidad y estado</legend>

    <div className="flex flex-col gap-1">
      <EtiquetaCampo htmlFor="espacio-aforo" obligatorio={form.habilitado}>
        Capacidad (aforo nominal)
      </EtiquetaCampo>
      <input
        id="espacio-aforo"
        type="number"
        inputMode="numeric"
        min={0}
        step={1}
        value={form.aforoNominal}
        onChange={(e) => cambiar('aforoNominal', e.target.value)}
        aria-required={form.habilitado ? true : undefined}
        aria-invalid={errores.aforoNominal ? true : undefined}
        aria-describedby={errores.aforoNominal ? 'error-aforo' : 'ayuda-aforo'}
        className={claseCampo(errores.aforoNominal)}
      />
      {errores.aforoNominal ? (
        <ErrorCampo id="error-aforo">{errores.aforoNominal}</ErrorCampo>
      ) : (
        <p id="ayuda-aforo" className={CLASE_AYUDA}>
          Al cambiarla se revisa si las secciones asignadas siguen cabiendo y se genera la alerta
          correspondiente. Deja 0 solo si el espacio está fuera de servicio.
        </p>
      )}
    </div>

    <Casilla
      id="espacio-habilitado"
      marcada={form.habilitado}
      onCambio={(marcada) => cambiar('habilitado', marcada)}
    >
      <span className="font-semibold text-saie-text">Espacio en servicio</span>
      <span className="block text-xs text-saie-muted">
        Si lo deshabilitas, el motor deja de asignarlo y queda fuera de la consulta de
        disponibilidad.
      </span>
    </Casilla>

    <div className="flex flex-col gap-1">
      <EtiquetaCampo htmlFor="espacio-descripcion">Descripción de uso</EtiquetaCampo>
      <input
        id="espacio-descripcion"
        type="text"
        value={form.descripcionUso}
        maxLength={120}
        placeholder="Ej. Sala de investigación"
        onChange={(e) => cambiar('descripcionUso', e.target.value)}
        aria-invalid={errores.descripcionUso ? true : undefined}
        aria-describedby={errores.descripcionUso ? 'error-descripcion' : 'ayuda-descripcion'}
        className={claseCampo(errores.descripcionUso)}
      />
      {errores.descripcionUso ? (
        <ErrorCampo id="error-descripcion">{errores.descripcionUso}</ErrorCampo>
      ) : (
        <p id="ayuda-descripcion" className={CLASE_AYUDA}>
          Rótulo corto que aparece en el mapa. Si lo dejas vacío, se borra.
        </p>
      )}
    </div>
  </fieldset>
);

/** Software y PCs: solo tiene sentido en un laboratorio. */
const GrupoLaboratorio: React.FC<{
  form: EstadoFormulario;
  errores: Record<string, string>;
  original: EstadoFormulario;
  cambiar: CambiarCampo;
  alternarSoftware: (id: string, marcada: boolean) => void;
  catalogo: { error: string | null; cargando: boolean; datos: ListadoSoftwareDTO | null };
  softwareFiltrado: ListadoSoftwareDTO['items'];
  busquedaSoftware: string;
  onBusquedaSoftware: (valor: string) => void;
}> = ({
  form,
  errores,
  original,
  cambiar,
  alternarSoftware,
  catalogo,
  softwareFiltrado,
  busquedaSoftware,
  onBusquedaSoftware,
}) => {
  const sinCoincidencias = softwareFiltrado.length === 0;
  const catalogoVacio = (catalogo.datos?.items.length ?? 0) === 0;
  const mensajeVacio = catalogoVacio
    ? 'El catálogo de software está vacío.'
    : `No hay software que coincida con «${busquedaSoftware.trim()}».`;

  const contenido = (() => {
    if (catalogo.error) {
      return <Aviso tono="error">No se pudo cargar el catálogo de software.</Aviso>;
    }
    if (sinCoincidencias) {
      return <p className="m-0 text-sm text-saie-muted">{mensajeVacio}</p>;
    }
    return (
      <ul className="m-0 flex max-h-56 list-none flex-col gap-1 overflow-auto p-0">
        {softwareFiltrado.map((s) => (
          <li key={s.id}>
            <Casilla
              id={`software-espacio-${s.id}`}
              marcada={form.softwareIds.includes(s.id)}
              onCambio={(marcada) => alternarSoftware(s.id, marcada)}
            >
              {s.nombre}
              {s.version && <span className="text-saie-muted"> {s.version}</span>}
            </Casilla>
          </li>
        ))}
      </ul>
    );
  })();

  return (
    <fieldset className="flex flex-col gap-3 border-0 p-0">
      <legend className="m-0 text-base font-bold text-saie-text">
        Software y PCs del laboratorio
      </legend>

      <div className="flex flex-col gap-1">
        <EtiquetaCampo htmlFor="espacio-pcs" obligatorio={original.pcsMalogradas !== ''}>
          PCs fuera de servicio
        </EtiquetaCampo>
        <input
          id="espacio-pcs"
          type="number"
          inputMode="numeric"
          min={0}
          step={1}
          value={form.pcsMalogradas}
          placeholder={original.pcsMalogradas === '' ? 'Sin registrar' : undefined}
          onChange={(e) => cambiar('pcsMalogradas', e.target.value)}
          aria-required={original.pcsMalogradas !== '' ? true : undefined}
          aria-invalid={errores.pcsMalogradas ? true : undefined}
          aria-describedby={errores.pcsMalogradas ? 'error-pcs' : 'ayuda-pcs'}
          className={claseCampo(errores.pcsMalogradas)}
        />
        {errores.pcsMalogradas ? (
          <ErrorCampo id="error-pcs">{errores.pcsMalogradas}</ErrorCampo>
        ) : (
          <p id="ayuda-pcs" className={CLASE_AYUDA}>
            Baja el número si se repararon. Escribe 0 si no hay PCs malogradas.
          </p>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <label htmlFor="buscar-software-espacio" className={CLASE_ETIQUETA}>
            Buscar software
          </label>
          <span className="text-sm text-saie-muted">
            <strong className="text-saie-text">{form.softwareIds.length}</strong> de{' '}
            {catalogo.datos?.items.length ?? 0} seleccionados
          </span>
        </div>
        <input
          id="buscar-software-espacio"
          type="search"
          value={busquedaSoftware}
          placeholder="Nombre o versión…"
          onChange={(e) => onBusquedaSoftware(e.target.value)}
          className={CLASE_CAMPO}
        />
        {contenido}
      </div>
    </fieldset>
  );
};

/** Espacios contiguos: solo del mismo tipo. */
const GrupoContiguos: React.FC<{
  form: EstadoFormulario;
  alternarContiguo: (id: string, marcado: boolean) => void;
  candidatos: EspacioAdminDTO[];
  contiguosFiltrados: EspacioAdminDTO[];
  busquedaContiguos: string;
  onBusquedaContiguos: (valor: string) => void;
}> = ({
  form,
  alternarContiguo,
  candidatos,
  contiguosFiltrados,
  busquedaContiguos,
  onBusquedaContiguos,
}) => {
  const sinCoincidencias = contiguosFiltrados.length === 0;
  const mensajeVacio =
    candidatos.length === 0
      ? 'No hay otros espacios del mismo tipo.'
      : `No hay espacios que coincidan con «${busquedaContiguos.trim()}».`;

  return (
    <fieldset className="flex flex-col gap-3 border-0 p-0">
      <legend className="m-0 text-base font-bold text-saie-text">Espacios contiguos</legend>
      <p className={CLASE_AYUDA}>
        Solo puede ser contiguo a un espacio del mismo tipo. La relación se guarda en ambos
        sentidos.
      </p>
      <input
        id="buscar-contiguos"
        type="search"
        value={busquedaContiguos}
        placeholder="Buscar por código…"
        onChange={(e) => onBusquedaContiguos(e.target.value)}
        className={CLASE_CAMPO}
      />
      {sinCoincidencias ? (
        <p className="m-0 text-sm text-saie-muted">{mensajeVacio}</p>
      ) : (
        <ul className="m-0 flex max-h-56 list-none flex-col gap-1 overflow-auto p-0">
          {contiguosFiltrados.map((e) => (
            <li key={e.id}>
              <Casilla
                id={`contiguo-${e.id}`}
                marcada={form.contiguos.includes(e.id)}
                onCambio={(marcado) => alternarContiguo(e.id, marcado)}
              >
                {e.identificador}
                <span className="text-saie-muted">
                  {' '}
                  · {e.pabellon}, piso {e.piso}
                </span>
              </Casilla>
            </li>
          ))}
        </ul>
      )}
    </fieldset>
  );
};

export const FormularioEspacio: React.FC<FormularioEspacioProps> = ({
  modo,
  espacio,
  espacios,
  onGuardado,
  onCancelar,
}) => {
  const original = useMemo(
    () => (modo === 'editar' && espacio ? estadoInicial(espacio) : estadoInicialAlta()),
    [modo, espacio],
  );
  const [form, setForm] = useState<EstadoFormulario>(original);
  const [busquedaSoftware, setBusquedaSoftware] = useState('');
  const [busquedaContiguos, setBusquedaContiguos] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const catalogo = useCarga(obtenerCatalogoActivo);

  // En el alta decide Coordinación qué campos existen: los de laboratorio solo si el tipo es
  // laboratorio. Al editar manda el backend (`camposEditables`).
  const campos = useMemo(() => {
    if (modo === 'editar' && espacio) return new Set(espacio.camposEditables);
    const deLaboratorio = form.tipo === 'LABORATORIO' ? CAMPOS_LABORATORIO : [];
    return new Set<CampoEspacio>([...CAMPOS_COORDINACION, ...deLaboratorio]);
  }, [modo, espacio, form.tipo]);

  const errores = useMemo(
    () => validar(form, campos, original, espacio),
    [form, campos, original, espacio],
  );
  const cambios = useMemo(() => calcularCambios(form, original, campos), [form, original, campos]);
  const hayCambios = modo === 'crear' ? true : Object.keys(cambios).length > 0;
  const hayErrores = Object.keys(errores).length > 0;

  const candidatos = useMemo(
    () => espacios.filter((e) => e.tipo === form.tipo && e.id !== espacio?.id),
    [espacios, form.tipo, espacio?.id],
  );
  const contiguosFiltrados = useMemo(() => {
    const termino = busquedaContiguos.trim().toLowerCase();
    if (!termino) return candidatos;
    return candidatos.filter((e) => e.identificador.toLowerCase().includes(termino));
  }, [candidatos, busquedaContiguos]);

  const softwareFiltrado = useMemo(() => {
    const termino = busquedaSoftware.trim().toLowerCase();
    const items = catalogo.datos?.items ?? [];
    if (!termino) return items;
    return items.filter((s) => `${s.nombre} ${s.version}`.toLowerCase().includes(termino));
  }, [catalogo.datos, busquedaSoftware]);

  function cambiar<K extends keyof EstadoFormulario>(campo: K, valor: EstadoFormulario[K]) {
    setForm((previo) => ({ ...previo, [campo]: valor }));
    setError(null);
  }

  function cambiarTipo(tipo: TipoEspacio) {
    // Un aula teórica no tiene software ni PCs: se limpian al cambiar el tipo.
    const esLaboratorio = tipo === 'LABORATORIO';
    setForm((previo) => ({
      ...previo,
      tipo,
      softwareIds: esLaboratorio ? previo.softwareIds : [],
      pcsMalogradas: esLaboratorio ? previo.pcsMalogradas : '',
      contiguos: [],
    }));
    setError(null);
  }

  function alternarSoftware(id: string, marcada: boolean) {
    setForm((previo) => ({
      ...previo,
      softwareIds: marcada
        ? [...previo.softwareIds, id]
        : previo.softwareIds.filter((x) => x !== id),
    }));
    setError(null);
  }

  function alternarContiguo(id: string, marcado: boolean) {
    setForm((previo) => ({
      ...previo,
      contiguos: marcado ? [...previo.contiguos, id] : previo.contiguos.filter((x) => x !== id),
    }));
    setError(null);
  }

  async function guardar() {
    if (guardando || !hayCambios || hayErrores) return;
    setGuardando(true);
    setError(null);
    try {
      if (modo === 'crear') {
        const creado = await crearEspacio(espacioNuevo(form));
        onGuardado({ espacio: creado, alertas: [] });
        return;
      }
      const resultado = await editarEspacio(espacio!.id, cambios);
      onGuardado(resultado);
    } catch (e) {
      setError(mensajeDeError(e));
    } finally {
      setGuardando(false);
    }
  }

  const motivoDeshabilitado = motivoDeGuardado(hayCambios, hayErrores);

  if (modo === 'editar' && espacio && campos.size === 0) {
    return (
      <Aviso tono="info">
        Tu rol no puede editar este espacio. Puedes consultarlo, pero no cambiar sus datos.
      </Aviso>
    );
  }

  return (
    <section
      aria-label={modo === 'crear' ? 'Nuevo espacio' : `Editar ${espacio?.identificador}`}
      className="flex flex-col gap-6"
    >
      {modo === 'crear' && (
        <fieldset className="flex flex-col gap-3 border-0 p-0">
          <legend className="m-0 text-base font-bold text-saie-text">Tipo de espacio</legend>
          <div className="flex flex-col gap-1">
            <label htmlFor="espacio-tipo" className={CLASE_ETIQUETA}>
              Tipo de espacio
            </label>
            <select
              id="espacio-tipo"
              value={form.tipo}
              onChange={(e) => cambiarTipo(e.target.value as TipoEspacio)}
              className={CLASE_CAMPO}
            >
              <option value="AULA_TEORICA">Aula teórica</option>
              <option value="LABORATORIO">Laboratorio</option>
            </select>
            <p className={CLASE_AYUDA}>
              Un aula teórica no tiene software ni PCs malogradas; un laboratorio sí.
            </p>
          </div>
        </fieldset>
      )}

      {campos.has('identificador') && (
        <GrupoIdentificacion form={form} errores={errores} cambiar={cambiar} />
      )}

      {(campos.has('aforoNominal') || campos.has('habilitado') || campos.has('descripcionUso')) && (
        <GrupoCapacidad form={form} errores={errores} cambiar={cambiar} />
      )}

      {(campos.has('softwareIds') || campos.has('pcsMalogradas')) && (
        <GrupoLaboratorio
          form={form}
          errores={errores}
          original={original}
          cambiar={cambiar}
          alternarSoftware={alternarSoftware}
          catalogo={catalogo}
          softwareFiltrado={softwareFiltrado}
          busquedaSoftware={busquedaSoftware}
          onBusquedaSoftware={setBusquedaSoftware}
        />
      )}

      {campos.has('contiguos') && (
        <GrupoContiguos
          form={form}
          alternarContiguo={alternarContiguo}
          candidatos={candidatos}
          contiguosFiltrados={contiguosFiltrados}
          busquedaContiguos={busquedaContiguos}
          onBusquedaContiguos={setBusquedaContiguos}
        />
      )}

      {error && <Aviso tono="error">{error}</Aviso>}

      <footer className="flex flex-col gap-3 border-t border-saie-divider pt-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 flex-col gap-2">
          {hayCambios ? (
            <BadgeEstado tono="advertencia">
              {modo === 'crear' ? 'Espacio por crear' : 'Cambios sin guardar'}
            </BadgeEstado>
          ) : (
            <BadgeEstado tono="neutro">Sin cambios</BadgeEstado>
          )}
          {hayCambios && modo === 'editar' && (
            <p className={CLASE_AYUDA}>
              Se guardará: {Object.keys(cambios).length}{' '}
              {Object.keys(cambios).length === 1 ? 'campo' : 'campos'}.
            </p>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <Boton variante="cancelar" onClick={onCancelar} disabled={guardando}>
            Cancelar
          </Boton>
          <Boton
            onClick={guardar}
            disabled={!hayCambios || hayErrores}
            cargando={guardando}
            textoCargando="Guardando…"
            motivoDeshabilitado={motivoDeshabilitado}
          >
            {modo === 'crear' ? 'Crear espacio' : 'Guardar cambios'}
          </Boton>
        </div>
      </footer>
    </section>
  );
};

/** Payload del alta: un aula teórica no lleva software ni PCs. */
function espacioNuevo(form: EstadoFormulario) {
  const descripcionUso = form.descripcionUso.trim();
  const base = {
    identificador: form.identificador.trim(),
    tipo: form.tipo,
    pabellon: form.pabellon.trim(),
    piso: Number(form.piso),
    aforoNominal: Number(form.aforoNominal),
    habilitado: form.habilitado,
    contiguos: form.contiguos,
    ...(descripcionUso ? { descripcionUso } : {}),
  };
  if (form.tipo !== 'LABORATORIO') return base;
  const pcs = form.pcsMalogradas.trim();
  return {
    ...base,
    softwareIds: form.softwareIds,
    pcsMalogradas: pcs === '' ? 0 : Number(pcs),
  };
}

export default FormularioEspacio;
