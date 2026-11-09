import { describe, expect, it } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import VistaMapaRuta from './VistaMapaRuta';
import { ASIGNACIONES_EJEMPLO, rutaDeEjemplo, TIEMPOS } from './rutaEjemplo';
import { calcularTrazado, formatearDuracion } from './trazado';
import { PLANOS_SVG } from '../mapa2d/planos';

const [AULA_PISO_2, LAB_PISO_1, BLOQUE_PISO_3, SIN_AULA] = ASIGNACIONES_EJEMPLO;

describe('rutaDeEjemplo', () => {
  it('suma los tiempos con las mismas constantes del backend', () => {
    const ruta = rutaDeEjemplo(AULA_PISO_2, false);
    expect(ruta.tramos.map((t) => t.tipo)).toEqual([
      'ENTRADA_PABELLON',
      'CAMBIO_PISO',
      'ESPACIO_ASIGNADO',
    ]);
    expect(ruta.tiempoEstimadoTotalSegundos).toBe(
      TIEMPOS.entrada + TIEMPOS.porPisoEscalera + TIEMPOS.transito,
    );
  });

  it('con movilidad reducida usa el ascensor y es más corta', () => {
    const normal = rutaDeEjemplo(BLOQUE_PISO_3, false);
    const accesible = rutaDeEjemplo(BLOQUE_PISO_3, true);
    expect(accesible.tiempoEstimadoTotalSegundos).toBeLessThan(normal.tiempoEstimadoTotalSegundos);
    expect(accesible.tramos[1].titulo).toMatch(/ascensor accesible/);
  });

  it('en el piso 1 omite el cambio de piso; sin aula no hay ruta', () => {
    expect(rutaDeEjemplo(LAB_PISO_1, false).tramos.map((t) => t.tipo)).not.toContain('CAMBIO_PISO');
    expect(rutaDeEjemplo(SIN_AULA, false)).toMatchObject({
      estado: 'RUTA_NO_DISPONIBLE',
      tramos: [],
      tiempoEstimadoTotalSegundos: 0,
    });
  });
});

describe('calcularTrazado', () => {
  it('parte de la entrada del pabellón y llega al aula, con un punto numerado por paso', () => {
    const t = calcularTrazado(rutaDeEjemplo(LAB_PISO_1, false), PLANOS_SVG);
    expect(Object.keys(t.capa)).toEqual(['1']);
    expect(t.capa[1].marcas.map((m) => [m.numero, m.tipo])).toEqual([
      [1, 'inicio'],
      [2, 'destino'],
    ]);
    expect(t.capa[1].puntos).toHaveLength(2);
    expect(t.destinos).toEqual(['ANT-104']);
    expect(t.conector).toBeNull();
  });

  it('con cambio de piso dibuja un tramo por piso unidos por la misma escalera', () => {
    const t = calcularTrazado(rutaDeEjemplo(AULA_PISO_2, false), PLANOS_SVG);
    expect(Object.keys(t.capa)).toEqual(['1', '2']);
    expect(t.conector).toMatch(/^NUE-escalera-/);
    expect(t.capa[1].puntos.at(-1)).toEqual(t.capa[2].puntos[0]);
    expect(t.pasos.map((p) => p.piso)).toEqual([1, 1, 2]);
  });

  it('con movilidad reducida elige un ascensor del mismo pabellón', () => {
    const t = calcularTrazado(rutaDeEjemplo(BLOQUE_PISO_3, true), PLANOS_SVG);
    expect(t.conector).toMatch(/^ANT-ascensor-/);
    expect(t.destinos).toEqual(['ANT-301', 'ANT-302']);
    expect(t.capa[3].marcas.filter((m) => m.tipo === 'destino')).toHaveLength(2);
  });

  it('una ruta no disponible o con un espacio que no está en el plano no dibuja nada', () => {
    expect(calcularTrazado(rutaDeEjemplo(SIN_AULA, false), PLANOS_SVG).pasos).toEqual([]);
    const rara = rutaDeEjemplo(AULA_PISO_2, false);
    rara.tramos[2].espacioId = 'NUE-999';
    expect(calcularTrazado(rara, PLANOS_SVG).pasos).toEqual([]);
  });
});

describe('formatearDuracion', () => {
  it('da minutos y segundos legibles', () => {
    expect(formatearDuracion(45)).toBe('45 s');
    expect(formatearDuracion(120)).toBe('2 min');
    expect(formatearDuracion(135)).toBe('2 min 15 s');
  });
});

describe('VistaMapaRuta', () => {
  it('muestra el tiempo, los pasos y el plano del piso de la entrada', () => {
    render(<VistaMapaRuta ruta={rutaDeEjemplo(AULA_PISO_2, false)} />);

    expect(screen.getByText('2 min 15 s')).toBeInTheDocument();
    const pasos = screen.getByRole('region', { name: 'Pasos de la ruta' });
    expect(within(pasos).getAllByRole('listitem')).toHaveLength(3);
    expect(screen.getByRole('group', { name: /Plano del piso 1/ })).toBeInTheDocument();
    expect(screen.getByText('Entrada')).toBeInTheDocument();
  });

  it('«Ver en el plano» lleva al piso del paso', () => {
    render(<VistaMapaRuta ruta={rutaDeEjemplo(AULA_PISO_2, false)} />);

    fireEvent.click(screen.getByRole('button', { name: 'Ver el paso 3 en el plano' }));

    expect(screen.getByRole('group', { name: /Plano del piso 2/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Ver el paso 3 en el plano' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
  });

  it('marca la subida accesible y lo dice en el resumen', () => {
    render(<VistaMapaRuta ruta={rutaDeEjemplo(AULA_PISO_2, true)} />);
    expect(screen.getByText('Accesible')).toBeInTheDocument();
    expect(screen.getByText(/ruta accesible por ascensor/)).toBeInTheDocument();
  });

  it('si la ruta no está disponible lo dice con el mensaje y no dibuja el plano', () => {
    render(<VistaMapaRuta ruta={rutaDeEjemplo(SIN_AULA, false)} />);

    const aviso = screen.getByRole('alert');
    expect(aviso).toHaveTextContent('Ruta no disponible');
    expect(aviso).toHaveTextContent('La asignación no cuenta con espacios registrados.');
    expect(screen.queryByRole('group', { name: /Plano del piso/ })).toBeNull();
  });
});
