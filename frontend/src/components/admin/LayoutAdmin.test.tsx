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
  it('renderiza la estructura base y navegación del área administrativa', () => {
    const { container } = render(
      <BrowserRouter>
        <LayoutAdmin />
      </BrowserRouter>,
    );
    expect(container).toBeInTheDocument();
  });
});
