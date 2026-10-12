import { listarSeccionesEscaladas } from '../../../src/services/revision.service';

/* ── helpers ─────────────────────────────────────────────── */

function asignacionEscalada(id: string, periodo: string, fecha: string) {
  return {
    id,
    estado: 'ESCALADA',
    fechaAsignacion: new Date(fecha),
    motivoEscalamiento: 'Sin espacios disponibles',
    seccion: {
      id: `sec-${id}`,
      codigoSeccion: '1',
      periodo,
      tipoEspacioRequerido: 'LABORATORIO',
      stackSoftwareRequerido: ['Docker'],
      curso: { codigo: 'ISW101', nombre: 'Programación' },
      docente: { nombre: 'Dra. García' },
      horarios: [{ diaSemana: 'LUNES', horaInicio: '08:00', horaFin: '10:00' }],
      _count: { matriculas: 30 },
    },
  };
}

function dbMock(asignaciones: any[] = [], periodoVigente: string | null = '2026-1') {
  return {
    asignacion: {
      findMany: jest.fn().mockResolvedValue(asignaciones),
    },
    seccion: {
      findFirst: jest.fn().mockResolvedValue(periodoVigente ? { periodo: periodoVigente } : null),
    },
  } as any;
}

/* ── suite ────────────────────────────────────────────────── */

describe('Secciones escaladas (Issue 4.22)', () => {
  it('lista solo asignaciones ESCALADAS del periodo vigente, las más antiguas primero', async () => {
    const a1 = asignacionEscalada('a1', '2026-1', '2026-09-01');
    const a2 = asignacionEscalada('a2', '2026-1', '2026-09-05');
    const db = dbMock([a1, a2]);

    const res = await listarSeccionesEscaladas(undefined, db);

    expect(res.periodo).toBe('2026-1');
    expect(res.total).toBe(2);
    expect(res.secciones).toHaveLength(2);
    expect(res.secciones[0].asignacionId).toBe('a1');
    expect(res.secciones[1].asignacionId).toBe('a2');
  });

  it('filtra por periodo del asignación vigente y consulta solo ESCALADA', async () => {
    const db = dbMock([]);
    await listarSeccionesEscaladas(undefined, db);

    expect(db.asignacion.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ estado: 'ESCALADA', seccion: { periodo: '2026-1' } }),
        orderBy: { fechaAsignacion: 'asc' },
      }),
    );
  });

  it('permite consultar un periodo específico en vez del vigente', async () => {
    const db = dbMock([]);
    await listarSeccionesEscaladas('2025-2', db);

    expect(db.asignacion.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ seccion: { periodo: '2025-2' } }),
      }),
    );
  });

  it('devuelve objeto vacío si no hay periodo vigente y no se indica uno', async () => {
    const db = dbMock([], null);

    const res = await listarSeccionesEscaladas(undefined, db);

    expect(res).toEqual({ periodo: null, total: 0, secciones: [] });
    expect(db.asignacion.findMany).not.toHaveBeenCalled();
  });

  it('mapea correctamente los campos de la sección', async () => {
    const a = asignacionEscalada('a1', '2026-1', '2026-09-10');
    const db = dbMock([a]);

    const res = await listarSeccionesEscaladas(undefined, db);
    const sec = res.secciones[0].seccion;

    expect(sec.codigoCurso).toBe('ISW101');
    expect(sec.nombreCurso).toBe('Programación');
    expect(sec.docenteNombre).toBe('Dra. García');
    expect(sec.tipoEspacioRequerido).toBe('LABORATORIO');
    expect(sec.stackSoftwareRequerido).toEqual(['Docker']);
    expect(sec.alumnosMatriculados).toBe(30);
    expect(sec.horarios).toHaveLength(1);
  });
});
