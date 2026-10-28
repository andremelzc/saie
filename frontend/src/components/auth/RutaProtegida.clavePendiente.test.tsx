import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import RutaProtegida from './RutaProtegida';
import { AuthContext, type AuthContextValue } from '../../context/AuthContext';
import { RUTAS } from '../../config/rutas';

function montar(debeCambiarClave: boolean, permitirClavePendiente = false) {
  const valor: AuthContextValue = {
    sesion: { token: 't', rol: 'ALUMNO', debeCambiarClave },
    sesionVencida: false,
    iniciarSesion: vi.fn(),
    cerrarSesion: vi.fn(),
  };
  return render(
    <AuthContext.Provider value={valor}>
      <MemoryRouter initialEntries={['/privada']}>
        <Routes>
          <Route
            path="/privada"
            element={
              <RutaProtegida
                rolesPermitidos={['ALUMNO']}
                permitirClavePendiente={permitirClavePendiente}
              >
                <p>Contenido privado</p>
              </RutaProtegida>
            }
          />
          <Route path={RUTAS.cambiarClave} element={<p>Pantalla de cambio de clave</p>} />
        </Routes>
      </MemoryRouter>
    </AuthContext.Provider>,
  );
}

describe('RutaProtegida con la clave inicial pendiente (Issue 4.45)', () => {
  it('lleva a la pantalla de cambio de clave mientras debeCambiarClave sea verdadero', () => {
    montar(true);
    expect(screen.getByText('Pantalla de cambio de clave')).toBeInTheDocument();
    expect(screen.queryByText('Contenido privado')).not.toBeInTheDocument();
  });

  it('deja pasar a la pantalla de cambio de clave, que pide permitirClavePendiente', () => {
    montar(true, true);
    expect(screen.getByText('Contenido privado')).toBeInTheDocument();
  });

  it('no interfiere cuando la clave ya se cambió', () => {
    montar(false);
    expect(screen.getByText('Contenido privado')).toBeInTheDocument();
  });
});
