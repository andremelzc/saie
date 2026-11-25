import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useValorDiferido } from './useValorDiferido';

describe('useValorDiferido (Issue 4.41)', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('conserva el valor inicial y solo adopta el nuevo tras la pausa', () => {
    const { result, rerender } = renderHook(({ v }) => useValorDiferido(v, 300), {
      initialProps: { v: 'a' },
    });
    expect(result.current).toBe('a');

    rerender({ v: 'ab' });
    act(() => vi.advanceTimersByTime(299));
    expect(result.current).toBe('a');

    act(() => vi.advanceTimersByTime(1));
    expect(result.current).toBe('ab');
  });

  it('reinicia la espera con cada cambio: varias teclas dan un solo valor', () => {
    const { result, rerender } = renderHook(({ v }) => useValorDiferido(v, 300), {
      initialProps: { v: '' },
    });
    for (const v of ['c', 'cá', 'cál']) {
      rerender({ v });
      act(() => vi.advanceTimersByTime(200));
    }
    expect(result.current).toBe('');

    act(() => vi.advanceTimersByTime(300));
    expect(result.current).toBe('cál');
  });
});
