# Informe final — SAIE

> **Sistema de Asignación Inteligente de Espacios**
> Facultad de Ingeniería de Sistemas e Informática — UNMSM · Escuela de Ingeniería de Software · Grupo 6 · 2026
> **Autores:** Carrasco Flores, Gutiérrez Bendezú, Jimenez Vera, Medrano Ayma, Meléndez Cava
> **Issue:** 6.9 (#197) · **Estado al:** 25/11/2026 · **Rama:** `develop`

---

## 1. Resumen

SAIE asigna las aulas teóricas y los laboratorios de la FISI a las secciones de cada periodo y muestra el resultado a cada persona según su rol. El motor combina **capacidad real** (aforo menos PCs malogradas), **disponibilidad horaria**, **contigüidad física** entre espacios, **compatibilidad de software**, **cercanía entre secciones paralelas** y **prioridad de accesibilidad** para personas con movilidad reducida. Lo que no puede resolver lo **escala** a Coordinación con un motivo, en lugar de publicar un aula incorrecta.

El sistema está desplegado (frontend en Vercel, backend en Render, base en Supabase) con integración y despliegue continuos, y cuenta con cuatro portales: estudiante, docente, Coordinación Académica y Jefatura de Laboratorios.

---

## 2. Problema y objetivos

**Problema.** La asignación manual de espacios no considera las PCs malogradas de los laboratorios, el software instalado ni la accesibilidad, y el resultado llega a los alumnos por PDF o por grupos informales.

**Objetivos** (de [Alcance y reglas](03_alcance_y_reglas.md) y [Requisitos](02_requisitos.md), 38 requisitos funcionales y no funcionales):

1. Asignar automáticamente todas las secciones de un periodo respetando las reglas duras y optimizando las blandas.
2. Que un estudiante encuentre su aula sin preguntar a nadie, incluso desde el celular.
3. Que Jefatura mantenga al día el estado de los laboratorios y que esos cambios lleguen a tiempo a quien debe actuar.
4. Que Coordinación resuelva las excepciones con información suficiente y trazabilidad.

---

## 3. Alcance entregado

| Épica | Qué se entregó |
|---|---|
| **Setup e importación** | Monorepo, esquema en Supabase con Prisma, importadores CSV de docentes, cursos y secciones, horarios y matrículas (todo o nada, vista previa, avance, Excel en español), seed desde Excel. |
| **Motor de asignación** | Reglas de capacidad, disponibilidad, contigüidad (hasta 4 espacios), software, accesibilidad (piso 1 primero) y cercanía; corrida batch, reasignación de una sección, reubicación desde alertas, reorganización con prioridad al inicio del ciclo y corrida nocturna programada; verificador de dobles reservas; bus de eventos interno. |
| **Portal del estudiante** | Consulta pública, inicio, horario, perfil con ficha médica y declaración de movilidad reducida con aprobación, mapa 2D y maqueta 3D, ruta de referencia, ajustes de accesibilidad y avisos por Telegram (cambio de aula y resumen diario). |
| **Portal del docente** | Horario, explorador de espacios, estado de laboratorios, incidencias con foto, solicitudes de software, solicitud para dictar en laboratorio y declaración de accesibilidad. |
| **Panel administrativo** | Inicio con métricas y escaladas, espacios, secciones (incluido el horario), alertas, accesibilidad, carga de datos, periodos, catálogo y solicitudes de software, incidencias, cuentas y claves, historial y auditoría, mapa e informe de salones; vista de Jefatura con laboratorios y cambio de laboratorio; avisos a Jefatura por Telegram. |
| **Calidad y operación** | Pruebas unitarias, de integración, E2E con auditoría de accesibilidad y de carga; CI/CD con verificación de salud; runbook de rollback; límites de intentos; registro estructurado con identificador de petición; bloqueo de corridas en la base. |

Los manuales describen el uso ([Manual de usuario](manual_usuario.md)) y la operación ([Manual técnico](manual_tecnico.md)).

---

## 4. Arquitectura

SPA en React 19 + Tailwind CSS 4 que consume una API REST en Express 5 + TypeScript; Prisma sobre PostgreSQL. Un **motor único** sirve a aulas y laboratorios mediante la entidad genérica `Espacio` con discriminador de tipo. Los cambios que afectan asignaciones emiten eventos internos (`asignacion.cambiada`, `alerta.creada`, `incidencia.registrada`, `accesibilidad.resuelta`) que alimentan los avisos por Telegram. Detalle en el [Documento de Arquitectura](arquitectura.md) y el [Modelo de Datos](modelo-datos.md).

| Indicador | Valor |
|---|---|
| Migraciones de base de datos | 21 |
| Rutas de la API | ~80 |
| Pantallas de la SPA | 38 rutas, más inicio y «no encontrada» |
| Especificaciones técnicas | 8 (`docs/specs/`) |

---

## 5. Gestión del proyecto

Se trabajó con *feature branching* sobre `develop`, PR obligatorio con plantilla y revisión, Conventional Commits y desarrollo guiado por especificaciones (`AGENTS.md`).

| Hito | Fecha límite | Issues cerrados |
|---|---|---|
| Sprint 0 — Cimientos | 24/09/2026 | 8 |
| Sprint 1 — Piezas base del algoritmo | 27/09/2026 | 16 |
| Sprint 2 — Reglas de negocio del motor | 11/10/2026 | 14 |
| Sprint 3 — MVP funcional | 21/10/2026 | 67 |
| Sprint 3.1 | 28/10/2026 | 8 |
| Sprint 4 — Control, excepciones y validación | 04/11/2026 | 36 |
| Sprint 5 — Estabilización | 11/11/2026 | 52 (1 abierto) |
| Sprint 6 — Correcciones de la auditoría | — | 31 (2 abiertos) |
| Cierre — Entrega y sustentación | 11/11/2026 | 2 (3 abiertos) |

**Totales:** 239 issues cerrados, 6 abiertos y 95 PR fusionados.

El Sprint 6 surgió de una **auditoría final** del sistema que identificó 52 riesgos y brechas ([Riesgos y brechas](riesgos_y_brechas.md)); cada uno se convirtió en issue, se aceptó explícitamente o quedó como decisión del equipo (Anexo C).

---

## 6. Calidad

| Dimensión | Resultado al 25/11/2026 |
|---|---|
| Pruebas de backend (Jest) | 112 suites, **1391 pruebas** en verde |
| Cobertura de backend | 90,3 % de sentencias · 81,9 % de ramas · 92,0 % de funciones |
| Pruebas de frontend (Vitest) | 116 archivos, **931 pruebas** en verde |
| E2E (Playwright + axe) | 7 suites: consulta, espacios, tablero, marco del estudiante, accesibilidad, responsive e inicio |
| Carga (k6) | Pico del primer día dentro de umbrales (p95 < 2 s, error < 1 %), ver [Informe de pruebas](informe_resumen_pruebas.md) |
| Análisis estático | ESLint, Prettier, `tsc` estricto, `npm audit` y SonarCloud (cobertura del código nuevo ≥ 80 %) en cada PR |

El detalle de la estrategia está en el [Plan Maestro de Pruebas](plan_maestro_pruebas.md) y los resultados del Sprint 5 en el [Informe de Resumen de Pruebas](informe_resumen_pruebas.md).

---

## 7. Decisiones relevantes

| Decisión | Motivo |
|---|---|
| La accesibilidad es la preferencia de mayor peso, no una regla dura | El edificio tiene ascensor: es mejor asignar el piso más accesible con alerta que dejar al alumno sin aula. |
| Una sección escalada nunca muestra un aula | «Nunca afirmar lo que no se sabe» (PRODUCT.md). |
| Importaciones todo o nada | Evita cargas parciales que dejen datos inconsistentes. |
| Un docente puede dictar en varias aulas contiguas | Decisión del equipo (Anexo C, riesgo #8). |
| Reorganización con prioridad solo en las 2 primeras semanas | Limita los cambios de aula masivos al inicio del ciclo (Anexo C, riesgo #9). |
| Por defecto, teoría en aula y laboratorio en laboratorio | El docente solicita si necesita uno solo (Anexo C, riesgos #22 y #48). |
| Sin ciclo de verano por ahora | Decisión del equipo (Anexo C, riesgo #49). |

---

## 8. Pendientes y limitaciones

| Pendiente | Seguimiento |
|---|---|
| Aprobar y cargar el catálogo de software propuesto (hoy vacío) y definir los laboratorios especializados | #438 (6.14) |
| Fuente oficial de los datos de `202SW0302` y `202SW0303`, y carga del curso faltante | #432 (1.20) |
| Asignación manual de una sección escalada a un espacio concreto | Riesgos #4 y #29 |
| Infraestructura gratuita: arranque en frío de Render y pausa de Supabase | Riesgo #40, aceptado; mitigado con la [lista previa a la demo](guion_demo.md) |
| La clave inicial de alumnos y docentes es su código | Riesgo #30, aceptado para la demo |

---

## 9. Lecciones aprendidas

1. **Las especificaciones primero reducen el retrabajo.** Los contratos en `docs/specs/` permitieron que backend y frontend avanzaran en paralelo sin chocar.
2. **Una auditoría al final encuentra lo que las pruebas no ven.** Las pruebas cubrían lo especificado; la auditoría encontró brechas entre el sistema y la operación real (datos mezclados, software vacío, roles sin herramientas), que dieron lugar al Sprint 6.
3. **La puerta de calidad tiene que ser obligatoria.** El umbral de cobertura del código nuevo en SonarCloud obligó a acompañar cada cambio con pruebas.
4. **Los datos reales son parte del alcance.** Varias decisiones solo se pudieron tomar al revisar los datos de la facultad, no en el diseño.

---

## 10. Documentos del proyecto

| Documento | Archivo |
|---|---|
| Historias de usuario y requisitos | [01_historias_usuario.md](01_historias_usuario.md), [02_requisitos.md](02_requisitos.md) |
| Alcance, reglas y plan de línea base | [03_alcance_y_reglas.md](03_alcance_y_reglas.md), [04_plan_linea_base.md](04_plan_linea_base.md) |
| Arquitectura y modelo de datos | [arquitectura.md](arquitectura.md), [modelo-datos.md](modelo-datos.md) |
| Diseño y guía de estilos | [06_diseno_ui_ux.md](06_diseno_ui_ux.md), [07_guia_de_estilos_ui_ux.md](07_guia_de_estilos_ui_ux.md) |
| Pruebas | [plan_maestro_pruebas.md](plan_maestro_pruebas.md), [plan_ambiente_controlado.md](plan_ambiente_controlado.md), [informe_resumen_pruebas.md](informe_resumen_pruebas.md), [guia_pruebas_por_rol.md](guia_pruebas_por_rol.md) |
| Operación | [runbook_rollback.md](runbook_rollback.md), [guia-csv.md](guia-csv.md) |
| Riesgos y decisiones | [riesgos_y_brechas.md](riesgos_y_brechas.md) |
| Versiones | [CHANGELOG.md](../CHANGELOG.md), [registro_versiones.md](registro_versiones.md) |
| Manuales y demo | [manual_usuario.md](manual_usuario.md), [manual_tecnico.md](manual_tecnico.md), [guion_demo.md](guion_demo.md) |
