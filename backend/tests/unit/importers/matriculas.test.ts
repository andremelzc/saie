import { importarMatriculas } from '../../../src/importers/matriculas.importer';

describe('Importador de Matrículas y Cuentas de Alumno (Issues 1.5 y 1.7)', () => {
  let mockPrisma: any;

  beforeEach(() => {
    mockPrisma = {
      cuenta: {
        upsert: jest.fn().mockResolvedValue({ id: 'cuenta-alumno-123' }),
      },
      alumno: {
        upsert: jest.fn().mockResolvedValue({ id: 'alumno-123', codigo: '22200101' }),
      },
      curso: {
        findUnique: jest.fn().mockResolvedValue({ id: 'curso-123', codigo: '2020101' }),
      },
      seccion: {
        findUnique: jest.fn().mockResolvedValue({ id: 'seccion-123', codigoSeccion: 'S1' }),
      },
      matricula: {
        deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
        upsert: jest.fn().mockResolvedValue({ id: 'matricula-123' }),
      },
    };
  });

  it('debe registrar un alumno, su cuenta y su matrícula conservando el flag de movilidad reducida', async () => {
    const datos = [
      {
        codigoAlumno: '22200101',
        nombre: 'Juan Pérez',
        correo: 'juan.perez@unmsm.edu.pe',
        movilidadReducida: true,
        codigoCurso: '2020101',
        codigoSeccion: 'S1',
        periodo: '2026-1',
        crearCuentaAcceso: true,
      },
    ];

    const resultado = await importarMatriculas(datos, mockPrisma);

    expect(resultado.alumnosProcesados).toBe(1);
    expect(resultado.cuentasCreadas).toBe(1);
    expect(resultado.matriculasProcesadas).toBe(1);
    expect(resultado.errores).toHaveLength(0);

    expect(mockPrisma.cuenta.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({
          usuarioLogin: '22200101',
          rol: 'ALUMNO',
        }),
      }),
    );

    expect(mockPrisma.matricula.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({
          movilidadReducida: true,
        }),
      }),
    );
  });

  it('no debe crear cuenta de acceso si crearCuentaAcceso es false', async () => {
    const datos = [
      {
        codigoAlumno: '22200102',
        nombre: 'Maria Gomez',
        correo: 'maria.gomez@unmsm.edu.pe',
        movilidadReducida: false,
        codigoCurso: '2020101',
        codigoSeccion: 'S1',
        periodo: '2026-1',
        crearCuentaAcceso: false,
      },
    ];

    const resultado = await importarMatriculas(datos, mockPrisma);

    expect(resultado.alumnosProcesados).toBe(1);
    expect(resultado.cuentasCreadas).toBe(0);
    expect(mockPrisma.cuenta.upsert).not.toHaveBeenCalled();
    expect(mockPrisma.alumno.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.not.objectContaining({ cuentaId: expect.anything() }),
      }),
    );
  });

  it('debe registrar error si la fila no cumple el esquema de validación', async () => {
    const datos = [
      {
        codigoAlumno: '', // Invalido
        nombre: 'Sin Codigo',
        correo: 'correo-no-valido',
        codigoCurso: '2020101',
        codigoSeccion: 'S1',
        periodo: '2026-1',
      },
    ];

    const resultado = await importarMatriculas(datos, mockPrisma);

    expect(resultado.alumnosProcesados).toBe(0);
    expect(resultado.errores.length).toBeGreaterThan(0);
    expect(resultado.errores[0]).toContain('Fila 1:');
  });

  it('debe registrar error si el curso especificado no existe', async () => {
    mockPrisma.curso.findUnique.mockResolvedValue(null);

    const datos = [
      {
        codigoAlumno: '22200103',
        nombre: 'Pedro Soto',
        correo: 'pedro@unmsm.edu.pe',
        movilidadReducida: false,
        codigoCurso: 'CURSO_INEXISTENTE',
        codigoSeccion: 'S1',
        periodo: '2026-1',
      },
    ];

    const resultado = await importarMatriculas(datos, mockPrisma);

    expect(resultado.alumnosProcesados).toBe(1);
    expect(resultado.matriculasProcesadas).toBe(0);
    expect(resultado.errores).toContain('Fila 1: No existe el curso CURSO_INEXISTENTE');
  });

  it('debe registrar error si la sección especificada no existe', async () => {
    mockPrisma.seccion.findUnique.mockResolvedValue(null);

    const datos = [
      {
        codigoAlumno: '22200104',
        nombre: 'Lucia Ramirez',
        correo: 'lucia@unmsm.edu.pe',
        movilidadReducida: false,
        codigoCurso: '2020101',
        codigoSeccion: 'SECCION_INEXISTENTE',
        periodo: '2026-1',
      },
    ];

    const resultado = await importarMatriculas(datos, mockPrisma);

    expect(resultado.alumnosProcesados).toBe(1);
    expect(resultado.matriculasProcesadas).toBe(0);
    expect(resultado.errores[0]).toContain('No existe la sección SECCION_INEXISTENTE');
  });

  it('debe capturar y registrar excepciones durante la inserción de matrícula', async () => {
    mockPrisma.matricula.upsert.mockRejectedValue(new Error('Fallo de BD en matricula'));

    const datos = [
      {
        codigoAlumno: '22200105',
        nombre: 'Raul Castro',
        correo: 'raul@unmsm.edu.pe',
        movilidadReducida: false,
        codigoCurso: '2020101',
        codigoSeccion: 'S1',
        periodo: '2026-1',
      },
    ];

    const resultado = await importarMatriculas(datos, mockPrisma);

    expect(resultado.matriculasProcesadas).toBe(0);
    expect(resultado.errores[0]).toContain(
      'Fila 1 (22200105 en 2020101-S1): Fallo de BD en matricula',
    );
  });

  describe('movilidad reducida declarada y periodo (Issues 3.59 y 4.64, riesgos R11 y R49)', () => {
    const fila = (movilidadReducida: boolean, periodo = '2026-1') => ({
      codigoAlumno: '22200101',
      nombre: 'Juan Pérez',
      correo: 'juan.perez@unmsm.edu.pe',
      movilidadReducida,
      codigoCurso: '2020101',
      codigoSeccion: 'S1',
      periodo,
      crearCuentaAcceso: false,
    });

    it('conserva la movilidad reducida que el alumno declaró aunque el CSV diga que no', async () => {
      mockPrisma.alumno.upsert.mockResolvedValue({
        id: 'alumno-123',
        codigo: '22200101',
        fichaMedica: { condicionAccesible: true },
      });

      await importarMatriculas([fila(false)], mockPrisma);

      expect(mockPrisma.matricula.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          update: { movilidadReducida: true },
          create: expect.objectContaining({ movilidadReducida: true }),
        }),
      );
    });

    it('sin declaración en la ficha usa el valor del CSV', async () => {
      mockPrisma.alumno.upsert.mockResolvedValue({
        id: 'alumno-123',
        codigo: '22200101',
        fichaMedica: { condicionAccesible: false },
      });

      await importarMatriculas([fila(false)], mockPrisma);

      expect(mockPrisma.matricula.upsert).toHaveBeenCalledWith(
        expect.objectContaining({ update: { movilidadReducida: false } }),
      );
    });

    it('normaliza un periodo en romanos antes de buscar la sección', async () => {
      await importarMatriculas([fila(false, '2026-II')], mockPrisma);

      expect(mockPrisma.seccion.findUnique).toHaveBeenCalledWith({
        where: {
          cursoId_codigoSeccion_periodo: {
            cursoId: 'curso-123',
            codigoSeccion: 'S1',
            periodo: '2026-2',
          },
        },
      });
    });

    it('rechaza la fila si el periodo no tiene un formato válido', async () => {
      const resultado = await importarMatriculas([fila(false, '2026-III')], mockPrisma);

      expect(resultado.matriculasProcesadas).toBe(0);
      expect(resultado.errores[0]).toContain('El periodo debe tener el formato');
    });
  });

  describe('retiros: las matrículas de la sección quedan como el archivo (Issue 1.17, R35)', () => {
    const fila = (codigoAlumno: string) => ({
      codigoAlumno,
      nombre: 'Alumno',
      correo: `${codigoAlumno}@unmsm.edu.pe`,
      movilidadReducida: false,
      codigoCurso: '2020101',
      codigoSeccion: 'S1',
      periodo: '2026-1',
      crearCuentaAcceso: false,
    });

    it('retira a los alumnos que ya no figuran en la sección del archivo', async () => {
      mockPrisma.alumno.upsert
        .mockResolvedValueOnce({ id: 'al-1', fichaMedica: null })
        .mockResolvedValueOnce({ id: 'al-2', fichaMedica: null });
      mockPrisma.matricula.deleteMany.mockResolvedValue({ count: 3 });

      const r = await importarMatriculas([fila('A1'), fila('A2')], mockPrisma);

      expect(mockPrisma.matricula.deleteMany).toHaveBeenCalledWith({
        where: { seccionId: 'seccion-123', alumnoId: { notIn: ['al-1', 'al-2'] } },
      });
      expect(r.matriculasRetiradas).toBe(3);
    });

    it('no toca las secciones que no aparecen en el archivo', async () => {
      await importarMatriculas([fila('A1')], mockPrisma);

      expect(mockPrisma.matricula.deleteMany).toHaveBeenCalledTimes(1);
      expect(mockPrisma.matricula.deleteMany.mock.calls[0][0].where.seccionId).toBe('seccion-123');
    });

    it('no retira a nadie si alguna fila falló: el archivo no se leyó completo', async () => {
      mockPrisma.matricula.upsert
        .mockResolvedValueOnce({ id: 'm1' })
        .mockRejectedValueOnce(new Error('fallo'));

      const r = await importarMatriculas([fila('A1'), fila('A2')], mockPrisma);

      expect(r.errores).toHaveLength(1);
      expect(mockPrisma.matricula.deleteMany).not.toHaveBeenCalled();
      expect(r.matriculasRetiradas).toBe(0);
    });

    it('informa el avance fila por fila', async () => {
      const avance: [number, number][] = [];
      await importarMatriculas([fila('A1'), fila('A2')], mockPrisma, (h, t) => avance.push([h, t]));
      expect(avance).toEqual([
        [0, 2],
        [1, 2],
        [2, 2],
      ]);
    });
  });
});
