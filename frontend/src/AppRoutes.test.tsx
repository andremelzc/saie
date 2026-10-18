import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AuthProvider } from './context/AuthProvider';
import AppRoutes from './AppRoutes';
import api from './services/api';
import { borrarSesion, guardarSesion, obtenerToken } from './services/sesion';
import type { RolCuenta } from './types/auth';
import { AxiosError, type AxiosResponse, type InternalAxiosRequestConfig } from 'axios';
import { ahoraEnSegundos, crearToken } from './test/helpers';

function renderizar(ruta: string) {
  return render(
    <MemoryRouter initialEntries={[ruta]}>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </MemoryRouter>,
  );
}

function iniciarSesionDePrueba(rol: RolCuenta, segundosDeVida = 3600, debeCambiarClave = false) {
  guardarSesion({
    token: crearToken(ahoraEnSegundos() + segundosDeVida, rol),
    rol,
    debeCambiarClave,
    expiresIn: '8h',
  });
}

const aviso = /Tu sesión venció/i;

describe('Rutas, sesión y roles (Issue #217 / 4.25)', () => {
  const adapterOriginal = api.defaults.adapter;

  beforeEach(() => {
    borrarSesion();
    sessionStorage.clear();
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.useRealTimers();
    api.defaults.adapter = adapterOriginal;
    vi.restoreAllMocks();
  });

  describe('rutas públicas', () => {
    it('la consulta de espacios no requiere sesión (Issue 3.7)', () => {
      renderizar('/consulta');

      expect(screen.getByRole('heading', { name: 'Consulta de espacios' })).toBeInTheDocument();
    });
  });

  describe('rutas privadas', () => {
    it('rechaza a un usuario sin sesión y lo lleva al login', () => {
      renderizar('/admin');

      expect(screen.getByRole('heading', { name: 'Panel Administrativo' })).toBeInTheDocument();
      expect(screen.queryByText('Área administrativa')).not.toBeInTheDocument();
    });

    it('cada área privada redirige al login de su rol cuando no hay sesión', () => {
      const { unmount } = renderizar('/estudiante');
      expect(screen.getByRole('heading', { name: 'Portal del Estudiante' })).toBeInTheDocument();
      unmount();

      renderizar('/docente');
      expect(screen.getByRole('heading', { name: 'Portal del Docente' })).toBeInTheDocument();
    });

    it('rechaza con un mensaje claro a un usuario con un rol no autorizado', () => {
      iniciarSesionDePrueba('ALUMNO');
      renderizar('/admin');

      expect(screen.getByRole('heading', { name: 'Acceso no autorizado' })).toBeInTheDocument();
      expect(screen.getByRole('alert')).toHaveTextContent(/no tiene permiso/i);
      expect(screen.queryByText('Área administrativa')).not.toBeInTheDocument();
    });

    it('permite el acceso a un rol autorizado (Jefatura al panel administrativo)', () => {
      iniciarSesionDePrueba('JEFATURA_LABORATORIOS');
      renderizar('/admin');

      expect(screen.getByRole('heading', { name: 'Área administrativa' })).toBeInTheDocument();
    });
  });

  describe('inicio de sesión', () => {
    function iniciarSesionPorFormulario(
      respuesta: { rol: RolCuenta; debeCambiarClave: boolean },
      usuario: string,
      etiqueta: RegExp,
    ) {
      vi.spyOn(api, 'post').mockResolvedValueOnce({
        data: {
          success: true,
          data: {
            token: crearToken(ahoraEnSegundos() + 3600, respuesta.rol),
            expiresIn: '8h',
            ...respuesta,
          },
        },
      } as never);

      fireEvent.change(screen.getByLabelText(etiqueta), { target: { value: usuario } });
      fireEvent.change(screen.getByLabelText(/^Contraseña/i, { selector: 'input' }), {
        target: { value: 'clave-de-prueba' },
      });
      fireEvent.click(screen.getByRole('button', { name: /Iniciar sesión/i }));
    }

    it('guarda el token y entra al área del rol (Coordinación)', async () => {
      renderizar('/login/admin');
      iniciarSesionPorFormulario(
        { rol: 'COORDINACION_ACADEMICA', debeCambiarClave: false },
        'coordinacion',
        /Usuario/i,
      );

      expect(await screen.findByRole('heading', { name: 'Área administrativa' })).toBeVisible();
      expect(obtenerToken()).not.toBeNull();
    });

    it('un usuario que ya tiene sesión no ve el login: va directo a su área', () => {
      iniciarSesionDePrueba('ALUMNO');
      renderizar('/login/alumno');

      expect(screen.getByRole('heading', { name: 'Área del estudiante' })).toBeInTheDocument();
    });
  });

  describe('cerrar sesión', () => {
    it.each([
      ['ALUMNO', '/estudiante', 'Portal del Estudiante'],
      ['DOCENTE', '/docente', 'Portal del Docente'],
      ['COORDINACION_ACADEMICA', '/admin', 'Panel Administrativo'],
      ['JEFATURA_LABORATORIOS', '/admin', 'Panel Administrativo'],
    ] as const)('borra el token y vuelve al login (%s)', (rol, ruta, tituloLogin) => {
      iniciarSesionDePrueba(rol);
      renderizar(ruta);

      fireEvent.click(screen.getByRole('button', { name: 'Cerrar sesión' }));

      expect(screen.getByRole('heading', { name: tituloLogin })).toBeInTheDocument();
      expect(obtenerToken()).toBeNull();
      expect(sessionStorage.getItem('saie.sesion')).toBeNull();
      // Cerrar sesión por decisión propia no muestra el aviso de sesión vencida.
      expect(screen.queryByText(aviso)).not.toBeInTheDocument();
    });
  });

  describe('sesión vencida', () => {
    it('un token ya vencido al abrir la app redirige al login con un mensaje claro', () => {
      iniciarSesionDePrueba('DOCENTE', -60);
      renderizar('/docente');

      expect(screen.getByRole('heading', { name: 'Portal del Docente' })).toBeInTheDocument();
      expect(screen.getByRole('status')).toHaveTextContent(aviso);
      expect(obtenerToken()).toBeNull();
    });

    it('un token que vence con la app abierta cierra la sesión sin esperar al 401', () => {
      vi.useFakeTimers();
      iniciarSesionDePrueba('ALUMNO', 60);
      renderizar('/estudiante');
      expect(screen.getByRole('heading', { name: 'Área del estudiante' })).toBeInTheDocument();

      act(() => {
        vi.advanceTimersByTime(61_000);
      });

      expect(screen.getByRole('heading', { name: 'Portal del Estudiante' })).toBeInTheDocument();
      expect(screen.getByRole('status')).toHaveTextContent(aviso);
      expect(obtenerToken()).toBeNull();
    });

    it('un 401 del servidor en una petición autenticada cierra la sesión y avisa', async () => {
      iniciarSesionDePrueba('COORDINACION_ACADEMICA');
      renderizar('/admin');
      expect(screen.getByRole('heading', { name: 'Área administrativa' })).toBeInTheDocument();

      api.defaults.adapter = async (config: InternalAxiosRequestConfig): Promise<AxiosResponse> => {
        const respuesta = { data: {}, status: 401, statusText: '', headers: {}, config };
        throw new AxiosError('no autorizado', 'ERR_BAD_REQUEST', config, null, respuesta);
      };

      await act(async () => {
        await api.get('/v1/alertas').catch(() => undefined);
      });

      // Vuelve al login del mismo rol (administrativo) con el mensaje de sesión vencida.
      expect(screen.getByRole('heading', { name: 'Panel Administrativo' })).toBeInTheDocument();
      expect(screen.getByRole('status')).toHaveTextContent(aviso);
      expect(obtenerToken()).toBeNull();
    });
  });
});
