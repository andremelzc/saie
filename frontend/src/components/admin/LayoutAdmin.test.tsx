import { render } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { describe, it, expect, vi } from 'vitest';
import LayoutAdmin from './LayoutAdmin';

vi.mock('../../context/useAuth', () => ({
  useAuth: () => ({
    usuario: { nombre: 'Admin Test', rol: 'COORDINACION' },
    cerrarSesion: vi.fn(),
    cargando: false,
  }),
}));

describe('LayoutAdmin', () => {
  it('renderiza el layout del panel administrativo', () => {
    const { container } = render(
      <BrowserRouter>
        <LayoutAdmin titulo="Panel de Prueba">
          <div>Contenido de prueba</div>
        </LayoutAdmin>
      </BrowserRouter>,
    );
    expect(container).toBeInTheDocument();
  });
});
