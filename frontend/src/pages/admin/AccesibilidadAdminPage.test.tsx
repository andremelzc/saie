import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import AccesibilidadAdminPage from './AccesibilidadAdminPage';
import { ProveedorAvisos } from '../../components/ui/Avisos';
import { vaciarCacheCarga } from '../../hooks/useCarga';
import { obtenerAccesibilidad, resolverAccesibilidad } from '../../services/accesibilidad';
import type {
  AccesibilidadAdminDTO,
  SolicitudAccesibilidadAdminDTO,
} from '../../types/accesibilidad';

vi.mock('../../context/useAuth', () => ({
  useAuth: () => ({ sesion: { rol: 'COORDINACION_ACADEMICA' }, cerrarSesion: vi.fn() }),
}));
vi.mock('../../services/accesibilidad', () => ({
  obtenerAccesibilidad: vi.fn(),
  resolverAccesibilidad: vi.fn(),
}));

const obtener = vi.mocked(obtenerAccesibilidad);
const resolver = vi.mocked(resolverAccesibilidad);

const declaracion = (
  o: Partial<SolicitudAccesibilidadAdminDTO> = {},
): SolicitudAccesibilidadAdminDTO => ({
  id: 'sol-1',
  estado: 'PENDIENTE',
  fechaSolicitud: '2026-11-20T15:00:00Z',
  fechaResolucion: null,
  motivoRechazo: null,
  resultado: null,
  alumno: { codigo: '20231234', nombre: 'Ana Quispe' },
  secciones: [
    {
      seccionId: 's1',
      codigoCurso: 'CC-101',
      nombreCurso: 'Algoritmos',
      codigoSeccion: '1',
      espacios: [{ identificador: 'AULA-301', pabellon: 'A', piso: 3 }],
      fueraDePiso1: true,
      sinAula: false,
    },
  ],
  ...o,
});

const datos = (o: Partial<AccesibilidadAdminDTO> = {}): AccesibilidadAdminDTO => ({
  periodo: '2026-2',
  pendientes: [declaracion()],
  aprobadas: [],
  ...o,
});

const montar = () =>
  render(
    <MemoryRouter>
      <ProveedorAvisos>
        <AccesibilidadAdminPage />
      </ProveedorAvisos>
    </MemoryRouter>,
  );

describe('AccesibilidadAdminPage (Issue 3.60)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vaciarCacheCarga();
  });

  it('lista las pendientes con dónde están hoy sus clases', async () => {
    obtener.mockResolvedValue(datos());
    montar();

    const tarjeta = (await screen.findByText('Ana Quispe')).closest('li')!;
    expect(within(tarjeta).getByText('Pendiente')).toBeInTheDocument();
    expect(within(tarjeta).getByText('AULA-301 (piso 3)')).toBeInTheDocument();
    expect(within(tarjeta).getByText('Fuera del piso 1')).toBeInTheDocument();
    expect(screen.getByText(/periodo 2026-2/)).toBeInTheDocument();
  });

  it('aprueba con confirmación y vuelve a cargar', async () => {
    obtener.mockResolvedValue(datos());
    resolver.mockResolvedValue(
      declaracion({ estado: 'APROBADA', resultado: '1 de 1 clase quedó en el piso 1' }),
    );
    montar();

    fireEvent.click(await screen.findByRole('button', { name: 'Aprobar' }));
    const dialogo = await screen.findByRole('alertdialog');
    expect(within(dialogo).getByText(/reasignará sus clases/)).toBeInTheDocument();
    fireEvent.click(within(dialogo).getByRole('button', { name: 'Sí, aprobar y reasignar' }));

    await waitFor(() => expect(resolver).toHaveBeenCalledWith('sol-1', { decision: 'APROBAR' }));
    expect(await screen.findByText(/1 de 1 clase quedó en el piso 1/)).toBeInTheDocument();
    await waitFor(() => expect(obtener).toHaveBeenCalledTimes(2));
  });

  it('exige el motivo para rechazar', async () => {
    obtener.mockResolvedValue(datos());
    resolver.mockResolvedValue(declaracion({ estado: 'RECHAZADA' }));
    montar();

    fireEvent.click(await screen.findByRole('button', { name: 'Rechazar' }));
    const dialogo = await screen.findByRole('alertdialog');
    fireEvent.click(within(dialogo).getByRole('button', { name: 'Rechazar la declaración' }));
    expect(within(dialogo).getByRole('alert')).toHaveTextContent(/al menos 5 caracteres/);
    expect(resolver).not.toHaveBeenCalled();

    fireEvent.change(within(dialogo).getByLabelText(/Motivo del rechazo/), {
      target: { value: 'Falta confirmar con Bienestar' },
    });
    fireEvent.click(within(dialogo).getByRole('button', { name: 'Rechazar la declaración' }));
    await waitFor(() =>
      expect(resolver).toHaveBeenCalledWith('sol-1', {
        decision: 'RECHAZAR',
        motivo: 'Falta confirmar con Bienestar',
      }),
    );
  });

  it('muestra las aprobadas con su resultado y las clases que siguen fuera del piso 1', async () => {
    obtener.mockResolvedValue(
      datos({
        pendientes: [],
        aprobadas: [
          declaracion({
            estado: 'APROBADA',
            fechaResolucion: '2026-11-21T15:00:00Z',
            resultado: '0 de 1 clase quedó en el piso 1; 1 clase espera revisión',
            secciones: [
              ...declaracion().secciones,
              {
                seccionId: 's2',
                codigoCurso: 'CC-205',
                nombreCurso: 'Programación',
                codigoSeccion: '2',
                espacios: [],
                fueraDePiso1: false,
                sinAula: true,
              },
            ],
          }),
        ],
      }),
    );
    montar();

    expect(await screen.findByText('No hay declaraciones pendientes')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Aprobadas \(1\)/ }));

    const tarjeta = (await screen.findByText('Ana Quispe')).closest('li')!;
    expect(within(tarjeta).getByText('1 clase fuera del piso 1')).toBeInTheDocument();
    expect(within(tarjeta).getByText(/Resultado: 0 de 1 clase/)).toBeInTheDocument();
    expect(within(tarjeta).getByText('Sin aula asignada')).toBeInTheDocument();
    expect(within(tarjeta).queryByRole('button', { name: 'Aprobar' })).toBeNull();
  });

  it('muestra el vacío de las aprobadas y el aviso sin clases en el periodo', async () => {
    obtener.mockResolvedValue(
      datos({ periodo: null, pendientes: [declaracion({ secciones: [] })] }),
    );
    montar();

    expect(await screen.findByText('No tiene clases en el periodo vigente.')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Aprobadas \(0\)/ }));
    expect(
      await screen.findByText('Nadie tiene aprobada la prioridad del piso 1'),
    ).toBeInTheDocument();
  });

  it('muestra el error de carga con «Reintentar»', async () => {
    obtener.mockRejectedValueOnce(new Error('x')).mockResolvedValue(datos());
    montar();
    fireEvent.click(await screen.findByRole('button', { name: 'Reintentar' }));
    expect(await screen.findByText('Ana Quispe')).toBeInTheDocument();
  });

  it('marca las declaraciones de docentes y su fecha de fin (Issue 3.61)', async () => {
    obtener.mockResolvedValue(
      datos({
        pendientes: [
          declaracion({
            tipo: 'DOCENTE',
            alumno: { codigo: '0A0690', nombre: 'Dra. Rojas' },
            fechaFin: '2026-12-20',
          }),
        ],
      }),
    );
    montar();

    expect(await screen.findByText(/Docente · Código 0A0690/)).toBeInTheDocument();
    expect(screen.getByText(/hasta el 20 de diciembre de 2026/)).toBeInTheDocument();
  });
});
