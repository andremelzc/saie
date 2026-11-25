# Sistema de Asignación Inteligente de Espacios (SAIE)

> Plataforma integral para la asignación inteligente y óptima de espacios académicos (aulas teóricas y laboratorios), considerando capacidad real, compatibilidad de software, contigüidad física y priorización de accesibilidad e inclusión para estudiantes con movilidad reducida.
>
> **Facultad de Ingeniería de Sistemas e Informática — UNMSM (Grupo 6 - 2026)**

---

## 1. Tabla del Stack Tecnológico Acordado

A continuación se resume el stack tecnológico del proyecto. Para la justificación y análisis de cada herramienta, remitirse a la [Sección 4 del Documento de Arquitectura](docs/arquitectura.md#4-tecnolog%C3%ADas-y-herramientas).

| Área / Componente | Tecnología | Propósito |
| :--- | :--- | :--- |
| **Backend Runtime** | Node.js (v24 LTS) | Entorno de ejecución en servidor de alto rendimiento I/O. |
| **Backend Framework** | Express + TypeScript | Construcción de la API REST modular y tipada. |
| **ORM** | Prisma | Mapeo objeto-relacional y migraciones seguras con TypeScript. |
| **Validación** | Zod | Esquemas de validación en tiempo de ejecución y tipado estático. |
| **Base de Datos** | PostgreSQL (Supabase / Local) | Motor relacional transaccional (Supabase en prod, contenedor Docker en local). |
| **Frontend Framework** | React 19 + TypeScript | SPA reactiva y modular con tipado estático estricto. |
| **Frontend Styling** | TailwindCSS v4 | Sistema de utilidades CSS moderno, responsivo y eficiente. |
| **Enrutamiento** | React Router v7 | Navegación declarativa y gestión de rutas en la SPA. |
| **Cliente HTTP** | Axios | Cliente HTTP con interceptores para JWT y manejo de errores. |
| **Pruebas de Integración** | Jest + Supertest + ts-jest | Validación funcional y pruebas de integración de endpoints REST. |
| **Pruebas E2E** | Playwright | Automatización de flujos de usuario sobre navegadores reales. |
| **Pruebas de Carga** | k6 | Evaluación de rendimiento, latencia y concurrencia. |
| **CI / CD** | GitHub Actions & SonarCloud | Integración continua, análisis estático y métricas de calidad. |
| **Despliegue** | Vercel (Front) & Render (Back) | Hosting en la nube con despliegue continuo. |

---

## 2. Estructura del Repositorio

El proyecto utiliza una arquitectura monorepo organizada en carpetas con límites claros:

```
saie/
├── .nvmrc                      # Versión de Node.js fijada (v24.16.0)
├── .github/workflows/          # ci.yml, cd.yml, asignacion-programada.yml, resumen-diario.yml
├── docker-compose.yml          # Contenedor de PostgreSQL local para desarrollo
├── package.json                # Workspaces de npm y scripts unificados
├── docs/                       # Documentación del proyecto (ver sección 10)
│   └── specs/                  # Especificaciones técnicas por épica
├── assets/planos/              # Planos vectoriales SVG de los tres pisos (Issue 6.10)
├── demo/                       # CSV de demostración y de pruebas manuales
├── tools/planos/               # Fuentes y conversor de los planos
├── backend/                    # API REST, motor de reglas e importadores
│   ├── prisma/
│   │   ├── schema.prisma       # Esquema de base de datos
│   │   ├── migrations/         # Migraciones de Prisma
│   │   ├── seed.ts             # Seed desde Excel (Issue 5.17)
│   │   └── *.ts                # Scripts de mantenimiento (exportar, restablecer claves, …)
│   ├── src/
│   │   ├── app.ts              # Configuración de Express, CORS y middlewares
│   │   ├── index.ts            # Punto de entrada y servidor HTTP
│   │   ├── routes/             # Enrutadores Express por área
│   │   ├── controllers/        # Controladores de endpoints
│   │   ├── services/           # Lógica de negocio y orquestación del motor
│   │   ├── rules/              # Reglas del motor de asignación
│   │   ├── importers/          # Importadores masivos (CSV)
│   │   ├── events/             # Bus de eventos interno
│   │   ├── telegram/           # Bot y avisos por Telegram
│   │   ├── middlewares/        # Autenticación, roles, límites y errores
│   │   ├── lib/                # Prisma y utilidades
│   │   └── types/              # DTO compartidos
│   ├── tests/                  # Pruebas unitarias y de integración (Jest + Supertest)
│   └── .env.example            # Variables de entorno requeridas
├── frontend/                   # Portales web y panel administrativo (SPA)
│   ├── src/
│   │   ├── pages/              # Pantallas por rol
│   │   ├── components/         # Componentes por área y sistema de diseño (ui/)
│   │   ├── services/           # Llamadas a la API (Axios)
│   │   ├── config/rutas.ts     # Rutas de la SPA
│   │   └── hooks/, context/, utils/, types/
│   └── .env.example            # Variables de entorno de frontend
└── tests/                      # Suites que prueban el sistema completo
    ├── e2e/                    # Pruebas end-to-end con Playwright y axe
    └── load/                   # Pruebas de carga con k6
```

---

## 3. Requisitos Previos

- **Node.js**: Versión `24.x` (o la especificada en [.nvmrc](.nvmrc)).
  ```bash
  nvm use
  ```
- **Docker y Docker Compose** (para PostgreSQL local): [Instalar Docker Desktop](https://www.docker.com/products/docker-desktop/).
- **npm**: Versión `10.x` o superior.

---

## 4. Instalación y Configuración Paso a Paso

### 1. Clonar el repositorio
```bash
git clone https://github.com/andremelzc/saie.git
cd saie
```

### 2. Instalar dependencias
Desde la raíz del repositorio, npm instalará recursivamente las dependencias de todos los workspaces:
```bash
npm install
```

### 3. Configurar variables de entorno
Crea los archivos `.env` a partir de los ejemplos provistos:

**Backend:**
```bash
cp backend/.env.example backend/.env
```
*(En Windows PowerShell: `Copy-Item backend/.env.example backend/.env`)*

**Frontend:**
```bash
cp frontend/.env.example frontend/.env
```
*(En Windows PowerShell: `Copy-Item frontend/.env.example frontend/.env`)*

> [!NOTE]
> Por defecto, `backend/.env.example` viene configurado para conectarse a la base de datos PostgreSQL local levantada mediante Docker.

### 4. Iniciar la base de datos PostgreSQL local
Ejecuta el servicio de base de datos en segundo plano:
```bash
npm run docker:db
```
*Esto levantará una instancia de PostgreSQL en `localhost:5432` con la base `saie_dev`.*

### 5. Aplicar migraciones, generar el cliente de Prisma y cargar los datos
```bash
npm run prisma:deploy
npm run prisma:generate
npm run prisma:seed
```

El seed lee `backend/prisma/data/seed-plantilla.xlsx`, que **no está versionado**: pídelo al Maintainer o indica otra ruta con `SEED_ARCHIVO`. Detalle en el [Manual técnico §6.2](docs/manual_tecnico.md#62-reconstruir-la-base-con-el-seed-issue-517).

> **Después de cada `git pull`:** si el pull trae cambios en `backend/prisma/schema.prisma`, vuelve a ejecutar `npx prisma generate` dentro de `backend/`. Si no lo haces, el cliente de Prisma queda desactualizado: el backend no compila y fallan las pruebas que usan los modelos nuevos (riesgo R27 de `docs/riesgos_y_brechas.md`). No se automatiza con `postinstall` porque `prisma` es una dependencia de desarrollo y el despliegue podría instalar solo las de producción.

---

## 5. Ejecución del Entorno de Desarrollo

Puedes iniciar tanto el backend como el frontend de forma independiente o simultánea:

### Iniciar Backend (Puerto 3000)
```bash
npm run dev:backend
```
El servidor arrancará en modo watch con `tsx` en `http://localhost:3000`.  
Verifica el estado en: `http://localhost:3000/api/health`.

### Iniciar Frontend (Puerto 5173)
```bash
npm run dev:frontend
```
La aplicación web Vite estará disponible en `http://localhost:5173`.

---

## 6. Scripts Disponibles

Todos los comandos principales pueden ejecutarse directamente desde la raíz del proyecto:

| Script | Descripción |
| :--- | :--- |
| `npm run dev:backend` | Inicia el servidor Express en desarrollo con recarga en caliente (`tsx watch`). |
| `npm run dev:frontend` | Inicia el servidor de desarrollo de Vite para React. |
| `npm run build` | Compila TypeScript en backend (`dist/`) y construye el bundle de frontend (`build:backend` y `build:frontend` por separado). |
| `npm run test` | Ejecuta las pruebas de backend (Jest + Supertest) y de frontend (Vitest). `test:backend` y `test:frontend` por separado. |
| `npm run test:watch` | Ejecuta Jest en modo interactivo/observador. |
| `npm run test:coverage` | Genera el reporte de cobertura de backend y frontend. |
| `npm run test:e2e` | Ejecuta las pruebas end-to-end con Playwright. |
| `npm run test:load` | Ejecuta la prueba de carga del pico del primer día con k6. |
| `npm run lint` | Ejecuta el análisis estático de ESLint en backend y frontend. |
| `npm run format` | Aplica el formato automático de código con Prettier en backend y frontend. |
| `npm run format:check` | Verifica que el código cumpla con las reglas de estilo de Prettier sin modificarlo. |
| `npm run prisma:generate` | Genera los tipos de Prisma Client basados en el esquema. |
| `npm run prisma:migrate` | Crea y aplica migraciones en desarrollo (`prisma migrate dev`). |
| `npm run prisma:deploy` | Aplica las migraciones pendientes sin crear nuevas (`prisma migrate deploy`). |
| `npm run prisma:seed` | Carga la base desde el Excel del seed. |
| `npm run docker:db` | Levanta el contenedor Docker con la base de datos PostgreSQL local. |
| `npm run docker:down` | Detiene y remueve los contenedores Docker locales. |

---

## 7. Ejecución de Pruebas

### Pruebas unitarias y de integración (Jest, Supertest y Vitest)
```bash
npm run test
```
Las de backend están en `backend/tests/` (`unit/` e `integration/`) y necesitan `DATABASE_URL` y `DIRECT_URL`; las de frontend están junto a cada componente (`*.test.tsx`).

### Pruebas End-to-End (Playwright)
```bash
# Instalar los navegadores de Playwright si es la primera vez
npx playwright install --with-deps

# Ejecutar pruebas E2E
npm run test:e2e
```

### Pruebas de Carga (k6)
Requiere tener instalado [k6](https://k6.io/docs/get-started/installation/):
```bash
npm run test:load                      # pico del primer día (tests/load/pico_primer_dia.js)
k6 run tests/load/smoke-load-test.js   # prueba de humo
```
Detalle de escenarios y umbrales en [`tests/load/README.md`](tests/load/README.md).

---

## 8. Convenciones de Trabajo, Ramas y Commits

El proyecto adopta un flujo de trabajo basado en **GitFlow / Feature Branching** y el estándar de **Conventional Commits**:

### 8.1. Estructura de Ramas
* **`main`**: Producción y entregables estables congelados. Protegida contra pushes directos.
* **`develop`**: Rama base de integración continua durante cada Sprint.
* **Ramas de trabajo**: Se ramifican desde `develop` con la nomenclatura:
  * `feature/<issue-id>-<descripcion>`: Nuevas funcionalidades (ej. `feature/1.2-modelo-datos`).
  * `docs/<issue-id>-<descripcion>`: Documentación formal (ej. `docs/1.2-6.5-arquitectura-y-modelo-datos`).
  * `bugfix/<issue-id>-<descripcion>`: Corrección de incidencias.
  * `chore/<issue-id>-<descripcion>`: Mantenimiento, dependencias y configuración.

### 8.2. Política de Pull Requests (PR)
1. Los cambios se integran hacia `develop` mediante **Pull Request**.
2. Cada PR carga automáticamente la plantilla obligatoria ([`.github/pull_request_template.md`](.github/pull_request_template.md)), requiriendo:
   * Vinculación explícita al issue (`Closes #ID`).
   * Aprobación mediante revisión de código (*Code Review*).
   * Verificación de calidad: compilación limpia (`npm run build`), linters (`npm run lint`), formateo (`npm run format:check`) y pruebas (`npm run test`).
3. Al cierre de cada Sprint, se realiza el PR de integración de `develop` hacia `main`.

### 8.3. Commits
* Formato: `tipo(ámbito opcional): descripción breve en presente imperativo` (ej: `docs(arquitectura): actualizar diagrama y principios de diseno`).
* Guía completa y detallada en [docs/git-workflow.md](docs/git-workflow.md).

---

## 9. Despliegue y Ambientes (Producción / Demo)

El sistema SAIE se encuentra desplegado y disponible en un entorno de demostración continuo utilizando plataformas en la nube:

### 9.1. URLs Públicas del Sistema

| Servicio / Capa | Plataforma | URL Pública |
| :--- | :--- | :--- |
| **Frontend Web** | Vercel | [https://saie-plum.vercel.app/](https://saie-plum.vercel.app/) |
| **Backend API** | Render | [https://saie-backend.onrender.com/api](https://saie-backend.onrender.com/api) |
| **Health Check** | Render | [https://saie-backend.onrender.com/api/health](https://saie-backend.onrender.com/api/health) |
| **Base de Datos** | Supabase | PostgreSQL administrado con RLS y Connection Pooler |

### 9.2. Flujo de Despliegue Continuo (CI/CD)

El despliegue está 100% automatizado y blindado mediante GitHub Actions, con dos workflows: la integración continua ([`.github/workflows/ci.yml`](.github/workflows/ci.yml)) y el despliegue continuo ([`.github/workflows/cd.yml`](.github/workflows/cd.yml)), que reutiliza el CI como puerta de calidad:

1. **Pull Request:** Al abrir o actualizar un PR hacia `develop`, se ejecutan automáticamente los análisis de calidad (compilación TypeScript sin emisión con `tsc --noEmit`/`tsc -b`, ESLint, Prettier y pruebas Jest). Un error de tipos rompe el CI. Ningún despliegue se ejecuta en esta etapa.
2. **Merge a `develop`:** Al integrarse cambios a la rama principal, `cd.yml` ejecuta primero el CI (`ci.yml`) como quality gate.
3. **Migración y Despliegue:** **Únicamente si todos los checks pasan en verde**, el job `deploy` de `cd.yml`:
   * Aplica las migraciones de Prisma directamente sobre Supabase mediante la conexión directa (`DIRECT_URL`, puerto 5432).
   * Dispara el webhook seguro de Render (`RENDER_DEPLOY_HOOK_URL`) para compilar y desplegar la nueva versión del backend.
   * Construye y despliega el frontend en Vercel con la CLI (`vercel pull`, `vercel build` y `vercel deploy --prebuilt`), autenticada con los secrets `VERCEL_TOKEN`, `VERCEL_ORG_ID` y `VERCEL_PROJECT_ID`.
   * **Verifica la salud posterior al despliegue (Issue 5.24):** consulta `GET /api/health` del backend y la URL del frontend con reintentos (para tolerar el arranque en frío de Render); el job `deploy` falla si alguno no responde dentro de la ventana de espera.
4. **Procedimiento de Rollback (Issue 5.26):** Ante cualquier fallo en la verificación de salud o alerta crítica post-despliegue, se ejecuta el [Runbook de Rollback](docs/runbook_rollback.md) para revertir Render, Vercel y migraciones de Prisma.

### 9.3. Limitaciones y Notas Operativas (Capa Gratuita)

* **Tiempo de calentamiento en Render (*Cold Start*):** En el tier gratuito de Render, el contenedor entra en estado de suspensión tras 15 minutos sin tráfico. La primera petición posterior puede tardar entre 45 y 60 segundos en responder mientras se inicializa el servidor. Las solicitudes posteriores responden de forma instantánea.
* **Pausa por inactividad en Supabase:** La base de datos de Supabase entra en pausa automáticamente si transcurren 7 días continuos sin consultas. Para reactivarla, ingresar a [Supabase Dashboard](https://supabase.com/dashboard) y presionar *"Restore project"*.
* **Reconstrucción de la Base de Datos:** Si se requiere reiniciar o reaplicar el esquema con el dataset semilla del edificio:
  ```bash
  npm run prisma:migrate --workspace=backend
  npm run prisma:seed --workspace=backend
  ```

### 9.4. Secretos del Repositorio (GitHub Actions)

Se configuran en *Settings → Secrets and variables → Actions* y nunca se versionan:

| Secreto | Usado por | Propósito |
| :--- | :--- | :--- |
| `DIRECT_URL` | `cd.yml` | Conexión directa a Supabase (puerto 5432) para aplicar migraciones. |
| `RENDER_DEPLOY_HOOK_URL` | `cd.yml` | Webhook que dispara el despliegue del backend en Render. |
| `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID` | `cd.yml` | Autenticación de la CLI de Vercel para desplegar el frontend. |
| `BACKEND_URL` | `cd.yml`, `resumen-diario.yml` | URL pública del backend, sin barra final. Alimenta el health check posterior al despliegue y el resumen diario. |
| `FRONTEND_URL` | `cd.yml` | URL pública del frontend (p. ej. `https://saie-plum.vercel.app`). Habilita el health check del frontend; si no está configurado, esa verificación se omite con una advertencia. |
| `ASIGNACION_PROGRAMADA_TOKEN` | `asignacion-programada.yml` | Token de servicio de `POST /api/v1/asignaciones/programada` (corrida desatendida nocturna). |
| `RESUMEN_DIARIO_TOKEN` | `resumen-diario.yml` | Token de servicio de `POST /api/v1/telegram/resumen-diario`. |
| `SONAR_TOKEN` | `ci.yml` | Análisis estático en SonarCloud. |

### 9.5. Tareas Programadas (Automatización Desatendida)

Además del despliegue, dos workflows de GitHub Actions ejecutan tareas sin intervención humana:

| Workflow | Cadencia (UTC) | Qué hace |
| :--- | :--- | :--- |
| `resumen-diario.yml` | 12:30, lunes a sábado | Envía por Telegram el resumen de clases del día a los alumnos vinculados (Issue 3.27). |
| `asignacion-programada.yml` | 07:00 (02:00 en Lima), a diario | Ejecuta la corrida de asignación del periodo vigente, publica el resumen en la pestaña *Actions* y falla si el verificador reporta violaciones (Issue 2.18). |

Ambos toleran el arranque en frío de Render reintentando la llamada.

> [!NOTE]
> El candado que evita corridas simultáneas usa un *advisory lock* de PostgreSQL (Issue 5.33), así que sigue siendo válido si el backend escala a varias instancias.

---

## 10. Documentación

| Documento | Para qué sirve |
|---|---|
| [Informe final](docs/informe_final.md) | Resumen del proyecto: alcance entregado, gestión, calidad, decisiones y pendientes. |
| [Manual de usuario](docs/manual_usuario.md) | Qué puede hacer cada rol y cómo. |
| [Manual técnico](docs/manual_tecnico.md) | Instalación, variables de entorno, base de datos y seed, despliegue, operación y cómo extender el sistema. |
| [Guion de demostración](docs/guion_demo.md) | Guion de la sustentación y lista previa a la demo. |
| [Arquitectura](docs/arquitectura.md) y [Modelo de datos](docs/modelo-datos.md) | Diseño del sistema. |
| [Especificaciones técnicas](docs/specs/README.md) | Contratos de cada épica. |
| [Guía de pruebas por rol](docs/guia_pruebas_por_rol.md) | Recorrido manual del sistema con los cuatro roles. |
| [Riesgos y brechas](docs/riesgos_y_brechas.md) | Auditoría final, decisiones del equipo y propuestas pendientes. |
| [CHANGELOG](CHANGELOG.md) | Historial de versiones. |

