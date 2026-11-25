import { describe, expect, it, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { ContextoAvisos } from '../components/ui/avisosContexto';
import { useAccion } from './useAccion';

function montar() {
  const mostrar = vi.fn();
  const envoltorio = ({ children }: { children: React.ReactNode }) => (
    <ContextoAvisos.Provider value={{ mostrar }}>{children}</ContextoAvisos.Provider>
  );
  return { mostrar, ...renderHook(() => useAccion(), { wrapper: envoltorio }) };
}

const errorHttp = (status: number, message: string) => ({
  response: { status, data: { success: false, message } },
});

describe('useAccion (Issue 3.51)', () => {
  it('ejecuta la acción, avisa el éxito y devuelve el valor', async () => {
    const { result, mostrar } = montar();
    let resultado;
    await act(async () => {
      resultado = await result.current.ejecutar(() => Promise.resolve(7), {
        exito: (n) => `Listo ${n}`,
      });
    });
    expect(resultado).toEqual({ ok: true, valor: 7 });
    expect(mostrar).toHaveBeenCalledWith('exito', 'Listo 7');
    expect(result.current.cargando).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('un 400 muestra la causa del servidor y no «Revisa tu conexión»', async () => {
    const { result, mostrar } = montar();
    await act(async () => {
      await result.current.ejecutar(() =>
        Promise.reject(errorHttp(409, 'Ya existe un alumno con ese código')),
      );
    });
    expect(result.current.error).toBe('Ya existe un alumno con ese código');
    expect(mostrar).toHaveBeenCalledWith('error', 'Ya existe un alumno con ese código');
  });

  it('sin respuesta del servidor se habla de la conexión', async () => {
    const { result } = montar();
    await act(async () => {
      await result.current.ejecutar(() =>
        Promise.reject({ code: 'ERR_NETWORK', response: undefined }),
      );
    });
    expect(result.current.error).toMatch(/conexi/i);
  });

  it('avisarError false deja el error solo en línea', async () => {
    const { result, mostrar } = montar();
    await act(async () => {
      await result.current.ejecutar(() => Promise.reject(errorHttp(400, 'Dato inválido')), {
        avisarError: false,
      });
    });
    expect(result.current.error).toBe('Dato inválido');
    expect(mostrar).not.toHaveBeenCalled();
  });

  it('ignora una segunda llamada mientras hay una acción en curso', async () => {
    const { result } = montar();
    let liberar: () => void = () => undefined;
    const lenta = new Promise<void>((r) => (liberar = r));
    const accion = vi.fn(() => lenta);
    let primera: Promise<unknown> = Promise.resolve();
    let segunda: unknown;
    await act(async () => {
      primera = result.current.ejecutar(accion);
      segunda = await result.current.ejecutar(accion);
      liberar();
      await primera;
    });
    expect(segunda).toBeNull();
    expect(accion).toHaveBeenCalledTimes(1);
  });
});
