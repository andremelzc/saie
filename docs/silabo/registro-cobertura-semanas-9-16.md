# Registro de Cobertura del Sílabo (Semanas 9–16) — SAIE

> **Curso:** Automatización y Control de Software (202W0801) — UNMSM, Ingeniería de Software, 2026-2.
> **Qué es este documento:** el registro de los 60 temas de las Unidades 3 y 4 del sílabo (semanas 9 a 16) y lo que SAIE tiene hoy de cada uno.
> **Documento complementario:** [`definiciones-e-implementacion-semanas-9-16.md`](definiciones-e-implementacion-semanas-9-16.md) define cada tema, explica cómo se aplicó y qué se podría mejorar.
> **Semanas 1 a 8:** ver [`registro-cobertura.md`](registro-cobertura.md).
> **Criterio:** igual que antes, no hay examen escrito; todo tema debe estar tratado en el proyecto.
> **Fecha:** 2026-10-08 · **Rama revisada:** `develop` más la rama `feature/1.6-endpoint-importacion`

> **Este análisis es un borrador del autor del documento.** Las decisiones marcadas como *Propuesto* o *Justificado* (IA e IoT) no han sido tomadas por el equipo ni aceptadas por la profesora.

---

## 1. Resumen

Se usan cinco estados. No deben confundirse al presentar:

| Estado | Temas | Significado |
| :--- | :---: | :--- |
| **Aplicado** | 22 | Existe en el proyecto (código, documento o artefacto). |
| **Parcial** | 22 | Existe, pero incompleto o con una carencia concreta. Cada uno lleva su mejora. |
| **Planificado** | 2 | Tiene un issue creado, pero no está construido. |
| **Propuesto** | 3 | Hay una idea de aplicación, pero no hay decisión del equipo ni issue. |
| **Justificado** | 11 | Se analizó y se concluye, con argumentos, que no aplica a SAIE. |
| **Total** | **60** | |

| Bloque del sílabo | Semanas | Aplicado | Parcial | Planificado | Propuesto | Justificado | Total |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| Sistemas embebidos e IoT | 9–10 | 0 | 0 | 0 | 0 | 11 | 11 |
| Monitoreo, logs, trazabilidad y alertas | 11–12 | 1 | 10 | 2 | 0 | 0 | 13 |
| Automatización inteligente con IA | 11–12 | 6 | 4 | 0 | 3 | 0 | 13 |
| Pruebas automatizadas | 13–14 | 6 | 6 | 0 | 0 | 0 | 12 |
| CI/CD | 15 | 9 | 2 | 0 | 0 | 0 | 11 |
| **Total** | | **22** | **22** | **2** | **3** | **11** | **60** |

**Lectura:**
- **Lo más fuerte del proyecto** son las pruebas y el CI/CD, que es además el eje que el sílabo y el proyecto declaran.
- **Lo más débil de lo que debería existir** es el monitoreo: hay alertas y auditoría parcial, pero casi no hay logs, métricas ni paneles.
- **IA e IoT** no tienen nada construido. Para IoT se propone justificar que no aplica; para IA hay una aplicación natural (incidencias de los docentes) que el equipo debe decidir si adopta.
- **Los 22 parciales no son temas perdidos:** cada uno tiene una mejora concreta en el documento complementario.

---

## 2. Semanas 9–10: Sistemas embebidos e Internet de las Cosas (11)

Todos **Justificados**. SAIE es una aplicación web; no tiene hardware propio ni dispositivos conectados. El análisis con criterios está en el documento complementario, §1.

| # | Tema | Estado | Qué se tiene hoy |
| :---: | :--- | :---: | :--- |
| 1 | Concepto de sistema embebido | Justificado | SAIE no es un sistema embebido. |
| 2 | Software embebido | Justificado | No hay firmware. |
| 3 | Diferencias entre aplicación tradicional y software embebido | Justificado | SAIE es una aplicación tradicional (web, servidor, base de datos). |
| 4 | Introducción a IoT | Justificado | — |
| 5 | Dispositivos conectados | Justificado | No hay dispositivos; las PCs de los laboratorios no se conectan al sistema. |
| 6 | Sensores y actuadores como componentes | Justificado | Los "sensores" de SAIE son los registros manuales de Jefatura. |
| 7 | Comunicación entre dispositivos y software | Justificado | Solo hay comunicación HTTP entre frontend y backend. |
| 8 | Introducción a MQTT | Justificado | No se usa. |
| 9 | Edge y Cloud Computing | Justificado | SAIE corre en la nube (Vercel, Render, Supabase); no hay procesamiento en el borde. |
| 10 | Casos de aplicación | Justificado | Se describen casos del campus donde IoT sí encajaría. |
| 11 | Criterios para determinar cuándo una solución requiere IoT | Justificado | Se aplican los criterios a SAIE y se concluye que no lo requiere. |

---

## 3. Semanas 11–12: Monitoreo, logs, trazabilidad y alertas (13)

| # | Tema | Estado | Qué se tiene hoy |
| :---: | :--- | :---: | :--- |
| 1 | Importancia del monitoreo | Parcial | Solo `GET /api/health`. |
| 2 | Logs de aplicaciones | Parcial | Solo `console.error` ante errores no controlados, sin datos sensibles. |
| 3 | Registro de eventos | Parcial | `RegistroAuditoria` registra asignaciones y escalamientos, no alertas. |
| 4 | Auditoría | Parcial | Con fecha y detalle, pero sin saber quién disparó la acción. |
| 5 | Trazabilidad | **Aplicado** | `corridaId`, `huellaEntrada`, `motivoEscalamiento`, historial de asignaciones e `HistorialEspacio`. |
| 6 | Métricas | Parcial | El resumen de cada corrida (asignadas, mantenidas, escaladas); sin métricas del sistema. |
| 7 | Estado de los procesos | Parcial | Estados de asignación, alerta e incidencia; no hay estado de las corridas. |
| 8 | Dashboards | Planificado | Mapa de ocupación y panel de alertas en issues abiertos (4.9 a 4.14). |
| 9 | Alertas automáticas | Parcial | Se detectan y persisten; falta listarlas y resolverlas (issues 4.6 y 4.7). |
| 10 | Notificaciones | Planificado | Avisos por Telegram (issues #250 a #254). |
| 11 | Detección de errores | Parcial | Manejo de errores uniforme y validación; no hay alertas ante errores del servidor. |
| 12 | Observabilidad básica | Parcial | Solo el health check. |
| 13 | Seguimiento de ejecuciones automatizadas | Parcial | Las corridas se agrupan por `corridaId` y el pipeline deja su historial en GitHub Actions. |

---

## 4. Semanas 11–12: Automatización inteligente con IA (13)

| # | Tema | Estado | Qué se tiene hoy |
| :---: | :--- | :---: | :--- |
| 1 | Automatización tradicional vs inteligente | Aplicado | SAIE es tradicional, basada en reglas; se compara y justifica. |
| 2 | IA aplicada a procesos | **Propuesto** | Candidato: incidencias de los docentes. |
| 3 | Clasificación automática | **Propuesto** | Clasificar el tipo de incidencia desde su descripción. |
| 4 | Priorización automática | Aplicado | Por reglas: orden del batch y orden de bloques, no por IA. |
| 5 | Extracción y procesamiento de información | Parcial | Los importadores extraen datos estructurados de CSV; sin IA. |
| 6 | IA generativa aplicada a automatización | **Propuesto** | Explicar en lenguaje natural por qué se escaló una sección. |
| 7 | Automatización de decisiones | Aplicado | El motor decide la asignación. |
| 8 | Sistemas basados en reglas vs sistemas basados en IA | Aplicado | Se eligieron reglas por explicabilidad y determinismo (D-05, RNF-08). |
| 9 | Human-in-the-loop | Parcial | El escalamiento y las alertas requieren una persona; faltan las pantallas. |
| 10 | Supervisión humana | Parcial | Igual que el anterior. |
| 11 | Validación de resultados | Aplicado | Reglas duras, pruebas parametrizadas e idempotencia. |
| 12 | Riesgos de decisiones automatizadas | Aplicado | Análisis de riesgos y mitigaciones de SAIE. |
| 13 | Trazabilidad de decisiones asistidas por IA | Parcial | Hay trazabilidad de decisiones automáticas; no hay decisiones con IA. |

---

## 5. Semanas 13–14: Pruebas automatizadas (12)

| # | Tema | Estado | Qué se tiene hoy |
| :---: | :--- | :---: | :--- |
| 1 | Calidad en sistemas automatizados | Parcial | Plan Maestro y quality gates definidos; **no se hacen cumplir** (sin SonarCloud ni umbral de cobertura). |
| 2 | Automatización de pruebas | Aplicado | Las pruebas corren en cada pull request. |
| 3 | Pruebas unitarias | Aplicado | 25 archivos de prueba, con casos parametrizados. |
| 4 | Pruebas funcionales | Parcial | El E2E existente prueba una plantilla de otro proyecto. |
| 5 | Pruebas de integración | Parcial | Se prueban las rutas con Supertest, pero con la base de datos simulada. |
| 6 | Pruebas de APIs | Aplicado | Autenticación, roles, errores y respuestas de los endpoints. |
| 7 | Pruebas de reglas de negocio | Aplicado | Suite de reglas del motor para aulas y laboratorios. |
| 8 | Pruebas de eventos | Parcial | Se prueba la detección de alertas; el bus de eventos no existe aún. |
| 9 | Pruebas de excepciones | Aplicado | Errores 400, 401, 403, 404, 409 y 413, filas inválidas y escalamientos. |
| 10 | Casos y datos de prueba | Parcial | Fixtures y semilla de 15 espacios; falta el dataset de demostración (issue 5.17). |
| 11 | Evidencias de ejecución | Parcial | Registros de GitHub Actions; sin reportes archivados. |
| 12 | Frameworks de testing | Aplicado | Jest, Supertest, Playwright y k6. |

---

## 6. Semana 15: CI/CD y automatización del ciclo de vida (11)

| # | Tema | Estado | Qué se tiene hoy |
| :---: | :--- | :---: | :--- |
| 1 | Automatización del desarrollo de software | Aplicado | Scripts de lint, formato, pruebas, generación de Prisma y despliegue. |
| 2 | Control de versiones | Aplicado | Git y GitHub con ramas por issue y pull requests con plantilla. |
| 3 | Git | Aplicado | Convención de ramas y Conventional Commits (`docs/git-workflow.md`). |
| 4 | Integración continua (CI) | Aplicado | `ci.yml` en cada PR hacia `develop` y `main`. |
| 5 | Entrega y despliegue continuo (CD) | Aplicado | `cd.yml` al fusionar en `develop`. |
| 6 | Pipelines | Aplicado | Dos workflows, tres jobs, con dependencias y control de concurrencia. |
| 7 | Automatización del build | Parcial | El CI **no ejecuta** `npm run build`; compilan Render y Vercel al desplegar. |
| 8 | Ejecución automática de pruebas | Aplicado | Pruebas unitarias y de integración en cada PR; E2E y k6 no están en el CI. |
| 9 | Despliegue automatizado | Aplicado | Migraciones en Supabase, backend en Render y frontend en Vercel. |
| 10 | Introducción a DevOps | Parcial | Hay CI/CD, pero sin monitoreo posterior al despliegue. |
| 11 | GitHub Actions u otras | Aplicado | GitHub Actions. |

---

## 7. Semana 16: Examen final

> *Solución funcional de Automatización y Control de Software: solución funcional, pruebas y demostración.*

| Entregable | Estado | Qué falta |
| :--- | :---: | :--- |
| Solución funcional, backend | Aplicado | Fusionar el PR #246; los pendientes de alertas e incidencias (issues 4.6, 4.7 y 7.6). |
| Solución funcional, frontend | **Pendiente** | Casi todo: solo existe `Home.tsx`, que además es una plantilla de otro proyecto. |
| Pruebas | Parcial | E2E real (5.9), carga (5.8), SonarCloud (5.10b y 5.18), integración con base real (5.7) y validación manual (5.15). |
| Datos de demostración | Pendiente | Seed y dataset (5.17). |
| Informe de pruebas | Pendiente | Issue 5.14. |
| Demostración | Pendiente | Ensayo y lista previa (6.11) y entrega final (6.12). |

---

## 8. Hallazgos nuevos que no aparecían en el análisis de las semanas 1 a 8

Se detectaron al revisar el código y los flujos de pruebas. Cada uno tiene su mejora en el documento complementario.

| # | Hallazgo | Dónde |
| :---: | :--- | :--- |
| H1 | **El E2E y la página de inicio son una plantilla de otro proyecto.** `tests/e2e/home.spec.ts` comprueba el texto "Sistema de Apoyo a la Integración Escolar" y cuatro portales (Directivo, Docente, Profesional, Familias) que no existen en SAIE. `frontend/src/pages/Home.tsx` tiene el mismo contenido. | `tests/e2e/`, `frontend/src/pages/Home.tsx` |
| H2 | **El CI no compila.** El PR exige `npm run build`, pero `ci.yml` solo ejecuta lint, formato y pruebas. | `.github/workflows/ci.yml` |
| H3 | **Los quality gates no se hacen cumplir.** No hay `sonar-project.properties`, ni `coverageThreshold` en Jest, ni cobertura en el CI. | Raíz del repo, `backend/jest.config.js` |
| H4 | **La prueba de carga no es el escenario del requisito.** `k6` solo consulta `/api/health` con 10 usuarios durante 10 segundos; RNF-01 pide 300 usuarios concurrentes sobre la consulta del estudiante. | `tests/load/smoke-load-test.js` |
| H5 | **La base de datos del CI no se usa.** El job de pruebas levanta PostgreSQL, pero todas las pruebas simulan Prisma. | `ci.yml`, `backend/tests/` |
| H6 | **La documentación y el código difieren en la accesibilidad.** R-07 y RF-10 hablan de elegir el espacio "más cercano al ascensor" con `Espacio.distancia_ascensor`; ese campo no existe y el código solo prioriza el Piso 1 con una alternativa a otros pisos. | `docs/03_alcance_y_reglas.md`, `backend/src/rules/accesibilidad.ts` |
| H7 | **La auditoría no registra quién.** `RegistroAuditoria` no guarda la cuenta que disparó la acción. | `backend/prisma/schema.prisma` |
| H8 | **No hay protección contra intentos repetidos de inicio de sesión** (límite de intentos ni bloqueo). | `backend/src/services/auth.service.ts` |
| H9 | **El despliegue usa `vercel@latest`** sin fijar versión, y no verifica el resultado tras desplegar. | `.github/workflows/cd.yml` |
