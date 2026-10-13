import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import LoginLayout from './LoginLayout';
import { PORTALES } from '../../config/portales';

function renderizar(portal: 'estudiante' | 'docente' | 'admin') {
  return render(
    <MemoryRouter>
      <LoginLayout portal={portal} ariaLabel="Página de prueba">
        <p>contenido del formulario</p>
      </LoginLayout>
    </MemoryRouter>,
  );
}

describe('LoginLayout (Issue #151 / #204 / #217 — diseño de los logins)', () => {
  it('muestra el contenido dentro de un <main> con etiqueta accesible', () => {
    renderizar('estudiante');

    const main = screen.getByRole('main', { name: 'Página de prueba' });
    expect(main).toHaveTextContent('contenido del formulario');
  });

  it('ofrece volver al inicio y el logo de SAIE enlaza a la Home', () => {
    renderizar('docente');

    expect(screen.getByRole('link', { name: /Volver al inicio/i })).toHaveAttribute('href', '/');
    for (const logo of screen.getAllByRole('link', { name: 'SAIE' })) {
      expect(logo).toHaveAttribute('href', '/');
    }
  });

  it.each(PORTALES.map((p) => [p.id, p] as const))(
    'en el portal %s enlaza a los otros dos logins y no a sí mismo',
    (id, portal) => {
      renderizar(id);

      const nav = screen.getByRole('navigation', { name: 'Otros portales' });
      const enlaces = Array.from(nav.querySelectorAll('a')).map((a) => a.getAttribute('href'));
      const esperados = PORTALES.filter((p) => p.id !== id).map((p) => p.loginPath);

      expect(enlaces).toEqual(esperados);
      expect(enlaces).not.toContain(portal.loginPath);
    },
  );

  it('el panel de marca lista las funciones del portal', () => {
    renderizar('admin');

    const admin = PORTALES.find((p) => p.id === 'admin')!;
    for (const funcion of admin.funciones) {
      expect(screen.getByText(funcion)).toBeInTheDocument();
    }
  });

  it('nunca ofrece crear una cuenta', () => {
    renderizar('estudiante');

    expect(screen.queryByText(/crear cuenta/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/registrarse/i)).not.toBeInTheDocument();
  });
});
