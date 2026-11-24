# Guía de pruebas manuales por rol — SAIE

> **Para qué sirve:** recorrer el sistema completo con los cuatro roles, comprobando no solo los casos de éxito sino también los casos en que el sistema **rechaza** una acción o **escala** un problema a otro rol (Coordinación o Jefatura) para que lo resuelva.
>
> **Estado de la base al redactar esta guía (24/11/2026):** 14 migraciones aplicadas y sin diferencias con `schema.prisma`; periodo `2026-2`; 54 espacios (18 laboratorios, 36 aulas, 5 deshabilitados); 229 secciones; 228 asignaciones vigentes y 1 escalada; 0 alertas, 0 incidencias y 0 solicitudes de software; 0 programas en el catálogo de software.

---

## 0. Antes de empezar

### 0.1 Cuentas de prueba

| Rol | Usuario | Clave | Observación |
|---|---|---|---|
| Coordinación Académica | `coordinacion` | Ver `CUENTAS_SISTEMA` en `backend/prisma/seed.ts` | — |
| Jefatura de Laboratorios | `jefatura` | Ver `CUENTAS_SISTEMA` en `backend/prisma/seed.ts` | **Ver bloqueo 0.2** |
| Docente | `0A0690` | Su propio código (clave inicial) | Dicta `202SW0805` sección `2-LAB` en 3 laboratorios; debe cambiar la clave al entrar |
| Alumno (primer ingreso) | `23200268` | Su propio código (clave inicial) | Debe cambiar la clave al entrar |
| Alumno (ya activado) | `23200107` | La que se definió al activarla | Si nadie la conoce, Coordinación la restablece (caso C-18) |

> Las cuentas de alumnos y docentes del seed y las creadas desde las pantallas de alta usan su **código** como usuario y como clave inicial. Las creadas por **importación de docentes** reciben una clave inicial generada que se muestra **una sola vez** al terminar la carga.

### 0.2 ⚠️ Bloqueo conocido: Jefatura no tiene laboratorios a cargo

La tabla `EspacioResponsable` está **vacía** y ninguna pantalla ni script la llena. Como Jefatura solo ve y edita los laboratorios que tiene a su cargo, hoy la cuenta `jefatura`:

- ve la lista de espacios, alertas e incidencias **vacía**;
- recibe `403 No tienes asignado este laboratorio` al abrir o editar cualquier laboratorio.

**Hasta que se corrija**, los casos de Jefatura (sección 4) y los flujos de escalamiento que terminan en Jefatura (sección 5) **no se pueden aprobar**. Para probarlos hay que vincular la cuenta `jefatura` con al menos los laboratorios 01, 02 y 03 del Nuevo Pabellón (los que usa `202SW0805 2-LAB`).

### 0.3 Otros puntos a tener en cuenta

- **Después de cada `git pull`** correr `npx prisma generate` en `backend/`; si no, el backend no compila.
- **Límite de intentos de login:** 5 intentos por usuario y 20 por IP cada 10 minutos. Los casos de clave incorrecta consumen intentos: hacerlos al final o con otra cuenta.
- **Carga de datos (#346, pendiente):** la «última carga» se guarda en el navegador, no en el servidor. Si otro navegador no la muestra, es el comportamiento conocido, no un error nuevo.
- **No hay software cargado** (riesgo #41): el catálogo, el software de los laboratorios y los requisitos de las secciones están vacíos. Para los casos de software (C-11, C-15, C-16 y F-03), Coordinación debe crear primero al menos un programa en `/admin/software`. **No cargar el catálogo propuesto** del documento de riesgos: está pendiente de aprobación.
- **CSV desde Excel** (riesgo #38): guardar los CSV de prueba como «CSV UTF-8 (delimitado por comas)». Con el formato «CSV (delimitado por comas)» las tildes y la ñ se dañan.
- **Servidor dormido** (riesgo #40): si nadie usó el sistema en 15 minutos, el primer acceso puede fallar por tiempo de espera. Reintentar una vez.
- **No escribir periodos en romanos** (riesgo #49): en los CSV usar `2026-2`, nunca `2026-II`; un periodo mal escrito cambia el periodo vigente de todo el sistema.
- Las acciones que modifican datos (PCs malogradas, software, aforo, solicitudes, incidencias) **cambian la base real**. Anotar los valores originales para revertirlos al final (sección 6).

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
| E-01 | Consulta pública por código de alumno | Sin sesión, `/consulta` con `23200107` | Muestra sus cursos y aulas |
| E-02 | Consulta pública por código de curso | `/consulta` con `202SW0805` | Muestra secciones y espacios asignados |
| E-03 | Consulta con código inexistente | `/consulta` con `99999999` | Mensaje claro de «no encontrado», sin error técnico |
| E-04 | Consulta con formato inválido | Letras o símbolos raros | Mensaje de validación |
| E-05 | Mi horario | `/estudiante/horario` | Horario semanal con aula de cada clase |
| E-06 | Mapa de ocupación | `/estudiante/mapa` | Plano por piso con sus aulas resaltadas |
| E-07 | Ruta de referencia | Desde una clase, «cómo llegar» (`/estudiante/ruta`) | Muestra ruta; si tiene movilidad reducida, prioriza piso 1 |
| E-08 | Perfil y ficha médica | `/estudiante/perfil`, editar datos permitidos y guardar | Se guarda y se ve al recargar |
| E-09 | Perfil con datos inválidos | DNI de 7 dígitos o con letras; fecha de nacimiento con formato distinto de AAAA-MM-DD | Mensaje de validación; no se guarda |
| E-10 | Movilidad reducida → piso 1 | En la ficha médica del perfil, declarar condición accesible | **Escalamiento:** no cambia el aula al instante; Coordinación debe volver a correr la asignación (C-10) y la sección debería pasar a un espacio de piso 1 o escalar si no hay |
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

> **Requiere resolver el bloqueo 0.2** (laboratorios 01–03 a cargo de `jefatura`).

| ID | Caso | Pasos | Resultado esperado |
|---|---|---|---|
| J-01 | Ver solo sus laboratorios | `/admin/espacios` y `/admin/laboratorios` | Solo los laboratorios a su cargo |
| J-02 | Laboratorio ajeno | Abrir por URL un laboratorio que no tiene a cargo | 403 «No tienes asignado este laboratorio» |
| J-03 | Registrar PCs malogradas | `/admin/laboratorio` (Cambio de laboratorio), Laboratorio 01: PCs malogradas de 0 a **3** | Se guarda; queda en historial y **genera alerta de CAPACIDAD** (63 → 60 puestos para 61 alumnos) — ver flujo F-01 |
| J-04 | PCs malogradas mayores que el aforo | Poner 30 PCs malogradas en un laboratorio de aforo 21 | 422 «El conteo de PCs malogradas excede el aforo nominal» |
| J-05 | Cerrar incidencia | `/admin/incidencias`, la de D-05 → *Resuelta* con comentario | Pasa a *Resuelta*; el docente la ve cerrada (D-09) |
| J-06 | Cerrar sin comentario | Comentario de menos de 3 caracteres | Mensaje de validación |
| J-07 | Cerrar dos veces | Intentar cerrar otra vez la misma incidencia | 409 «La incidencia ya fue cerrada» |
| J-08 | Campos que no le corresponden | Intentar editar aforo, nombre o habilitado de un espacio | 403 «Tu rol no puede editar: …» (solo PCs y software) |
| J-09 | Pantallas solo de Coordinación | Abrir `/admin/carga`, `/admin/claves`, `/admin/alumnos/nuevo` | Acceso denegado |
| J-10 | Aprobar solicitud de software | En `/admin/solicitudes-software` intentar aprobar | No puede (solo Coordinación); puede ver la lista |
| J-11 | Resolver alerta | `/admin/alertas`, resolver la alerta de J-03 | Pasa a *Resuelta*; si se repite, 409 |

---

## 5. Coordinación Académica

| ID | Caso | Pasos | Resultado esperado |
|---|---|---|---|
| C-01 | Inicio y resumen | `/admin` | Resumen con secciones escaladas (hoy: `DEMO001 DEMO`) y alertas |
| C-02 | Sección escalada visible | Ver la fila de `DEMO001 DEMO` | Motivo en lenguaje llano: sin horarios definidos, con acción sugerida |
| C-03 | Reintentar una escalada sin corregir la causa | «Reintentar» en `DEMO001 DEMO` | Sigue escalada con el mismo motivo (no hay horarios) |
| C-04 | Corregir la causa y reintentar | Cargar en `/admin/carga` un CSV de horarios que incluya `DEMO001 DEMO` y reintentar | Pasa a *Vigente* con espacio asignado, o escala por otro motivo distinto |
| C-05 | Carga de CSV correcta | `/admin/carga`, subir un CSV válido (ver `docs/guia-csv.md`) | Resultado *Exitosa* con conteo de filas |
| C-06 | CSV con errores | Columnas faltantes, filas con códigos inexistentes o formato roto | Resultado *Con errores*, indicando filas y motivo. **Hoy las filas válidas sí se guardan** (riesgo #34): comprobar cuántas quedaron |
| C-07 | Archivo equivocado | Subir un CSV de matrículas en la zona de horarios, o un archivo no CSV | Rechazo con mensaje claro |
| C-08 | Editar sección | `/admin/secciones`, cambiar docente o software requerido de una sección de laboratorio | Se guarda y queda en auditoría |
| C-09 | Sección sin cambios | Guardar sin modificar nada | «Indica al menos un campo a modificar» |
| C-10 | Correr la asignación | Ejecutar la corrida completa o por sección | Resumen de asignadas / escaladas; las que no cambiaron se conservan |
| C-11 | Forzar escalamiento por software | A `202SW0805 2-LAB` añadirle un software que ningún laboratorio tiene y reasignar la sección | Escala con motivo de software faltante — ver F-03 |
| C-12 | Editar espacio | `/admin/espacios`, cambiar aforo de un aula | Se guarda; si deja a una sección sin cupo, **genera alerta de CAPACIDAD** |
| C-13 | Espacio inválido | Aforo 0 con el espacio habilitado; PCs malogradas en un aula teórica; contigüidad entre aula y laboratorio; identificador repetido | 422 / 400 / 409 con mensaje específico en cada caso |
| C-14 | Incidencias | `/admin/incidencias` | Ve **todas** las incidencias; puede resolver/descartar |
| C-15 | Catálogo de software | `/admin/software`: alta, edición, dar de baja | Cambios visibles; uno dado de baja no se puede asignar |
| C-16 | Aprobar solicitud | `/admin/solicitudes-software`, aprobar la de D-10 marcando «añadir a la sección» | *Aprobada*; el software entra al catálogo y a los requisitos de `2-LAB` — puede provocar escalamiento (F-03) |
| C-17 | Rechazar solicitud | Crear otra solicitud (D-10) y rechazarla con motivo | *Rechazada*; el docente ve el motivo |
| C-18 | Aprobar/rechazar dos veces | Repetir sobre una ya resuelta | 409 «ya fue aprobada/rechazada» |
| C-19 | Aprobar un software dado de baja | Solicitud cuyo software existe pero está de baja | 422: pide reactivarlo antes |
| C-20 | Restablecer clave | `/admin/claves`, restablecer `23200107` | Muestra clave temporal; al entrar el alumno debe cambiarla (A-06) |
| C-21 | Alta de alumno / docente | `/admin/alumnos/nuevo`, `/admin/docentes/nuevo` | Cuenta creada; clave inicial = código; al entrar debe cambiarla (A-06) |
| C-22 | Alta duplicada | Repetir con el mismo código | 409: el código ya existe |
| C-23 | Auditoría | `/admin/auditoria` | Aparecen las acciones de esta guía: quién, qué, valor anterior y nuevo |
| C-24 | Reporte de salones | `/admin/reporte` | Reporte de asignaciones por espacio |
| C-25 | Mapa admin | `/admin/mapa` | Ocupación por piso coherente con las asignaciones |

---

## 6. Flujos de escalamiento entre roles (los más importantes)

Estos flujos atraviesan varios roles. Un flujo está **aprobado** solo si cada paso da el resultado esperado.

### F-01 · PCs malogradas → alerta de capacidad → Coordinación reubica
1. **Jefatura** sube las PCs malogradas del Laboratorio 01 de 0 a 3 (J-03).
2. **Sistema:** capacidad del bloque baja de 63 a 60 para 61 alumnos → crea **alerta de CAPACIDAD** sobre `202SW0805 2-LAB`.
3. **Coordinación** la ve en `/admin/alertas` y en el inicio.
4. **Coordinación** reasigna la sección (C-10). Esperado: pasa a un bloque con capacidad suficiente **o** queda *Escalada* con motivo de capacidad. **Hoy falla (hallazgo conocido):** la reasignación conserva los mismos laboratorios porque los datos de la sección no cambiaron; la alerta solo se puede marcar como resuelta.
5. **Docente `0A0690`** y alumnos de la sección ven el nuevo espacio en su horario (D-01 / E-05).
6. Se resuelve la alerta (J-11) y todo queda en auditoría (C-23).

### F-02 · Incidencia del docente → Jefatura la atiende
1. **Docente** reporta un equipo no operativo en el Laboratorio 01 (D-05).
2. **Jefatura** la ve en `/admin/incidencias`, ordenada por prioridad (Alta primero).
3. **Jefatura** registra las PCs malogradas si corresponde (dispara F-01) y cierra la incidencia con comentario (J-05).
4. **Docente** ve la incidencia cerrada con el comentario (D-09).
5. Variante: Jefatura **descarta** la incidencia → el docente la ve *Descartada*.

### F-03 · Docente pide software → Coordinación aprueba → la sección puede escalar
1. **Docente** solicita un software que no existe (D-10) para `2-LAB`.
2. **Coordinación** lo aprueba añadiéndolo a la sección (C-16).
3. **Coordinación** reasigna la sección: como ningún laboratorio tiene ese software, la sección **escala** por software faltante.
4. **Jefatura** registra ese software en un laboratorio a su cargo (Cambio de laboratorio).
5. **Coordinación** reintenta: la sección vuelve a *Vigente*.

### F-04 · Sección sin horarios → solo se corrige con carga de datos
1. `DEMO001 DEMO` está escalada por **falta de horarios** (C-02).
2. Reintentar no la arregla (C-03): los horarios no se editan en pantalla.
3. **Coordinación** carga un CSV de horarios con esa sección (C-04) y reintenta → *Vigente*.

### F-05 · Alumno con movilidad reducida → piso 1
1. **Alumno** marca movilidad reducida (E-10).
2. **Coordinación** reasigna sus secciones.
3. Las secciones pasan a espacios de **piso 1**; si no hay disponibles, escalan y aparecen en el inicio de Coordinación.

### F-06 · Cuenta bloqueada u olvidada → Coordinación restablece
1. **Alumno** agota intentos (A-05) o no recuerda la clave.
2. **Coordinación** restablece la clave (C-20).
3. **Alumno** entra con la temporal y está obligado a cambiarla (A-06 → A-09).

---

## 7. Limpieza al terminar

Revertir lo que se cambió en la base real:

- PCs malogradas de los laboratorios 01–03 → 0.
- Software añadido a `202SW0805 2-LAB` en C-11 / F-03 → quitarlo y reasignar la sección.
- Software de prueba del catálogo → darlo de baja.
- Volver a correr la asignación y confirmar que solo queda escalada la que había al empezar.
- Anotar en el informe qué cuentas cambiaron de clave durante las pruebas.

---

## 8. Hallazgos ya conocidos (no reportarlos como nuevos)

> El detalle completo de cada riesgo, con ejemplos y propuestas, está en [`riesgos_y_brechas.md`](./riesgos_y_brechas.md).

| Hallazgo | Impacto en las pruebas | Seguimiento |
|---|---|---|
| Jefatura sin laboratorios a cargo (`EspacioResponsable` vacía y sin pantalla para llenarla) | Bloquea la sección 4 y los flujos F-01 a F-03 | Riesgo #17 · **por abrir issue** |
| Reasignar no mueve una sección cuyo espacio perdió capacidad o fue deshabilitado: el motor la conserva porque solo mira los datos de la sección | F-01 se queda en el paso 4; deshabilitar un espacio con clases no genera alerta | Riesgos #3 y #18 · **por abrir issue** |
| La corrida completa puede dejar dos secciones en la misma aula a la misma hora | Revisar el mapa y la verificación de corrida después de cada carga de datos | Riesgo #1 · **por abrir issue** |
| Un CSV con errores guarda igualmente las filas válidas | C-06 muestra filas guardadas aunque haya errores | Riesgo #34 · **por abrir issue** |
| No hay software cargado | Los casos de software requieren crear un programa antes | Riesgo #41 |
| «Última carga» guardada en el navegador | Difiere entre navegadores | Riesgo #26 · issue #346 |
| No hay asignación manual de una sección escalada a un espacio concreto: solo se corrige la causa y se reintenta | Las escaladas se resuelven siempre por F-01 / F-03 / F-04 | Riesgos #4 y #29 |
| Los horarios de una sección no se editan en pantalla | F-04 requiere carga de CSV | Riesgo #21 |
| Alguien que conoce el código de una cuenta no activada puede tomarla (la clave inicial es el código) | Al probar A-06, no usar cuentas reales de otras personas | Riesgo #30 · aceptado para la demo |
