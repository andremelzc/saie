import { render } from '@testing-library/react';
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
  it('renderiza el formulario de cambio de software/PCs', () => {
    const { container } = render(
      <BrowserRouter>
        <CambioLaboratorio />
      </BrowserRouter>
    );
    expect(container).toBeInTheDocument();
  });
});
