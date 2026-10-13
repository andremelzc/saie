# Spec 08: Catálogo de Software

> **Épica:** `epic:panel-alertas` (transversal: motor, admin, importadores, seed)  
> **Issues Cubiertos:** _por asignar_ (Estado: **BORRADOR — pendiente de aprobación del Maintainer**)  
> **Roles:** BI, BM, FE, QA  
> **Documentos de Referencia:** [`docs/modelo-datos.md`](../modelo-datos.md), [`02-motor-asignacion.md`](./02-motor-asignacion.md), [`04-panel-alertas-y-admin.md`](./04-panel-alertas-y-admin.md)

---

## 1. Motivación

Hoy el software se guarda como texto libre en dos columnas `text[]`:

* `Espacio.softwareInstalado` (solo `LABORATORIO`).
* `Seccion.stackSoftwareRequerido`.

El motor (`rules/validarSoftware.ts`) compara nombres normalizados (`trim`, minúsculas, espacios colapsados). Esto deja sin resolver:

1. **Nada garantiza que un nombre exista.** Un error de tipeo en un curso (`"Node"` vs `"Node.js"`) provoca un escalamiento falso sin aviso.
2. **Las versiones son parte del nombre.** `"Python 3.12"` no cubre `"Python 3.11"` ni `"Python"`.
3. **Sin metadatos ni trazabilidad:** no hay descripción, categoría, ni quién registró cada software.
4. **Mantenimiento disperso:** cada laboratorio y cada curso repite el texto; renombrar o deprecar un software exige tocar todos.

**Objetivo:** una entidad `Software` como catálogo único, y relaciones explícitas con espacios (instalado) y secciones (requerido).

---

## 2. Modelo de Datos

### 2.1 Entidad `Software`

| Campo | Tipo | Obligatorio | Descripción |
|---|---|---|---|
| `id` | `String` (uuid) | Sí | Identificador. |
| `nombre` | `String` | Sí | Nombre visible canónico (ej. `"Visual Studio Code"`). |
| `nombreNormalizado` | `String` | Sí (derivado) | Resultado de `normalizarNombreSoftware(nombre)`. Se usa para búsquedas y unicidad; no lo envía el cliente. |
| `version` | `String` | Sí (`""` si no aplica) | Versión tal como se muestra (`"3.12"`, `"21"`, `"2024.1"`). Cadena vacía = software sin versión. |
| `categoria` | `CategoriaSoftware` | Sí | `SISTEMA_OPERATIVO`, `IDE`, `LENGUAJE`, `BASE_DATOS`, `REDES`, `SIMULACION`, `OFIMATICA`, `OTRO`. |
| `descripcion` | `String?` | No | Texto libre para el panel de administración. |
| `fabricante` | `String?` | No | Proveedor o desarrollador (ej. `"Microsoft"`, `"Cisco"`). |
| `tipoLicencia` | `TipoLicencia` | Sí | `LIBRE`, `EDUCATIVA`, `COMERCIAL`. Por defecto `LIBRE`. |
| `activo` | `Boolean` | Sí | Baja lógica. `false` = ya no se puede instalar ni requerir en nuevos registros. Por defecto `true`. |
| `fechaCreacion` | `DateTime` | Sí | Fecha de alta (la "fecha de subida"). `@default(now())`. |
| `fechaActualizacion` | `DateTime` | Sí | Última modificación. `@updatedAt`. |
| `creadoPorId` | `String?` | No | `Cuenta` que lo registró (auditoría). Nulo para datos del seed. |

**Restricción única:** `@@unique([nombreNormalizado, version])`.

### 2.2 Relaciones

```prisma
model EspacioSoftware {            // qué está instalado en un laboratorio
  espacioId         String   @map("espacio_id")
  softwareId        String   @map("software_id")
  fechaInstalacion  DateTime @default(now()) @map("fecha_instalacion")
  registradoPorId   String?  @map("registrado_por_id")

  @@id([espacioId, softwareId])
  @@map("espacio_software")
}

model SeccionSoftware {            // qué requiere una sección
  seccionId  String @map("seccion_id")
  softwareId String @map("software_id")
  comparacionVersion ComparacionVersion @default(CUALQUIERA) @map("comparacion_version")

  @@id([seccionId, softwareId])
  @@map("seccion_software")
}
```

Las columnas `softwareInstalado` y `stackSoftwareRequerido` se **deprecan** y se eliminan en una segunda migración, una vez migrados los datos y actualizado el código (ver §6).

**Enums nuevos:** `CategoriaSoftware`, `TipoLicencia` y `ComparacionVersion` (`CUALQUIERA`, `EXACTA`, `MINIMA`).

### 2.3 Entidad `SolicitudSoftware`

Un docente que necesita un software que no está en el catálogo lo propone; Coordinación lo aprueba o rechaza.

| Campo | Tipo | Descripción |
|---|---|---|
| `id` | `String` (uuid) | Identificador. |
| `docenteId` | `String` | Docente que propone. |
| `seccionId` | `String?` | Sección para la que se necesita (opcional). |
| `nombre` | `String` | Nombre propuesto. |
| `version` | `String` | Versión propuesta (`""` si no aplica). |
| `categoria` | `CategoriaSoftware?` | Sugerida por el docente. |
| `justificacion` | `String` | Para qué se necesita. |
| `estado` | `EstadoSolicitud` | `PENDIENTE`, `APROBADA`, `RECHAZADA`. |
| `fechaSolicitud` | `DateTime` | `@default(now())`. |
| `resueltaPorId` | `String?` | `Cuenta` de Coordinación que resolvió. |
| `fechaResolucion` | `DateTime?` | Cuándo se resolvió. |
| `motivoRechazo` | `String?` | Obligatorio si `estado = RECHAZADA`. |
| `softwareId` | `String?` | Software creado o vinculado al aprobar. |

**Flujo:**
1. El docente crea la solicitud. Si el software ya existe en el catálogo (mismo `nombreNormalizado` y `version`), la API responde `409` e indica el `id` existente.
2. Coordinación la revisa. Al **aprobar** puede ajustar nombre, categoría y licencia; se crea la fila en `Software` y se guarda su `id` en `softwareId`. Si la solicitud tiene `seccionId`, se ofrece añadirlo a los requerimientos de la sección.
3. Al **rechazar** debe indicar `motivoRechazo`.
4. Instalar el software en un laboratorio sigue siendo un paso aparte de Jefatura (§4). Aprobar una solicitud solo lo da de alta en el catálogo.

### 2.4 Reglas de integridad

* Solo un `Espacio` de tipo `LABORATORIO` puede tener filas en `EspacioSoftware`. Una `Seccion` de tipo `AULA_TEORICA` no tiene filas en `SeccionSoftware` (se conserva el comportamiento actual del importer).
* No se puede dar de baja (`activo = false`) un software sin avisar de cuántos espacios y secciones lo usan (ver §4).
* La baja lógica no borra las relaciones existentes; solo bloquea nuevas.

---

## 3. Regla de Compatibilidad (motor)

`validarSoftwareLaboratorio(softwareInstalado, softwareRequerido)` conserva su contrato de **función pura**; cambia el tipo de entrada de `string[]` a una lista de `{ nombreNormalizado, version }`.

Un requerimiento `R` se **cubre** si el laboratorio tiene un software `I` tal que:

1. `I.nombreNormalizado === R.nombreNormalizado`, y
2. se cumple la `comparacionVersion` que el **requerimiento** declara (`SeccionSoftware.comparacionVersion`):

| Valor | Se cubre si… | Ejemplo (requiere `3.11`) |
|---|---|---|
| `CUALQUIERA` | Hay instalada cualquier versión del software. Es el valor por defecto y el único posible si `R.version === ""`. | Sirve 3.9, 3.11 o 3.12. |
| `EXACTA` | `I.version === R.version`. | Solo 3.11. |
| `MINIMA` | `I.version >= R.version`. | Sirve 3.11 y 3.12; no 3.9. |

La regla vive en el requerimiento, no en el software ni en una política global, porque la misma herramienta puede exigir una versión mínima en un curso y ser indiferente en otro.

**Comparación de versiones.** Se compara por segmentos numéricos separados por `.` (`3.9 < 3.11 < 3.12`, `2024.1 < 2024.2`), nunca como texto. Una versión con segmentos no numéricos (ej. `R2023b`) solo admite `CUALQUIERA` o `EXACTA`; el alta y la edición rechazan `MINIMA` sobre ella.

Un bloque de laboratorios cumple si **todos** sus laboratorios cubren **todos** los requerimientos (sin cambio respecto a `validarSoftwareBloque`).

Al elegir `MINIMA`, la versión instalada puede ser cualquiera de las filas del catálogo del mismo software. Esto funciona con el modelo de una sola entidad (D2), porque `Python 3.11` y `Python 3.12` son filas distintas.

---

## 4. Endpoints HTTP

Prefijo `/api/v1/admin/software`. Roles según `authGuard` + `roleGuard`.

> **Decisión operativa.** En el proceso real, Coordinación Académica entrega los horarios fuera del sistema y una sola persona opera todo en SAIE. Por eso **`COORDINACION_ACADEMICA` actúa como el único rol administrativo** (cuenta `coordinacion`): administra el catálogo, instala software en los laboratorios y resuelve las solicitudes. No se renombra ni se elimina ningún rol en este alcance. Las referencias a Jefatura en esta spec describen el comportamiento del rol existente y no son necesarias para operar; unificar roles queda para un issue aparte.

| Método y ruta | Rol | Descripción |
|---|---|---|
| `GET /` | Coordinación, Jefatura | Lista paginada. Filtros: `q` (nombre), `categoria`, `activo`. |
| `GET /:id` | Coordinación, Jefatura | Detalle, con conteo de laboratorios y secciones que lo usan. |
| `POST /` | Coordinación | Alta. Responde `409` si ya existe `(nombreNormalizado, version)`. |
| `PATCH /:id` | Coordinación | Edita `descripcion`, `categoria`, `fabricante`, `tipoLicencia`, `nombre`. No permite cambiar `version`: se crea otra fila. |
| `PATCH /:id/estado` | Coordinación | Alta/baja lógica (`activo`). |

**Endpoints existentes que cambian:**

* `POST /api/v1/admin/laboratorios/:id/software` pasa de recibir `string[]` a recibir `softwareIds: string[]`. Sigue disparando `evaluarIncompatibilidadSoftware(laboratorioId)` y registrando el cambio en `HistorialEspacio`.
* Alta/edición de espacios (Issue 4.15): `softwareInstalado` se reemplaza por `softwareIds`.
* Importador de cursos y secciones: la columna de software sigue aceptando nombres (y versión opcional), pero se **resuelven contra el catálogo**. Un nombre desconocido produce un error de fila (`SOFTWARE_NO_REGISTRADO`) en vez de guardarse como texto.

**Solicitudes de software** (§2.3):

| Método y ruta | Rol | Descripción |
|---|---|---|
| `POST /api/v1/docente/solicitudes-software` | Docente | Crea una solicitud. |
| `GET /api/v1/docente/solicitudes-software` | Docente | Lista las propias, con estado y motivo de rechazo. |
| `GET /api/v1/admin/solicitudes-software` | Coordinación | Lista, con filtro por `estado`. |
| `PATCH /api/v1/admin/solicitudes-software/:id/aprobar` | Coordinación | Aprueba y crea el `Software`. |
| `PATCH /api/v1/admin/solicitudes-software/:id/rechazar` | Coordinación | Rechaza con `motivoRechazo`. |

**Permisos de Jefatura:** solo selecciona software del catálogo para sus laboratorios (los de `EspacioResponsable`). No crea ni edita el catálogo.

---

## 5. Contratos TypeScript / Zod

```ts
export const SoftwareCrearSchema = z.object({
  nombre: z.string().trim().min(1).max(100),
  version: z.string().trim().max(30).default(''),
  categoria: z.nativeEnum(CategoriaSoftware),
  descripcion: z.string().trim().max(500).optional(),
  fabricante: z.string().trim().max(100).optional(),
  tipoLicencia: z.nativeEnum(TipoLicencia).default('LIBRE'),
});

export const RequerimientoSoftwareSchema = z.object({
  softwareId: z.string().uuid(),
  comparacionVersion: z.nativeEnum(ComparacionVersion).default('CUALQUIERA'),
});

export const CambioSoftwareLaboratorioSchema = z.object({
  softwareIds: z.array(z.string().uuid()).max(100),
});
```

Servicio `software.service.ts`: `crearSoftware`, `editarSoftware`, `cambiarEstadoSoftware`, `resolverSoftwarePorNombre(nombre, version?)` (usado por los importadores), `listarSoftware`.

---

## 6. Migración de Datos

1. **Migración 1 (aditiva):** crear `Software`, `EspacioSoftware`, `SeccionSoftware` y los enums. No se elimina nada.
2. **Script de backfill** (idempotente):
   * Recorrer todos los valores distintos de `softwareInstalado` y `stackSoftwareRequerido`.
   * Separar nombre y versión cuando el texto termina en un patrón de versión (`"JDK 21"` → `JDK` / `21`); si no hay patrón, `version = ""`.
   * Crear las filas de `Software` y las relaciones. Los casos ambiguos se listan en un reporte para revisión manual.
3. **Cambio de código** para leer y escribir las relaciones (motor, servicios, admin, importadores, portal docente, seed).
4. **Migración 2:** eliminar las columnas deprecadas, una vez verificado que no queda código que las use.

`HistorialEspacio` guardaba `valorAnterior`/`valorNuevo` como JSON del arreglo de textos. Los registros previos se conservan tal cual; los nuevos guardan la lista de `nombre + version`.

---

## 7. Impacto en Otros Módulos

| Módulo | Archivo(s) | Cambio |
|---|---|---|
| Motor | `rules/validarSoftware.ts`, `rules/orquestadorAsignacion.ts`, `rules/escalamiento.ts` | Nuevo tipo de entrada y regla de §3. |
| Alertas | `services/deteccionAlertas.service.ts` | Leer software desde la relación. |
| Admin | `services/laboratorio.service.ts`, `services/espacioAdmin.service.ts`, `controllers/admin.controller.ts` | `softwareIds` en vez de texto. |
| Portal | `services/docente.service.ts`, `types/portal.ts` | Exponer `nombre` y `version`; formulario y listado de solicitudes (docente). |
| Importadores | `importers/cursosSecciones.importer.ts`, `lib/archivoImportacion.ts` | Resolver contra el catálogo. |
| Seed | `prisma/seed.ts`, `services/contiguedad.seed.ts` | Sembrar primero el catálogo y luego las relaciones. |
| Frontend | Panel admin | Pantalla de catálogo y selector de software en laboratorios y secciones. |

---

## 8. Decisiones Abiertas

* **D1 — Semántica de versión: resuelta.** La regla la declara cada requerimiento (`CUALQUIERA`, `EXACTA` o `MINIMA`, ver §3). Queda por definir con Coordinación Académica el valor por defecto al registrar un requerimiento con versión: se propone `MINIMA`.
* **D2 — Una o dos entidades: resuelta.** Una sola (`Software` con `version`). Descripción y fabricante se repiten por versión; se acepta a cambio de menos tablas y joins.
* **D3 — Quién propone software nuevo: resuelta.** El docente, mediante `SolicitudSoftware` (§2.3). Coordinación aprueba o rechaza. Queda por confirmar si Jefatura también debe poder proponer.
* **D4 — Sistema operativo: resuelta.** Se modela como un `Software` más, con `categoria = SISTEMA_OPERATIVO` (ej. `Ubuntu 22.04`, `Windows 11`). Un curso que necesita Linux lo declara como requerimiento, y un laboratorio con arranque dual simplemente tiene ambos instalados. No hay campo ni regla nueva: aplica la comparación de §3.
  * **Límite conocido:** la regla de §3 comprueba que cada requerimiento esté instalado, pero no distingue software compatible con un sistema de uno que no lo es (ej. una herramienta que solo corre en Linux). Si se necesita, se añadiría una relación de compatibilidad entre `Software`; queda fuera de este alcance.

---

## 9. Definition of Done (DoD)

- [ ] Migraciones aplicadas y `npx prisma generate` ejecutado.
- [ ] Backfill idempotente con reporte de casos ambiguos.
- [ ] `validarSoftwareLaboratorio` y `validarSoftwareBloque` siguen siendo funciones puras, con la regla de §3.
- [ ] Un nombre de software desconocido nunca se guarda como texto libre.
- [ ] Endpoints de §4 con validación Zod y control por rol.
- [ ] Flujo de solicitudes: un docente propone, Coordinación aprueba o rechaza, y una solicitud duplicada devuelve `409`.
- [ ] Seed y plantilla de demostración actualizados al catálogo.
- [ ] `npx tsc --noEmit` sin errores.
- [ ] Pruebas unitarias, de integración y parametrizadas a cargo de QA en `backend/tests/` (cobertura $\ge 85\%$ en motor y servicios).
