import { DiaSemana, TipoEspacio } from '@prisma/client';
import {
  obtenerOcupacionPorPiso,
  obtenerMapaLectura,
} from '../../../src/services/ocupacion.service';

/* ── helpers ─────────────────────────────────────────────── */

function espacio(
  id: string,
  tipo: TipoEspacio = TipoEspacio.AULA_TEORICA,
  aforo = 30,
  pcs: number | null = null,
) {
  return {
    id,
    identificador: `E-${id}`,
    tipo,
    pabellon: 'A',
    piso: 1,
    aforoNominal: aforo,
    pcsMalogradas: pcs,
    softwareInstalado: [],
  };
}

function asignacion(
  id: string,
  espacioId: string,
  horario: { diaSemana: DiaSemana; horaInicio: string; horaFin: string },
  alumnos = 25,
) {
  return {
    id,
    estado: 'VIGENTE',
    espacios: [{ espacioId }],
    seccion: {
      curso: { codigo: 'C101', nombre: 'Curso 101' },
      docente: { nombre: 'Dra. García' },
      codigoSeccion: '1',
      horarios: [horario],
      _count: { matriculas: alumnos },
    },
  };
}

function alerta(id: string, espacioId: string) {
  return {
    id,
    tipo: 'SOFTWARE',
    espacioId,
    motivo: 'Software faltante',
    estado: 'PENDIENTE',
    fechaDeteccion: new Date(),
  };
}

function dbMock(
  espacios: any[] = [],
  asignaciones: any[] = [],
  alertas: any[] = [],
) {
  return {
    espacio: {
      findMany: jest.fn().mockResolvedValue(espacios),
    },
    asignacion: {
      findMany: jest.fn().mockResolvedValue(asignaciones),
    },
    alerta: {
      findMany: jest.fn().mockResolvedValue(alertas),
    },
  } as any;
}

const FRANJA = {
  diaSemana: DiaSemana.LUNES,
  horaInicio: '08:00',
  horaFin: '10:00',
};

/* ── suite ────────────────────────────────────────────────── */

describe('Mapa de ocupación por piso (Issues 4.11, 4.12)', () => {
  it('marca DISPONIBLE un espacio sin asignación vigente en la franja', async () => {
    const e1 = espacio('e1');
    const db = dbMock([e1], [], []);

    const res = await obtenerOcupacionPorPiso(
      { pabellon: 'A', piso: 1, franja: FRANJA },
      db,
    );

    expect(res.espacios).toHaveLength(1);
    expect(res.espacios[0].estado).toBe('DISPONIBLE');
    expect(res.espacios[0].asignacion).toBeNull();
    expect(res.resumen.disponibles).toBe(1);
    expect(res.resumen.ocupados).toBe(0);
    expect(res.resumen.conAlerta).toBe(0);
  });

  it('marca OCUPADO un espacio con asignación vigente cuyo horario solapa la franja', async () => {
    const e1 = espacio('e1');
    const a1 = asignacion('a1', 'e1', {
      diaSemana: DiaSemana.LUNES,
      horaInicio: '07:00',
      horaFin: '09:00',
    });
    const db = dbMock([e1], [a1], []);

    const res = await obtenerOcupacionPorPiso(
      { pabellon: 'A', piso: 1, franja: FRANJA },
      db,
    );

    expect(res.espacios[0].estado).toBe('OCUPADO');
    expect(res.espacios[0].asignacion).not.toBeNull();
    expect(res.espacios[0].asignacion!.codigoCurso).toBe('C101');
    expect(res.resumen.ocupados).toBe(1);
  });

  it('una clase que termina justo cuando empieza la franja NO cuenta como ocupada', async () => {
    const e1 = espacio('e1');
    const a1 = asignacion('a1', 'e1', {
      diaSemana: DiaSemana.LUNES,
      horaInicio: '06:00',
      horaFin: '08:00', // termina justo al inicio de la franja
    });
    const db = dbMock([e1], [a1], []);

    const res = await obtenerOcupacionPorPiso(
      { pabellon: 'A', piso: 1, franja: FRANJA },
      db,
    );

    expect(res.espacios[0].estado).toBe('DISPONIBLE');
  });

  it('ALERTA_ACTIVA prevalece sobre OCUPADO', async () => {
    const e1 = espacio('e1');
    const a1 = asignacion('a1', 'e1', {
      diaSemana: DiaSemana.LUNES,
      horaInicio: '08:00',
      horaFin: '10:00',
    });
    const al1 = alerta('al1', 'e1');
    const db = dbMock([e1], [a1], [al1]);

    const res = await obtenerOcupacionPorPiso(
      { pabellon: 'A', piso: 1, franja: FRANJA },
      db,
    );

    expect(res.espacios[0].estado).toBe('ALERTA_ACTIVA');
    expect(res.espacios[0].alertas).toHaveLength(1);
  });

  it('calcula la capacidad real de un laboratorio (aforo − PCs malogradas)', async () => {
    const lab = espacio('lab1', TipoEspacio.LABORATORIO, 40, 5);
    const db = dbMock([lab], [], []);

    const res = await obtenerOcupacionPorPiso(
      { pabellon: 'A', piso: 1, franja: FRANJA },
      db,
    );

    expect(res.espacios[0].aforoNominal).toBe(40);
    expect(res.espacios[0].capacidadReal).toBe(35);
  });

  it('capacidad real de un aula teórica es igual al aforo nominal', async () => {
    const aula = espacio('a1', TipoEspacio.AULA_TEORICA, 50);
    const db = dbMock([aula], [], []);

    const res = await obtenerOcupacionPorPiso(
      { pabellon: 'A', piso: 1, franja: FRANJA },
      db,
    );

    expect(res.espacios[0].capacidadReal).toBe(50);
  });

  it('un piso sin espacios devuelve resultado vacío sin consultar asignaciones ni alertas', async () => {
    const db = dbMock([], [], []);

    const res = await obtenerOcupacionPorPiso(
      { pabellon: 'Z', piso: 99, franja: FRANJA },
      db,
    );

    expect(res.espacios).toHaveLength(0);
    expect(res.resumen).toEqual({ disponibles: 0, ocupados: 0, conAlerta: 0 });
    // No debe consultar asignaciones ni alertas si no hay espacios
    expect(db.asignacion.findMany).not.toHaveBeenCalled();
    expect(db.alerta.findMany).not.toHaveBeenCalled();
  });

  it('devuelve pabellón, piso y franja consultados en la respuesta', async () => {
    const db = dbMock([], [], []);
    const res = await obtenerOcupacionPorPiso(
      { pabellon: 'B', piso: 2, franja: FRANJA },
      db,
    );
    expect(res.pabellon).toBe('B');
    expect(res.piso).toBe(2);
    expect(res.franja).toEqual(FRANJA);
  });

  it('un espacio con una asignación cuyo horario es en otro día queda DISPONIBLE', async () => {
    const e1 = espacio('e1');
    const a1 = asignacion('a1', 'e1', {
      diaSemana: DiaSemana.MARTES, // otro día
      horaInicio: '08:00',
      horaFin: '10:00',
    });
    const db = dbMock([e1], [a1], []);

    const res = await obtenerOcupacionPorPiso(
      { pabellon: 'A', piso: 1, franja: FRANJA },
      db,
    );

    expect(res.espacios[0].estado).toBe('DISPONIBLE');
  });
});

describe('Mapa de solo lectura del alumno (Issue 3.13)', () => {
  it('no expone alertas, docentes ni cursos; un espacio con alerta se muestra según su asignación', async () => {
    const e1 = espacio('e1');
    const a1 = asignacion('a1', 'e1', {
      diaSemana: DiaSemana.LUNES,
      horaInicio: '08:00',
      horaFin: '10:00',
    });
    const al1 = alerta('al1', 'e1');
    const db = dbMock([e1], [a1], [al1]);

    const res = await obtenerMapaLectura(
      { pabellon: 'A', piso: 1, franja: FRANJA },
      db,
    );

    expect(res.espacios).toHaveLength(1);
    // ALERTA_ACTIVA en el panel, pero el alumno ve OCUPADO porque tiene asignación
    expect(res.espacios[0].estado).toBe('OCUPADO');
    // No tiene campos de detalle (alertas, asignacion, etc.)
    expect(res.espacios[0]).not.toHaveProperty('alertas');
    expect(res.espacios[0]).not.toHaveProperty('asignacion');
    expect(res.espacios[0]).not.toHaveProperty('aforoNominal');
  });

  it('un espacio disponible sigue apareciendo como DISPONIBLE para el alumno', async () => {
    const e1 = espacio('e1');
    const db = dbMock([e1], [], []);

    const res = await obtenerMapaLectura(
      { pabellon: 'A', piso: 1, franja: FRANJA },
      db,
    );

    expect(res.espacios[0].estado).toBe('DISPONIBLE');
  });

  it('un espacio con alerta pero sin asignación muestra DISPONIBLE al alumno', async () => {
    const e1 = espacio('e1');
    const al1 = alerta('al1', 'e1');
    const db = dbMock([e1], [], [al1]);

    const res = await obtenerMapaLectura(
      { pabellon: 'A', piso: 1, franja: FRANJA },
      db,
    );

    // Sin asignación -> DISPONIBLE incluso con alerta (el alumno no ve alertas)
    expect(res.espacios[0].estado).toBe('DISPONIBLE');
  });
});
