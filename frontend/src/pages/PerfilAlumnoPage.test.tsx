import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import PerfilAlumnoPage from './PerfilAlumnoPage';
import api from '../services/api';
import { PERFIL_FIXTURE } from '../test/fixtures/perfil';

function renderizar() {
  return render(
    <MemoryRouter>
      <PerfilAlumnoPage />
    </MemoryRouter>,
  );
}

describe('PerfilAlumnoPage (datos reales de la API)', () => {
  afterEach(() => vi.restoreAllMocks());

  it('pide el perfil al backend y muestra lo que devuelve', async () => {
    const get = vi
      .spyOn(api, 'get')
      .mockResolvedValue({ data: { success: true, data: PERFIL_FIXTURE } });
    renderizar();

    expect(await screen.findByText(PERFIL_FIXTURE.alumno.nombre)).toBeVisible();
    expect(get).toHaveBeenCalledWith('/v1/estudiante/perfil');
  });

  it('si la API falla, muestra el error y no datos de ejemplo', async () => {
    vi.spyOn(api, 'get').mockRejectedValue(new Error('caída'));
    vi.spyOn(console, 'error').mockImplementation(() => {});
    renderizar();

    await waitFor(() => expect(screen.getByRole('alert')).toBeVisible());
    expect(screen.queryByText(PERFIL_FIXTURE.alumno.nombre)).toBeNull();
  });
});
