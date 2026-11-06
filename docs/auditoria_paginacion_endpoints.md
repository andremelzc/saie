# Auditoría de Paginación Acotada en Endpoints Backend (Issue #369)

> **Módulo:** `backend` / Calidad & Seguridad  
> **Issue Asociado:** [#369 — 5.25 Revisar que los listados del backend tengan paginación acotada](https://github.com/andremelzc/saie/issues/369)  
> **Criterio de Aceptación:** Tabla endpoint → tope documentada, corrección de endpoints vulnerables a respuestas masivas sin tope, y prueba parametrizada preventiva.

---

## 1. Contexto y Objetivos

En revisiones iniciales del Sprint 4 se verificó que los endpoints de `secciones`, `historial` y `auditoria` contaban con esquemas de paginación que imponían un tope máximo de registros (`limite` entre 1 y 200). Sin embargo, existía el riesgo de denegación de servicio (DoS por consumo de memoria / respuestas HTTP desmedidas) si otros endpoints de consulta masiva (`alertas`, `incidencias`, `espacios`, `docentes`, `solicitudes-software`, etc.) no contaban con un tope explícito en la consulta a la base de datos o en la validación Zod de entrada.

Esta auditoría revisó exhaustivamente todas las rutas `GET` en:
- `backend/src/routes/admin.routes.ts`
- `backend/src/routes/docente.routes.ts`
- `backend/src/routes/estudiante.routes.ts`

---

## 2. Matriz de Endpoints y Topes Acotados

| Método | Endpoint | Parámetro | Default | Tope Máximo | Estado / Resolución |
|---|---|---|---|---|---|
| `GET` | `/api/v1/admin/alertas` | `limite` | 50 | 200 | **Corregido:** Añadido `AlertasQuerySchema` con `pagina`/`limite` y `take`/`skip` en `alerta.service.ts`. |
| `GET` | `/api/v1/admin/secciones-escaladas` | `limite` | 50 | 200 | **Corregido:** Añadido `EscaladasQuerySchema` con `pagina`/`limite` y `take`/`skip` en `revision.service.ts`. |
| `GET` | `/api/v1/admin/incidencias` | `limite` | 50 | 200 | **Corregido:** Añadido `IncidenciasQuerySchema` con `pagina`/`limite` y `take`/`skip` en `incidenciaAdmin.service.ts`. |
| `GET` | `/api/v1/admin/software` | `limit` | 50 | 100 | **Verificado:** Ya contaba con `SoftwareListadoQuerySchema` (`limit` max 100). |
| `GET` | `/api/v1/admin/solicitudes-software` | `limit` | 50 | 100 | **Verificado:** Ya contaba con `SolicitudListadoQuerySchema` (`limit` max 100). |
| `GET` | `/api/v1/admin/espacios` | `limite` | 50 | 200 | **Corregido:** Añadido `limite` y `pagina` a `EspaciosQuerySchema` y `take`/`skip` en `espacioAdmin.service.ts`. |
| `GET` | `/api/v1/admin/secciones` | `limite` | 50 | 200 | **Verificado:** Ya contaba con `FiltrosSeccionesSchema` (`limite` max 200). |
| `GET` | `/api/v1/admin/docentes` | `limite` | 50 | 200 | **Corregido:** Añadido `DocentesQuerySchema` y `take` acotado en `listarDocentesParaAsignar`. |
| `GET` | `/api/v1/admin/auditoria` | `limite` | 50 | 200 | **Verificado:** Ya contaba con `AuditoriaQuerySchema` (`limite` max 200). |
| `GET` | `/api/v1/admin/asignaciones/historial` | `limite` | 50 | 200 | **Verificado:** Ya contaba con `HistorialQuerySchema` (`limite` max 200). |
| `GET` | `/api/v1/docente/solicitudes-software` | — | 100 | 100 | **Corregido:** Acotado preventivamente a las solicitudes propias del docente con `take: 100`. |
| `GET` | `/api/v1/docente/espacios/explorador` | — | 200 | 200 | **Corregido:** Acotado preventivamente con `take: 200` en la consulta a espacios. |

---

## 3. Endpoints Exentos de Paginación (Por Naturaleza de Dominio)

Los siguientes endpoints devuelven recursos puntuales o datos acotados intrínsecamente por la sesión del usuario autenticado:

1. **Consultas de detalle por ID único:**
   - `GET /api/v1/admin/software/:id`
   - `GET /api/v1/admin/espacios/:id`
   - `GET /api/v1/admin/secciones/:id`
   - `GET /api/v1/docente/laboratorio-estado/:espacioId`
   - `GET /api/v1/estudiante/ruta/:asignacionId`
2. **Consultas de contexto individual acotado:**
   - `GET /api/v1/docente/horario`: Horario propio del docente para la semana o un día (finito, 1–10 bloques).
   - `GET /api/v1/estudiante/horario`: Horario del alumno para su matrícula activa (finito).
   - `GET /api/v1/estudiante/cursos`: Asignaturas matriculadas del alumno en el periodo lectivo (usualmente 4–8 cursos).
   - `GET /api/v1/estudiante/perfil`: Datos del alumno autenticado.
   - `GET /api/v1/estudiante/telegram`: Estado de vinculación con el bot de Telegram.
3. **Planos y ocupación geográfica:**
   - `GET /api/v1/admin/mapa-ocupacion` y `GET /api/v1/estudiante/mapa-ocupacion`: Acotado a un único `pabellon` y `piso` por requerimiento de renderizado SVG.
4. **Reporte consolidado:**
   - `GET /api/v1/admin/reporte/asignaciones`: Generación del reporte de secciones por periodo lectivo (diseñado para impresión / PDF del cuadro general).

---

## 4. Salvaguarda Automatizada y Suite de Pruebas

Para garantizar que ningún listado nuevo o existente carezca de tope máximo, se implementó la suite parametrizada en:
[`backend/tests/unit/controllers/paginacionListados.test.ts`](../backend/tests/unit/controllers/paginacionListados.test.ts)

### Casos de prueba evaluados por cada endpoint:
1. **Rechazo de exceso:** Envío de `limite > topeMaximo` (o `limit > topeMaximo`) $\rightarrow$ Retorna código `400` sin invocar al servicio de base de datos.
2. **Rechazo de límites inválidos:** Envío de valores negativos, cero (`0`) o no numéricos (`"abc"`) $\rightarrow$ Retorna `400`.
3. **Aceptación de límite válido:** Envío de valores dentro del rango permitido (ej. `25`) $\rightarrow$ Retorna `200` y procesa la consulta.
4. **Valor por defecto seguro:** Si la petición no especifica parámetro de límite, aplica el tope por defecto (ej. `50`) $\rightarrow$ Retorna `200`.
5. **Auditoría de integridad global:** Verifica que todos los listados registrados impongan un tope máximo $\le 200$.
