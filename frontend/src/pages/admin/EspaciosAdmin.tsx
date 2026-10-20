import React, { useState } from 'react';
import LayoutAdmin, { AvisoError } from '../../components/admin/LayoutAdmin';
import { EsqueletoCarga, EstadoVacio } from '../../components/estudiante/ElementosHorario';
import { useCarga } from '../../hooks/useCarga';
import { obtenerEspacios } from '../../services/admin';
import type { TipoEspacio } from '../../types/admin';

type Filtro = 'TODOS' | TipoEspacio;

/** Listado de espacios para Coordinación (Issue 4.15, vista de consulta). */
export const EspaciosAdmin: React.FC = () => {
  const cargar = React.useCallback(() => obtenerEspacios(), []);
  const { datos, cargando, error, recargar } = useCarga(cargar);
  const [filtro, setFiltro] = useState<Filtro>('TODOS');
  const [texto, setTexto] = useState('');

  const espacios = (datos ?? [])
    .filter((e) => filtro === 'TODOS' || e.tipo === filtro)
    .filter((e) => e.identificador.toLowerCase().includes(texto.trim().toLowerCase()));

  return (
    <LayoutAdmin
      titulo="Gestión de espacios"
      subtitulo="Aulas teóricas y laboratorios del pabellón."
    >
      <div className="flex flex-wrap items-center gap-3">
        <input
          type="search"
          aria-label="Buscar espacio"
          placeholder="Buscar por identificador…"
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          className="min-w-0 flex-1 rounded-lg border border-saie-divider bg-white px-3 py-2 text-sm"
        />
        <select
          aria-label="Tipo de espacio"
          value={filtro}
          onChange={(e) => setFiltro(e.target.value as Filtro)}
          className="rounded-lg border border-saie-divider bg-white px-3 py-2 text-sm"
        >
          <option value="TODOS">Todos</option>
          <option value="AULA_TEORICA">Aulas teóricas</option>
          <option value="LABORATORIO">Laboratorios</option>
        </select>
      </div>

      {error && <AvisoError mensaje={error} onReintentar={recargar} />}

      {cargando && !datos ? (
        <EsqueletoCarga texto="Cargando espacios…" />
      ) : espacios.length === 0 ? (
        <EstadoVacio
          titulo="Sin espacios"
          descripcion="No hay espacios que coincidan con la búsqueda."
        />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-saie-divider bg-white">
          <table className="w-full text-left text-sm">
            <thead className="bg-saie-canvas text-xs uppercase tracking-wide text-saie-muted">
              <tr>
                <th className="px-4 py-3">Espacio</th>
                <th className="px-4 py-3">Tipo</th>
                <th className="px-4 py-3">Ubicación</th>
                <th className="px-4 py-3">Aforo</th>
                <th className="px-4 py-3">PCs malogradas</th>
                <th className="px-4 py-3">Estado</th>
              </tr>
            </thead>
            <tbody>
              {espacios.map((e) => (
                <tr key={e.id} className="border-t border-saie-divider">
                  <td className="px-4 py-3 font-semibold">{e.identificador}</td>
                  <td className="px-4 py-3">
                    {e.tipo === 'LABORATORIO' ? 'Laboratorio' : 'Aula teórica'}
                  </td>
                  <td className="px-4 py-3">
                    {e.pabellon} · Piso {e.piso}
                  </td>
                  <td className="px-4 py-3">{e.aforoNominal}</td>
                  <td className="px-4 py-3">{e.pcsMalogradas ?? '—'}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-semibold ${e.habilitado ? 'bg-[#E8F3E9] text-saie-success' : 'bg-[#FBE9E9] text-saie-danger'}`}
                    >
                      {e.habilitado ? 'Habilitado' : 'Fuera de servicio'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </LayoutAdmin>
  );
};

export default EspaciosAdmin;
