import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import AlertasAdmin from './AlertasAdmin';
import CambioLaboratorio from './CambioLaboratorio';
import CargaDatos from './CargaDatos';
import EspaciosAdmin from './EspaciosAdmin';
import InicioAdmin from './InicioAdmin';
import { ProveedorAvisos } from '../../components/ui/Avisos';
import {
  crearEspacio,
  editarEspacio,
  ejecutarCorrida,
  obtenerAlertas,
  obtenerCatalogoActivo,
  obtenerEscaladas,
  obtenerEspacios,
  obtenerLaboratorios,
  registrarPcsMalogradas,
  registrarSoftware,
  resolverAlerta,
  reintentarSeccion,
} from '../../services/admin';
import {
  esperarSinViolacionesGraves,
  REGLAS_INCOMPLETAS_EN_JSDOM,
  auditarAccesibilidad,
  reglasIncompletas,
} from '../../test/axe';
import type {
  AlertaDTO,
  EspacioAdminDTO,
  ResumenAsignacionDTO,
  SeccionesEscaladasDTO,
} from '../../types/admin';

/**
 * Accesibilidad del panel con axe (Issue 3.23 / spec 03).
 *
 * Solo fallan las violaciones de impacto `serious` o `critical` («0 violaciones de
 * accesibilidad grave»). Las violaciones `minor` y `moderate` se anotan en la salida de la
 * prueba, pero no rompen la build.
 */

let rol = 'COORDINACION_ACADEMICA';
vi.mock('../../context/useAuth', () => ({
  useAuth: () => ({ sesion: { rol }, cerrarSesion: vi.fn() }),
}));

vi.mock('../../services/admin', () => ({
  obtenerAlertas: vi.fn(),
  resolverAlerta: vi.fn(),
  obtenerEscaladas: vi.fn(),
  ejecutarCorrida: vi.fn(),
  reintentarSeccion: vi.fn(),
  obtenerEspacios: vi.fn(),
  obtenerEspacio: vi.fn(),
  crearEspacio: vi.fn(),
  editarEspacio: vi.fn(),
  obtenerLaboratorios: vi.fn(),
  obtenerCatalogoActivo: vi.fn(),
  registrarSoftware: vi.fn(),
  registrarPcsMalogradas: vi.fn(),
  importarCsv: vi.fn(),
  ordenarAlertasPorFecha: (a: AlertaDTO[]) => a,
}));

const alertas = vi.mocked(obtenerAlertas);
const escaladas = vi.mocked(obtenerEscaladas);
const espacios = vi.mocked(obtenerEspacios);
const laboratorios = vi.mocked(obtenerLaboratorios);
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
  camposEditables: [
    'identificador',
    'pabellon',
    'piso',
    'aforoNominal',
    'contiguos',
    'habilitado',
    'descripcionUso',
  ],
  ...o,
});

const alerta: AlertaDTO = {
  id: 'a1',
  tipo: 'SOFTWARE',
  estado: 'PENDIENTE',
  motivo: 'Falta MATLAB R2024a',
  fechaDeteccion: '2026-10-10T10:00:00.000Z',
  espacio: { id: 'e1', identificador: 'LAB-301', pabellon: 'A', piso: 3 },
  asignacionesAfectadas: [
    { asignacionId: 's1', codigoCurso: 'IS101', nombreCurso: 'Algoritmos', codigoSeccion: '01' },
  ],
};

const resumen: ResumenAsignacionDTO = {
  modo: 'periodo',
  periodo: '2026-II',
  corridaId: 'c1',
  totalSecciones: 10,
  asignadas: 6,
  mantenidas: 2,
  escaladas: 2,
  resultados: [],
  verificacion: null,
};

const seccionesEscaladas: SeccionesEscaladasDTO = {
  periodo: '2026-II',
  total: 1,
  secciones: [
    {
      asignacionId: 'x1',
      fechaEscalamiento: '2026-10-10T10:00:00Z',
      motivoEscalamiento: '[SIN_HORARIOS_DEFINIDOS] La sección 01 no tiene horario en 2026-II',
      seccion: {
        id: 'sec1',
        codigoCurso: 'IS101',
        nombreCurso: 'Algoritmos',
        codigoSeccion: '01',
        periodo: '2026-II',
        docenteNombre: null,
        tipoEspacioRequerido: 'AULA_TEORICA',
        alumnosMatriculados: 45,
      },
    },
  ],
};

function montar(elemento: React.ReactElement) {
  return render(
    <MemoryRouter>
      <ProveedorAvisos>{elemento}</ProveedorAvisos>
    </MemoryRouter>,
  );
}

describe('Accesibilidad del panel con axe (Issue 3.23)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    rol = 'COORDINACION_ACADEMICA';
    alertas.mockResolvedValue([alerta]);
    escaladas.mockResolvedValue(seccionesEscaladas);
    espacios.mockResolvedValue([
      espacio({}),
      espacio({
        id: 'e2',
        identificador: 'LAB-301',
        tipo: 'LABORATORIO',
        pcsMalogradas: 3,
        softwareInstalado: [{ id: 's1', nombre: 'MATLAB', version: 'R2024a' }],
        habilitado: false,
      }),
    ]);
    laboratorios.mockResolvedValue([
      espacio({
        id: 'l1',
        identificador: 'LAB-301',
        tipo: 'LABORATORIO',
        pcsMalogradas: 2,
        softwareInstalado: [{ id: 's1', nombre: 'MATLAB', version: 'R2024a' }],
      }),
    ]);
    catalogo.mockResolvedValue({
      items: [
        { id: 's1', nombre: 'MATLAB', version: 'R2024a', activo: true },
        { id: 's2', nombre: 'Python', version: '', activo: true },
      ],
      total: 2,
      page: 1,
      limit: 100,
    });
    vi.mocked(ejecutarCorrida).mockResolvedValue(resumen);
    vi.mocked(reintentarSeccion).mockResolvedValue({ ...resumen, modo: 'seccion' });
    vi.mocked(resolverAlerta).mockResolvedValue(undefined);
    vi.mocked(crearEspacio).mockResolvedValue(espacio({}));
    vi.mocked(editarEspacio).mockResolvedValue({ espacio: espacio({}), alertas: [] });
    vi.mocked(registrarSoftware).mockResolvedValue({});
    vi.mocked(registrarPcsMalogradas).mockResolvedValue({});
  });

  it('EspaciosAdmin no tiene violaciones de accesibilidad grave', async () => {
    const { container } = montar(<EspaciosAdmin />);
    await screen.findAllByText('AULA-101');
    await esperarSinViolacionesGraves(container, { nombre: 'EspaciosAdmin' });
  });

  it('el formulario de espacio dentro del drawer no tiene violaciones de accesibilidad grave', async () => {
    montar(<EspaciosAdmin />);
    await screen.findAllByText('AULA-101');

    fireEvent.click(screen.getAllByRole('button', { name: 'Ver detalle de AULA-101' })[0]);
    const drawer = await screen.findByRole('dialog');
    await esperarSinViolacionesGraves(drawer, { nombre: 'FormularioEspacio (detalle)' });

    fireEvent.click(screen.getByRole('button', { name: 'Editar espacio' }));
    await waitFor(() => expect(screen.getByRole('dialog')).toBeInTheDocument());
    await esperarSinViolacionesGraves(screen.getByRole('dialog'), {
      nombre: 'FormularioEspacio (edición)',
    });
  });

  it('AlertasAdmin no tiene violaciones de accesibilidad grave', async () => {
    const { container } = montar(<AlertasAdmin />);
    await screen.findByRole('article');
    await esperarSinViolacionesGraves(container, { nombre: 'AlertasAdmin' });
  });

  it('InicioAdmin no tiene violaciones de accesibilidad grave', async () => {
    const { container } = montar(<InicioAdmin />);
    await screen.findByText(/IS101/);
    await esperarSinViolacionesGraves(container, { nombre: 'InicioAdmin' });
  });

  it('CargaDatos no tiene violaciones de accesibilidad grave', async () => {
    const { container } = montar(<CargaDatos />);
    await screen.findByRole('region', { name: '2. Horarios' });
    await esperarSinViolacionesGraves(container, { nombre: 'CargaDatos' });
  });

  it('CambioLaboratorio no tiene violaciones de accesibilidad grave', async () => {
    rol = 'JEFATURA_LABORATORIOS';
    const { container } = montar(<CambioLaboratorio />);
    await screen.findByRole('option', { name: /LAB-301/ });
    await esperarSinViolacionesGraves(container, { nombre: 'CambioLaboratorio' });
  });

  /**
   * jsdom no aplica CSS ni calcula layout, así que axe no puede resolver el contraste de
   * color ni el texto visible de los controles: esas reglas quedan como «incomplete» y no
   * como violación. Se documentan aquí para que nadie las baje de umbral por error; el
   * contraste real se comprueba en el navegador.
   */
  it('deja sin verificar solo las reglas que jsdom no puede resolver', async () => {
    const { container } = montar(<EspaciosAdmin />);
    await screen.findAllByText('AULA-101');

    const resultado = await auditarAccesibilidad(container);
    const sinVerificar = reglasIncompletas(resultado);

    for (const regla of sinVerificar) {
      expect(REGLAS_INCOMPLETAS_EN_JSDOM).toContain(regla);
    }
  });
});
