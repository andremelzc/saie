import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { ComponentProps } from 'react';
import FormularioEspacio from './FormularioEspacio';
import { crearEspacio, editarEspacio, obtenerCatalogoActivo } from '../../services/admin';
import type { EspacioAdminDTO, ResultadoEdicionEspacioDTO } from '../../types/admin';

vi.mock('../../services/admin', () => ({
  editarEspacio: vi.fn(),
  crearEspacio: vi.fn(),
  obtenerCatalogoActivo: vi.fn(),
}));

const editar = vi.mocked(editarEspacio);
const crear = vi.mocked(crearEspacio);
const catalogo = vi.mocked(obtenerCatalogoActivo);

const espacio = (o: Partial<EspacioAdminDTO> = {}): EspacioAdminDTO => ({
  id: 'e1',
  identificador: 'LAB-301',
  tipo: 'LABORATORIO',
  pabellon: 'A',
  piso: 3,
  aforoNominal: 30,
  softwareInstalado: [{ id: 'sw1', nombre: 'Python', version: '3.12' }],
  pcsMalogradas: 2,
  habilitado: true,
  descripcionUso: null,
  contiguos: [],
  camposEditables: [
    'identificador',
    'pabellon',
    'piso',
    'aforoNominal',
    'contiguos',
    'habilitado',
    'descripcionUso',
    'softwareIds',
    'pcsMalogradas',
  ],
  ...o,
});

const montar = (props: Partial<ComponentProps<typeof FormularioEspacio>> = {}) => {
  const onGuardado = vi.fn();
  const onCancelar = vi.fn();
  render(
    <FormularioEspacio
      modo="editar"
      espacio={espacio()}
      espacios={[espacio(), espacio({ id: 'e2', identificador: 'LAB-302' })]}
      onGuardado={onGuardado}
      onCancelar={onCancelar}
      {...props}
    />,
  );
  return { onGuardado, onCancelar };
};

describe('Formulario de espacios (Issue 4.15)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    catalogo.mockResolvedValue({
      items: [
        { id: 'sw1', nombre: 'Python', version: '3.12', activo: true },
        { id: 'sw2', nombre: 'VS Code', version: '1.0', activo: true },
      ],
      total: 2,
      page: 1,
      limit: 100,
    });
  });

  it('muestra solo los campos que el rol puede editar', async () => {
    montar({
      espacio: espacio({
        camposEditables: ['softwareIds', 'pcsMalogradas'],
      }),
    });

    expect(screen.queryByLabelText(/Código del espacio/)).toBeNull();
    expect(screen.queryByLabelText(/Pabellón/)).toBeNull();
    expect(screen.queryByLabelText(/^Piso/)).toBeNull();
    expect(screen.queryByLabelText(/Capacidad \(aforo nominal\)/)).toBeNull();
    expect(screen.getByLabelText(/PCs fuera de servicio/)).toBeInTheDocument();
    expect(screen.getByLabelText('Buscar software')).toBeInTheDocument();
  });

  it('avisa cuando el rol no puede editar el espacio', () => {
    montar({ espacio: espacio({ camposEditables: [] }) });
    expect(screen.getByText(/Tu rol no puede editar este espacio/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Guardar cambios' })).toBeNull();
  });

  it('envía solo los campos modificados', async () => {
    const { onGuardado } = montar();
    await screen.findByLabelText('Buscar software');

    fireEvent.change(screen.getByLabelText(/Capacidad \(aforo nominal\)/), {
      target: { value: '35' },
    });

    const resultado: ResultadoEdicionEspacioDTO = {
      espacio: espacio({ aforoNominal: 35 }),
      alertas: [],
    };
    editar.mockResolvedValue(resultado);

    fireEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }));

    await waitFor(() => expect(editar).toHaveBeenCalledTimes(1));
    expect(editar).toHaveBeenCalledWith('e1', { aforoNominal: 35 });
    expect(onGuardado).toHaveBeenCalledWith(resultado);
  });

  it('no habilita el guardado si no hay cambios', () => {
    montar();
    const boton = screen.getByRole('button', { name: 'Guardar cambios' });
    expect(boton).toBeDisabled();
    expect(screen.getByText('No hay cambios para guardar.')).toBeInTheDocument();
  });

  it('bloquea un aforo de 0 mientras el espacio siga habilitado', () => {
    montar();
    fireEvent.change(screen.getByLabelText(/Capacidad \(aforo nominal\)/), {
      target: { value: '0' },
    });
    expect(screen.getByRole('button', { name: 'Guardar cambios' })).toBeDisabled();
    expect(
      screen.getByText('Un espacio habilitado necesita un aforo mayor a 0.'),
    ).toBeInTheDocument();
  });

  it('permite guardar un aforo de 0 si el espacio queda fuera de servicio', async () => {
    montar({ espacio: espacio({ pcsMalogradas: null }) });
    fireEvent.click(screen.getByLabelText(/Espacio en servicio/));
    fireEvent.change(screen.getByLabelText(/Capacidad \(aforo nominal\)/), {
      target: { value: '0' },
    });

    editar.mockResolvedValue({
      espacio: espacio({ aforoNominal: 0, habilitado: false }),
      alertas: [],
    });
    fireEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }));

    await waitFor(() => expect(editar).toHaveBeenCalledTimes(1));
    expect(editar).toHaveBeenCalledWith('e1', { aforoNominal: 0, habilitado: false });
  });

  it('no permite dejar las PCs malogradas vacías si ya tenían valor', () => {
    montar();
    fireEvent.change(screen.getByLabelText(/PCs fuera de servicio/), { target: { value: '' } });
    expect(screen.getByRole('button', { name: 'Guardar cambios' })).toBeDisabled();
    expect(screen.getByText(/no se puede borrar/)).toBeInTheDocument();
  });

  it('envía `null` cuando se borra la descripción de uso', async () => {
    montar({ espacio: espacio({ descripcionUso: 'Sala de investigación' }) });
    fireEvent.change(screen.getByLabelText('Descripción de uso'), { target: { value: '' } });

    editar.mockResolvedValue({ espacio: espacio({ descripcionUso: null }), alertas: [] });
    fireEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }));

    await waitFor(() => expect(editar).toHaveBeenCalledTimes(1));
    expect(editar).toHaveBeenCalledWith('e1', { descripcionUso: null });
  });

  it('muestra el error del backend sin perder lo escrito', async () => {
    montar();
    fireEvent.change(screen.getByLabelText(/Capacidad \(aforo nominal\)/), {
      target: { value: '35' },
    });

    editar.mockRejectedValue({
      isAxiosError: true,
      response: { status: 409, data: { message: 'Ya existe un espacio con ese identificador' } },
    });

    fireEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }));

    expect(
      await screen.findByText('Ya existe un espacio con ese identificador'),
    ).toBeInTheDocument();
    expect(screen.getByLabelText(/Capacidad \(aforo nominal\)/)).toHaveValue(35);
  });

  it('reemplaza el conjunto de contiguos completo', async () => {
    const { onGuardado } = montar({
      espacio: espacio({ contiguos: ['e2'] }),
    });

    expect(screen.getByLabelText(/LAB-302/)).toBeChecked();
    fireEvent.click(screen.getByLabelText(/LAB-302/));

    editar.mockResolvedValue({ espacio: espacio({ contiguos: [] }), alertas: [] });
    fireEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }));

    await waitFor(() => expect(editar).toHaveBeenCalledTimes(1));
    expect(editar).toHaveBeenCalledWith('e1', { contiguos: [] });
    expect(onGuardado).toHaveBeenCalled();
  });

  it('cambia el software instalado y lo envía como ids', async () => {
    montar();
    await screen.findByLabelText('Buscar software');

    fireEvent.click(screen.getByLabelText(/VS Code/));

    editar.mockResolvedValue({
      espacio: espacio({
        softwareInstalado: [
          { id: 'sw1', nombre: 'Python', version: '3.12' },
          { id: 'sw2', nombre: 'VS Code', version: '1.0' },
        ],
      }),
      alertas: [],
    });
    fireEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }));

    await waitFor(() => expect(editar).toHaveBeenCalledTimes(1));
    expect(editar).toHaveBeenCalledWith('e1', { softwareIds: ['sw1', 'sw2'] });
  });

  it('devuelve las alertas que generó el cambio', async () => {
    const { onGuardado } = montar();
    fireEvent.change(screen.getByLabelText(/Capacidad \(aforo nominal\)/), {
      target: { value: '20' },
    });

    const resultado: ResultadoEdicionEspacioDTO = {
      espacio: espacio({ aforoNominal: 20 }),
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
    };
    editar.mockResolvedValue(resultado);

    fireEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }));

    await waitFor(() => expect(onGuardado).toHaveBeenCalledWith(resultado));
  });

  it('marca los campos obligatorios para lectores de pantalla', () => {
    montar();
    expect(screen.getByLabelText(/Código del espacio/)).toHaveAttribute('aria-required', 'true');
    expect(screen.getByLabelText(/Capacidad \(aforo nominal\)/)).toHaveAttribute(
      'aria-required',
      'true',
    );
    expect(screen.getAllByText('(obligatorio)').length).toBeGreaterThan(0);
  });

  describe('alta de un espacio', () => {
    const montarAlta = (props: Partial<ComponentProps<typeof FormularioEspacio>> = {}) => {
      const onGuardado = vi.fn();
      render(
        <FormularioEspacio
          modo="crear"
          espacios={[espacio(), espacio({ id: 'e2', identificador: 'LAB-302' })]}
          onGuardado={onGuardado}
          onCancelar={vi.fn()}
          {...props}
        />,
      );
      return { onGuardado };
    };

    it('ofrece el tipo de espacio y no muestra software ni PCs en un aula', () => {
      montarAlta();
      expect(screen.getByLabelText('Tipo de espacio')).toBeInTheDocument();
      expect(screen.queryByLabelText(/PCs fuera de servicio/)).toBeNull();
      expect(screen.queryByLabelText('Buscar software')).toBeNull();
      expect(screen.getByRole('button', { name: 'Crear espacio' })).toBeInTheDocument();
    });

    it('muestra software y PCs cuando el tipo es laboratorio', () => {
      montarAlta();
      fireEvent.change(screen.getByLabelText('Tipo de espacio'), {
        target: { value: 'LABORATORIO' },
      });
      expect(screen.getByLabelText(/PCs fuera de servicio/)).toBeInTheDocument();
      expect(screen.getByLabelText('Buscar software')).toBeInTheDocument();
    });

    it('exige los campos obligatorios antes de crear', () => {
      montarAlta();
      const boton = screen.getByRole('button', { name: 'Crear espacio' });
      expect(boton).toBeDisabled();
      expect(screen.getByText('El código del espacio es obligatorio.')).toBeInTheDocument();
      expect(screen.getByText('El pabellón es obligatorio.')).toBeInTheDocument();
    });

    it('crea el espacio con todos sus campos', async () => {
      const { onGuardado } = montarAlta();
      fireEvent.change(screen.getByLabelText('Tipo de espacio'), {
        target: { value: 'LABORATORIO' },
      });
      fireEvent.change(screen.getByLabelText(/Código del espacio/), {
        target: { value: 'LAB-401' },
      });
      fireEvent.change(screen.getByLabelText(/Pabellón/), { target: { value: 'B' } });
      fireEvent.change(screen.getByLabelText(/^Piso/), { target: { value: '4' } });
      fireEvent.change(screen.getByLabelText(/Capacidad \(aforo nominal\)/), {
        target: { value: '25' },
      });

      const creado = espacio({ id: 'e3', identificador: 'LAB-401', pabellon: 'B', piso: 4 });
      crear.mockResolvedValue(creado);

      fireEvent.click(screen.getByRole('button', { name: 'Crear espacio' }));

      await waitFor(() => expect(crear).toHaveBeenCalledTimes(1));
      expect(crear).toHaveBeenCalledWith({
        identificador: 'LAB-401',
        tipo: 'LABORATORIO',
        pabellon: 'B',
        piso: 4,
        aforoNominal: 25,
        habilitado: true,
        contiguos: [],
        softwareIds: [],
        pcsMalogradas: 0,
      });
      expect(onGuardado).toHaveBeenCalledWith({ espacio: creado, alertas: [] });
    });

    it('no manda software ni PCs cuando el tipo es aula teórica', async () => {
      montarAlta();
      fireEvent.change(screen.getByLabelText(/Código del espacio/), {
        target: { value: 'AULA-9' },
      });
      fireEvent.change(screen.getByLabelText(/Pabellón/), { target: { value: 'A' } });
      fireEvent.change(screen.getByLabelText(/^Piso/), { target: { value: '1' } });
      fireEvent.change(screen.getByLabelText(/Capacidad \(aforo nominal\)/), {
        target: { value: '20' },
      });

      crear.mockResolvedValue(espacio({ identificador: 'AULA-9' }));
      fireEvent.click(screen.getByRole('button', { name: 'Crear espacio' }));

      await waitFor(() => expect(crear).toHaveBeenCalledTimes(1));
      const enviado = crear.mock.calls[0][0];
      expect(enviado.tipo).toBe('AULA_TEORICA');
      expect(enviado.softwareIds).toBeUndefined();
      expect(enviado.pcsMalogradas).toBeUndefined();
    });
  });
});
