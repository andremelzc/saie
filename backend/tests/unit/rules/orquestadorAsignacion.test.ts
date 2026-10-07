import { DiaSemana, EstadoAsignacion, TipoEspacio } from '@prisma/client';
import { EspacioConexo } from '../../../src/rules/buscarBloqueContiguo';
import {
  orquestarAsignacionSeccion,
  calcularHuellaEntradaSeccion,
} from '../../../src/rules/orquestadorAsignacion';
import { SeccionInputMotor } from '../../../src/types/asignacion';
import { AsignacionOcupacionInput } from '../../../src/services/disponibilidad.service';
import { AsignacionParalelaUbicacion } from '../../../src/rules/cercaniaParalelas';

describe('Orquestador de Asignación Individual (Issue 2.10 & 2.14)', () => {
  const espaciosMock: EspacioConexo[] = [
    {
      id: 'aula-101',
      identificador: 'Aula 101',
      pabellon: 'Pabellón Principal',
      piso: 1,
      tipo: TipoEspacio.AULA_TEORICA,
      aforoNominal: 30,
      pcsMalogradas: null,
    },
    {
      id: 'aula-102',
      identificador: 'Aula 102',
      pabellon: 'Pabellón Principal',
      piso: 1,
      tipo: TipoEspacio.AULA_TEORICA,
      aforoNominal: 30,
      pcsMalogradas: null,
    },
    {
      id: 'aula-201',
      identificador: 'Aula 201',
      pabellon: 'Pabellón Principal',
      piso: 2,
      tipo: TipoEspacio.AULA_TEORICA,
      aforoNominal: 40,
      pcsMalogradas: null,
    },
    {
      id: 'lab-101',
      identificador: 'Lab 101',
      pabellon: 'Pabellón Principal',
      piso: 1,
      tipo: TipoEspacio.LABORATORIO,
      aforoNominal: 25,
      pcsMalogradas: 0,
      softwareInstalado: ['Python 3.12', 'Docker'],
    },
    {
      id: 'lab-102',
      identificador: 'Lab 102',
      pabellon: 'Pabellón Principal',
      piso: 1,
      tipo: TipoEspacio.LABORATORIO,
      aforoNominal: 25,
      pcsMalogradas: 0,
      softwareInstalado: ['Python 3.12', 'Docker', 'PostgreSQL'],
    },
    {
      id: 'lab-201',
      identificador: 'Lab 201',
      pabellon: 'Pabellón Principal',
      piso: 2,
      tipo: TipoEspacio.LABORATORIO,
      aforoNominal: 35,
      pcsMalogradas: 2, // Capacidad real: 33
      softwareInstalado: ['NodeJS', 'VSCode'],
    },
  ];

  // Grafo de contigüidad: 101 <-> 102
  const obtenerVecinosMock = (id: string): string[] => {
    if (id === 'aula-101') return ['aula-102'];
    if (id === 'aula-102') return ['aula-101'];
    if (id === 'lab-101') return ['lab-102'];
    if (id === 'lab-102') return ['lab-101'];
    return [];
  };

  describe('Camino Feliz: Asignación Individual Directa', () => {
    it('debe asignar exitosamente un aula teórica individual con menor desperdicio', () => {
      const seccion: SeccionInputMotor = {
        id: 'sec-1',
        cursoId: 'cur-1',
        codigoSeccion: 'SEC-101',
        periodo: '2026-1',
        tipoEspacioRequerido: TipoEspacio.AULA_TEORICA,
        alumnosMatriculados: 28,
        horarios: [
          { diaSemana: DiaSemana.LUNES, horaInicio: '08:00', horaFin: '10:00' },
        ],
      };

      const resultado = orquestarAsignacionSeccion({
        seccion,
        todosLosEspacios: espaciosMock,
        asignacionesVigentes: [],
        obtenerVecinosContiguos: obtenerVecinosMock,
      });

      expect(resultado.estado).toBe(EstadoAsignacion.VIGENTE);
      expect(resultado.espacioIds).toEqual(['aula-101']); // Aula 101 (cap 30, desp 2) vs Aula 201 (cap 40, desp 12)
      expect(resultado.bloqueAsignado?.capacidadTotal).toBe(30);
      expect(resultado.huellaEntrada).toBeDefined();
    });

    it('debe expandir a bloque contiguo conexo cuando un solo espacio no alcanza', () => {
      const seccion: SeccionInputMotor = {
        id: 'sec-2',
        cursoId: 'cur-1',
        codigoSeccion: 'SEC-102',
        periodo: '2026-1',
        tipoEspacioRequerido: TipoEspacio.AULA_TEORICA,
        alumnosMatriculados: 55, // 30 + 30 = 60
        horarios: [
          { diaSemana: DiaSemana.MARTES, horaInicio: '10:00', horaFin: '12:00' },
        ],
      };

      const resultado = orquestarAsignacionSeccion({
        seccion,
        todosLosEspacios: espaciosMock,
        asignacionesVigentes: [],
        obtenerVecinosContiguos: obtenerVecinosMock,
      });

      expect(resultado.estado).toBe(EstadoAsignacion.VIGENTE);
      expect(resultado.espacioIds).toEqual(['aula-101', 'aula-102']);
      expect(resultado.bloqueAsignado?.capacidadTotal).toBe(60);
    });

    it('debe asignar laboratorio validando la matriz de software requerida', () => {
      const seccion: SeccionInputMotor = {
        id: 'sec-lab',
        cursoId: 'cur-bd',
        codigoSeccion: 'SEC-LAB-1',
        periodo: '2026-1',
        tipoEspacioRequerido: TipoEspacio.LABORATORIO,
        stackSoftwareRequerido: ['Docker', 'PostgreSQL'],
        alumnosMatriculados: 20,
        horarios: [
          { diaSemana: DiaSemana.MIERCOLES, horaInicio: '14:00', horaFin: '16:00' },
        ],
      };

      const resultado = orquestarAsignacionSeccion({
        seccion,
        todosLosEspacios: espaciosMock,
        asignacionesVigentes: [],
        obtenerVecinosContiguos: obtenerVecinosMock,
      });

      expect(resultado.estado).toBe(EstadoAsignacion.VIGENTE);
      expect(resultado.espacioIds).toEqual(['lab-102']); // Lab 102 tiene PostgreSQL
    });
  });

  describe('Accesibilidad y Movilidad Reducida (Issue 2.8 & 2.9)', () => {
    it('debe priorizar Piso 1 cuando la sección tiene flag de movilidad reducida', () => {
      const seccion: SeccionInputMotor = {
        id: 'sec-mov',
        cursoId: 'cur-alg',
        codigoSeccion: 'SEC-1',
        periodo: '2026-1',
        tipoEspacioRequerido: TipoEspacio.AULA_TEORICA,
        alumnosMatriculados: 25,
        movilidadReducida: true,
        horarios: [
          { diaSemana: DiaSemana.JUEVES, horaInicio: '08:00', horaFin: '10:00' },
        ],
      };

      const resultado = orquestarAsignacionSeccion({
        seccion,
        todosLosEspacios: espaciosMock,
        asignacionesVigentes: [],
        obtenerVecinosContiguos: obtenerVecinosMock,
      });

      expect(resultado.estado).toBe(EstadoAsignacion.VIGENTE);
      expect(resultado.bloqueAsignado?.piso).toBe(1);
      expect(resultado.fallbackPiso1Aplicado).toBe(false);
    });

    it('debe aplicar fallback si no hay bloques en Piso 1 y documentarlo', () => {
      const seccion: SeccionInputMotor = {
        id: 'sec-mov-fb',
        cursoId: 'cur-alg',
        codigoSeccion: 'SEC-2',
        periodo: '2026-1',
        tipoEspacioRequerido: TipoEspacio.AULA_TEORICA,
        alumnosMatriculados: 35, // En piso 1 solo hay aulas de 30 individualmente
        movilidadReducida: true,
        horarios: [
          { diaSemana: DiaSemana.JUEVES, horaInicio: '08:00', horaFin: '10:00' },
        ],
      };

      // Ocupamos piso 1 completamente
      const ocupaciones: AsignacionOcupacionInput[] = [
        {
          id: 'asig-1',
          estado: EstadoAsignacion.VIGENTE,
          espacioIds: ['aula-101', 'aula-102'],
          horarios: [{ diaSemana: DiaSemana.JUEVES, horaInicio: '08:00', horaFin: '10:00' }],
        },
      ];

      const resultado = orquestarAsignacionSeccion({
        seccion,
        todosLosEspacios: espaciosMock,
        asignacionesVigentes: ocupaciones,
        obtenerVecinosContiguos: obtenerVecinosMock,
      });

      expect(resultado.estado).toBe(EstadoAsignacion.VIGENTE);
      expect(resultado.espacioIds).toEqual(['aula-201']);
      expect(resultado.fallbackPiso1Aplicado).toBe(true);
      expect(resultado.motivoFallbackPiso1).toBeDefined();
    });
  });

  describe('Integración de Cercanía entre Secciones Paralelas (Issue 2.14)', () => {
    it('debe desempatar bloques candidatos prefiriendo el más cercano a las secciones paralelas asignadas', () => {
      // Supongamos que la sección 1 del curso cur-1 está asignada en Piso 1 (Aula 101)
      const paralelas: AsignacionParalelaUbicacion[] = [
        {
          seccionId: 'sec-paralela-1',
          codigoSeccion: 'SEC-1',
          espacios: [{ pabellon: 'Pabellón Principal', piso: 1 }],
        },
      ];

      const seccion2: SeccionInputMotor = {
        id: 'sec-paralela-2',
        cursoId: 'cur-1',
        codigoSeccion: 'SEC-2',
        periodo: '2026-1',
        tipoEspacioRequerido: TipoEspacio.AULA_TEORICA,
        alumnosMatriculados: 25,
        horarios: [
          { diaSemana: DiaSemana.VIERNES, horaInicio: '08:00', horaFin: '10:00' },
        ],
      };

      const resultado = orquestarAsignacionSeccion({
        seccion: seccion2,
        todosLosEspacios: espaciosMock,
        asignacionesVigentes: [],
        obtenerVecinosContiguos: obtenerVecinosMock,
        paralelasAsignadas: paralelas,
      });

      expect(resultado.estado).toBe(EstadoAsignacion.VIGENTE);
      expect(resultado.espacioIds).toEqual(['aula-101']); // Mismo piso y pabellón: 100 pts
      expect(resultado.puntajeCercania).toBe(100);
    });

    it('si solo queda un bloque válido, lo usa sin importar su baja puntuación de cercanía (desempate, nunca descarte)', () => {
      // Paralela asignada en un pabellón totalmente distinto
      const paralelas: AsignacionParalelaUbicacion[] = [
        {
          seccionId: 'sec-paralela-1',
          codigoSeccion: 'SEC-1',
          espacios: [{ pabellon: 'Pabellón Remoto', piso: 3 }],
        },
      ];

      const seccion: SeccionInputMotor = {
        id: 'sec-lejana',
        cursoId: 'cur-1',
        codigoSeccion: 'SEC-2',
        periodo: '2026-1',
        tipoEspacioRequerido: TipoEspacio.AULA_TEORICA,
        alumnosMatriculados: 25,
        horarios: [{ diaSemana: DiaSemana.LUNES, horaInicio: '08:00', horaFin: '10:00' }],
      };

      // Ocupamos aula-101 y aula-102 para dejar solo aula-201
      const ocupaciones: AsignacionOcupacionInput[] = [
        {
          id: 'asig-1',
          estado: EstadoAsignacion.VIGENTE,
          espacioIds: ['aula-101', 'aula-102'],
          horarios: [{ diaSemana: DiaSemana.LUNES, horaInicio: '08:00', horaFin: '10:00' }],
        },
      ];

      const resultado = orquestarAsignacionSeccion({
        seccion,
        todosLosEspacios: espaciosMock,
        asignacionesVigentes: ocupaciones,
        obtenerVecinosContiguos: obtenerVecinosMock,
        paralelasAsignadas: paralelas,
      });

      expect(resultado.estado).toBe(EstadoAsignacion.VIGENTE);
      expect(resultado.espacioIds).toEqual(['aula-201']); // Único bloque disponible
      expect(resultado.puntajeCercania).toBe(10); // Distinto pabellón (10 pts), pero se asigna sin descartar
    });
  });

  describe('Idempotencia del Motor', () => {
    it('debe conservar la asignación existente si la huella de requerimientos es idéntica', () => {
      const seccion: SeccionInputMotor = {
        id: 'sec-idem',
        cursoId: 'cur-idem',
        codigoSeccion: 'SEC-1',
        periodo: '2026-1',
        tipoEspacioRequerido: TipoEspacio.AULA_TEORICA,
        alumnosMatriculados: 25,
        horarios: [
          { diaSemana: DiaSemana.LUNES, horaInicio: '08:00', horaFin: '10:00' },
        ],
      };

      const huella = calcularHuellaEntradaSeccion(seccion);

      const resultado = orquestarAsignacionSeccion({
        seccion,
        todosLosEspacios: espaciosMock,
        asignacionesVigentes: [],
        obtenerVecinosContiguos: obtenerVecinosMock,
        asignacionPrevia: {
          id: 'asig-prev-1',
          seccionId: 'sec-idem',
          estado: EstadoAsignacion.VIGENTE,
          espacioIds: ['aula-101'],
          horarios: seccion.horarios,
          huellaEntrada: huella,
        },
      });

      expect(resultado.estado).toBe(EstadoAsignacion.VIGENTE);
      expect(resultado.conservadaPorIdempotencia).toBe(true);
      expect(resultado.espacioIds).toEqual(['aula-101']);
    });
  });

  describe('Franjas Horarias Múltiples', () => {
    it('debe garantizar que el bloque esté disponible en todas las franjas horarias de la sección', () => {
      const seccion: SeccionInputMotor = {
        id: 'sec-multi',
        cursoId: 'cur-multi',
        codigoSeccion: 'SEC-1',
        periodo: '2026-1',
        tipoEspacioRequerido: TipoEspacio.AULA_TEORICA,
        alumnosMatriculados: 25,
        horarios: [
          { diaSemana: DiaSemana.LUNES, horaInicio: '08:00', horaFin: '10:00' },
          { diaSemana: DiaSemana.MIERCOLES, horaInicio: '08:00', horaFin: '10:00' },
        ],
      };

      // Aula 101 está libre el Lunes pero ocupada el Miércoles
      const asignaciones: AsignacionOcupacionInput[] = [
        {
          id: 'asig-otra',
          estado: EstadoAsignacion.VIGENTE,
          espacioIds: ['aula-101'],
          horarios: [{ diaSemana: DiaSemana.MIERCOLES, horaInicio: '08:00', horaFin: '10:00' }],
        },
      ];

      const resultado = orquestarAsignacionSeccion({
        seccion,
        todosLosEspacios: espaciosMock,
        asignacionesVigentes: asignaciones,
        obtenerVecinosContiguos: obtenerVecinosMock,
      });

      expect(resultado.estado).toBe(EstadoAsignacion.VIGENTE);
      expect(resultado.espacioIds).toEqual(['aula-102']); // Selecciona Aula 102 porque Aula 101 está ocupada el Miércoles
    });
  });

  describe('Casos Borde de la Especificación (Issue 2.10)', () => {
    it('debe asignar un espacio mínimo para una sección sin alumnos matriculados (0 alumnos)', () => {
      const seccion: SeccionInputMotor = {
        id: 'sec-cero',
        cursoId: 'cur-1',
        codigoSeccion: 'SEC-0',
        periodo: '2026-1',
        tipoEspacioRequerido: TipoEspacio.AULA_TEORICA,
        alumnosMatriculados: 0, // 0 matriculados
        horarios: [
          { diaSemana: DiaSemana.LUNES, horaInicio: '08:00', horaFin: '10:00' },
        ],
      };

      const resultado = orquestarAsignacionSeccion({
        seccion,
        todosLosEspacios: espaciosMock,
        asignacionesVigentes: [],
        obtenerVecinosContiguos: obtenerVecinosMock,
      });

      expect(resultado.estado).toBe(EstadoAsignacion.VIGENTE);
      expect(resultado.espacioIds).toHaveLength(1); // Asigna 1 espacio con menor aforo
      expect(resultado.espacioIds).toEqual(['aula-101']);
    });

    it('debe reasignar si los horarios cambiaron entre corridas (invalida huella previa)', () => {
      const seccion: SeccionInputMotor = {
        id: 'sec-cambio-horario',
        cursoId: 'cur-1',
        codigoSeccion: 'SEC-CH',
        periodo: '2026-1',
        tipoEspacioRequerido: TipoEspacio.AULA_TEORICA,
        alumnosMatriculados: 25,
        horarios: [
          { diaSemana: DiaSemana.MARTES, horaInicio: '14:00', horaFin: '16:00' }, // Nuevo horario
        ],
      };

      // Asignación previa tenía horario de Lunes
      const huellaVieja = 'huella-antigua-lunes-08-10';

      const resultado = orquestarAsignacionSeccion({
        seccion,
        todosLosEspacios: espaciosMock,
        asignacionesVigentes: [],
        obtenerVecinosContiguos: obtenerVecinosMock,
        asignacionPrevia: {
          id: 'asig-prev-vieja',
          seccionId: 'sec-cambio-horario',
          estado: EstadoAsignacion.VIGENTE,
          espacioIds: ['aula-201'],
          horarios: [{ diaSemana: DiaSemana.LUNES, horaInicio: '08:00', horaFin: '10:00' }],
          huellaEntrada: huellaVieja,
        },
      });

      expect(resultado.estado).toBe(EstadoAsignacion.VIGENTE);
      expect(resultado.conservadaPorIdempotencia).toBeUndefined(); // Se re-calculó
      expect(resultado.huellaEntrada).not.toBe(huellaVieja);
    });

    it('debe asignar exitosamente una sección ESCALADA que ahora sí cuenta con un bloque válido', () => {
      const seccion: SeccionInputMotor = {
        id: 'sec-ex-escalada',
        cursoId: 'cur-1',
        codigoSeccion: 'SEC-ESC-RECUPERADA',
        periodo: '2026-1',
        tipoEspacioRequerido: TipoEspacio.AULA_TEORICA,
        alumnosMatriculados: 25,
        horarios: [
          { diaSemana: DiaSemana.VIERNES, horaInicio: '10:00', horaFin: '12:00' },
        ],
      };

      // Previamente estaba ESCALADA
      const resultado = orquestarAsignacionSeccion({
        seccion,
        todosLosEspacios: espaciosMock,
        asignacionesVigentes: [], // Ahora los espacios están libres
        obtenerVecinosContiguos: obtenerVecinosMock,
        asignacionPrevia: {
          id: 'asig-prev-esc',
          seccionId: 'sec-ex-escalada',
          estado: EstadoAsignacion.ESCALADA,
          espacioIds: [],
          horarios: seccion.horarios,
          motivoEscalamiento: '[HORARIO_BLOQUEADO] Todo ocupado anteriormente',
        },
      });

      expect(resultado.estado).toBe(EstadoAsignacion.VIGENTE);
      expect(resultado.espacioIds.length).toBeGreaterThan(0);
      expect(resultado.motivoEscalamiento).toBeUndefined();
    });
  });
});
