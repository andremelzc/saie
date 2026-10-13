import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { LoginDocente } from './LoginDocente';
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

describe('LoginDocente (Issue #204 / 7.7)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renderiza el formulario con código de docente y clave, sin opción de crear cuenta', () => {
    render(<LoginDocente />);

    expect(screen.getByRole('heading', { name: /Portal del Docente/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/Código de docente/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^Contraseña/i, { selector: 'input' })).toBeInTheDocument();

    const botonSubmit = screen.getByRole('button', { name: /Iniciar sesión/i });
    expect(botonSubmit).toBeInTheDocument();
    expect(botonSubmit).toBeDisabled();

    // Verificación crítica: NO debe existir opción para crear cuenta o registrarse
    expect(screen.queryByText(/crear cuenta/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/registrarse/i)).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /crear cuenta/i })).not.toBeInTheDocument();
  });

  it('muestra el label "Código de docente" y el placeholder con ejemplo ficticio D001', () => {
    render(<LoginDocente />);

    const inputCodigo = screen.getByLabelText(/Código de docente/i);
    expect(inputCodigo).toHaveAttribute('placeholder', 'Ej. D001');
  });

  it('permite alternar la visibilidad de la contraseña con el botón de ojo', () => {
    render(<LoginDocente />);

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
    render(<LoginDocente />);

    const inputCodigo = screen.getByLabelText(/Código de docente/i);
    const inputClave = screen.getByLabelText(/^Contraseña/i, { selector: 'input' });
    const botonSubmit = screen.getByRole('button', { name: /Iniciar sesión/i });

    expect(botonSubmit).toBeDisabled();

    fireEvent.change(inputCodigo, { target: { value: 'D001' } });
    expect(botonSubmit).toBeDisabled();

    fireEvent.change(inputClave, { target: { value: 'password123' } });
    expect(botonSubmit).not.toBeDisabled();

    fireEvent.change(inputCodigo, { target: { value: '   ' } });
    expect(botonSubmit).toBeDisabled();
  });

  it('envía "codigo" (no correo) a /v1/auth/docente/login y ejecuta onLoginExitoso al autenticar con éxito', async () => {
    const mockRespuesta: LoginResponseDTO = {
      token: 'jwt-token-ficticio',
      rol: 'DOCENTE',
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
    render(<LoginDocente onLoginExitoso={onLoginExitosoMock} />);

    fireEvent.change(screen.getByLabelText(/Código de docente/i), {
      target: { value: 'D001' },
    });
    fireEvent.change(screen.getByLabelText(/^Contraseña/i, { selector: 'input' }), {
      target: { value: 'claveSegura123' },
    });

    const botonSubmit = screen.getByRole('button', { name: /Iniciar sesión/i });
    fireEvent.click(botonSubmit);

    await waitFor(() => {
      // Verifica que el campo enviado es "codigo", no "usuario" ni "correo"
      expect(api.post).toHaveBeenCalledWith('/v1/auth/docente/login', {
        codigo: 'D001',
        clave: 'claveSegura123',
      });
    });

    expect(onLoginExitosoMock).toHaveBeenCalledWith(mockRespuesta);
  });

  it('muestra mensaje claro cuando el backend responde 401, indicando gestión por Coordinación Académica', async () => {
    vi.mocked(api.post).mockRejectedValueOnce({
      response: {
        status: 401,
        data: {
          success: false,
          message: 'Credenciales inválidas',
        },
      },
    });

    render(<LoginDocente />);

    fireEvent.change(screen.getByLabelText(/Código de docente/i), {
      target: { value: 'D001' },
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

    expect(screen.queryByText(/crear cuenta/i)).not.toBeInTheDocument();
  });

  it('muestra estado de carga (spinner) mientras se procesa el login y deshabilita el formulario', async () => {
    // Promesa que nunca resuelve para mantener el estado cargando
    vi.mocked(api.post).mockReturnValueOnce(new Promise(() => {}));

    render(<LoginDocente />);

    fireEvent.change(screen.getByLabelText(/Código de docente/i), {
      target: { value: 'D001' },
    });
    fireEvent.change(screen.getByLabelText(/^Contraseña/i, { selector: 'input' }), {
      target: { value: 'claveSegura123' },
    });

    fireEvent.click(screen.getByRole('button', { name: /Iniciar sesión/i }));

    await waitFor(() => {
      expect(screen.getByText(/Iniciando sesión/i)).toBeInTheDocument();
    });

    expect(screen.getByLabelText(/Código de docente/i)).toBeDisabled();
    expect(screen.getByLabelText(/^Contraseña/i, { selector: 'input' })).toBeDisabled();
  });
});
