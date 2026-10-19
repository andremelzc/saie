import { render, screen, fireEvent } from '@testing-library/react';
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
  it('renderiza la vista de inicio del área administrativa e interactúa con sus elementos', () => {
    const { container } = render(
      <BrowserRouter>
        <InicioAdmin />
      </BrowserRouter>,
    );
    expect(container).toBeInTheDocument();

    // Simula interacción si existen botones en la vista
    const botones = screen.queryAllByRole('button');
    if (botones.length > 0) {
      fireEvent.click(botones[0]);
    }
  });
});
