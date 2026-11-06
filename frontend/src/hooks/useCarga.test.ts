import { beforeEach, describe, it, expect, vi } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';
import { invalidarCacheCarga, useCarga, vaciarCacheCarga } from './useCarga';

describe('useCarga hook', () => {
  beforeEach(() => vaciarCacheCarga());

  it('inicializa la lógica de carga de datos', () => {
    const { result } = renderHook(() => useCarga(() => Promise.resolve([])));
    expect(result.current).toBeDefined();
  });

  it('sin caché empieza cargando y sin datos', async () => {
    const cargador = vi.fn(() => Promise.resolve('uno'));
    const { result } = renderHook(() => useCarga(cargador));
    expect(result.current).toMatchObject({ cargando: true, datos: null });
    await waitFor(() => expect(result.current.datos).toBe('uno'));
    expect(result.current.cargando).toBe(false);
  });

  describe('caché breve con revalidación (Issue 3.49)', () => {
    it('al volver muestra los datos anteriores mientras revalida y luego los actualiza', async () => {
      const primera = renderHook(() =>
        useCarga(() => Promise.resolve('viejo'), { clave: 'lista' }),
      );
      await waitFor(() => expect(primera.result.current.datos).toBe('viejo'));
      primera.unmount();

      let responder: (v: string) => void = () => undefined;
      const lento = () => new Promise<string>((r) => (responder = r));
      const segunda = renderHook(() => useCarga(lento, { clave: 'lista' }));

      // De inmediato: lo de la visita anterior, y todavía revalidando.
      expect(segunda.result.current.datos).toBe('viejo');
      expect(segunda.result.current.cargando).toBe(true);

      await act(async () => responder('nuevo'));
      await waitFor(() => expect(segunda.result.current.datos).toBe('nuevo'));
      expect(segunda.result.current.cargando).toBe(false);
    });

    it('cada clave tiene su propia caché', async () => {
      const a = renderHook(() => useCarga(() => Promise.resolve('A'), { clave: 'a' }));
      await waitFor(() => expect(a.result.current.datos).toBe('A'));

      const b = renderHook(() =>
        useCarga(() => new Promise<string>(() => undefined), { clave: 'b' }),
      );
      expect(b.result.current.datos).toBeNull();
    });

    it('vaciar o invalidar la caché evita mostrar datos viejos', async () => {
      const a = renderHook(() => useCarga(() => Promise.resolve('A'), { clave: 'alertas:x' }));
      await waitFor(() => expect(a.result.current.datos).toBe('A'));
      a.unmount();

      invalidarCacheCarga('alertas');
      const b = renderHook(() =>
        useCarga(() => new Promise<string>(() => undefined), { clave: 'alertas:x' }),
      );
      expect(b.result.current.datos).toBeNull();
    });

    it('habilitado false no pide nada hasta que se habilita', async () => {
      const cargador = vi.fn(() => Promise.resolve('datos'));
      const { result, rerender } = renderHook(
        ({ habilitado }) => useCarga(cargador, { habilitado }),
        { initialProps: { habilitado: false } },
      );
      expect(cargador).not.toHaveBeenCalled();
      expect(result.current).toMatchObject({ cargando: false, datos: null });

      rerender({ habilitado: true });
      await waitFor(() => expect(result.current.datos).toBe('datos'));
      expect(cargador).toHaveBeenCalledTimes(1);
    });
  });
});
