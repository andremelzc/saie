import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { TarjetaResultado } from './TarjetaResultado';
import type { AsignacionConsultaItemDTO } from '../../types/consulta';

describe('TarjetaResultado (Issue #135 / 3.6)', () => {
  const mockAulaVigente: AsignacionConsultaItemDTO = {
    asignacionId: 'asig-001',
    codigoCurso: 'CC-101',
    nombreCurso: 'Ciencias de la Computación I',
    codigoSeccion: 'A',
    periodo: '2026-1',
    docenteNombre: 'D001 - Carlos Mendoza',
    horarios: [
      {
        diaSemana: 'LUNES',
        horaInicio: '08:00',
        horaFin: '10:00',
      },
    ],
    espacios: [
      {
        id: 'esp-001',
        identificador: 'ANT-101',
        tipo: 'AULA_TEORICA',
        pabellon: 'Pabellón Antiguo',
        piso: 1,
      },
    ],
    estadoAsignacion: 'VIGENTE',
  };

  const mockLabVigente: AsignacionConsultaItemDTO = {
    asignacionId: 'asig-002',
    codigoCurso: 'CC-101',
    nombreCurso: 'Ciencias de la Computación I',
    codigoSeccion: 'B',
    periodo: '2026-1',
    docenteNombre: 'D002 - Ana Silva',
    horarios: [
      {
        diaSemana: 'MARTES',
        horaInicio: '10:00',
        horaFin: '12:00',
      },
    ],
    espacios: [
      {
        id: 'esp-002',
        identificador: 'NUE-lab-1',
        tipo: 'LABORATORIO',
        pabellon: 'Pabellón Nuevo',
        piso: 2,
      },
    ],
    estadoAsignacion: 'VIGENTE',
  };

  it('muestra correctamente los 6 campos requeridos para un aula teórica', () => {
    render(<TarjetaResultado asignacion={mockAulaVigente} />);

    // 1. Tipo de espacio (Aula Teórica)
    expect(screen.getByText('Aula Teórica')).toBeInTheDocument();

    // 2. Pabellón
    expect(screen.getByText('Pabellón Antiguo')).toBeInTheDocument();

    // 3. Piso
    expect(screen.getByText(/Piso 1/i)).toBeInTheDocument();

    // 4. Identificador de espacio
    expect(screen.getByText('ANT-101')).toBeInTheDocument();

    // 5. Horario
    expect(screen.getByText(/LUNES/i)).toBeInTheDocument();
    expect(screen.getByText(/08:00 - 10:00/i)).toBeInTheDocument();

    // 6. Docente
    expect(screen.getByText('D001 - Carlos Mendoza')).toBeInTheDocument();

    // Estado vigente
    expect(screen.getByText('Vigente')).toBeInTheDocument();
  });

  it('muestra correctamente los 6 campos requeridos diferenciando un laboratorio con ícono y etiqueta', () => {
    render(<TarjetaResultado asignacion={mockLabVigente} />);

    // Diferencia visualmente con etiqueta e icono
    expect(screen.getByText('Laboratorio')).toBeInTheDocument();
    expect(screen.getByText('Pabellón Nuevo')).toBeInTheDocument();
    expect(screen.getByText(/Piso 2/i)).toBeInTheDocument();
    expect(screen.getByText('NUE-lab-1')).toBeInTheDocument();
    expect(screen.getByText(/MARTES/i)).toBeInTheDocument();
    expect(screen.getByText(/10:00 - 12:00/i)).toBeInTheDocument();
    expect(screen.getByText('D002 - Ana Silva')).toBeInTheDocument();
  });

  it('caso borde: maneja bloque de varios espacios listando todos los identificadores y ubicaciones', () => {
    const mockBloqueMultiple: AsignacionConsultaItemDTO = {
      ...mockLabVigente,
      espacios: [
        {
          id: 'esp-101',
          identificador: 'ANT-lab-1',
          tipo: 'LABORATORIO',
          pabellon: 'Pabellón Antiguo',
          piso: 1,
        },
        {
          id: 'esp-102',
          identificador: 'ANT-lab-2',
          tipo: 'LABORATORIO',
          pabellon: 'Pabellón Antiguo',
          piso: 1,
        },
      ],
    };

    render(<TarjetaResultado asignacion={mockBloqueMultiple} />);

    expect(screen.getByText('Espacios Asignados (Bloque Múltiple)')).toBeInTheDocument();
    expect(screen.getByText('ANT-lab-1')).toBeInTheDocument();
    expect(screen.getByText('ANT-lab-2')).toBeInTheDocument();
    expect(screen.getAllByText('Laboratorio')).toHaveLength(2);
  });

  it('caso borde: maneja sección pendiente de asignación sin romper la interfaz', () => {
    const mockPendiente: AsignacionConsultaItemDTO = {
      codigoCurso: 'CC-101',
      nombreCurso: 'Ciencias de la Computación I',
      codigoSeccion: 'C',
      periodo: '2026-1',
      docenteNombre: 'D001 - Carlos Mendoza',
      horarios: [
        {
          diaSemana: 'MIERCOLES',
          horaInicio: '14:00',
          horaFin: '16:00',
        },
      ],
      espacios: [],
      estadoAsignacion: 'PENDIENTE',
    };

    render(<TarjetaResultado asignacion={mockPendiente} />);

    expect(screen.getByText('Pendiente')).toBeInTheDocument();
    expect(screen.getByText('Espacio pendiente de asignación')).toBeInTheDocument();
    expect(
      screen.getByText(/El aula o laboratorio aún no ha sido asignado por la facultad/i),
    ).toBeInTheDocument();
  });

  it('caso borde: maneja asignación en estado ESCALADA mostrando el badge y el motivo', () => {
    const mockEscalada: AsignacionConsultaItemDTO = {
      ...mockAulaVigente,
      estadoAsignacion: 'ESCALADA',
      motivoEscalamiento: 'Conflicto por aforo excedido',
    };

    render(<TarjetaResultado asignacion={mockEscalada} />);

    expect(screen.getByText('Escalada')).toBeInTheDocument();
    expect(screen.getByText('Conflicto por aforo excedido')).toBeInTheDocument();
  });

  it('caso borde: muestra "Docente por asignar" cuando no hay nombre de docente registrado', () => {
    const mockSinDocente: AsignacionConsultaItemDTO = {
      ...mockAulaVigente,
      docenteNombre: null,
    };

    render(<TarjetaResultado asignacion={mockSinDocente} />);

    expect(screen.getByText('Docente por asignar')).toBeInTheDocument();
  });

  it('maneja el estado "sin resultado" de forma clara con mensaje accesible', () => {
    const { rerender } = render(<TarjetaResultado sinResultado={true} />);

    expect(screen.getByRole('status')).toBeInTheDocument();
    expect(screen.getByText('Sin resultados encontrados')).toBeInTheDocument();
    expect(
      screen.getByText(/No se encontraron asignaciones activas para el código consultado/i),
    ).toBeInTheDocument();

    // También responde cuando la asignación es nula
    rerender(<TarjetaResultado asignacion={null} />);
    expect(screen.getByText('Sin resultados encontrados')).toBeInTheDocument();
  });
});
