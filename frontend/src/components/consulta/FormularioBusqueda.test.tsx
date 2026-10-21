import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { FormularioBusqueda } from './FormularioBusqueda';
import { detectarTipoCodigo } from '../../utils/consulta';
import api from '../../services/api';
import type { ConsultaAlumnoResponseDTO, ConsultaCursoResponseDTO } from '../../types/consulta';

vi.mock('../../services/api', () => ({
  default: {
    get: vi.fn(),
  },
  api: {
    get: vi.fn(),
  },
}));

describe('detectarTipoCodigo (Issue #134 / 3.5)', () => {
  it('detecta correctamente un código de alumno de 8 dígitos', () => {
    expect(detectarTipoCodigo('20200001')).toBe('ALUMNO');
    expect(detectarTipoCodigo('22200101')).toBe('ALUMNO');
  });

  it('detecta correctamente un código de curso con letras, números y guion', () => {
    expect(detectarTipoCodigo('CC-101')).toBe('CURSO');
    expect(detectarTipoCodigo('SI-201')).toBe('CURSO');
    expect(detectarTipoCodigo('is-301')).toBe('CURSO');
  });

  it('rechaza entradas vacías, con espacios o longitudes incorrectas', () => {
    expect(detectarTipoCodigo('')).toBeNull();
    expect(detectarTipoCodigo('   ')).toBeNull();
    expect(detectarTipoCodigo('2020 0001')).toBeNull();
    expect(detectarTipoCodigo('CC 101')).toBeNull();
    expect(detectarTipoCodigo('1234567')).toBeNull(); // 7 dígitos
    expect(detectarTipoCodigo('123456789')).toBeNull(); // 9 dígitos
    expect(detectarTipoCodigo('ALUMNO')).toBeNull();
    expect(detectarTipoCodigo('CC--101')).toBeNull();
  });
});

describe('FormularioBusqueda (Issue #134 / 3.5)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renderiza el campo accesible y el botón habilitado desde el inicio', () => {
    render(<FormularioBusqueda />);

    const input = screen.getByLabelText(/Código de alumno o curso/i);
    const boton = screen.getByRole('button', { name: /buscar/i });

    expect(input).toBeInTheDocument();
    expect(input).toHaveAttribute('placeholder', 'Ej. 20200001 o CC-101');
    expect(boton).toBeEnabled();

    // Texto de ayuda en 14 px (text-sm) visible inicialmente
    expect(
      screen.getByText(
        'Ingresa tu código de alumno (8 dígitos, ej: 20200001) o código de curso (ej: CC-101).',
      ),
    ).toBeInTheDocument();
  });

  it('mantiene el botón habilitado y valida el formato al intentar enviar', () => {
    render(<FormularioBusqueda />);

    const input = screen.getByLabelText(/Código de alumno o curso/i);
    const boton = screen.getByRole('button', { name: /buscar/i });

    // El botón no se deshabilita por el formato: al pulsarlo se explica qué corregir.
    fireEvent.change(input, { target: { value: '1234' } });
    expect(boton).toBeEnabled();
    fireEvent.click(boton);
    expect(
      screen.getByText('Ingresa 8 dígitos (alumno) o un código de curso como CC-101'),
    ).toBeInTheDocument();

    // Entrada válida de alumno (8 dígitos)
    fireEvent.change(input, { target: { value: '20200001' } });
    expect(boton).toBeEnabled();
    expect(screen.getByText('Estudiante detectado')).toBeInTheDocument();

    // Entrada válida de curso (CC-101)
    fireEvent.change(input, { target: { value: 'CC-101' } });
    expect(boton).toBeEnabled();
    expect(screen.getByText('Curso detectado')).toBeInTheDocument();
  });

  it('no muestra error de formato mientras el usuario escribe, pero sí al salir del campo (onBlur)', () => {
    render(<FormularioBusqueda />);

    const input = screen.getByLabelText(/Código de alumno o curso/i);

    // Usuario escribe formato incompleto: no debe haber alerta visible aún
    fireEvent.change(input, { target: { value: '12345' } });
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();

    // Usuario sale del campo (onBlur): debe aparecer el mensaje con icono
    fireEvent.blur(input);
    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(
      screen.getByText('Ingresa 8 dígitos (alumno) o un código de curso como CC-101'),
    ).toBeInTheDocument();

    // Si el usuario vuelve a escribir, el error desaparece inmediatamente
    fireEvent.change(input, { target: { value: '123456' } });
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('muestra mensaje de error de formato al intentar enviar con formato inválido', () => {
    render(<FormularioBusqueda />);

    const form = screen.getByLabelText('Formulario de consulta de espacios');
    const input = screen.getByLabelText(/Código de alumno o curso/i);

    fireEvent.change(input, { target: { value: 'ABC' } });
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();

    // Intento de envío del formulario
    fireEvent.submit(form);

    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(
      screen.getByText('Ingresa 8 dígitos (alumno) o un código de curso como CC-101'),
    ).toBeInTheDocument();
  });

  it('consulta endpoint de alumno cuando el código es de 8 dígitos y ejecuta onBuscar', async () => {
    const mockAlumnoData: ConsultaAlumnoResponseDTO = {
      alumno: {
        codigo: '20200001',
        nombre: 'Valeria López',
        correo: 'valeria.lopez@unmsm.edu.pe',
        movilidadReducida: false,
      },
      asignaciones: [],
    };

    vi.mocked(api.get).mockResolvedValueOnce({
      data: { success: true, data: mockAlumnoData },
    });

    const onBuscarMock = vi.fn();
    render(<FormularioBusqueda onBuscar={onBuscarMock} />);

    const input = screen.getByLabelText(/Código de alumno o curso/i);
    const boton = screen.getByRole('button', { name: /buscar/i });

    fireEvent.change(input, { target: { value: '20200001' } });
    fireEvent.click(boton);

    await waitFor(() => {
      expect(api.get).toHaveBeenCalledWith('/v1/consulta/alumno/20200001');
    });

    expect(onBuscarMock).toHaveBeenCalledWith(
      { tipo: 'ALUMNO', datos: mockAlumnoData },
      '20200001',
      'ALUMNO',
    );
  });

  it('consulta endpoint de curso cuando el código tiene guion y normaliza a mayúsculas', async () => {
    const mockCursoData: ConsultaCursoResponseDTO = {
      curso: {
        codigo: 'CC-101',
        nombre: 'Ciencias de la Computación I',
      },
      secciones: [],
    };

    vi.mocked(api.get).mockResolvedValueOnce({
      data: { success: true, data: mockCursoData },
    });

    const onBuscarMock = vi.fn();
    render(<FormularioBusqueda onBuscar={onBuscarMock} />);

    const input = screen.getByLabelText(/Código de alumno o curso/i);
    const boton = screen.getByRole('button', { name: /buscar/i });

    fireEvent.change(input, { target: { value: 'cc-101' } });
    fireEvent.click(boton);

    await waitFor(() => {
      expect(api.get).toHaveBeenCalledWith('/v1/consulta/curso/CC-101');
    });

    expect(onBuscarMock).toHaveBeenCalledWith(
      { tipo: 'CURSO', datos: mockCursoData },
      'CC-101',
      'CURSO',
    );
  });

  it('muestra un mensaje de conexión cuando el servidor no responde', async () => {
    vi.mocked(api.get).mockRejectedValueOnce(new Error('Network Error'));

    const onErrorMock = vi.fn();
    render(<FormularioBusqueda onError={onErrorMock} />);

    fireEvent.change(screen.getByLabelText(/Código de alumno o curso/i), {
      target: { value: '20200001' },
    });
    fireEvent.click(screen.getByRole('button', { name: /buscar/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent(/No se pudo conectar/i);
    expect(onErrorMock).toHaveBeenCalledWith(
      'No se pudo conectar con el servicio. Revisa tu conexión e inténtalo de nuevo.',
      undefined,
    );
  });

  it('muestra mensaje de error cuando el backend responde 404', async () => {
    vi.mocked(api.get).mockRejectedValueOnce({
      response: {
        status: 404,
        data: {
          success: false,
          message: 'No se encontró ningún estudiante con el código 20200001',
        },
      },
    });

    const onErrorMock = vi.fn();
    render(<FormularioBusqueda onError={onErrorMock} />);

    const input = screen.getByLabelText(/Código de alumno o curso/i);
    const boton = screen.getByRole('button', { name: /buscar/i });

    fireEvent.change(input, { target: { value: '20200001' } });
    fireEvent.click(boton);

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument();
    });

    expect(
      screen.getByText('No se encontró ningún estudiante con el código 20200001'),
    ).toBeInTheDocument();
    expect(onErrorMock).toHaveBeenCalledWith(
      'No se encontró ningún estudiante con el código 20200001',
      404,
    );

    // Al volver a escribir, el error debe desaparecer
    fireEvent.change(input, { target: { value: '20200002' } });
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('un campo vacío no se marca como error al salir de él', () => {
    render(<FormularioBusqueda />);
    const input = screen.getByLabelText(/Código de alumno o curso/i);

    fireEvent.focus(input);
    fireEvent.blur(input);

    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(input).toHaveAttribute('aria-invalid', 'false');
  });

  it('si se intenta enviar vacío pide el código con un mensaje propio', () => {
    render(<FormularioBusqueda />);

    fireEvent.submit(screen.getByLabelText('Formulario de consulta de espacios'));

    expect(screen.getByRole('alert')).toHaveTextContent(
      'Escribe tu código de alumno o el código de un curso.',
    );
  });

  it('avisa a la vista cuando se edita el campo', () => {
    const onCambio = vi.fn();
    render(<FormularioBusqueda onCambio={onCambio} />);

    fireEvent.change(screen.getByLabelText(/Código de alumno o curso/i), {
      target: { value: '2' },
    });

    expect(onCambio).toHaveBeenCalledTimes(1);
  });

  it('con mostrarErrorServidor desactivado no repite el error bajo el campo pero sí avisa por onError', async () => {
    vi.mocked(api.get).mockRejectedValueOnce(new Error('Network Error'));
    const onError = vi.fn();
    render(<FormularioBusqueda mostrarErrorServidor={false} onError={onError} />);

    fireEvent.change(screen.getByLabelText(/Código de alumno o curso/i), {
      target: { value: '20200001' },
    });
    fireEvent.click(screen.getByRole('button', { name: /buscar/i }));

    await waitFor(() => expect(onError).toHaveBeenCalled());
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});
