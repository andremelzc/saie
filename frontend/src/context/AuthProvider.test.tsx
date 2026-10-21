import React from 'react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AuthProvider } from './AuthProvider';
import { useAuth } from './useAuth';
import { borrarSesion, type MensajeSesion } from '../services/sesion';
import { ahoraEnSegundos, crearToken } from '../test/helpers';

/**
 * jsdom no implementa `BroadcastChannel`. La doble de abajo reparte los mensajes entre las
 * instancias del mismo canal, que es lo que necesita el protocolo de la sesion compartida.
 */
class CanalFalso {
  static instancias: CanalFalso[] = [];
  onmessage: ((evento: MessageEvent<MensajeSesion>) => void) | null = null;

  constructor() {
    CanalFalso.instancias.push(this);
  }

  postMessage(dato: MensajeSesion): void {
    for (const otro of CanalFalso.instancias) {
      if (otro === this) continue;
      otro.onmessage?.({ data: dato } as MessageEvent<MensajeSesion>);
    }
  }

  close(): void {
    CanalFalso.instancias = CanalFalso.instancias.filter((c) => c !== this);
  }
}

/** Muestra el estado de la sesion para comprobarlo desde la prueba. */
const Testigo: React.FC = () => {
  const { sesion } = useAuth();
  return <p data-testid="testigo">{sesion ? `con sesion:${sesion.rol}` : 'sin sesion'}</p>;
};

const montar = () =>
  render(
    <MemoryRouter>
      <AuthProvider>
        <Testigo />
      </AuthProvider>
    </MemoryRouter>,
  );

describe('AuthProvider y la sesion compartida (Issue 3.29)', () => {
  beforeEach(() => {
    borrarSesion();
    sessionStorage.clear();
    CanalFalso.instancias = [];
    vi.stubGlobal('BroadcastChannel', CanalFalso);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('adopta la sesion que le anuncia otra pestana', async () => {
    montar();
    expect(screen.getByTestId('testigo')).toHaveTextContent('sin sesion');

    // Otra pestana del mismo navegador anuncia que ya inicio sesion.
    const otra = new CanalFalso();
    const token = crearToken(ahoraEnSegundos() + 3600, 'ALUMNO');
    otra.postMessage({
      tipo: 'actualizada',
      sesion: { token, rol: 'ALUMNO', debeCambiarClave: false },
    });

    await waitFor(() => expect(screen.getByTestId('testigo')).toHaveTextContent('con sesion'));
    expect(sessionStorage.getItem('saie.sesion')).not.toBeNull();
  });

  it('cierra la sesion cuando otra pestana la cierra', async () => {
    montar();
    const otra = new CanalFalso();
    const token = crearToken(ahoraEnSegundos() + 3600, 'ALUMNO');
    otra.postMessage({
      tipo: 'actualizada',
      sesion: { token, rol: 'ALUMNO', debeCambiarClave: false },
    });
    await waitFor(() => expect(screen.getByTestId('testigo')).toHaveTextContent('con sesion'));

    otra.postMessage({ tipo: 'cerrada' });

    await waitFor(() => expect(screen.getByTestId('testigo')).toHaveTextContent('sin sesion'));
    expect(sessionStorage.getItem('saie.sesion')).toBeNull();
  });
});
