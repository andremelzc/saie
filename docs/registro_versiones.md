# Registro de Versiones (Doc 6.8) — SAIE

> **Consulte el archivo principal:** [`CHANGELOG.md`](../CHANGELOG.md)

Este documento registra los cambios de esquema de datos, endpoints, servicios e importadores entregados en cada hito del proyecto **SAIE**.

Estado al **2026-10-15**. Cada versión corresponde a un conjunto de PR fusionados a `develop` y se alinea con los hitos (*milestones*) del repositorio.

---

## Historial Resumido de Entregas

| Versión | Fecha | Hito | Alcance Principal | PR | Issues Clave |
|---|---|---|---|---|---|
| **v1.8.0** | 2026-10-14 | Sprint 4 | Vista pública de consulta, horario y cursos del alumno, perfil con ficha médica | #278, #279 | #3.7, #3.16 |
| **v1.7.0** | 2026-10-13 | Sprint 3 | Home, logins por rol, manejo de sesión, formulario y tarjeta de consulta | #272 | #3.5, #3.6, #3.22, #4.25, #7.7 |
| **v1.6.0** | 2026-10-12 | Sprint 4 y cierre de Sprint 3 | Alertas, mapa de ocupación, incidencias, altas y cuentas, gestión de espacios, bus de eventos, Telegram, ruta de referencia y borrador del mapa 3D | #263, #264, #265, #266, #270, #271 | #2.16, #3.13, #3.14, #3.24 a #3.27, #4.6, #4.7, #4.11, #4.12, #4.22, #7.4, #7.6 |
| **v1.5.0** | 2026-10-10 | Sprint 3 | Seed de demostración, pruebas de integración, auditoría y SonarCloud en el CI | #257 | #5.7, #5.10b, #5.11, #5.17 |
| **v1.4.0** | 2026-10-08 | Sprint 3 | Autenticación por rol, alertas, portales de alumno y docente, orquestación del motor, asignación a demanda, importación por HTTP, migración inicial y CD separado | #240, #241, #242, #243, #244, #245, #246 | #2.10, #2.11, #2.12, #2.14, #2.15, #3.10 a #3.12, #3.21, #4.1 a #4.5, #4.8, #7.1 a #7.3, #7.5 |
| **v1.3.0** | 2026-10-04 | Sprint 2 | Reglas de software, accesibilidad y cercanía; consultas públicas; despliegue continuo; pruebas parametrizadas | #231, #234, #238, #239 | #1.10, #2.6 a #2.9, #2.13, #3.1 a #3.4, #5.5, #5.6, #5.13, #5.16 |
| **v1.2.0** | 2026-09-29 | Sprint 1 | Piezas base del algoritmo de asignación (Capacidad, Contigüidad, Disponibilidad, Bloques) | #232 | #2.1, #2.2, #2.3, #2.4, #2.5 |
| **v1.1.0** | 2026-09-28 | Sprint 1 | Importadores de Datos (Cursos, Horarios, Matrículas con movilidad reducida, Docentes) | #230 | #1.3, #1.4, #1.5, #1.6, #1.7, #1.8 |
| **v1.0.0** | 2026-09-27 | Setup | Monorepo base, Prisma Schema en Supabase, CI GitHub Actions, Specs Técnicas y `AGENTS.md` | #225, #228, #229, #233 | #1.1, #1.2, #5.10a, #6.8 |

Trabajo aún no fusionado a `develop` (espacios habilitados, seed desde Excel y corrección del CD): véase `[Sin publicar]` en el [`CHANGELOG.md`](../CHANGELOG.md).

---

## Estado de los Hitos

| Hito | Fecha límite | Cerrados | Abiertos | Estado | Versiones |
|---|---|---|---|---|---|
| Sprint 0 — Cimientos | 2026-09-24 | 8 | 0 | Cerrado | v1.0.0 |
| Sprint 1 — Piezas base del algoritmo | 2026-09-27 | 16 | 0 | Cerrado | v1.0.0 a v1.2.0 |
| Sprint 2 — Reglas de negocio del motor | 2026-10-11 | 14 | 0 | Cerrado | v1.3.0 |
| Sprint 3 — Integración | 2026-10-25 | 35 | 4 | Abierto | v1.4.0 a v1.7.0 |
| Sprint 4 — MVP funcional | 2026-11-08 | 12 | 26 | Abierto | v1.6.0, v1.8.0 |
| Sprint 5 — Estabilización | 2026-11-22 | 0 | 15 | Abierto | — |
| Cierre — Entrega y sustentación | 2026-11-29 | 0 | 5 | Abierto | — |

Pendientes del Sprint 3: #1.11 (importación, ya construida en #246), #6.10 (planos SVG por piso), el cambio de alcance de Telegram (#247) y #6.13 (documentos y BPMN).

---

## Cambios de Esquema de Datos

| Versión | Migración | Cambio |
|---|---|---|
| v1.4.0 | `20261008004857_init` | 18 tablas y 11 enums |
| v1.4.0 | `20261008005030_habilitar_rls` | Row Level Security en las tablas del modelo |
| v1.6.0 | `20261010000000_incidencia_cierre` | `Incidencia` gana `comentario_cierre` y `fecha_cierre` |
| v1.6.0 | `20261011000000_vinculacion_telegram` | Tabla `VinculacionTelegram` con Row Level Security |
| Sin publicar | `20261013000000_espacio_habilitado` | `Espacio.habilitado` y `Espacio.descripcionUso` |

---

Para el detalle descriptivo de cada versión, consulte [`CHANGELOG.md`](../CHANGELOG.md).
