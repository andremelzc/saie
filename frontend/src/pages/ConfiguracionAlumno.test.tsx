import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';

import { MemoryRouter } from 'react-router-dom';
import { AuthProvider } from '../context/AuthProvider';
import ConfiguracionAlumno from './ConfiguracionAlumno';
import { borrarSesion, guardarSesion } from '../services/sesion';
import { ahoraEnSegundos, crearToken } from '../test/helpers';
import { CLAVE_PREFERENCIAS } from '../utils/preferencias';

function renderizar() {
  guardarSesion({
    token: crearToken(ahoraEnSegundos() + 3600, 'ALUMNO'),
    rol: 'ALUMNO',
    debeCambiarClave: false,
    expiresIn: '8h',
  });
  return render(
    <MemoryRouter>
      <AuthProvider>
        <ConfiguracionAlumno />
      </AuthProvider>
    </MemoryRouter>,
  );
}

describe('ConfiguracionAlumno (Issue 3.17)', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.className = '';
  });
  afterEach(() => {
    borrarSesion();
    document.documentElement.className = '';
  });

  it('muestra las preferencias apagadas por defecto', () => {
    renderizar();

    expect(screen.getByRole('switch', { name: 'Texto grande' })).toHaveAttribute(
      'aria-checked',
      'false',
    );
    expect(screen.getByRole('switch', { name: 'Reducir movimiento' })).toHaveAttribute(
      'aria-checked',
      'false',
    );
  });

  it('al activar «Texto grande» lo aplica a la app y lo guarda en el dispositivo', async () => {
    renderizar();
    const interruptor = screen.getByRole('switch', { name: 'Texto grande' });

    fireEvent.click(interruptor);

    expect(interruptor).toHaveAttribute('aria-checked', 'true');
    expect(document.documentElement).toHaveClass('saie-texto-grande');
    expect(JSON.parse(localStorage.getItem(CLAVE_PREFERENCIAS)!)).toMatchObject({
      textoGrande: true,
    });
  });

  it('recuerda lo guardado y permite desactivarlo', async () => {
    localStorage.setItem(
      CLAVE_PREFERENCIAS,
      JSON.stringify({ reducirMovimiento: true, textoGrande: false }),
    );
    renderizar();
    const interruptor = screen.getByRole('switch', { name: 'Reducir movimiento' });
    expect(interruptor).toHaveAttribute('aria-checked', 'true');

    fireEvent.click(interruptor);

    expect(document.documentElement).not.toHaveClass('saie-sin-movimiento');
  });

  it('confirma el cambio y no repite cerrar sesión ni enlaces que ya están en el inicio', () => {
    renderizar();
    expect(screen.queryByText('Cambio guardado en este dispositivo.')).toBeNull();

    fireEvent.click(screen.getByRole('switch', { name: 'Texto grande' }));

    expect(screen.getByRole('status')).toHaveTextContent('Cambio guardado en este dispositivo.');
    // «Cerrar sesión» vive solo en la cabecera común, no se repite en el contenido.
    expect(screen.getAllByRole('button', { name: 'Cerrar sesión' })).toHaveLength(1);
    expect(
      within(screen.getByRole('main')).queryByRole('button', { name: 'Cerrar sesión' }),
    ).toBeNull();
  });

  it('si el sistema pide menos movimiento y no hay nada guardado, parte activado', () => {
    const original = window.matchMedia;
    window.matchMedia = ((q: string) => ({ matches: q.includes('reduce') })) as never;
    try {
      renderizar();
      expect(screen.getByRole('switch', { name: 'Reducir movimiento' })).toHaveAttribute(
        'aria-checked',
        'true',
      );
    } finally {
      window.matchMedia = original;
    }
  });
});
