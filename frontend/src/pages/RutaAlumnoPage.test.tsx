import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import RutaAlumnoPage from './RutaAlumnoPage';

vi.mock('../context/useAuth', () => ({
  useAuth: () => ({ sesion: { rol: 'ALUMNO' } }),
}));

vi.mock('../components/auth/BotonCerrarSesion', () => ({
  default: () => <button type="button">Cerrar sesión</button>,
}));

const montar = () =>
  render(
    <MemoryRouter>
      <RutaAlumnoPage />
    </MemoryRouter>,
  );

describe('RutaAlumnoPage', () => {
  it('muestra el recorrido, el tiempo y los pasos de la clase de ejemplo', () => {
    montar();

    expect(screen.getByRole('heading', { name: 'Ruta hacia mi aula' })).toBeVisible();
    expect(screen.getByText(/datos de ejemplo/)).toBeVisible();
    expect(screen.getByText('Tiempo estimado de caminata')).toBeVisible();
    expect(screen.getByRole('group', { name: /Plano del piso 1/ })).toBeVisible();
  });

  it('la ruta accesible cambia el tiempo y el medio de subida', () => {
    montar();
    expect(screen.getByText('2 min 15 s')).toBeVisible();

    fireEvent.click(screen.getByRole('checkbox', { name: /ruta accesible/ }));

    expect(screen.getByText('2 min 5 s')).toBeVisible();
    expect(screen.getAllByText(/ascensor accesible/).length).toBeGreaterThan(0);
  });

  it('una clase sin aula muestra el estado «ruta no disponible»', () => {
    montar();

    fireEvent.change(screen.getByLabelText('Clase de ejemplo'), {
      target: { value: 'ej-sin-aula' },
    });

    expect(screen.getByRole('alert')).toHaveTextContent('Ruta no disponible');
  });
});
