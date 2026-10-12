import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import Mapa3DLazy from './Mapa3DLazy';

describe('Mapa3DLazy (Mapa3DLazy.tsx) - Issue #269 / 5.23', () => {
  it('renderiza con fallback de suspense o monta el componente', async () => {
    render(
      <Mapa3DLazy
        planos={{}}
        espacios={[]}
        fallback={<div data-testid="lazy-fallback">Fallback</div>}
      />,
    );

    // Puede verse el mensaje de carga de Suspense o directamente el fallback de sin webgl
    const contenido = await screen.findByText(/Cargando el mapa 3D…|Fallback/);
    expect(contenido).toBeInTheDocument();
  });
});
