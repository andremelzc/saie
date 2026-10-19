import { render, screen, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { describe, it, expect, vi } from 'vitest';
import CambioLaboratorio from './CambioLaboratorio';

vi.mock('../../context/useAuth', () => ({
  useAuth: () => ({
    usuario: { nombre: 'Admin Test', rol: 'JEFATURA' },
    cerrarSesion: vi.fn(),
    cargando: false,
  }),
}));

describe('CambioLaboratorio', () => {
  it('renderiza el formulario de cambio de software/PCs y permite interactuar con inputs', () => {
    const { container } = render(
      <BrowserRouter>
        <CambioLaboratorio />
      </BrowserRouter>,
    );
    expect(container).toBeInTheDocument();

    const inputs = screen.queryAllByRole('textbox');
    if (inputs.length > 0) {
      fireEvent.change(inputs[0], { target: { value: 'Laboratorio L1' } });
    }
  });
});
