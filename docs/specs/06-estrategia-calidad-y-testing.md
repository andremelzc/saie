# Spec 06: Estrategia de Calidad, Pruebas y CI/CD

> **Épica:** `epic:calidad`  
> **Issues Cubiertos:** #5.1 — #5.20  
> **Roles:** QA, BM, BI  
> **Documentos de Referencia:** [`docs/plan_maestro_pruebas.md`](../plan_maestro_pruebas.md)

---

## 1. Visión General del Módulo

Especifica la infraestructura de pruebas automatizadas del proyecto SAIE, incluyendo pruebas unitarias, parametrizadas, de integración, End-to-End (Playwright), de carga (k6), el pipeline de Integración Continua (GitHub Actions) y el análisis de calidad de código con SonarCloud.

---

## 2. Granularidad y Matriz de Pruebas

### 2.1 Pruebas Unitarias y Parametrizadas (#5.1, #5.2, #5.3, #5.4, #5.5, #5.6, #5.16)
* **Framework:** Jest con `@types/jest` y `ts-jest`.
* **Módulos Cubiertos:**
  * `#5.1`: `calcularCapacidadReal` (Aulas vs. Laboratorios con PCs malogradas).
  * `#5.2`: `obtenerEspaciosContiguos` (Grafo de contigüidad).
  * `#5.3`: `verificarDisponibilidadEspacios` (Horarios no solapados).
  * `#5.4`: `buscarBloqueContiguo` (Expansión de capacidad variable).
  * `#5.5`: `validarSoftwareLaboratorio` (Matriz de software exigible solo a laboratorios).
  * `#5.6`: Priorización de Piso 1 para estudiantes con movilidad reducida.
  * `#5.16`: Puntuación de cercanía entre secciones paralelas del mismo curso.

### 2.2 Pruebas de Integración y Flujo Completo (#5.7)
* **Framework:** Supertest contra base PostgreSQL de pruebas en contenedor / aislada.
* **Escenarios:**
  * Entrada de sección $\rightarrow$ Evaluación de reglas $\rightarrow$ Persistencia de la asignación.
  * Corrida batch idempotente sobre N secciones.
  * Escalamiento a revisión manual ante escasez de espacio.

### 2.3 Pruebas de Carga con k6 (#5.8)
* **Framework:** `k6`
* **Escenario:** Simulación del pico de tráfico del primer día de clases sobre endpoints públicos de consulta (`GET /api/v1/consulta/alumno/:codigo` y `GET /api/v1/consulta/curso/:codigo`).
* **Umbrales Mandatorios (§2.2 del Plan Maestro):**
  * Latencia $p95 < 2000\text{ ms}$ a 300 VUs concurrentes.
  * Tasa de error $< 1\%$.

### 2.4 Pruebas End-to-End (Playwright) (#5.9)
* **Framework:** Playwright (Chromium, Firefox, WebKit).
* **Escenario:** Navegación real del alumno desde login hasta la visualización de su horario y mapa de ruta.

---

## 3. Pipeline CI/CD y Quality Gates (#5.10a, #5.10b, #5.18)
* **Workflow:** `.github/workflows/ci.yml`
* **Pasos:**
  1. Linting (`npm run lint`) & Formato (`npm run format:check`).
  2. Ejecución de pruebas unitarias/parametrizadas (`npm run test:coverage`).
  3. Quality Gate de SonarCloud: Cobertura global $\ge 85\%$ y 0 bugs críticos.

---

## 4. Dataset de Demostración y Seed (#5.17)
* Script `backend/prisma/seed.ts` repetible y determinista que carga el edificio de 3 pisos, pabellones, aulas, laboratorios, cuentas de prueba y alumnos/docentes sintéticos.

---

## 5. Definition of Done (DoD)
- [ ] Pipeline CI en GitHub Actions en verde en cada PR.
- [ ] Cobertura de código global $\ge 85\%$.
- [ ] 0 vulnerabilidades o bugs críticos en SonarCloud.
