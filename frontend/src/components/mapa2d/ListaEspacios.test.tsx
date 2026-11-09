import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import ListaEspacios from './ListaEspacios';
import type { EspacioMapa2D } from './etiquetas';

const ESPACIOS: EspacioMapa2D[] = [
  { id: 'NUE-204', tipo: 'AULA_TEORICA', estado: 'OCUPADO', nombre: 'Aula 204' },
  { id: 'ANT-104', tipo: 'LABORATORIO', estado: 'DISPONIBLE', nombre: 'Aula 104 - Laboratorio 08' },
  { id: 'NUE-101', tipo: 'AULA_TEORICA', estado: 'DISPONIBLE', nombre: 'Aula 101' },
  { id: 'ANT-101', tipo: 'AULA_TEORICA', estado: 'ALERTA_ACTIVA', nombre: 'Aula 101' },
];
const PISOS: Record<string, number> = { 'NUE-204': 2, 'ANT-104': 1, 'NUE-101': 1, 'ANT-101': 1 };
const pisoDe = (id: string) => PISOS[id];

const montar = (props: Partial<React.ComponentProps<typeof ListaEspacios>> = {}) =>
  render(
    <ListaEspacios
      espacios={ESPACIOS}
      pisoDe={pisoDe}
      seleccionado={null}
      onElegir={vi.fn()}
      {...props}
    />,
  );

describe('ListaEspacios', () => {
  it('agrupa por piso y distingue los dos pabellones, con el estado y el tipo de cada espacio', () => {
    montar();

    const lista = screen.getByRole('region', { name: 'Lista de espacios' });
    expect(within(lista).getAllByRole('heading', { level: 3 }).map((h) => h.textContent)).toEqual([
      'Piso 1',
      'Piso 2',
    ]);
    const botones = within(lista).getAllByRole('button');
    expect(botones).toHaveLength(4);
    // Dentro de un piso, por pabellón y por nombre (Aula 101 del antiguo antes que la del nuevo).
    expect(botones[0]).toHaveTextContent('Aula 101 · Pabellón antiguo');
    expect(botones[0]).toHaveTextContent('Aula teórica · Con alerta');
    expect(botones[1]).toHaveTextContent('Aula 104 - Laboratorio 08 · Pabellón antiguo');
    expect(botones[1]).toHaveTextContent('Laboratorio · Disponible');
    expect(botones[2]).toHaveTextContent('Aula 101 · Pabellón nuevo');
  });

  it('con un piso elegido solo lista ese piso', () => {
    montar({ piso: 2 });

    expect(screen.getAllByRole('button')).toHaveLength(1);
    expect(screen.getByRole('button', { name: /Aula 204/ })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Piso 1' })).toBeNull();
  });

  it('elegir un espacio con clic o con Enter avisa cuál es, y el elegido queda marcado', () => {
    const onElegir = vi.fn();
    montar({ onElegir, seleccionado: 'NUE-204' });

    expect(screen.getByRole('button', { name: /Aula 204/ })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: /Aula 104/ })).toHaveAttribute('aria-pressed', 'false');

    fireEvent.click(screen.getByRole('button', { name: /Aula 104/ }));
    expect(onElegir).toHaveBeenCalledWith('ANT-104');
  });

  it('sin espacios lo dice', () => {
    montar({ espacios: [] });
    expect(screen.getByText('No hay espacios que mostrar.')).toBeInTheDocument();
  });
});
