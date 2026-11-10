import React, { useState } from 'react';
import LayoutAdmin, { AvisoError } from '../../components/admin/LayoutAdmin';
import { EsqueletoCarga, EstadoVacio } from '../../components/ui/EstadosCarga';
import { BadgeEstado } from '../../components/ui/BadgeEstado';
import type { TonoBadge } from '../../components/ui/BadgeEstado';
import { Boton } from '../../components/ui/Boton';
import { BotonEnlace } from '../../components/ui/BotonEnlace';
import { Campo } from '../../components/ui/Campo';
import { CLASE_CAMPO } from '../../components/ui/campos';
import { ICONOS } from '../../components/ui/iconos';
import { ZonaActualizable } from '../../components/ui/ZonaActualizable';
import { RUTAS } from '../../config/rutas';
import { useAuth } from '../../context/useAuth';
import { useCarga } from '../../hooks/useCarga';
import { useValorDiferido } from '../../hooks/useValorDiferido';
import { CLAVE_LABORATORIOS_ESTADO, obtenerLaboratoriosConEstado } from '../../services/admin';
import type { LaboratorioConEstadoDTO } from '../../services/admin';
import type { EstadoOcupacionEspacio } from '../../types/mapa';
import { formatearRango } from '../../utils/horario';
import { plural } from '../../utils/texto';
import { fraseDeMotivoAlerta } from '../../utils/textoMotor';

type FiltroEstado = 'TODOS' | 'ALERTA_ACTIVA' | 'DISPONIBLE' | 'OCUPADO' | 'DESHABILITADO';

const OPCIONES_ESTADO: { valor: FiltroEstado; etiqueta: string }[] = [
  { valor: 'TODOS', etiqueta: 'Todos' },
  { valor: 'ALERTA_ACTIVA', etiqueta: 'Con alerta' },
  { valor: 'DISPONIBLE', etiqueta: 'Libres ahora' },
  { valor: 'OCUPADO', etiqueta: 'Ocupados ahora' },
  { valor: 'DESHABILITADO', etiqueta: 'No asignables' },
];

const ETIQUETA_ESTADO: Record<EstadoOcupacionEspacio, string> = {
  DISPONIBLE: 'Disponible',
  OCUPADO: 'Ocupado',
  ALERTA_ACTIVA: 'Con alerta',
  DESHABILITADO: 'No asignable',
};

/** minúsculas y sin tildes ni separadores, para buscar «lab 04» o «Lab-04» por igual. */
const normalizar = (texto: string) =>
  texto
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '');

const TONO_ESTADO: Record<EstadoOcupacionEspacio, TonoBadge> = {
  DISPONIBLE: 'exito',
  OCUPADO: 'peligro',
  ALERTA_ACTIVA: 'advertencia',
  DESHABILITADO: 'neutro',
};

/** Tarjeta de un laboratorio: estado ahora, aforo real frente al nominal, PCs y software. */
const TarjetaLaboratorio: React.FC<{ lab: LaboratorioConEstadoDTO; esJefatura: boolean }> = ({
  lab,
  esJefatura,
}) => {
  const inoperativas = lab.pcsMalogradas ?? 0;
  const porcentaje =
    lab.aforoNominal > 0 ? Math.round((lab.capacidadReal / lab.aforoNominal) * 100) : 0;
  const software = lab.softwareInstalado ?? [];
  return (
    <article
      aria-label={`Laboratorio ${lab.identificador}`}
      className="flex w-full flex-col gap-3 rounded-xl border border-saie-divider bg-white p-4"
    >
      <header className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="m-0 text-base font-bold">{lab.identificador}</h3>
          <p className="m-0 text-sm text-saie-muted">
            {lab.pabellon} · piso {lab.piso}
          </p>
        </div>
        {lab.estado && (
          <BadgeEstado tono={TONO_ESTADO[lab.estado]}>{ETIQUETA_ESTADO[lab.estado]}</BadgeEstado>
        )}
      </header>

      <div className="flex flex-col gap-1">
        <p className="m-0 text-sm">
          Aforo real <strong className="font-semibold tabular-nums">{lab.capacidadReal}</strong> de{' '}
          <span className="tabular-nums">{lab.aforoNominal}</span> nominal
        </p>
        <div
          role="meter"
          aria-label={`Aforo real de ${lab.identificador}`}
          aria-valuemin={0}
          aria-valuemax={lab.aforoNominal}
          aria-valuenow={lab.capacidadReal}
          className="h-2 overflow-hidden rounded-full bg-saie-canvas-dark"
        >
          <div
            className={`h-full rounded-full ${porcentaje < 80 ? 'bg-saie-warning-strong' : 'bg-saie-success-strong'}`}
            style={{ width: `${porcentaje}%` }}
          />
        </div>
      </div>

      <dl className="m-0 grid grid-cols-2 gap-2 text-sm">
        <div>
          <dt className="text-xs text-saie-muted">PCs inoperativas</dt>
          <dd
            className={`m-0 font-semibold tabular-nums ${inoperativas > 0 ? 'text-saie-danger-strong' : ''}`}
          >
            {lab.pcsMalogradas === null ? 'Sin registrar' : inoperativas}
          </dd>
        </div>
        <div>
          <dt className="text-xs text-saie-muted">Software</dt>
          <dd className="m-0 font-semibold">{plural(software.length, 'programa', 'programas')}</dd>
        </div>
      </dl>

      {lab.asignacion && (
        <p className="m-0 rounded-lg bg-saie-canvas px-3 py-2 text-sm">
          Ahora: {lab.asignacion.codigoCurso} · Sección {lab.asignacion.codigoSeccion},{' '}
          {formatearRango(lab.asignacion.horaInicio, lab.asignacion.horaFin)}
        </p>
      )}
      {lab.alertas.length > 0 && (
        <p className="m-0 text-sm text-saie-warning-strong">
          {plural(lab.alertas.length, 'alerta pendiente', 'alertas pendientes')}:{' '}
          {fraseDeMotivoAlerta(lab.alertas[0].motivo)}
        </p>
      )}

      {esJefatura && (
        <div className="mt-auto flex flex-wrap gap-2">
          <BotonEnlace
            to={`${RUTAS.cambioLaboratorio}?lab=${encodeURIComponent(lab.id)}`}
            variante="secundario"
            tamano="sm"
          >
            Reportar cambio <span className="sr-only">de {lab.identificador}</span>
          </BotonEnlace>
        </div>
      )}
    </article>
  );
};

/**
 * Listado de laboratorios (Issue 4.16): búsqueda y filtros por piso y por estado ahora (con
 * alerta, libres…), con el aforo real frente al nominal de cada uno. Jefatura ve solo los suyos.
 */
export const LaboratoriosAdminPage: React.FC = () => {
  const { sesion } = useAuth();
  const esJefatura = sesion?.rol === 'JEFATURA_LABORATORIOS';
  const { datos, cargando, error, recargar } = useCarga(obtenerLaboratoriosConEstado, {
    clave: CLAVE_LABORATORIOS_ESTADO,
  });
  const [texto, setTexto] = useState('');
  const [piso, setPiso] = useState('TODOS');
  const [estado, setEstado] = useState<FiltroEstado>('TODOS');
  const textoDiferido = useValorDiferido(texto);

  const todos = datos ?? [];
  const pisos = [...new Set(todos.map((l) => l.piso))].sort((a, b) => a - b);
  const busqueda = normalizar(textoDiferido);
  const laboratorios = todos
    .filter((l) => !busqueda || normalizar(l.identificador).includes(busqueda))
    .filter((l) => piso === 'TODOS' || String(l.piso) === piso)
    .filter((l) => estado === 'TODOS' || l.estado === estado)
    .sort((a, b) => a.identificador.localeCompare(b.identificador, 'es', { numeric: true }));
  const hayFiltros = texto !== '' || piso !== 'TODOS' || estado !== 'TODOS';

  const limpiar = () => {
    setTexto('');
    setPiso('TODOS');
    setEstado('TODOS');
  };

  return (
    <LayoutAdmin
      volverA={esJefatura ? undefined : { to: RUTAS.inicioAdmin, etiqueta: 'Volver al inicio' }}
      titulo="Laboratorios y equipos"
      subtitulo={
        esJefatura
          ? 'Tus laboratorios: estado ahora, aforo real y equipos.'
          : 'Todos los laboratorios: estado ahora, aforo real y equipos.'
      }
      acciones={
        <Boton
          variante="secundario"
          onClick={recargar}
          cargando={cargando}
          textoCargando="Actualizando…"
        >
          Actualizar datos
        </Boton>
      }
    >
      <section aria-label="Filtros de laboratorios" className="flex flex-col gap-3">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Campo etiqueta="Buscar laboratorio">
            <input
              type="search"
              placeholder="Ej. Lab 04"
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              className={CLASE_CAMPO}
            />
          </Campo>
          <Campo etiqueta="Piso">
            <select value={piso} onChange={(e) => setPiso(e.target.value)} className={CLASE_CAMPO}>
              <option value="TODOS">Todos</option>
              {pisos.map((p) => (
                <option key={p} value={String(p)}>
                  Piso {p}
                </option>
              ))}
            </select>
          </Campo>
          <Campo etiqueta="Estado">
            <select
              value={estado}
              onChange={(e) => setEstado(e.target.value as FiltroEstado)}
              className={CLASE_CAMPO}
            >
              {OPCIONES_ESTADO.map((o) => (
                <option key={o.valor} value={o.valor}>
                  {o.etiqueta}
                </option>
              ))}
            </select>
          </Campo>
        </div>
        {datos && (
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="m-0 text-sm text-saie-muted" aria-live="polite">
              <strong className="text-saie-text">{laboratorios.length}</strong> de{' '}
              {plural(todos.length, 'laboratorio', 'laboratorios')}
            </p>
            {hayFiltros && (
              <Boton variante="fantasma" tamano="sm" onClick={limpiar}>
                Limpiar filtros
              </Boton>
            )}
          </div>
        )}
      </section>

      {error && <AvisoError mensaje={error} onReintentar={recargar} />}
      <ZonaActualizable actualizando={cargando && datos !== null}>
        {cargando && !datos ? (
          <EsqueletoCarga texto="Cargando laboratorios…" forma="tarjeta" />
        ) : laboratorios.length === 0 ? (
          <EstadoVacio
            titulo={todos.length === 0 ? 'Sin laboratorios' : 'Sin coincidencias'}
            icono={ICONOS.monitor}
            descripcion={
              todos.length === 0
                ? 'No hay laboratorios registrados a tu cargo.'
                : 'Prueba con otro piso, estado o búsqueda.'
            }
            accion={
              hayFiltros ? (
                <Boton variante="secundario" tamano="sm" onClick={limpiar}>
                  Limpiar filtros
                </Boton>
              ) : undefined
            }
          />
        ) : (
          <ul
            aria-label="Laboratorios"
            className="saie-stagger m-0 grid list-none grid-cols-1 gap-3 p-0 sm:grid-cols-2 lg:grid-cols-3"
          >
            {laboratorios.map((lab) => (
              <li key={lab.id} className="flex">
                <TarjetaLaboratorio lab={lab} esJefatura={esJefatura} />
              </li>
            ))}
          </ul>
        )}
      </ZonaActualizable>
    </LayoutAdmin>
  );
};

export default LaboratoriosAdminPage;
