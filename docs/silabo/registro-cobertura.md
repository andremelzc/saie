# Registro de Cobertura del Sílabo (Semanas 1–8) — SAIE

> **Curso:** Automatización y Control de Software (202W0801) — UNMSM, Ingeniería de Software, 2026-2.
> **Qué es este documento:** el registro de los 45 temas de las semanas 2 a 8 y el tratamiento que cada uno recibe en SAIE.
> **Documento complementario:** [`definiciones-e-implementacion.md`](definiciones-e-implementacion.md) define cada tema en detalle, explica cómo se aplica y cuenta los procesos que SAIE automatiza.
> **Criterio:** no hay examen escrito; todo tema debe estar tratado en el proyecto, ya sea construido, planificado con un diseño concreto, o analizado y justificado.
> **Fecha:** 2026-10-07 · **Rama revisada:** `develop` más la rama `feature/1.6-endpoint-importacion`

---

## 1. Resumen

Los 45 temas tienen un tratamiento definido. Se distinguen tres estados, que no deben confundirse al presentar:

| Estado | Temas | Significado |
| :--- | :---: | :--- |
| **Aplicado** | 35 | Existe en el proyecto (código, documento o artefacto). |
| **Planificado** | 4 | Tiene un diseño concreto en SAIE, pero **todavía no está construido**. |
| **Justificado** | 6 | Se analizó y se concluye, con argumentos, que no aplica a SAIE (todos de RPA). |
| **Total** | **45** | |

| Bloque del sílabo | Semanas | Aplicado | Planificado | Justificado | Total |
| :--- | :---: | :---: | :---: | :---: | :---: |
| Introducción a la automatización y control | 2–3 | 8 | 0 | 0 | 8 |
| Eventos, condiciones y reglas de control | 4 | 8 | 3 | 0 | 11 |
| Diseño de soluciones de automatización | 5–6 | 12 | 0 | 0 | 12 |
| APIs e integración | 6 | 2 | 0 | 0 | 2 |
| RPA | 7 | 5 | 1 | 6 | 12 |
| **Total** | | **35** | **4** | **6** | **45** |

> **Matiz sobre los cinco temas de RPA marcados "Aplicado":** tareas repetitivas, manipulación de datos, control de flujo, reglas y excepciones, y diseño de un flujo automatizado son conceptos generales que SAIE aplica en su **automatización por API** (importadores, motor, BPMN). No se aplican a un bot RPA, que SAIE no tiene ni necesita (ver §4).

---

## 2. Temas aplicados (35)

| # | Tema | Sem. | Dónde está |
| :---: | :--- | :---: | :--- |
| 1 | Concepto de automatización | 2–3 | Principio de diseño (`docs/arquitectura.md` §2.2); motor de asignación. |
| 2 | Concepto de control | 2–3 | Controles (*gates*) del motor, detección de alertas y pipeline CI/CD. |
| 3 | Automatización versus control | 2–3 | El motor decide; la detección de alertas y el pipeline verifican. |
| 4 | Sistemas automatizados y controlados | 2–3 | Clasificación de SAIE: automatizado y controlado, basado en reglas. |
| 5 | Entrada → proceso → decisión → acción → retroalimentación | 2–3 | Tabla del ciclo por proceso. |
| 6 | Lazo abierto y lazo cerrado | 2–3 | Alertas (cerrado) y consulta o importación (abierto). |
| 7 | Sistemas físicos vs procesos de software | 2–3 | Tabla comparativa aplicada a SAIE. |
| 8 | Casos de aplicación en Ingeniería de Software | 2–3 | SAIE y su pipeline (`.github/workflows/ci.yml`, `cd.yml`). |
| 9 | Concepto de evento | 4 | `TipoEventoAuditoria`; disparadores de los procesos. |
| 10 | Fuentes de eventos | 4 | Inventario por actor y componente. |
| 11 | Eventos internos y externos | 4 | Clasificación de los eventos de SAIE. |
| 12 | Modelo Evento–Condición–Acción (ECA) | 4 | Tabla ECA (alertas, asignación, importación). |
| 13 | Reglas de negocio | 4 | R-01 a R-11 en `backend/src/rules/` con pruebas. |
| 14 | Condiciones y decisiones automáticas | 4 | `orquestadorAsignacion.ts`, `escalamiento.ts`, `deteccionAlertas.service.ts`. |
| 15 | Triggers | 4 | Endpoints de asignación, laboratorios, incidencias e **importación**. |
| 16 | Casos de automatización basados en eventos | 4 | Cambio de software o PCs → alerta; importación → asignación. |
| 17 | Identificación del problema | 5–6 | `.md/01_definicion_y_alcance.md` §1. |
| 18 | Procesos susceptibles de automatización | 5–6 | 7 procesos modelados en BPMN. |
| 19 | Definición de objetivos | 5–6 | Definición §2 y §8. |
| 20 | Requisitos funcionales | 5–6 | RF-01 a RF-24. |
| 21 | Requisitos no funcionales | 5–6 | RNF-01 a RNF-10. |
| 22 | Identificación de entradas y salidas | 5–6 | Tabla de entradas y salidas por proceso. |
| 23 | Eventos, reglas, decisiones y acciones | 5–6 | Reglas, triggers, tabla ECA. |
| 24 | Casos de uso | 5–6 | Especificación en tabla y diagrama UML (`diagramas/casos-de-uso.puml`). |
| 25 | Diagramas de actividad | 5–6 | Diagrama UML de la orquestación de la asignación (`diagramas/actividad-orquestacion-asignacion.puml`) y 7 BPMN con carriles (`SAIE_Diagramas (2).pdf`). |
| 26 | Introducción a BPMN aplicada a automatización | 5–6 | Los mismos 7 diagramas BPMN. |
| 27 | Diseño de la arquitectura de la solución | 5–6 | `docs/arquitectura.md`, `docs/modelo-datos.md`. |
| 28 | Formulación del proyecto del curso | 5–6 | Alcance, decisiones D-01 a D-05, línea base. |
| 29 | Integración de aplicaciones | 6 | Frontend, backend y base de datos; despliegue automatizado. |
| 30 | Concepto de API | 6 | API REST bajo `/api/v1` con JWT y roles. |
| 31 | Automatización de tareas repetitivas | 7 | Importadores y corrida batch (por API). |
| 32 | Manipulación de datos | 7 | Lectura, normalización y validación de CSV/JSON (`archivoImportacion.ts`, esquemas Zod). |
| 33 | Control de flujo | 7 | Importación → validación → asignación condicionada. |
| 34 | Reglas y excepciones | 7 | Filas rechazadas, escalamiento, conflicto 409, idempotencia. |
| 35 | Diseño de un flujo automatizado | 7 | BPMN del Proceso 0 y del Proceso 1. |

---

## 3. Temas planificados (4): falta construirlos

Estos cuatro temas se aplican con **una sola funcionalidad nueva**: el aviso de cambio de aula por Telegram. Hoy no existe nada de esto en el código.

| # | Tema | Sem. | Cómo se construiría |
| :---: | :--- | :---: | :--- |
| 36 | Sistemas orientados a eventos | 4 | Bus de eventos interno: la asignación emite "asignación cambiada" y los suscriptores reaccionan. |
| 37 | Programación orientada a eventos | 4 | Manejadores suscritos a esos eventos (notificador de Telegram, auditoría de alertas). |
| 38 | Temporizadores | 4 | Resumen diario de clases al alumno, disparado por una tarea programada. |
| 39 | Bots de software | 7 | Bot de Telegram que vincula al alumno y le avisa del cambio de aula. |

Diseño detallado y límites en `definiciones-e-implementacion.md` §6. Requiere registrar el cambio de alcance (las notificaciones están excluidas en `docs/03_alcance_y_reglas.md` §3.2) y seguir el control de cambios de la línea base.

---

## 4. Temas justificados como no aplicables (6)

Todos de RPA. **RPA no calza en SAIE**: se usa cuando un sistema no ofrece API y solo puede operarse por su interfaz. SAIE tiene API propia y todos sus procesos pueden automatizarse por ella, que es más estable y se puede probar. El análisis con criterios, proceso por proceso, está en `definiciones-e-implementacion.md` §7.

| # | Tema | Sem. |
| :---: | :--- | :---: |
| 40 | Introducción a RPA | 7 |
| 41 | Procesos candidatos a RPA | 7 |
| 42 | Automatización de interfaces | 7 |
| 43 | Automatización atendida y desatendida | 7 |
| 44 | Ventajas y limitaciones de RPA | 7 |
| 45 | Casos empresariales y de gestión pública | 7 |

**Cada tema está definido** y se explica por qué no aplica; no se construye ningún bot RPA. La aceptación de esta justificación depende de la profesora.

---

## 5. Pendientes que no son temas del sílabo

| # | Pendiente | Situación |
| :---: | :--- | :--- |
| P1 | **Endpoint de importación** | **Construido** en la rama `feature/1.6-endpoint-importacion` (`POST /api/v1/import/:tipo`, con asignación encadenada). Falta fusionarlo. |
| P2 | **Pantalla de importación** (issue 1.9) | Abierto. |
| P3 | **Frontend del prototipo** | Solo existe `frontend/src/pages/Home.tsx`. Se hará. |
| P4 | **Auditoría de alertas** | `TipoEventoAuditoria.ALERTA` existe, pero `alerta.service.ts` no escribe auditoría (issue 5.11, abierto). Se resolvería con un suscriptor del bus de eventos. |
| P5 | **Diagrama UML de casos de uso** | **Hecho** en PlantUML (`docs/silabo/diagramas/`), con su imagen. |
| P6 | **Diagrama de actividad UML** | **Hecho**: algoritmo interno de la asignación, distinto de los BPMN de proceso. Falta confirmar con la profesora si además exige UML por cada proceso. |
| P7 | **Figma** | Enlace privado; no se pudo revisar. |
| P8 | **Evidencia en el repo** | Copiar los BPMN (PDF) a `docs/silabo/`. |
| P9 | **Cambio de alcance** | Borrador de la solicitud listo en [`solicitud-cambio-notificaciones.md`](solicitud-cambio-notificaciones.md) (decisión D-06). Falta abrirla como issue `[CAMBIO-LB]` y que el CCC decida. No existe tag `lb-*`: la línea base aún no se formalizó. |
| P10 | **Issue 1.6** | Estaba cerrado sin cumplirse; el endpoint de este PR lo cumple. |

---

## 6. Inconsistencias de la documentación detectadas

| Tema | Dónde | Detalle |
| :--- | :--- | :--- |
| Asignación manual de secciones escaladas | `docs/02_requisitos.md` (RF-14) y `docs/03_alcance_y_reglas.md` §2.5 vs `.md/01_definicion_y_alcance.md` §3 | Los dos primeros la incluyen; la definición la declara fuera de alcance. |
| Cobertura de specs del portal docente | `docs/specs/README.md` | `05-portal-docente.md` cubre #7.8 a #7.12 y deja sin spec a #7.1 a #7.7. |
| Criterio de aceptación de los issues 1.3 a 1.5 | Issues de GitHub vs importadores | El issue pide rechazar el archivo completo ante filas inválidas; los importadores guardan las filas válidas y reportan las inválidas. El endpoint sigue el comportamiento de los importadores. |
