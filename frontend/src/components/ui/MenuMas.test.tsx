import { describe, expect, it } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { MenuMas } from './MenuMas';

const PESTANAS = [
  { to: '/admin/secciones', etiqueta: 'Secciones', trazo: 'M0 0' },
  { to: '/admin/auditoria', etiqueta: 'Auditoría', trazo: 'M0 0' },
  { to: '/admin/informe', etiqueta: 'Informe', trazo: 'M0 0' },
];

function montar(ruta = '/admin') {
  return render(
    <MemoryRouter initialEntries={[ruta]}>
      <MenuMas pestanas={PESTANAS} />
    </MemoryRouter>,
  );
}

describe('MenuMas (Issues 4.35 y 3.34)', () => {
  it('empieza cerrado y se abre con el botón, mostrando cada destino', () => {
    montar();
    const boton = screen.getByRole('button', { name: 'Más' });
    expect(boton).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByRole('link', { name: 'Informe' })).not.toBeInTheDocument();

    fireEvent.click(boton);

    expect(boton).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('link', { name: 'Secciones' })).toHaveAttribute(
      'href',
      '/admin/secciones',
    );
    expect(screen.getByRole('link', { name: 'Auditoría' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Informe' })).toBeInTheDocument();
  });

  it('Escape lo cierra y devuelve el foco al botón', () => {
    montar();
    const boton = screen.getByRole('button', { name: 'Más' });
    fireEvent.click(boton);
    screen.getByRole('link', { name: 'Informe' }).focus();

    fireEvent.keyDown(document, { key: 'Escape' });

    expect(boton).toHaveAttribute('aria-expanded', 'false');
    expect(boton).toHaveFocus();
  });

  it('se cierra al elegir un destino y al hacer clic fuera', () => {
    montar();
    const boton = screen.getByRole('button', { name: 'Más' });

    fireEvent.click(boton);
    fireEvent.click(screen.getByRole('link', { name: 'Auditoría' }));
    expect(boton).toHaveAttribute('aria-expanded', 'false');

    fireEvent.click(boton);
    fireEvent.mouseDown(document.body);
    expect(boton).toHaveAttribute('aria-expanded', 'false');
  });
});
