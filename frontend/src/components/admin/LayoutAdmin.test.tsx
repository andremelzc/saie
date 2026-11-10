import { render, screen } from '@testing-library/react';
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

  it('en una pantalla que no es pestaña ofrece volver a la que la abrió', () => {
    render(
      <BrowserRouter>
        <LayoutAdmin titulo="Claves" volverA={{ to: '/admin', etiqueta: 'Volver al inicio' }}>
          <div>Contenido</div>
        </LayoutAdmin>
      </BrowserRouter>,
    );
    expect(screen.getByRole('link', { name: /Volver al inicio/ })).toHaveAttribute(
      'href',
      '/admin',
    );
  });

  it('sin volverA no muestra el enlace', () => {
    render(
      <BrowserRouter>
        <LayoutAdmin titulo="Espacios">
          <div>Contenido</div>
        </LayoutAdmin>
      </BrowserRouter>,
    );
    expect(screen.queryByRole('link', { name: /Volver/ })).toBeNull();
  });
});
