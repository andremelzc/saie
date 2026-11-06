import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import CabeceraPortal from '../../components/CabeceraPortal';
import { EsqueletoCarga, EstadoVacio } from '../../components/estudiante/ElementosHorario';
import { Aviso } from '../../components/ui/Aviso';
import { BadgeEstado } from '../../components/ui/BadgeEstado';
import { Boton } from '../../components/ui/Boton';
import { Campo } from '../../components/ui/Campo';
import { CLASE_CAMPO } from '../../components/ui/campos';
import { EnlaceSaltar, ID_CONTENIDO } from '../../components/ui/EnlaceSaltar';
import { EstadoError } from '../../components/ui/EstadoError';
import { ICONOS } from '../../components/ui/iconos';
import { RUTAS } from '../../config/rutas';
import { useAccion } from '../../hooks/useAccion';
import { useCarga } from '../../hooks/useCarga';
import { useTituloPagina } from '../../hooks/useTituloPagina';
import { crearSolicitud, obtenerMisSolicitudes } from '../../services/solicitudesSoftware';
import type { CategoriaSoftware, SolicitudSoftwareDTO } from '../../types/solicitudesSoftware';
import { formatearFechaCorta } from '../../utils/fechas';
import {
  CATEGORIAS_SOFTWARE,
  ESTADO_SOLICITUD,
  etiquetaCategoria,
  nombreConVersion,
} from '../../utils/solicitudes';

const MENSAJE_YA_EN_CATALOGO =
  'Ese software ya está en el catálogo, así que no hace falta solicitarlo. Coordinación puede añadirlo a los laboratorios que lo necesiten.';

interface Formulario {
  nombre: string;
  version: string;
  categoria: CategoriaSoftware | '';
  justificacion: string;
}

const FORMULARIO_VACIO: Formulario = { nombre: '', version: '', categoria: '', justificacion: '' };

const FilaSolicitud: React.FC<{ s: SolicitudSoftwareDTO }> = ({ s }) => {
  const estado = ESTADO_SOLICITUD[s.estado];
  return (
    <li className="flex flex-col gap-2 rounded-xl border border-saie-divider bg-white p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="m-0 text-base font-bold">{nombreConVersion(s)}</h3>
          <p className="m-0 text-xs text-saie-muted">
            {etiquetaCategoria(s.categoria)} · pedido el {formatearFechaCorta(s.fechaSolicitud)}
          </p>
        </div>
        <BadgeEstado tono={estado.tono}>{estado.etiqueta}</BadgeEstado>
      </div>
      <p className="m-0 text-sm text-saie-text">{s.justificacion}</p>
      {s.estado === 'RECHAZADA' && s.motivoRechazo && (
        <p className="m-0 rounded-lg bg-saie-danger-soft px-3 py-2 text-sm text-saie-danger-strong">
          <span className="block text-xs font-semibold">Motivo del rechazo</span>
          {s.motivoRechazo}
        </p>
      )}
      {s.estado === 'APROBADA' && (
        <p className="m-0 text-sm text-saie-muted">
          Aprobada: ya está en el catálogo. Falta que se instale en el laboratorio que lo necesite.
        </p>
      )}
    </li>
  );
};

/**
 * Solicitudes de software del docente (Issue 4.29): pide un software que no está en el catálogo
 * y consulta el estado de sus pedidos, con el motivo si Coordinación los rechazó.
 */
export const SolicitudesSoftwareDocentePage: React.FC = () => {
  useTituloPagina('Solicitudes de software');
  const { datos, cargando, error, recargar } = useCarga(obtenerMisSolicitudes, {
    clave: 'mis-solicitudes-software',
  });
  const accion = useAccion();
  const [form, setForm] = useState<Formulario>(FORMULARIO_VACIO);
  const [errores, setErrores] = useState<{ nombre?: string; justificacion?: string }>({});
  const [errorEnvio, setErrorEnvio] = useState<string | null>(null);

  const cambiar = (campo: keyof Formulario, valor: string) => {
    setForm((previo) => ({ ...previo, [campo]: valor }));
    setErrores((previo) => ({ ...previo, [campo]: undefined }));
    setErrorEnvio(null);
  };

  async function enviar(evento: React.FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    const nuevos = {
      nombre: form.nombre.trim() ? undefined : 'Escribe el nombre del software.',
      justificacion: form.justificacion.trim()
        ? undefined
        : 'Cuéntanos para qué lo necesitas: Coordinación lo usa para decidir.',
    };
    setErrores(nuevos);
    if (nuevos.nombre || nuevos.justificacion) return;

    const resultado = await accion.ejecutar(
      () =>
        crearSolicitud({
          nombre: form.nombre.trim(),
          version: form.version.trim() || undefined,
          categoria: form.categoria || undefined,
          justificacion: form.justificacion.trim(),
        }),
      { exito: 'Solicitud enviada. Coordinación la revisará.', avisarError: false },
    );
    if (resultado?.ok) {
      setForm(FORMULARIO_VACIO);
      recargar();
    } else if (resultado) {
      // 409: el software ya está en el catálogo; el mensaje del servidor trae un identificador interno.
      setErrorEnvio(resultado.estado === 409 ? MENSAJE_YA_EN_CATALOGO : resultado.error);
    }
  }

  const solicitudes = datos ?? [];

  return (
    <div className="min-h-screen bg-saie-canvas text-saie-text">
      <EnlaceSaltar />
      <CabeceraPortal portal="Docente" />

      <main
        id={ID_CONTENIDO}
        tabIndex={-1}
        className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-8 focus:outline-none"
      >
        <div className="flex flex-col gap-1">
          <Link to={RUTAS.inicioDocente} className="text-sm text-saie-primary">
            ← Volver al portal del docente
          </Link>
          <h1 className="m-0 text-2xl font-bold tracking-tight sm:text-3xl">
            Solicitudes de software
          </h1>
          <p className="m-0 text-sm text-saie-muted">
            ¿Necesitas un software que no está en el catálogo? Pídelo aquí.
          </p>
        </div>

        <form
          onSubmit={enviar}
          noValidate
          aria-labelledby="titulo-nueva-solicitud"
          className="flex flex-col gap-4 rounded-2xl border border-saie-divider bg-white p-5 shadow-sm"
        >
          <h2 id="titulo-nueva-solicitud" className="m-0 text-lg font-bold">
            Nueva solicitud
          </h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1">
              <Campo etiqueta="Nombre del software">
                <input
                  type="text"
                  value={form.nombre}
                  maxLength={100}
                  onChange={(e) => cambiar('nombre', e.target.value)}
                  aria-invalid={errores.nombre ? true : undefined}
                  aria-describedby={errores.nombre ? 'error-nombre' : undefined}
                  className={CLASE_CAMPO}
                />
              </Campo>
              {errores.nombre && (
                <span id="error-nombre" role="alert" className="text-sm text-saie-danger-strong">
                  {errores.nombre}
                </span>
              )}
            </div>
            <Campo etiqueta="Versión (opcional)">
              <input
                type="text"
                value={form.version}
                maxLength={30}
                onChange={(e) => cambiar('version', e.target.value)}
                className={CLASE_CAMPO}
              />
            </Campo>
          </div>
          <Campo etiqueta="Categoría (opcional)">
            <select
              value={form.categoria}
              onChange={(e) => cambiar('categoria', e.target.value)}
              className={CLASE_CAMPO}
            >
              <option value="">Sin categoría</option>
              {CATEGORIAS_SOFTWARE.map((c) => (
                <option key={c.valor} value={c.valor}>
                  {c.etiqueta}
                </option>
              ))}
            </select>
          </Campo>
          <div className="flex flex-col gap-1">
            <Campo
              etiqueta="¿Para qué lo necesitas?"
              ayuda="Curso, práctica o trabajo que lo requiere."
            >
              <textarea
                value={form.justificacion}
                maxLength={500}
                rows={3}
                onChange={(e) => cambiar('justificacion', e.target.value)}
                aria-invalid={errores.justificacion ? true : undefined}
                aria-describedby={errores.justificacion ? 'error-justificacion' : undefined}
                className={`${CLASE_CAMPO} py-2`}
              />
            </Campo>
            {errores.justificacion && (
              <span
                id="error-justificacion"
                role="alert"
                className="text-sm text-saie-danger-strong"
              >
                {errores.justificacion}
              </span>
            )}
          </div>

          {errorEnvio && <Aviso tono="error">{errorEnvio}</Aviso>}

          <div>
            <Boton type="submit" cargando={accion.cargando} textoCargando="Enviando…">
              Enviar solicitud
            </Boton>
          </div>
        </form>

        <section aria-labelledby="titulo-mis-solicitudes" className="flex flex-col gap-3">
          <h2 id="titulo-mis-solicitudes" className="m-0 text-lg font-bold">
            Mis solicitudes
          </h2>
          {error && <EstadoError mensaje={error} onReintentar={recargar} />}
          {cargando && !datos ? (
            <EsqueletoCarga texto="Cargando tus solicitudes…" />
          ) : solicitudes.length === 0 ? (
            <EstadoVacio
              titulo="Aún no has pedido ningún software"
              icono={ICONOS.portapapeles}
              descripcion="Cuando envíes una solicitud, aquí verás si fue aprobada o rechazada y por qué."
            />
          ) : (
            <ul className="m-0 flex list-none flex-col gap-3 p-0">
              {solicitudes.map((s) => (
                <FilaSolicitud key={s.id} s={s} />
              ))}
            </ul>
          )}
        </section>
      </main>
    </div>
  );
};

export default SolicitudesSoftwareDocentePage;
