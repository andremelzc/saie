import { DiaSemana, EstadoAsignacion, TipoEspacio } from '@prisma/client';
import { EspacioConexo } from '../../../src/rules/buscarBloqueContiguo';
import { ejecutarCorridaBatch } from '../../../src/rules/corridaBatch';
import { SeccionInputMotor } from '../../../src/types/asignacion';

describe('Corrida Batch de Asignación (Issue 2.11)', () => {
  const espaciosMock: EspacioConexo[] = [
    {
      id: 'aula-101',
      identificador: 'Aula 101',
      pabellon: 'Pab-A',
      piso: 1,
      tipo: TipoEspacio.AULA_TEORICA,
      aforoNominal: 30,
      pcsMalogradas: null,
    },
    {
      id: 'aula-102',
      identificador: 'Aula 102',
      pabellon: 'Pab-A',
      piso: 1,
      tipo: TipoEspacio.AULA_TEORICA,
      aforoNominal: 30,
      pcsMalogradas: null,
    },
    {
      id: 'aula-201',
      identificador: 'Aula 201',
      pabellon: 'Pab-A',
      piso: 2,
      tipo: TipoEspacio.AULA_TEORICA,
      aforoNominal: 30,
      pcsMalogradas: null,
    },
    {
      id: 'lab-101',
      identificador: 'Lab 101',
      pabellon: 'Pab-A',
      piso: 1,
      tipo: TipoEspacio.LABORATORIO,
      aforoNominal: 25,
      pcsMalogradas: 0,
      softwareInstalado: ['Python 3.12'],
    },
  ];

  const obtenerVecinosMock = (id: string): string[] => {
    if (id === 'aula-101') return ['aula-102'];
    if (id === 'aula-102') return ['aula-101'];
    return [];
  };

  it('debe procesar un lote completo de secciones asignando espacios sin colisión', () => {
    const secciones: SeccionInputMotor[] = [
      {
        id: 'sec-1',
        cursoId: 'cur-1',
        codigoSeccion: 'SEC-1',
        periodo: '2026-1',
        tipoEspacioRequerido: TipoEspacio.AULA_TEORICA,
        alumnosMatriculados: 25,
        horarios: [{ diaSemana: DiaSemana.LUNES, horaInicio: '08:00', horaFin: '10:00' }],
      },
      {
        id: 'sec-2',
        cursoId: 'cur-1',
        codigoSeccion: 'SEC-2',
        periodo: '2026-1',
        tipoEspacioRequerido: TipoEspacio.AULA_TEORICA,
        alumnosMatriculados: 25,
        horarios: [{ diaSemana: DiaSemana.LUNES, horaInicio: '08:00', horaFin: '10:00' }], // Mismo horario
      },
    ];

    const resultado = ejecutarCorridaBatch({
      periodo: '2026-1',
      secciones,
      todosLosEspacios: espaciosMock,
      obtenerVecinosContiguos: obtenerVecinosMock,
    });

    expect(resultado.totalSecciones).toBe(2);
    expect(resultado.asignadas).toBe(2);
    expect(resultado.escaladas).toBe(0);

    const asignacion1 = resultado.resultados.find((r) => r.seccionId === 'sec-1');
    const asignacion2 = resultado.resultados.find((r) => r.seccionId === 'sec-2');

    expect(asignacion1?.estado).toBe(EstadoAsignacion.VIGENTE);
    expect(asignacion2?.estado).toBe(EstadoAsignacion.VIGENTE);

    // No deben compartir el mismo espacio en el mismo horario
    expect(asignacion1?.espacioIds[0]).not.toEqual(asignacion2?.espacioIds[0]);
  });

  it('debe priorizar secciones con movilidad reducida antes que las demás en el batch', () => {
    const secciones: SeccionInputMotor[] = [
      {
        id: 'sec-normal',
        cursoId: 'cur-1',
        codigoSeccion: 'SEC-1',
        periodo: '2026-1',
        tipoEspacioRequerido: TipoEspacio.AULA_TEORICA,
        alumnosMatriculados: 25,
        movilidadReducida: false,
        horarios: [{ diaSemana: DiaSemana.MARTES, horaInicio: '08:00', horaFin: '10:00' }],
      },
      {
        id: 'sec-movilidad',
        cursoId: 'cur-2',
        codigoSeccion: 'SEC-2',
        periodo: '2026-1',
        tipoEspacioRequerido: TipoEspacio.AULA_TEORICA,
        alumnosMatriculados: 25,
        movilidadReducida: true,
        horarios: [{ diaSemana: DiaSemana.MARTES, horaInicio: '08:00', horaFin: '10:00' }],
      },
    ];

    const resultado = ejecutarCorridaBatch({
      periodo: '2026-1',
      secciones,
      todosLosEspacios: espaciosMock,
      obtenerVecinosContiguos: obtenerVecinosMock,
    });

    const asignacionMov = resultado.resultados.find((r) => r.seccionId === 'sec-movilidad');
    expect(asignacionMov?.estado).toBe(EstadoAsignacion.VIGENTE);
    expect(asignacionMov?.bloqueAsignado?.piso).toBe(1);
  });

  it('debe escalar secciones cuando se agota la capacidad disponible en la franja', () => {
    // 4 secciones compitiendo por 3 aulas en el mismo horario
    const secciones: SeccionInputMotor[] = [1, 2, 3, 4].map((i) => ({
      id: `sec-${i}`,
      cursoId: 'cur-1',
      codigoSeccion: `SEC-${i}`,
      periodo: '2026-1',
      tipoEspacioRequerido: TipoEspacio.AULA_TEORICA,
      alumnosMatriculados: 25,
      horarios: [{ diaSemana: DiaSemana.MIERCOLES, horaInicio: '08:00', horaFin: '10:00' }],
    }));

    const resultado = ejecutarCorridaBatch({
      periodo: '2026-1',
      secciones,
      todosLosEspacios: espaciosMock,
      obtenerVecinosContiguos: obtenerVecinosMock,
    });

    expect(resultado.totalSecciones).toBe(4);
    expect(resultado.asignadas).toBe(3);
    expect(resultado.escaladas).toBe(1);

    const escalada = resultado.resultados.find((r) => r.estado === EstadoAsignacion.ESCALADA);
    expect(escalada).toBeDefined();
    expect(escalada?.motivoEscalamiento).toBeDefined();
  });

  it('debe garantizar idempotencia total en re-ejecuciones sin cambios', () => {
    const secciones: SeccionInputMotor[] = [
      {
        id: 'sec-1',
        cursoId: 'cur-1',
        codigoSeccion: 'SEC-1',
        periodo: '2026-1',
        tipoEspacioRequerido: TipoEspacio.AULA_TEORICA,
        alumnosMatriculados: 25,
        horarios: [{ diaSemana: DiaSemana.JUEVES, horaInicio: '08:00', horaFin: '10:00' }],
      },
    ];

    // Primera corrida
    const corrida1 = ejecutarCorridaBatch({
      periodo: '2026-1',
      secciones,
      todosLosEspacios: espaciosMock,
      obtenerVecinosContiguos: obtenerVecinosMock,
    });

    expect(corrida1.asignadas).toBe(1);
    expect(corrida1.conservadas).toBe(0);

    // Segunda corrida con asignaciones previas
    const previas = corrida1.resultados.map((r) => ({
      id: 'asig-1',
      seccionId: r.seccionId,
      estado: r.estado,
      espacioIds: r.espacioIds,
      horarios: secciones[0].horarios,
      huellaEntrada: r.huellaEntrada,
    }));

    const corrida2 = ejecutarCorridaBatch({
      periodo: '2026-1',
      secciones,
      todosLosEspacios: espaciosMock,
      obtenerVecinosContiguos: obtenerVecinosMock,
      asignacionesPrevias: previas,
    });

    expect(corrida2.asignadas).toBe(1);
    expect(corrida2.conservadas).toBe(1);
    expect(corrida2.resultados[0].conservadaPorIdempotencia).toBe(true);
  });

  it('debe entregar un resumen desglosado por tipo de espacio (AULA_TEORICA vs LABORATORIO)', () => {
    const secciones: SeccionInputMotor[] = [
      {
        id: 'sec-aula',
        cursoId: 'cur-1',
        codigoSeccion: 'SEC-AULA',
        periodo: '2026-1',
        tipoEspacioRequerido: TipoEspacio.AULA_TEORICA,
        alumnosMatriculados: 25,
        horarios: [{ diaSemana: DiaSemana.LUNES, horaInicio: '08:00', horaFin: '10:00' }],
      },
      {
        id: 'sec-lab',
        cursoId: 'cur-2',
        codigoSeccion: 'SEC-LAB',
        periodo: '2026-1',
        tipoEspacioRequerido: TipoEspacio.LABORATORIO,
        stackSoftwareRequerido: ['Python 3.12'],
        alumnosMatriculados: 20,
        horarios: [{ diaSemana: DiaSemana.LUNES, horaInicio: '08:00', horaFin: '10:00' }],
      },
    ];

    const resultado = ejecutarCorridaBatch({
      periodo: '2026-1',
      secciones,
      todosLosEspacios: espaciosMock,
      obtenerVecinosContiguos: obtenerVecinosMock,
    });

    expect(resultado.desglosePorTipoEspacio).toBeDefined();
    expect(resultado.desglosePorTipoEspacio[TipoEspacio.AULA_TEORICA].total).toBe(1);
    expect(resultado.desglosePorTipoEspacio[TipoEspacio.AULA_TEORICA].asignadas).toBe(1);
    expect(resultado.desglosePorTipoEspacio[TipoEspacio.LABORATORIO].total).toBe(1);
    expect(resultado.desglosePorTipoEspacio[TipoEspacio.LABORATORIO].asignadas).toBe(1);
  });

  it('no debe duplicar secciones ESCALADAS en corridas repetidas con los mismos datos', () => {
    const seccionImposible: SeccionInputMotor = {
      id: 'sec-imposible',
      cursoId: 'cur-1',
      codigoSeccion: 'SEC-IMP',
      periodo: '2026-1',
      tipoEspacioRequerido: TipoEspacio.LABORATORIO,
      stackSoftwareRequerido: ['SoftwareInexistenteXYZ'],
      alumnosMatriculados: 20,
      horarios: [{ diaSemana: DiaSemana.VIERNES, horaInicio: '08:00', horaFin: '10:00' }],
    };

    // Primera corrida: escala
    const corrida1 = ejecutarCorridaBatch({
      periodo: '2026-1',
      secciones: [seccionImposible],
      todosLosEspacios: espaciosMock,
      obtenerVecinosContiguos: obtenerVecinosMock,
    });

    expect(corrida1.escaladas).toBe(1);
    expect(corrida1.conservadas).toBe(0);

    // Segunda corrida con asignación previa ESCALADA
    const previas = corrida1.resultados.map((r) => ({
      id: 'asig-esc-1',
      seccionId: r.seccionId,
      estado: r.estado,
      espacioIds: [],
      horarios: seccionImposible.horarios,
      huellaEntrada: r.huellaEntrada,
      motivoEscalamiento: r.motivoEscalamiento,
    }));

    const corrida2 = ejecutarCorridaBatch({
      periodo: '2026-1',
      secciones: [seccionImposible],
      todosLosEspacios: espaciosMock,
      obtenerVecinosContiguos: obtenerVecinosMock,
      asignacionesPrevias: previas,
    });

    expect(corrida2.escaladas).toBe(1);
    expect(corrida2.conservadas).toBe(1);
    expect(corrida2.resultados[0].conservadaPorIdempotencia).toBe(true);
  });

  it('debe manejar caso borde de periodo sin secciones retornando estructura limpia', () => {
    const resultado = ejecutarCorridaBatch({
      periodo: '2026-1',
      secciones: [],
      todosLosEspacios: espaciosMock,
      obtenerVecinosContiguos: obtenerVecinosMock,
    });

    expect(resultado.totalSecciones).toBe(0);
    expect(resultado.asignadas).toBe(0);
    expect(resultado.escaladas).toBe(0);
    expect(resultado.conservadas).toBe(0);
    expect(resultado.desglosePorTipoEspacio[TipoEspacio.AULA_TEORICA].total).toBe(0);
    expect(resultado.desglosePorTipoEspacio[TipoEspacio.LABORATORIO].total).toBe(0);
  });
});
