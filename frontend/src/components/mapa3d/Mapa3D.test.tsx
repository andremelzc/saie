import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import Mapa3D from './Mapa3D';

// Mock del Canvas y Escena de Three.js para evitar dependencias nativas en JSDOM
vi.mock('@react-three/fiber', () => ({
  Canvas: ({
    children,
    'aria-label': ariaLabel,
  }: {
    children?: React.ReactNode;
    'aria-label'?: string;
  }) => (
    <div data-testid="r3f-canvas" aria-label={ariaLabel}>
      {children}
    </div>
  ),
}));

vi.mock('./Escena', () => ({
  default: () => <div data-testid="escena-3d-mock" />,
}));

const SVG_MOCK_PISO_1 = `
<svg viewBox="0 0 500 500">
  <path id="NUE-101" data-clase="aula" d="M 0 0 L 50 0 L 50 50 L 0 50 Z" />
  <path id="NUE-ESC-1" data-clase="escalera" d="M 60 0 L 80 0 L 80 50 L 60 50 Z" />
</svg>
`;

const SVG_MOCK_PISO_2 = `
<svg viewBox="0 0 500 500">
  <path id="NUE-201" data-clase="aula" d="M 0 0 L 50 0 L 50 50 L 0 50 Z" />
  <path id="NUE-ESC-1" data-clase="escalera" d="M 60 0 L 80 0 L 80 50 L 60 50 Z" />
</svg>
`;

describe('Mapa3D (Mapa3D.tsx) - Issue #269 / 5.23', () => {
  let originalFetch: typeof globalThis.fetch;

  beforeEach(() => {
    originalFetch = globalThis.fetch;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it('muestra el fallback cuando no hay soporte de WebGL', () => {
    // Por defecto en JSDOM HTMLCanvasElement.getContext('webgl') es null
    render(
      <Mapa3D
        planos={{ 1: '/planos/piso-1.svg' }}
        espacios={[]}
        fallback={<div data-testid="mapa-2d-fallback">Plano 2D Fallback</div>}
      />,
    );

    expect(screen.getByTestId('mapa-2d-fallback')).toBeInTheDocument();
    expect(screen.getByText('Plano 2D Fallback')).toBeInTheDocument();
  });

  describe('Con soporte WebGL simulado', () => {
    beforeEach(() => {
      // Simular soporte WebGL en canvas
      HTMLCanvasElement.prototype.getContext = vi.fn().mockImplementation((contextId) => {
        if (contextId === 'webgl' || contextId === 'webgl2') {
          return {
            getExtension: vi.fn(),
            getParameter: vi.fn(),
          };
        }
        return null;
      });
    });

    it('muestra estado de carga mientras obtiene los planos SVG', () => {
      globalThis.fetch = vi.fn().mockReturnValue(new Promise(() => {})); // Nunca resuelve

      render(
        <Mapa3D
          planos={{ 1: '/planos/piso-1.svg' }}
          espacios={[]}
          fallback={<div>Fallback</div>}
        />,
      );

      expect(screen.getByRole('status')).toHaveTextContent('Cargando el mapa 3D…');
    });

    it('muestra mensaje de alerta si falla la carga del plano', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 404,
      } as unknown as Response);

      render(
        <Mapa3D
          planos={{ 1: '/planos/piso-invalido.svg' }}
          espacios={[]}
          fallback={<div>Fallback</div>}
        />,
      );

      await waitFor(() => {
        expect(screen.getByRole('alert')).toHaveTextContent(
          'No se pudo cargar el plano del piso 1',
        );
      });
    });

    it('renderiza la escena 3D y selector de pisos al cargar planos con éxito', async () => {
      globalThis.fetch = vi.fn().mockImplementation((url) => {
        if (String(url).includes('piso-1')) {
          return Promise.resolve({
            ok: true,
            text: async () => SVG_MOCK_PISO_1,
          } as unknown as Response);
        }
        return Promise.resolve({
          ok: true,
          text: async () => SVG_MOCK_PISO_2,
        } as unknown as Response);
      });

      render(
        <Mapa3D
          planos={{ 1: '/planos/piso-1.svg', 2: '/planos/piso-2.svg' }}
          espacios={[
            { id: 'NUE-101', tipo: 'AULA_TEORICA', estado: 'DISPONIBLE' },
            { id: 'NUE-201', tipo: 'AULA_TEORICA', estado: 'OCUPADO' },
          ]}
          fallback={<div>Fallback</div>}
        />,
      );

      await waitFor(() => {
        expect(screen.getByTestId('r3f-canvas')).toBeInTheDocument();
      });

      // Debe mostrar botones de pisos y botón de Edificio
      expect(screen.getByRole('button', { name: 'Piso 1' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Piso 2' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Edificio' })).toBeInTheDocument();

      // Cambiar al piso 2
      const btnPiso2 = screen.getByRole('button', { name: 'Piso 2' });
      fireEvent.click(btnPiso2);
      expect(btnPiso2).toHaveAttribute('aria-pressed', 'true');

      // Cambiar a vista Edificio
      const btnEdificio = screen.getByRole('button', { name: 'Edificio' });
      fireEvent.click(btnEdificio);
      expect(btnEdificio).toHaveAttribute('aria-pressed', 'true');
    });

    it('emite avisos mediante onAviso cuando hay discrepancias entre figuras y espacios', async () => {
      const onAvisoMock = vi.fn();
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        text: async () => SVG_MOCK_PISO_1, // Contiene NUE-101
      } as unknown as Response);

      render(
        <Mapa3D
          planos={{ 1: '/planos/piso-1.svg' }}
          espacios={[
            // NUE-999 no existe en el SVG
            { id: 'NUE-999', tipo: 'AULA_TEORICA', estado: 'DISPONIBLE' },
          ]}
          onAviso={onAvisoMock}
          fallback={<div>Fallback</div>}
        />,
      );

      await waitFor(() => {
        expect(onAvisoMock).toHaveBeenCalledWith(
          expect.stringContaining('La figura NUE-101 del piso 1 no tiene un espacio asociado'),
        );
        expect(onAvisoMock).toHaveBeenCalledWith(
          expect.stringContaining('El espacio NUE-999 no tiene figura en ningún plano'),
        );
      });
    });
  });
});
