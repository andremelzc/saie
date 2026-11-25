import type { SolicitudLaboratorioDTO } from '../../types/fusionLaboratorio';

/** Solicitud pendiente de «dictar todo en laboratorio» (Issue 7.17): teoría `2` y `2-LAB`. */
export const solicitudLaboratorio = (
  o: Partial<SolicitudLaboratorioDTO> = {},
): SolicitudLaboratorioDTO => ({
  id: 'sol-1',
  estado: 'PENDIENTE',
  justificacion: 'Toda la práctica es con Git y Docker en las PCs',
  fechaSolicitud: '2026-11-24T15:00:00Z',
  fechaResolucion: null,
  motivoRechazo: null,
  resultado: null,
  periodo: '2026-2',
  curso: { codigo: '202SW0805', nombre: 'Gestión de la Configuración' },
  grupo: '2',
  docente: { codigoDocente: '0A0690', nombre: 'Dra. Rojas' },
  seccionTeoria: {
    id: 'sec-teo',
    codigoSeccion: '2',
    horarios: [{ diaSemana: 'JUEVES', horaInicio: '18:00', horaFin: '20:00' }],
  },
  seccionLaboratorio: {
    id: 'sec-lab',
    codigoSeccion: '2-LAB',
    horarios: [{ diaSemana: 'JUEVES', horaInicio: '20:00', horaFin: '22:00' }],
  },
  ...o,
});
