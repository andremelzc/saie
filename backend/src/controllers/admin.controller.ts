import { Request, Response } from 'express';
import {
  EstadoIncidencia,
  PrioridadIncidencia,
  TipoAlerta,
  TipoEspacio,
  TipoEventoAuditoria,
  EstadoAsignacion,
} from '@prisma/client';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { responderError } from '../lib/http';
import { filtrosDeMapa, MapaOcupacionQuerySchema } from '../lib/franja';
import { obtenerOcupacionPorPiso } from '../services/ocupacion.service';
import { listarSeccionesEscaladas } from '../services/revision.service';
import {
  actualizarEspacio,
  ActualizarEspacioSchema,
  crearEspacio,
  CrearEspacioSchema,
  listarEspacios,
  obtenerEspacioAdmin,
} from '../services/espacioAdmin.service';
import {
  actualizarSeccion,
  ActualizarSeccionSchema,
  FiltrosSeccionesSchema,
  listarDocentesParaAsignar,
  listarSecciones,
  obtenerSeccionAdmin,
} from '../services/seccionAdmin.service';
import {
  generarReporteAsignaciones,
  listarAuditoria,
  listarHistorialAsignaciones,
} from '../services/auditoria.service';
import {
  AltaAlumnoSchema,
  AltaDocenteSchema,
  crearAlumno,
  crearDocente,
} from '../services/usuario.service';
import {
  cerrarIncidencia,
  CerrarIncidenciaSchema,
  listarIncidencias,
} from '../services/incidenciaAdmin.service';
import { listarAlertasActivas, resolverAlerta } from '../services/alerta.service';
import { restablecerClave, RestablecerClaveSchema } from '../services/restablecerClave.service';
import {
  registrarCambioPcsMalogradas,
  registrarCambioSoftware,
} from '../services/laboratorio.service';

const LaboratorioParamSchema = z.object({
  id: z.string().min(1, 'El id del laboratorio es requerido'),
});

const AlertaParamSchema = z.object({
  id: z.string().min(1, 'El id de la alerta es requerido'),
});

const AlertasQuerySchema = z.object({
  tipo: z.enum(TipoAlerta, { error: 'El tipo de alerta no es válido' }).optional(),
  espacioId: z.string().trim().min(1).optional(),
});

const CambioSoftwareSchema = z.object({
  softwareIds: z
    .array(z.string().uuid('Cada software debe ser un id válido'))
    .max(100, 'Demasiados programas en la lista'),
});

const CambioPcsSchema = z.object({
  pcsMalogradas: z
    .number({ error: 'pcsMalogradas debe ser un número entero' })
    .int('pcsMalogradas debe ser un número entero')
    .min(0, 'pcsMalogradas no puede ser negativo'),
});

/**
 * Issue 4.1 — POST /api/v1/admin/laboratorios/:id/software
 * Coordinación (cualquier laboratorio) o Jefatura (solo los suyos).
 */
export async function registrarSoftwareLaboratorio(req: Request, res: Response): Promise<void> {
  try {
    const { id } = LaboratorioParamSchema.parse(req.params);
    const { softwareIds } = CambioSoftwareSchema.parse(req.body);
    const resultado = await registrarCambioSoftware(id, softwareIds, req.auth!, prisma);
    res.status(200).json({ success: true, data: resultado });
  } catch (error: unknown) {
    responderError(res, error);
  }
}

/**
 * Issue 4.2 — POST /api/v1/admin/laboratorios/:id/pcs-malogradas
 * Coordinación (cualquier laboratorio) o Jefatura (solo los suyos).
 */
export async function registrarPcsMalogradasLaboratorio(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    const { id } = LaboratorioParamSchema.parse(req.params);
    const { pcsMalogradas } = CambioPcsSchema.parse(req.body);
    const resultado = await registrarCambioPcsMalogradas(id, pcsMalogradas, req.auth!, prisma);
    res.status(200).json({ success: true, data: resultado });
  } catch (error: unknown) {
    responderError(res, error);
  }
}

/** Issue 4.6 — GET /api/v1/admin/alertas[?tipo=SOFTWARE|CAPACIDAD&espacioId=...] */
export async function listarAlertas(req: Request, res: Response): Promise<void> {
  try {
    const filtros = AlertasQuerySchema.parse(req.query);
    const data = await listarAlertasActivas(filtros, req.auth!, prisma);
    res.status(200).json({ success: true, data });
  } catch (error: unknown) {
    responderError(res, error);
  }
}

/** Issue 4.7 — PATCH /api/v1/admin/alertas/:id/resolver */
export async function resolverAlertaPendiente(req: Request, res: Response): Promise<void> {
  try {
    const { id } = AlertaParamSchema.parse(req.params);
    const data = await resolverAlerta(id, req.auth!, prisma);
    res.status(200).json({ success: true, data });
  } catch (error: unknown) {
    responderError(res, error);
  }
}

/**
 * Issue 4.12 — GET /api/v1/admin/mapa-ocupacion?pabellon=A&piso=1[&dia=&horaInicio=&horaFin=]
 * Sin franja se usa el momento actual (hora de Lima).
 */
export async function consultarMapaOcupacion(req: Request, res: Response): Promise<void> {
  try {
    const q = MapaOcupacionQuerySchema.parse(req.query);
    const data = await obtenerOcupacionPorPiso(filtrosDeMapa(q), prisma);
    res.status(200).json({ success: true, data });
  } catch (error: unknown) {
    responderError(res, error);
  }
}

const EscaladasQuerySchema = z.object({
  periodo: z
    .string()
    .trim()
    .regex(/^\d{4}-\d+$/, 'El periodo debe tener formato AAAA-N (ej. 2026-1)')
    .optional(),
});

/** Issue 4.22 — GET /api/v1/admin/secciones-escaladas[?periodo=2026-1] */
export async function listarEscaladas(req: Request, res: Response): Promise<void> {
  try {
    const { periodo } = EscaladasQuerySchema.parse(req.query);
    const data = await listarSeccionesEscaladas(periodo, prisma);
    res.status(200).json({ success: true, data });
  } catch (error: unknown) {
    responderError(res, error);
  }
}

const IncidenciasQuerySchema = z.object({
  estado: z.enum(EstadoIncidencia, { error: 'El estado no es válido' }).optional(),
  prioridad: z.enum(PrioridadIncidencia, { error: 'La prioridad no es válida' }).optional(),
  espacioId: z.string().trim().min(1).optional(),
});

/** Issue 7.6 — GET /api/v1/admin/incidencias[?estado=&prioridad=&espacioId=] */
export async function listarIncidenciasReportadas(req: Request, res: Response): Promise<void> {
  try {
    const filtros = IncidenciasQuerySchema.parse(req.query);
    const data = await listarIncidencias(filtros, req.auth!, prisma);
    res.status(200).json({ success: true, data });
  } catch (error: unknown) {
    responderError(res, error);
  }
}

/** Issue 7.6 — PATCH /api/v1/admin/incidencias/:id/resolver */
export async function resolverIncidencia(req: Request, res: Response): Promise<void> {
  try {
    const { id } = z
      .object({ id: z.string().min(1, 'El id de la incidencia es requerido') })
      .parse(req.params);
    const entrada = CerrarIncidenciaSchema.parse(req.body);
    const data = await cerrarIncidencia(id, entrada, req.auth!, prisma);
    res.status(200).json({ success: true, data });
  } catch (error: unknown) {
    responderError(res, error);
  }
}

/** Issue 4.17 — POST /api/v1/admin/alumnos (solo Coordinación Académica) */
export async function altaAlumno(req: Request, res: Response): Promise<void> {
  try {
    const entrada = AltaAlumnoSchema.parse(req.body);
    const data = await crearAlumno(entrada, prisma);
    res.status(201).json({ success: true, data });
  } catch (error: unknown) {
    responderError(res, error);
  }
}

/** Issue 4.18 — POST /api/v1/admin/docentes (solo Coordinación Académica) */
export async function altaDocente(req: Request, res: Response): Promise<void> {
  try {
    const entrada = AltaDocenteSchema.parse(req.body);
    const data = await crearDocente(entrada, prisma);
    res.status(201).json({ success: true, data });
  } catch (error: unknown) {
    responderError(res, error);
  }
}

const EspaciosQuerySchema = z.object({
  tipo: z.enum(TipoEspacio, { error: 'El tipo de espacio no es válido' }).optional(),
  pabellon: z.string().trim().min(1).optional(),
  piso: z.coerce.number().int('El piso debe ser un entero').optional(),
});

const EspacioParamSchema = z.object({
  id: z.string().min(1, 'El id del espacio es requerido'),
});

/** Issue 4.15 — GET /api/v1/admin/espacios[?tipo=&pabellon=&piso=] */
export async function listarEspaciosAdmin(req: Request, res: Response): Promise<void> {
  try {
    const filtros = EspaciosQuerySchema.parse(req.query);
    const data = await listarEspacios(filtros, req.auth!, prisma);
    res.status(200).json({ success: true, data });
  } catch (error: unknown) {
    responderError(res, error);
  }
}

/** Issue 4.15 — GET /api/v1/admin/espacios/:id */
export async function obtenerEspacio(req: Request, res: Response): Promise<void> {
  try {
    const { id } = EspacioParamSchema.parse(req.params);
    const data = await obtenerEspacioAdmin(id, req.auth!, prisma);
    res.status(200).json({ success: true, data });
  } catch (error: unknown) {
    responderError(res, error);
  }
}

/** Issue 4.15 — POST /api/v1/admin/espacios (solo Coordinación Académica) */
export async function altaEspacio(req: Request, res: Response): Promise<void> {
  try {
    const entrada = CrearEspacioSchema.parse(req.body);
    const data = await crearEspacio(entrada, req.auth!, prisma);
    res.status(201).json({ success: true, data });
  } catch (error: unknown) {
    responderError(res, error);
  }
}

/** Issue 4.15 — PATCH /api/v1/admin/espacios/:id (campos acotados por rol) */
export async function editarEspacio(req: Request, res: Response): Promise<void> {
  try {
    const { id } = EspacioParamSchema.parse(req.params);
    const entrada = ActualizarEspacioSchema.parse(req.body);
    const data = await actualizarEspacio(id, entrada, req.auth!, prisma);
    res.status(200).json({ success: true, data });
  } catch (error: unknown) {
    responderError(res, error);
  }
}

/**
 * Issue 4.26 — POST /api/v1/admin/usuarios/restablecer-clave (solo Coordinación Académica)
 * Responde con la clave inicial en claro una sola vez; por eso la respuesta no se guarda en cachés.
 */
export async function restablecerClaveUsuario(req: Request, res: Response): Promise<void> {
  try {
    const entrada = RestablecerClaveSchema.parse(req.body);
    const data = await restablecerClave(entrada, prisma);
    res.setHeader('Cache-Control', 'no-store');
    res.status(200).json({ success: true, data });
  } catch (error: unknown) {
    responderError(res, error);
  }
}

/**
 * Issue 4.31 — GET /api/v1/admin/secciones[?periodo=&q=&tipo=&pagina=]
 * Gestión individual de secciones: ver el catálogo del periodo y sus asignaciones.
 */
export async function listarSeccionesAdmin(req: Request, res: Response): Promise<void> {
  try {
    const filtros = FiltrosSeccionesSchema.parse(req.query);
    const data = await listarSecciones(filtros, req.auth!, prisma);
    res.status(200).json({ success: true, data });
  } catch (error: unknown) {
    responderError(res, error);
  }
}

/** Issue 4.31 — GET /api/v1/admin/secciones/:id */
export async function obtenerSeccion(req: Request, res: Response): Promise<void> {
  try {
    const { id } = z.object({ id: z.string().min(1) }).parse(req.params);
    const data = await obtenerSeccionAdmin(id, req.auth!, prisma);
    res.status(200).json({ success: true, data });
  } catch (error: unknown) {
    responderError(res, error);
  }
}

/** Issue 4.31 — GET /api/v1/admin/docentes (listado mínimo para asignar docente a una sección). */
export async function listarDocentes(req: Request, res: Response): Promise<void> {
  try {
    const data = await listarDocentesParaAsignar(prisma);
    res.status(200).json({ success: true, data });
  } catch (error: unknown) {
    responderError(res, error);
  }
}

/** Issue 4.31 — PATCH /api/v1/admin/secciones/:id (solo Coordinación Académica) */
export async function editarSeccion(req: Request, res: Response): Promise<void> {
  try {
    const { id } = z.object({ id: z.string().min(1) }).parse(req.params);
    const entrada = ActualizarSeccionSchema.parse(req.body);
    const data = await actualizarSeccion(id, entrada, req.auth!, prisma);
    res.status(200).json({ success: true, data });
  } catch (error: unknown) {
    responderError(res, error);
  }
}

const AuditoriaQuerySchema = z
  .object({
    tipo: z.enum(TipoEventoAuditoria, { error: 'El tipo de evento no es válido' }).optional(),
    desde: z.coerce.date().optional(),
    hasta: z.coerce.date().optional(),
    pagina: z.coerce.number().int().min(1).default(1),
    limite: z.coerce.number().int().min(1).max(200).default(50),
  })
  .strict();

/** Issue 4.32 — GET /api/v1/admin/auditoria[?tipo=&desde=&hasta=&pagina=] */
export async function listarRegistrosAuditoria(req: Request, res: Response): Promise<void> {
  try {
    const filtros = AuditoriaQuerySchema.parse(req.query);
    const data = await listarAuditoria(filtros, prisma);
    res.status(200).json({ success: true, data });
  } catch (error: unknown) {
    responderError(res, error);
  }
}

const HistorialQuerySchema = z
  .object({
    seccionId: z.string().trim().min(1).optional(),
    periodo: z
      .string()
      .trim()
      .regex(/^\d{4}-\d+$/, 'El periodo debe tener formato AAAA-N (ej. 2026-1)')
      .optional(),
    estado: z.enum(EstadoAsignacion, { error: 'El estado no es válido' }).optional(),
    pagina: z.coerce.number().int().min(1).default(1),
    limite: z.coerce.number().int().min(1).max(200).default(50),
  })
  .strict();

/** Issue 4.32 — GET /api/v1/admin/asignaciones/historial[?seccionId=&periodo=&estado=] */
export async function listarHistorial(req: Request, res: Response): Promise<void> {
  try {
    const filtros = HistorialQuerySchema.parse(req.query);
    const data = await listarHistorialAsignaciones(filtros, prisma);
    res.status(200).json({ success: true, data });
  } catch (error: unknown) {
    responderError(res, error);
  }
}

/** Issue 4.33 — GET /api/v1/admin/reporte/asignaciones[?periodo=] */
export async function consultarReporteAsignaciones(req: Request, res: Response): Promise<void> {
  try {
    const { periodo } = z
      .object({
        periodo: z
          .string()
          .trim()
          .regex(/^\d{4}-\d+$/, 'El periodo debe tener formato AAAA-N (ej. 2026-1)')
          .optional(),
      })
      .parse(req.query);
    const data = await generarReporteAsignaciones(periodo, prisma);
    res.status(200).json({ success: true, data });
  } catch (error: unknown) {
    responderError(res, error);
  }
}
