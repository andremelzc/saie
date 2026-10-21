import { describe, it, expect } from 'vitest';
import { mensajeDeError } from './estudiante';

function errorAxios(status: number, message?: string, conRespuesta = true) {
  return {
    isAxiosError: true,
    response: conRespuesta ? { status, data: message ? { message } : {} } : undefined,
  };
}

describe('mensajeDeError', () => {
  it('traduce los fallos de red y de sesión a lenguaje natural', () => {
    expect(mensajeDeError(errorAxios(0, undefined, false))).toBe(
      'Revisa tu conexión e inténtalo de nuevo.',
    );
    expect(mensajeDeError(errorAxios(401))).toBe('Tu sesión venció. Vuelve a iniciar sesión.');
    expect(mensajeDeError(errorAxios(403))).toBe('No tienes permiso para hacer esta acción.');
  });

  it('no muestra el mensaje técnico de un error interno', () => {
    expect(mensajeDeError(errorAxios(500, 'Error interno del servidor'))).toBe(
      'Algo salió mal de nuestro lado. Inténtalo de nuevo en unos minutos.',
    );
  });

  it('conserva los mensajes de validación del servidor', () => {
    expect(mensajeDeError(errorAxios(400, 'El correo ya está registrado.'))).toBe(
      'El correo ya está registrado.',
    );
    expect(mensajeDeError(new Error('boom'))).toBe('Inténtalo de nuevo en unos minutos.');
  });
});
