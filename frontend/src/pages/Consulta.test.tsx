import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { Consulta } from './Consulta';
import api from '../services/api';
import type {
  AsignacionConsultaItemDTO,
  ConsultaAlumnoResponseDTO,
  ConsultaCursoResponseDTO,
} from '../types/consulta';

vi.mock('../services/api', () => ({
  default: {
    get: vi.fn(),
  },
  api: {
    get: vi.fn(),
  },
}));

const aula: AsignacionConsultaItemDTO = {
  asignacionId: 'a1',
  codigoCurso: 'CC-101',
  nombreCurso: 'Fundamentos de Programación',
  codigoSeccion: 'S1',
  periodo: '2026-2',
  docenteNombre: 'Docente de Ejemplo',
  horarios: [{ diaSemana: 'LUNES', horaInicio: '08:00', horaFin: '10:00' }],
  espacios: [
    {
      id: 'e1',
      identificador: 'NUE-101',
      tipo: 'AULA_TEORICA',
      pabellon: 'Pabellón Nuevo',
      piso: 1,
    },
  ],
  estadoAsignacion: 'VIGENTE',
};

const laboratorio: AsignacionConsultaItemDTO = {
  ...aula,
  asignacionId: 'a2',
  codigoCurso: 'SI-201',
  nombreCurso: 'Bases de Datos',
  espacios: [
    {
      id: 'e2',
      identificador: 'LAB-203',
      tipo: 'LABORATORIO',
      pabellon: 'Pabellón Nuevo',
      piso: 2,
    },
  ],
};

const datosAlumno = (asignaciones: AsignacionConsultaItemDTO[]): ConsultaAlumnoResponseDTO => ({
  alumno: {
    codigo: '20200001',
    nombre: 'Alumno de Ejemplo',
    correo: 'alumno@ejemplo.edu',
    movilidadReducida: false,
  },
  asignaciones,
});

const datosCurso = (conSecciones: boolean): ConsultaCursoResponseDTO => ({
  curso: { codigo: 'CC-101', nombre: 'Fundamentos de Programación' },
  secciones: conSecciones
    ? [
        {
          seccionId: 's1',
          codigoSeccion: 'S1',
          periodo: '2026-2',
          docenteNombre: 'Docente de Ejemplo',
          horarios: aula.horarios,
          espacios: aula.espacios,
          estadoAsignacion: 'VIGENTE',
        },
        {
          seccionId: 's2',
          codigoSeccion: 'S2',
          periodo: '2026-2',
          docenteNombre: null,
          horarios: aula.horarios,
          espacios: laboratorio.espacios,
          estadoAsignacion: 'VIGENTE',
        },
      ]
    : [],
});

function renderizar() {
  return render(
    <MemoryRouter>
      <Consulta />
    </MemoryRouter>,
  );
}

function buscar(codigo: string) {
  fireEvent.change(screen.getByLabelText(/Código de alumno o curso/i), {
    target: { value: codigo },
  });
  fireEvent.click(screen.getByRole('button', { name: /buscar/i }));
}

describe('Consulta (Issue #136 / 3.7)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('muestra el encabezado, el formulario y el enlace para volver al inicio', () => {
    renderizar();

    expect(screen.getByRole('heading', { name: 'Consulta de espacios' })).toBeInTheDocument();
    expect(screen.getByLabelText(/Código de alumno o curso/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Volver al inicio/i })).toHaveAttribute('href', '/');
    expect(screen.queryByText('Sin resultados encontrados')).not.toBeInTheDocument();
  });

  it('flujo completo con un código de alumno: lista una tarjeta por clase', async () => {
    vi.mocked(api.get).mockResolvedValueOnce({
      data: { success: true, data: datosAlumno([aula, laboratorio]) },
    });
    renderizar();

    buscar('20200001');

    expect(await screen.findByText('Fundamentos de Programación')).toBeInTheDocument();
    expect(screen.getByText('Bases de Datos')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Tus clases' })).toBeInTheDocument();
    expect(screen.getByText(/2 clases encontradas para el código 20200001/i)).toBeInTheDocument();
    expect(api.get).toHaveBeenCalledWith('/v1/consulta/alumno/20200001');
    // No se muestran datos personales que la consulta no necesita
    expect(screen.queryByText(/alumno@ejemplo\.edu/i)).not.toBeInTheDocument();
  });

  it('agrupa en un solo bloque las secciones del mismo curso', async () => {
    const laboratorioDelMismoCurso: AsignacionConsultaItemDTO = {
      ...laboratorio,
      asignacionId: 'a3',
      codigoCurso: 'CC-101',
      nombreCurso: 'Fundamentos de Programación',
      codigoSeccion: 'S1-LAB',
    };
    vi.mocked(api.get).mockResolvedValueOnce({
      data: { success: true, data: datosAlumno([aula, laboratorioDelMismoCurso]) },
    });
    renderizar();

    buscar('20200001');

    // El bloque es el curso, no la sección: un solo grupo con sus dos secciones.
    const bloque = await screen.findByRole('region', { name: 'Curso Fundamentos de Programación' });
    expect(within(bloque).getByText('CC-101 · 2 secciones')).toBeVisible();
    expect(within(bloque).getByText('Sección S1')).toBeVisible();
    expect(within(bloque).getByText('Sección S1-LAB')).toBeVisible();
    expect(
      screen.getByText('1 curso · 2 clases encontradas para el código 20200001.'),
    ).toBeVisible();
  });

  it('flujo completo con un código de curso: lista una tarjeta por sección', async () => {
    vi.mocked(api.get).mockResolvedValueOnce({
      data: { success: true, data: datosCurso(true) },
    });
    renderizar();

    buscar('cc-101');

    expect(
      await screen.findByRole('heading', { name: /CC-101 · Fundamentos de Programación/i }),
    ).toBeInTheDocument();
    expect(screen.getByText(/2 secciones encontradas/i)).toBeInTheDocument();
    expect(
      screen.getByLabelText('Resultado de consulta para CC-101 sección S1'),
    ).toBeInTheDocument();
    expect(
      screen.getByLabelText('Resultado de consulta para CC-101 sección S2'),
    ).toBeInTheDocument();
    expect(api.get).toHaveBeenCalledWith('/v1/consulta/curso/CC-101');
  });

  it('un alumno sin clases asignadas muestra el estado "sin resultado"', async () => {
    vi.mocked(api.get).mockResolvedValueOnce({
      data: { success: true, data: datosAlumno([]) },
    });
    renderizar();

    buscar('20200001');

    expect(await screen.findByText('Sin resultados encontrados')).toBeInTheDocument();
    expect(screen.getByText(/20200001 no tiene clases asignadas/i)).toBeInTheDocument();
  });

  it('un curso sin secciones muestra el estado "sin resultado"', async () => {
    vi.mocked(api.get).mockResolvedValueOnce({
      data: { success: true, data: datosCurso(false) },
    });
    renderizar();

    buscar('CC-101');

    expect(await screen.findByText('Sin resultados encontrados')).toBeInTheDocument();
    expect(screen.getByText(/curso CC-101 no tiene secciones/i)).toBeInTheDocument();
  });

  it('un código inexistente (404) muestra "sin resultado" con el mensaje del servidor', async () => {
    vi.mocked(api.get).mockRejectedValueOnce({
      response: {
        status: 404,
        data: {
          success: false,
          message: 'No se encontró ningún estudiante con el código 20209999',
        },
      },
    });
    renderizar();

    buscar('20209999');

    expect(await screen.findByText('Sin resultados encontrados')).toBeInTheDocument();
    expect(
      screen.getAllByText('No se encontró ningún estudiante con el código 20209999').length,
    ).toBeGreaterThan(0);
    // Jerarquía de encabezados correcta (h1 → h2 → h3), sin saltos de nivel
    expect(
      screen.getByRole('heading', { level: 2, name: 'Resultado de la consulta' }),
    ).toBeInTheDocument();
  });

  it('ante un error de red avisa que no hay conexión y no muestra resultados', async () => {
    vi.mocked(api.get).mockRejectedValueOnce(new Error('Network Error'));
    renderizar();

    buscar('20200001');

    // El error se muestra una sola vez, en la tarjeta de abajo, y no se repite bajo el campo.
    const alerta = await screen.findByRole('alert', { name: /Error de consulta/i });
    expect(alerta).toHaveTextContent(/No se pudo completar la consulta/i);
    expect(alerta).toHaveTextContent(/No se pudo conectar/i);
    expect(screen.getAllByRole('alert')).toHaveLength(1);
    expect(screen.queryByText('Sin resultados encontrados')).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Tus clases' })).not.toBeInTheDocument();
  });

  it('muestra un estado de carga mientras espera la respuesta', async () => {
    let resolver: (valor: unknown) => void = () => {};
    vi.mocked(api.get).mockReturnValueOnce(
      new Promise((resolve) => {
        resolver = resolve;
      }) as never,
    );
    renderizar();

    buscar('20200001');

    expect(
      await screen.findByRole('status', { name: /Consultando espacios/i }),
    ).toBeInTheDocument();

    resolver({ data: { success: true, data: datosAlumno([aula]) } });

    expect(await screen.findByText('Fundamentos de Programación')).toBeInTheDocument();
    expect(screen.queryByRole('status', { name: /Consultando espacios/i })).not.toBeInTheDocument();
  });

  it('una nueva consulta quita el resultado anterior mientras carga', async () => {
    vi.mocked(api.get).mockResolvedValueOnce({
      data: { success: true, data: datosAlumno([aula]) },
    });
    renderizar();
    buscar('20200001');
    expect(await screen.findByText('Fundamentos de Programación')).toBeInTheDocument();

    vi.mocked(api.get).mockReturnValueOnce(new Promise(() => {}) as never);
    buscar('SI-201');

    await waitFor(() => {
      expect(screen.queryByText('Fundamentos de Programación')).not.toBeInTheDocument();
    });
    expect(screen.getByRole('status', { name: /Consultando espacios/i })).toBeInTheDocument();
  });

  it('muestra qué trae el resultado antes de buscar y lo oculta después', async () => {
    vi.mocked(api.get).mockResolvedValueOnce({
      data: { success: true, data: datosAlumno([aula]) },
    });
    renderizar();

    expect(screen.getByRole('heading', { name: 'Qué verás en tu consulta' })).toBeInTheDocument();

    buscar('20200001');

    expect(await screen.findByRole('heading', { name: 'Tus clases' })).toBeInTheDocument();
    expect(
      screen.queryByRole('heading', { name: 'Qué verás en tu consulta' }),
    ).not.toBeInTheDocument();
  });

  it('al editar el campo quita el aviso de la búsqueda anterior', async () => {
    vi.mocked(api.get).mockRejectedValueOnce(new Error('Network Error'));
    renderizar();

    buscar('20200001');
    expect(await screen.findByRole('alert', { name: /Error de consulta/i })).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(/Código de alumno o curso/i), {
      target: { value: '2020' },
    });

    expect(screen.queryByRole('alert', { name: /Error de consulta/i })).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Qué verás en tu consulta' })).toBeInTheDocument();
  });

  it('al editar el campo conserva las clases que la persona está leyendo', async () => {
    vi.mocked(api.get).mockResolvedValueOnce({
      data: { success: true, data: datosAlumno([aula]) },
    });
    renderizar();

    buscar('20200001');
    expect(await screen.findByRole('heading', { name: 'Tus clases' })).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(/Código de alumno o curso/i), {
      target: { value: '2020000' },
    });

    expect(screen.getByRole('heading', { name: 'Tus clases' })).toBeInTheDocument();
  });
});
