import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import Home from './Home';
import { PORTALES } from '../config/portales';

describe('Home', () => {
  it('muestra exactamente los 3 portales, cada uno enlazado a su login', () => {
    render(
      <MemoryRouter>
        <Home />
      </MemoryRouter>,
    );
    expect(PORTALES).toHaveLength(3);
    for (const p of PORTALES) {
      expect(screen.getByText(p.titulo)).toBeInTheDocument();
      expect(screen.getByTestId(`portal-${p.id}`)).toHaveAttribute('href', p.loginPath);
    }
  });
});
