import { DiaSemana, TipoEspacio } from '@prisma/client';
import { EspacioConexo } from '../../../src/rules/buscarBloqueContiguo';
import {
  clasificarMotivoEscalamiento,
  formatearMotivoEscalamiento,
} from '../../../src/rules/escalamiento';
import { MotivoEscalamientoTipo, SeccionInputMotor } from '../../../src/types/asignacion';

describe('Regla de Escalamiento a Revisión Manual (Issue 2.12)', () => {
  const mockEspacios: EspacioConexo[] = [
    {
      id: 'lab-101',
      identificador: 'Lab 101',
      pabellon: 'Pabellón Antiguo',
      piso: 1,
      tipo: TipoEspacio.LABORATORIO,
      aforoNominal: 30,
      pcsMalogradas: 0,
      softwareInstalado: ['Python 3.12', 'Docker'],
    },
    {
      id: 'lab-102',
      identificador: 'Lab 102',
      pabellon: 'Pabellón Antiguo',
      piso: 1,
      tipo: TipoEspacio.LABORATORIO,
      aforoNominal: 30,
      pcsMalogradas: 5, // Capacidad real: 25
      softwareInstalado: ['Python 3.12'],
    },
    {
      id: 'aula-201',
      identificador: 'Aula 201',
      pabellon: 'Pabellón Nuevo',
      piso: 2,
      tipo: TipoEspacio.AULA_TEORICA,
      aforoNominal: 40,
      pcsMalogradas: null,
    },
  ];

  describe('SIN_HORARIOS_DEFINIDOS', () => {
    it('debe clasificar cuando la sección no tiene franjas horarias', () => {
      const seccion: SeccionInputMotor = {
        id: 'sec-1',
        cursoId: 'cur-1',
        codigoSeccion: 'SEC-01',
        periodo: '2026-1',
        tipoEspacioRequerido: TipoEspacio.AULA_TEORICA,
        alumnosMatriculados: 30,
        horarios: [],
      };

      const resultado = clasificarMotivoEscalamiento({
        seccion,
        todosLosEspacios: mockEspacios,
        espaciosDisponiblesEnFranja: mockEspacios,
      });

      expect(resultado.tipo).toBe(MotivoEscalamientoTipo.SIN_HORARIOS_DEFINIDOS);
      expect(formatearMotivoEscalamiento(resultado)).toContain('[SIN_HORARIOS_DEFINIDOS]');
    });
  });

  describe('CAPACIDAD_INSUFICIENTE', () => {
    it('debe diagnosticar capacidad insuficiente cuando la matrícula excede la capacidad total del campus', () => {
      const seccion: SeccionInputMotor = {
        id: 'sec-1',
        cursoId: 'cur-1',
        codigoSeccion: 'SEC-01',
        periodo: '2026-1',
        tipoEspacioRequerido: TipoEspacio.LABORATORIO,
        alumnosMatriculados: 100, // Total labs en mock = 30 + 25 = 55
        horarios: [
          { diaSemana: DiaSemana.LUNES, horaInicio: '08:00', horaFin: '10:00' },
        ],
      };

      const resultado = clasificarMotivoEscalamiento({
        seccion,
        todosLosEspacios: mockEspacios,
        espaciosDisponiblesEnFranja: mockEspacios,
      });

      expect(resultado.tipo).toBe(MotivoEscalamientoTipo.CAPACIDAD_INSUFICIENTE);
      expect(resultado.descripcion).toContain('supera la capacidad física total');
    });

    it('debe diagnosticar capacidad insuficiente cuando la franja disponible no acumula el aforo requerido', () => {
      const seccion: SeccionInputMotor = {
        id: 'sec-1',
        cursoId: 'cur-1',
        codigoSeccion: 'SEC-01',
        periodo: '2026-1',
        tipoEspacioRequerido: TipoEspacio.LABORATORIO,
        alumnosMatriculados: 35,
        horarios: [
          { diaSemana: DiaSemana.LUNES, horaInicio: '08:00', horaFin: '10:00' },
        ],
      };

      // Solo lab-102 (capacidad 25) disponible en la franja
      const resultado = clasificarMotivoEscalamiento({
        seccion,
        todosLosEspacios: mockEspacios,
        espaciosDisponiblesEnFranja: [mockEspacios[1]],
      });

      expect(resultado.tipo).toBe(MotivoEscalamientoTipo.CAPACIDAD_INSUFICIENTE);
      expect(resultado.descripcion).toContain('Capacidad disponible acumulada (25 vacantes) es insuficiente');
    });
  });

  describe('HORARIO_BLOQUEADO', () => {
    it('debe diagnosticar horario bloqueado si ningún espacio del tipo está disponible en la franja', () => {
      const seccion: SeccionInputMotor = {
        id: 'sec-1',
        cursoId: 'cur-1',
        codigoSeccion: 'SEC-01',
        periodo: '2026-1',
        tipoEspacioRequerido: TipoEspacio.AULA_TEORICA,
        alumnosMatriculados: 20,
        horarios: [
          { diaSemana: DiaSemana.MARTES, horaInicio: '14:00', horaFin: '16:00' },
        ],
      };

      const resultado = clasificarMotivoEscalamiento({
        seccion,
        todosLosEspacios: mockEspacios,
        espaciosDisponiblesEnFranja: [], // Todo ocupado
      });

      expect(resultado.tipo).toBe(MotivoEscalamientoTipo.HORARIO_BLOQUEADO);
      expect(resultado.descripcion).toContain('se encuentran ocupados');
    });
  });

  describe('SOFTWARE_FALTANTE', () => {
    it('debe diagnosticar software faltante cuando los laboratorios disponibles no tienen el stack requerido', () => {
      const seccion: SeccionInputMotor = {
        id: 'sec-1',
        cursoId: 'cur-1',
        codigoSeccion: 'SEC-01',
        periodo: '2026-1',
        tipoEspacioRequerido: TipoEspacio.LABORATORIO,
        stackSoftwareRequerido: ['Matlab', 'Simulink'],
        alumnosMatriculados: 25,
        horarios: [
          { diaSemana: DiaSemana.MIERCOLES, horaInicio: '10:00', horaFin: '12:00' },
        ],
      };

      const resultado = clasificarMotivoEscalamiento({
        seccion,
        todosLosEspacios: mockEspacios,
        espaciosDisponiblesEnFranja: [mockEspacios[0], mockEspacios[1]],
        softwareRequerido: ['Matlab', 'Simulink'],
      });

      expect(resultado.tipo).toBe(MotivoEscalamientoTipo.SOFTWARE_FALTANTE);
      expect(resultado.descripcion).toContain('Matlab, Simulink');
    });
  });

  describe('CONTIGUEDAD_NO_ALCANZADA', () => {
    it('debe diagnosticar fallo de contigüidad cuando hay capacidad sumada pero están en pisos/pabellones separados', () => {
      const seccion: SeccionInputMotor = {
        id: 'sec-1',
        cursoId: 'cur-1',
        codigoSeccion: 'SEC-01',
        periodo: '2026-1',
        tipoEspacioRequerido: TipoEspacio.LABORATORIO,
        alumnosMatriculados: 50,
        horarios: [
          { diaSemana: DiaSemana.JUEVES, horaInicio: '10:00', horaFin: '12:00' },
        ],
      };

      const labPiso1: EspacioConexo = {
        id: 'lab-p1',
        identificador: 'Lab P1',
        pabellon: 'Pab A',
        piso: 1,
        tipo: TipoEspacio.LABORATORIO,
        aforoNominal: 30,
        pcsMalogradas: 0,
        softwareInstalado: [],
      };

      const labPiso2: EspacioConexo = {
        id: 'lab-p2',
        identificador: 'Lab P2',
        pabellon: 'Pab A',
        piso: 2, // Distinto piso, no contiguos
        tipo: TipoEspacio.LABORATORIO,
        aforoNominal: 30,
        pcsMalogradas: 0,
        softwareInstalado: [],
      };

      const resultado = clasificarMotivoEscalamiento({
        seccion,
        todosLosEspacios: [labPiso1, labPiso2],
        espaciosDisponiblesEnFranja: [labPiso1, labPiso2], // Suma 60 >= 50
      });

      expect(resultado.tipo).toBe(MotivoEscalamientoTipo.CONTIGUEDAD_NO_ALCANZADA);
      expect(resultado.descripcion).toContain('no forman un bloque contiguo');
    });
  });

  describe('Criterios de Aceptación Issue 2.12 (Reglas del Sistema)', () => {
    it('una sección escalada no debe asignar ni ocupar ningún espacio bajo ninguna circunstancia', () => {
      const seccion: SeccionInputMotor = {
        id: 'sec-esc-zero',
        cursoId: 'cur-1',
        codigoSeccion: 'SEC-01',
        periodo: '2026-1',
        tipoEspacioRequerido: TipoEspacio.AULA_TEORICA,
        alumnosMatriculados: 1000, // Imposible
        horarios: [{ diaSemana: DiaSemana.LUNES, horaInicio: '08:00', horaFin: '10:00' }],
      };

      const detalle = clasificarMotivoEscalamiento({
        seccion,
        todosLosEspacios: mockEspacios,
        espaciosDisponiblesEnFranja: mockEspacios,
      });

      // El diagnóstico debe contener el motivo claro
      expect(detalle.tipo).toBe(MotivoEscalamientoTipo.CAPACIDAD_INSUFICIENTE);
      expect(formatearMotivoEscalamiento(detalle)).toContain('Aforo requerido');
    });

    it('aplica estrictamente tanto para aulas teóricas como para laboratorios', () => {
      // Caso Aula Teórica que falla capacidad
      const seccionAula: SeccionInputMotor = {
        id: 'sec-aula-fail',
        cursoId: 'cur-1',
        codigoSeccion: 'SEC-AULA',
        periodo: '2026-1',
        tipoEspacioRequerido: TipoEspacio.AULA_TEORICA,
        alumnosMatriculados: 999,
        horarios: [{ diaSemana: DiaSemana.LUNES, horaInicio: '08:00', horaFin: '10:00' }],
      };

      const resAula = clasificarMotivoEscalamiento({
        seccion: seccionAula,
        todosLosEspacios: mockEspacios,
        espaciosDisponiblesEnFranja: mockEspacios,
      });

      expect(resAula.tipo).toBe(MotivoEscalamientoTipo.CAPACIDAD_INSUFICIENTE);

      // Caso Laboratorio que falla por software
      const seccionLab: SeccionInputMotor = {
        id: 'sec-lab-fail',
        cursoId: 'cur-2',
        codigoSeccion: 'SEC-LAB',
        periodo: '2026-1',
        tipoEspacioRequerido: TipoEspacio.LABORATORIO,
        stackSoftwareRequerido: ['AutoCAD 2026'],
        alumnosMatriculados: 20,
        horarios: [{ diaSemana: DiaSemana.LUNES, horaInicio: '08:00', horaFin: '10:00' }],
      };

      const resLab = clasificarMotivoEscalamiento({
        seccion: seccionLab,
        todosLosEspacios: mockEspacios,
        espaciosDisponiblesEnFranja: mockEspacios,
        softwareRequerido: ['AutoCAD 2026'],
      });

      expect(resLab.tipo).toBe(MotivoEscalamientoTipo.SOFTWARE_FALTANTE);
      expect(resLab.descripcion).toContain('AutoCAD 2026');
    });
  });
});
