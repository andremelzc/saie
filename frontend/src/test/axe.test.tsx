import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import {
  auditarAccesibilidad,
  esperarSinViolacionesGraves,
  reglasIncompletas,
  violacionesGraves,
} from './axe';

describe('Helper de accesibilidad con axe (Issue 3.23)', () => {
  it('falla cuando hay una violación grave', async () => {
    const { container } = render(<button />);
    await expect(esperarSinViolacionesGraves(container)).rejects.toThrow();
  });

  it('no falla cuando no hay violaciones', async () => {
    const { container } = render(<button>Guardar</button>);
    await expect(esperarSinViolacionesGraves(container)).resolves.toBeUndefined();
  });

  it('solo toma en cuenta las violaciones graves', async () => {
    const { container } = render(<button>Guardar</button>);
    const resultado = await auditarAccesibilidad(container);
    expect(violacionesGraves(resultado)).toEqual([]);
    expect(Array.isArray(reglasIncompletas(resultado))).toBe(true);
  });
});
