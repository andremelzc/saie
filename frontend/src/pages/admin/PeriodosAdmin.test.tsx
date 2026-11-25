import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AuthProvider } from '../../context/AuthProvider';
import AppRoutes from '../../AppRoutes';
import api from '../../services/api';
import { borrarSesion, guardarSesion } from '../../services/sesion';
import { invalidarCacheCarga } from '../../hooks/useCarga';
import { ahoraEnSegundos, crearToken } from '../../test/helpers';
import type { PeriodosDTO } from '../../types/admin';

const LISTADO: PeriodosDTO = {
  vigente: '2026-2',
  periodos: ['2027-1', '2026-2', '2026-1'],
  registrados: [
    { codigo: '2027-1', fechaInicio: '2027-03-15', fechaFin: null, estado: 'EN_PREPARACION' },
    { codigo: '2026-2', fechaInicio: '2026-08-17', fechaFin: '2026-12-19', estado: 'VIGENTE' },
    { codigo: '2026-1', fechaInicio: null, fechaFin: null, estado: 'CERRADO' },
  ],
};

function montar() {
  render(
    <MemoryRouter initialEntries={['/admin/periodos']}>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </MemoryRouter>,
  );
}

/** Los periodos de la lista (la barra de pestañas también usa elementos de lista). */
async function periodosListados() {
  const lista = await screen.findByRole('list', { name: 'Periodos registrados' });
  return within(lista).getAllByRole('listitem');
}

function iniciarSesion(rol: 'COORDINACION_ACADEMICA' | 'JEFATURA_LABORATORIOS') {
  guardarSesion({
    token: crearToken(ahoraEnSegundos() + 3600, rol),
    rol,
    debeCambiarClave: false,
    expiresIn: '8h',
  });
}

describe('Periodos (Issue 4.64)', () => {
  beforeEach(() => {
    invalidarCacheCarga('periodos');
    iniciarSesion('COORDINACION_ACADEMICA');
  });
  afterEach(() => {
    borrarSesion();
    vi.restoreAllMocks();
  });

  it('muestra cada periodo con su estado y fechas, y solo ofrece las acciones que corresponden', async () => {
    vi.spyOn(api, 'get').mockResolvedValue({ data: { success: true, data: LISTADO } } as never);
    montar();

    const items = await periodosListados();
    const [preparacion, vigente, cerrado] = items;

    expect(within(preparacion).getByText('En preparación')).toBeInTheDocument();
    expect(within(preparacion).getByText('Desde el 15 de marzo de 2027')).toBeInTheDocument();
    expect(within(preparacion).getByRole('button', { name: 'Activar periodo' })).toBeEnabled();
    expect(within(preparacion).getByRole('button', { name: 'Cerrar periodo' })).toBeEnabled();

    expect(within(vigente).getByText('Vigente')).toBeInTheDocument();
    expect(
      within(vigente).getByText('17 de agosto de 2026 al 19 de diciembre de 2026'),
    ).toBeInTheDocument();
    expect(within(vigente).queryByRole('button', { name: 'Activar periodo' })).toBeNull();
    expect(within(vigente).getByRole('button', { name: 'Cerrar periodo' })).toBeInTheDocument();

    expect(within(cerrado).getByText('Cerrado')).toBeInTheDocument();
    expect(within(cerrado).getByText('Sin fechas registradas')).toBeInTheDocument();
    expect(within(cerrado).queryByRole('button')).toBeNull();
  });

  it('registra un periodo con sus fechas', async () => {
    vi.spyOn(api, 'get').mockResolvedValue({ data: { success: true, data: LISTADO } } as never);
    const post = vi.spyOn(api, 'post').mockResolvedValue({
      data: {
        success: true,
        data: { codigo: '2027-2', fechaInicio: null, fechaFin: null, estado: 'EN_PREPARACION' },
      },
    } as never);
    montar();

    await periodosListados();
    const boton = screen.getByRole('button', { name: 'Registrar periodo' });
    expect(boton).toBeDisabled();

    fireEvent.change(screen.getByLabelText(/^Código/), { target: { value: '2027-II' } });
    fireEvent.change(screen.getByLabelText(/Fecha de inicio/), { target: { value: '2027-08-16' } });
    fireEvent.change(screen.getByLabelText(/Fecha de fin/), { target: { value: '2027-12-18' } });
    fireEvent.click(boton);

    await waitFor(() =>
      expect(post).toHaveBeenCalledWith('/v1/admin/periodos', {
        codigo: '2027-II',
        fechaInicio: '2027-08-16',
        fechaFin: '2027-12-18',
      }),
    );
    expect(
      await screen.findByText('Periodo 2027-2 registrado, en preparación.'),
    ).toBeInTheDocument();
  });

  it('muestra en el formulario el motivo si el servidor rechaza el periodo', async () => {
    vi.spyOn(api, 'get').mockResolvedValue({ data: { success: true, data: LISTADO } } as never);
    vi.spyOn(api, 'post').mockRejectedValue({
      isAxiosError: true,
      response: { status: 409, data: { message: 'El periodo 2027-1 ya está registrado' } },
    });
    montar();

    await periodosListados();
    fireEvent.change(screen.getByLabelText(/^Código/), { target: { value: '2027-1' } });
    fireEvent.click(screen.getByRole('button', { name: 'Registrar periodo' }));

    expect(await screen.findByText(/ya está registrado/)).toBeInTheDocument();
  });

  it('pide confirmación antes de activar y explica que el vigente se cierra', async () => {
    vi.spyOn(api, 'get').mockResolvedValue({ data: { success: true, data: LISTADO } } as never);
    const post = vi.spyOn(api, 'post').mockResolvedValue({
      data: { success: true, data: { ...LISTADO.registrados[0], estado: 'VIGENTE' } },
    } as never);
    montar();

    const [preparacion] = await periodosListados();
    fireEvent.click(within(preparacion).getByRole('button', { name: 'Activar periodo' }));

    expect(post).not.toHaveBeenCalled();
    expect(screen.getByText('¿Activar el periodo 2027-1?')).toBeInTheDocument();
    expect(screen.getByText(/El periodo 2026-2 se cerrará/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Sí, activar' }));
    await waitFor(() => expect(post).toHaveBeenCalledWith('/v1/admin/periodos/2027-1/activar', {}));
    expect(await screen.findByText('Periodo 2027-1 activado.')).toBeInTheDocument();
  });

  it('cerrar pide confirmación y avisa que queda solo para consulta', async () => {
    vi.spyOn(api, 'get').mockResolvedValue({ data: { success: true, data: LISTADO } } as never);
    const post = vi.spyOn(api, 'post').mockResolvedValue({
      data: { success: true, data: { ...LISTADO.registrados[1], estado: 'CERRADO' } },
    } as never);
    montar();

    const items = await periodosListados();
    fireEvent.click(within(items[1]).getByRole('button', { name: 'Cerrar periodo' }));
    expect(screen.getByText(/quedará solo para consulta/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Sí, cerrar' }));
    await waitFor(() => expect(post).toHaveBeenCalledWith('/v1/admin/periodos/2026-2/cerrar', {}));
  });

  it('cancelar la confirmación no cambia nada', async () => {
    vi.spyOn(api, 'get').mockResolvedValue({ data: { success: true, data: LISTADO } } as never);
    const post = vi.spyOn(api, 'post');
    montar();

    const [preparacion] = await periodosListados();
    fireEvent.click(within(preparacion).getByRole('button', { name: 'Activar periodo' }));
    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }));

    expect(post).not.toHaveBeenCalled();
    expect(screen.queryByText('¿Activar el periodo 2027-1?')).toBeNull();
  });

  it('sin periodos registrados invita a registrar el primero', async () => {
    vi.spyOn(api, 'get').mockResolvedValue({
      data: { success: true, data: { vigente: null, periodos: [], registrados: [] } },
    } as never);
    montar();

    expect(await screen.findByText('Todavía no hay periodos')).toBeInTheDocument();
  });

  it('Jefatura no entra a la pantalla de periodos', async () => {
    iniciarSesion('JEFATURA_LABORATORIOS');
    vi.spyOn(api, 'get').mockResolvedValue({ data: { success: true, data: LISTADO } } as never);
    montar();

    await waitFor(() => expect(screen.queryByRole('heading', { name: 'Periodos' })).toBeNull());
  });
});
