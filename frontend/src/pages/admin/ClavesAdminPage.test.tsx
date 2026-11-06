import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import ClavesAdminPage from './ClavesAdminPage';
import { restablecerClave } from '../../services/admin';
import { esperarSinViolacionesGraves } from '../../test/axe';

const auth = vi.hoisted(() => ({ rol: 'COORDINACION_ACADEMICA' }));

vi.mock('../../context/useAuth', () => ({
  useAuth: () => ({
    sesion: { token: 't', rol: auth.rol, debeCambiarClave: false },
    cerrarSesion: vi.fn(),
    iniciarSesion: vi.fn(),
  }),
}));
vi.mock('../../services/admin', () => ({ restablecerClave: vi.fn() }));

const restablecer = vi.mocked(restablecerClave);

const montar = () =>
  render(
    <MemoryRouter>
      <ClavesAdminPage />
    </MemoryRouter>,
  );

describe('ClavesAdminPage (Issues 4.21 y 4.26)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    auth.rol = 'COORDINACION_ACADEMICA';
  });

  it('Jefatura solo cambia su propia clave: no ve el restablecimiento', () => {
    auth.rol = 'JEFATURA_LABORATORIOS';
    montar();

    expect(screen.getByRole('heading', { name: 'Cambiar mi clave' })).toBeVisible();
    expect(screen.queryByRole('heading', { name: /Restablecer la clave/ })).toBeNull();
  });

  it('pide el código o correo antes de confirmar', () => {
    montar();
    fireEvent.click(screen.getByRole('button', { name: 'Restablecer clave' }));

    expect(screen.getByText('Escribe el código o el correo del usuario.')).toBeVisible();
    expect(screen.queryByRole('alertdialog')).toBeNull();
    expect(restablecer).not.toHaveBeenCalled();
  });

  it('confirma, restablece y muestra la clave inicial una sola vez', async () => {
    restablecer.mockResolvedValueOnce({
      codigo: '20200001',
      nombre: 'Ana Pérez',
      rol: 'ALUMNO',
      claveInicial: 'K7mP2xQw9R',
      debeCambiarClave: true,
    });
    montar();

    fireEvent.change(screen.getByLabelText(/Código o correo del usuario/), {
      target: { value: ' 20200001 ' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Restablecer clave' }));

    // Nada se restablece hasta confirmar.
    expect(restablecer).not.toHaveBeenCalled();
    const dialogo = await screen.findByRole('alertdialog');
    fireEvent.click(within(dialogo).getByRole('button', { name: 'Sí, restablecer' }));

    expect(await screen.findByTestId('clave-inicial')).toHaveTextContent('K7mP2xQw9R');
    expect(restablecer).toHaveBeenCalledWith('20200001');
    expect(screen.getByText(/Se muestra una sola vez/)).toBeVisible();

    fireEvent.click(screen.getByRole('button', { name: /Listo, ya la anoté/ }));
    expect(screen.queryByText('K7mP2xQw9R')).toBeNull();
  });

  it('explica por qué falla: cuenta de sistema, usuario inexistente…', async () => {
    restablecer.mockRejectedValueOnce({
      response: {
        status: 403,
        data: {
          success: false,
          message: 'Las cuentas de Coordinación y Jefatura no se restablecen',
        },
      },
    });
    montar();

    fireEvent.change(screen.getByLabelText(/Código o correo del usuario/), {
      target: { value: 'coordinacion' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Restablecer clave' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Sí, restablecer' }));

    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('no se restablecen'));
    expect(screen.queryByTestId('clave-inicial')).toBeNull();
  });

  it('no tiene violaciones de accesibilidad grave, tampoco con errores', async () => {
    const { container } = montar();
    await esperarSinViolacionesGraves(container, { nombre: 'ClavesAdminPage' });

    fireEvent.click(screen.getByRole('button', { name: 'Cambiar clave' }));
    fireEvent.click(screen.getByRole('button', { name: 'Restablecer clave' }));
    await esperarSinViolacionesGraves(container, { nombre: 'ClavesAdminPage (con errores)' });
  });
});
