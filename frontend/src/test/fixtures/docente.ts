import type { EspacioAsignadoDTO } from '../../types/consulta';
import type { HorarioDocenteDTO, IncidenciaAdminDTO } from '../../types/docente';
import type { SesionDTO } from '../../types/horario';

/** Datos de ejemplo del portal docente. SOLO PARA PRUEBAS. */

export const LAB_204: EspacioAsignadoDTO = {
  id: 'esp-l204',
  identificador: 'L-204',
  tipo: 'LABORATORIO',
  pabellon: 'Nuevo',
  piso: 2,
};

export const AULA_101: EspacioAsignadoDTO = {
  id: 'esp-a101',
  identificador: 'A-101',
  tipo: 'AULA_TEORICA',
  pabellon: 'Antiguo',
  piso: 1,
};

const sesion = (o: Partial<SesionDTO>): SesionDTO => ({
  seccionId: 'sec-1',
  codigoCurso: 'IS101',
  nombreCurso: 'Algoritmos',
  codigoSeccion: '1',
  docenteNombre: 'Dra. García',
  diaSemana: 'LUNES',
  horaInicio: '08:00',
  horaFin: '10:00',
  espacios: [LAB_204],
  estadoAsignacion: 'VIGENTE',
  ...o,
});

/** Lunes: IS101 08–10 en L-204 y IS202 14–16 en A-101. Miércoles: IS101 08–10. */
export const horarioDocente = (o: Partial<HorarioDocenteDTO> = {}): HorarioDocenteDTO => ({
  periodo: '2026-2',
  vista: 'semana',
  dias: {
    LUNES: [
      sesion({}),
      sesion({
        seccionId: 'sec-2',
        codigoCurso: 'IS202',
        nombreCurso: 'Bases de datos',
        codigoSeccion: '2',
        horaInicio: '14:00',
        horaFin: '16:00',
        espacios: [AULA_101],
      }),
    ],
    MIERCOLES: [sesion({ diaSemana: 'MIERCOLES' })],
  },
  asignacionesActivas: [
    {
      asignacionId: 'asg-1',
      codigoCurso: 'IS101',
      nombreCurso: 'Algoritmos',
      codigoSeccion: '1',
      horarios: [
        { diaSemana: 'LUNES', horaInicio: '08:00', horaFin: '10:00' },
        { diaSemana: 'MIERCOLES', horaInicio: '08:00', horaFin: '10:00' },
      ],
      espacios: [LAB_204],
      numeroAlumnos: 32,
    },
    {
      asignacionId: 'asg-2',
      codigoCurso: 'IS202',
      nombreCurso: 'Bases de datos',
      codigoSeccion: '2',
      horarios: [{ diaSemana: 'LUNES', horaInicio: '14:00', horaFin: '16:00' }],
      espacios: [AULA_101],
      numeroAlumnos: 1,
    },
  ],
  ...o,
});

export const incidencia = (o: Partial<IncidenciaAdminDTO> = {}): IncidenciaAdminDTO => ({
  id: 'inc-1',
  identificadorSeguimiento: 'INC-1A2B3C4D',
  tipo: 'EQUIPO_NO_OPERATIVO',
  prioridad: 'ALTA',
  estado: 'PENDIENTE',
  descripcion: 'Las PCs 5 y 6 no encienden.',
  evidencia: 'https://example.com/foto.jpg',
  fechaReporte: '2026-11-02T15:00:00Z',
  comentarioCierre: null,
  fechaCierre: null,
  espacio: { id: 'esp-l204', identificador: 'L-204', pabellon: 'Nuevo', piso: 2 },
  docente: { codigo: 'D001', nombre: 'Dra. García' },
  asignacion: { id: 'asg-1', codigoCurso: 'IS101', nombreCurso: 'Algoritmos', codigoSeccion: '1' },
  ...o,
});
