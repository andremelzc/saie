import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { EstadoAsignacion } from './EstadoAsignacion';

describe('EstadoAsignacion (Issue 3.57)', () => {
  it('muestra el texto del diccionario para cada estado', () => {
    const { rerender } = render(<EstadoAsignacion estado="VIGENTE" cantidadEspacios={1} />);
    expect(screen.getByText('Aula confirmada')).toBeInTheDocument();
    rerender(<EstadoAsignacion estado="ESCALADA" />);
    expect(screen.getByText('En revisión')).toBeInTheDocument();
    rerender(<EstadoAsignacion estado="HISTORICA" />);
    expect(screen.getByText('Anterior')).toBeInTheDocument();
  });

  it('una sección VIGENTE sin espacios nunca se muestra como confirmada', () => {
    render(<EstadoAsignacion estado="VIGENTE" cantidadEspacios={0} />);
    expect(screen.getByText('Sin aula asignada')).toBeInTheDocument();
    expect(screen.queryByText('Aula confirmada')).toBeNull();
  });

  it('sin asignación se muestra como «Sin aula asignada»', () => {
    render(<EstadoAsignacion estado={null} />);
    expect(screen.getByText('Sin aula asignada')).toBeInTheDocument();
  });
});
