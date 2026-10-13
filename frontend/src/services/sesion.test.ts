import { describe, it, expect, beforeEach } from 'vitest';
import {
  borrarSesion,
  guardarSesion,
  leerSesionAlmacenada,
  obtenerExpiracion,
  obtenerSesionValida,
  obtenerToken,
  tokenVencido,
} from './sesion';
import { ahoraEnSegundos, crearToken } from '../test/helpers';

describe('Sesión (Issue #217 / 4.25)', () => {
  beforeEach(() => {
    borrarSesion();
    sessionStorage.clear();
  });

  it('guarda la sesión en sessionStorage y la puede leer', () => {
    const token = crearToken(ahoraEnSegundos() + 3600, 'DOCENTE');
    guardarSesion({ token, rol: 'DOCENTE', debeCambiarClave: false, expiresIn: '8h' });

    expect(sessionStorage.getItem('saie.sesion')).not.toBeNull();
    expect(leerSesionAlmacenada()).toEqual({ token, rol: 'DOCENTE', debeCambiarClave: false });
    expect(obtenerToken()).toBe(token);
  });

  it('borrarSesion elimina el token', () => {
    guardarSesion({
      token: crearToken(ahoraEnSegundos() + 3600),
      rol: 'ALUMNO',
      debeCambiarClave: false,
      expiresIn: '8h',
    });
    borrarSesion();

    expect(sessionStorage.getItem('saie.sesion')).toBeNull();
    expect(obtenerToken()).toBeNull();
    expect(leerSesionAlmacenada()).toBeNull();
  });

  it('ignora datos corruptos o con un rol desconocido', () => {
    sessionStorage.setItem('saie.sesion', '{no es json');
    expect(leerSesionAlmacenada()).toBeNull();

    sessionStorage.setItem('saie.sesion', JSON.stringify({ token: 'abc', rol: 'SUPERUSUARIO' }));
    expect(leerSesionAlmacenada()).toBeNull();
  });

  it('lee la expiración (exp) del token y detecta si está vencido', () => {
    const exp = ahoraEnSegundos() + 100;
    const token = crearToken(exp);

    expect(obtenerExpiracion(token)).toBe(exp * 1000);
    expect(tokenVencido(token)).toBe(false);
    expect(tokenVencido(token, (exp + 1) * 1000)).toBe(true);
  });

  it('un token ilegible no se considera vencido (se confía en el 401 del servidor)', () => {
    expect(obtenerExpiracion('no-es-un-jwt')).toBeNull();
    expect(tokenVencido('no-es-un-jwt')).toBe(false);
  });

  it('obtenerSesionValida devuelve la sesión vigente', () => {
    const token = crearToken(ahoraEnSegundos() + 3600);
    guardarSesion({ token, rol: 'ALUMNO', debeCambiarClave: false, expiresIn: '8h' });

    const resultado = obtenerSesionValida();
    expect(resultado.sesion?.token).toBe(token);
    expect(resultado.vencida).toBe(false);
  });

  it('obtenerSesionValida borra una sesión vencida e informa que venció', () => {
    guardarSesion({
      token: crearToken(ahoraEnSegundos() - 10),
      rol: 'ALUMNO',
      debeCambiarClave: false,
      expiresIn: '8h',
    });

    const resultado = obtenerSesionValida();
    expect(resultado).toEqual({ sesion: null, vencida: true });
    expect(sessionStorage.getItem('saie.sesion')).toBeNull();
  });
});
