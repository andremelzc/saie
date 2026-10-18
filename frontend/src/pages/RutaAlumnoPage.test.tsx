import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import RutaAlumnoPage from './RutaAlumnoPage';
import * as servicio from '../services/estudiante';
import type { RutaReferenciaDTO } from '../types/ruta';

vi.mock('../components/mapa3d/Mapa3DLazy', () => ({
  default: () => <div data-testid="mapa-3d" />,
}));

const RUTA: RutaReferenciaDTO = {
  asignacionId: 'asig-1',
  estado: 'DISPONIBLE',
  pabellon: 'Pabellón Nuevo',
  pisoDestino: 2,
  tiempoEstimadoTotalSegundos: 240,
  movilidadReducida: false,
  tramos: [
    {
      orden: 2,
      tipo: 'CAMBIO_PISO',
      titulo: 'Sube al piso 2',
      descripcion: 'Usa la escalera.',
      tiempoEstimadoSegundos: 90,
      esAccesible: false,
    },
    {
      orden: 1,
      tipo: 'ENTRADA_PABELLON',
      titulo: 'Entra al pabellón',
      descripcion: 'Ingresa por la puerta principal.',
      tiempoEstimadoSegundos: 60,
      esAccesible: true,
    },
    {
      orden: 3,
      tipo: 'ESPACIO_ASIGNADO',
      titulo: 'Llega a tu aula',
      descripcion: 'Aula 201 está al fondo.',
      tiempoEstimadoSegundos: 90,
      esAccesible: true,
      espacioId: 'e1',
      identificador: 'NUE-201',
      tipoEspacio: 'AULA_TEORICA',
      pabellon: 'Pabellón Nuevo',
      piso: 2,
    },
  ],
};

function renderizar() {
  return render(
    <MemoryRouter initialEntries={['/estudiante/ruta/asig-1']}>
      <Routes>
        <Route path="/estudiante/ruta/:asignacionId" element={<RutaAlumnoPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('RutaAlumnoPage (Issues 3.14 y 3.15)', () => {
  beforeEach(() => vi.restoreAllMocks());

  it('pide la ruta de la asignación de la URL y muestra los tramos en orden', async () => {
    const espia = vi.spyOn(servicio, 'obtenerRuta').mockResolvedValue(RUTA);
    renderizar();

    expect(await screen.findByRole('heading', { name: /1\. Entra al pabellón/ })).toBeVisible();
    expect(espia).toHaveBeenCalledWith('asig-1');
    const titulos = screen.getAllByRole('heading', { level: 3 }).map((h) => h.textContent);
    expect(titulos.slice(0, 3)).toEqual([
      '1. Entra al pabellón',
      '2. Sube al piso 2',
      '3. Llega a tu aula',
    ]);
    expect(screen.getByText('Tiempo estimado')).toBeVisible();
    expect(screen.getAllByText('4 min').length).toBeGreaterThan(0);
    expect(screen.getByTestId('plano-2d')).toBeInTheDocument();
  });

  it('avisa cuando todavía no hay ruta disponible', async () => {
    vi.spyOn(servicio, 'obtenerRuta').mockResolvedValue({
      ...RUTA,
      estado: 'RUTA_NO_DISPONIBLE',
      mensaje: 'La clase aún no tiene aula.',
      tramos: [],
    });
    renderizar();

    expect(await screen.findByText('La clase aún no tiene aula.')).toBeVisible();
    expect(screen.queryByTestId('mapa-3d')).not.toBeInTheDocument();
  });

  it('muestra el error y permite reintentar', async () => {
    vi.spyOn(servicio, 'obtenerRuta').mockRejectedValue(new Error('x'));
    renderizar();

    expect(await screen.findByRole('alert')).toHaveTextContent(/No pudimos cargar la ruta/);
    expect(screen.getByRole('button', { name: 'Reintentar' })).toBeVisible();
  });
});
