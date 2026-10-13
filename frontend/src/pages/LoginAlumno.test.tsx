import type React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { LoginAlumno } from './LoginAlumno';
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

/** Los logins incluyen enlaces del router (volver al inicio, otros portales). */
function renderizar(ui: React.ReactElement) {
  return render(<MemoryRouter>{ui}</MemoryRouter>);
}

describe('LoginAlumno (Issue #151 / 3.22)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renderiza el formulario con código de alumno y clave, sin opción de crear cuenta', () => {
    renderizar(<LoginAlumno />);

    expect(screen.getByRole('heading', { name: /Portal del Estudiante/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/Código de alumno/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^Contraseña/i, { selector: 'input' })).toBeInTheDocument();

    const botonSubmit = screen.getByRole('button', { name: /Iniciar sesión/i });
    expect(botonSubmit).toBeInTheDocument();
    expect(botonSubmit).toBeDisabled();

    // Verificación crítica: NO debe existir opción para crear cuenta o registrarse
    expect(screen.queryByText(/crear cuenta/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/registrarse/i)).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /crear cuenta/i })).not.toBeInTheDocument();
  });

  it('permite alternar la visibilidad de la contraseña con el botón de ojo', () => {
    renderizar(<LoginAlumno />);

    const inputClave = screen.getByLabelText(/^Contraseña/i, { selector: 'input' });
    const botonToggle = screen.getByRole('button', { name: /Mostrar contraseña/i });

    expect(inputClave).toHaveAttribute('type', 'password');

    fireEvent.click(botonToggle);
    expect(inputClave).toHaveAttribute('type', 'text');
    expect(screen.getByRole('button', { name: /Ocultar contraseña/i })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Ocultar contraseña/i }));
    expect(inputClave).toHaveAttribute('type', 'password');
  });

  it('habilita el botón solo cuando ambos campos están completos', () => {
    renderizar(<LoginAlumno />);

    const inputCodigo = screen.getByLabelText(/Código de alumno/i);
    const inputClave = screen.getByLabelText(/^Contraseña/i, { selector: 'input' });
    const botonSubmit = screen.getByRole('button', { name: /Iniciar sesión/i });

    expect(botonSubmit).toBeDisabled();

    fireEvent.change(inputCodigo, { target: { value: '20200001' } });
    expect(botonSubmit).toBeDisabled();

    fireEvent.change(inputClave, { target: { value: 'password123' } });
    expect(botonSubmit).not.toBeDisabled();

    fireEvent.change(inputCodigo, { target: { value: '   ' } });
    expect(botonSubmit).toBeDisabled();
  });

  it('envía credenciales a /v1/auth/alumno/login y ejecuta onLoginExitoso al autenticar con éxito', async () => {
    const mockRespuesta: LoginResponseDTO = {
      token: 'jwt-token-ficticio',
      rol: 'ALUMNO',
      debeCambiarClave: false,
      expiresIn: '8h',
    };

    vi.mocked(api.post).mockResolvedValueOnce({
      data: {
        success: true,
        data: mockRespuesta,
      },
    });

    const onLoginExitosoMock = vi.fn();
    renderizar(<LoginAlumno onLoginExitoso={onLoginExitosoMock} />);

    fireEvent.change(screen.getByLabelText(/Código de alumno/i), {
      target: { value: '20200001' },
    });
    fireEvent.change(screen.getByLabelText(/^Contraseña/i, { selector: 'input' }), {
      target: { value: 'claveSegura123' },
    });

    const botonSubmit = screen.getByRole('button', { name: /Iniciar sesión/i });
    fireEvent.click(botonSubmit);

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/v1/auth/alumno/login', {
        codigo: '20200001',
        clave: 'claveSegura123',
      });
    });

    expect(onLoginExitosoMock).toHaveBeenCalledWith(mockRespuesta);
  });

  it('muestra mensaje claro cuando el backend responde 401 indicando gestión por Coordinación', async () => {
    vi.mocked(api.post).mockRejectedValueOnce({
      response: {
        status: 401,
        data: {
          success: false,
          message: 'Credenciales inválidas',
        },
      },
    });

    renderizar(<LoginAlumno />);

    fireEvent.change(screen.getByLabelText(/Código de alumno/i), {
      target: { value: '20200001' },
    });
    fireEvent.change(screen.getByLabelText(/^Contraseña/i, { selector: 'input' }), {
      target: { value: 'claveErronea' },
    });

    fireEvent.click(screen.getByRole('button', { name: /Iniciar sesión/i }));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument();
    });

    expect(
      screen.getByText(
        /Credenciales inválidas. Las cuentas de acceso son administradas por Coordinación Académica/i,
      ),
    ).toBeInTheDocument();

    // Verificación de que no invita a crear cuenta en el mensaje de error
    expect(screen.queryByText(/crear cuenta/i)).not.toBeInTheDocument();
  });
});
