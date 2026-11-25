import { calcularVistaPrevia } from '../../../src/services/vistaPreviaImportacion.service';
import { validarImportacion } from '../../../src/services/validacionImportacion.service';

jest.mock('../../../src/services/validacionImportacion.service', () => ({
  validarImportacion: jest.fn(),
}));

const validar = jest.mocked(validarImportacion);

function crearPrisma() {
  return {
    seccion: { findMany: jest.fn().mockResolvedValue([]) },
    alumno: { count: jest.fn().mockResolvedValue(0) },
    curso: { findMany: jest.fn().mockResolvedValue([]) },
    docente: { count: jest.fn().mockResolvedValue(0) },
  };
}
type PrismaFalso = ReturnType<typeof crearPrisma>;
const comoPrisma = (p: PrismaFalso) => p as unknown as Parameters<typeof calcularVistaPrevia>[2];

const matricula = (codigoAlumno: string, codigoSeccion = '1') => ({
  codigoAlumno,
  nombre: `Alumno ${codigoAlumno}`,
  correo: `${codigoAlumno}@unmsm.edu.pe`,
  codigoCurso: 'CC-101',
  codigoSeccion,
  periodo: '2026-2',
});

const horario = (diaSemana: string, horaInicio: string, horaFin: string) => ({
  codigoCurso: 'CC-101',
  codigoSeccion: '1',
  periodo: '2026-2',
  diaSemana,
  horaInicio,
  horaFin,
});

const cursoSeccion = (codigoCurso: string, codigoSeccion: string, periodo = '2026-2') => ({
  codigoCurso,
  nombreCurso: 'Algoritmos',
  codigoSeccion,
  periodo,
  tipoEspacioRequerido: 'AULA_TEORICA',
});

describe('calcularVistaPrevia (Issue 1.17)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    validar.mockResolvedValue({ errores: [], advertencias: [] });
  });

  it('con errores no calcula cambios ni consulta la base', async () => {
    validar.mockResolvedValue({ errores: ['Fila 2: código inválido'], advertencias: ['aviso'] });
    const prisma = crearPrisma();

    const vista = await calcularVistaPrevia('matriculas', [matricula('A1')], comoPrisma(prisma));

    expect(vista).toEqual({
      tipo: 'matriculas',
      filasRecibidas: 1,
      errores: ['Fila 2: código inválido'],
      advertencias: ['aviso'],
      cambios: {},
      frases: [],
      retiros: [],
    });
    expect(prisma.seccion.findMany).not.toHaveBeenCalled();
  });

  describe('matrículas', () => {
    it('cuenta las nuevas, los retiros y los alumnos nuevos de las secciones del archivo', async () => {
      const prisma = crearPrisma();
      prisma.seccion.findMany.mockResolvedValue([
        {
          codigoSeccion: '1',
          periodo: '2026-2',
          curso: { codigo: 'CC-101' },
          matriculas: [
            { alumno: { codigo: 'A1', nombre: 'Ana' } },
            { alumno: { codigo: 'A2', nombre: 'Pedro Ruiz' } },
          ],
        },
        // Una sección que la consulta devuelve pero que no está en el archivo: no se toca.
        {
          codigoSeccion: '9',
          periodo: '2026-2',
          curso: { codigo: 'CC-101' },
          matriculas: [{ alumno: { codigo: 'A9', nombre: 'Otro' } }],
        },
      ]);
      prisma.alumno.count.mockResolvedValue(1);

      const vista = await calcularVistaPrevia(
        'matriculas',
        [matricula('A1'), matricula('A3'), { fila: 'inválida' }],
        comoPrisma(prisma),
      );

      expect(vista.cambios).toEqual({
        matriculasNuevas: 1,
        matriculasRetiradas: 1,
        alumnosNuevos: 1,
      });
      expect(vista.retiros).toEqual(['CC-101 sec. 1: A2 Pedro Ruiz']);
      expect(vista.frases).toEqual([
        'Se agregará 1 matrícula',
        'Se quitará 1 matrícula (alumnos que ya no figuran en su sección)',
        'Se registrará 1 alumno nuevo',
      ]);
      expect(prisma.alumno.count).toHaveBeenCalledWith({
        where: { codigo: { in: ['A1', 'A3'] } },
      });
    });

    it('sin filas válidas no consulta la base', async () => {
      const prisma = crearPrisma();
      const vista = await calcularVistaPrevia('matriculas', [{}], comoPrisma(prisma));
      expect(vista.cambios).toEqual({
        matriculasNuevas: 0,
        matriculasRetiradas: 0,
        alumnosNuevos: 0,
      });
      expect(vista.frases).toHaveLength(2);
      expect(prisma.seccion.findMany).not.toHaveBeenCalled();
      expect(prisma.alumno.count).not.toHaveBeenCalled();
    });
  });

  describe('horarios', () => {
    it('distingue franjas nuevas, con otra hora de fin y retiradas', async () => {
      const prisma = crearPrisma();
      prisma.seccion.findMany.mockResolvedValue([
        {
          codigoSeccion: '1',
          periodo: '2026-2',
          curso: { codigo: 'CC-101' },
          horarios: [
            { diaSemana: 'LUNES', horaInicio: '08:00', horaFin: '10:00' },
            { diaSemana: 'MARTES', horaInicio: '10:00', horaFin: '11:00' },
            { diaSemana: 'JUEVES', horaInicio: '18:00', horaFin: '20:00' },
          ],
        },
        { codigoSeccion: '9', periodo: '2026-2', curso: { codigo: 'CC-101' }, horarios: [] },
      ]);

      const vista = await calcularVistaPrevia(
        'horarios',
        [
          horario('LUNES', '08:00', '10:00'),
          horario('MARTES', '10:00', '12:00'),
          horario('MIERCOLES', '08:00', '10:00'),
        ],
        comoPrisma(prisma),
      );

      expect(vista.cambios).toEqual({
        horariosNuevos: 1,
        horariosActualizados: 1,
        horariosRetirados: 1,
      });
      expect(vista.retiros).toEqual(['CC-101 sec. 1: JUEVES 18:00-20:00']);
      expect(vista.frases).toEqual([
        'Se agregará 1 franja de horario',
        'Se cambiará la hora de fin de 1 franja',
        'Se quitará 1 franja que ya no figura (cambios de horario)',
      ]);
    });

    it('sin cambios de hora de fin omite esa frase', async () => {
      const prisma = crearPrisma();
      const vista = await calcularVistaPrevia(
        'horarios',
        [horario('LUNES', '08:00', '10:00')],
        comoPrisma(prisma),
      );
      expect(vista.cambios.horariosNuevos).toBe(0);
      expect(vista.frases).toHaveLength(2);
    });
  });

  describe('cursos y secciones', () => {
    it('cuenta cursos y secciones nuevas, reactivadas e inactivadas por curso y periodo', async () => {
      const prisma = crearPrisma();
      prisma.curso.findMany.mockResolvedValue([
        {
          codigo: 'CC-101',
          secciones: [
            { codigoSeccion: '1', periodo: '2026-2', activa: true },
            { codigoSeccion: '3', periodo: '2026-2', activa: false },
            { codigoSeccion: '4', periodo: '2026-2', activa: true },
            { codigoSeccion: '5', periodo: '2026-2', activa: false },
            // Otro periodo: no se compara con el archivo.
            { codigoSeccion: '7', periodo: '2026-1', activa: true },
          ],
        },
      ]);

      const vista = await calcularVistaPrevia(
        'cursos-secciones',
        [
          cursoSeccion('CC-101', '1'),
          cursoSeccion('CC-101', '2'),
          cursoSeccion('CC-101', '3'),
          cursoSeccion('CC-999', '1'),
        ],
        comoPrisma(prisma),
      );

      expect(vista.cambios).toEqual({
        cursosNuevos: 1,
        seccionesNuevas: 2,
        seccionesReactivadas: 1,
        seccionesInactivadas: 1,
      });
      expect(vista.retiros).toEqual([
        'CC-101 sec. 4 (2026-2): pasará a inactiva y liberará su aula',
      ]);
      expect(vista.frases).toEqual([
        'Se creará 1 curso',
        'Se agregarán 2 secciones',
        'Se volverá a activar 1 sección',
        'Se marcará inactiva 1 sección que ya no figura en su curso',
      ]);
    });

    it('sin filas válidas no consulta la base', async () => {
      const prisma = crearPrisma();
      const vista = await calcularVistaPrevia('cursos-secciones', [{}], comoPrisma(prisma));
      expect(vista.cambios).toEqual({
        cursosNuevos: 0,
        seccionesNuevas: 0,
        seccionesReactivadas: 0,
        seccionesInactivadas: 0,
      });
      expect(prisma.curso.findMany).not.toHaveBeenCalled();
    });
  });

  describe('docentes', () => {
    it('separa los docentes nuevos de los que solo se actualizan', async () => {
      const prisma = crearPrisma();
      prisma.docente.count.mockResolvedValue(1);
      const docente = (codigoDocente: string) => ({
        codigoDocente,
        nombre: 'Rosa',
        correoInstitucional: `${codigoDocente}@unmsm.edu.pe`,
        departamento: 'Software',
      });

      const vista = await calcularVistaPrevia(
        'docentes',
        [docente('D1'), docente('D2'), docente('D2')],
        comoPrisma(prisma),
      );

      expect(vista.cambios).toEqual({ docentesNuevos: 1, docentesActualizados: 1 });
      expect(vista.retiros).toEqual([]);
      expect(vista.frases).toEqual([
        'Se registrará 1 docente nuevo',
        'Se actualizarán los datos de 1 docente',
      ]);
    });

    it('sin filas válidas no consulta la base', async () => {
      const prisma = crearPrisma();
      const vista = await calcularVistaPrevia('docentes', [{}], comoPrisma(prisma));
      expect(vista.cambios).toEqual({ docentesNuevos: 0, docentesActualizados: 0 });
      expect(prisma.docente.count).not.toHaveBeenCalled();
    });
  });
});
