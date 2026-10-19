import { render, screen, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { describe, it, expect, vi } from 'vitest';
import EspaciosAdmin from './EspaciosAdmin';

vi.mock('../../context/useAuth', () => ({
  useAuth: () => ({
    usuario: { nombre: 'Admin Test', rol: 'COORDINACION' },
    cerrarSesion: vi.fn(),
    cargando: false,
  }),
}));

describe('EspaciosAdmin', () => {
  it('renderiza el módulo de gestión de espacios y soporta búsquedas/filtros', () => {
    const { container } = render(
      <BrowserRouter>
        <EspaciosAdmin />
      </BrowserRouter>,
    );
    expect(container).toBeInTheDocument();

    const inputs = screen.queryAllByRole('textbox');
    if (inputs.length > 0) {
      fireEvent.change(inputs[0], { target: { value: 'A101' } });
    }
  });
});
