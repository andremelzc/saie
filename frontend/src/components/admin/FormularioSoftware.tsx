import React, { useState } from 'react';
import { useAccion } from '../../hooks/useAccion';
import { crearSoftwareCatalogo, editarSoftwareCatalogo } from '../../services/catalogoSoftware';
import type {
  CambiosSoftware,
  NuevoSoftware,
  SoftwareCatalogoDTO,
  TipoLicencia,
} from '../../types/catalogoSoftware';
import type { CategoriaSoftware } from '../../types/solicitudesSoftware';
import { LICENCIAS } from '../../utils/catalogoSoftware';
import { CATEGORIAS_SOFTWARE } from '../../utils/solicitudes';
import { longitudMaxima, requerido, validarCampo } from '../../utils/validacion';
import type { Regla } from '../../utils/validacion';
import { Aviso } from '../ui/Aviso';
import { Boton } from '../ui/Boton';
import { CLASE_AYUDA, CLASE_CAMPO, CLASE_ETIQUETA } from '../ui/campos';
import { CLASE_PIE_DRAWER } from '../ui/Drawer';
import { ResumenErrores } from '../ui/ResumenErrores';

type Clave = 'nombre' | 'version' | 'categoria' | 'tipoLicencia' | 'fabricante' | 'descripcion';
type Valores = Record<Clave, string>;

const ETIQUETAS: Record<Clave, string> = {
  nombre: 'Nombre',
  version: 'Versión',
  categoria: 'Categoría',
  tipoLicencia: 'Licencia',
  fabricante: 'Fabricante',
  descripcion: 'Descripción',
};

/** Mismos límites que el backend (`SoftwareCrearSchema`). */
const REGLAS: Record<Clave, Regla[]> = {
  nombre: [requerido('Escribe el nombre del software.'), longitudMaxima(100)],
  version: [longitudMaxima(30)],
  categoria: [requerido('Elige una categoría.')],
  tipoLicencia: [requerido('Elige el tipo de licencia.')],
  fabricante: [longitudMaxima(100)],
  descripcion: [longitudMaxima(500)],
};

const CLAVES = Object.keys(ETIQUETAS) as Clave[];

function valoresIniciales(s: SoftwareCatalogoDTO | null): Valores {
  return {
    nombre: s?.nombre ?? '',
    version: s?.version ?? '',
    categoria: s?.categoria ?? '',
    tipoLicencia: s?.tipoLicencia ?? 'LIBRE',
    fabricante: s?.fabricante ?? '',
    descripcion: s?.descripcion ?? '',
  };
}

export interface FormularioSoftwareProps {
  /** `null` = alta; si no, edición de ese software. */
  software: SoftwareCatalogoDTO | null;
  onGuardado: (software: SoftwareCatalogoDTO) => void;
  onCancelar: () => void;
  onCambiosPendientes?: (hay: boolean) => void;
}

/**
 * Alta y edición de un software del catálogo (Issue 4.30). Valida al salir de cada campo con
 * las reglas compartidas y, al guardar, resume los errores (Issue 3.41). La versión solo se
 * escribe en el alta: otra versión es otra fila del catálogo.
 */
export const FormularioSoftware: React.FC<FormularioSoftwareProps> = ({
  software,
  onGuardado,
  onCancelar,
  onCambiosPendientes,
}) => {
  const inicial = valoresIniciales(software);
  const [valores, setValores] = useState<Valores>(inicial);
  const [errores, setErrores] = useState<Partial<Record<Clave, string>>>({});
  const [resumenVisible, setResumenVisible] = useState(false);
  const [errorServidor, setErrorServidor] = useState<string | null>(null);
  const { ejecutar, cargando } = useAccion();
  const idBase = software ? `software-${software.id}` : 'software-nuevo';

  const errorDe = (clave: Clave, v: Valores) => validarCampo(v[clave], REGLAS[clave]) ?? undefined;

  const cambiar = (clave: Clave, valor: string) => {
    const nuevos = { ...valores, [clave]: valor };
    setValores(nuevos);
    onCambiosPendientes?.(CLAVES.some((c) => nuevos[c] !== inicial[c]));
    if (errores[clave]) setErrores((e) => ({ ...e, [clave]: errorDe(clave, nuevos) }));
  };
  const alSalir = (clave: Clave) => setErrores((e) => ({ ...e, [clave]: errorDe(clave, valores) }));

  const guardar = async (evento: { preventDefault: () => void }) => {
    evento.preventDefault();
    if (cargando) return;
    const encontrados = Object.fromEntries(CLAVES.map((c) => [c, errorDe(c, valores)])) as Partial<
      Record<Clave, string>
    >;
    setErrores(encontrados);
    const primero = CLAVES.find((c) => encontrados[c]);
    if (primero) {
      setResumenVisible(true);
      document.getElementById(`${idBase}-${primero}`)?.focus();
      return;
    }
    setResumenVisible(false);
    setErrorServidor(null);

    const comunes = {
      nombre: valores.nombre.trim(),
      categoria: valores.categoria as CategoriaSoftware,
      tipoLicencia: valores.tipoLicencia as TipoLicencia,
    };
    const resultado = await ejecutar(
      () => {
        if (!software) {
          const nuevo: NuevoSoftware = {
            ...comunes,
            version: valores.version.trim(),
            ...(valores.fabricante.trim() && { fabricante: valores.fabricante.trim() }),
            ...(valores.descripcion.trim() && { descripcion: valores.descripcion.trim() }),
          };
          return crearSoftwareCatalogo(nuevo);
        }
        const cambios: CambiosSoftware = {
          ...comunes,
          fabricante: valores.fabricante.trim() || null,
          descripcion: valores.descripcion.trim() || null,
        };
        return editarSoftwareCatalogo(software.id, cambios);
      },
      {
        avisarError: false,
        exito: software ? 'Cambios guardados en el catálogo.' : 'Software agregado al catálogo.',
      },
    );
    if (resultado?.ok) onGuardado(resultado.valor);
    else if (resultado) setErrorServidor(resultado.error);
  };

  const control = (clave: Clave) => {
    const id = `${idBase}-${clave}`;
    const error = errores[clave];
    return {
      id,
      value: valores[clave],
      onBlur: () => alSalir(clave),
      'aria-invalid': error ? true : undefined,
      'aria-describedby':
        [error ? `${id}-error` : null, clave === 'version' ? `${id}-ayuda` : null]
          .filter(Boolean)
          .join(' ') || undefined,
      className: `${CLASE_CAMPO} ${error ? 'border-saie-danger!' : ''}`,
    };
  };

  const campo = (clave: Clave, nodo: React.ReactNode, ayuda?: string, obligatorio = false) => (
    <div className="flex flex-col gap-1">
      <label htmlFor={`${idBase}-${clave}`} className={CLASE_ETIQUETA}>
        {ETIQUETAS[clave]}
        {obligatorio && (
          <>
            <span aria-hidden="true" className="text-saie-danger">
              {' '}
              *
            </span>
            <span className="sr-only"> (obligatorio)</span>
          </>
        )}
      </label>
      {nodo}
      {ayuda && (
        <p id={`${idBase}-${clave}-ayuda`} className={CLASE_AYUDA}>
          {ayuda}
        </p>
      )}
      {errores[clave] && (
        <p id={`${idBase}-${clave}-error`} className="m-0 text-sm font-medium text-saie-danger">
          {errores[clave]}
        </p>
      )}
    </div>
  );

  return (
    <form onSubmit={guardar} noValidate className="flex flex-col gap-4">
      {campo(
        'nombre',
        <input
          type="text"
          {...control('nombre')}
          onChange={(e) => cambiar('nombre', e.target.value)}
        />,
        undefined,
        true,
      )}
      {campo(
        'version',
        <input
          type="text"
          placeholder="Ej. 3.12"
          {...control('version')}
          disabled={software !== null}
          onChange={(e) => cambiar('version', e.target.value)}
        />,
        software
          ? 'La versión no se cambia: para otra versión, agrega un software nuevo.'
          : 'Déjala vacía si no aplica. Con números (3.12) se puede exigir una versión mínima.',
      )}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {campo(
          'categoria',
          <select {...control('categoria')} onChange={(e) => cambiar('categoria', e.target.value)}>
            <option value="">Elige una categoría</option>
            {CATEGORIAS_SOFTWARE.map((c) => (
              <option key={c.valor} value={c.valor}>
                {c.etiqueta}
              </option>
            ))}
          </select>,
          undefined,
          true,
        )}
        {campo(
          'tipoLicencia',
          <select
            {...control('tipoLicencia')}
            onChange={(e) => cambiar('tipoLicencia', e.target.value)}
          >
            {LICENCIAS.map((l) => (
              <option key={l.valor} value={l.valor}>
                {l.etiqueta}
              </option>
            ))}
          </select>,
          undefined,
          true,
        )}
      </div>
      {campo(
        'fabricante',
        <input
          type="text"
          placeholder="Ej. Microsoft"
          {...control('fabricante')}
          onChange={(e) => cambiar('fabricante', e.target.value)}
        />,
      )}
      {campo(
        'descripcion',
        <textarea
          rows={3}
          {...control('descripcion')}
          className={`${control('descripcion').className} py-3`}
          onChange={(e) => cambiar('descripcion', e.target.value)}
        />,
      )}

      {resumenVisible && (
        <ResumenErrores
          errores={CLAVES.filter((c) => errores[c]).map((c) => ({
            idCampo: `${idBase}-${c}`,
            etiqueta: ETIQUETAS[c],
            mensaje: errores[c] as string,
          }))}
        />
      )}
      {errorServidor && <Aviso tono="error">{errorServidor}</Aviso>}

      <div className={`${CLASE_PIE_DRAWER} flex flex-wrap items-center gap-3`}>
        <Boton type="submit" tamano="sm" cargando={cargando} textoCargando="Guardando…">
          {software ? 'Guardar cambios' : 'Agregar al catálogo'}
        </Boton>
        <Boton variante="cancelar" tamano="sm" onClick={onCancelar} disabled={cargando}>
          Cancelar
        </Boton>
      </div>
    </form>
  );
};

export default FormularioSoftware;
