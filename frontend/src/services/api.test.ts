import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { AxiosError, type AxiosResponse, type InternalAxiosRequestConfig } from 'axios';
import api, { registrarManejadorSesionExpirada } from './api';
import { borrarSesion, guardarSesion, obtenerToken } from './sesion';
import { ahoraEnSegundos, crearToken } from '../test/helpers';

describe('Interceptores de Axios (Issue #217 / 4.25)', () => {
  const adapterOriginal = api.defaults.adapter;
  let peticiones: InternalAxiosRequestConfig[];
  const manejador = vi.fn();
  const token = crearToken(ahoraEnSegundos() + 3600);

  /** Simula el servidor: responde con el estado indicado sin hacer una petición real. */
  function simularServidor(status: number) {
    api.defaults.adapter = async (config: InternalAxiosRequestConfig): Promise<AxiosResponse> => {
      peticiones.push(config);
      const respuesta = { data: {}, status, statusText: '', headers: {}, config };
      if (status >= 400) {
        throw new AxiosError('fallo', 'ERR_BAD_REQUEST', config, null, respuesta);
      }
      return respuesta;
    };
  }

  function iniciarSesionDePrueba() {
    guardarSesion({ token, rol: 'ALUMNO', debeCambiarClave: false, expiresIn: '8h' });
  }

  beforeEach(() => {
    peticiones = [];
    manejador.mockClear();
    borrarSesion();
    sessionStorage.clear();
    registrarManejadorSesionExpirada(manejador);
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    api.defaults.adapter = adapterOriginal;
    registrarManejadorSesionExpirada(null);
    vi.restoreAllMocks();
  });

  it('adjunta el token (Bearer) a cada petición autenticada', async () => {
    iniciarSesionDePrueba();
    simularServidor(200);

    await api.get('/v1/consulta/alumno/20200001');

    expect(peticiones[0].headers.get('Authorization')).toBe(`Bearer ${token}`);
  });

  it('no adjunta token a las peticiones de login', async () => {
    iniciarSesionDePrueba();
    simularServidor(200);

    await api.post('/v1/auth/alumno/login', { codigo: '20200001', clave: 'x' });

    expect(peticiones[0].headers.get('Authorization')).toBeFalsy();
  });

  it('no envía Authorization si no hay sesión', async () => {
    simularServidor(200);

    await api.get('/v1/consulta/curso/CC-101');

    expect(peticiones[0].headers.get('Authorization')).toBeFalsy();
  });

  it('ante un 401 en una petición autenticada cierra la sesión', async () => {
    iniciarSesionDePrueba();
    simularServidor(401);

    await expect(api.get('/v1/consulta/alumno/20200001')).rejects.toBeInstanceOf(AxiosError);

    expect(manejador).toHaveBeenCalledTimes(1);
  });

  it('sin manejador registrado, un 401 autenticado borra el token igualmente', async () => {
    registrarManejadorSesionExpirada(null);
    iniciarSesionDePrueba();
    simularServidor(401);

    await expect(api.get('/v1/consulta/alumno/20200001')).rejects.toBeInstanceOf(AxiosError);

    expect(obtenerToken()).toBeNull();
  });

  it('un 401 del propio login (credenciales inválidas) NO cierra la sesión ni redirige', async () => {
    iniciarSesionDePrueba();
    simularServidor(401);

    await expect(
      api.post('/v1/auth/admin/login', { usuario: 'coordinacion', clave: 'incorrecta' }),
    ).rejects.toBeInstanceOf(AxiosError);

    expect(manejador).not.toHaveBeenCalled();
    expect(obtenerToken()).toBe(token);
  });

  it('un 401 sin sesión previa no dispara el cierre de sesión', async () => {
    simularServidor(401);

    await expect(api.get('/v1/consulta/alumno/20200001')).rejects.toBeInstanceOf(AxiosError);

    expect(manejador).not.toHaveBeenCalled();
  });

  it('otros errores (500) no cierran la sesión', async () => {
    iniciarSesionDePrueba();
    simularServidor(500);

    await expect(api.get('/v1/consulta/alumno/20200001')).rejects.toBeInstanceOf(AxiosError);

    expect(manejador).not.toHaveBeenCalled();
    expect(obtenerToken()).toBe(token);
  });
});
