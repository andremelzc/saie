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
├── .gitignore                  # Reglas globales de exclusión Git
├── docker-compose.yml          # Contenedor de PostgreSQL local para desarrollo
├── package.json                # Workspaces de npm y scripts unificados
├── docs/                       # Documentación técnica del proyecto
│   ├── arquitectura.md         # Documento de Arquitectura (DA)
│   ├── modelo-datos.md         # Documento de Modelo de Datos (DMD)
│   └── git-workflow.md         # Convenciones de Commits y Branching
├── assets/                     # Recursos estáticos globales
│   └── planos/                 # Planos vectoriales SVG (Issue 6.10)
├── backend/                    # API REST, motor de reglas e importadores
│   ├── prisma/
│   │   └── schema.prisma       # Definición del esquema de base de datos
│   ├── src/
│   │   ├── app.ts              # Configuración de Express, CORS y middlewares
│   │   ├── index.ts            # Punto de entrada y servidor HTTP
│   │   ├── lib/prisma.ts       # Instancia singleton de Prisma Client
│   │   ├── routes/             # Enrutadores Express (/api/health, etc.)
│   │   ├── controllers/        # Controladores de endpoints
│   │   ├── services/           # Lógica de negocio y dominio
│   │   ├── rules/              # Motor de reglas pedagógicas
│   │   ├── importers/          # Importadores masivos (CSV)
│   │   └── middlewares/        # Middlewares (Auth JWT, validación Zod)
│   ├── .env.example            # Variables de entorno requeridas
│   ├── tsconfig.json           # Configuración de TypeScript
│   ├── eslint.config.mjs       # Configuración de ESLint 9+
│   └── jest.config.js          # Configuración de pruebas Jest con ts-jest
├── frontend/                   # Portales web y panel administrativo (SPA)
│   ├── src/
│   │   ├── pages/              # Páginas y vistas (Home, Dashboard, etc.)
│   │   ├── services/api.ts     # Cliente Axios configurado
│   │   ├── components/         # Componentes reutilizables de UI
│   │   ├── hooks/              # Custom React Hooks
│   │   └── types/              # Definiciones e interfaces TypeScript
│   ├── .env.example            # Variables de entorno de frontend
│   ├── tsconfig.json           # Configuración de TypeScript
│   ├── eslint.config.js        # Configuración de ESLint
│   └── vite.config.ts          # Configuración de Vite + TailwindCSS
└── tests/                      # Suites de pruebas integrales
    ├── integration/            # Pruebas de integración de endpoints (Jest + Supertest)
    ├── e2e/                    # Pruebas end-to-end con Playwright
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

### 5. Generar el cliente de Prisma y aplicar migraciones
```bash
npm run prisma:generate
```

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
| `npm run build` | Compila TypeScript en backend (`dist/`) y construye el bundle de frontend. |
| `npm run test` | Ejecuta las pruebas unitarias y de integración de API con Jest y Supertest. |
| `npm run test:watch` | Ejecuta Jest en modo interactivo/observador. |
| `npm run test:coverage` | Genera reporte de cobertura de código con Jest. |
| `npm run test:e2e` | Ejecuta las pruebas end-to-end con Playwright. |
| `npm run lint` | Ejecuta el análisis estático de ESLint en backend y frontend. |
| `npm run format` | Aplica el formato automático de código con Prettier en todo el proyecto. |
| `npm run format:check` | Verifica que el código cumpla con las reglas de estilo de Prettier sin modificarlo. |
| `npm run prisma:generate` | Genera los tipos de Prisma Client basados en el esquema. |
| `npm run prisma:migrate` | Aplica migraciones pendientes sobre la base de datos configurada. |
| `npm run docker:db` | Levanta el contenedor Docker con la base de datos PostgreSQL local. |
| `npm run docker:down` | Detiene y remueve los contenedores Docker locales. |

---

## 7. Ejecución de Pruebas

### Pruebas de Integración (Jest + Supertest)
```bash
npm run test
```

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
k6 run tests/load/smoke-load-test.js
```

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

