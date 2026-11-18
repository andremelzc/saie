# Informe de Resumen de Pruebas — SAIE

> **Issue de referencia:** #5.14  
> **Sprint:** 5 — Estabilización  
> **Rol responsable:** Asegurador de Calidad (QA) — Angel14den  
> **Fecha de emisión:** 2026-11-18  
> **Estado:** ✅ Criterios de salida cumplidos

---

## 1. Alcance del Informe

Este informe consolida los resultados de todas las suites de prueba automatizadas del proyecto SAIE ejecutadas en el Sprint 5, así como los hallazgos de la validación exploratoria (Issue #5.15), y concluye de forma explícita si se cumplieron los criterios de salida definidos en el Plan Maestro de Pruebas (Issue #5.12).

---

## 2. Resumen Ejecutivo

| Dimensión                              | Resultado       | Criterio de salida   |
|----------------------------------------|-----------------|----------------------|
| Pruebas unitarias y parametrizadas     | ✅ 100 % verde  | Todas en verde       |
| Pruebas de integración                 | ✅ 100 % verde  | Todas en verde       |
| Pruebas E2E (Playwright)               | ✅ 100 % verde  | Todas en verde       |
| Pruebas de carga k6                    | ✅ Dentro umbrales | p95 < 2 000 ms; error < 1 % |
| Cobertura global de código             | ✅ ≥ 85 %       | ≥ 85 %               |
| Quality Gate SonarCloud                | ✅ PASS         | 0 bugs críticos      |
| Issues `bug` críticos sin resolver     | ✅ 0 abiertos   | 0 sin justificación  |

---

## 3. Resultados por Suite

### 3.1 Pruebas Unitarias y Parametrizadas (Issues #5.1 – #5.6, #5.16)

Ejecutadas con Jest + ts-jest en `backend/tests/unit/`. La cobertura de cada módulo supera el 85 % exigido por el Plan Maestro.

| Issue | Función / módulo                          | Resultado | Casos cubiertos                                                                 |
|-------|-------------------------------------------|-----------|---------------------------------------------------------------------------------|
| #5.1  | `calcularCapacidadReal`                   | ✅ PASS   | Laboratorio sin PCs malogradas; laboratorio con todas malogradas; aula teórica; límite exacto |
| #5.2  | `obtenerEspaciosContiguos`                | ✅ PASS   | Con varios contiguos; sin contiguos; simetría A↔B; aulas y laboratorios        |
| #5.3  | `verificarDisponibilidadEspacios`         | ✅ PASS   | Sin solape; solape total; solape parcial; espacio sin asignaciones              |
| #5.4  | `buscarBloqueContiguo`                    | ✅ PASS   | Bloque de 1; bloque de 3+; sin bloque; candidatos deterministas sin duplicados  |
| #5.5  | `validarSoftwareLaboratorio`              | ✅ PASS   | Cumplimiento total/parcial/vacío en lab; omisión automática en aula             |
| #5.6  | Priorización Piso 1 (movilidad reducida)  | ✅ PASS   | Con Piso 1 disponible; sin Piso 1; sin movilidad reducida                       |
| #5.16 | `puntuarCercania`                         | ✅ PASS   | Sin paralelas; paralelas mismo piso; paralelas distinto piso; puntuación neutra |

### 3.2 Pruebas de Integración (Issues #5.7, #5.20)

Ejecutadas con Supertest contra base PostgreSQL de servicios en GitHub Actions.

| Escenario                                              | Resultado |
|--------------------------------------------------------|-----------|
| Entrada de sección → evaluación de reglas → persistencia | ✅ PASS |
| Corrida batch idempotente sobre N secciones            | ✅ PASS   |
| Escalamiento a revisión manual ante escasez de espacio | ✅ PASS   |
| Vinculación de cuenta Telegram                        | ✅ PASS   |
| Aviso de cambio de aula (idempotente)                  | ✅ PASS   |
| Resumen diario Telegram                                | ✅ PASS   |

### 3.3 Pruebas E2E con Playwright (Issues #5.9, #5.27, #5.29)

Ejecutadas sobre Chromium en GitHub Actions (`npm run test:e2e`).

| Archivo de prueba             | Escenarios                                                      | Resultado |
|-------------------------------|-----------------------------------------------------------------|-----------|
| `home.spec.ts`                | Estructura de portada con `h1` correcto («Bienvenido a SAIE»)   | ✅ PASS   |
| `consulta-estudiante.spec.ts` | Flujo completo: código válido, 404, formato, retorno al inicio  | ✅ PASS   |
| `espacios-admin.spec.ts`      | CRUD de espacios, paginación, drawer                            | ✅ PASS   |
| `tablero.spec.ts`             | Modo tablero en panel y portal del estudiante                   | ✅ PASS   |
| `responsive.spec.ts`          | Sin scroll horizontal en 320/375/390 px; tarjetas en móvil     | ✅ PASS   |
| `accesibilidad.spec.ts`       | 0 violaciones `serious`/`critical` con axe en 5 pantallas del panel | ✅ PASS |
| `marco-estudiante.spec.ts`    | Marco persistente en portales; sin desborde en 390/768/1280 px; pestaña «Más» | ✅ PASS |

**Hallazgo corregido en este sprint:**
- **ACC-18 (#403):** El aro de foco del logo de cabecera usaba `#222222` sobre fondo guinda `#7b1113` (contraste 1,46:1, insuficiente para WCAG 1.4.11). Se añadió `focus-visible:outline-white` en `CabeceraAlumno`, `CabeceraPortal` y se verificó que `LayoutAdmin` no tiene logo interactivo. El blanco sobre guinda da 10,9:1.

### 3.4 Pruebas de Carga con k6 (Issue #5.8)

Ejecutadas en la corrida de validación final del Sprint 5 contra el entorno de staging.

| Endpoint                                   | p95 (ms) | Tasa error | Umbral p95 | Umbral error |
|--------------------------------------------|----------|------------|------------|--------------|
| `GET /api/v1/consulta/alumno/:codigo`      | 847      | 0,3 %      | < 2 000 ms | < 1 %        |
| `GET /api/v1/consulta/curso/:codigo`       | 912      | 0,2 %      | < 2 000 ms | < 1 %        |

Ambos endpoints dentro de los umbrales mandatorios a 300 VUs concurrentes.

---

## 4. Cobertura de Código

| Módulo     | Cobertura (líneas) | Cobertura (ramas) | Umbral |
|------------|-------------------|-------------------|--------|
| Backend    | 88,4 %            | 86,1 %            | ≥ 85 % |
| Frontend   | 85,7 %            | 83,2 %            | ≥ 85 % |

> [!NOTE]
> La cobertura de ramas del frontend queda en 83,2 %, ligeramente por debajo del 85 %. El Quality Gate de SonarCloud evalúa la cobertura global ponderada de líneas, que sí supera el umbral. Las ramas no cubiertas corresponden a rutas de error de red en hooks internos que no se pueden ejercitar con jsdom (sin XHR real).

---

## 5. Validación Manual y Exploratoria (Issue #5.15)

La validación exploratoria cubrió el flujo integrado completo:

**Importar → Asignar → Consultar → Alertar → Mapa de ruta**

| Flujo validado                                                        | Estado        |
|-----------------------------------------------------------------------|---------------|
| Importación de CSV de cursos, horarios, matrículas y docentes         | ✅ Correcto   |
| Corrida batch de asignación para un semestre completo                 | ✅ Correcto   |
| Consulta pública por código de alumno y por código de curso           | ✅ Correcto   |
| Consulta del portal del estudiante autenticado (horario, mapa, ruta)  | ✅ Correcto   |
| Generación automática de alertas de software y PCs malogradas         | ✅ Correcto   |
| Mapa 2D interactivo por piso / pabellón                               | ✅ Correcto   |
| Reporte de incidencias desde el portal docente                        | ✅ Correcto   |
| Vinculación y avisos por Telegram (vinculación + cambio + resumen)    | ✅ Correcto   |

**Hallazgos registrados durante la validación:**

| ID       | Descripción                                                        | Severidad | Estado    |
|----------|--------------------------------------------------------------------|-----------|-----------|
| EXP-01   | Foco invisible en logo de cabecera guinda (ver ACC-18 / Issue #403) | Alta      | ✅ Resuelto en este PR |
| EXP-02   | El selector `h1` del E2E de portada apuntaba al logo antiguo (Issue #379) | Media | ✅ Resuelto en develop |

---

## 6. Issues `bug` Críticos Abiertos

> ✅ No existen issues de tipo `bug` con severidad crítica sin resolución justificada al cierre de este sprint.

---

## 7. Defectos: Encontrados vs. Resueltos

| Sprint | Defectos encontrados | Defectos resueltos | Diferidos (con justificación) |
|--------|---------------------|--------------------|-------------------------------|
| 1      | 3                   | 3                  | 0                             |
| 2      | 5                   | 5                  | 0                             |
| 3      | 7                   | 7                  | 0                             |
| 4      | 4                   | 4                  | 0                             |
| 5      | 2                   | 2                  | 0                             |
| **Total** | **21**           | **21**             | **0**                         |

---

## 8. Conclusión — Criterios de Salida

Según el §4 del Plan Maestro de Pruebas (Issue #5.12), el sistema cumple **todos** los criterios de salida para la entrega:

| Criterio de salida                                                       | ¿Cumplido? |
|--------------------------------------------------------------------------|------------|
| Issues 5.1–5.7 y 5.16 en verde en CI con cobertura ≥ 85 % por módulo   | ✅ Sí      |
| Quality Gate SonarCloud en verde (cobertura global ≥ 85 %, 0 bugs)      | ✅ Sí      |
| Pruebas de carga (Issue 5.8) dentro de los umbrales (p95 < 2 s, error < 1 %) | ✅ Sí |
| Pruebas E2E (Issue 5.9 y derivadas) en verde, con caso feliz y 404      | ✅ Sí      |
| Validación manual y exploratoria (Issue 5.15) completada con hallazgos documentados | ✅ Sí |
| Sin issues `bug` críticos abiertos sin justificación escrita             | ✅ Sí      |

> **El sistema SAIE cumple los criterios de salida definidos en el Plan Maestro de Pruebas y está en condiciones de ser entregado y sustentado.**

---

## Control de Cambios

| Versión | Fecha       | Autor       | Descripción                           |
|---------|-------------|-------------|---------------------------------------|
| 1.0.0   | 2026-11-18  | Angel14den  | Emisión inicial del Informe de Resumen de Pruebas (Issue #5.14) |
