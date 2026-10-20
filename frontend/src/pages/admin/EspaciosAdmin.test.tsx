import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import EspaciosAdmin from './EspaciosAdmin';
import { ProveedorAvisos } from '../../components/ui/Avisos';
import {
  crearEspacio,
  editarEspacio,
  obtenerCatalogoActivo,
  obtenerEspacios,
} from '../../services/admin';
import type { EspacioAdminDTO } from '../../types/admin';

vi.mock('../../context/useAuth', () => ({
  useAuth: () => ({ sesion: { rol: 'COORDINACION_ACADEMICA' }, cerrarSesion: vi.fn() }),
}));
vi.mock('../../services/admin', () => ({
  obtenerEspacios: vi.fn(),
  editarEspacio: vi.fn(),
  crearEspacio: vi.fn(),
  obtenerCatalogoActivo: vi.fn(),
}));

const obtener = vi.mocked(obtenerEspacios);
const editar = vi.mocked(editarEspacio);
const crear = vi.mocked(crearEspacio);
const catalogo = vi.mocked(obtenerCatalogoActivo);

const espacio = (o: Partial<EspacioAdminDTO>): EspacioAdminDTO => ({
  id: 'e1',
  identificador: 'AULA-101',
  tipo: 'AULA_TEORICA',
  pabellon: 'A',
  piso: 1,
  aforoNominal: 40,
  softwareInstalado: null,
  pcsMalogradas: null,
  habilitado: true,
  descripcionUso: null,
  contiguos: [],
  camposEditables: [],
  ...o,
});

const montar = () =>
  render(
    <MemoryRouter>
      <ProveedorAvisos>
        <EspaciosAdmin />
      </ProveedorAvisos>
    </MemoryRouter>,
  );

describe('Gestión de espacios (Issue 4.15)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    catalogo.mockResolvedValue({ items: [], total: 0, page: 1, limit: 100 });
    obtener.mockResolvedValue([
      espacio({}),
      espacio({
        id: 'e2',
        identificador: 'LAB-301',
        tipo: 'LABORATORIO',
        pcsMalogradas: 3,
        habilitado: false,
      }),
    ]);
  });

  it('lista los espacios con tipo, ubicación, PCs y estado', async () => {
    montar();
    expect(await screen.findByText('AULA-101')).toBeInTheDocument();
    expect(screen.getByText('Aula teórica')).toBeInTheDocument();
    expect(screen.getByText('Laboratorio')).toBeInTheDocument();
    // El pabellón se muestra tal como viene en la base ("Antiguo Pabellón"), sin prefijos.
    expect(screen.getAllByText(/^A · Piso 1$/)).toHaveLength(2);
    expect(screen.queryByText(/Pab\./)).toBeNull();
    expect(screen.getByText('3')).toBeInTheDocument();
    expect(screen.getByText('No aplica')).toBeInTheDocument();
    expect(screen.getByText('Habilitado')).toBeInTheDocument();
    expect(screen.getByText('Fuera de servicio')).toBeInTheDocument();
  });

  it('filtra por tipo de espacio', async () => {
    montar();
    await screen.findByText('AULA-101');
    fireEvent.change(screen.getByLabelText('Tipo de espacio'), {
      target: { value: 'LABORATORIO' },
    });
    expect(screen.queryByText('AULA-101')).toBeNull();
    expect(screen.getByText('LAB-301')).toBeInTheDocument();
  });

  it('filtra por texto sin distinguir mayúsculas y muestra el estado vacío', async () => {
    montar();
    await screen.findByText('AULA-101');
    fireEvent.change(screen.getByLabelText('Buscar espacio'), { target: { value: ' lab' } });
    expect(screen.queryByText('AULA-101')).toBeNull();
    expect(screen.getByText('LAB-301')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Buscar espacio'), { target: { value: 'zzz' } });
    expect(screen.getByText('Sin coincidencias')).toBeInTheDocument();
  });

  it('filtra por pabellón y piso, y limpia los filtros', async () => {
    obtener.mockResolvedValue([
      espacio({}),
      espacio({
        id: 'e2',
        identificador: 'LAB-301',
        tipo: 'LABORATORIO',
        pabellon: 'B',
        piso: 3,
        pcsMalogradas: 3,
      }),
    ]);
    montar();
    await screen.findByText('AULA-101');

    fireEvent.change(screen.getByLabelText('Pabellón'), { target: { value: 'B' } });
    expect(screen.queryByText('AULA-101')).toBeNull();
    expect(screen.getByText('LAB-301')).toBeInTheDocument();
    expect(screen.getByText(/de 2 coinciden/)).toHaveTextContent('1 de 2 coinciden');

    fireEvent.change(screen.getByLabelText('Piso'), { target: { value: '3' } });
    expect(screen.getByText('LAB-301')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Limpiar filtros' }));
    expect(screen.getByText('AULA-101')).toBeInTheDocument();
    expect(screen.getByText('LAB-301')).toBeInTheDocument();
  });

  it('filtra solo los espacios deshabilitados', async () => {
    montar();
    await screen.findByText('AULA-101');

    fireEvent.click(screen.getByLabelText('Solo deshabilitados'));
    expect(screen.queryByText('AULA-101')).toBeNull();
    expect(screen.getByText('LAB-301')).toBeInTheDocument();
    expect(screen.getByText(/de 2 coinciden/)).toHaveTextContent('1 de 2 coinciden');
  });

  it('distingue «No aplica» de «Sin registrar» en las PCs', async () => {
    obtener.mockResolvedValue([
      espacio({}),
      espacio({
        id: 'e2',
        identificador: 'LAB-301',
        tipo: 'LABORATORIO',
        pcsMalogradas: null,
      }),
    ]);
    montar();
    await screen.findByText('LAB-301');
    expect(screen.getByText('No aplica')).toBeInTheDocument();
    expect(screen.getByText('Sin registrar')).toBeInTheDocument();
  });

  it('muestra el aforo sin definir como una raya y no como cero', async () => {
    obtener.mockResolvedValue([
      espacio({ id: 'e3', identificador: 'SALON-1', aforoNominal: 0, habilitado: false }),
    ]);
    montar();
    await screen.findByText('SALON-1');
    expect(screen.getByText('—')).toBeInTheDocument();
    expect(screen.queryByText('0')).toBeNull();
  });

  it('abre el detalle de solo lectura de un espacio', async () => {
    montar();
    await screen.findByText('LAB-301');

    fireEvent.click(screen.getByRole('button', { name: 'Ver detalle de LAB-301' }));
    const dialogo = screen.getByRole('dialog', { name: 'LAB-301' });
    expect(within(dialogo).getByText('Datos del espacio')).toBeVisible();
    expect(within(dialogo).getByText('3 PCs')).toBeInTheDocument();
    expect(within(dialogo).getByText('Sin software registrado.')).toBeInTheDocument();
    expect(within(dialogo).getByRole('link', { name: 'Cambio de laboratorio' })).toHaveAttribute(
      'href',
      '/admin/laboratorio',
    );

    fireEvent.click(within(dialogo).getByRole('button', { name: 'Cerrar' }));
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('muestra el error y permite reintentar', async () => {
    obtener.mockRejectedValueOnce(new Error('fallo'));
    montar();
    expect(await screen.findByText('Inténtalo de nuevo en unos minutos.')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /reintentar/i }));
    expect(await screen.findByText('AULA-101')).toBeInTheDocument();
    expect(obtener).toHaveBeenCalledTimes(2);
  });

  it('abre el formulario de edición con los campos del rol', async () => {
    obtener.mockResolvedValue([
      espacio({
        camposEditables: ['identificador', 'aforoNominal'],
      }),
    ]);
    montar();
    await screen.findByText('AULA-101');

    fireEvent.click(screen.getByRole('button', { name: 'Ver detalle de AULA-101' }));
    const dialogo = screen.getByRole('dialog', { name: 'AULA-101' });
    expect(within(dialogo).getByText(/Puedes editar: el código, la capacidad/)).toBeInTheDocument();

    fireEvent.click(within(dialogo).getByRole('button', { name: 'Editar espacio' }));
    expect(within(dialogo).getByLabelText(/Código del espacio/)).toHaveValue('AULA-101');
    expect(within(dialogo).getByLabelText(/Capacidad \(aforo nominal\)/)).toHaveValue(40);
    // Un campo que el rol no puede editar no aparece en el formulario.
    expect(within(dialogo).queryByLabelText(/PCs fuera de servicio/)).toBeNull();
  });

  it('guarda los cambios, avisa y refresca la lista', async () => {
    obtener.mockResolvedValue([
      espacio({
        camposEditables: ['identificador', 'aforoNominal'],
      }),
    ]);
    montar();
    await screen.findByText('AULA-101');

    fireEvent.click(screen.getByRole('button', { name: 'Ver detalle de AULA-101' }));
    const dialogo = screen.getByRole('dialog', { name: 'AULA-101' });
    fireEvent.click(within(dialogo).getByRole('button', { name: 'Editar espacio' }));

    fireEvent.change(within(dialogo).getByLabelText(/Capacidad \(aforo nominal\)/), {
      target: { value: '45' },
    });

    editar.mockResolvedValue({
      espacio: espacio({ camposEditables: ['identificador', 'aforoNominal'], aforoNominal: 45 }),
      alertas: [],
    });

    fireEvent.click(within(dialogo).getByRole('button', { name: 'Guardar cambios' }));

    await waitFor(() => expect(editar).toHaveBeenCalledWith('e1', { aforoNominal: 45 }));
    expect(await screen.findByText(/Espacio AULA-101 actualizado/)).toBeInTheDocument();
    // La lista se recarga: los contiguos son bidireccionales y pueden haber cambiado.
    await waitFor(() => expect(obtener).toHaveBeenCalledTimes(2));
  });

  it('informa de las alertas que generó el cambio', async () => {
    obtener.mockResolvedValue([
      espacio({
        camposEditables: ['identificador', 'aforoNominal'],
      }),
    ]);
    montar();
    await screen.findByText('AULA-101');

    fireEvent.click(screen.getByRole('button', { name: 'Ver detalle de AULA-101' }));
    const dialogo = screen.getByRole('dialog', { name: 'AULA-101' });
    fireEvent.click(within(dialogo).getByRole('button', { name: 'Editar espacio' }));

    fireEvent.change(within(dialogo).getByLabelText(/Capacidad \(aforo nominal\)/), {
      target: { value: '20' },
    });

    editar.mockResolvedValue({
      espacio: espacio({ camposEditables: ['identificador', 'aforoNominal'], aforoNominal: 20 }),
      alertas: [
        {
          id: 'a1',
          tipo: 'CAPACIDAD',
          espacioId: 'e1',
          motivo: '30 alumnos para aforo 20',
          asignacionesAfectadas: 1,
          creada: true,
        },
      ],
    });

    fireEvent.click(within(dialogo).getByRole('button', { name: 'Guardar cambios' }));

    expect(await screen.findByText('30 alumnos para aforo 20')).toBeInTheDocument();
  });

  it('crea un espacio nuevo desde el panel', async () => {
    montar();
    await screen.findByText('AULA-101');

    fireEvent.click(screen.getByRole('button', { name: 'Nuevo espacio' }));
    const dialogo = screen.getByRole('dialog', { name: 'Nuevo espacio' });

    fireEvent.change(within(dialogo).getByLabelText(/Código del espacio/), {
      target: { value: 'AULA-202' },
    });
    fireEvent.change(within(dialogo).getByLabelText(/Pabellón/), { target: { value: 'A' } });
    fireEvent.change(within(dialogo).getByLabelText(/^Piso/), { target: { value: '2' } });
    fireEvent.change(within(dialogo).getByLabelText(/Capacidad \(aforo nominal\)/), {
      target: { value: '30' },
    });

    crear.mockResolvedValue(espacio({ id: 'e9', identificador: 'AULA-202', piso: 2 }));

    fireEvent.click(within(dialogo).getByRole('button', { name: 'Crear espacio' }));

    await waitFor(() => expect(crear).toHaveBeenCalledTimes(1));
    expect(crear).toHaveBeenCalledWith(
      expect.objectContaining({
        identificador: 'AULA-202',
        pabellon: 'A',
        piso: 2,
        aforoNominal: 30,
      }),
    );
    expect(await screen.findByText(/Espacio AULA-202 creado/)).toBeInTheDocument();
  });
});
