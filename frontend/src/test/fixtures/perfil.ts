import type { PerfilAlumnoDTO } from '../../types/perfil';

/**
 * Datos de ejemplo del perfil del alumno (Issue 3.17).
 * SOLO PARA PRUEBAS: datos inventados que nunca se importan desde código de producción.
 */
export const PERFIL_FIXTURE: PerfilAlumnoDTO = {
  alumno: {
    codigo: '22200001',
    nombre: 'Ana Lucía Quispe Ramos',
    correo: 'ana.quispe@unmsm.edu.pe',
    dni: '72345678',
    fechaNacimiento: '2003-04-12',
    telefono: '987654321',
    direccion: 'Av. Venezuela 3400, Lima',
  },
  fichaMedica: {
    tipoSangre: 'O+',
    alergias: 'Penicilina',
    condicionEspecial: null,
    contactoEmergencia: 'Rosa Ramos (madre) · 999 888 777',
    condicionAccesible: false,
  },
};

/** Perfil de un alumno que aún no completó sus datos ni su ficha médica. */
export const PERFIL_VACIO_FIXTURE: PerfilAlumnoDTO = {
  alumno: {
    codigo: '22200002',
    nombre: 'Luis Alberto Mendoza Rojas',
    correo: 'luis.mendoza@unmsm.edu.pe',
    dni: null,
    fechaNacimiento: null,
    telefono: null,
    direccion: null,
  },
  fichaMedica: null,
};
