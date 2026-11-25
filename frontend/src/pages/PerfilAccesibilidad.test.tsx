import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { EstadoDeclaracionAccesibilidad } from './PerfilAlumno';
import { valoresFichaMedica } from '../utils/perfil';
import type { EstadoAccesibilidadDTO } from '../types/accesibilidad';

const base: EstadoAccesibilidadDTO = {
  estado: 'PENDIENTE',
  fechaSolicitud: '2026-11-20T15:00:00Z',
  fechaResolucion: null,
  motivoRechazo: null,
};

const ficha = {
  tipoSangre: null,
  alergias: null,
  condicionEspecial: null,
  contactoEmergencia: null,
  condicionAccesible: false,
};

describe('Estado de la declaración de accesibilidad en el perfil (Issue 3.60)', () => {
  it('sin declaración no muestra nada', () => {
    const { container } = render(<EstadoDeclaracionAccesibilidad accesibilidad={null} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('pendiente: avisa que Coordinación la revisa y que las aulas no cambian aún', () => {
    render(<EstadoDeclaracionAccesibilidad accesibilidad={base} />);
    expect(screen.getByRole('status')).toHaveTextContent(/pendiente/);
    expect(screen.getByRole('status')).toHaveTextContent(/tus aulas no cambian/);
  });

  it('aprobada: el sistema prioriza el piso 1', () => {
    render(
      <EstadoDeclaracionAccesibilidad
        accesibilidad={{ ...base, estado: 'APROBADA', fechaResolucion: '2026-11-21T15:00:00Z' }}
      />,
    );
    expect(screen.getByRole('status')).toHaveTextContent(/aprobada/);
    expect(screen.getByRole('status')).toHaveTextContent(/prioriza el piso 1/);
  });

  it('rechazada: muestra el motivo sin anunciarse como alerta', () => {
    render(
      <EstadoDeclaracionAccesibilidad
        accesibilidad={{ ...base, estado: 'RECHAZADA', motivoRechazo: 'Falta confirmar' }}
      />,
    );
    expect(screen.queryByRole('alert')).toBeNull();
    expect(screen.getByRole('status')).toHaveTextContent(/no aprobada.*Falta confirmar/);
  });

  it('rechazada sin motivo usa un texto por defecto', () => {
    render(<EstadoDeclaracionAccesibilidad accesibilidad={{ ...base, estado: 'RECHAZADA' }} />);
    expect(screen.getByRole('status')).toHaveTextContent(/no la aprobó/);
  });
});

describe('valoresFichaMedica con la declaración (Issue 3.60)', () => {
  it('marca la casilla si la declaración está pendiente', () => {
    expect(valoresFichaMedica(ficha, base).condicionAccesible).toBe('true');
  });

  it('marca la casilla si la condición está aprobada', () => {
    expect(valoresFichaMedica({ ...ficha, condicionAccesible: true }).condicionAccesible).toBe(
      'true',
    );
  });

  it('no la marca si la última declaración fue rechazada', () => {
    expect(valoresFichaMedica(ficha, { ...base, estado: 'RECHAZADA' }).condicionAccesible).toBe('');
  });
});
