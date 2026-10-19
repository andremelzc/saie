import { describe, it, expect } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useCarga } from './useCarga';

describe('useCarga hook', () => {
  it('inicializa la lógica de carga de datos', () => {
    const { result } = renderHook(() => useCarga(() => Promise.resolve([])));
    expect(result.current).toBeDefined();
  });
});
