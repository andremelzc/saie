import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import FormularioCambioClave from './FormularioCambioClave';
import { validarCambioClave } from '../../utils/claves';
import { cambiarClave } from '../../services/cuenta';

const iniciarSesion = vi.fn();

vi.mock('../../context/useAuth', () => ({
  useAuth: () => ({
    sesion: { token: 'viejo', rol: 'DOCENTE', debeCambiarClave: true },
    iniciarSesion,
  }),
}));
vi.mock('../../services/cuenta', async (original) => ({
  ...(await original<typeof import('../../services/cuenta')>()),
  cambiarClave: vi.fn(),
}));

const cambiar = vi.mocked(cambiarClave);

function escribir(etiqueta: string, valor: string) {
  fireEvent.change(screen.getByLabelText(etiqueta), { target: { value: valor } });
}

function completar(actual = 'D001', nueva = 'ClaveNueva#1', repetida = nueva) {
  escribir('Clave actual', actual);
  escribir('Clave nueva', nueva);
  escribir('Repite la clave nueva', repetida);
}

describe('validarCambioClave', () => {
  it('no marca errores con datos correctos', () => {
    expect(validarCambioClave('D001', 'ClaveNueva#1', 'ClaveNueva#1')).toEqual({});
  });

  it('exige la actual, 8 caracteres como mínimo y que la repetición coincida', () => {
    expect(validarCambioClave('', 'corta', 'otra')).toEqual({
      claveActual: expect.any(String),
      claveNueva: expect.stringContaining('8'),
      confirmacion: expect.any(String),
    });
  });

  it('rechaza una clave nueva igual a la actual o de más de 72 caracteres', () => {
    expect(validarCambioClave('ClaveActual1', 'ClaveActual1', 'ClaveActual1').claveNueva).toMatch(
      /distinta/,
    );
    expect(validarCambioClave('x', 'a'.repeat(73), 'a'.repeat(73)).claveNueva).toMatch(/72/);
  });
});

describe('FormularioCambioClave (Issue 4.21)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('no llama al servidor si hay errores y los muestra junto a cada campo', () => {
    render(<FormularioCambioClave />);
    fireEvent.click(screen.getByRole('button', { name: 'Cambiar clave' }));

    expect(cambiar).not.toHaveBeenCalled();
    expect(screen.getByText('Escribe tu clave actual.')).toBeVisible();
    expect(screen.getByLabelText('Clave nueva')).toHaveAttribute('aria-invalid', 'true');
  });

  it('envía la clave actual y la nueva, y renueva la sesión con el token nuevo', async () => {
    cambiar.mockResolvedValueOnce({ debeCambiarClave: false, token: 'nuevo', expiresIn: '8h' });
    const onCambiada = vi.fn();
    render(<FormularioCambioClave onCambiada={onCambiada} />);

    completar();
    fireEvent.click(screen.getByRole('button', { name: 'Cambiar clave' }));

    await waitFor(() => expect(onCambiada).toHaveBeenCalled());
    expect(cambiar).toHaveBeenCalledWith({ claveActual: 'D001', claveNueva: 'ClaveNueva#1' });
    expect(iniciarSesion).toHaveBeenCalledWith({
      token: 'nuevo',
      rol: 'DOCENTE',
      debeCambiarClave: false,
      expiresIn: '8h',
    });
  });

  it('muestra el motivo si el servidor rechaza la clave actual y no toca la sesión', async () => {
    cambiar.mockRejectedValueOnce({
      response: {
        status: 400,
        data: { success: false, message: 'La clave actual es incorrecta' },
      },
    });
    render(<FormularioCambioClave />);

    completar('equivocada');
    fireEvent.click(screen.getByRole('button', { name: 'Cambiar clave' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('La clave actual es incorrecta');
    expect(iniciarSesion).not.toHaveBeenCalled();
  });
});
