# Manual técnico — SAIE

> **Issue:** 6.9 (#197) · **Versión del sistema:** `develop` al 25/11/2026
> **Para quién es:** el equipo que mantenga, despliegue o herede el sistema.

Este manual reúne lo necesario para instalar, operar y modificar SAIE. No repite el diseño: para eso están el [Documento de Arquitectura](arquitectura.md), el [Modelo de Datos](modelo-datos.md), las [especificaciones técnicas](specs/README.md) y las [reglas de asignación](03_alcance_y_reglas.md).

---

## 1. Vista general

```
Navegador (React SPA, Vercel) ──HTTPS──► API REST (Express, Render) ──Prisma──► PostgreSQL (Supabase)
                                              │
                                              ├── Motor de asignación (reglas duras y blandas)
                                              ├── Bus de eventos interno ──► Bot de Telegram
                                              └── GitHub Actions (corrida nocturna y resumen diario)
```

- **Monorepo** con workspaces de npm: `backend/`, `frontend/` y las pruebas E2E y de carga en `tests/`.
- **Un solo motor** de asignación sirve a la corrida completa del periodo, a la reasignación de una sección y a la reubicación desde alertas (Arquitectura §2.1).
- **Cuatro roles** (`Cuenta.rol`): `ALUMNO`, `DOCENTE`, `COORDINACION_ACADEMICA` y `JEFATURA_LABORATORIOS`. La autorización se aplica en el backend (`authGuard` + `roleGuard`); el frontend solo oculta lo que el rol no puede usar.

---

## 2. Tecnologías

| Capa | Tecnología | Versión (rango en `package.json`) |
|---|---|---|
| Runtime | Node.js | 24.16.0 (`.nvmrc`) |
| API | Express | ^5.2.1 |
| Lenguaje | TypeScript | backend ^5.7.3 · frontend ~6.0.2 |
| ORM | Prisma | ^6.4.0 |
| Base de datos | PostgreSQL | Supabase en producción, Docker en local |
| Validación | Zod | ^4.6.5 |
| Autenticación | jsonwebtoken + bcrypt | ^9.0.3 · ^6.0.0 |
| Seguridad HTTP | helmet, cors, express-rate-limit | ^8.3.0 · ^2.8.5 · ^8.7.4 |
| Registro | pino | ^10.4.0 |
| Importación | csv-parse, exceljs (seed) | ^7.0.2 · ^4.4.0 |
| SPA | React + React Router | ^19.2.8 · ^7.18.4 |
| Estilos | Tailwind CSS | ^4.3.3 |
| Empaquetado | Vite | ^8.3.0 |
| Mapa 3D | three + @react-three/fiber | ^0.186.1 · ^9.8.1 |
| Cliente HTTP | Axios | ^1.20.0 |
| Pruebas backend | Jest + ts-jest + Supertest | ^29.7.0 |
| Pruebas frontend | Vitest + Testing Library + axe-core | ^5.0.3 |
| E2E | Playwright + @axe-core/playwright | ^1.58.2 |
| Carga | k6 | instalación aparte |
| Calidad | ESLint, Prettier, SonarCloud | — |
| Despliegue | Vercel (frontend), Render (backend), GitHub Actions | — |

---

## 3. Estructura del repositorio

```
saie/
├── .github/workflows/     ci.yml, cd.yml, asignacion-programada.yml, resumen-diario.yml
├── assets/planos/         planos SVG de los tres pisos
├── backend/
│   ├── prisma/            schema.prisma, migrations/, seed.ts y scripts de mantenimiento
│   ├── src/
│   │   ├── routes/        un enrutador por área (admin, asignacion, auth, consulta, docente, …)
│   │   ├── controllers/   validan la entrada (Zod) y llaman a los servicios
│   │   ├── services/      lógica de negocio; motor.service.ts orquesta la asignación
│   │   ├── rules/         reglas del motor (capacidad, contigüidad, software, accesibilidad, cercanía)
│   │   ├── importers/     importadores CSV (docentes, cursos y secciones, horarios, matrículas)
│   │   ├── events/        bus de eventos interno (tipos.ts, registro.ts)
│   │   ├── telegram/      bot, avisos y cola de envíos con reintentos
│   │   ├── middlewares/   autenticación, roles, límites de peticiones, errores
│   │   ├── lib/           Prisma, utilidades de fechas, imágenes, periodos
│   │   └── types/         DTO compartidos
│   └── tests/             unit/, integration/ y helpers/ (Jest)
├── frontend/src/
│   ├── pages/             pantallas por rol (estudiante, docente, admin)
│   ├── components/        componentes por área y sistema de diseño en ui/
│   ├── services/          llamadas a la API
│   ├── config/rutas.ts    rutas de la SPA
│   └── hooks/, context/, utils/, types/
├── tests/                 e2e/ (Playwright) y load/ (k6)
├── demo/                  CSV de demostración y de pruebas manuales
├── docs/                  documentación del proyecto
└── tools/planos/          fuentes de los planos
```

---

## 4. Instalación local

**Requisitos:** Node.js 24 (`nvm use`), npm 10+, Docker Desktop.

```bash
git clone https://github.com/andremelzc/saie.git
cd saie
npm ci                                  # instala todos los workspaces
cp backend/.env.example backend/.env    # PowerShell: Copy-Item
cp frontend/.env.example frontend/.env
npm run docker:db                       # PostgreSQL en localhost:5432, base saie_dev
cd backend
npx prisma migrate deploy               # aplica las migraciones
npx prisma generate                     # genera el cliente
npm run prisma:seed                     # carga los datos (ver §6)
cd ..
npm run dev:backend                     # http://localhost:3000/api/health
npm run dev:frontend                    # http://localhost:5173
```

> **Después de cada `git pull`** que cambie `backend/prisma/schema.prisma`, ejecute `npx prisma generate` en `backend/`. Si no, el backend no compila y las pruebas fallan.

---

## 5. Variables de entorno

### 5.1 Backend (`backend/.env`)

| Variable | Obligatoria | Uso |
|---|---|---|
| `DATABASE_URL` | Sí | Conexión de la aplicación (en Supabase, el *pooler* en el puerto 6543 con `pgbouncer=true`). |
| `DIRECT_URL` | Sí | Conexión directa (puerto 5432) para migraciones. |
| `JWT_SECRET`, `JWT_EXPIRES_IN` | Sí | Firma y duración de las sesiones (por defecto `8h`). |
| `PORT`, `NODE_ENV`, `CORS_ORIGIN` | Sí | Puerto, entorno y origen permitido del frontend. |
| `TELEGRAM_BOT_TOKEN`, `TELEGRAM_WEBHOOK_SECRET`, `TELEGRAM_BOT_USERNAME` | No | Necesarias para el bot de Telegram y sus avisos (configuración en [Arquitectura §8](arquitectura.md#8-configuración-y-secretos-del-canal-de-telegram)). |
| `TELEGRAM_CHAT_JEFATURA` | No | Chat que recibe incidencias de prioridad Alta y alertas nuevas de capacidad y software. |
| `RESUMEN_DIARIO_TOKEN`, `ASIGNACION_PROGRAMADA_TOKEN` | No | Tokens de servicio de las tareas programadas (§8). |
| `REORGANIZACION_SEMANAS` | No | Semanas desde el inicio del periodo en que se permite «Reorganizar con prioridad» (por defecto 2). |
| `RATE_LIMIT_*`, `TRUST_PROXY` | No | Límites de intentos de login y de la consulta pública. `RATE_LIMIT_DISABLED=true` los apaga (solo desarrollo y k6). |
| `LOG_LEVEL`, `HEALTH_DB_TIMEOUT_MS` | No | Nivel de registro y tiempo máximo del chequeo de salud de la base. |

### 5.2 Frontend (`frontend/.env`)

| Variable | Uso |
|---|---|
| `VITE_API_BASE_URL` | URL base de la API, con `/api` al final (`http://localhost:3000/api` en local). |

---

## 6. Base de datos

### 6.1 Esquema y migraciones

- El esquema está en `backend/prisma/schema.prisma` y se describe en el [Modelo de Datos](modelo-datos.md).
- Hay **21 migraciones** en `backend/prisma/migrations/`. Las tablas usan Row Level Security en Supabase (migración `habilitar_rls` y las tablas nuevas en su propia migración).
- Nueva migración: `npm run prisma:migrate` (desarrollo). En producción las aplica el CD con `prisma migrate deploy`.

### 6.2 Reconstruir la base con el seed (Issue 5.17)

El seed (`npm run prisma:seed`) carga la base desde el Excel `backend/prisma/data/seed-plantilla.xlsx`: espacios, contigüidades, docentes, cursos, secciones, horarios, alumnos y matrículas.

- **El Excel no está versionado.** Pídalo al Maintainer (andremelzc) y colóquelo en `backend/prisma/data/`, o indique otra ruta con `SEED_ARCHIVO=ruta/al/archivo.xlsx`.
- Valida **todo** el archivo antes de escribir; si hay errores los lista (hoja y fila) y no toca la base. `SEED_SOLO_VALIDAR=1` solo valida, sin conectarse.
- Es **idempotente**: correrlo dos veces no duplica registros.
- Crea las cuentas de sistema `coordinacion` y `jefatura` (claves iniciales en `CUENTAS_SISTEMA` de `seed.ts`) y deja a Jefatura a cargo de todos los laboratorios.
- Las cuentas de alumnos y docentes usan su código como usuario y como clave inicial.

Pasos para reconstruir desde cero:

```bash
cd backend
npx prisma migrate reset     # ⚠️ borra la base local y reaplica las migraciones
npm run prisma:seed
```

En Supabase, nunca use `migrate reset`: aplique `prisma migrate deploy` y luego el seed.

### 6.3 Scripts de mantenimiento (`backend/`)

| Comando | Qué hace |
|---|---|
| `npm run prisma:export` | Vuelca la base a CSV en `prisma/export/`: los archivos `01`–`05` se pueden volver a importar (respaldo) y los de diagnóstico muestran asignaciones, secciones sin aula y software faltante. `EXPORT_PERIODO=2026-2` limita a un periodo. |
| `npx tsx prisma/restablecer-sistema.ts <usuario>` | Restablece la clave de `coordinacion` o `jefatura` a una clave aleatoria y exige cambiarla. |
| `npm run prisma:vincular-jefatura` | Deja a Jefatura a cargo de todos los laboratorios sin recargar el Excel. |
| `npm run prisma:backfill-software` | Migra el software escrito como texto libre al catálogo (uso único, Issue 4.27). |

---

## 7. API

- Todas las rutas cuelgan de `/api`. Salud: `GET /api/health` (incluye el estado de la base).
- Áreas: `/api/v1/auth`, `/consulta` (pública), `/estudiante`, `/docente`, `/admin`, `/asignaciones`, `/import` y `/telegram`. Hay unas 80 rutas.
- Los contratos de cada ruta (entrada, respuesta y códigos de error) están en las especificaciones de `docs/specs/`, por épica.
- Las respuestas siguen la forma `{ success, data }` o, si hay error, `{ success: false, message }`. Cada petición lleva un `X-Request-Id` que aparece en el registro y en la respuesta.

---

## 8. Integración y despliegue continuos

| Workflow | Cuándo | Qué hace |
|---|---|---|
| `ci.yml` | Cada PR y push | `tsc`, ESLint, Prettier, pruebas de backend y frontend con cobertura, E2E con Playwright, `npm audit` y SonarCloud (cobertura del código nuevo ≥ 80 %). |
| `cd.yml` | Merge a `develop` | Reutiliza el CI; si pasa, aplica migraciones en Supabase, despliega Render y Vercel y verifica la salud de ambos. |
| `asignacion-programada.yml` | 07:00 UTC (02:00 Lima), diario | Corre la asignación del periodo vigente y falla si el verificador encuentra violaciones. |
| `resumen-diario.yml` | 12:30 UTC, lunes a sábado | Envía por Telegram el resumen de clases del día. |

Los secretos de GitHub Actions están listados en el [README §9.4](../README.md#94-secretos-del-repositorio-github-actions). Ante un despliegue fallido, siga el [Runbook de Rollback](runbook_rollback.md).

Dependabot (`.github/dependabot.yml`) abre PRs semanales de dependencias; los cambios de versión mayor (por ejemplo Prisma 7 o TypeScript 7) requieren un issue propio antes de fusionarse.

---

## 9. Pruebas

| Suite | Comando | Estado al 25/11/2026 |
|---|---|---|
| Backend (unitarias e integración) | `npm run test:backend` | 112 suites, 1391 pruebas; cobertura 90,3 % de sentencias |
| Frontend | `npm run test:frontend` | 116 archivos, 931 pruebas |
| E2E | `npx playwright install --with-deps` y `npm run test:e2e` | 7 suites (consulta, espacios, tablero, accesibilidad, responsive…) |
| Carga | `npm run test:load` (requiere k6) | Pico del primer día de clases; ver `tests/load/README.md` |

Las pruebas de backend que tocan la base necesitan `DATABASE_URL` y `DIRECT_URL`. La estrategia completa está en el [Plan Maestro de Pruebas](plan_maestro_pruebas.md) y los resultados en el [Informe de Resumen de Pruebas](informe_resumen_pruebas.md).

---

## 10. Operación

| Situación | Qué hacer |
|---|---|
| Primer acceso lento o con tiempo de espera | Render duerme el backend tras 15 min sin tráfico; el primer pedido tarda 45–60 s. Abrir `/api/health` antes de usar el sistema. |
| La base no responde | Supabase pausa el proyecto tras 7 días sin consultas: *Dashboard → Restore project*. |
| `tsc` o las pruebas fallan tras un `pull` | `npx prisma generate` en `backend/`. |
| Coordinación o Jefatura perdió su clave | `npx tsx prisma/restablecer-sistema.ts coordinacion` (o `jefatura`). |
| Se necesita un respaldo de los datos | `npm run prisma:export`. |
| Corridas simultáneas | El candado de corrida usa un *advisory lock* de PostgreSQL, válido aun con varias instancias del backend. |
| Despliegue roto | [Runbook de Rollback](runbook_rollback.md). |

---

## 11. Cómo extender el sistema

1. Lea la especificación de la épica en `docs/specs/` y respete sus contratos (Spec-Driven Development, ver `AGENTS.md`).
2. Cree una rama desde `develop` (`feature/<issue>-<descripcion>`, `fix/…`, `docs/…`).
3. Si cambia el esquema: edite `schema.prisma`, cree la migración y regenere el cliente.
4. Añada pruebas: la cobertura del código nuevo debe superar el 80 % en SonarCloud.
5. Verifique localmente `npx tsc --noEmit`, `npm run lint`, `npm run format:check` y `npm run test`.
6. Abra el PR con la plantilla (`Closes #N`). El CHANGELOG lo actualiza el Maintainer al cierre de cada sprint.
