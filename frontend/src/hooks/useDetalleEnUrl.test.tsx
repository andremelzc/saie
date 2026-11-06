import { describe, expect, it } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, useLocation, useNavigate } from 'react-router-dom';
import { useDetalleEnUrl } from './useDetalleEnUrl';

const Prueba: React.FC = () => {
  const detalle = useDetalleEnUrl('espacio');
  const navigate = useNavigate();
  const { search } = useLocation();
  return (
    <div>
      <p data-testid="valor">{detalle.valor ?? 'cerrado'}</p>
      <p data-testid="url">{search || '(sin parámetros)'}</p>
      <button onClick={() => detalle.abrir('AULA-101')}>abrir</button>
      <button onClick={() => detalle.reemplazar('AULA-102')}>reemplazar</button>
      <button onClick={detalle.cerrar}>cerrar</button>
      <button onClick={() => void navigate(-1)}>atrás</button>
    </div>
  );
};

const montar = (inicial: string[] = ['/admin/espacios']) =>
  render(
    <MemoryRouter initialEntries={inicial}>
      <Prueba />
    </MemoryRouter>,
  );

describe('useDetalleEnUrl (Issue 4.51)', () => {
  it('abrir añade el parámetro y «Atrás» lo cierra', () => {
    montar();
    expect(screen.getByTestId('valor')).toHaveTextContent('cerrado');

    fireEvent.click(screen.getByText('abrir'));
    expect(screen.getByTestId('valor')).toHaveTextContent('AULA-101');
    expect(screen.getByTestId('url')).toHaveTextContent('?espacio=AULA-101');

    fireEvent.click(screen.getByText('atrás'));
    expect(screen.getByTestId('valor')).toHaveTextContent('cerrado');
  });

  it('un enlace con el parámetro abre el detalle al cargar', () => {
    montar(['/admin/espacios?espacio=LAB-03']);
    expect(screen.getByTestId('valor')).toHaveTextContent('LAB-03');
  });

  it('cerrar un detalle abierto desde la lista vuelve atrás en el historial', () => {
    montar();
    fireEvent.click(screen.getByText('abrir'));
    fireEvent.click(screen.getByText('cerrar'));
    expect(screen.getByTestId('valor')).toHaveTextContent('cerrado');
    expect(screen.getByTestId('url')).toHaveTextContent('(sin parámetros)');
  });

  it('cerrar un detalle abierto por enlace quita el parámetro sin salir de la pantalla', () => {
    montar(['/admin/espacios?espacio=LAB-03']);
    fireEvent.click(screen.getByText('cerrar'));
    expect(screen.getByTestId('valor')).toHaveTextContent('cerrado');
    expect(screen.getByTestId('url')).toHaveTextContent('(sin parámetros)');
  });

  it('reemplazar cambia el valor sin añadir una entrada de historial', () => {
    montar();
    fireEvent.click(screen.getByText('abrir'));
    fireEvent.click(screen.getByText('reemplazar'));
    expect(screen.getByTestId('valor')).toHaveTextContent('AULA-102');

    fireEvent.click(screen.getByText('atrás'));
    expect(screen.getByTestId('valor')).toHaveTextContent('cerrado');
  });
});
