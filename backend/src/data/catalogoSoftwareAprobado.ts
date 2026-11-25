import { CategoriaSoftware, TipoLicencia } from '@prisma/client';

/**
 * Catálogo de software aprobado por el equipo (Issue 6.14, riesgo R41).
 *
 * Es el Anexo B de `docs/riesgos_y_brechas.md`, aprobado el 25/11/2026, con la asignación de
 * laboratorios especializados de su sección B.4. Lo carga `prisma/cargar-catalogo-software.ts`.
 * Los programas van sin versión: las secciones aceptan cualquier versión instalada.
 */

/** Dónde se instala cada programa. */
export type GrupoSoftware =
  /** Imagen base: todos los laboratorios. */
  | 'BASE'
  /** Software general de la carrera: también en todos los laboratorios. */
  | 'GENERAL'
  | 'REDES'
  | 'HARDWARE'
  | 'BASES_DATOS'
  | 'DATOS_IA';

export interface ProgramaCatalogo {
  nombre: string;
  categoria: CategoriaSoftware;
  tipoLicencia: TipoLicencia;
  grupo: GrupoSoftware;
  descripcion?: string;
}

/** Laboratorio identificado por su pabellón y su número («Laboratorio 01»). */
export interface ReferenciaLaboratorio {
  pabellon: 'Nuevo Pabellón' | 'Antiguo Pabellón';
  numero: number;
}

const { SISTEMA_OPERATIVO, OFIMATICA, IDE, LENGUAJE, BASE_DATOS, REDES, SIMULACION, OTRO } =
  CategoriaSoftware;
const { LIBRE, EDUCATIVA, COMERCIAL } = TipoLicencia;

/** B.1: los 46 programas del catálogo. */
export const PROGRAMAS_CATALOGO: readonly ProgramaCatalogo[] = [
  // Imagen base (todos los laboratorios)
  { nombre: 'Windows 11', categoria: SISTEMA_OPERATIVO, tipoLicencia: COMERCIAL, grupo: 'BASE' },
  {
    nombre: 'Microsoft Office',
    categoria: OFIMATICA,
    tipoLicencia: COMERCIAL,
    grupo: 'BASE',
    descripcion: 'Word, Excel y PowerPoint',
  },
  { nombre: 'Google Chrome', categoria: OTRO, tipoLicencia: LIBRE, grupo: 'BASE' },
  { nombre: 'Visual Studio Code', categoria: IDE, tipoLicencia: LIBRE, grupo: 'BASE' },
  { nombre: 'Python', categoria: LENGUAJE, tipoLicencia: LIBRE, grupo: 'BASE' },
  { nombre: 'Java JDK', categoria: LENGUAJE, tipoLicencia: LIBRE, grupo: 'BASE' },
  {
    nombre: 'GCC / G++',
    categoria: LENGUAJE,
    tipoLicencia: LIBRE,
    grupo: 'BASE',
    descripcion: 'MinGW en Windows',
  },
  { nombre: 'Git', categoria: OTRO, tipoLicencia: LIBRE, grupo: 'BASE' },
  { nombre: 'GeoGebra', categoria: SIMULACION, tipoLicencia: EDUCATIVA, grupo: 'BASE' },
  { nombre: 'draw.io', categoria: OTRO, tipoLicencia: LIBRE, grupo: 'BASE' },
  { nombre: 'PostgreSQL + pgAdmin', categoria: BASE_DATOS, tipoLicencia: LIBRE, grupo: 'BASE' },
  {
    nombre: 'MySQL + MySQL Workbench',
    categoria: BASE_DATOS,
    tipoLicencia: LIBRE,
    grupo: 'BASE',
  },

  // Software general (todos los laboratorios)
  {
    nombre: 'Ubuntu',
    categoria: SISTEMA_OPERATIVO,
    tipoLicencia: LIBRE,
    grupo: 'GENERAL',
    descripcion: 'Máquina virtual',
  },
  { nombre: 'Microsoft Project', categoria: OFIMATICA, tipoLicencia: COMERCIAL, grupo: 'GENERAL' },
  { nombre: 'IntelliJ IDEA Community', categoria: IDE, tipoLicencia: LIBRE, grupo: 'GENERAL' },
  { nombre: 'Eclipse IDE', categoria: IDE, tipoLicencia: LIBRE, grupo: 'GENERAL' },
  { nombre: 'Apache NetBeans', categoria: IDE, tipoLicencia: LIBRE, grupo: 'GENERAL' },
  { nombre: 'Code::Blocks', categoria: IDE, tipoLicencia: LIBRE, grupo: 'GENERAL' },
  { nombre: 'Node.js', categoria: LENGUAJE, tipoLicencia: LIBRE, grupo: 'GENERAL' },
  { nombre: 'GNU Octave', categoria: SIMULACION, tipoLicencia: LIBRE, grupo: 'GENERAL' },
  { nombre: 'R + RStudio', categoria: SIMULACION, tipoLicencia: LIBRE, grupo: 'GENERAL' },
  { nombre: 'StarUML', categoria: OTRO, tipoLicencia: EDUCATIVA, grupo: 'GENERAL' },
  { nombre: 'Bizagi Modeler', categoria: OTRO, tipoLicencia: EDUCATIVA, grupo: 'GENERAL' },
  {
    nombre: 'Figma',
    categoria: OTRO,
    tipoLicencia: EDUCATIVA,
    grupo: 'GENERAL',
    descripcion: 'Se usa en el navegador',
  },
  { nombre: 'Docker Desktop', categoria: OTRO, tipoLicencia: EDUCATIVA, grupo: 'GENERAL' },
  { nombre: 'VirtualBox', categoria: OTRO, tipoLicencia: LIBRE, grupo: 'GENERAL' },
  { nombre: 'Postman', categoria: OTRO, tipoLicencia: EDUCATIVA, grupo: 'GENERAL' },
  { nombre: 'Apache JMeter', categoria: OTRO, tipoLicencia: LIBRE, grupo: 'GENERAL' },
  { nombre: 'Selenium IDE', categoria: OTRO, tipoLicencia: LIBRE, grupo: 'GENERAL' },
  { nombre: 'ANTLR', categoria: LENGUAJE, tipoLicencia: LIBRE, grupo: 'GENERAL' },
  {
    nombre: 'WinFlexBison',
    categoria: LENGUAJE,
    tipoLicencia: LIBRE,
    grupo: 'GENERAL',
    descripcion: 'Flex y Bison',
  },
  { nombre: 'UiPath Studio Community', categoria: OTRO, tipoLicencia: EDUCATIVA, grupo: 'GENERAL' },
  { nombre: 'GanttProject', categoria: OTRO, tipoLicencia: LIBRE, grupo: 'GENERAL' },
  { nombre: 'Blender', categoria: OTRO, tipoLicencia: LIBRE, grupo: 'GENERAL' },

  // Laboratorios de redes
  { nombre: 'Cisco Packet Tracer', categoria: REDES, tipoLicencia: EDUCATIVA, grupo: 'REDES' },
  { nombre: 'GNS3', categoria: REDES, tipoLicencia: LIBRE, grupo: 'REDES' },
  { nombre: 'Wireshark', categoria: REDES, tipoLicencia: LIBRE, grupo: 'REDES' },

  // Laboratorios de hardware y paralelismo
  { nombre: 'Logisim Evolution', categoria: SIMULACION, tipoLicencia: LIBRE, grupo: 'HARDWARE' },
  { nombre: 'Arduino IDE', categoria: IDE, tipoLicencia: LIBRE, grupo: 'HARDWARE' },
  { nombre: 'MS-MPI / OpenMPI', categoria: LENGUAJE, tipoLicencia: LIBRE, grupo: 'HARDWARE' },

  // Laboratorios de bases de datos
  {
    nombre: 'SQL Server Express + SSMS',
    categoria: BASE_DATOS,
    tipoLicencia: EDUCATIVA,
    grupo: 'BASES_DATOS',
  },
  { nombre: 'MongoDB Community', categoria: BASE_DATOS, tipoLicencia: LIBRE, grupo: 'BASES_DATOS' },

  // Laboratorios de datos e IA
  {
    nombre: 'Anaconda',
    categoria: LENGUAJE,
    tipoLicencia: LIBRE,
    grupo: 'DATOS_IA',
    descripcion: 'Jupyter, scikit-learn y TensorFlow',
  },
  { nombre: 'Weka', categoria: OTRO, tipoLicencia: LIBRE, grupo: 'DATOS_IA' },
  { nombre: 'KNIME', categoria: OTRO, tipoLicencia: LIBRE, grupo: 'DATOS_IA' },
  { nombre: 'Power BI Desktop', categoria: OTRO, tipoLicencia: EDUCATIVA, grupo: 'DATOS_IA' },
];

const nuevo = (...numeros: number[]): ReferenciaLaboratorio[] =>
  numeros.map((numero) => ({ pabellon: 'Nuevo Pabellón', numero }));
const antiguo = (...numeros: number[]): ReferenciaLaboratorio[] =>
  numeros.map((numero) => ({ pabellon: 'Antiguo Pabellón', numero }));

/**
 * B.4: laboratorios especializados. Cada grupo ocupa laboratorios contiguos del mismo piso,
 * porque el motor exige que **todos** los laboratorios de un bloque tengan el software.
 */
export const LABORATORIOS_ESPECIALIZADOS: Readonly<
  Record<Exclude<GrupoSoftware, 'BASE' | 'GENERAL'>, readonly ReferenciaLaboratorio[]>
> = {
  REDES: nuevo(1, 2, 3),
  HARDWARE: [...nuevo(1, 2, 3), ...antiguo(1, 2, 3)],
  BASES_DATOS: [...nuevo(4, 5, 6, 7, 8), ...antiguo(4, 5, 6)],
  DATOS_IA: nuevo(4, 5, 6, 7, 8),
};

/** B.2: software requerido por las secciones de laboratorio de cada curso. */
export const SOFTWARE_POR_CURSO: Readonly<Record<string, readonly string[]>> = {
  '202SW0104': ['GeoGebra', 'GNU Octave'],
  '202SW0106': ['GeoGebra', 'GNU Octave'],
  '202SW0201': ['Microsoft Office'],
  '202SW0202': ['Microsoft Office'],
  '202SW0203': ['Microsoft Office'],
  '202SW0204': ['GeoGebra', 'GNU Octave'],
  '202SW0205': ['GeoGebra'],
  '202SW0207': ['Microsoft Office', 'Python'],
  '202SW0302': ['R + RStudio', 'Microsoft Office'],
  '202SW0303': ['Logisim Evolution', 'Arduino IDE'],
  '202SW0304': ['Microsoft Office'],
  '202SW0306': ['GeoGebra'],
  '202SW0401': ['Code::Blocks', 'GCC / G++', 'Java JDK'],
  '202SW0402': ['Microsoft Office'],
  '202SW0403': ['Microsoft Office', 'Bizagi Modeler'],
  '202SW0404': ['Python', 'GeoGebra'],
  '202SW0405': ['Code::Blocks', 'GCC / G++', 'Java JDK', 'IntelliJ IDEA Community'],
  '202SW0406': ['Bizagi Modeler', 'StarUML'],
  '202SW0407': ['Logisim Evolution'],
  '202SW0501': ['GCC / G++', 'Python', 'Java JDK'],
  '202SW0502': ['Logisim Evolution', 'VirtualBox'],
  '202SW0503': ['PostgreSQL + pgAdmin', 'MySQL + MySQL Workbench'],
  '202SW0504': ['Python', 'Blender'],
  '202SW0505': ['Microsoft Office'],
  '202SW0506': ['StarUML', 'Bizagi Modeler', 'Figma'],
  '202SW0507': ['ANTLR', 'WinFlexBison', 'GCC / G++'],
  '202SW0601': ['SQL Server Express + SSMS', 'MongoDB Community', 'PostgreSQL + pgAdmin'],
  '202SW0602': ['Selenium IDE', 'Apache JMeter', 'Postman'],
  '202SW0603': ['StarUML', 'IntelliJ IDEA Community'],
  '202SW0605': ['Microsoft Project', 'GanttProject'],
  '202SW0606': ['Figma'],
  '202SW0607': ['VirtualBox', 'Ubuntu'],
  '202SW0701': ['Docker Desktop', 'StarUML', 'IntelliJ IDEA Community'],
  '202SW0702': ['Figma'],
  '202SW0703': ['Git', 'Docker Desktop'],
  '202SW0704': ['Microsoft Office'],
  '202SW0705': ['Anaconda'],
  '202SW0706': ['Selenium IDE', 'Apache JMeter', 'Postman'],
  '202SW0707': ['Cisco Packet Tracer', 'Wireshark', 'GNS3'],
  '202SW0801': ['UiPath Studio Community', 'Arduino IDE'],
  '202SW0802': ['Power BI Desktop', 'SQL Server Express + SSMS'],
  '202SW0803': ['Microsoft Office'],
  '202SW0804': ['Weka', 'KNIME', 'Anaconda'],
  '202SW0805': ['MS-MPI / OpenMPI', 'Java JDK', 'GCC / G++'],
  '202SW0806': ['Node.js', 'Docker Desktop', 'Postman'],
  '202SW0807': ['Apache JMeter', 'Selenium IDE'],
  '202SW0E01': ['Python', 'Visual Studio Code'],
  '202SW0E02': ['Microsoft Office', 'Figma'],
};
