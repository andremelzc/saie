import type React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { LoginAdmin } from './LoginAdmin';
import api from '../services/api';
import type { LoginResponseDTO } from '../types/auth';

vi.mock('../services/api', () => ({
  default: {
    post: vi.fn(),
  },
  api: {
    post: vi.fn(),
  },
}));

function completarFormulario(usuario: string, clave: string) {
  fireEvent.change(screen.getByLabelText(/Usuario/i), { target: { value: usuario } });
  fireEvent.change(screen.getByLabelText(/^Contraseña/i, { selector: 'input' }), {
    target: { value: clave },
  });
}

/** Los logins incluyen enlaces del router (volver al inicio, otros portales). */
function renderizar(ui: React.ReactElement) {
  return render(<MemoryRouter>{ui}</MemoryRouter>);
}

describe('LoginAdmin (Issue #217 / 4.25)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renderiza usuario y contraseña, sin opción de crear cuenta', () => {
    renderizar(<LoginAdmin />);

    expect(screen.getByRole('heading', { name: /Panel Administrativo/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/Usuario/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^Contraseña/i, { selector: 'input' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Iniciar sesión/i })).toBeDisabled();

    expect(screen.queryByText(/crear cuenta/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/registrarse/i)).not.toBeInTheDocument();
  });

  it('envía usuario y clave a POST /v1/auth/admin/login y entrega el resultado', async () => {
    const resultado: LoginResponseDTO = {
      token: 'token-de-prueba',
      rol: 'COORDINACION_ACADEMICA',
      debeCambiarClave: false,
      expiresIn: '8h',
    };
    vi.mocked(api.post).mockResolvedValueOnce({ data: { success: true, data: resultado } });
    const onLoginExitoso = vi.fn();

    renderizar(<LoginAdmin onLoginExitoso={onLoginExitoso} />);
    completarFormulario('coordinacion', 'clave-de-prueba');
    fireEvent.click(screen.getByRole('button', { name: /Iniciar sesión/i }));

    await waitFor(() => expect(onLoginExitoso).toHaveBeenCalledWith(resultado));
    expect(api.post).toHaveBeenCalledWith('/v1/auth/admin/login', {
      usuario: 'coordinacion',
      clave: 'clave-de-prueba',
    });
  });

  it('muestra un mensaje claro ante credenciales inválidas (401) sin invitar a crear cuenta', async () => {
    vi.mocked(api.post).mockRejectedValueOnce({ response: { status: 401, data: {} } });
    const onLoginExitoso = vi.fn();

    renderizar(<LoginAdmin onLoginExitoso={onLoginExitoso} />);
    completarFormulario('coordinacion', 'incorrecta');
    fireEvent.click(screen.getByRole('button', { name: /Iniciar sesión/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent(/Credenciales inválidas/i);
    expect(screen.queryByText(/crear cuenta/i)).not.toBeInTheDocument();
    expect(onLoginExitoso).not.toHaveBeenCalled();
  });

  it('muestra el aviso de sesión vencida cuando se le indica', () => {
    renderizar(
      <LoginAdmin avisoSesion="Tu sesión venció. Inicia sesión nuevamente para continuar." />,
    );

    expect(screen.getByRole('status')).toHaveTextContent(/Tu sesión venció/i);
  });
});
