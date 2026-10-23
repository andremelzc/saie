import { afterEach, describe, expect, it, vi } from 'vitest';
import { TEXTO_NO_DISPONIBLE } from '../config/textos';
import {
  buscarEnDiccionario,
  describirEstadoAsignacion,
  describirEventoAuditoria,
  etiquetaCampoEspacio,
  etiquetaReglaVerificacion,
  etiquetaTipoAlerta,
  etiquetaTipoEspacio,
} from './diccionarios';

afterEach(() => vi.restoreAllMocks());

describe('diccionarios', () => {
  it('traduce los códigos conocidos', () => {
    expect(describirEstadoAsignacion('VIGENTE').etiqueta).toBe('Aula confirmada');
    expect(describirEventoAuditoria('ALERTA').tono).toBe('peligro');
    expect(etiquetaTipoEspacio('LABORATORIO')).toBe('Laboratorio');
    expect(etiquetaTipoAlerta('SOFTWARE')).toBe('Software');
    expect(etiquetaCampoEspacio('piso')).toBe('el piso');
    expect(etiquetaReglaVerificacion('DOBLE_RESERVA')).toBe('Sin doble reserva');
  });

  it('usa el texto neutro ante un código desconocido o vacío', () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    expect(describirEstadoAsignacion('NUEVO_ESTADO').etiqueta).toBe(TEXTO_NO_DISPONIBLE);
    expect(describirEventoAuditoria(null).etiqueta).toBe(TEXTO_NO_DISPONIBLE);
    expect(etiquetaTipoEspacio(undefined)).toBe(TEXTO_NO_DISPONIBLE);
    expect(etiquetaTipoAlerta('OTRA')).toBe(TEXTO_NO_DISPONIBLE);
    expect(etiquetaReglaVerificacion('OTRA')).toBe(TEXTO_NO_DISPONIBLE);
    expect(etiquetaCampoEspacio('otro')).toBe('otros datos');
  });

  it('avisa una sola vez por código desconocido y no confunde claves heredadas', () => {
    const aviso = vi.spyOn(console, 'warn').mockImplementation(() => {});
    buscarEnDiccionario('prueba', {}, 'X', 0);
    buscarEnDiccionario('prueba', {}, 'X', 0);
    expect(aviso).toHaveBeenCalledTimes(1);
    expect(buscarEnDiccionario('prueba', {}, 'toString', 'por defecto')).toBe('por defecto');
  });
});
