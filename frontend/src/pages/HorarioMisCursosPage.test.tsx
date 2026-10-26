import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import HorarioMisCursosPage from './HorarioMisCursosPage';
import { AuthProvider } from '../context/AuthProvider';
import { guardarSesion } from '../services/sesion';
import { ahoraEnSegundos, crearToken } from '../test/helpers';
import api from '../services/api';
import type { CursoMatriculadoDTO, HorarioSemanalDTO } from '../types/horario';

const HORARIO: HorarioSemanalDTO = { periodo: '2026-2', vista: 'semana', dias: {} };
const CURSOS: CursoMatriculadoDTO[] = [];

function iniciarSesionAlumno() {
  guardarSesion({
    token: crearToken(ahoraEnSegundos() + 3600, 'ALUMNO'),
    rol: 'ALUMNO',
    debeCambiarClave: false,
    expiresIn: '8h',
  });
}

describe('HorarioMisCursosPage (datos reales de la API)', () => {
  afterEach(() => vi.restoreAllMocks());

  it('pide horario y cursos al backend y muestra el periodo recibido', async () => {
    const get = vi.spyOn(api, 'get').mockImplementation((url: string) =>
      Promise.resolve({
        data: {
          success: true,
          data: url.endsWith('/horario') ? HORARIO : { periodo: '2026-2', cursos: CURSOS },
        },
      }),
    );
    iniciarSesionAlumno();
    render(
      <MemoryRouter>
        <AuthProvider>
          <HorarioMisCursosPage />
        </AuthProvider>
      </MemoryRouter>,
    );

    expect(await screen.findByText('Periodo 2026-2')).toBeVisible();
    expect(get).toHaveBeenCalledWith('/v1/estudiante/horario');
    expect(get).toHaveBeenCalledWith('/v1/estudiante/cursos');
    expect(screen.getByText('Aún no tienes clases programadas')).toBeVisible();
  });

  it('si la API falla, muestra el error con «Reintentar»', async () => {
    vi.spyOn(api, 'get').mockRejectedValue(new Error('caída'));
    vi.spyOn(console, 'error').mockImplementation(() => {});
    iniciarSesionAlumno();
    render(
      <MemoryRouter>
        <AuthProvider>
          <HorarioMisCursosPage />
        </AuthProvider>
      </MemoryRouter>,
    );

    await waitFor(() => expect(screen.getByRole('alert')).toBeVisible());
    expect(screen.getByRole('button', { name: 'Reintentar' })).toBeVisible();
  });
});
