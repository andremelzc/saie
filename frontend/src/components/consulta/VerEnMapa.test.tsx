import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import VerEnMapa from './VerEnMapa';
import type { EspacioAsignadoDTO } from '../../types/consulta';

vi.mock('../mapa3d/Mapa3DLazy', () => ({
  default: (p: { resaltados?: string[]; pisoInicial?: number }) => (
    <div
      data-testid="mapa-3d"
      data-resaltados={p.resaltados?.join(',')}
      data-piso={p.pisoInicial}
    />
  ),
}));

const resaltadosEnPlano = () =>
  Array.from(screen.getByTestId('plano-2d').querySelectorAll('.plano2d-mia')).map((n) => n.id);

const e = (identificador: string, piso = 1): EspacioAsignadoDTO => ({
  id: identificador,
  identificador,
  tipo: 'LABORATORIO',
  pabellon: 'Nuevo',
  piso,
});

describe('VerEnMapa (HU-03)', () => {
  it('no muestra nada si la sección no tiene espacios', () => {
    const { container } = render(<VerEnMapa espacios={[]} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('abre el plano del piso con el espacio resaltado y lo vuelve a ocultar', () => {
    render(<VerEnMapa espacios={[e('NUE-201', 2)]} />);
    expect(screen.queryByTestId('plano-2d')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Ver en mapa' }));
    expect(screen.getByTestId('plano-2d').querySelector('svg')).toHaveAttribute('data-piso', '2');
    expect(resaltadosEnPlano()).toEqual(['NUE-201']);

    // La maqueta 3D sigue disponible como vista alternativa.
    fireEvent.click(screen.getByRole('button', { name: 'Maqueta 3D' }));
    const mapa = screen.getByTestId('mapa-3d');
    expect(mapa).toHaveAttribute('data-piso', '2');
    expect(mapa).toHaveAttribute('data-resaltados', 'NUE-201');

    fireEvent.click(screen.getByRole('button', { name: 'Ocultar mapa' }));
    expect(screen.queryByTestId('mapa-3d')).not.toBeInTheDocument();
  });

  it('resalta todas las salas de un bloque contiguo', () => {
    render(<VerEnMapa espacios={[e('NUE-101'), e('NUE-103')]} />);
    fireEvent.click(screen.getByRole('button', { name: 'Ver en mapa' }));

    expect(resaltadosEnPlano()).toEqual(['NUE-101', 'NUE-103']);
    expect(screen.getByText(/Salas resaltadas: NUE-101, NUE-103/)).toBeVisible();
  });
});
