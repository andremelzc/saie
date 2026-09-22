# Plan Maestro de Pruebas — SAIE

> **Proyecto:** Sistema de Asignación Inteligente de Espacios (SAIE)
> **Rol responsable:** Asegurador de Calidad (QA)
> **Issue de referencia:** #5.12 — Definición formal del plan de pruebas
> **Versión:** 1.1.0
> **Fecha:** 2026-09-22

---

## Tabla de Contenidos

1. [Criterio de Granularidad de Pruebas](#1-criterio-de-granularidad-de-pruebas)
2. [Escenarios de Carga y Umbrales de Aceptación (k6)](#2-escenarios-de-carga-y-umbrales-de-aceptación-k6)
3. [Quality Gates y Política de Manejo de Bugs](#3-quality-gates-y-política-de-manejo-de-bugs)

---

## 1. Criterio de Granularidad de Pruebas

Este criterio establece los niveles de prueba aplicables al proyecto SAIE, los módulos que cubre cada nivel y la estrategia de ejecución correspondiente.

### 1.1 Pruebas Unitarias y Parametrizadas

Las pruebas unitarias validan el comportamiento aislado de cada unidad lógica del sistema, sin dependencias externas activas (bases de datos, APIs de terceros, etc.). Se emplean datos parametrizados para maximizar la cobertura de casos borde con el mínimo de código duplicado.

| Módulo | Descripción de cobertura |
|---|---|
| **Cálculo de capacidad** | Verificación de la lógica de cálculo de aforo por aula (capacidad física, porcentaje de ocupación máxima permitida, restricciones por modalidad). Se parametrizan escenarios con distintos tamaños de grupo y tipos de espacio. |
| **Contigüidad** | Validación del algoritmo que determina si dos horarios o salones son contiguos o solapados. Se cubren casos borde: solapamiento exacto, contigüidad de un minuto, bloques idénticos y bloques no relacionados. |
| **Validación de software** | Pruebas sobre las reglas de negocio aplicadas antes de persistir datos: validación de esquemas de entrada, restricciones de integridad referencial a nivel de servicio y mensajes de error esperados ante entradas inválidas. |
| **Accesibilidad** | Verificación de que los componentes de interfaz cumplen con los criterios WCAG 2.1 nivel AA relevantes (contraste de color, atributos ARIA, navegabilidad por teclado) mediante herramientas automatizadas integradas a la suite de pruebas. |
| **Cercanía entre secciones paralelas** | Validación de la función de puntuación que evalúa la proximidad física entre secciones paralelas del mismo curso. Se parametrizan cuatro casos: mismo piso (puntuación máxima), piso adyacente (puntuación media), piso no adyacente (puntuación baja) y puntuación neutra (sin preferencia de piso). Aplica tanto para aulas teóricas como para laboratorios. |

**Herramientas sugeridas:** `pytest` con `@pytest.mark.parametrize` (backend), `Jest` / `Vitest` con `test.each` (frontend), `axe-core` (accesibilidad).

---

### 1.2 Pruebas de Integración

Las pruebas de integración validan la interacción correcta entre dos o más módulos del sistema. El foco principal es el **motor de asignación** y sus dependencias internas.

| Escenario de integración | Alcance |
|---|---|
| **Flujo del motor de asignación completo** | Prueba de extremo a extremo del pipeline interno de asignación: recepción de la solicitud → consulta de disponibilidad → aplicación de reglas de contigüidad y capacidad → selección del espacio → persistencia del resultado. Se verifica que todos los módulos internos se comunican con los contratos de interfaz correctos. |
| **Asignación individual** | Integración enfocada en el caso de asignación de un único grupo-horario: se valida la respuesta completa del servicio (código HTTP, cuerpo de respuesta, estado de la base de datos) ante una solicitud bien formada y ante solicitudes con conflictos de disponibilidad. |
| **Asignación en lote (batch)** | Integración del flujo de procesamiento masivo: carga de un conjunto de solicitudes de asignación, ejecución secuencial o concurrente del motor y verificación de consistencia del estado final (sin asignaciones duplicadas, sin violaciones de capacidad). |

**Herramientas sugeridas:** `pytest` con fixtures de base de datos en contenedor (`testcontainers`), `Supertest` (Node.js), mocks de servicios externos con `responses` o `httpretty`.

---

### 1.3 Pruebas End-to-End (E2E)

Las pruebas E2E simulan el comportamiento real de un usuario interactuando con el sistema completo desplegado, incluyendo frontend, backend y base de datos.

| Escenario E2E | Descripción |
|---|---|
| **Flujo completo de consulta del estudiante** | Un estudiante accede al sistema, consulta la disponibilidad de espacios para su horario, visualiza los resultados y confirma una reserva. La prueba automatizada navega por la interfaz real y valida: renderizado correcto de resultados, mensajes de confirmación, actualización visible del estado de disponibilidad y comportamiento ante intentos de reserva en espacios sin cupo. |

**Estrategia de automatización:** Se utiliza **Playwright** como framework de automatización E2E. Los escenarios se ejecutan sobre un entorno de staging con datos de prueba sembrados previamente (`seed data`). Las pruebas corren en el pipeline de CI dentro del Sprint 5, en navegadores Chromium, Firefox y WebKit.

---

### 1.4 Pruebas de Carga

Las pruebas de carga evalúan el comportamiento del sistema bajo condiciones de tráfico elevado y sostenido, con el objetivo de identificar cuellos de botella y validar la estabilidad del sistema bajo estrés.

| Tipo | Objetivo |
|---|---|
| **Carga de pico (spike test)** | Simular el pico de tráfico del primer día de clases sobre los endpoints de consulta de disponibilidad. |
| **Carga sostenida (soak test)** | Verificar la estabilidad del sistema durante períodos prolongados de carga moderada-alta (mínimo 30 minutos). |
| **Carga incremental (ramp-up test)** | Identificar el punto de quiebre del sistema aumentando gradualmente la cantidad de usuarios virtuales concurrentes. |

**Herramienta:** `k6` (ver Sección 2).

---

## 2. Escenarios de Carga y Umbrales de Aceptación (k6)

### 2.1 Escenario Principal: Pico del Primer Día de Clases

**Objetivo:** Simular el tráfico simultáneo máximo esperado sobre los endpoints de consulta de disponibilidad de espacios durante el primer día del período académico, que representa el momento de mayor demanda del sistema.

**Endpoints bajo carga:**

- `GET /api/v1/espacios/disponibles` — Consulta general de disponibilidad
- `GET /api/v1/espacios/{id}/horarios` — Consulta de horarios por espacio
- `POST /api/v1/asignaciones` — Solicitud de asignación (incluido en el pico)

**Configuración del escenario k6:**

```javascript
// k6/scenarios/pico_primer_dia.js
import http from 'k6/http';
import { check, sleep } from 'k6';
import { Trend, Rate } from 'k6/metrics';

const latenciaConsulta = new Trend('latencia_consulta_p95');
const tasaError = new Rate('tasa_error');

export const options = {
  scenarios: {
    pico_primer_dia: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '2m', target: 100 },   // Rampa de subida
        { duration: '5m', target: 300 },   // Pico sostenido (300 VUs concurrentes)
        { duration: '2m', target: 300 },   // Meseta del pico
        { duration: '1m', target: 0  },    // Rampa de bajada
      ],
      gracefulRampDown: '30s',
    },
  },

  // ─── Umbrales formales de aceptación ─────────────────────────────────────
  thresholds: {
    'http_req_duration{scenario:pico_primer_dia}': ['p(95)<2000'],  // p95 < 2 000 ms
    'tasa_error':                                  ['rate<0.01'],   // Error rate < 1 %
    'http_req_failed':                             ['rate<0.01'],   // Fallos HTTP < 1 %
  },
};

export default function () {
  const BASE_URL = __ENV.BASE_URL || 'https://staging.saie.internal';

  const endpoints = [
    `${BASE_URL}/api/v1/espacios/disponibles`,
    `${BASE_URL}/api/v1/espacios/1/horarios`,
    `${BASE_URL}/api/v1/espacios/2/horarios`,
  ];

  const url = endpoints[Math.floor(Math.random() * endpoints.length)];
  const res = http.get(url, { tags: { name: 'consulta_disponibilidad' } });

  const ok = check(res, {
    'status es 200':          (r) => r.status === 200,
    'respuesta no vacía':     (r) => r.body.length > 0,
    'latencia aceptable':     (r) => r.timings.duration < 2000,
  });

  latenciaConsulta.add(res.timings.duration);
  tasaError.add(!ok);

  sleep(Math.random() * 2 + 1); // Think time: 1-3 segundos
}
```

---

### 2.2 Umbrales Formales de Aceptación Técnica

Los siguientes umbrales son **obligatorios** para que una ejecución de prueba de carga sea considerada exitosa. El incumplimiento de cualquiera de ellos constituye un **fallo bloqueante** que impide el despliegue a producción.

| Métrica | Umbral | Justificación |
|---|---|---|
| **Latencia p95** (`http_req_duration`) | **< 2 000 ms** | El 95 % de las solicitudes deben resolverse en menos de 2 segundos bajo carga de pico, garantizando una experiencia de usuario aceptable según los estándares de la plataforma. |
| **Tasa de error máxima** (`tasa_error` / `http_req_failed`) | **< 1 %** | Menos del 1 % de las solicitudes pueden fallar (errores HTTP 5xx o timeouts) durante el escenario de pico. Tasas superiores indican inestabilidad sistémica inaceptable. |
| **Latencia p99** (`http_req_duration`) | **< 5 000 ms** | Métrica complementaria: el 99 % de las solicitudes deben completarse en menos de 5 segundos (umbral de tolerancia máxima). |
| **Duración media** (`http_req_duration avg`) | **< 800 ms** | La latencia promedio no debe superar 800 ms para garantizar fluidez percibida en condiciones normales de carga. |

> **Ejecución:** Las pruebas de carga se ejecutan en el entorno de **staging** antes de cada despliegue a producción programado. Los resultados se publican automáticamente como artefactos del pipeline CI/CD y se archivan en el repositorio de evidencias del proyecto.

---

## 3. Quality Gates y Política de Manejo de Bugs

### 3.1 Quality Gates del Pipeline CI/CD con SonarCloud

Los Quality Gates son controles automáticos obligatorios integrados en el pipeline de Integración Continua (CI/CD). **Ningún despliegue puede proceder si alguno de estos criterios no se cumple.**

#### 3.1.1 Criterios de Quality Gate

| Criterio | Umbral requerido | Consecuencia de fallo |
|---|---|---|
| **Cobertura de código** (`Coverage`) | **>= 85 %** | El pipeline se detiene; el despliegue queda bloqueado hasta alcanzar el umbral. |
| **Bugs críticos** (`Bugs` con severidad `CRITICAL` o `BLOCKER`) | **0 bugs** | Bloqueo inmediato del despliegue. No se admiten excepciones sin aprobación explícita del Tech Lead documentada en el issue correspondiente. |
| **Code Smells** (`Code Smells` con severidad `CRITICAL`) | **0 smells críticos** | Bloqueo del despliegue en ramas de producción (`main`). En ramas de desarrollo se genera una advertencia. |
| **Vulnerabilidades de seguridad** (`Vulnerabilities`) | **0 de severidad `HIGH` o `CRITICAL`** | Bloqueo del despliegue en cualquier rama. |
| **Duplicación de código** (`Duplicated Lines`) | **< 10 %** | Advertencia (no bloqueante) en PR; bloqueante si supera el 15 %. |

#### 3.1.2 Configuración del Quality Gate en SonarCloud

El Quality Gate se define en el archivo `sonar-project.properties` en la raíz del repositorio:

```properties
# sonar-project.properties
sonar.projectKey=saie_project
sonar.organization=saie-org
sonar.sources=src
sonar.tests=tests
sonar.coverage.exclusions=**/migrations/**,**/config/**,**/__init__.py

# Quality Gate mínimo exigido
sonar.qualitygate.wait=true
```

El Quality Gate llamado `SAIE Gate` debe configurarse directamente en la interfaz de SonarCloud con los umbrales de la tabla anterior.

---

### 3.2 Política de Manejo de Defectos (Bug Policy)

Esta política establece el tratamiento obligatorio de todos los defectos detectados durante el ciclo de vida del proyecto, diferenciando por el contexto en que son descubiertos.

#### 3.2.1 Defectos en Pruebas Unitarias (Sprints 1–3)

- **Alcance:** Bugs encontrados durante la ejecución de pruebas unitarias, parametrizadas o de integración a nivel de componente dentro de los Sprints 1, 2 y 3.
- **Política:** El defecto **se corrige en el mismo sprint** en que fue detectado, antes del cierre de sprint.
- **Procedimiento:**
  1. El desarrollador que detecta el fallo lo reporta en el tablero de sprint como una subtarea del issue que lo originó.
  2. La corrección se realiza inmediatamente, sin necesidad de crear un issue de bug independiente.
  3. La cobertura de prueba que detectó el fallo se mantiene como prueba de regresión permanente.
- **Justificación:** Los defectos en etapas tempranas tienen bajo costo de corrección y contexto de desarrollo fresco. La corrección inmediata previene la acumulación de deuda técnica.

#### 3.2.2 Defectos en Pruebas de Sistema Integradas (Sprint 4 en adelante)

Aplica a los defectos detectados en:
- Pruebas de carga con k6 (escenarios de pico y sostenidos) — **primera corrida en Sprint 4**
- Pruebas End-to-End con Playwright
- Pruebas de sistema en entorno de staging o producción

**Regla obligatoria:** Todo defecto detectado en este contexto **debe registrarse como un issue de bug nuevo y trazable** en el sistema de gestión del proyecto (GitHub Issues). **Las correcciones silenciosas están explícitamente prohibidas.**

> **Nota de alcance:** Esta política entra en vigencia a partir del **Sprint 4**, cuando se realiza la primera corrida de pruebas de carga con k6. A partir de ese momento, cualquier fallo detectado en pruebas de sistema (carga o E2E) debe seguir el procedimiento de registro obligatorio descrito a continuación.

##### Procedimiento obligatorio para bugs de sistema:

```
1. DETECCIÓN
   └─ Se detecta la falla en la ejecución automatizada (k6, Playwright, etc.)

2. REGISTRO OBLIGATORIO
   └─ Se crea un issue de bug en GitHub con la plantilla bug_report.md
      ├─ Título: [BUG] <descripción concisa del fallo>
      ├─ Labels: bug, sprint-4/sprint-5, <tipo: carga | e2e | staging>
      ├─ Evidencia adjunta: logs de k6, captura de Playwright, stack trace
      ├─ Pasos para reproducir
      ├─ Comportamiento esperado vs. observado
      └─ Issue vinculado al PR que introduce la prueba fallida

3. PRIORIZACIÓN
   └─ El Tech Lead asigna severidad (CRITICAL / HIGH / MEDIUM / LOW)
      y sprint de resolución en la siguiente reunión de planificación.

4. CORRECCIÓN TRAZABLE
   └─ El PR de corrección debe referenciar el issue con Fixes #<número>
      y contener la prueba de regresión que garantiza la no-recurrencia.

5. VERIFICACIÓN
   └─ El QA ejecuta nuevamente el escenario de prueba original y confirma
      el cierre del issue con evidencia documentada.
```

##### Tabla de clasificación de severidad para bugs de sistema:

| Severidad | Criterio | SLA de resolución |
|---|---|---|
| **CRITICAL** | El sistema es inoperable o viola umbrales de k6 bajo carga de pico | Antes del siguiente despliegue |
| **HIGH** | Flujo E2E falla en happy path; error rate > umbral | Dentro del sprint activo |
| **MEDIUM** | Flujo E2E falla en camino alternativo; degradación de rendimiento | Próximo sprint |
| **LOW** | Impacto cosmético o de UX menor; no afecta funcionalidad | Backlog priorizado |

---

### 3.3 Resumen Visual del Ciclo de Calidad

```
  Sprint 1-3                Sprint 4                      Sprint 5
  ────────────────────────────────────────────────────────────────────────
  [Pruebas Unitarias]   [Pruebas Integración]          [E2E]
  [Pruebas Integración]     [Carga k6]                 [Playwright]
        │                        │                           │
        ▼                        ▼                           ▼
  Bug detectado?          Bug detectado?              Bug detectado?
        │                        │                           │
        ▼                        ▼                           ▼
  Corregir en         Corregir en sprint          REGISTRAR issue GitHub
  mismo sprint        + regresión                 → Priorizar → Corregir
                            │                     → Verificar → Cerrar
                            ▼                           │
                    REGISTRAR issue GitHub ◄────────────┘
                    → Priorizar → Corregir
                    → Verificar → Cerrar
  ────────────────────────────────────────────────────────────────────────
                    ↓ Quality Gates SonarCloud ↓
              Cobertura >= 85% │ 0 Bugs CRITICAL
              ────────────────────────────────
                  ✅ PASS → Despliegue permitido
                  ❌ FAIL → Despliegue bloqueado
```

---

## Control de Cambios

| Versión | Fecha | Autor | Descripción |
|---|---|---|---|
| 1.0.0 | 2026-09-16 | QA SAIE | Creación inicial del Plan Maestro de Pruebas (Issue #5.12) |
| 1.1.0 | 2026-09-22 | QA SAIE | Alineación con Backlog v2.0: (1) nuevo módulo «Cercanía entre secciones paralelas» en §1.1; (2) política de bugs de sistema adelantada a Sprint 4 en §3.2.2; (3) diagrama ASCII actualizado en §3.3. |

---

*Este documento es de carácter normativo para el equipo SAIE. Cualquier modificación debe ser aprobada por el Asegurador de Calidad y el Tech Lead, y registrada en la tabla de control de cambios.*
