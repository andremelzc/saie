import { render } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { describe, it, expect, vi } from 'vitest';
import InicioAdmin from './InicioAdmin';

vi.mock('../../context/useAuth', () => ({
  useAuth: () => ({
    usuario: { nombre: 'Admin Test', rol: 'COORDINACION' },
    cerrarSesion: vi.fn(),
    cargando: false,
  }),
}));

describe('InicioAdmin', () => {
  it('renderiza la vista de inicio del área administrativa', () => {
    const { container } = render(
      <BrowserRouter>
        <InicioAdmin />
      </BrowserRouter>
    );
    expect(container).toBeInTheDocument();
  });
});
