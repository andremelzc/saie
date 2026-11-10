import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import RutaAlumnoPage from './RutaAlumnoPage';
import { vaciarCacheCarga } from '../hooks/useCarga';
import { obtenerCursos, obtenerRuta } from '../services/estudiante';

vi.mock('../context/useAuth', () => ({
  useAuth: () => ({ sesion: { rol: 'ALUMNO' } }),
}));

vi.mock('../components/auth/BotonCerrarSesion', () => ({
  default: () => <button type="button">Cerrar sesión</button>,
}));

vi.mock('../services/estudiante', async (importar) => ({
  ...(await importar<typeof import('../services/estudiante')>()),
  obtenerCursos: vi.fn(),
  obtenerRuta: vi.fn(),
}));

interface EspacioBd {
  id: string;
  identificador: string;
  tipo: string;
  pabellon: string;
  piso: number;
}

const espacio = (
  identificador: string,
  pabellon: string,
  piso: number,
  tipo = 'AULA_TEORICA',
): EspacioBd => ({ id: `uuid-${pabellon}-${identificador}`, identificador, tipo, pabellon, piso });

const curso = (asignacionId: string | null, nombre: string, espacios: EspacioBd[]) => ({
  asignacionId,
  codigoCurso: 'X',
  nombreCurso: nombre,
  codigoSeccion: '1',
  periodo: '2026-2',
  docenteNombre: null,
  horarios: [],
  estadoAsignacion: 'VIGENTE',
  espacios,
  proximaSesion: null,
});

/** Ruta como la entrega el backend: el espacio se identifica por UUID, pabellón e identificador. */
const rutaDe = (esp: EspacioBd, asignacionId: string) => ({
  asignacionId,
  estado: 'DISPONIBLE',
  pabellon: esp.pabellon,
  pisoDestino: esp.piso,
  tiempoEstimadoTotalSegundos: 135,
  movilidadReducida: false,
  tramos: [
    {
      orden: 1,
      tipo: 'ENTRADA_PABELLON',
      titulo: 'Acceso Principal',
      descripcion: 'Entra.',
      tiempoEstimadoSegundos: 45,
      esAccesible: true,
      pabellon: esp.pabellon,
      piso: 1,
    },
    {
      orden: 2,
      tipo: 'ESPACIO_ASIGNADO',
      titulo: `Aula: ${esp.identificador}`,
      descripcion: 'Camina.',
      tiempoEstimadoSegundos: 30,
      esAccesible: true,
      espacioId: esp.id,
      identificador: esp.identificador,
      pabellon: esp.pabellon,
      piso: esp.piso,
    },
  ],
});

const LAB = espacio('Aula 104 - Laboratorio 08', 'Antiguo Pabellón', 1, 'LABORATORIO');
const AULA = espacio('Aula 204', 'Nuevo Pabellón', 2);

const montar = () =>
  render(
    <MemoryRouter>
      <RutaAlumnoPage />
    </MemoryRouter>,
  );

describe('RutaAlumnoPage', () => {
  beforeEach(() => {
    vaciarCacheCarga();
    vi.mocked(obtenerCursos).mockReset();
    vi.mocked(obtenerRuta).mockReset();
    vi.mocked(obtenerRuta).mockImplementation((async (id: string) =>
      rutaDe(id === 'asig-lab' ? LAB : AULA, id)) as never);
  });

  it('pide la ruta de la primera clase con aula y la dibuja sobre el plano', async () => {
    vi.mocked(obtenerCursos).mockResolvedValue({
      periodo: '2026-2',
      cursos: [curso(null, 'Sin aula', []), curso('asig-lab', 'Redes', [LAB])] as never,
    });
    montar();

    expect(await screen.findByText('Tiempo estimado de caminata')).toBeVisible();
    expect(vi.mocked(obtenerRuta)).toHaveBeenCalledWith('asig-lab');
    expect(screen.getByRole('heading', { name: 'Ruta hacia mi aula' })).toBeVisible();
    // El espacio vino como UUID: el enlace lo traduce y el recorrido sí se dibuja.
    expect(screen.queryByText('Ruta no disponible')).toBeNull();
    expect(screen.getByRole('group', { name: /Plano del piso 1/ })).toBeVisible();
    expect(screen.queryByText(/datos de ejemplo/i)).toBeNull();
    expect(screen.queryByRole('option', { name: /Sin aula/ })).toBeNull();
  });

  it('al cambiar de clase pide la ruta de esa asignación', async () => {
    vi.mocked(obtenerCursos).mockResolvedValue({
      periodo: '2026-2',
      cursos: [curso('asig-lab', 'Redes', [LAB]), curso('asig-aula', 'Cálculo', [AULA])] as never,
    });
    montar();
    await screen.findByText('Tiempo estimado de caminata');

    fireEvent.click(screen.getByRole('radio', { name: /Cálculo/ }));

    expect(await screen.findByRole('group', { name: /Plano del piso 1/ })).toBeVisible();
    expect(vi.mocked(obtenerRuta)).toHaveBeenLastCalledWith('asig-aula');
  });

  /** Elige «otro lugar» y lo busca por su nombre, como lo haría una persona. */
  const partirDe = (busqueda: string, opcion: RegExp | string) => {
    fireEvent.click(screen.getByRole('button', { name: 'Otro lugar' }));
    const campo = screen.getByRole('combobox', { name: 'Busca el aula o lugar donde estás' });
    fireEvent.change(campo, { target: { value: busqueda } });
    fireEvent.mouseDown(screen.getByRole('option', { name: opcion }));
  };

  it('pregunta primero dónde estás y parte de la entrada principal por defecto', async () => {
    vi.mocked(obtenerCursos).mockResolvedValue({
      periodo: '2026-2',
      cursos: [curso('asig-aula', 'Cálculo', [AULA])] as never,
    });
    montar();
    await screen.findByRole('group', { name: /Plano del piso 1/ });

    const desde = screen.getByRole('group', { name: '¿Dónde estás?' });
    expect(within(desde).getByRole('button', { name: 'Entrada principal' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    // «Otro lugar» se busca por nombre: no hay una lista de más de cincuenta espacios a la vista.
    expect(within(desde).queryByRole('combobox')).toBeNull();
    expect(screen.getByText('Entras por la entrada principal')).toBeInTheDocument();
  });

  it('«otro lugar» se busca por nombre y no ofrece la puerta del patio', async () => {
    vi.mocked(obtenerCursos).mockResolvedValue({
      periodo: '2026-2',
      cursos: [curso('asig-aula', 'Cálculo', [AULA])] as never,
    });
    montar();
    await screen.findByRole('group', { name: /Plano del piso 1/ });

    fireEvent.click(screen.getByRole('button', { name: 'Otro lugar' }));
    const campo = screen.getByRole('combobox', { name: 'Busca el aula o lugar donde estás' });
    fireEvent.change(campo, { target: { value: 'patio' } });
    expect(screen.queryByRole('option')).toBeNull();

    fireEvent.change(campo, { target: { value: 'antiguo 108' } });
    expect(screen.getByRole('option', { name: /Aula 108.*antiguo/i })).toBeInTheDocument();
  });

  it('al elegir otro punto de partida la ruta sale de ahí y se puede cambiar', async () => {
    vi.mocked(obtenerCursos).mockResolvedValue({
      periodo: '2026-2',
      cursos: [curso('asig-aula', 'Cálculo', [AULA])] as never,
    });
    montar();
    await screen.findByRole('group', { name: /Plano del piso 1/ });

    partirDe('antiguo 108', /Aula 108.*antiguo/i);

    expect(await screen.findByText('Sales de donde estás')).toBeVisible();
    expect(screen.getByText(/Pasa al pabellón nuevo por el pasadizo/)).toBeVisible();
    expect(screen.queryByText('Entras por la entrada principal')).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'Cambiar' }));
    expect(await screen.findByText('Entras por la entrada principal')).toBeVisible();
  });

  it('las clases se eligen de un toque, como opciones', async () => {
    vi.mocked(obtenerCursos).mockResolvedValue({
      periodo: '2026-2',
      cursos: [curso('asig-lab', 'Redes', [LAB]), curso('asig-aula', 'Cálculo', [AULA])] as never,
    });
    montar();
    await screen.findByText('Tiempo estimado de caminata');

    const grupo = screen.getByRole('group', { name: '¿A qué clase vas?' });
    expect(within(grupo).getAllByRole('radio')).toHaveLength(2);
    expect(within(grupo).getByRole('radio', { name: /Redes/ })).toBeChecked();
  });

  it('si ya estás en el aula de la clase no hay recorrido que dibujar', async () => {
    vi.mocked(obtenerCursos).mockResolvedValue({
      periodo: '2026-2',
      cursos: [curso('asig-lab', 'Redes', [LAB])] as never,
    });
    montar();
    await screen.findByRole('group', { name: /Plano del piso 1/ });

    partirDe('antiguo 104', /Aula 104.*antiguo/i);

    expect(await screen.findByText(/Ya estás en el aula de esta clase/)).toBeVisible();
    expect(screen.queryByRole('group', { name: /Plano del piso 1/ })).toBeNull();
  });

  it('sin ninguna clase con aula lo dice y no pide ruta', async () => {
    vi.mocked(obtenerCursos).mockResolvedValue({
      periodo: '2026-2',
      cursos: [curso(null, 'Sin aula', [])] as never,
    });
    montar();

    expect(await screen.findByText(/Todavía no tienes una clase con aula asignada/)).toBeVisible();
    expect(vi.mocked(obtenerRuta)).not.toHaveBeenCalled();
  });

  it('si el backend dice que la ruta no está disponible, muestra su mensaje', async () => {
    vi.mocked(obtenerCursos).mockResolvedValue({
      periodo: '2026-2',
      cursos: [curso('asig-lab', 'Redes', [LAB])] as never,
    });
    vi.mocked(obtenerRuta).mockResolvedValue({
      asignacionId: 'asig-lab',
      estado: 'RUTA_NO_DISPONIBLE',
      mensaje: 'La asignación no cuenta con espacios registrados.',
      tiempoEstimadoTotalSegundos: 0,
      tramos: [],
      movilidadReducida: false,
    } as never);
    montar();

    expect(await screen.findByRole('alert')).toHaveTextContent('Ruta no disponible');
  });

  it('si falla la carga de las clases muestra el error', async () => {
    vi.mocked(obtenerCursos).mockRejectedValue(new Error('sin red'));
    montar();

    expect(await screen.findByRole('button', { name: 'Reintentar' })).toBeVisible();
  });
});
