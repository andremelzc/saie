import { describe, expect, it } from 'vitest';
import { TEXTOS_ERROR } from '../config/textos';
import { detallesDeError, estadoHttp, mensajeDeError, mensajeSeguroDelServidor } from './errores';

const conRespuesta = (status: number, data?: unknown) => ({ response: { status, data } });

describe('mensajeDeError', () => {
  it('usa el texto genérico si no es un error de red', () => {
    expect(mensajeDeError(new Error('x'))).toBe(TEXTOS_ERROR.generico);
    expect(mensajeDeError(undefined)).toBe(TEXTOS_ERROR.generico);
  });

  it('distingue tiempo agotado de falta de conexión', () => {
    expect(mensajeDeError({ code: 'ECONNABORTED', response: undefined })).toBe(
      TEXTOS_ERROR.tiempoAgotado,
    );
    expect(mensajeDeError({ code: 'ETIMEDOUT', response: undefined })).toBe(
      TEXTOS_ERROR.tiempoAgotado,
    );
    expect(mensajeDeError({ code: 'ERR_NETWORK', response: undefined })).toBe(
      TEXTOS_ERROR.sinConexion,
    );
  });

  it('traduce 401 y 5xx sin mostrar el mensaje del servidor', () => {
    expect(mensajeDeError(conRespuesta(401))).toBe(TEXTOS_ERROR.sesionVencida);
    expect(mensajeDeError(conRespuesta(500, { success: false, message: 'stack técnico' }))).toBe(
      TEXTOS_ERROR.servidor,
    );
  });

  it('muestra el mensaje de dominio del backend', () => {
    expect(mensajeDeError(conRespuesta(409, { success: false, message: 'Ya existe.' }))).toBe(
      'Ya existe.',
    );
  });

  it('oculta mensajes con identificadores internos', () => {
    const cuerpo = { success: false, message: "El espacio con ID 'abc' no existe" };
    expect(mensajeDeError(conRespuesta(404, cuerpo))).toBe(TEXTOS_ERROR.noEncontrado);
    expect(mensajeDeError(conRespuesta(409, cuerpo))).toBe(TEXTOS_ERROR.generico);
    expect(mensajeDeError(conRespuesta(403, {}))).toBe(TEXTOS_ERROR.sinPermiso);
  });

  it('traduce los campos que el rol no puede editar', () => {
    const uno = { success: false, message: 'Tu rol no puede editar: identificador' };
    expect(mensajeDeError(conRespuesta(403, uno))).toBe('Tu rol no puede editar el código.');
    const varios = {
      success: false,
      message: 'Tu rol no puede editar: identificador, pabellon, piso',
    };
    expect(mensajeDeError(conRespuesta(403, varios))).toBe(
      'Tu rol no puede editar el código, el pabellón y el piso.',
    );
    const vacio = { success: false, message: 'Tu rol no puede editar:' };
    expect(mensajeDeError(conRespuesta(403, vacio))).toBe(TEXTOS_ERROR.sinPermiso);
  });

  it('añade las causas a un 400 de validación', () => {
    const cuerpo = { success: false, message: 'Parámetros inválidos', errors: ['Falta el piso.'] };
    expect(mensajeDeError(conRespuesta(400, cuerpo))).toBe(
      `${TEXTOS_ERROR.datosInvalidos} Falta el piso.`,
    );
    expect(
      mensajeDeError(conRespuesta(400, { success: false, message: 'Parámetros inválidos' })),
    ).toBe(TEXTOS_ERROR.datosInvalidos);
  });
});

describe('ayudantes de errores', () => {
  it('estadoHttp devuelve el estado o undefined', () => {
    expect(estadoHttp(conRespuesta(418))).toBe(418);
    expect(estadoHttp(new Error('x'))).toBeUndefined();
  });

  it('detallesDeError filtra lo que no es texto', () => {
    expect(detallesDeError(conRespuesta(400, { errors: ['a', 3, '  ', 'b'] }))).toEqual(['a', 'b']);
    expect(detallesDeError(conRespuesta(400, { errors: 'a' }))).toEqual([]);
  });

  it('mensajeSeguroDelServidor rechaza las formas no confiables', () => {
    expect(mensajeSeguroDelServidor(new Error('x'))).toBeUndefined();
    expect(
      mensajeSeguroDelServidor(conRespuesta(400, { error: 'X', message: 'Texto técnico' })),
    ).toBeUndefined();
    expect(mensajeSeguroDelServidor(conRespuesta(400, { message: 'Sin success' }))).toBe(
      'Sin success',
    );
  });
});
