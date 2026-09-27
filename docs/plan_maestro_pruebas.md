# Plan Maestro de Pruebas — SAIE

> **Proyecto:** Sistema de Asignación Inteligente de Espacios (SAIE)
> **Rol responsable:** Asegurador de Calidad (QA)
> **Issue de referencia:** #5.12 — Plan Maestro de Pruebas (Sprint 0 inicio / Sprint 1 cierre)
> **Documentos fuente:** `01_definicion_y_alcance.md`, `02_requisitos.md`, `03_backlog_issues.md`, `04_cronograma_sprints.md`
> **Versión:** 2.0.0
> **Fecha:** 2026-09-27

---

## 0. Alcance de este documento

Este plan es la base de los Issues 5.1 a 5.11 del backlog (épica `epic:calidad`): define **antes de escribir el primer test**

1. el criterio de granularidad de pruebas por tipo (unitaria/paramétrica, integración, E2E, carga) y qué issue de origen valida cada una,
2. los escenarios de carga (k6) y sus umbrales de aceptación,
3. los quality gates formales y la política de manejo de bugs.

**Fuera de alcance de este documento:** la definición de entornos (local, CI, Vercel/Render/Supabase) y el origen de los datos de prueba — eso lo define el **Plan de Ambiente Controlado (Issue 5.13)**, que este plan solo referencia. Tampoco define el detalle de accesibilidad WCAG de cada pantalla — eso es responsabilidad de FE (Issues 3.9, RNF-05) y se verifica de forma manual en la validación exploratoria de cierre (Issue 5.15), no como una suite automatizada propia del backlog actual.

**Principio que atraviesa todo el plan:** el SAIE tiene un **motor de reglas único** para aulas teóricas y laboratorios (un campo `tipo` en el modelo de datos determina las reglas aplicables), pero **difieren en dos puntos**: la capacidad real descuenta PCs malogradas solo en laboratorios, y la matriz de software solo aplica a laboratorios (se considera automáticamente cumplida en bloques de aula). Por eso, **todo módulo de prueba del motor debe cubrir ambos tipos de espacio por separado**, y no solo laboratorios como caso "por defecto".

**Aclaración de dominio (para evitar el error de la versión 1.1):** el SAIE **no es un sistema de reservas**. El alumno nunca elige ni confirma un espacio: el motor de reglas asigna automáticamente en una corrida batch o bajo demanda, y el alumno solo **consulta** dónde quedó ubicado (RF-07/RF-08). Cualquier escenario de prueba que hable de "el estudiante reserva un espacio" está fuera del alcance real del sistema.

---

## 1. Criterio de Granularidad de Pruebas

> Los issues 5.1–5.7 y 5.16 se corrigen dentro del mismo sprint en que se implementa su issue de origen (ver §3.2). Los issues 5.8 y 5.9 corren sobre el sistema ya integrado.

### 1.1 Pruebas Unitarias y Parametrizadas (Sprints 1–2)

Validan una función o módulo del motor de reglas de forma aislada, sin base de datos real (mocks/fixtures en memoria). Se usan casos parametrizados para cubrir los bordes de cada regla, **siempre repitiendo el caso para aula teórica y para laboratorio** salvo que la regla sea exclusiva de uno de los dos tipos.

| Issue de prueba | Valida (issue de origen) | Casos obligatorios |
|---|---|---|
| **5.1** — Capacidad real | 2.1 (RF-01) | Laboratorio con 0 PCs malogradas; laboratorio con todas las PCs malogradas; aula teórica (capacidad real = aforo nominal, sin descuento); capacidad justo en el límite de N alumnos |
| **5.2** — Consulta de contigüidad | 2.3 | Espacio con varios contiguos; espacio sin contiguos; simetría de la relación (si A es contiguo a B, B es contiguo a A); para aulas y laboratorios |
| **5.3** — Disponibilidad por horario | 2.4 (RF-14) | Sin solape; solape total; solape parcial; espacio sin asignaciones vigentes; para aulas y laboratorios |
| **5.4** — Búsqueda de bloque contiguo | 2.5 (RF-02) | Bloque de 1 espacio (aforo alto); bloque de 3+ espacios (aforo bajo); capacidad justo en el límite; espacios contiguos pero no disponibles; caso "sin bloque encontrado"; **un caso que verifique que nunca se mezclan aulas y laboratorios en el mismo bloque**; lista de candidatos determinista y sin duplicados |
| **5.5** — Validación de software | 2.6, 2.7 (RF-03) | Cumplimiento total, cumplimiento parcial y stack requerido vacío, **solo en laboratorios**; caso de bloque de aula teórica donde el control se omite automáticamente sin fallar por ausencia del campo de software |
| **5.6** — Accesibilidad / priorización Piso 1 | 2.8, 2.9 (RF-04) | Movilidad reducida con Piso 1 disponible; movilidad reducida con Piso 1 no disponible; sin movilidad reducida; para aulas y laboratorios |
| **5.16** — Cercanía entre secciones paralelas | 2.13 (RF-20) | Curso sin otras secciones paralelas asignadas (puntuación neutra); secciones paralelas en el mismo piso; en piso adyacente; en piso no adyacente; para aulas y laboratorios. (Los casos de desempate del Issue 2.14 se cubren en el Issue 5.7, no aquí) |

**Herramientas:** `Jest` + `ts-jest` (proyecto en TypeScript/Node.js con Prisma y Zod), usando `test.each` para los casos parametrizados. Sin conexión a PostgreSQL real: se mockea el acceso a datos o se usan fixtures en memoria.

**No forman parte de esta capa (para no duplicar con §1.2/§1.3):** el flujo orquestado completo (feliz/batch/escalamiento) y las pruebas de accesibilidad de UI (WCAG) de las pantallas, que no tienen un issue propio en el backlog actual.

---

### 1.2 Pruebas de Integración (Sprint 3)

Validan el **motor completo como una sola unidad**, contra una base PostgreSQL real (de servicio en CI), no contra mocks.

| Issue de prueba | Valida (issue de origen) | Casos obligatorios |
|---|---|---|
| **5.7** — Flujo completo (feliz, batch, escalamiento) | 2.10, 2.11, 2.12, 2.14 (RF-05, RF-06, RF-15) | Camino feliz para una sección individual (aula y laboratorio); corrida batch del periodo (teóricas y prácticas); escalamiento cuando ningún bloque cumple capacidad/disponibilidad/contigüidad/software; **idempotencia**: segunda corrida sin cambios mantiene las asignaciones vigentes, y una corrida con una sección modificada pasa la anterior a HISTÓRICA; desempate por cercanía a secciones paralelas, incluido el caso en que solo queda un bloque válido |

**Herramientas:** `Jest` + `Supertest` (para los endpoints que disparan la asignación) contra una base de datos PostgreSQL de servicio (Docker, la misma imagen usada en CI vía GitHub Actions).

---

### 1.3 Pruebas End-to-End (Sprint 5)

Simulan al usuario real navegando el sistema desplegado (frontend + backend + base de datos), sobre el flujo público de consulta.

| Issue de prueba | Valida (issue de origen) | Casos obligatorios |
|---|---|---|
| **5.9** — Flujo del estudiante | 3.7 (RF-07 a RF-10) | Ingresar código de alumno o de curso → ver resultado (tipo de espacio, pabellón, piso, identificador, horario, docente); caso de código inexistente → mensaje claro, sin exponer errores técnicos internos |

**Aclaración frente a la v1.1:** este flujo es de **consulta**, no de reserva. No existe un paso de "confirmar reserva" ni de "espacio sin cupo" desde la perspectiva del alumno — esas condiciones las resuelve el motor de asignación (§1.2), no la UI de consulta.

**Herramientas:** `Playwright`, ejecutado en el pipeline de CI dentro del Sprint 5, contra el entorno definido en el Plan de Ambiente Controlado (Issue 5.13) con datos del seed (Issue 5.17).

---

### 1.4 Pruebas de Carga (Sprint 4 primera corrida, Sprint 5 validación final)

Ver detalle completo en §2. Corresponden al **Issue 5.8**, que valida específicamente los endpoints de consulta por código de alumno (Issue 3.2) y por código de curso (Issue 3.4) — **no** el proceso de asignación, que es batch/manual y no se dispara por tráfico de alumnos.

---

## 2. Escenarios de Carga y Umbrales de Aceptación (k6)

### 2.1 Escenario: Pico del Primer Día de Clases

**Objetivo (RNF-01):** verificar que el endpoint público de consulta soporte el pico de tráfico simultáneo del primer día de clases, cuando todos los alumnos consultan su ubicación a la vez, sin degradar el tiempo de respuesta de forma crítica.

**Endpoints bajo carga (los dos que el Issue 5.8 declara que valida):**

- Consulta por código de alumno (Issue 3.2 → RF-07)
- Consulta por código de curso (Issue 3.4 → RF-08)

**Fuera de esta prueba:** cualquier endpoint de asignación (`Issue 2.11`, `2.15`) o de administración (alertas, panel). No son endpoints públicos de alto tráfico: la asignación es una corrida batch o bajo demanda de Coordinación Académica, no algo que dispare un pico de miles de alumnos.

**Configuración del escenario k6:**

```javascript
// tests/load/pico_primer_dia.js
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
        { duration: '1m', target: 50 },   // rampa de subida
        { duration: '3m', target: 150 },  // pico sostenido
        { duration: '1m', target: 0 },    // rampa de bajada
      ],
      gracefulRampDown: '30s',
    },
  },
  thresholds: {
    'http_req_duration{scenario:pico_primer_dia}': ['p(95)<2000'],
    'tasa_error': ['rate<0.01'],
    'http_req_failed': ['rate<0.01'],
  },
};

export default function () {
  const BASE_URL = __ENV.BASE_URL; // entorno local o de CI (nunca la instancia gratuita desplegada)

  const endpoints = [
    `${BASE_URL}/api/v1/consulta/alumno/:codigo`,  // Issue 3.2
    `${BASE_URL}/api/v1/consulta/curso/:codigo`,   // Issue 3.4
  ];

  const url = endpoints[Math.floor(Math.random() * endpoints.length)];
  const res = http.get(url, { tags: { name: 'consulta_ubicacion' } });

  const ok = check(res, {
    'status es 200 o 404 controlado': (r) => r.status === 200 || r.status === 404,
    'respuesta no vacía': (r) => r.body.length > 0,
  });

  latenciaConsulta.add(res.timings.duration);
  tasaError.add(!ok);

  sleep(Math.random() * 2 + 1);
}
```

> **Nota de nomenclatura:** las rutas del ejemplo (`/api/v1/consulta/...`) son ilustrativas — deben ajustarse a las rutas reales que definan BI al implementar los Issues 3.2 y 3.4. Lo que no cambia es **cuáles** endpoints se cargan (consulta de alumno y de curso) y que un `404` controlado (código inexistente, RF-10) es una respuesta válida, no un fallo.

**El volumen de VUs (150 concurrentes) es un punto de partida, no un valor fijo definitivo:** debe calibrarse contra el conjunto de volumen que entregue el seed de demostración (**Issue 5.17**), que es la fuente real de cuántos alumnos sintéticos existen en el dataset de prueba. Si el equipo define un tamaño de matrícula distinto en el seed, este número se ajusta antes de la primera corrida en Sprint 4.

### 2.2 Umbrales Formales de Aceptación

| Métrica | Umbral | Justificación |
|---|---|---|
| **Latencia p95** (`http_req_duration`) | < 2 000 ms | El 95 % de las consultas debe resolverse en menos de 2 s bajo el pico, según RNF-01 ("sin degradar el tiempo de respuesta de forma crítica") |
| **Tasa de error** (`tasa_error` / `http_req_failed`) | < 1 % | Excluye los `404` controlados de código inexistente (RF-10), que cuentan como respuesta correcta, no como error |

**Entorno de ejecución (obligatorio declarar en el reporte, por Issue 5.8):** la prueba corre contra un **entorno local o de CI**, con la misma configuración que producción — **nunca contra la instancia gratuita desplegada** (Vercel/Render/Supabase), porque el cold start de Render y la pausa de Supabase por inactividad invalidarían la medición.

**Ejecución:** primera corrida en **Sprint 4** (Issue 5.8) sobre el motor y los endpoints ya integrados; repetición de validación final en **Sprint 5**, cerrando los issues `bug` abiertos por la primera corrida. El script vive versionado en `/tests/load` (carpeta ya presente en el repositorio) y el reporte (latencia p95, tasa de error, entorno de ejecución) se documenta como artefacto del pipeline.

---

## 3. Quality Gates y Política de Manejo de Bugs

### 3.1 Quality Gates del Pipeline CI/CD (SonarCloud)

Los quality gates son los que definen **RNF-02, RNF-03 y el Issue 5.10b** — no se agregan criterios adicionales que el proyecto no pidió.

| Criterio | Umbral | Consecuencia de fallo |
|---|---|---|
| **Cobertura de código** | ≥ 85 % | El pipeline bloquea el merge/deploy hasta alcanzar el umbral (RNF-02) |
| **Bugs críticos** (SonarCloud, severidad crítica/bloqueante) | 0 | Bloqueo automático del despliegue (RNF-03) |

Estos dos gates se activan a partir del **Issue 5.10b (Sprint 3)**, sobre el pipeline base sin gates del **Issue 5.10a (Sprint 1)**. Antes de eso, el pipeline solo corre linter, formato y las pruebas unitarias/paramétricas ya escritas (5.1–5.4), sin bloquear nada.

Otras métricas que SonarCloud reporta por defecto (code smells, duplicación, vulnerabilidades) **quedan visibles en el dashboard como información de referencia**, pero no son gate bloqueante del proyecto: si el equipo decide más adelante subirlas a gate formal, ese cambio debe registrarse en la tabla de control de cambios de este documento, no asumirse de entrada.

**Revisión final:** en la semana de Cierre, el Issue 5.10b se revisa una última vez antes de la entrega (ver cronograma), y el Issue 5.18 (Sprint 5) atiende específicamente la cobertura de los módulos sin issue de pruebas propio (importadores, autenticación, alertas, endpoints del portal) para asegurar que el gate global de 85 % se sostenga.

---

### 3.2 Política de Manejo de Defectos

La política real del proyecto distingue por **dónde se detecta el defecto**, no por número de sprint fijo — la nota de la épica de calidad en el backlog lo dice de forma explícita:

> "Los issues 5.1–5.7 y 5.16 se corrigen dentro del mismo sprint en que se implementa su issue de origen. Los issues 5.8 y 5.9 corren sobre el sistema ya integrado: cualquier falla ahí se registra como un issue de bug nuevo, no como corrección silenciosa."

#### 3.2.1 Defectos en pruebas unitarias, paramétricas e integración (Issues 5.1–5.7, 5.16)

- **Alcance:** fallos detectados en las suites de las Issues 5.1 a 5.7 y 5.16, siempre dentro del mismo sprint en que se implementa el módulo que validan (Sprints 1 a 3).
- **Política:** se corrige **en el mismo sprint**, sin necesidad de abrir un issue `bug` independiente — la corrección es parte del ciclo normal de desarrollo del módulo.
- **Justificación:** el contexto de desarrollo está fresco y el costo de corrección es bajo; abrir un issue formal por cada fallo de una prueba unitaria recién escrita añadiría fricción sin valor de trazabilidad real.

#### 3.2.2 Defectos en pruebas de sistema (Issues 5.8 y 5.9)

- **Alcance:** fallos detectados por las pruebas de carga con k6 (primera corrida Sprint 4, validación final Sprint 5) y por las pruebas E2E con Playwright (Sprint 5), es decir, sobre el **sistema ya integrado**.
- **Política obligatoria:** todo defecto detectado aquí **se registra como un issue `bug` nuevo y trazable**, referenciando el issue de la prueba que lo detectó (5.8 o 5.9). **Las correcciones silenciosas están prohibidas** para esta capa.
- **Quién corrige:** el **Issue 5.19 (Sprint 5, rol BM + BI)** reserva tiempo explícito en el cronograma para atender los bugs de backend y del motor que abran las pruebas E2E y de carga; los bugs de frontend los atiende FE dentro de sus propios issues del Sprint 5.
- **Verificación:** tras cada corrección, se vuelve a correr la misma prueba que detectó el bug (no una nueva); el issue `bug` se cierra solo cuando esa prueba pasa en verde, o se difiere con una justificación escrita si no bloquea la entrega.

**Sin tabla de severidad propia:** el proyecto no define niveles CRITICAL/HIGH/MEDIUM/LOW con SLA — eso es responsabilidad de SonarCloud (para bugs críticos del código) y de la clasificación estándar de issues `bug` en GitHub (label `bug`, sin taxonomía adicional). Si el equipo decide adoptar una clasificación de severidad propia, debe registrarse en `06_gestion_cambios` o equivalente, no inventarse aquí sin respaldo.

---

### 3.3 Resumen del ciclo de calidad

```
 Sprints 1–3                              Sprint 4                    Sprint 5
 ─────────────────────────────────────────────────────────────────────────────
 Unitarias/param. (5.1–5.6, 5.16)      k6 primera corrida (5.8)     E2E (5.9)
 Integración (5.7)                                                  k6 validación final (5.8)
      │                                       │                          │
      ▼                                       ▼                          ▼
 Bug detectado?                         Bug detectado?             Bug detectado?
      │                                       │                          │
      ▼                                       ▼                          ▼
 Corregir en el mismo sprint          REGISTRAR issue `bug`   REGISTRAR issue `bug`
 (sin issue independiente)            → 5.19 corrige (BM+BI)  → 5.19 corrige (BM+BI)
                                       → re-ejecuta 5.8        → re-ejecuta 5.9/5.8
 ─────────────────────────────────────────────────────────────────────────────
                    Gate activo desde Sprint 3 (Issue 5.10b)
                 Cobertura ≥ 85 %   │   0 bugs críticos (SonarCloud)
                 ──────────────────────────────────────────
                     ✅ PASS → merge / deploy permitido
                     ❌ FAIL → bloqueo automático
```

---

## 4. Criterios de Salida del Proyecto

Este plan define, además, qué significa "terminado" para efectos del **Informe de Resumen de Pruebas (Issue 5.14)**, que debe concluir explícitamente si se cumplieron:

- Todas las suites de las Issues 5.1 a 5.7 y 5.16 en verde en CI, con cobertura ≥ 85 % por módulo (criterio de cada issue individual).
- Gate de SonarCloud en verde (cobertura global ≥ 85 %, 0 bugs críticos) — Issue 5.10b.
- Pruebas de carga (Issue 5.8) dentro de los umbrales de §2.2 en su corrida de validación final (Sprint 5).
- Pruebas E2E (Issue 5.9) en verde, cubriendo caso feliz y código inexistente.
- Validación manual y exploratoria (Issue 5.15) completada sobre el flujo integrado (importar → asignación → consulta → alerta → mapa), con hallazgos documentados.
- Sin issues `bug` críticos abiertos sin justificación escrita de diferimiento.

---

## Control de Cambios

| Versión | Fecha | Autor | Descripción |
|---|---|---|---|
| 1.0.0 | 2026-09-16 | QA SAIE | Creación inicial del Plan Maestro de Pruebas (Issue #5.12) |
| 1.1.0 | 2026-09-22 | QA SAIE | Alineación parcial con Backlog v2.0 |
| **2.0.0** | **2026-09-27** | **QA SAIE** | **Reescritura alineada al proyecto:** (1) corrige la confusión de dominio — el SAIE no tiene reservas, solo asignación automática + consulta; (2) reemplaza los endpoints y umbrales de k6 inventados por los reales (Issues 3.2/3.4, Issue 5.8), con nota explícita de que la asignación nunca corre bajo carga de alumnos; (3) añade trazabilidad completa a cada issue de prueba (5.1–5.9, 5.16) y su issue de origen; (4) restaura la distinción aula/laboratorio en cada módulo de pruebas unitarias (capacidad real y software); (5) elimina quality gates no solicitados por el proyecto (code smells, duplicación, vulnerabilidades) y la tabla de severidad sin respaldo documental; (6) corrige la política de bugs: la frontera real es "unitarias/integración (mismo sprint)" vs. "pruebas de sistema k6+E2E (issue `bug` trazable)", no un corte fijo por número de sprint; (7) añade sección de criterios de salida del proyecto, ligada al Issue 5.14. |

---

*Este documento es de carácter normativo para el equipo SAIE. Cualquier modificación debe ser aprobada por el Asegurador de Calidad y registrada en la tabla de control de cambios.*