import { EstadoAsignacion, TipoEspacio, PrismaClient } from '@prisma/client';
import {
  obtenerAsignacionPorAlumno,
  obtenerAsignacionPorCurso,
} from '../../../src/services/consulta.service';

describe('Servicio de Consulta Pública (#3.2 y #3.4)', () => {
  let mockPrisma: any;

  beforeEach(() => {
    mockPrisma = {
      alumno: {
        findUnique: jest.fn(),
      },
      curso: {
        findUnique: jest.fn(),
      },
    };
  });

  describe('obtenerAsignacionPorAlumno (#3.2)', () => {
    it('retorna null si el alumno no existe en la base de datos', async () => {
      mockPrisma.alumno.findUnique.mockResolvedValue(null);

      const resultado = await obtenerAsignacionPorAlumno(
        '20200000',
        mockPrisma as unknown as PrismaClient,
      );

      expect(resultado).toBeNull();
      expect(mockPrisma.alumno.findUnique).toHaveBeenCalledWith({
        where: { codigo: '20200000' },
        include: expect.any(Object),
      });
    });

    it('retorna asignaciones vigentes con sus espacios, horarios y docente asignado', async () => {
      mockPrisma.alumno.findUnique.mockResolvedValue({
        id: 'alu-1',
        codigo: '20200001',
        nombre: 'Juan Pérez',
        correo: 'juan.perez@unmsm.edu.pe',
        matriculas: [
          {
            movilidadReducida: false,
            seccion: {
              codigoSeccion: '1',
              periodo: '2026-1',
              curso: {
                codigo: 'CC-101',
                nombre: 'Introducción a la Computación',
              },
              docente: {
                nombre: 'Dr. Roberto Torres',
              },
              horarios: [
                {
                  diaSemana: 'LUNES',
                  horaInicio: '08:00',
                  horaFin: '10:00',
                },
              ],
              asignaciones: [
                {
                  id: 'asig-1',
                  estado: EstadoAsignacion.VIGENTE,
                  motivoEscalamiento: null,
                  fechaAsignacion: new Date(),
                  espacios: [
                    {
                      espacio: {
                        id: 'esp-101',
                        identificador: 'Aula 101',
                        tipo: TipoEspacio.AULA_TEORICA,
                        pabellon: 'A',
                        piso: 1,
                      },
                    },
                  ],
                },
              ],
            },
          },
        ],
      });

      const resultado = await obtenerAsignacionPorAlumno(
        '20200001',
        mockPrisma as unknown as PrismaClient,
      );

      expect(resultado).not.toBeNull();
      expect(resultado?.alumno.codigo).toBe('20200001');
      expect(resultado?.alumno.nombre).toBe('Juan Pérez');
      expect(resultado?.alumno.movilidadReducida).toBe(false);
      expect(resultado?.asignaciones).toHaveLength(1);

      const item = resultado!.asignaciones[0];
      expect(item.asignacionId).toBe('asig-1');
      expect(item.codigoCurso).toBe('CC-101');
      expect(item.nombreCurso).toBe('Introducción a la Computación');
      expect(item.docenteNombre).toBe('Dr. Roberto Torres');
      expect(item.estadoAsignacion).toBe('VIGENTE');
      expect(item.espacios).toHaveLength(1);
      expect(item.espacios[0].identificador).toBe('Aula 101');
      expect(item.horarios).toEqual([
        {
          diaSemana: 'LUNES',
          horaInicio: '08:00',
          horaFin: '10:00',
        },
      ]);
    });

    it('marca movilidadReducida como true si al menos una matrícula la tiene activa', async () => {
      mockPrisma.alumno.findUnique.mockResolvedValue({
        id: 'alu-2',
        codigo: '20200002',
        nombre: 'Maria Gomez',
        correo: 'maria.gomez@unmsm.edu.pe',
        matriculas: [
          {
            movilidadReducida: false,
            seccion: {
              codigoSeccion: '1',
              periodo: '2026-1',
              curso: { codigo: 'CC-101', nombre: 'Curso 1' },
              docente: null,
              horarios: [],
              asignaciones: [],
            },
          },
          {
            movilidadReducida: true,
            seccion: {
              codigoSeccion: '2',
              periodo: '2026-1',
              curso: { codigo: 'CC-102', nombre: 'Curso 2' },
              docente: null,
              horarios: [],
              asignaciones: [],
            },
          },
        ],
      });

      const resultado = await obtenerAsignacionPorAlumno(
        '20200002',
        mockPrisma as unknown as PrismaClient,
      );

      expect(resultado).not.toBeNull();
      expect(resultado?.alumno.movilidadReducida).toBe(true);
    });

    it('gestiona correctamente secciones sin asignación aún (estado PENDIENTE)', async () => {
      mockPrisma.alumno.findUnique.mockResolvedValue({
        id: 'alu-3',
        codigo: '20200003',
        nombre: 'Carlos Ruiz',
        correo: 'carlos.ruiz@unmsm.edu.pe',
        matriculas: [
          {
            movilidadReducida: false,
            seccion: {
              codigoSeccion: '1',
              periodo: '2026-1',
              curso: { codigo: 'FIS-101', nombre: 'Física I' },
              docente: null,
              horarios: [{ diaSemana: 'MARTES', horaInicio: '10:00', horaFin: '12:00' }],
              asignaciones: [],
            },
          },
        ],
      });

      const resultado = await obtenerAsignacionPorAlumno(
        '20200003',
        mockPrisma as unknown as PrismaClient,
      );

      expect(resultado).not.toBeNull();
      expect(resultado?.asignaciones[0].estadoAsignacion).toBe('PENDIENTE');
      expect(resultado?.asignaciones[0].asignacionId).toBeUndefined();
      expect(resultado?.asignaciones[0].espacios).toEqual([]);
      expect(resultado?.asignaciones[0].docenteNombre).toBeNull();
    });

    it('procesa asignaciones en estado ESCALADA con su motivo de escalamiento', async () => {
      mockPrisma.alumno.findUnique.mockResolvedValue({
        id: 'alu-4',
        codigo: '20200004',
        nombre: 'Ana Lopez',
        correo: 'ana.lopez@unmsm.edu.pe',
        matriculas: [
          {
            movilidadReducida: false,
            seccion: {
              codigoSeccion: '1',
              periodo: '2026-1',
              curso: { codigo: 'MAT-101', nombre: 'Cálculo I' },
              docente: { nombre: 'Ing. Sanchez' },
              horarios: [],
              asignaciones: [
                {
                  id: 'asig-esc-1',
                  estado: EstadoAsignacion.ESCALADA,
                  motivoEscalamiento: 'Capacidad insuficiente en aulas de piso 1',
                  espacios: [],
                },
              ],
            },
          },
        ],
      });

      const resultado = await obtenerAsignacionPorAlumno(
        '20200004',
        mockPrisma as unknown as PrismaClient,
      );

      expect(resultado).not.toBeNull();
      expect(resultado?.asignaciones[0].estadoAsignacion).toBe('ESCALADA');
      expect(resultado?.asignaciones[0].motivoEscalamiento).toBe(
        'Capacidad insuficiente en aulas de piso 1',
      );
    });
  });

  describe('obtenerAsignacionPorCurso (#3.4)', () => {
    it('retorna null si el curso no existe', async () => {
      mockPrisma.curso.findUnique.mockResolvedValue(null);

      const resultado = await obtenerAsignacionPorCurso(
        'NO-EXISTE',
        mockPrisma as unknown as PrismaClient,
      );

      expect(resultado).toBeNull();
    });

    it('retorna las secciones del curso con espacios y horarios asignados', async () => {
      mockPrisma.curso.findUnique.mockResolvedValue({
        id: 'cur-1',
        codigo: 'CC-101',
        nombre: 'Introducción a la Computación',
        secciones: [
          {
            id: 'sec-1',
            codigoSeccion: '1',
            periodo: '2026-1',
            docente: { nombre: 'Dr. Roberto Torres' },
            horarios: [{ diaSemana: 'LUNES', horaInicio: '08:00', horaFin: '10:00' }],
            asignaciones: [
              {
                id: 'asig-1',
                estado: EstadoAsignacion.VIGENTE,
                motivoEscalamiento: null,
                espacios: [
                  {
                    espacio: {
                      id: 'esp-201',
                      identificador: 'Aula 201',
                      tipo: TipoEspacio.AULA_TEORICA,
                      pabellon: 'B',
                      piso: 2,
                    },
                  },
                ],
              },
            ],
          },
          {
            id: 'sec-2',
            codigoSeccion: '2',
            periodo: '2026-1',
            docente: null,
            horarios: [{ diaSemana: 'MIERCOLES', horaInicio: '14:00', horaFin: '16:00' }],
            asignaciones: [],
          },
        ],
      });

      const resultado = await obtenerAsignacionPorCurso(
        'CC-101',
        mockPrisma as unknown as PrismaClient,
      );

      expect(resultado).not.toBeNull();
      expect(resultado?.curso.codigo).toBe('CC-101');
      expect(resultado?.curso.nombre).toBe('Introducción a la Computación');
      expect(resultado?.secciones).toHaveLength(2);

      // Sección 1 (Vigente con espacio)
      expect(resultado?.secciones[0].codigoSeccion).toBe('1');
      expect(resultado?.secciones[0].estadoAsignacion).toBe('VIGENTE');
      expect(resultado?.secciones[0].docenteNombre).toBe('Dr. Roberto Torres');
      expect(resultado?.secciones[0].espacios).toHaveLength(1);
      expect(resultado?.secciones[0].espacios[0].identificador).toBe('Aula 201');

      // Sección 2 (Sin asignación - Pendiente)
      expect(resultado?.secciones[1].codigoSeccion).toBe('2');
      expect(resultado?.secciones[1].estadoAsignacion).toBe('PENDIENTE');
      expect(resultado?.secciones[1].docenteNombre).toBeNull();
      expect(resultado?.secciones[1].espacios).toEqual([]);
    });
  });
});
