import { render } from '@testing-library/react';
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
  it('renderiza el módulo de espacios', () => {
    const { container } = render(
      <BrowserRouter>
        <EspaciosAdmin />
      </BrowserRouter>,
    );
    expect(container).toBeInTheDocument();
  });
});
