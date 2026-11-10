import { describe, expect, it } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import VistaMapaRuta from './VistaMapaRuta';
import { ASIGNACIONES_EJEMPLO, rutaDeEjemplo, TIEMPOS } from './rutaEjemplo';
import { calcularTrazado, formatearDuracion } from './trazado';
import { centroDe, leerPlano2D } from '../mapa2d/plano';
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
  it('parte de la entrada principal y llega al aula, con un punto numerado por paso', () => {
    const t = calcularTrazado(rutaDeEjemplo(LAB_PISO_1, false), PLANOS_SVG);
    expect(Object.keys(t.capa)).toEqual(['1']);
    expect(t.capa[1].marcas.map((m) => [m.numero, m.tipo])).toEqual([
      [1, 'inicio'],
      [2, 'destino'],
    ]);
    // Del centro de la entrada al centro del laboratorio, con quiebres por el pasillo en medio.
    const lab = leerPlano2D(PLANOS_SVG[1]).figuras.find((f) => f.id === 'ANT-104')!;
    expect(t.capa[1].puntos.length).toBeGreaterThan(2);
    expect(t.capa[1].puntos.at(-1)).toEqual(centroDe(lab));
    expect(t.destinos).toEqual(['ANT-104']);
    expect(t.conector).toBeNull();
  });

  it('con cambio de piso dibuja un tramo por piso unidos por la misma escalera', () => {
    const t = calcularTrazado(rutaDeEjemplo(AULA_PISO_2, false), PLANOS_SVG);
    expect(Object.keys(t.capa)).toEqual(['1', '2']);
    expect(t.conector).toMatch(/-(escalera|ascensor)-/);
    expect(t.capa[1].puntos.at(-1)).toEqual(t.capa[2].puntos[0]);
    // Entrada principal, sube de piso, pasa al pabellón nuevo por el pasadizo, el aula.
    expect(t.pasos.map((p) => p.piso)).toEqual([1, 1, 2, 2]);
  });

  it('con movilidad reducida elige un ascensor del mismo pabellón', () => {
    const t = calcularTrazado(rutaDeEjemplo(BLOQUE_PISO_3, true), PLANOS_SVG);
    expect(t.conector).toMatch(/^ANT-ascensor-/);
    expect(t.destinos).toEqual(['ANT-301', 'ANT-302']);
    expect(t.capa[3].marcas.filter((m) => m.tipo === 'destino')).toHaveLength(2);
  });

  it('el recorrido sigue los pasillos: ningún tramo atraviesa un aula, laboratorio ni baño', () => {
    const ocupado = new Set([
      'aula',
      'laboratorio',
      'bano',
      'administrativo',
      'escalera',
      'ascensor',
    ]);
    for (const [a, esperado] of [
      [AULA_PISO_2, 'NUE-204'],
      [LAB_PISO_1, 'ANT-104'],
      [BLOQUE_PISO_3, 'ANT-301'],
    ] as const) {
      const t = calcularTrazado(rutaDeEjemplo(a, false), PLANOS_SVG);
      expect(t.destinos[0]).toBe(esperado);
      for (const [piso, trazo] of Object.entries(t.capa)) {
        const figuras = leerPlano2D(PLANOS_SVG[Number(piso)]).figuras.filter(
          (f) => ocupado.has(f.clase) && f.rect,
        );
        // Los centros (entrada, conector, aulas) están dentro de una figura: esos tramos se saltan.
        const centros = [
          ...t.destinos,
          t.conector ?? '',
          'entrada-1',
          'entrada-2',
          'entrada-3',
        ].flatMap((id) => {
          const f = leerPlano2D(PLANOS_SVG[Number(piso)]).figuras.find((q) => q.id === id);
          return f ? [centroDe(f)] : [];
        });
        const esCentro = (q: { x: number; y: number }) =>
          centros.some((c) => c.x === q.x && c.y === q.y);
        const pts = trazo.puntos;
        for (let k = 0; k < pts.length - 1; k++) {
          if (esCentro(pts[k]) || esCentro(pts[k + 1])) continue;
          for (let s = 0; s <= 20; s++) {
            const x = pts[k].x + ((pts[k + 1].x - pts[k].x) * s) / 20;
            const y = pts[k].y + ((pts[k + 1].y - pts[k].y) * s) / 20;
            const dentro = figuras.find(
              (f) =>
                x > f.rect!.x + 0.5 &&
                x < f.rect!.x + f.rect!.ancho - 0.5 &&
                y > f.rect!.y + 0.5 &&
                y < f.rect!.y + f.rect!.alto - 0.5,
            );
            // Salvo el conector elegido y el destino, que se tocan en su borde.
            expect(dentro?.id, `piso ${piso}, tramo ${k}: pasa por ${dentro?.id}`).toBeUndefined();
          }
        }
      }
    }
  });

  it('una ruta no disponible o con un espacio que no está en el plano no dibuja nada', () => {
    expect(calcularTrazado(rutaDeEjemplo(SIN_AULA, false), PLANOS_SVG).pasos).toEqual([]);
    const rara = rutaDeEjemplo(AULA_PISO_2, false);
    rara.tramos[2].espacioId = 'NUE-999';
    expect(calcularTrazado(rara, PLANOS_SVG).pasos).toEqual([]);
  });
});

describe('calcularTrazado con punto de partida', () => {
  const NUE_204 = rutaDeEjemplo(AULA_PISO_2, false);
  const ANT_104 = rutaDeEjemplo(LAB_PISO_1, false);
  const titulos = (t: ReturnType<typeof calcularTrazado>) => t.pasos.map((p) => p.tramo.titulo);

  it('al pabellón nuevo desde la entrada principal no obliga a salir al patio', () => {
    const t = calcularTrazado(NUE_204, PLANOS_SVG);
    expect(t.pasos[0]).toMatchObject({ focoId: 'entrada-1', tramo: { tipo: 'ORIGEN' } });
    expect(titulos(t)).not.toContain('Sal al patio');
    // El pasadizo interior es una forma de ir al nuevo, y aquí la más corta.
    expect(titulos(t)).toContain('Pasa al pabellón nuevo por el pasadizo');
    // La puerta del patio al nuevo no es un punto de partida: nunca abre la ruta.
    expect(t.pasos[0].focoId).not.toBe('entrada-2');
    // El tiempo del servidor no cuenta el paso al nuevo: no se muestra.
    expect(t.tiempoDelServidor).toBe(false);
  });

  it('en el mismo pabellón no hay paso de un pabellón a otro', () => {
    const t = calcularTrazado(ANT_104, PLANOS_SVG);
    expect(t.pasos.map((p) => p.focoId)).toEqual(['entrada-1', 'ANT-104']);
    expect(t.tiempoDelServidor).toBe(true);
  });

  it('desde otro espacio del mismo pabellón y piso va directo', () => {
    const t = calcularTrazado(ANT_104, PLANOS_SVG, { tipo: 'espacio', id: 'ANT-108' });
    expect(titulos(t)[0]).toBe('Sales de donde estás');
    expect(t.pasos.map((p) => p.focoId)).toEqual(['ANT-108', 'ANT-104']);
    expect(t.tiempoDelServidor).toBe(false);
  });

  it('de un piso alto al otro pabellón baja y sigue por el piso donde le conviene', () => {
    // Del aula 301 (piso 3, antiguo) al 204 (piso 2, nuevo): baja un piso y pasa por el pasadizo.
    const t = calcularTrazado(NUE_204, PLANOS_SVG, { tipo: 'espacio', id: 'ANT-301' });
    expect(t.pasos.map((p) => p.tramo.tipo)).toEqual([
      'ORIGEN',
      'CAMBIO_PISO',
      'PUERTA',
      'ESPACIO_ASIGNADO',
    ]);
    expect(t.pasos.map((p) => p.piso)).toEqual([3, 3, 2, 2]);
    expect(titulos(t)[1]).toMatch(/^Baja por /);
    expect(Object.keys(t.capa).sort()).toEqual(['2', '3']);
  });

  it('del pabellón nuevo al antiguo, en la planta baja, pasa por el pasadizo', () => {
    const t = calcularTrazado(ANT_104, PLANOS_SVG, { tipo: 'espacio', id: 'NUE-101' });
    expect(titulos(t)).toEqual([
      'Sales de donde estás',
      'Pasa al pabellón antiguo por el pasadizo',
      'Laboratorio: Aula 104 - Laboratorio 08',
    ]);
  });

  it('con movilidad reducida cambia de piso solo por ascensor', () => {
    const t = calcularTrazado(rutaDeEjemplo(AULA_PISO_2, true), PLANOS_SVG);
    expect(t.conector).toMatch(/-ascensor-/);
    expect(titulos(t).some((x) => /escalera/.test(x))).toBe(false);
  });

  it('no sale del recorrido si el espacio de origen es el mismo que el de destino', () => {
    expect(calcularTrazado(ANT_104, PLANOS_SVG, { tipo: 'espacio', id: 'ANT-104' }).pasos).toEqual(
      [],
    );
  });

  it('un punto de partida que no está en el plano no dibuja nada', () => {
    expect(calcularTrazado(NUE_204, PLANOS_SVG, { tipo: 'espacio', id: 'XXX-1' }).pasos).toEqual(
      [],
    );
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
    render(<VistaMapaRuta ruta={rutaDeEjemplo(LAB_PISO_1, false)} />);

    // Entrada principal y laboratorio del mismo pabellón: el tiempo del servidor vale.
    expect(screen.getByText('1 min 15 s')).toBeInTheDocument();
    const pasos = screen.getByRole('region', { name: 'Pasos de la ruta' });
    expect(within(pasos).getAllByRole('listitem')).toHaveLength(2);
    expect(screen.getByRole('group', { name: /Plano del piso 1/ })).toBeInTheDocument();
    expect(screen.getByText('Entrada')).toBeInTheDocument();
  });

  it('si hay que pasar al otro pabellón no promete un tiempo que el servidor no calculó', () => {
    render(<VistaMapaRuta ruta={rutaDeEjemplo(AULA_PISO_2, false)} />);

    expect(screen.queryByText('Tiempo estimado de caminata')).toBeNull();
    expect(screen.getByText('4 pasos')).toBeInTheDocument();
    expect(screen.getByText('Pasa al pabellón nuevo por el pasadizo')).toBeInTheDocument();
  });

  it('parte del espacio elegido cuando se da un origen', () => {
    render(
      <VistaMapaRuta
        ruta={rutaDeEjemplo(LAB_PISO_1, false)}
        origen={{ tipo: 'espacio', id: 'ANT-108' }}
      />,
    );
    expect(screen.getByText('Sales de donde estás')).toBeInTheDocument();
    expect(screen.getByText('Estás aquí')).toBeInTheDocument();
  });

  it('«Ver en el plano» lleva al piso del paso', () => {
    render(<VistaMapaRuta ruta={rutaDeEjemplo(AULA_PISO_2, false)} />);

    fireEvent.click(screen.getByRole('button', { name: 'Ver el paso 4 en el plano' }));

    expect(screen.getByRole('group', { name: /Plano del piso 2/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Ver el paso 4 en el plano' })).toHaveAttribute(
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
