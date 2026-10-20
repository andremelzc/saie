import type { TipoImportacion } from '../types/admin';

/** Una columna del CSV de una plantilla: nombre exacto, obligatoriedad y ejemplo. */
export interface ColumnaPlantilla {
  nombre: string;
  obligatorio: boolean;
  descripcion: string;
  ejemplo: string;
}

/** Plantilla descargable de un flujo de carga. */
export interface PlantillaCSV {
  tipo: TipoImportacion;
  titulo: string;
  descripcion: string;
  /** Nombre del archivo que se descarga. */
  archivo: string;
  columnas: ColumnaPlantilla[];
  /** Encabezado + una fila de ejemplo lista para editar. */
  contenido: string;
}

/**
 * Plantillas oficiales de carga masiva. Los encabezados son exactamente los campos que espera
 * cada importador del backend (`backend/src/importers/*`): el parser los toma tal cual.
 */
export const PLANTILLAS: PlantillaCSV[] = [
  {
    tipo: 'cursos-secciones',
    titulo: 'Cursos y secciones',
    descripcion:
      'Catálogo de cursos del periodo y las secciones que lo componen. Es el primer archivo que se carga: los horarios y las matrículas buscan la sección por (curso, sección, periodo).',
    archivo: 'plantilla-cursos-secciones.csv',
    columnas: [
      {
        nombre: 'codigoCurso',
        obligatorio: true,
        descripcion: 'Código del curso (el mismo en todas sus secciones).',
        ejemplo: '202SW0104',
      },
      {
        nombre: 'nombreCurso',
        obligatorio: true,
        descripcion: 'Nombre completo del curso.',
        ejemplo: 'CÁLCULO I',
      },
      {
        nombre: 'codigoSeccion',
        obligatorio: true,
        descripcion:
          'Código de la sección. Suele ser el número y, si tiene laboratorio, el mismo con el sufijo -LAB.',
        ejemplo: '1',
      },
      {
        nombre: 'periodo',
        obligatorio: true,
        descripcion: 'Periodo académico al que pertenece la sección (p. ej. 2026-2).',
        ejemplo: '2026-2',
      },
      {
        nombre: 'tipoEspacioRequerido',
        obligatorio: true,
        descripcion:
          'AULA_TEORICA o LABORATORIO. Define qué tipo de espacio puede recibir la sección.',
        ejemplo: 'AULA_TEORICA',
      },
      {
        nombre: 'stackSoftwareRequerido',
        obligatorio: false,
        descripcion:
          'Software que el laboratorio debe tener instalado, separado por |. Cada nombre debe existir en el catálogo: si no, la fila se rechaza con SOFTWARE_NO_REGISTRADO.',
        ejemplo: 'Python 3.12|VS Code',
      },
    ],
    contenido: [
      'codigoCurso,nombreCurso,codigoSeccion,periodo,tipoEspacioRequerido,stackSoftwareRequerido',
      '202SW0104,CÁLCULO I,1,2026-2,AULA_TEORICA,',
      '202SW0104,CÁLCULO I,1-LAB,2026-2,LABORATORIO,Python 3.12|VS Code',
    ].join('\n'),
  },
  {
    tipo: 'horarios',
    titulo: 'Horarios',
    descripcion:
      'Los bloques de día y hora de cada sección. La sección debe existir ya (carga anterior) o la fila se rechaza.',
    archivo: 'plantilla-horarios.csv',
    columnas: [
      {
        nombre: 'codigoCurso',
        obligatorio: true,
        descripcion: 'Código del curso de la sección.',
        ejemplo: '202SW0104',
      },
      {
        nombre: 'codigoSeccion',
        obligatorio: true,
        descripcion: 'Código de la sección.',
        ejemplo: '1',
      },
      {
        nombre: 'periodo',
        obligatorio: true,
        descripcion:
          'Periodo de la sección. Debe coincidir con el de la carga de cursos y secciones.',
        ejemplo: '2026-2',
      },
      {
        nombre: 'diaSemana',
        obligatorio: true,
        descripcion:
          'LUNES, MARTES, MIERCOLES, JUEVES, VIERNES, SABADO o DOMINGO. Acepta minúsculas y sin tilde.',
        ejemplo: 'LUNES',
      },
      {
        nombre: 'horaInicio',
        obligatorio: true,
        descripcion: 'Hora de inicio en formato HH:mm (24 horas).',
        ejemplo: '08:00',
      },
      {
        nombre: 'horaFin',
        obligatorio: true,
        descripcion: 'Hora de fin en formato HH:mm. Debe ser posterior a la de inicio.',
        ejemplo: '10:00',
      },
    ],
    contenido: [
      'codigoCurso,codigoSeccion,periodo,diaSemana,horaInicio,horaFin',
      '202SW0104,1,2026-2,LUNES,08:00,10:00',
      '202SW0104,1-LAB,2026-2,LUNES,10:00,12:00',
    ].join('\n'),
  },
  {
    tipo: 'matriculas',
    titulo: 'Matrículas',
    descripcion:
      'Alumnos matriculados por sección. Si `crearCuentaAcceso` está activo, se crea la cuenta de acceso del alumno con su código como clave inicial.',
    archivo: 'plantilla-matriculas.csv',
    columnas: [
      {
        nombre: 'codigoAlumno',
        obligatorio: true,
        descripcion: 'Código de matrícula del alumno.',
        ejemplo: '23200107',
      },
      {
        nombre: 'nombre',
        obligatorio: true,
        descripcion: 'Nombre completo del alumno.',
        ejemplo: 'ALUMNO DE EJEMPLO',
      },
      {
        nombre: 'correo',
        obligatorio: true,
        descripcion: 'Correo institucional del alumno.',
        ejemplo: 'alumno.ejemplo@unmsm.edu.pe',
      },
      {
        nombre: 'movilidadReducida',
        obligatorio: false,
        descripcion:
          'true/false (también 1/0 o si/no). Marca la necesidad de accesibilidad: el motor prioriza los espacios de Piso 1.',
        ejemplo: 'false',
      },
      {
        nombre: 'codigoCurso',
        obligatorio: true,
        descripcion: 'Código del curso de la sección en la que se matricula.',
        ejemplo: '202SW0104',
      },
      {
        nombre: 'codigoSeccion',
        obligatorio: true,
        descripcion: 'Código de la sección.',
        ejemplo: '1',
      },
      {
        nombre: 'periodo',
        obligatorio: true,
        descripcion: 'Periodo de la sección.',
        ejemplo: '2026-2',
      },
      {
        nombre: 'crearCuentaAcceso',
        obligatorio: false,
        descripcion:
          'true/false. Con true se crea la cuenta de acceso del alumno (clave inicial = su código) y se le pide cambiar la clave al entrar.',
        ejemplo: 'true',
      },
    ],
    contenido: [
      'codigoAlumno,nombre,correo,movilidadReducida,codigoCurso,codigoSeccion,periodo,crearCuentaAcceso',
      '23200107,ALUMNO DE EJEMPLO,alumno.ejemplo@unmsm.edu.pe,false,202SW0104,1,2026-2,true',
    ].join('\n'),
  },
  {
    tipo: 'docentes',
    titulo: 'Docentes',
    descripcion:
      'Docentes de la Facultad y su cuenta de acceso (clave inicial = su código). No interviene en la asignación automática, pero conviene cargarlo antes de los horarios.',
    archivo: 'plantilla-docentes.csv',
    columnas: [
      {
        nombre: 'codigoDocente',
        obligatorio: true,
        descripcion: 'Código del docente.',
        ejemplo: '001198',
      },
      {
        nombre: 'nombre',
        obligatorio: true,
        descripcion: 'Nombre completo del docente.',
        ejemplo: 'DOCENTE DE EJEMPLO',
      },
      {
        nombre: 'correoInstitucional',
        obligatorio: true,
        descripcion: 'Correo institucional.',
        ejemplo: 'docente.ejemplo@unmsm.edu.pe',
      },
      {
        nombre: 'departamento',
        obligatorio: true,
        descripcion: 'Departamento académico al que pertenece.',
        ejemplo: 'Ingeniería de Software',
      },
    ],
    contenido: [
      'codigoDocente,nombre,correoInstitucional,departamento',
      '001198,DOCENTE DE EJEMPLO,docente.ejemplo@unmsm.edu.pe,Ingeniería de Software',
    ].join('\n'),
  },
];

/**
 * Descarga la plantilla como archivo CSV. Se genera en el navegador con un BOM para que Excel
 * respete los acentos y el punto y coma como separador en la configuración regional española.
 */
export function descargarPlantilla(plantilla: PlantillaCSV): void {
  const BOM = '\uFEFF';
  const contenido = `${BOM}${plantilla.contenido}\r\n`;
  const blob = new Blob([contenido], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const enlace = document.createElement('a');
  enlace.href = url;
  enlace.download = plantilla.archivo;
  document.body.appendChild(enlace);
  enlace.click();
  document.body.removeChild(enlace);
  URL.revokeObjectURL(url);
}
