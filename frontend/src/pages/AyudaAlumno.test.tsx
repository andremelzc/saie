import { describe, expect, it } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';

import { MemoryRouter } from 'react-router-dom';
import AyudaAlumno from './AyudaAlumno';
import { AuthProvider } from '../context/AuthProvider';
import { guardarSesion } from '../services/sesion';
import { ahoraEnSegundos, crearToken } from '../test/helpers';

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
        <AyudaAlumno />
      </AuthProvider>
    </MemoryRouter>,
  );
}

describe('AyudaAlumno (Issue 3.17)', () => {
  it('muestra el título y las preguntas agrupadas por tema', () => {
    renderizar();

    expect(screen.getByRole('heading', { level: 1, name: 'Ayuda' })).toBeVisible();
    expect(screen.getByRole('heading', { name: 'Horario y aulas' })).toBeVisible();
    expect(screen.getByRole('heading', { name: 'Mis datos y mi privacidad' })).toBeVisible();
    expect(screen.getByRole('heading', { name: 'Mi cuenta y la app' })).toBeVisible();
  });

  it('despliega la respuesta al abrir una pregunta', async () => {
    renderizar();
    const pregunta = screen.getByText('¿Quién puede ver mi ficha médica?');
    const detalle = pregunta.closest('details')!;
    expect(detalle).not.toHaveAttribute('open');

    fireEvent.click(pregunta);

    expect(detalle).toHaveAttribute('open');
    expect(within(detalle).getByText(/Solo tú, dentro de tu sesión/)).toBeInTheDocument();
  });

  it('enlaza a las otras pantallas del alumno y permite volver al inicio', () => {
    renderizar();

    expect(screen.getByRole('link', { name: 'Mi perfil' })).toHaveAttribute(
      'href',
      '/estudiante/perfil',
    );
    // La navegación del alumno también enlaza Configuración (Issue 3.34): se acota al contenido.
    expect(
      within(screen.getByRole('main')).getByRole('link', { name: 'Configuración' }),
    ).toHaveAttribute('href', '/estudiante/configuracion');
    expect(screen.getByRole('link', { name: /Volver al inicio/ })).toHaveAttribute(
      'href',
      '/estudiante',
    );
  });
});
