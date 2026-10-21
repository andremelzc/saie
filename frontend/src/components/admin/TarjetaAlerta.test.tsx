import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { TarjetaAlerta } from './TarjetaAlerta';
import type { AlertaDTO } from '../../types/admin';

const alerta: AlertaDTO = {
  id: '1',
  tipo: 'CAPACIDAD',
  motivo: 'Exceso de aforo detectado',
  estado: 'PENDIENTE',
  fechaDeteccion: '2026-10-19T10:00:00.000Z',
  espacio: { id: 'e1', identificador: 'Lab 1', pabellon: 'A', piso: 1 },
  asignacionesAfectadas: [],
};

const cursos = [
  {
    asignacionId: 'a1',
    codigoCurso: 'IS101',
    nombreCurso: 'Algoritmos',
    codigoSeccion: '01',
  },
  {
    asignacionId: 'a2',
    codigoCurso: 'IS102',
    nombreCurso: 'Estructuras',
    codigoSeccion: '02',
  },
  {
    asignacionId: 'a3',
    codigoCurso: 'IS103',
    nombreCurso: 'Bases de datos',
    codigoSeccion: '03',
  },
];

describe('TarjetaAlerta', () => {
  it('muestra los datos y pide confirmación antes de resolver', () => {
    const onResolver = vi.fn();
    render(<TarjetaAlerta alerta={alerta} onResolver={onResolver} />);

    expect(screen.getByText('Exceso de aforo detectado')).toBeInTheDocument();
    expect(screen.getByText('Lab 1')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Marcar como resuelta' }));
    expect(onResolver).not.toHaveBeenCalled();
    expect(screen.getByText('¿Marcar como resuelta?')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Sí, resolver' }));
    expect(onResolver).toHaveBeenCalledWith('1');
  });

  it('permite cancelar la resolución sin llamar al backend', () => {
    const onResolver = vi.fn();
    render(<TarjetaAlerta alerta={alerta} onResolver={onResolver} />);

    fireEvent.click(screen.getByRole('button', { name: 'Marcar como resuelta' }));
    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }));

    expect(screen.queryByText('¿Marcar como resuelta?')).toBeNull();
    expect(onResolver).not.toHaveBeenCalled();
  });

  it('pliega los cursos afectados y los expande', () => {
    render(<TarjetaAlerta alerta={{ ...alerta, asignacionesAfectadas: cursos }} />);

    expect(screen.getByText(/IS101 · 01/)).toBeInTheDocument();
    expect(screen.getByText(/IS102 · 02/)).toBeInTheDocument();
    expect(screen.queryByText(/IS103 · 03/)).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: /\+1 curso/ }));
    expect(screen.getByText(/IS103 · 03/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Ver menos' })).toHaveAttribute(
      'aria-expanded',
      'true',
    );
  });
});
