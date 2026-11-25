import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import BuscadorEspacios from './BuscadorEspacios';
import type { EspacioMapa2D } from './etiquetas';

const ESPACIOS: EspacioMapa2D[] = [
  { id: 'NUE-204', tipo: 'AULA_TEORICA', estado: 'DISPONIBLE', nombre: 'Aula 204' },
  { id: 'ANT-204', tipo: 'AULA_TEORICA', estado: 'OCUPADO', nombre: 'Aula 204' },
  { id: 'ANT-104', tipo: 'LABORATORIO', estado: 'OCUPADO', nombre: 'Aula 104 - Laboratorio 08' },
];

const montar = (onElegir = vi.fn()) => {
  render(<BuscadorEspacios espacios={ESPACIOS} pisoDe={() => 2} onElegir={onElegir} />);
  return { onElegir, campo: screen.getByRole('combobox', { name: 'Buscar aula o laboratorio' }) };
};

describe('BuscadorEspacios', () => {
  it('encuentra por código y distingue los dos pabellones', () => {
    const { campo } = montar();
    fireEvent.change(campo, { target: { value: '204' } });

    const opciones = screen.getAllByRole('option');
    expect(opciones).toHaveLength(2);
    expect(opciones[0]).toHaveTextContent('Pabellón antiguo · Piso 2');
    expect(opciones[1]).toHaveTextContent('Pabellón nuevo · Piso 2');
  });

  it('encuentra por tipo y sin tildes ni mayúsculas', () => {
    const { campo } = montar();
    fireEvent.change(campo, { target: { value: 'LABORATORIO' } });
    expect(screen.getByRole('option')).toHaveTextContent('Laboratorio 08');

    fireEvent.change(campo, { target: { value: 'pabellon nuevo' } });
    expect(screen.getByRole('option')).toHaveTextContent('Aula 204');
  });

  it('flechas y Enter eligen un resultado y limpian el campo', () => {
    const { campo, onElegir } = montar();
    fireEvent.change(campo, { target: { value: '204' } });
    fireEvent.keyDown(campo, { key: 'ArrowDown' });
    fireEvent.keyDown(campo, { key: 'Enter' });

    expect(onElegir).toHaveBeenCalledWith('NUE-204');
    expect(campo).toHaveValue('');
    expect(screen.queryByRole('option')).toBeNull();
  });

  it('un clic en el resultado también lo elige', () => {
    const { campo, onElegir } = montar();
    fireEvent.change(campo, { target: { value: 'lab' } });
    fireEvent.mouseDown(screen.getByRole('option'));
    expect(onElegir).toHaveBeenCalledWith('ANT-104');
    expect(campo).toHaveValue('');
  });

  it('avisa cuando no hay resultados y Escape cierra la lista', () => {
    const { campo } = montar();
    fireEvent.change(campo, { target: { value: 'zzz' } });
    expect(screen.getByText(/Sin resultados para «zzz»/)).toBeInTheDocument();

    fireEvent.keyDown(campo, { key: 'Escape' });
    expect(campo).toHaveAttribute('aria-expanded', 'false');
  });
});
