# Guía de pruebas manuales por rol — SAIE

> **Para qué sirve:** recorrer el sistema completo con los cuatro roles, comprobando no solo los casos de éxito sino también los casos en que el sistema **rechaza** una acción o **escala** un problema a otro rol (Coordinación o Jefatura) para que lo resuelva.
>
> **Versión probada:** rama `feat/andre-auditoria` (PR #441), con las correcciones de la auditoría. Si se prueba `develop` antes de fusionar ese PR, varias funciones de esta guía todavía no existen.
>
> **Estado de la base (25/11/2026):** 16 migraciones aplicadas y sin diferencias con `schema.prisma`; periodo `2026-2` registrado como **vigente**; 54 espacios (18 laboratorios, 36 aulas, 5 deshabilitados); 229 secciones; Jefatura a cargo de los 18 laboratorios; 0 programas en el catálogo de software.

---

## 0. Antes de empezar

### 0.1 Cuentas de prueba

| Rol | Usuario | Clave | Observación |
|---|---|---|---|
| Coordinación Académica | `coordinacion` | Ver `CUENTAS_SISTEMA` en `backend/prisma/seed.ts` | — |
| Jefatura de Laboratorios | `jefatura` | Ver `CUENTAS_SISTEMA` en `backend/prisma/seed.ts` | A cargo de los 18 laboratorios |
| Docente | `0A0690` | Su propio código (clave inicial) | Dicta `202SW0805` sección `2-LAB` en 3 laboratorios; debe cambiar la clave al entrar |
| Alumno (primer ingreso) | `23200268` | Su propio código (clave inicial) | Debe cambiar la clave al entrar |
| Alumno (ya activado) | `23200107` | La que se definió al activarla | Si nadie la conoce, Coordinación la restablece (caso C-20) |

> Las cuentas de alumnos y docentes del seed y las creadas desde las pantallas de alta usan su **código** como usuario y como clave inicial. Las creadas por **importación de docentes** reciben una clave inicial generada que se muestra **una sola vez** al terminar la carga.

### 0.2 Archivos de prueba

Los CSV para los casos de carga están en [`demo/pruebas/`](../demo/pruebas/) y se describen en la sección 6. Usan solo **datos de prueba**: los cursos `DEMO002` y `DEMO003`, los alumnos `99999901` a `99999906` y horarios de domingo por la tarde, que no compiten por aulas con clases reales.

> ⚠️ **Nunca subas un CSV de matrículas o de horarios que incluya secciones reales con solo algunas filas.** Desde el issue #429, cargar matrículas **reemplaza todas las matrículas de cada sección incluida en el archivo**, y cargar horarios reemplaza todas sus franjas. Un archivo con un solo alumno de `202SW0104` sección 1 dejaría a esa sección con un solo alumno. Los CSV de `demo/pruebas/` solo tocan secciones de prueba.

### 0.3 Otros puntos a tener en cuenta

- **Después de cada `git pull`** correr `npx prisma generate` en `backend/`; si no, el backend no compila.
- **Límite de intentos de login:** 5 intentos por usuario y 20 por IP cada 10 minutos. Los casos de clave incorrecta consumen intentos: hacerlos al final o con otra cuenta.
- **Software:** el catálogo aprobado (Anexo B) se carga con `npm run prisma:cargar-catalogo-software` en `backend/` (issue #438). Si la base todavía no lo tiene (riesgo #41): el catálogo, el software de los laboratorios y los requisitos de las secciones están vacíos. Para los casos de software (C-11, C-15, C-16 y F-03), Coordinación debe crear primero al menos un programa en `/admin/software`.
- **Servidor dormido** (riesgo #40): si nadie usó el sistema en 15 minutos, el primer acceso puede fallar por tiempo de espera. Reintentar una vez.
- **Periodos en romanos:** desde el issue #427 se aceptan «2026-I» y «2026-II» y se guardan como «2026-1» y «2026-2». Lo que se rechaza es cualquier otro formato y los periodos no registrados (casos CD-20 a CD-22).
- **Activar y cerrar periodos cambia lo que ven todos los usuarios.** Los casos P-05 a P-07 se prueban **solo en una base local o de prueba**, nunca en la base compartida.
- Las acciones que modifican datos (PCs malogradas, software, aforo, solicitudes, incidencias, cargas) **cambian la base real**. Anotar los valores originales para revertirlos al final (sección 8).

### 0.4 Cómo registrar los resultados

Para cada caso anotar: **ID · OK / Falla · evidencia (captura) · observación**. Una falla es cualquier diferencia con la columna «Resultado esperado», incluso si el sistema no se rompe.

---

## 1. Acceso, sesión y claves (todos los roles)

| ID | Caso | Pasos | Resultado esperado |
|---|---|---|---|
| A-01 | Login correcto de cada rol | Entrar por `/login/alumno`, `/login/docente` y `/login/admin` con cada cuenta | Cada rol llega a su portal (`/estudiante`, `/docente`, `/admin`) |
| A-02 | Clave incorrecta | Usuario válido y clave errada | Mensaje de credenciales inválidas, sin revelar si el usuario existe |
| A-03 | Usuario inexistente | Usuario inventado | Mismo mensaje que A-02 |
| A-04 | Login en el portal equivocado | Alumno en `/login/docente`; docente en `/login/admin` | Mismo mensaje de credenciales inválidas que A-02 (no revela que la cuenta existe en otro portal) |
| A-05 | Bloqueo por intentos | 6 intentos fallidos seguidos con el mismo usuario | A partir del 6.º, aviso de demasiados intentos; esperar 10 min para reintentar |
| A-06 | Cambio de clave obligatorio | Entrar con `23200268` o `0A0690` (clave inicial) | Redirige a `/cambiar-clave`; no deja usar el portal hasta cambiarla |
| A-07 | Saltarse el cambio obligatorio | Tras A-06, escribir a mano `/estudiante/horario` o `/docente/horario` | Vuelve a `/cambiar-clave` |
| A-08 | Clave nueva inválida | En `/cambiar-clave`, poner una clave que no cumpla las reglas o que no coincida con la confirmación | Mensaje de validación; la clave no cambia |
| A-09 | Cambio de clave correcto | Completar `/cambiar-clave` bien | Entra al portal; al volver a iniciar sesión ya no pide cambio |
| A-10 | Ruta protegida sin sesión | Cerrar sesión y abrir `/admin/espacios` | Redirige al login correspondiente |
| A-11 | Ruta de otro rol con sesión | Con sesión de alumno, abrir `/admin` o `/docente` | Acceso denegado / redirige; no muestra datos |
| A-12 | Ruta inexistente | Abrir `/no-existe` | Página «no encontrada» |

---

## 2. Alumno

| ID | Caso | Pasos | Resultado esperado |
|---|---|---|---|
| E-01 | Consulta pública por código de alumno | Sin sesión, `/consulta` con `23200107` | Muestra sus cursos y aulas **del periodo vigente** (`2026-2`) |
| E-02 | Consulta pública por código de curso | `/consulta` con `202SW0805` | Muestra secciones y espacios asignados |
| E-03 | Consulta con código inexistente | `/consulta` con `99999999` | Mensaje claro de «no encontrado», sin error técnico |
| E-04 | Consulta con formato inválido | Letras o símbolos raros | Mensaje de validación |
| E-05 | Mi horario | `/estudiante/horario` | Horario semanal con aula de cada clase |
| E-06 | Mapa de ocupación | `/estudiante/mapa` | Plano por piso con sus aulas resaltadas |
| E-07 | Ruta de referencia | Desde una clase, «cómo llegar» (`/estudiante/ruta`) | Muestra ruta; si tiene movilidad reducida, indica ascensor |
| E-08 | Perfil y ficha médica | `/estudiante/perfil`, editar datos permitidos y guardar | Se guarda y se ve al recargar |
| E-09 | Perfil con datos inválidos | DNI de 7 dígitos o con letras; fecha de nacimiento con formato distinto de AAAA-MM-DD | Mensaje de validación; no se guarda |
| E-10 | Declarar movilidad reducida | En la ficha médica del perfil, declarar condición accesible | Se guarda. **No cambia el aula al instante:** Coordinación debe volver a correr la asignación (ver flujo F-05) |
| E-11 | Telegram | `/estudiante/telegram`, vincular y luego desvincular | Muestra estado vinculado / desvinculado |
| E-12 | Alumno sin matrícula | (Si existe una cuenta sin matrículas) entrar | Estado vacío explicativo, no pantalla en blanco |

---

## 3. Docente

Usar `0A0690` (dicta `202SW0805 2-LAB` en los laboratorios 01, 02 y 03 del Nuevo Pabellón).

| ID | Caso | Pasos | Resultado esperado |
|---|---|---|---|
| D-01 | Mi horario | `/docente/horario` | Sus secciones con espacios asignados |
| D-02 | Explorar espacios | `/docente/espacios`, filtrar por tipo/piso | Lista de espacios con capacidad y estado |
| D-03 | Estado de un laboratorio propio | Abrir el Laboratorio 01 desde su asignación | PCs operativas, malogradas y software instalado |
| D-04 | Estado de un laboratorio ajeno | Pedir el estado de un laboratorio donde no tiene clase | Rechazo: «No tienes una asignación vigente en ese laboratorio» |
| D-05 | Reportar incidencia correcta | `/docente/incidencias` → nueva: Laboratorio 01, tipo *Equipo no operativo*, prioridad Alta, descripción de 5+ caracteres | Se crea con un **identificador de seguimiento** y estado *Pendiente* |
| D-06 | Incidencia con descripción corta | Descripción de menos de 5 caracteres | Mensaje «al menos 5 caracteres»; no se crea |
| D-07 | Incidencia sin tipo o sin espacio | Dejar vacío el tipo o el espacio | Mensaje de validación |
| D-08 | Mis incidencias | Volver a `/docente/incidencias` | Aparece la de D-05 como *Pendiente* |
| D-09 | Ver el cierre | Después de J-05 o C-14 | La incidencia muestra *Resuelta/Descartada* y el comentario de cierre |
| D-10 | Solicitar software nuevo | `/docente/solicitudes-software` → nombre que **no** exista en el catálogo, versión, sección `2-LAB`, justificación | Solicitud *Pendiente* |
| D-11 | Solicitar software que ya existe | Pedir un software que ya está en el catálogo | Rechazo 409: indica que ya existe en el catálogo (no hay nada que aprobar) |
| D-12 | Mis solicitudes | Ver la lista | Aparece D-10 con su estado; tras C-16/C-17 muestra *Aprobada* o *Rechazada* con motivo |
| D-13 | Docente sin secciones | (Si existe) entrar con un docente sin asignaciones | Estado vacío explicativo |

---

## 4. Jefatura de Laboratorios

| ID | Caso | Pasos | Resultado esperado |
|---|---|---|---|
| J-01 | Ver sus laboratorios | `/admin/espacios` y `/admin/laboratorios` | Aparecen los 18 laboratorios; **no** aparecen las aulas teóricas para editar |
| J-02 | Aula teórica | Abrir por URL un aula teórica | 403 «No tienes asignado este laboratorio» |
| J-03 | Registrar PCs malogradas | `/admin/laboratorio` (Cambio de laboratorio), Laboratorio 01: PCs malogradas de 0 a **3** | Se guarda; queda en historial y **genera alerta de capacidad** (63 → 60 puestos para 61 alumnos) — ver flujo F-01 |
| J-04 | PCs malogradas mayores que el aforo | Poner 30 PCs malogradas en un laboratorio de aforo 21 | 422 «El conteo de PCs malogradas excede el aforo nominal» |
| J-05 | Cerrar incidencia | `/admin/incidencias`, la de D-05 → *Resuelta* con comentario | Pasa a *Resuelta*; el docente la ve cerrada (D-09) |
| J-06 | Cerrar sin comentario | Comentario de menos de 3 caracteres | Mensaje de validación |
| J-07 | Cerrar dos veces | Intentar cerrar otra vez la misma incidencia | 409 «La incidencia ya fue cerrada» |
| J-08 | Campos que no le corresponden | Intentar editar aforo, nombre o habilitado de un espacio | 403 «Tu rol no puede editar: …» (solo PCs y software) |
| J-09 | Pantallas solo de Coordinación | Abrir `/admin/carga`, `/admin/claves`, `/admin/alumnos/nuevo`, `/admin/periodos` | Acceso denegado |
| J-10 | Aprobar solicitud de software | En `/admin/solicitudes-software` intentar aprobar | No puede (solo Coordinación); puede ver la lista |
| J-11 | Sin botón «Reubicar» | En `/admin/alertas`, abrir la alerta de J-03 | Puede **marcarla como resuelta**, pero **no** ve «Reubicar secciones» (es acción de Coordinación) |
| J-12 | Resolver alerta | Marcar como resuelta la alerta de J-03 | Pasa a *Resuelta*; si se repite, 409 |

---

## 5. Coordinación Académica

### 5.1 Inicio, escaladas y asignación

| ID | Caso | Pasos | Resultado esperado |
|---|---|---|---|
| C-01 | Inicio y resumen | `/admin` | Métricas «Esperan revisión» y «Alertas pendientes», lista de secciones en revisión y accesos |
| C-02 | Datos incompletos | Ver el inicio con `DEMO001 DEMO` sin horarios | `DEMO001 · DEMO` aparece en el bloque **«Datos incompletos: falta cargar horarios»** con el botón «Cargar horarios», **no** en la lista de revisión ni en la cifra «Esperan revisión» (#414) |
| C-03 | Corregir datos incompletos | Subir `demo/asignacion-error-con-horario.csv` en Horarios (le da horario a `DEMO001 DEMO`) | La carga se guarda, se encadena la asignación y `DEMO001 DEMO` deja el bloque de datos incompletos |
| C-04 | Reintentar una escalada | «Reintentar» en una sección de la lista de revisión | Si nada cambió, sigue en revisión con el mismo motivo |
| C-05 | Correr la asignación | Ejecutar la corrida completa desde el inicio | Resumen de asignadas, mantenidas y escaladas; el veredicto de verificación sale **sin dobles reservas** (#409) |
| C-06 | Editar sección | `/admin/secciones`, cambiar docente o software requerido de una sección de laboratorio | Se guarda y queda en auditoría |
| C-07 | Sección sin cambios | Guardar sin modificar nada | «Indica al menos un campo a modificar» |
| C-08 | Forzar escalamiento por software | A `202SW0805 2-LAB` añadirle un software que ningún laboratorio tiene y reasignar la sección | Escala con motivo de software faltante — ver F-03 |

### 5.2 Espacios y alertas

| ID | Caso | Pasos | Resultado esperado |
|---|---|---|---|
| C-09 | Editar espacio | `/admin/espacios`, cambiar aforo de un aula | Se guarda; si deja a una sección sin cupo, **genera alerta de capacidad** |
| C-10 | Espacio inválido | Aforo 0 con el espacio habilitado; PCs malogradas en un aula teórica; contigüidad entre aula y laboratorio; identificador repetido | 422 / 400 / 409 con mensaje específico en cada caso |
| C-11 | Deshabilitar un espacio con clases | Deshabilitar un aula que tenga secciones asignadas | Se guarda y **se genera una alerta** de capacidad con esas secciones («el espacio fue deshabilitado») (#411) |
| C-12 | Reubicar desde la alerta | En `/admin/alertas`, sobre la alerta de C-11 o de J-03, «Reubicar secciones» → confirmar | Aviso «Alerta resuelta: N secciones reubicadas[, K sin cambios (su aula sigue sirviendo)][, M en revisión en el inicio]»; la alerta deja la lista; cada sección tiene aula nueva, conserva la suya si todavía sirve o aparece en revisión (#411) |
| C-13 | Filtro de alertas | Usar el selector Todas / Software / Capacidad / Accesibilidad | Cada filtro muestra solo su tipo y su conteo |
| C-14 | Volver a habilitar | Rehabilitar el espacio de C-11 | Se guarda; no genera alerta |

### 5.3 Incidencias, software, cuentas y reportes

| ID | Caso | Pasos | Resultado esperado |
|---|---|---|---|
| C-15 | Incidencias | `/admin/incidencias` | Ve **todas** las incidencias; puede resolver/descartar |
| C-16 | Catálogo de software | `/admin/software`: alta, edición, dar de baja | Cambios visibles; uno dado de baja no se puede asignar |
| C-17 | Aprobar solicitud | `/admin/solicitudes-software`, aprobar la de D-10 marcando «añadir a la sección» | *Aprobada*; el software entra al catálogo y a los requisitos de `2-LAB` — puede provocar escalamiento (F-03) |
| C-18 | Rechazar solicitud | Crear otra solicitud (D-10) y rechazarla con motivo | *Rechazada*; el docente ve el motivo |
| C-19 | Aprobar/rechazar dos veces | Repetir sobre una ya resuelta | 409 «ya fue aprobada/rechazada» |
| C-20 | Restablecer clave | `/admin/claves`, restablecer `23200107` | Muestra clave temporal; al entrar el alumno debe cambiarla (A-06) |
| C-21 | Alta de alumno / docente | `/admin/alumnos/nuevo`, `/admin/docentes/nuevo` | Cuenta creada; clave inicial = código; al entrar debe cambiarla (A-06) |
| C-22 | Alta duplicada | Repetir con el mismo código | 409: el código ya existe |
| C-23 | Auditoría | `/admin/auditoria` | Aparecen las acciones de esta guía: quién, qué, valor anterior y nuevo |
| C-24 | Reporte de salones | `/admin/reporte` | Reporte de asignaciones por espacio |
| C-25 | Mapa admin | `/admin/mapa` | Ocupación por piso coherente con las asignaciones |

### 5.4 Periodos (#427)

| ID | Caso | Pasos | Resultado esperado |
|---|---|---|---|
| P-01 | Ver periodos | `/admin/periodos` | Aparece `2026-2` como **Vigente** |
| P-02 | Registrar un periodo | «Registrar periodo» con `2027-1` (y fechas, si se piden) | Queda **En preparación**; alumnos y docentes siguen viendo `2026-2` |
| P-03 | Registrar con formato inválido o repetido | Registrar `2027-III` o volver a registrar `2027-1` | Mensaje de validación; 409 «El periodo 2027-1 ya está registrado» |
| P-04 | Cargar en un periodo en preparación | Con `2027-1` registrado, subir `demo/pruebas/22-periodo-en-preparacion.csv` | Se guarda en `2027-1`; el portal del alumno y la consulta pública no lo muestran |
| P-05 | Activar un periodo ⚠️ *solo en base local* | «Activar periodo» sobre `2027-1` y confirmar | `2027-1` pasa a Vigente y `2026-2` a Cerrado en el mismo paso; queda en auditoría |
| P-06 | Escribir en un periodo cerrado ⚠️ *solo en base local* | Tras P-05, editar una sección de `2026-2` o subir un CSV con periodo `2026-2` | Rechazo «El periodo 2026-2 está cerrado y solo admite consulta» |
| P-07 | Reactivar un periodo cerrado ⚠️ *solo en base local* | Intentar activar `2026-2` | 409 «El periodo 2026-2 está cerrado y no se puede reactivar» |

---

## 6. Carga de datos con los CSV de prueba

Todos los archivos están en [`demo/pruebas/`](../demo/pruebas/). Se suben en `/admin/carga`, en la zona del tipo indicado. Hay que seguir el orden: varios casos dependen de los anteriores.

**Comportamiento esperado en todas las cargas:**
- **Todo o nada** (#428): si el archivo tiene al menos un error, **no se guarda ninguna fila**; la tarjeta dice «0 guardadas» y el detalle lista **todos** los errores, no solo el primero.
- **Advertencias:** un docente o alumno con dos clases a la vez no impide guardar; aparece como aviso en el resultado.
- **Avance** (#431): mientras se importa se ve «Procesando N de M filas»; no se puede subir otro archivo del mismo tipo hasta que termine.

| ID | Archivo | Zona | Resultado esperado |
|---|---|---|---|
| CD-01 | `01-cursos-secciones-demo.csv` | Cursos y secciones | Se guarda: crea `DEMO002` con las secciones `A`, `B` (aulas) y `LAB` |
| CD-02 | `02-horarios-demo.csv` | Horarios | Se guarda: A domingo 14:00–16:00, B 15:00–17:00, LAB 18:00–20:00 |
| CD-03 | `03-matriculas-demo.csv` | Matrículas | Se guarda con **1 aviso**: «El alumno 99999901 tendría dos clases a la vez: DEMO002-A y DEMO002-B (DOMINGO 14:00-16:00)» |
| CD-04 | (verificación) | — | En `/consulta`, el código `99999905` aparece matriculado en `DEMO002 A` |
| CD-10 | `10-retiro-matriculas.csv` | Matrículas | Se guarda. `99999905` **deja de estar** matriculado en `DEMO002 A` (retiro, #429); los demás siguen igual |
| CD-11 | `11-cambio-horario.csv` | Horarios | Se guarda. `DEMO002 A` queda **solo** con domingo 16:00–18:00; la franja de 14:00 desaparece (#429) |
| CD-20 | `20-periodo-romano-valido.csv` | Horarios | Se guarda: «2026-II» se toma como «2026-2» |
| CD-21 | `21-periodo-invalido.csv` | Horarios | **Rechazado, 0 guardadas.** Errores: fila 2 «El periodo debe tener el formato 2026-1 o 2026-2…»; fila 3 «El periodo 2025-2 no está registrado…». La fila 1, aunque es válida, tampoco se guarda |
| CD-22 | `22-periodo-en-preparacion.csv` | Cursos y secciones | Antes de P-02: **rechazado** «El periodo 2027-1 no está registrado…». Después de P-02: se guarda (ver P-04) |
| CD-30 | `30-horarios-todo-o-nada.csv` | Horarios | **Rechazado, 0 guardadas**, con 4 errores: inicio posterior al fin (fila 2), sección `ZZ` inexistente (fila 3), día `FERIADO` inválido (fila 4) y franja repetida (fila 5) |
| CD-31 | `31-docentes-repetidos.csv` | Docentes | **Rechazado:** «Fila 2: el docente D99901 se repite (ya aparece en la fila 1)» |
| CD-32 | `32-choque-docente.csv` | Horarios | Primero, en `/admin/secciones`, asignar **el mismo docente** a `DEMO002 A` y `DEMO002 B`. Luego subir: se guarda con un aviso «El docente de DEMO002-B y DEMO002-A tendría dos clases a la vez…» |
| CD-40 | `40-excel-windows1252.csv` | Cursos y secciones | Archivo guardado como lo deja Excel en español (Windows-1252, separado por `;`). Se guarda y el curso `DEMO003` se ve como «**ÁLGEBRA DE PRUEBA - AÑO ÚNICO**», con tildes y ñ (#430) |
| CD-41 | `41-caracteres-danados.csv` | Cursos y secciones | **Rechazado:** «El archivo tiene caracteres dañados: guárdalo como CSV UTF-8 en Excel» |
| CD-50 | `../cursos-secciones.csv` (228 filas) | Cursos y secciones | Durante la carga se ve el avance; mientras dura, intentar subir otro archivo de cursos da «Ya hay una importación de este tipo en curso…». Termina sin cambios en los datos (son los mismos de la base) |
| CD-51 | Archivo equivocado | Matrículas | Subir un CSV de horarios en la zona de matrículas, o un archivo que no sea CSV | Rechazo con mensaje claro |

---

## 7. Flujos de escalamiento entre roles (los más importantes)

Estos flujos atraviesan varios roles. Un flujo está **aprobado** solo si cada paso da el resultado esperado.

### F-01 · PCs malogradas → alerta de capacidad → Coordinación reubica
1. **Jefatura** sube las PCs malogradas del Laboratorio 01 de 0 a 3 (J-03).
2. **Sistema:** la capacidad del bloque baja de 63 a 60 para 61 alumnos → crea una **alerta de capacidad** sobre `202SW0805 2-LAB`.
3. **Coordinación** la ve en `/admin/alertas` y en el inicio.
4. **Coordinación** pulsa «Reubicar secciones» en la alerta (C-12). La sección pasa a un bloque con capacidad suficiente **o** queda en revisión con motivo de capacidad; la alerta queda resuelta.
5. **Docente `0A0690`** y alumnos de la sección ven el nuevo espacio en su horario (D-01 / E-05).
6. Todo queda en auditoría (C-23).

### F-02 · Incidencia del docente → Jefatura la atiende
1. **Docente** reporta un equipo no operativo en el Laboratorio 01 (D-05).
2. **Jefatura** la ve en `/admin/incidencias`, ordenada por prioridad (Alta primero).
3. **Jefatura** registra las PCs malogradas si corresponde (dispara F-01) y cierra la incidencia con comentario (J-05).
4. **Docente** ve la incidencia cerrada con el comentario (D-09).
5. Variante: Jefatura **descarta** la incidencia → el docente la ve *Descartada*.

### F-03 · Docente pide software → Coordinación aprueba → la sección puede escalar
1. **Docente** solicita un software que no existe (D-10) para `2-LAB`.
2. **Coordinación** lo aprueba añadiéndolo a la sección (C-17).
3. **Coordinación** reasigna la sección: como ningún laboratorio tiene ese software, la sección **escala** por software faltante.
4. **Jefatura** registra ese software en un laboratorio a su cargo (Cambio de laboratorio).
5. **Coordinación** reintenta: la sección vuelve a *Vigente*.

### F-04 · Sección sin horarios → datos incompletos → carga de horarios
1. `DEMO001 DEMO` aparece en **«Datos incompletos»**, no entre las escaladas (C-02).
2. «Cargar horarios» lleva a la carga de datos.
3. **Coordinación** sube `demo/asignacion-error-con-horario.csv` (C-03): la sección recibe aula y sale del bloque.

### F-05 · Alumno con movilidad reducida → piso 1 o alerta de accesibilidad
1. **Alumno** declara movilidad reducida (E-10).
2. **Coordinación** corre la asignación (C-05). Las secciones con alumnos con movilidad reducida se asignan primero.
3. Si la sección consigue un espacio en el **piso 1**, queda ahí y no hay alerta.
4. Si **no hay lugar en el piso 1** (muy probable en laboratorios: solo hay 2 habilitados en ese piso), la sección queda en el piso más cercano al ascensor y aparece una **alerta de «Accesibilidad»** en `/admin/alertas`: «… tiene alumnos con movilidad reducida y quedó en el piso N porque no había lugar en el piso 1» (R10).
5. La alerta de accesibilidad **no** ofrece «Reubicar» (no hay otro piso 1 libre); Coordinación decide y la marca como resuelta.

### F-06 · Cuenta bloqueada u olvidada → Coordinación restablece
1. **Alumno** agota intentos (A-05) o no recuerda la clave.
2. **Coordinación** restablece la clave (C-20).
3. **Alumno** entra con la temporal y está obligado a cambiarla (A-06 → A-09).

---

## 8. Limpieza al terminar

Revertir lo que se cambió en la base real:

- PCs malogradas de los laboratorios 01–03 → 0.
- Espacio deshabilitado en C-11 → volver a habilitarlo (C-14).
- Software añadido a `202SW0805 2-LAB` en C-08 / F-03 → quitarlo y reasignar la sección.
- Software de prueba del catálogo → darlo de baja.
- Docente asignado a `DEMO002 A` y `B` en CD-32 → quitarlo.
- Volver a correr la asignación y confirmar que no quedan escaladas nuevas.
- Anotar en el informe qué cuentas cambiaron de clave durante las pruebas.

**Datos de prueba que quedan en la base:** los cursos `DEMO001`, `DEMO002` y `DEMO003`, los alumnos `99999901`–`99999906` y, si se hizo P-02, el periodo `2027-1` en preparación. No afectan a los datos reales (usan horarios de domingo por la tarde), pero no hay pantalla para borrarlos: si se quieren quitar, hay que hacerlo directamente en la base, con cuidado.

---

## 9. Hallazgos ya conocidos (no reportarlos como nuevos)

> El detalle completo de cada riesgo, con ejemplos y propuestas, está en [`riesgos_y_brechas.md`](./riesgos_y_brechas.md).

| Hallazgo | Impacto en las pruebas | Seguimiento |
|---|---|---|
| Catálogo de software sin cargar en la base | Cargarlo con `prisma:cargar-catalogo-software` y correr la asignación; si no, los casos de software requieren crear un programa antes | Riesgo #41 · issue #438 |
| No hay asignación manual de una sección escalada a un espacio concreto | Una escalada solo sale si cambia algo (datos, espacios) o con «Reubicar» desde una alerta | Riesgos #4 y #29 · issue #412 |
| Los horarios de una sección no se editan en pantalla | Cambiar un horario requiere subir un CSV | Riesgo #21 · issue #425 |
| Cargar matrículas u horarios reemplaza los de cada sección incluida, sin vista previa | No subir archivos parciales de secciones reales (ver 0.2) | Riesgo #35 · issue #429 |
| La declaración de movilidad reducida no requiere aprobación ni reasigna sola | E-10 necesita que Coordinación corra la asignación | Riesgos #12 y #13 · issue #417 |
| Teoría y laboratorio se muestran como cursos distintos en Telegram, horario y portal docente | No es un error nuevo | Riesgo #23 · issue #419 |
| Alguien que conoce el código de una cuenta no activada puede tomarla (la clave inicial es el código) | Al probar A-06, no usar cuentas reales de otras personas | Riesgo #30 · aceptado para la demo |
| El primer acceso tras 15 minutos sin uso puede fallar | Reintentar una vez | Riesgo #40 · aceptado |
