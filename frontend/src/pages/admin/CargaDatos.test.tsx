import { render } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { describe, it, expect, vi } from 'vitest';
import CargaDatos from './CargaDatos';

vi.mock('../../context/useAuth', () => ({
  useAuth: () => ({
    usuario: { nombre: 'Admin Test', rol: 'COORDINACION' },
    cerrarSesion: vi.fn(),
    cargando: false,
  }),
}));

describe('CargaDatos', () => {
  it('renderiza el módulo de carga de datos maestros', () => {
    const { container } = render(
      <BrowserRouter>
        <CargaDatos />
      </BrowserRouter>,
    );
    expect(container).toBeInTheDocument();
  });
});
