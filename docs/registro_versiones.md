# Registro de Versiones (Doc 6.8) — SAIE

> **Consulte el archivo principal:** [`CHANGELOG.md`](../CHANGELOG.md)

Este documento registra los cambios de esquema de datos, endpoints, servicios e importadores entregados en cada hito del proyecto **SAIE**.

Estado al **2026-11-25**. Cada versión corresponde a un conjunto de PR fusionados a `develop` y se alinea con los hitos (*milestones*) del repositorio.

---

## Historial Resumido de Entregas

| Versión | Fecha | Hito | Alcance Principal | PR | Issues Clave |
|---|---|---|---|---|---|
| **v1.12.0** | 2026-11-25 | Sprint 5 (cierre) y Sprint 6 — Correcciones de la auditoría | Logger, `X-Request-Id` y `/health` con base de datos; auditoría estructurada y de acciones de personas; registro de importaciones; incidencias del docente; gestión de periodos; correcciones de la auditoría final (doble reserva, importación todo o nada, reubicación, alerta de accesibilidad); vista previa de importación y secciones inactivas; avisos a Jefatura; edición del horario de una sección; confirmación de la declaración de accesibilidad; reorganización con prioridad | #398, #399, #404 a #407, #441 a #448 | #1.15 a #1.19, #2.20 a #2.22, #2.25, #2.26, #3.60, #3.62 a #3.64, #4.48, #4.54, #4.58 a #4.60, #4.62, #4.64, #5.14, #7.13 a #7.16 |
| **v1.11.0** | 2026-11-11 | Sprint 4 — Control, excepciones y validación, y Sprint 5 | Cambio de clave obligatorio; planos reales y mapa 2D/3D; portal docente e incidencias de Jefatura; inicio de Jefatura; catálogo y solicitudes de software; periodos; endurecimiento HTTP; paginador, filtros y estado de asignación únicos; estabilización de la interfaz | #377, #378, #386 a #396 | #1.12, #3.37 a #3.57, #4.16 a #4.18, #4.21, #4.26, #4.29, #4.30, #4.38 a #4.47, #4.49 a #4.53, #4.56, #4.57, #7.8 a #7.12 |
| **v1.10.0** | 2026-10-28 | Sprint 3.1 | Auditoría de UI/UX (etapas 1 a 4), navegación responsive, cabecera única del alumno, runbook de rollback, paginación acotada, errores 404/500 estándar y clave inicial no derivable | #316, #375, #380 a #385 | #1.13, #1.14, #3.32 a #3.36, #4.35 a #4.37, #5.25, #5.26, #5.28 |
| **v1.9.0** | 2026-10-21 | Sprint 3 — MVP funcional (cierre) | Espacios habilitados, seed desde Excel, batch masivo, verificador de la corrida, asignación programada, catálogo de software, panel administrativo y su sistema de diseño, gestión individual de secciones, historial, informe y exportador de CSVs, pruebas k6, E2E y de accesibilidad, cobertura ≥ 85 %. Primera publicación en `main` (#313, #315) | #277, #284, #285, #288, #290 a #293, #295, #296, #298 a #302, #310 a #312, #314 | #1.9, #1.11, #2.17, #2.18, #3.17, #3.29 a #3.31, #4.9, #4.10, #4.15, #4.19, #4.20, #4.27, #4.28, #4.31 a #4.34, #5.8, #5.9, #5.15, #5.18, #5.20 a #5.24, #6.13 |
| **v1.8.0** | 2026-10-14 | Sprint 4 | Vista pública de consulta, horario y cursos del alumno, perfil con ficha médica | #278, #279 | #3.7, #3.16 |
| **v1.7.0** | 2026-10-13 | Sprint 3 | Home, logins por rol, manejo de sesión, formulario y tarjeta de consulta | #272 | #3.5, #3.6, #3.22, #4.25, #7.7 |
| **v1.6.0** | 2026-10-12 | Sprint 4 y cierre de Sprint 3 | Alertas, mapa de ocupación, incidencias, altas y cuentas, gestión de espacios, bus de eventos, Telegram, ruta de referencia y borrador del mapa 3D | #263, #264, #265, #266, #270, #271 | #2.16, #3.13, #3.14, #3.24 a #3.27, #4.6, #4.7, #4.11, #4.12, #4.22, #7.4, #7.6 |
| **v1.5.0** | 2026-10-10 | Sprint 3 | Seed de demostración, pruebas de integración, auditoría y SonarCloud en el CI | #257 | #5.7, #5.10b, #5.11, #5.17 |
| **v1.4.0** | 2026-10-08 | Sprint 3 | Autenticación por rol, alertas, portales de alumno y docente, orquestación del motor, asignación a demanda, importación por HTTP, migración inicial y CD separado | #240, #241, #242, #243, #244, #245, #246 | #2.10, #2.11, #2.12, #2.14, #2.15, #3.10 a #3.12, #3.21, #4.1 a #4.5, #4.8, #7.1 a #7.3, #7.5 |
| **v1.3.0** | 2026-10-04 | Sprint 2 | Reglas de software, accesibilidad y cercanía; consultas públicas; despliegue continuo; pruebas parametrizadas | #231, #234, #238, #239 | #1.10, #2.6 a #2.9, #2.13, #3.1 a #3.4, #5.5, #5.6, #5.13, #5.16 |
| **v1.2.0** | 2026-09-29 | Sprint 1 | Piezas base del algoritmo de asignación (Capacidad, Contigüidad, Disponibilidad, Bloques), pruebas unitarias de esas piezas, Documento de Diseño UI/UX y Guía de Estilos | #232, #235, #236, #237 | #2.1 a #2.5, #5.1 a #5.4, #6.6, #6.7 |
| **v1.1.0** | 2026-09-28 | Sprint 1 | Importadores de Datos (Cursos, Horarios, Matrículas con movilidad reducida, Docentes) | #230 | #1.3, #1.4, #1.5, #1.6, #1.7, #1.8 |
| **v1.0.0** | 2026-09-27 | Setup | Monorepo base, documentos de línea base, arquitectura y modelo de datos, Prisma Schema en Supabase, Plan Maestro de Pruebas, CI GitHub Actions, Specs Técnicas, `AGENTS.md` y Registro de Versiones | #225, #226, #227, #228, #229, #233 | #1.1, #1.2, #5.10a, #5.12, #6.1 a #6.5, #6.8 |

No hay trabajo fusionado a `develop` pendiente de versionar: la sección `[Sin publicar]` del [`CHANGELOG.md`](../CHANGELOG.md) está vacía. `main` sigue en la v1.9.0; las versiones v1.10.0 a v1.12.0 están en `develop`.

Los hitos se renombraron durante el proyecto: la columna «Hito» de las versiones v1.4.0 a v1.8.0 conserva el nombre que tenían al publicarse.

---

## Estado de los Hitos

| Hito | Fecha límite | Cerrados | Abiertos | Estado | Versiones |
|---|---|---|---|---|---|
| Sprint 0 — Cimientos | 2026-09-24 | 8 | 0 | Cerrado | v1.0.0 |
| Sprint 1 — Piezas base del algoritmo | 2026-09-27 | 16 | 0 | Cerrado | v1.0.0 a v1.2.0 |
| Sprint 2 — Reglas de negocio del motor | 2026-10-11 | 14 | 0 | Cerrado | v1.3.0 |
| Sprint 3 — MVP funcional | 2026-10-21 | 67 | 0 | Cerrado | v1.4.0 a v1.9.0 |
| Sprint 3.1 | 2026-10-28 | 8 | 0 | Cerrado | v1.10.0 |
| Sprint 4 — Control, excepciones y validación | 2026-11-04 | 36 | 0 | Cerrado | v1.10.0, v1.11.0 |
| Sprint 5 — Estabilización | 2026-11-11 | 52 | 1 | Abierto | v1.10.0 a v1.12.0 |
| Sprint 6 — Correcciones de la auditoría | — | 18 | 14 | Abierto | v1.12.0 |
| Cierre — Entrega y sustentación | 2026-11-11 | 2 | 3 | Abierto | — |

Pendiente del Sprint 5: 4.55 (#346), el estado de la última carga tomado del servidor.

Pendientes del Sprint 6: 1.20 (#432), 2.23 (#412), 2.24 (#413), 3.59 (#416), 3.61 (#418), 4.61 (#424), 4.63 (#426), 5.30 (#433), 5.33 (#440), 6.14 (#438), 6.15 (#439), 7.17 (#435), 7.18 (#436) y 7.19 (#437).

Pendientes del Cierre: 6.9 (#197, documentación final y material de sustentación), 6.11 (#223, ensayo y lista previa a la demo) y 6.12 (#224, entrega final).

---

## Cambios de Esquema de Datos

| Versión | Migración | Cambio |
|---|---|---|
| v1.4.0 | `20261008004857_init` | 18 tablas y 11 enums |
| v1.4.0 | `20261008005030_habilitar_rls` | Row Level Security en las tablas del modelo |
| v1.6.0 | `20261010000000_incidencia_cierre` | `Incidencia` gana `comentario_cierre` y `fecha_cierre` |
| v1.6.0 | `20261011000000_vinculacion_telegram` | Tabla `VinculacionTelegram` con Row Level Security |
| v1.9.0 | `20261013000000_espacio_habilitado` | `Espacio.habilitado` y `Espacio.descripcionUso` |
| v1.9.0 | `20261014000000_espacio_distancia_ascensor` | `Espacio.distanciaAscensor`, base de la regla de accesibilidad |
| v1.9.0 | `20261019000000_auditoria_verificacion` | Valor `VERIFICACION` en `TipoEventoAuditoria` para el verificador de la corrida |
| v1.9.0 | `20261020000000_catalogo_software` | Tablas `Software`, `EspacioSoftware` y `SeccionSoftware` (migración aditiva) |
| v1.9.0 | `20261021000000_catalogo_software_limpieza` | Copia el texto libre al catálogo y elimina `software_instalado` y `stack_software_requerido` |
| v1.9.0 | `20261021000000_ficha_accesible` | Condición de accesibilidad declarada en la ficha médica |
| v1.9.0 | `20261022000000_solicitudes_software` | Tabla `SolicitudSoftware` y enum `EstadoSolicitud` |
| v1.12.0 | `20261111000000_auditoria_estructurada` | `RegistroAuditoria` gana `corridaId`, `espaciosIds`, `cuentaId`, `puntaje` y `origen` |
| v1.12.0 | `20261124000000_auditoria_acciones_personas` | Eventos `EDICION_ESPACIO`, `EDICION_SECCION` y `CAMBIO_LABORATORIO` |
| v1.12.0 | `20261124000100_importaciones` | Tabla de registro de importaciones |
| v1.12.0 | `20261125000000_alerta_accesibilidad` | Valor `ACCESIBILIDAD` en `TipoAlerta` |
| v1.12.0 | `20261126000000_periodos` | Tabla `Periodo` con estados y evento `CAMBIO_PERIODO` |
| v1.12.0 | `20261127000000_seccion_activa` | `Seccion.activa` para las secciones que dejan de figurar en el CSV |
| v1.12.0 | `20261128000000_solicitudes_accesibilidad` | Tabla `SolicitudAccesibilidad` con Row Level Security |

---

Para el detalle descriptivo de cada versión, consulte [`CHANGELOG.md`](../CHANGELOG.md).
