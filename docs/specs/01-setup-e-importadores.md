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
  export async function importarCursosYSecciones(datos: unknown[], prisma: PrismaClient): Promise<{ cursosProcesados: number; seccionesProcesadas: number; errores: string[] }>;
  ```

### 2.4 Issue 1.4 — Importar Horarios
* **Ubicación:** `backend/src/importers/horarios.importer.ts`
* **Entrada:** Archivos CSV/JSON validados por `HorarioSchema`.
* **Firma:**
  ```typescript
  export async function importarHorarios(datos: unknown[], prisma: PrismaClient): Promise<{ horariosProcesados: number; errores: string[] }>;
  ```

### 2.5 Issue 1.5 — Importar Matrículas (con Flag de Movilidad Reducida)
* **Ubicación:** `backend/src/importers/matriculas.importer.ts`
* **Entrada:** CSV/JSON con `codigoAlumno`, `nombres`, `apellidos`, `movilidadReducida` (boolean), `codigoSeccion`.
* **Firma:**
  ```typescript
  export async function importarMatriculas(datos: unknown[], prisma: PrismaClient): Promise<{ alumnosProcesados: number; cuentasCreadas: number; matriculasProcesadas: number; errores: string[] }>;
  ```

### 2.6 Issue 1.6 — Endpoint HTTP de Importación y Asignación Encadenada
* **Ubicación:** `backend/src/routes/import.routes.ts`, `backend/src/controllers/import.controller.ts`, `backend/src/services/importacion.service.ts` y `backend/src/lib/archivoImportacion.ts`.
* **Ruta:** `POST /api/v1/import/:tipo`, con `:tipo` ∈ `cursos-secciones` | `horarios` | `matriculas` | `docentes`. Cada tipo es un flujo independiente (Issue 1.9): no se asume que los archivos se suben juntos. Un tipo desconocido responde 404.
* **Acceso:** solo `COORDINACION_ACADEMICA` (JWT). La autenticación se evalúa antes de leer el cuerpo.
* **Cuerpo** (hasta 10 mb y 20 000 filas por envío):
  * `Content-Type: text/csv`: CSV con encabezado. Las columnas se llaman como los campos del esquema Zod del importador (camelCase). Separador `,` o `;`, con BOM opcional. Las listas (`stackSoftwareRequerido`) se separan con `|`, `;` o `,` entre comillas; los booleanos aceptan `true/false`, `1/0`, `si/no`; el día acepta mayúsculas, minúsculas y tilde (`Miércoles`).
  * `Content-Type: application/json`: arreglo de filas o `{ "datos": [...] }`.
* **Respuesta 200:**
  ```typescript
  { success: true, data: {
      tipo: TipoImportacion; filasRecibidas: number;
      procesados: Record<string, number>;   // contadores del importador
      errores: string[];                    // una entrada por fila rechazada, con su número de fila
      exitosa: boolean;                     // errores.length === 0
      asignacion: { disparada: boolean; motivo: string | null; resumen: ResumenAsignacionDTO | null } | null;
  } }
  ```
* **Errores:** 400 (cuerpo vacío, CSV o JSON mal formado, sin filas), 401, 403, 404 (tipo desconocido), 413 (más de 20 000 filas o cuerpo mayor a 10 mb).
* **Asignación encadenada (Issue 1.6):** si la importación de `cursos-secciones`, `horarios` o `matriculas` termina **sin filas rechazadas** y el periodo vigente ya tiene secciones, horarios y matrículas cargados, se dispara la corrida batch (`ejecutarAsignacionADemanda`, Issue 2.15) y su resumen se devuelve en `asignacion`. Si faltan datos, `asignacion.disparada` es `false` y `motivo` indica qué falta. Si hay una corrida en curso, `motivo` lo informa (la importación ya quedó guardada). `docentes` no encadena la asignación. La corrida es idempotente (Issue 2.11).
* **Nota de diseño:** las filas válidas se guardan aunque otras sean rechazadas (los importadores reportan por fila, RF-01); por eso el endpoint no encadena la asignación cuando hay filas rechazadas.

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
- `tests/unit/services/importacion.test.ts` y `tests/integration/importacion.test.ts`: lectura de CSV/JSON, encadenado de la asignación y endpoint `POST /api/v1/import/:tipo` (Issue 1.6).

---

## 4. Definition of Done (DoD)
- [ ] Módulos importadores implementados en TypeScript y validados con Zod.
- [ ] Endpoints HTTP funcionales con autenticación admin.
- [ ] Cobertura de pruebas unitarias $\ge 85\%$.
