# Plan de Ambiente Controlado — SAIE

> **Issue de referencia:** #5.13  
> **Rol responsable:** QA (`Angel14den`)  
> **Documentos relacionados:**  
> - [`docs/plan_maestro_pruebas.md`](./plan_maestro_pruebas.md) — Plan Maestro de Pruebas (referencia de umbrales y granularidad)  
> - [`docs/specs/06-estrategia-calidad-y-testing.md`](./specs/06-estrategia-calidad-y-testing.md) — Spec técnica de calidad  
> - Issue #5.17 — Script de seed y dataset de demostración (origen de datos de prueba)  
> - Issue #5.10a — Pipeline base de CI/CD (referencia de infraestructura de CI)  
> - Issue #1.10 — Despliegue continuo (referencia de entorno de producción/staging)  
> **Versión:** 1.0.0  
> **Fecha:** 2026-10-03  

---

## 1. Propósito y alcance

Este documento define los entornos del proyecto SAIE, su propósito, su aislamiento mutuo y cómo se garantiza la reproducibilidad de las pruebas automatizadas entre ellos. Su objetivo es que **ninguna suite de pruebas dependa de la máquina de un desarrollador específico ni de datos reales de alumnos** para producir resultados confiables.

> **Fuera de alcance de este documento:** la definición de umbrales de carga (§2 del Plan Maestro), la clasificación de bugs de sistema y la validación exploratoria manual (Issue 5.15). Este plan solo define los entornos y el origen de datos; los escenarios de prueba concretos se detallan en los issues individuales (5.1–5.9, 5.16).

---

## 2. Entornos del proyecto

El proyecto SAIE opera en tres entornos distintos, con propósitos y limitaciones diferenciadas:

### 2.1 Entorno local (desarrollo)

| Atributo | Detalle |
|---|---|
| **Propósito** | Desarrollo activo y ejecución rápida de pruebas unitarias/paramétricas |
| **Backend** | Node.js + Express ejecutado con `npm run dev` en `localhost:3000` |
| **Base de datos** | PostgreSQL local vía `DATABASE_URL` en `.env` (no compartida entre desarrolladores) |
| **Frontend** | React + Vite ejecutado con `npm run dev` en `localhost:5173` |
| **Prisma** | Cliente generado localmente con `npx prisma generate` |
| **Datos de prueba** | Mocks en memoria para pruebas unitarias; seed determinista del Issue 5.17 para pruebas manuales |

**Limitaciones:**
- La configuración de base de datos local **no está versionada** en el repositorio (`DATABASE_URL` vive en `.env`, que está en `.gitignore`). Cada desarrollador configura la suya.
- Las pruebas unitarias de las Issues 5.1–5.6 y 5.16 **no requieren base de datos**: usan mocks en memoria (Jest + `jest.fn()`).
- Las pruebas de integración (Issue 5.7) **sí requieren** una base de datos PostgreSQL activa. En local, el desarrollador debe levantar una instancia propia (Docker o Supabase local).

### 2.2 Entorno de CI (Integración Continua — GitHub Actions)

| Atributo | Detalle |
|---|---|
| **Propósito** | Validación automática en cada Pull Request hacia `develop` o `main` |
| **Disparador** | Push a ramas `feature/*`, `bugfix/*`, `chore/*` con PR abierto |
| **Pipeline** | `.github/workflows/ci.yml` (Issue #5.10a) |
| **Backend** | Ejecutado en el runner de GitHub Actions (Ubuntu) |
| **Base de datos** | Servicio PostgreSQL en contenedor Docker, efímero y aislado por corrida |
| **Variables de entorno** | Configuradas como GitHub Actions Secrets (`DATABASE_URL`, etc.) |
| **Prisma** | `npx prisma generate` + `npx prisma db push` o migraciones durante el pipeline |
| **Datos de prueba** | Script de seed del Issue 5.17 (`backend/prisma/seed.ts`), ejecutado automáticamente antes de las pruebas de integración |

**Garantía de reproducibilidad:**
1. El runner de CI parte siempre de un estado limpio (imagen Docker sin estado previo).
2. La base de datos de prueba se crea, migra y seedea en cada corrida; no se reutiliza entre PRs.
3. Las pruebas unitarias (Issues 5.1–5.6, 5.16) usan mocks y no tocan la base de datos, por lo que su resultado es 100% determinista independiente del entorno.
4. Las variables de entorno son las mismas en cada corrida (GitHub Secrets estables).

**Limitaciones:**
- El tiempo de arranque del servicio PostgreSQL en Docker agrega ~30–60 s por corrida. No es un problema para pruebas unitarias, sí para las de integración (Issue 5.7).
- El runner de CI tiene un límite de tiempo de ejecución por job (~6 horas en GitHub Free). Las pruebas de carga (k6, Issue 5.8) **no corren en CI por defecto**: se ejecutan manualmente o en un runner dedicado en Sprint 4.

### 2.3 Entorno desplegado (Staging/Producción — Vercel, Render, Supabase)

| Atributo | Detalle |
|---|---|
| **Propósito** | Demostración, validación exploratoria manual (Issue 5.15) y pruebas E2E (Issue 5.9 - Sprint 5) |
| **Frontend** | Vercel (deploy automático desde `main`) |
| **Backend** | Render (deploy automático desde `main`, plan gratuito) |
| **Base de datos** | Supabase PostgreSQL (plan gratuito) |
| **Datos** | Dataset de demostración cargado con el script de seed (Issue 5.17), **sin datos reales de alumnos** |

**Limitaciones conocidas (importantes para interpretar resultados de prueba):**

> [!WARNING]
> Las siguientes limitaciones **invalidan las mediciones de rendimiento** en este entorno. Por eso, las pruebas de carga (Issue 5.8) **nunca se ejecutan contra el entorno desplegado**.

- **Cold start de Render:** la instancia del backend en Render (plan gratuito) entra en reposo tras ~15 minutos de inactividad. La primera petición tras el reposo puede tardar 20–30 segundos. Esto no es un bug del sistema, es una limitación de la capa de infraestructura gratuita.
- **Pausa de Supabase por inactividad:** el proyecto de Supabase se pausa automáticamente si no recibe peticiones durante 7 días (plan gratuito). Debe reactivarse manualmente desde el dashboard antes de cualquier sesión de prueba o demostración.
- **Sin garantía de SLA:** el entorno desplegado no tiene acuerdo de nivel de servicio. No debe usarse como referencia para los umbrales de rendimiento del Plan Maestro (§2.2).

---

## 3. Origen y naturaleza de los datos de prueba

### 3.1 Datos de prueba unitaria (Issues 5.1–5.6, 5.16)

- **Origen:** mocks en memoria definidos directamente en cada archivo de test (`jest.fn()`, fixtures TypeScript).
- **Datos reales:** ninguno. No se usa `DATABASE_URL` ni se conecta a PostgreSQL.
- **Reproducibilidad:** 100% determinista. El mismo test produce el mismo resultado en cualquier máquina con Node.js y las dependencias instaladas.

### 3.2 Datos de prueba de integración (Issue 5.7) y E2E (Issue 5.9)

- **Origen:** script de seed determinista `backend/prisma/seed.ts` (Issue #5.17).
- **Contenido del seed:** edificio de 3 pisos, pabellones, aulas teóricas, laboratorios con matriz de software, cuentas de prueba sintéticas (docentes, alumnos), secciones de muestra con matrícula y horarios.
- **Datos reales:** **ninguno**. Los alumnos, docentes y matrículas del seed son ficticios y sintéticos. No contienen datos personales reales de ningún estudiante de la institución.
- **Reproducibilidad:** el script de seed es idempotente — borra y recrea el estado base en cada ejecución, garantizando el mismo punto de partida en CI y en local.

### 3.3 Datos de prueba de carga (Issue 5.8)

- **Origen:** el script k6 (`tests/load/pico_primer_dia.js`) accede a los endpoints con parámetros de consulta sintéticos generados aleatoriamente desde el dataset del seed.
- **Entorno de ejecución obligatorio:** local o CI con backend corriendo en contenedor. **Nunca contra el entorno desplegado** (Render/Supabase) por las limitaciones descritas en §2.3.
- **Volumen de VUs:** calibrado respecto al tamaño del dataset del seed. Ver Plan Maestro §2.1 para configuración detallada.

---

## 4. Cómo se verifica que CI/CD reproduce el mismo resultado en cualquier entorno

El pipeline de CI garantiza la reproducibilidad mediante los siguientes mecanismos:

| Mecanismo | Detalle |
|---|---|
| **Imagen base fija** | El runner de GitHub Actions usa `ubuntu-latest` con versión de Node.js fijada en el workflow (`node-version: '20'`) |
| **`package-lock.json` versionado** | Garantiza que `npm ci` instale exactamente las mismas versiones de dependencias en cualquier entorno |
| **Base de datos efímera** | PostgreSQL en Docker se levanta desde imagen oficial con versión fija (`postgres:15`), sin datos previos |
| **Seed determinista** | `backend/prisma/seed.ts` produce exactamente el mismo estado en cada ejecución (sin `Math.random()` sin semilla fija) |
| **Variables de entorno explícitas** | Ninguna variable de entorno tiene un valor por defecto implícito en el código; todas se declaran explícitamente como GitHub Secrets o en `.env.example` |
| **Pruebas unitarias sin estado externo** | Las suites de Issues 5.1–5.6 y 5.16 usan únicamente mocks en memoria, por lo que su resultado no depende de ningún servicio externo |

### 4.1 Procedimiento de verificación en CI (por PR)

1. El desarrollador abre un PR hacia `develop`.
2. El pipeline (`.github/workflows/ci.yml`) ejecuta en orden:
   a. `npm run lint` — linting del código
   b. `npm run format:check` — verificación de formato Prettier
   c. `npx tsc --noEmit` — compilación TypeScript sin errores
   d. Levanta servicio PostgreSQL en Docker
   e. `npx prisma generate` + `npx prisma db push` — aplica el esquema
   f. `npx ts-node backend/prisma/seed.ts` — carga el dataset de demostración
   g. `npm run test:coverage` — ejecuta todas las suites de Jest con reporte de cobertura
3. Si **todos** los pasos pasan, el PR puede ser revisado y fusionado.
4. Si **cualquier** paso falla, el merge queda bloqueado hasta corregir el fallo.

> **Nota:** Los quality gates de SonarCloud (cobertura ≥ 85%, 0 bugs críticos) se activan a partir del Issue 5.10b en Sprint 3 y se ejecutan como un paso adicional después del punto (g).

---

## 5. Resumen de entornos

```
┌─────────────────────────────────────────────────────────────────────────┐
│                      ENTORNOS DEL PROYECTO SAIE                         │
├────────────────┬──────────────────────┬──────────────────────────────── ┤
│   LOCAL        │   CI (GitHub Actions) │   DESPLEGADO (Vercel/Render)    │
├────────────────┼──────────────────────┼─────────────────────────────────┤
│ Pruebas unit.  │ Pruebas unit. + integ.│ E2E Playwright (Sprint 5)       │
│ Desarrollo     │ Linting + tsc         │ Demostración + exploit. manual  │
│ Mock en memoria│ PostgreSQL efímero    │ Supabase (datos sintéticos)     │
│ Sin DB real    │ Seed determinista     │ Seed determinista               │
│                │ Cobertura + gates*    │                                 │
├────────────────┼──────────────────────┼─────────────────────────────────┤
│ ⚠️ Pruebas k6  │ ⚠️ Pruebas k6         │ ❌ NUNCA pruebas de carga        │
│ (manual)       │ (runner dedicado)     │ (cold start invalida medición)  │
└────────────────┴──────────────────────┴─────────────────────────────────┘
                                         * Gates activos desde Sprint 3
```

---

## Control de cambios

| Versión | Fecha | Autor | Descripción |
|---|---|---|---|
| 1.0.0 | 2026-10-03 | Angel14den (QA) | Creación inicial del Plan de Ambiente Controlado (Issue #5.13) |
