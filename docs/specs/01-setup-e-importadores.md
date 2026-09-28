# Spec 01: Setup del Proyecto e Importadores de Datos

> **Épica:** `epic:setup`  
> **Issues Cubiertos:** #1.1, #1.2, #1.3, #1.4, #1.5, #1.6, #1.7, #1.8, #1.9, #1.10  
> **Roles:** BM, BI, QA, FE, LP  
> **Documentos de Referencia:** [`docs/modelo-datos.md`](../modelo-datos.md), [`docs/arquitectura.md`](../arquitectura.md), [`backend/prisma/schema.prisma`](../../backend/prisma/schema.prisma)

---

## 1. Visión General del Módulo

Este módulo cubre la configuración base de la infraestructura del monorepo (backend Node.js/Express, frontend React/Vite, PostgreSQL/Prisma) y los mecanismos de carga masiva de datos maestros (cursos, secciones, horarios, matrículas con movilidad reducida y credenciales de docentes/alumnos).

---

## 2. Detalle por Issue

### 2.1 Issue 1.1 — Configurar Estructura Base del Repositorio y Stack
* **Objetivo:** Definir monorepo con `/backend`, `/frontend`, `/tests`, `/docs`, TypeScript, ESLint, Prettier, `.nvmrc` y scripts `dev`, `test`, `build`.
* **Entregables:** Repositorio limpio con dependencias instaladas y `.gitignore` configurado.

### 2.2 Issue 1.2 — Diseñar el Modelo de Datos Base y Documentarlo
* **Objetivo:** Esquema relacional central en Prisma ORM (`backend/prisma/schema.prisma`) soportando entidades `Espacio`, `Curso`, `Seccion`, `Horario`, `Matricula`, `Cuenta`, `Asignacion`, `Alerta` e `Incidencia`.
* **Regla Clave:** Entidad única `Espacio` con discriminador `tipo` (`AULA_TEORICA` | `LABORATORIO`).

### 2.3 Issue 1.3 — Importar Cursos y Secciones
* **Ubicación:** `backend/src/importers/cursosSecciones.importer.ts`
* **Entrada:** Archivos CSV/JSON con esquema validado por Zod (`CursoSeccionSchema`).
* **Firma:**
  ```typescript
  export async function importarCursosYSecciones(filePath: string): Promise<{ insertados: number; actualizados: number }>;
  ```

### 2.4 Issue 1.4 — Importar Horarios
* **Ubicación:** `backend/src/importers/horarios.importer.ts`
* **Entrada:** Archivos CSV/JSON validados por `HorarioSchema`.
* **Firma:**
  ```typescript
  export async function importarHorarios(filePath: string): Promise<{ insertados: number }>;
  ```

### 2.5 Issue 1.5 — Importar Matrículas (con Flag de Movilidad Reducida)
* **Ubicación:** `backend/src/importers/matriculas.importer.ts`
* **Entrada:** CSV/JSON con `codigoAlumno`, `nombres`, `apellidos`, `movilidadReducida` (boolean), `codigoSeccion`.
* **Firma:**
  ```typescript
  export async function importarMatriculas(filePath: string): Promise<{ alumnosProcesados: number; matriculasCreadas: number }>;
  ```

### 2.6 Issue 1.6 & 1.7 — Endpoints HTTP de Importación y Disparo de Asignación
* **Ubicación:** `backend/src/controllers/import.controller.ts` & `backend/src/routes/import.routes.ts`
* **Rutas:**
  * `POST /api/v1/import/master` — Sube y procesa los archivos CSV/JSON en lote.
  * `POST /api/v1/import/encadenar-asignacion` — Ejecuta la importación y al finalizar dispara automáticamente la corrida batch del motor (Issue 2.11).

### 2.7 Issue 1.8 — Registro Masivo de Docentes con Credenciales de Acceso
* **Ubicación:** `backend/src/importers/docentes.importer.ts`
* **Lógica:** Genera cuenta con rol `DOCENTE`, hash `bcrypt` (10 rounds) de la clave inicial y `debe_cambiar_clave = true`.

### 2.8 Issue 1.9 — Registro Masivo e Individual de Alumnos
* **Ubicación:** `backend/src/services/alumnosAcceso.service.ts`
* **Lógica:** Genera cuentas de rol `ALUMNO` con credenciales de ingreso iniciales.

### 2.9 Issue 1.10 — Configurar Despliegue (Vercel, Render y Supabase)
* **Objetivo:** Scripts de construcción y variables de entorno para Vercel (frontend), Render (backend Express) y Supabase (PostgreSQL managed).

---

## 3. Matriz de Pruebas Unitarias & Integración
- `tests/unit/importers/cursos.test.ts`: Parsing Zod, manejo de archivos corruptos.
- `tests/unit/importers/horarios.test.ts`: Validación de formato de hora `HH:mm` y días 1 a 7.
- `tests/unit/importers/matriculas.test.ts`: Preservación de flag `movilidadReducida`.
- `tests/integration/importPipeline.test.ts`: Flujo completo de carga transaccional.

---

## 4. Definition of Done (DoD)
- [ ] Módulos importadores implementados en TypeScript y validados con Zod.
- [ ] Endpoints HTTP funcionales con autenticación admin.
- [ ] Cobertura de pruebas unitarias $\ge 85\%$.
