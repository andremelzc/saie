import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { MENSAJE_EN_DESARROLLO, PantallaEnDesarrollo } from './PantallaEnDesarrollo';

vi.mock('../context/useAuth', () => ({
  useAuth: () => ({ sesion: { rol: 'ALUMNO' } }),
}));

vi.mock('./auth/BotonCerrarSesion', () => ({
  default: () => <button type="button">Cerrar sesión</button>,
}));

function montar(props: Partial<React.ComponentProps<typeof PantallaEnDesarrollo>> = {}) {
  return render(
    <MemoryRouter>
      <PantallaEnDesarrollo
        titulo="Mapa de ocupación"
        descripcion="Ubica tus aulas en el plano."
        funciones={['Mapa por piso', 'Ocupación de cada espacio']}
        volverA={{ to: '/estudiante', etiqueta: 'Volver al inicio' }}
        issue="#147 (3.18)"
        {...props}
      />
    </MemoryRouter>,
  );
}

describe('PantallaEnDesarrollo', () => {
  it('muestra el título, la descripción y el mensaje de que está en desarrollo', () => {
    montar();

    expect(screen.getByRole('heading', { name: 'Mapa de ocupación' })).toBeVisible();
    expect(screen.getByText('Ubica tus aulas en el plano.')).toBeVisible();
    expect(screen.getByRole('status')).toHaveTextContent(MENSAJE_EN_DESARROLLO);
  });

  it('lista las funcionalidades previstas y el issue de seguimiento', () => {
    montar();

    expect(screen.getByRole('heading', { name: 'Lo que incluirá' })).toBeVisible();
    expect(screen.getByText('Mapa por piso')).toBeVisible();
    expect(screen.getByText('Ocupación de cada espacio')).toBeVisible();
    expect(screen.getByText('#147 (3.18)')).toBeVisible();
  });

  it('el botón principal vuelve a la ruta indicada', () => {
    montar();

    expect(screen.getByRole('link', { name: /Volver al inicio/ })).toHaveAttribute(
      'href',
      '/estudiante',
    );
  });

  it('sin funciones ni issue omite esas secciones', () => {
    montar({ funciones: [], issue: undefined });

    expect(screen.queryByRole('heading', { name: 'Lo que incluirá' })).toBeNull();
    expect(screen.queryByText(/Seguimiento en el repositorio/)).toBeNull();
  });

  it('permite indicar el portal y muestra el rol de la sesión', () => {
    montar({ portal: 'Docente' });

    expect(screen.getByText('Docente')).toBeVisible();
    expect(screen.getByText('ALUMNO')).toBeVisible();
  });
});
