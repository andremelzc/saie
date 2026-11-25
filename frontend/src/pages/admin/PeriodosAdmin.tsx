import React, { useState } from 'react';
import LayoutAdmin, { AvisoError } from '../../components/admin/LayoutAdmin';
import { Aviso } from '../../components/ui/Aviso';
import { BadgeEstado } from '../../components/ui/BadgeEstado';
import type { TonoBadge } from '../../components/ui/BadgeEstado';
import { Boton } from '../../components/ui/Boton';
import { Campo } from '../../components/ui/Campo';
import { CLASE_CAMPO } from '../../components/ui/campos';
import { DialogoConfirmacion } from '../../components/ui/DialogoConfirmacion';
import { EsqueletoCarga, EstadoVacio } from '../../components/ui/EstadosCarga';
import { useAccion } from '../../hooks/useAccion';
import { invalidarCacheCarga, useCarga } from '../../hooks/useCarga';
import {
  activarPeriodo,
  cerrarPeriodo,
  obtenerPeriodos,
  registrarPeriodo,
} from '../../services/admin';
import type { EstadoPeriodo, PeriodoDTO } from '../../types/admin';
import { formatearFechaCivil } from '../../utils/fechas';

/**
 * Issue 4.64 (riesgos R25, R49–R52): Coordinación decide cuándo cambia el semestre. Un periodo
 * pasa de «en preparación» a «vigente» (al activarlo, el anterior se cierra en el mismo paso) y de
 * «vigente» a «cerrado», que es solo consulta.
 */

const ESTADO: Record<EstadoPeriodo, { etiqueta: string; tono: TonoBadge }> = {
  EN_PREPARACION: { etiqueta: 'En preparación', tono: 'info' },
  VIGENTE: { etiqueta: 'Vigente', tono: 'exito' },
  CERRADO: { etiqueta: 'Cerrado', tono: 'neutro' },
};

type Accion = { tipo: 'activar' | 'cerrar'; periodo: PeriodoDTO };

function textoFechas(p: PeriodoDTO): string {
  const inicio = formatearFechaCivil(p.fechaInicio);
  const fin = formatearFechaCivil(p.fechaFin);
  if (inicio && fin) return `${inicio} al ${fin}`;
  if (inicio) return `Desde el ${inicio}`;
  if (fin) return `Hasta el ${fin}`;
  return 'Sin fechas registradas';
}

/** Lo que la persona verá al confirmar: qué pasa con el periodo vigente y con sus datos. */
function descripcionDeAccion(accion: Accion, vigente: string | null): string {
  const { codigo } = accion.periodo;
  if (accion.tipo === 'activar') {
    return vigente
      ? `El periodo ${vigente} se cerrará y sus asignaciones pasarán al historial. Alumnos, docentes y Telegram verán el ${codigo}. Esta acción no se puede deshacer.`
      : `Alumnos, docentes y Telegram verán el periodo ${codigo}.`;
  }
  return `El periodo ${codigo} quedará solo para consulta: no se podrá cargar, editar ni reasignar. Esta acción no se puede deshacer.`;
}

export const PeriodosAdmin: React.FC = () => {
  const { datos, cargando, error, recargar } = useCarga(obtenerPeriodos, { clave: 'periodos' });
  const { ejecutar, cargando: ejecutando } = useAccion();
  const [codigo, setCodigo] = useState('');
  const [fechaInicio, setFechaInicio] = useState('');
  const [fechaFin, setFechaFin] = useState('');
  const [errorForm, setErrorForm] = useState<string | null>(null);
  const [pendiente, setPendiente] = useState<Accion | null>(null);

  function refrescar() {
    invalidarCacheCarga('periodos');
    recargar();
  }

  async function registrar(e: React.FormEvent) {
    e.preventDefault();
    setErrorForm(null);
    const resultado = await ejecutar(
      () =>
        registrarPeriodo({
          codigo: codigo.trim(),
          ...(fechaInicio && { fechaInicio }),
          ...(fechaFin && { fechaFin }),
        }),
      { exito: (p) => `Periodo ${p.codigo} registrado, en preparación.`, avisarError: false },
    );
    if (resultado?.ok) {
      setCodigo('');
      setFechaInicio('');
      setFechaFin('');
      refrescar();
    } else if (resultado) {
      setErrorForm(resultado.error);
    }
  }

  async function confirmar() {
    if (!pendiente) return;
    const { tipo, periodo } = pendiente;
    const accion = tipo === 'activar' ? activarPeriodo : cerrarPeriodo;
    setPendiente(null);
    const resultado = await ejecutar(() => accion(periodo.codigo), {
      exito:
        tipo === 'activar'
          ? `Periodo ${periodo.codigo} activado.`
          : `Periodo ${periodo.codigo} cerrado.`,
    });
    if (resultado?.ok) refrescar();
  }

  const registrados = datos?.registrados ?? [];

  return (
    <LayoutAdmin
      titulo="Periodos"
      subtitulo="Registra el semestre siguiente, actívalo cuando empiece y ciérralo al terminar."
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
      {error && <AvisoError mensaje={error} onReintentar={recargar} />}

      <section aria-labelledby="titulo-registrar" className="flex flex-col gap-3">
        <h2 id="titulo-registrar" className="m-0 text-lg font-bold text-saie-text">
          Registrar un periodo
        </h2>
        <form onSubmit={registrar} className="grid gap-3 sm:grid-cols-3" noValidate>
          <Campo etiqueta="Código" ayuda="Por ejemplo 2027-1 (también 2027-I)">
            <input
              className={CLASE_CAMPO}
              value={codigo}
              onChange={(e) => setCodigo(e.target.value)}
              required
              autoComplete="off"
            />
          </Campo>
          <Campo etiqueta="Fecha de inicio (opcional)">
            <input
              className={CLASE_CAMPO}
              type="date"
              value={fechaInicio}
              onChange={(e) => setFechaInicio(e.target.value)}
            />
          </Campo>
          <Campo etiqueta="Fecha de fin (opcional)">
            <input
              className={CLASE_CAMPO}
              type="date"
              value={fechaFin}
              onChange={(e) => setFechaFin(e.target.value)}
            />
          </Campo>
          <div className="sm:col-span-3 flex flex-col gap-2">
            {errorForm && <Aviso tono="error">{errorForm}</Aviso>}
            <div>
              <Boton
                type="submit"
                disabled={!codigo.trim() || ejecutando}
                cargando={ejecutando}
                textoCargando="Registrando…"
              >
                Registrar periodo
              </Boton>
            </div>
          </div>
        </form>
      </section>

      <section aria-labelledby="titulo-lista" className="flex flex-col gap-3">
        <h2 id="titulo-lista" className="m-0 text-lg font-bold text-saie-text">
          Periodos registrados
        </h2>
        {cargando && !datos ? (
          <EsqueletoCarga texto="Cargando periodos…" forma="tarjeta" />
        ) : registrados.length === 0 ? (
          <EstadoVacio
            titulo="Todavía no hay periodos"
            descripcion="Registra el primero para poder cargar datos."
          />
        ) : (
          <ul aria-label="Periodos registrados" className="m-0 flex list-none flex-col gap-3 p-0">
            {registrados.map((p) => (
              <li
                key={p.codigo}
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-saie-divider bg-white p-4"
              >
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-2">
                    <strong className="text-lg text-saie-text">{p.codigo}</strong>
                    <BadgeEstado tono={ESTADO[p.estado].tono}>
                      {ESTADO[p.estado].etiqueta}
                    </BadgeEstado>
                  </div>
                  <span className="text-sm text-saie-muted">{textoFechas(p)}</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {p.estado === 'EN_PREPARACION' && (
                    <Boton
                      variante="primario"
                      tamano="sm"
                      disabled={ejecutando}
                      onClick={() => setPendiente({ tipo: 'activar', periodo: p })}
                    >
                      Activar periodo
                    </Boton>
                  )}
                  {p.estado !== 'CERRADO' && (
                    <Boton
                      variante="secundario"
                      tamano="sm"
                      disabled={ejecutando}
                      onClick={() => setPendiente({ tipo: 'cerrar', periodo: p })}
                    >
                      Cerrar periodo
                    </Boton>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <DialogoConfirmacion
        abierto={pendiente !== null}
        titulo={
          pendiente?.tipo === 'activar'
            ? `¿Activar el periodo ${pendiente.periodo.codigo}?`
            : `¿Cerrar el periodo ${pendiente?.periodo.codigo ?? ''}?`
        }
        descripcion={pendiente ? descripcionDeAccion(pendiente, datos?.vigente ?? null) : ''}
        textoConfirmar={pendiente?.tipo === 'activar' ? 'Sí, activar' : 'Sí, cerrar'}
        variante="peligro"
        onConfirmar={confirmar}
        onCancelar={() => setPendiente(null)}
      />
    </LayoutAdmin>
  );
};

export default PeriodosAdmin;
