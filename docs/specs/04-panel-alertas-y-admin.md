# Spec 04: Panel de Alertas y Administración

> **Épica:** `epic:panel-alertas`  
> **Issues Cubiertos:** #4.1 — #4.26  
> **Roles:** BI, FE, QA  
> **Documentos de Referencia:** [`docs/modelo-datos.md`](../modelo-datos.md), [`docs/arquitectura.md`](../arquitectura.md)

---

## 1. Visión General del Módulo

El **Panel de Alertas y Administración** es la consola de gestión para Coordinación Académica y Jefatura de Laboratorios. Sus funciones centrales son:
1. **Monitorear Alertas Automáticas:** Detección automática de conflictos de software o capacidad reducida en asignaciones vigentes tras la falla de PCs o cambios de software.
2. **Mapa de Ocupación Interactivo (2D/3D):** Visualización del estado del edificio por piso.
3. **Gestión de Espacios y Secciones Escaladas:** Alta/edición de espacios con campos acotados por rol y revisión manual de asignaciones no concluidas.
4. **Seguridad y Control de Acceso:** Autenticación JWT, control de roles (`COORDINACION_ACADEMICA`, `JEFATURA_LABORATORIO`) y cambio/restablecimiento de clave.

---

## 2. Endpoints HTTP y Lógica de Negocio

Todas las rutas de `/api/v1/admin/*` exigen JWT válido de `COORDINACION_ACADEMICA` o `JEFATURA_LABORATORIOS` (Issue 4.8); sin token 401 y con otro rol 403. Las respuestas siguen la forma `{ success: true, data }` y los errores `{ success: false, message, errors? }`. Jefatura solo opera sobre los espacios que tiene en `EspacioResponsable`.

### 2.1 Alertas por Software y Capacidad (#4.1, #4.2, #4.3, #4.4, #4.5, #4.6, #4.7, #4.10)
* `POST /api/v1/admin/laboratorios/:id/software`
  * Jefatura registra cambio de software instalado en laboratorio.
  * Dispara `evaluarIncompatibilidadSoftware(laboratorioId)` $\rightarrow$ Genera registros en `Alerta` (tipo `SOFTWARE`) para asignaciones afectadas.
* `POST /api/v1/admin/laboratorios/:id/pcs-malogradas`
  * Jefatura registra cambio de PCs malogradas.
  * Recalcula $CapacidadReal$ $\rightarrow$ Dispara `evaluarCapacidadInsuficiente(laboratorioId)` $\rightarrow$ Genera `Alerta` (tipo `CAPACIDAD`).
* `GET /api/v1/admin/alertas[?tipo=SOFTWARE|CAPACIDAD&espacioId=...]` (Issue 4.6)
  * Lista las alertas **activas** (`PENDIENTE`), de la más reciente a la más antigua. Jefatura solo ve las de sus laboratorios.
  * Cada alerta: `{ id, tipo, estado, motivo, fechaDeteccion, espacio: { id, identificador, pabellon, piso }, asignacionesAfectadas: [{ asignacionId, codigoCurso, nombreCurso, codigoSeccion }] }`.
* `PATCH /api/v1/admin/alertas/:id/resolver` (Issue 4.7)
  * Marca la alerta como `RESUELTA` y deja un `RegistroAuditoria` de tipo `ALERTA`. 404 si no existe, 403 si Jefatura no es responsable del espacio, 409 si ya estaba resuelta.
* Al crearse una alerta nueva se emite `alerta.creada` ([Spec 02](02-motor-asignacion.md) §2.4).

### 2.2 Mapa Visual de Ocupación por Piso (2D & 3D) (#4.11, #4.12, #4.13, #4.14, #4.15, #4.23, #4.24)
* **Servicio `obtenerOcupacionPorPiso`** (Issue 4.11, `backend/src/services/ocupacion.service.ts`): para cada espacio del pabellón y piso en una franja, devuelve el estado:
  * `ALERTA_ACTIVA`: tiene una alerta `PENDIENTE` (prevalece sobre las demás).
  * `OCUPADO`: hay una asignación `VIGENTE` cuyo horario solapa con la franja.
  * `DISPONIBLE`: ninguna de las anteriores.
  * Solo las asignaciones `VIGENTE` reservan espacio. Sin franja se usa el momento actual en hora de Lima.
* `GET /api/v1/admin/mapa-ocupacion?pabellon=A&piso=1[&dia=LUNES&horaInicio=08:00&horaFin=10:00]` (Issue 4.12)
  * `pabellon` y `piso` obligatorios; la franja son los tres campos juntos o ninguno (400 en otro caso).
  * Respuesta: `{ pabellon, piso, franja, espacios: [{ id, identificador, tipo, aforoNominal, capacidadReal, estado, asignacion: { asignacionId, codigoCurso, nombreCurso, codigoSeccion, docenteNombre, alumnosMatriculados, horaInicio, horaFin } | null, alertas: [{ id, tipo, motivo }] }], resumen: { disponibles, ocupados, conAlerta } }`. El "aforo actual" es el número de alumnos matriculados en la sección.
* **Mapa 2D (React + SVG):** Renderiza el plano del piso coloreando los espacios dinámicamente.
* **Mapa 3D (Issue 4.23, three.js):** Maqueta extruida navegable a partir de los mismos planos SVG; detalle del componente en [Spec 07](07-ui-ux-y-activos.md) §2.4. La conexión con los datos reales, el detalle y la accesibilidad por teclado son del Issue 4.24.

### 2.3 Gestión de Espacios y Secciones Escaladas (#4.15, #4.16, #4.17, #4.18, #4.20, #4.21, #4.22, #4.25, #4.26)
* **Espacios deshabilitados:** `Espacio.habilitado` (por defecto `true`). Un espacio con `habilitado = false` está fuera de servicio: el motor no lo asigna (queda fuera del grafo de contigüidad y de la consulta de disponibilidad), el explorador del docente y la vista del alumno no lo muestran, y el mapa del panel lo marca como `DESHABILITADO` (con `resumen.deshabilitados`). Solo Coordinación lo cambia, con `habilitado` en `POST` y `PATCH /api/v1/admin/espacios`. Las asignaciones vigentes de un espacio que se deshabilita después no se reubican automáticamente. `Espacio.descripcionUso` (texto opcional, máx. 120) es un rótulo visual (ej. "Sala de investigación") que el mapa muestra aunque el espacio esté deshabilitado; `PATCH` con `null` lo borra. **Aforo:** `aforoNominal` puede omitirse o ser `0` ("sin definir") solo si el espacio está deshabilitado; habilitar un espacio con aforo 0 responde 422.
* `GET /api/v1/admin/secciones-escaladas[?periodo=2026-1]` (Issue 4.22)
  * Lista las secciones cuya asignación más reciente quedó `ESCALADA` y requieren revisión manual, las más antiguas primero. Por defecto el periodo vigente.
  * Cada elemento: `{ asignacionId, fechaEscalamiento, motivoEscalamiento, seccion: { id, codigoCurso, nombreCurso, codigoSeccion, periodo, docenteNombre, tipoEspacioRequerido, softwareRequerido: [{ id, nombre, version, comparacionVersion }], alumnosMatriculados, horarios } }`. Una sección reasignada deja de aparecer.
* **Gestión de espacios con campos acotados por rol (Issue 4.15):**
  * `GET /api/v1/admin/espacios[?tipo=&pabellon=&piso=]` y `GET /api/v1/admin/espacios/:id`: cada espacio con sus `contiguos` y `camposEditables` según el rol y el tipo (el formulario decide qué mostrar). Jefatura solo ve sus laboratorios. En las respuestas, `softwareInstalado` es `[{ id, nombre, version }]` del catálogo (`null` en aulas teóricas) y `camposEditables` usa `softwareIds` como nombre del campo editable.
  * `POST /api/v1/admin/espacios` (solo Coordinación): `{ identificador, tipo, pabellon, piso, aforoNominal, softwareIds?, pcsMalogradas?, contiguos? }`. `softwareIds` son ids del catálogo (`GET /api/v1/admin/software`): un id inexistente responde 404 y uno dado de baja, 422 (Issue 4.28). Un aula teórica no admite software ni PCs; 409 si ya existe el `identificador` en el pabellón.
  * `PATCH /api/v1/admin/espacios/:id`: Coordinación edita `identificador`, `pabellon`, `piso`, `aforoNominal`, `contiguos` y, en laboratorios, `softwareIds` y `pcsMalogradas`; **Jefatura solo `softwareIds` y `pcsMalogradas` de sus laboratorios**. Un campo fuera de lo permitido responde 403 antes de tocar la base; los campos de laboratorio sobre un aula, 400.
  * `contiguos` reemplaza el conjunto de vecinos (se guarda en ambos sentidos) y exige espacios existentes, distintos del propio y **del mismo tipo** (422 si no).
  * Editar el `aforoNominal` evalúa `evaluarCapacidadInsuficiente` y persiste la alerta `CAPACIDAD`. Los cambios de PCs y software **no se escriben directo**: pasan por los servicios de los Issues 4.2 y 4.1 (historial y alertas) y por eso se aplican en transacciones separadas de los campos propios del espacio.
  * Respuesta del `PATCH`: `{ espacio, alertas }`.
* `POST /api/v1/admin/alumnos` y `POST /api/v1/admin/docentes` (solo Coordinación; Issues 4.17 y 4.18)
  * Alta individual con su cuenta de acceso: usuario y clave inicial = el código, `debe_cambiar_clave = true` (igual que la carga masiva de los Issues 1.7 y 1.8). 201 con `{ id, codigo, nombre, rol, debeCambiarClave }`; 409 si el código ya existe.
  * Alumno: `{ codigo, nombre, correo, dni?, telefono?, direccion?, fechaNacimiento? }`. Docente: `{ codigoDocente, nombre, correoInstitucional, departamento }`.
* `POST /api/v1/auth/cambiar-clave` (Issue 4.21, los 4 roles, JWT)
  * `{ claveActual, claveNueva }` con la nueva de 8 a 72 caracteres, distinta de la actual y del código de acceso. La cuenta sale del token. Baja la marca `debe_cambiar_clave`. 400 si la clave actual es incorrecta.
* `POST /api/v1/admin/usuarios/restablecer-clave` (Issue 4.26, solo Coordinación Académica)
  * Cuerpo: `{ usuario }`, el **código** del alumno o docente o su **correo**. El código se busca primero; si no coincide y parece un correo, se busca por correo sin distinguir mayúsculas.
  * Genera una clave inicial **aleatoria** (10 caracteres sin ambiguos como 0/O o 1/l, con generador criptográfico), guarda solo su hash bcrypt y pone `debe_cambiar_clave = true`. Respuesta: `{ codigo, nombre, rol, claveInicial, debeCambiarClave }`. La clave inicial se muestra **una sola vez** (la respuesta lleva `Cache-Control: no-store`) y Coordinación se la entrega al usuario, que debe cambiarla en su próximo ingreso con `POST /auth/cambiar-clave` (Issue 4.21).
  * Errores: 404 si no existe; 409 si el correo corresponde a más de una persona (debe usarse el código); 403 si es una cuenta de Coordinación o Jefatura (cuentas de sistema); 422 si el alumno o docente no tiene cuenta de acceso; 400 si falta `usuario` o se envían campos desconocidos. Jefatura, alumno y docente reciben 403 y sin token 401.
  * Limitaciones: no queda registro en `RegistroAuditoria` (no tiene referencia a cuentas) y los JWT ya emitidos siguen siendo válidos hasta que expiren.

---

## 3. Seguridad y Control por Rol (#4.8, #4.21, #4.25)
* Middleware `authGuard`: Verifica el JWT bearer token.
* Middleware `roleGuard`:
  * `COORDINACION_ACADEMICA`: Acceso total.
  * `JEFATURA_LABORATORIOS`: Edición limitada a los laboratorios asignados en `EspacioResponsable` (`verificarAccesoEspacio`).

---

## 4. Definition of Done (DoD)
- [ ] Alertas automáticas persistidas transaccionalmente tras actualizar PCs o software.
- [ ] Rendimiento del mapa visual $< 100\text{ ms}$ en cambio de piso.
- [ ] Cobertura de tests unitarios/integración de controladores $\ge 85\%$.
