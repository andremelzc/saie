import type React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import PerfilAlumno from './PerfilAlumno';
import { PERFIL_FIXTURE, PERFIL_VACIO_FIXTURE } from '../test/fixtures/perfil';
import { aplicarCambios } from '../utils/perfil';

type Props = Partial<React.ComponentProps<typeof PerfilAlumno>>;

function renderizar(props: Props = {}) {
  return render(
    <MemoryRouter>
      <PerfilAlumno
        perfil={PERFIL_FIXTURE}
        onGuardar={(cambios) => Promise.resolve(aplicarCambios(PERFIL_FIXTURE, cambios))}
        {...props}
      />
    </MemoryRouter>,
  );
}

const seccion = (nombre: RegExp) => screen.getByRole('region', { name: nombre });

describe('PerfilAlumno (Issue 3.17)', () => {
  it('muestra el título, los datos institucionales y el enlace para volver', () => {
    renderizar();

    expect(screen.getByRole('heading', { level: 1, name: 'Mi perfil' })).toBeVisible();
    expect(screen.getByRole('link', { name: /Volver al inicio/i })).toHaveAttribute(
      'href',
      '/estudiante',
    );
    const institucional = seccion(/Datos institucionales/i);
    expect(within(institucional).getByText('Ana Lucía Quispe Ramos')).toBeVisible();
    expect(within(institucional).getByText('22200001')).toBeVisible();
    expect(within(institucional).getByText('ana.quispe@unmsm.edu.pe')).toBeVisible();
    expect(within(institucional).getByText(/oficina académica/i)).toBeVisible();
  });

  it('no ofrece editar los datos institucionales', () => {
    renderizar();
    expect(within(seccion(/Datos institucionales/i)).queryByRole('button')).not.toBeInTheDocument();
  });

  it('muestra los datos personales y la ficha médica en modo lectura', () => {
    renderizar();

    const personales = seccion(/^Datos personales$/i);
    expect(within(personales).getByText('72345678')).toBeVisible();
    expect(within(personales).getByText('12 de abril de 2003')).toBeVisible();
    expect(within(personales).getByText('987654321')).toBeVisible();

    const ficha = seccion(/^Ficha médica$/i);
    expect(within(ficha).getByText('O+')).toBeVisible();
    expect(within(ficha).getByText('Penicilina')).toBeVisible();
    expect(within(ficha).getByText('Sin registrar')).toBeVisible();
  });

  it('avisa que la ficha médica es privada', () => {
    renderizar();
    expect(within(seccion(/^Ficha médica$/i)).getByText(/Solo tú la ves/i)).toBeVisible();
  });

  describe('edición de datos personales', () => {
    it('guarda los cambios y los muestra con una confirmación', async () => {
      renderizar();
      fireEvent.click(screen.getByRole('button', { name: /Editar datos personales/i }));

      // Al empezar a editar, el foco pasa al primer campo.
      expect(screen.getByLabelText('DNI')).toHaveFocus();
      const telefono = screen.getByLabelText('Teléfono');
      fireEvent.change(telefono, { target: { value: '911222333' } });
      fireEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }));

      await waitFor(() =>
        expect(screen.getByRole('status')).toHaveTextContent('Cambios guardados'),
      );
      const personales = seccion(/^Datos personales$/i);
      expect(within(personales).getByText('911222333')).toBeVisible();
      expect(within(personales).queryByText('987654321')).not.toBeInTheDocument();
    });

    it('no guarda si un dato es inválido y deja el error junto al campo', () => {
      const onGuardar = vi.fn();
      renderizar({ onGuardar });
      fireEvent.click(screen.getByRole('button', { name: /Editar datos personales/i }));

      const dni = screen.getByLabelText('DNI');
      fireEvent.change(dni, { target: { value: '123' } });
      fireEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }));

      expect(onGuardar).not.toHaveBeenCalled();
      expect(screen.getByText('El DNI debe tener 8 dígitos.')).toBeVisible();
      expect(dni).toHaveAttribute('aria-invalid', 'true');
      expect(dni).toHaveFocus();

      // El error desaparece al corregir el campo.
      fireEvent.change(dni, { target: { value: '12345678' } });
      expect(screen.queryByText('El DNI debe tener 8 dígitos.')).not.toBeInTheDocument();
    });

    it('cancelar descarta lo escrito y devuelve el foco al botón de editar', () => {
      renderizar();
      fireEvent.click(screen.getByRole('button', { name: /Editar datos personales/i }));
      fireEvent.change(screen.getByLabelText('Teléfono'), { target: { value: '900000000' } });
      fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }));

      const personales = seccion(/^Datos personales$/i);
      expect(within(personales).getByText('987654321')).toBeVisible();
      expect(screen.getByRole('button', { name: /Editar datos personales/i })).toHaveFocus();
    });

    it('envía solo los datos personales, con el vacío como null', async () => {
      const onGuardar = vi.fn((cambios) =>
        Promise.resolve(aplicarCambios(PERFIL_FIXTURE, cambios)),
      );
      renderizar({ onGuardar });
      fireEvent.click(screen.getByRole('button', { name: /Editar datos personales/i }));
      fireEvent.change(screen.getByLabelText('Dirección'), { target: { value: '' } });
      fireEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }));

      await waitFor(() => expect(onGuardar).toHaveBeenCalledTimes(1));
      expect(onGuardar).toHaveBeenCalledWith({
        datosPersonales: {
          dni: '72345678',
          fechaNacimiento: '2003-04-12',
          telefono: '987654321',
          direccion: null,
        },
      });
    });

    it('si el servidor falla, avisa y mantiene lo escrito en edición', async () => {
      // Un 400 con causa: se muestra la causa, no «Revisa tu conexión» (Issue 3.51).
      const onGuardar = vi.fn(() =>
        Promise.reject({
          response: { status: 400, data: { success: false, message: 'El teléfono no es válido' } },
        }),
      );
      renderizar({ onGuardar });
      fireEvent.click(screen.getByRole('button', { name: /Editar datos personales/i }));
      fireEvent.change(screen.getByLabelText('Teléfono'), { target: { value: '911222333' } });
      fireEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }));

      expect(await screen.findByRole('alert')).toHaveTextContent('El teléfono no es válido');
      expect(screen.getByLabelText('Teléfono')).toHaveValue('911222333');
      expect(screen.getByRole('button', { name: 'Guardar cambios' })).toBeEnabled();
    });
  });

  describe('ficha médica', () => {
    it('permite cambiar el tipo de sangre y guardarlo', async () => {
      renderizar();
      fireEvent.click(screen.getByRole('button', { name: /Editar ficha médica/i }));
      fireEvent.change(screen.getByLabelText('Tipo de sangre'), { target: { value: 'AB-' } });
      fireEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }));

      await waitFor(() =>
        expect(within(seccion(/^Ficha médica$/i)).getByText('AB-')).toBeVisible(),
      );
    });

    it('ofrece las ocho opciones de tipo de sangre', () => {
      renderizar();
      fireEvent.click(screen.getByRole('button', { name: /Editar ficha médica/i }));
      const select = screen.getByLabelText('Tipo de sangre');
      // Ocho tipos más «Sin registrar».
      expect(within(select).getAllByRole('option')).toHaveLength(9);
    });

    it('rechaza textos demasiado largos', () => {
      const onGuardar = vi.fn();
      renderizar({ onGuardar });
      fireEvent.click(screen.getByRole('button', { name: /Editar ficha médica/i }));
      fireEvent.change(screen.getByLabelText('Alergias'), { target: { value: 'a'.repeat(501) } });
      fireEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }));

      expect(onGuardar).not.toHaveBeenCalled();
      expect(screen.getByText('Usa como máximo 500 caracteres.')).toBeVisible();
    });

    it('si no hay ficha, invita a completarla', () => {
      renderizar({ perfil: PERFIL_VACIO_FIXTURE });

      const ficha = seccion(/^Ficha médica$/i);
      expect(within(ficha).getByText(/Aún no registras tu ficha médica/i)).toBeVisible();
      expect(within(ficha).getByRole('button', { name: /Completar ficha médica/i })).toBeVisible();
    });

    it('muestra la declaración de accesibilidad en modo lectura', () => {
      renderizar();
      const ficha = seccion(/^Ficha médica$/i);
      expect(within(ficha).getByText('No')).toBeVisible();
    });

    it('permite declarar una condición de accesibilidad y la envía al backend', async () => {
      const onGuardar = vi.fn((cambios) =>
        Promise.resolve(aplicarCambios(PERFIL_FIXTURE, cambios)),
      );
      renderizar({ onGuardar });
      fireEvent.click(screen.getByRole('button', { name: /Editar ficha médica/i }));

      const casilla = screen.getByRole('checkbox', {
        name: /condición física que te impide subir a pisos superiores/i,
      });
      expect(casilla).not.toBeChecked();
      fireEvent.click(casilla);
      fireEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }));

      await waitFor(() => expect(onGuardar).toHaveBeenCalledTimes(1));
      expect(onGuardar).toHaveBeenCalledWith({
        fichaMedica: expect.objectContaining({ condicionAccesible: true }),
      });
    });
  });

  describe('estados de carga', () => {
    it('muestra un indicador accesible mientras carga', () => {
      renderizar({ cargando: true });
      expect(screen.getByRole('status')).toHaveTextContent('Cargando tu perfil');
      expect(screen.queryByText('Ana Lucía Quispe Ramos')).not.toBeInTheDocument();
    });

    it('muestra el error con la opción de reintentar', () => {
      const onReintentar = vi.fn();
      renderizar({ error: 'Sin conexión.', onReintentar });

      expect(screen.getByRole('alert')).toHaveTextContent(
        'No pudimos cargar tu perfil. Sin conexión.',
      );
      fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }));
      expect(onReintentar).toHaveBeenCalledTimes(1);
    });
  });
});
