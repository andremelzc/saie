import { describe, expect, it } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { useMapaEnUrl } from './useMapaEnUrl';

const montar = (url = '/mapa') =>
  renderHook(() => useMapaEnUrl(), {
    wrapper: ({ children }) => <MemoryRouter initialEntries={[url]}>{children}</MemoryRouter>,
  });

describe('useMapaEnUrl', () => {
  it('sin parámetros: plano 2D, sin piso, sin espacio y «ahora»', () => {
    const { result } = montar();
    expect(result.current).toMatchObject({
      vista: '2d',
      piso: undefined,
      espacio: null,
      franja: null,
    });
  });

  it('lee la vista, el piso, el espacio y la franja de la URL', () => {
    const { result } = montar('/mapa?vista=3d&piso=2&espacio=NUE-204&dia=MARTES&desde=08:00&hasta=10:00');
    expect(result.current.vista).toBe('3d');
    expect(result.current.piso).toBe(2);
    expect(result.current.espacio).toBe('NUE-204');
    expect(result.current.franja).toEqual({ dia: 'MARTES', horaInicio: '08:00', horaFin: '10:00' });
  });

  it('acepta «todos» y descarta pisos y franjas inválidos', () => {
    expect(montar('/mapa?piso=todos').result.current.piso).toBe('todos');
    expect(montar('/mapa?piso=abc').result.current.piso).toBeUndefined();
    expect(montar('/mapa?piso=-1').result.current.piso).toBeUndefined();
    expect(montar('/mapa?dia=LUNES&desde=10:00&hasta=08:00').result.current.franja).toBeNull();
  });

  it('escribe los cambios y no guarda lo que vale por defecto', () => {
    const { result } = montar();

    act(() => result.current.setVista('3d'));
    expect(result.current.vista).toBe('3d');
    act(() => result.current.setPiso(3));
    act(() => result.current.setEspacio('ANT-301'));
    expect(result.current.piso).toBe(3);
    expect(result.current.espacio).toBe('ANT-301');

    act(() => result.current.setFranja({ dia: 'LUNES', horaInicio: '08:00', horaFin: '10:00' }));
    expect(result.current.franja).not.toBeNull();
    act(() => result.current.setFranja(null));
    expect(result.current.franja).toBeNull();

    act(() => result.current.setVista('2d'));
    act(() => result.current.setEspacio(null));
    expect(result.current.vista).toBe('2d');
    expect(result.current.espacio).toBeNull();
  });
});
