import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ZonaActualizable } from './ZonaActualizable';

describe('ZonaActualizable', () => {
  it('atenúa y anuncia «Actualizando…» mientras recarga', () => {
    const { container } = render(
      <ZonaActualizable actualizando>
        <button type="button">Editar</button>
      </ZonaActualizable>,
    );
    expect(screen.getByText('Actualizando…')).toBeInTheDocument();
    expect(container.firstElementChild).toHaveAttribute('aria-busy', 'true');
    expect(container.firstElementChild).not.toHaveAttribute('inert');
  });

  it('con datos de otra consulta deja la lista a la vista pero sin poder pulsarla', () => {
    const { container } = render(
      <ZonaActualizable actualizando inerte>
        <button type="button">Editar</button>
      </ZonaActualizable>,
    );
    expect(container.firstElementChild).toHaveAttribute('inert');
  });
});
