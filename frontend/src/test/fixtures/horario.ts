import type { DiaSemana, EspacioAsignadoDTO } from '../../types/consulta';
import type {
  CursoMatriculadoDTO,
  EstadoAsignacionDTO,
  HorarioSemanalDTO,
  SesionDTO,
} from '../../types/horario';

/**
 * Datos de ejemplo del horario y los cursos del alumno (Issue 3.16 / #145).
 * SOLO PARA PRUEBAS: nunca se importa desde código de producción (las pantallas leen la API).
 */

const PERIODO_EJEMPLO = '2026-II';

const A201: EspacioAsignadoDTO = {
  id: 'esp-a201',
  identificador: 'A-201',
  tipo: 'AULA_TEORICA',
  pabellon: 'A',
  piso: 2,
};
const A105: EspacioAsignadoDTO = {
  id: 'esp-a105',
  identificador: 'A-105',
  tipo: 'AULA_TEORICA',
  pabellon: 'A',
  piso: 1,
};
const A208: EspacioAsignadoDTO = {
  id: 'esp-a208',
  identificador: 'A-208',
  tipo: 'AULA_TEORICA',
  pabellon: 'A',
  piso: 2,
};
const B310: EspacioAsignadoDTO = {
  id: 'esp-b310',
  identificador: 'B-310',
  tipo: 'AULA_TEORICA',
  pabellon: 'B',
  piso: 3,
};
const L204: EspacioAsignadoDTO = {
  id: 'esp-l204',
  identificador: 'L-204',
  tipo: 'LABORATORIO',
  pabellon: 'L',
  piso: 2,
};
const L301: EspacioAsignadoDTO = {
  id: 'esp-l301',
  identificador: 'L-301',
  tipo: 'LABORATORIO',
  pabellon: 'L',
  piso: 3,
};
const L202: EspacioAsignadoDTO = {
  id: 'esp-l202',
  identificador: 'L-202',
  tipo: 'LABORATORIO',
  pabellon: 'L',
  piso: 2,
};

interface BloqueEjemplo {
  dia: DiaSemana;
  inicio: string;
  fin: string;
  espacios: EspacioAsignadoDTO[];
}

interface SeccionEjemplo {
  seccionId: string;
  codigoCurso: string;
  nombreCurso: string;
  codigoSeccion: string;
  docenteNombre: string | null;
  estadoAsignacion: EstadoAsignacionDTO;
  bloques: BloqueEjemplo[];
}

const SECCIONES_EJEMPLO: SeccionEjemplo[] = [
  {
    seccionId: 'sec-cc101-a',
    codigoCurso: 'CC-101',
    nombreCurso: 'Introducción a la Programación',
    codigoSeccion: 'A',
    docenteNombre: 'Dra. Rosa Medina Quispe',
    estadoAsignacion: 'VIGENTE',
    bloques: [
      { dia: 'LUNES', inicio: '08:00', fin: '10:00', espacios: [A201] },
      { dia: 'MIERCOLES', inicio: '10:00', fin: '12:00', espacios: [L204] },
    ],
  },
  {
    seccionId: 'sec-ma201-b',
    codigoCurso: 'MA-201',
    nombreCurso: 'Cálculo II',
    codigoSeccion: 'B',
    docenteNombre: 'Mg. Jorge Salazar Ruiz',
    estadoAsignacion: 'VIGENTE',
    bloques: [
      { dia: 'MARTES', inicio: '08:00', fin: '10:00', espacios: [A105] },
      { dia: 'JUEVES', inicio: '08:00', fin: '10:00', espacios: [A105] },
    ],
  },
  {
    seccionId: 'sec-fi110-a',
    codigoCurso: 'FI-110',
    nombreCurso: 'Física General',
    codigoSeccion: 'A',
    docenteNombre: 'Dr. Luis Paredes Vega',
    estadoAsignacion: 'VIGENTE',
    bloques: [
      { dia: 'MARTES', inicio: '10:00', fin: '12:00', espacios: [A208] },
      { dia: 'VIERNES', inicio: '08:00', fin: '10:00', espacios: [A208] },
    ],
  },
  {
    seccionId: 'sec-cc305-a',
    codigoCurso: 'CC-305',
    nombreCurso: 'Bases de Datos',
    codigoSeccion: 'A',
    docenteNombre: 'Mg. Carmen Rojas Huamán',
    estadoAsignacion: 'VIGENTE',
    bloques: [
      { dia: 'MARTES', inicio: '14:00', fin: '16:00', espacios: [L301] },
      { dia: 'JUEVES', inicio: '14:00', fin: '16:00', espacios: [B310] },
    ],
  },
  {
    seccionId: 'sec-eg102-c',
    codigoCurso: 'EG-102',
    nombreCurso: 'Redacción y Comunicación',
    codigoSeccion: 'C',
    docenteNombre: 'Lic. Ana Torres Ríos',
    estadoAsignacion: 'PENDIENTE',
    bloques: [{ dia: 'VIERNES', inicio: '10:00', fin: '12:00', espacios: [] }],
  },
  {
    seccionId: 'sec-cc402-a',
    codigoCurso: 'CC-402',
    nombreCurso: 'Ingeniería de Software',
    codigoSeccion: 'A',
    docenteNombre: null,
    estadoAsignacion: 'ESCALADA',
    bloques: [
      { dia: 'MIERCOLES', inicio: '16:00', fin: '18:00', espacios: [] },
      { dia: 'SABADO', inicio: '08:00', fin: '10:00', espacios: [L202] },
    ],
  },
];

function aSesiones(seccion: SeccionEjemplo): SesionDTO[] {
  return seccion.bloques.map((bloque) => ({
    seccionId: seccion.seccionId,
    codigoCurso: seccion.codigoCurso,
    nombreCurso: seccion.nombreCurso,
    codigoSeccion: seccion.codigoSeccion,
    docenteNombre: seccion.docenteNombre,
    diaSemana: bloque.dia,
    horaInicio: bloque.inicio,
    horaFin: bloque.fin,
    espacios: bloque.espacios,
    estadoAsignacion: seccion.estadoAsignacion,
  }));
}

function agruparPorDia(sesiones: SesionDTO[]): HorarioSemanalDTO['dias'] {
  const dias: HorarioSemanalDTO['dias'] = {};
  for (const sesion of sesiones) {
    dias[sesion.diaSemana] = [...(dias[sesion.diaSemana] ?? []), sesion];
  }
  return dias;
}

function espaciosUnicos(bloques: BloqueEjemplo[]): EspacioAsignadoDTO[] {
  const porId = new Map<string, EspacioAsignadoDTO>();
  for (const bloque of bloques) {
    for (const espacio of bloque.espacios) {
      porId.set(espacio.id, espacio);
    }
  }
  return [...porId.values()];
}

function aCurso(seccion: SeccionEjemplo): CursoMatriculadoDTO {
  const primero = seccion.bloques[0];
  return {
    codigoCurso: seccion.codigoCurso,
    nombreCurso: seccion.nombreCurso,
    codigoSeccion: seccion.codigoSeccion,
    periodo: PERIODO_EJEMPLO,
    docenteNombre: seccion.docenteNombre,
    horarios: seccion.bloques.map((b) => ({
      diaSemana: b.dia,
      horaInicio: b.inicio,
      horaFin: b.fin,
    })),
    estadoAsignacion: seccion.estadoAsignacion,
    espacios: espaciosUnicos(seccion.bloques),
    proximaSesion: primero
      ? {
          diaSemana: primero.dia,
          horaInicio: primero.inicio,
          horaFin: primero.fin,
          espacios: primero.espacios,
        }
      : null,
  };
}

export const HORARIO_FIXTURE: HorarioSemanalDTO = {
  periodo: PERIODO_EJEMPLO,
  vista: 'dia',
  dias: agruparPorDia(SECCIONES_EJEMPLO.flatMap(aSesiones)),
};

export const CURSOS_FIXTURE: CursoMatriculadoDTO[] = SECCIONES_EJEMPLO.map(aCurso);
