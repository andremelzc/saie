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

/** Crea una columna; `obligatorio` solo se indica cuando la columna es opcional. */
const columna = (
  nombre: string,
  descripcion: string,
  ejemplo: string,
  obligatorio = true,
): ColumnaPlantilla => ({ nombre, obligatorio, descripcion, ejemplo });

/**
 * Columnas que comparten las plantillas de cursos, horarios y matrículas. Se declaran una sola vez
 * para que la guía de carga explique lo mismo en los tres flujos.
 */
const CODIGO_CURSO = columna(
  'codigoCurso',
  'Código del curso (el mismo en todas sus secciones).',
  '202SW0104',
);
const CODIGO_SECCION = columna(
  'codigoSeccion',
  'Código de la sección. Suele ser el número y, si tiene laboratorio, el mismo con el sufijo -LAB.',
  '1',
);
const PERIODO = columna(
  'periodo',
  'Periodo académico de la sección (p. ej. 2026-2). Debe coincidir con el de la carga de cursos.',
  '2026-2',
);

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
      CODIGO_CURSO,
      columna('nombreCurso', 'Nombre completo del curso.', 'CÁLCULO I'),
      CODIGO_SECCION,
      PERIODO,
      columna(
        'tipoEspacioRequerido',
        'AULA_TEORICA o LABORATORIO. Define qué tipo de espacio puede recibir la sección.',
        'AULA_TEORICA',
      ),
      columna(
        'stackSoftwareRequerido',
        'Software que el laboratorio debe tener instalado, separado por |. Cada nombre debe existir en el catálogo: si no, la fila se rechaza con SOFTWARE_NO_REGISTRADO.',
        'Python 3.12|VS Code',
        false,
      ),
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
      CODIGO_CURSO,
      CODIGO_SECCION,
      PERIODO,
      columna(
        'diaSemana',
        'LUNES, MARTES, MIERCOLES, JUEVES, VIERNES, SABADO o DOMINGO. Acepta minúsculas y sin tilde.',
        'LUNES',
      ),
      columna('horaInicio', 'Hora de inicio en formato HH:mm (24 horas).', '08:00'),
      columna(
        'horaFin',
        'Hora de fin en formato HH:mm. Debe ser posterior a la de inicio.',
        '10:00',
      ),
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
      columna('codigoAlumno', 'Código de matrícula del alumno.', '23200107'),
      columna('nombre', 'Nombre completo del alumno.', 'ALUMNO DE EJEMPLO'),
      columna('correo', 'Correo institucional del alumno.', 'alumno.ejemplo@unmsm.edu.pe'),
      columna(
        'movilidadReducida',
        'true/false (también 1/0 o si/no). Marca la necesidad de accesibilidad: el motor prioriza los espacios de Piso 1.',
        'false',
        false,
      ),
      CODIGO_CURSO,
      CODIGO_SECCION,
      PERIODO,
      columna(
        'crearCuentaAcceso',
        'true/false. Con true se crea la cuenta de acceso del alumno (clave inicial = su código) y se le pide cambiar la clave al entrar.',
        'true',
        false,
      ),
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
      columna('codigoDocente', 'Código del docente.', '001198'),
      columna('nombre', 'Nombre completo del docente.', 'DOCENTE DE EJEMPLO'),
      columna('correoInstitucional', 'Correo institucional.', 'docente.ejemplo@unmsm.edu.pe'),
      columna('departamento', 'Departamento académico al que pertenece.', 'Ingeniería de Software'),
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
