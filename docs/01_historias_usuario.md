# Historias de Usuario - SAIE

> **Sistema de Asignación Inteligente de Espacios (SAIE)**  
> Universidad Nacional Mayor de San Marcos — Facultad de Ingeniería de Sistemas e Informática  
> Escuela Académica Profesional de Ingeniería de Software — Grupo 6 (2026)  
> **Issue de referencia:** #189 (6.1) · **Versión:** 1.0.0 · **Fecha:** 2026-09-23  
> **Línea base:** Funcional (ver [Plan de Línea Base](04_plan_linea_base.md))

---

## 1. Propósito

Este documento reúne las historias de usuario de los cuatro actores principales del SAIE. Son el origen de los requisitos funcionales de [`02_requisitos.md`](02_requisitos.md): cada RF se traza a al menos una historia (ver matriz en la sección 4).

### 1.1. Formato

Cada historia sigue la plantilla *Como [actor], quiero [acción], para [beneficio]* e incluye:
* **Criterios de aceptación** en formato Dado / Cuando / Entonces, redactados para poder convertirse directamente en pruebas.
* **RF** que origina.
* **Prioridad** MoSCoW (`M` Must, `S` Should, `C` Could), coherente con la del RF.

---

## 2. Actores

| Actor | Rol en el sistema (`Cuenta.rol`) | Necesidad principal |
| :--- | :--- | :--- |
| Estudiante | `ALUMNO` | Saber dónde le toca clase, sin depender de PDFs ni grupos informales. |
| Docente de teoría y práctica | `DOCENTE` | Tener su grupo en un solo bloque, con el software listo y cerca de sus secciones paralelas. |
| Coordinación Académica | `COORDINACION_ACADEMICA` | Cargar la programación y obtener una asignación válida sin armarla a mano. |
| Jefatura de Laboratorios | `JEFATURA_LABORATORIOS` | Mantener al día el estado de los laboratorios y enterarse cuando un cambio afecta clases asignadas. |

---

## 3. Historias

### 3.1. Estudiante

#### HU-01 — Consultar mi espacio por código de alumno
**Como** estudiante, **quiero** ingresar mi código de alumno y ver dónde son mis clases, **para** no depender de canales informales ni PDFs desactualizados.

**Criterios de aceptación**
1. **Dado** un código de alumno con matrículas en el periodo vigente, **cuando** lo consulto, **entonces** veo por cada sección: tipo de espacio, pabellón, piso, aula o salas, horario y docente.
2. **Dado** un código inexistente, **cuando** lo consulto, **entonces** veo un mensaje claro de "código no encontrado" sin error técnico.
3. **Dado** una sección escalada aún sin espacio, **cuando** la consulto, **entonces** figura como "asignación pendiente" en lugar de un aula incorrecta.
4. La respuesta nunca incluye datos de la ficha médica (RNF-09).

**RF:** RF-15 · **Prioridad:** M

#### HU-02 — Consultar por código de curso
**Como** estudiante, **quiero** buscar por código de curso, **para** ubicar el aula de un curso aunque no recuerde mi código o esté ayudando a un compañero.

**Criterios de aceptación**
1. **Dado** un código de curso válido, **cuando** lo consulto, **entonces** veo todas sus secciones del periodo con su espacio, horario y docente.
2. La consulta por curso no expone la lista de alumnos matriculados.

**RF:** RF-15 · **Prioridad:** M

#### HU-03 — Ver el espacio en el plano del piso
**Como** estudiante, **quiero** ver mi aula resaltada en el plano del piso, **para** llegar rápido en hora punta.

**Criterios de aceptación**
1. **Dado** un resultado de consulta, **cuando** pulso "Ver en mapa", **entonces** se abre el plano SVG del pabellón y piso correcto con el espacio resaltado.
2. **Dado** un bloque de varias salas contiguas, **entonces** todas las salas del bloque aparecen resaltadas.

**RF:** RF-16 · **Prioridad:** S

#### HU-04 — Ubicación accesible garantizada
**Como** estudiante con movilidad reducida, **quiero** que mis secciones queden en Piso 1 o, si no es posible, lo más cerca del ascensor, **para** no llegar tarde por el tránsito en hora punta.

**Criterios de aceptación**
1. **Dado** que tengo registrada movilidad reducida en una matrícula y existe un espacio válido en Piso 1, **cuando** se asigna esa sección, **entonces** todos sus espacios están en Piso 1.
2. **Dado** que no existe espacio válido en Piso 1, **entonces** se asigna el espacio válido con menor distancia al ascensor, y la sección no queda escalada por este motivo.
3. En la consulta, el espacio se muestra marcado como accesible e indica si el acceso es por ascensor.

**RF:** RF-10, RF-16 · **Prioridad:** M

#### HU-05 — Ver todas las salas de mi bloque de laboratorio
**Como** estudiante de un curso con más de 20 alumnos en laboratorio, **quiero** ver las salas contiguas que forman mi bloque, **para** saber que cualquiera de ellas es válida y que el docente puede circular entre ellas.

**Criterios de aceptación**
1. **Dado** una sección asignada a un bloque de varias salas, **cuando** la consulto, **entonces** veo todas las salas (ej. "201 – 202, contiguas").

**RF:** RF-09, RF-15 · **Prioridad:** M

#### HU-06 — Ingresar y cambiar mi clave provisoria
**Como** estudiante, **quiero** iniciar sesión con la clave provisoria y cambiarla en el primer ingreso, **para** proteger mi cuenta.

**Criterios de aceptación**
1. **Dado** una cuenta con `debe_cambiar_clave = true`, **cuando** inicio sesión, **entonces** solo puedo acceder a la pantalla de cambio de clave.
2. **Dado** que cambié la clave, **entonces** accedo normalmente y la bandera pasa a `false`.

**RF:** RF-03 · **Prioridad:** M

### 3.2. Docente

#### HU-07 — Ver mi horario con espacios asignados
**Como** docente, **quiero** ver mi horario con el aula o laboratorio de cada sección, **para** planificar mis clases desde el primer día.

**Criterios de aceptación**
1. **Dado** que tengo secciones en el periodo, **cuando** ingreso al portal docente, **entonces** veo cada sección con día, hora, pabellón, piso y espacios asignados.
2. Para laboratorios, veo las PCs operativas y el software instalado de cada sala.

**RF:** RF-17 · **Prioridad:** M

#### HU-08 — Laboratorio con el software que pedí
**Como** docente de práctica, **quiero** que mi sección solo se asigne a laboratorios que tengan el software requerido, **para** no perder la primera clase reinstalando programas.

**Criterios de aceptación**
1. **Dado** una sección con stack requerido {X, Y}, **entonces** todas las salas asignadas tienen instalados X e Y.
2. **Dado** que ninguna sala o bloque cumple el stack, **entonces** la sección queda `ESCALADA` con motivo "software", indicando qué programa falta.

**RF:** RF-08 · **Prioridad:** M

#### HU-09 — Grupo en salas contiguas
**Como** docente de práctica con 40–60 alumnos, **quiero** que mis salas sean contiguas, **para** supervisar al grupo completo sin cambiar de piso.

**Criterios de aceptación**
1. **Dado** una sección de N alumnos en laboratorios de 20 PCs sin fallas, **entonces** se asignan ⌈N/20⌉ salas contiguas entre sí.
2. **Dado** que hay PCs malogradas, **entonces** el número de salas es el mínimo cuya capacidad real sumada cubre a N.
3. Nunca se asigna un bloque con salas no contiguas o de distinto tipo.

**RF:** RF-09 · **Prioridad:** M

#### HU-10 — Secciones paralelas cercanas
**Como** docente que coordina evaluaciones con otras secciones del mismo curso, **quiero** que las secciones paralelas queden cerca, **para** tomar exámenes simultáneos y moverme entre ellas.

**Criterios de aceptación**
1. **Dado** dos candidatos igualmente válidos, **entonces** el motor elige el que está en el mismo piso que las secciones paralelas ya asignadas; si no, el piso adyacente.
2. La cercanía nunca justifica violar una regla dura.

**RF:** RF-11 · **Prioridad:** S

#### HU-11 — Reportar una incidencia
**Como** docente, **quiero** reportar un problema en un espacio asignado (equipo no operativo, software faltante u otro), **para** que Jefatura de Laboratorios lo atienda.

**Criterios de aceptación**
1. **Dado** una asignación vigente mía, **cuando** registro tipo, descripción y prioridad, **entonces** recibo un identificador de seguimiento.
2. Solo puedo reportar sobre espacios de mis propias asignaciones.

**RF:** RF-18 · **Prioridad:** S

#### HU-12 — Seguir el estado de mi incidencia
**Como** docente, **quiero** consultar el estado de mi incidencia con su identificador, **para** saber si ya fue atendida.

**Criterios de aceptación**
1. **Dado** un identificador válido, **entonces** veo el estado (`PENDIENTE`, `RESUELTA`, `DESCARTADA`) y la fecha del último cambio.

**RF:** RF-18 · **Prioridad:** S

### 3.3. Coordinación Académica

#### HU-13 — Importar datos maestros
**Como** coordinadora académica, **quiero** subir los CSV de cursos, secciones, horarios, matrículas y docentes, **para** no digitar la programación a mano.

**Criterios de aceptación**
1. **Dado** un CSV válido, **cuando** lo importo, **entonces** veo cuántas filas se crearon, actualizaron y rechazaron.
2. **Dado** filas con errores, **entonces** cada rechazo indica número de fila y motivo, y las filas válidas sí se procesan.
3. **Dado** que reimporto el mismo archivo, **entonces** no se duplica ningún registro (RNF-06).

**RF:** RF-01 · **Prioridad:** M

#### HU-14 — Cuentas creadas automáticamente
**Como** coordinadora académica, **quiero** que al importar alumnos y docentes se creen sus cuentas, **para** no darlas de alta una por una.

**Criterios de aceptación**
1. **Dado** un alumno o docente nuevo, **entonces** se crea su cuenta con clave provisoria y `debe_cambiar_clave = true`.
2. **Dado** un usuario que ya cambió su clave, **cuando** reimporto, **entonces** su clave no se modifica.

**RF:** RF-02 · **Prioridad:** M

#### HU-15 — Ejecutar la asignación del periodo
**Como** coordinadora académica, **quiero** ejecutar la asignación de todas las secciones en un solo paso, **para** obtener una propuesta completa y válida en minutos.

**Criterios de aceptación**
1. **Dado** un periodo con datos importados, **cuando** ejecuto la asignación batch, **entonces** cada sección termina `VIGENTE` o `ESCALADA`; ninguna queda sin estado.
2. Recibo un informe con totales de asignadas y escaladas, agrupables por motivo.
3. Ningún espacio queda con dos secciones en horarios solapados.

**RF:** RF-06, RF-05, RF-12 · **Prioridad:** M

#### HU-16 — Reasignar una sección puntual
**Como** coordinadora académica, **quiero** volver a ejecutar la asignación para una sola sección, **para** corregir casos puntuales sin rehacer todo el periodo.

**Criterios de aceptación**
1. **Dado** una sección, **cuando** ejecuto su asignación individual, **entonces** la asignación anterior pasa a `HISTORICA` y la nueva queda `VIGENTE` o `ESCALADA`.

**RF:** RF-05 · **Prioridad:** M

#### HU-17 — Resolver secciones escaladas
**Como** coordinadora académica, **quiero** ver las secciones escaladas con su motivo y asignarlas manualmente, **para** resolver los casos que el motor no pudo.

**Criterios de aceptación**
1. **Dado** una sección escalada, **entonces** veo la regla que falló (capacidad, software, contigüidad o disponibilidad).
2. **Cuando** elijo espacios manualmente, **entonces** el sistema valida las reglas duras antes de confirmar y rechaza la asignación si alguna falla.

**RF:** RF-13, RF-14 · **Prioridad:** M

#### HU-18 — Gestionar espacios y contigüidad
**Como** coordinadora académica, **quiero** registrar aulas y laboratorios con su piso, aforo y salas contiguas, **para** que el motor trabaje con la infraestructura real.

**Criterios de aceptación**
1. **Dado** dos espacios de distinto tipo, **cuando** intento marcarlos como contiguos, **entonces** el sistema lo rechaza.
2. Al marcar A contiguo a B, B queda contiguo a A.

**RF:** RF-04 · **Prioridad:** M

#### HU-19 — Restablecer una cuenta
**Como** coordinadora académica, **quiero** restablecer la clave de un usuario que la olvidó, **para** que recupere el acceso.

**Criterios de aceptación**
1. **Dado** una cuenta, **cuando** la restablezco, **entonces** se genera una clave provisoria y `debe_cambiar_clave` vuelve a `true`.

**RF:** RF-24 · **Prioridad:** S

#### HU-20 — Ver la ocupación por piso
**Como** coordinadora académica, **quiero** un mapa de ocupación por pabellón y piso, **para** detectar espacios saturados o subutilizados.

**Criterios de aceptación**
1. **Dado** un día y franja horaria, **entonces** veo en el plano qué espacios están ocupados, libres o con alerta pendiente.

**RF:** RF-22 · **Prioridad:** S

#### HU-21 — Auditar decisiones del motor
**Como** coordinadora académica, **quiero** consultar el registro de asignaciones, escalamientos y alertas, **para** justificar cualquier decisión ante un reclamo.

**Criterios de aceptación**
1. Cada evento registra tipo, fecha y hora, y la asignación o alerta relacionada (RNF-07).
2. Los registros no se pueden editar ni borrar desde la aplicación.

**RF:** RF-23 · **Prioridad:** M

### 3.4. Jefatura de Laboratorios

#### HU-22 — Registrar PCs malogradas
**Como** jefe de laboratorios, **quiero** actualizar cuántas PCs no operativas tiene cada sala, **para** que la capacidad real sea la verdadera.

**Criterios de aceptación**
1. Solo puedo editar laboratorios bajo mi responsabilidad.
2. **Dado** que ingreso más PCs malogradas que el aforo, **entonces** el sistema lo rechaza.
3. El cambio queda en el historial con valor anterior, valor nuevo, fecha y autor.

**RF:** RF-19, RF-07 · **Prioridad:** M

#### HU-23 — Actualizar software instalado
**Como** jefe de laboratorios, **quiero** actualizar la lista de software de cada sala, **para** que el motor use la matriz de software real.

**Criterios de aceptación**
1. Solo puedo editar laboratorios bajo mi responsabilidad.
2. El cambio queda en el historial con valor anterior, valor nuevo, fecha y autor.

**RF:** RF-19 · **Prioridad:** M

#### HU-24 — Enterarme cuando un cambio afecta clases
**Como** jefe de laboratorios, **quiero** recibir una alerta si un cambio de PCs o software deja una asignación vigente sin capacidad o sin software, **para** actuar antes de la clase.

**Criterios de aceptación**
1. **Dado** una sala con asignación vigente, **cuando** registro PCs malogradas que dejan la capacidad del bloque por debajo de los matriculados, **entonces** se genera una alerta `CAPACIDAD` vinculada a esa asignación.
2. **Dado** que retiro un software requerido por una sección vigente, **entonces** se genera una alerta `SOFTWARE`.
3. Un cambio que no afecta a ninguna asignación vigente no genera alerta.

**RF:** RF-20 · **Prioridad:** M

#### HU-25 — Atender alertas e incidencias
**Como** jefe de laboratorios, **quiero** marcar alertas como resueltas y resolver o descartar incidencias, **para** mantener la bandeja limpia y el docente informado.

**Criterios de aceptación**
1. **Dado** una alerta pendiente, **cuando** la marco como resuelta, **entonces** cambia de estado y se registra la fecha.
2. **Dado** una incidencia, **cuando** la resuelvo o descarto, **entonces** el docente ve el nuevo estado con su identificador.

**RF:** RF-21 · **Prioridad:** S

#### HU-26 — Ver el estado del parque informático
**Como** jefe de laboratorios, **quiero** ver la ocupación de los laboratorios y sus alertas pendientes en el plano, **para** priorizar mantenimiento.

**Criterios de aceptación**
1. Veo en el plano cada laboratorio con su ocupación y alertas pendientes.

**RF:** RF-22 · **Prioridad:** S

---

## 4. Matriz de Trazabilidad RF → HU

Cada RF de `02_requisitos.md` tiene al menos una historia de origen.

| RF | Descripción corta | Historias |
| :--- | :--- | :--- |
| RF-01 | Importación CSV de datos maestros | HU-13 |
| RF-02 | Cuentas idempotentes con clave provisoria | HU-14 |
| RF-03 | Autenticación JWT y cambio de clave | HU-06 |
| RF-04 | Gestión de espacios y contigüidad | HU-18 |
| RF-05 | Asignación individual | HU-15, HU-16 |
| RF-06 | Asignación batch con informe | HU-15 |
| RF-07 | Capacidad real | HU-22 |
| RF-08 | Validación de software | HU-08 |
| RF-09 | Bloque contiguo mínimo | HU-05, HU-09 |
| RF-10 | Accesibilidad (Piso 1 o cercanía al ascensor) | HU-04 |
| RF-11 | Cercanía entre paralelas | HU-10 |
| RF-12 | Sin doble reserva | HU-15 |
| RF-13 | Escalamiento con motivo | HU-17 |
| RF-14 | Asignación manual validada | HU-17 |
| RF-15 | Consulta por alumno o curso | HU-01, HU-02, HU-05 |
| RF-16 | Plano SVG con ubicación | HU-03, HU-04 |
| RF-17 | Portal docente | HU-07 |
| RF-18 | Incidencias con seguimiento | HU-11, HU-12 |
| RF-19 | Actualización de PCs y software con historial | HU-22, HU-23 |
| RF-20 | Alertas automáticas | HU-24 |
| RF-21 | Atención de alertas e incidencias | HU-25 |
| RF-22 | Mapa de ocupación | HU-20, HU-26 |
| RF-23 | Registro de auditoría | HU-21 |
| RF-24 | Restablecer cuenta | HU-19 |

**Cobertura:** 24 / 24 RF trazados · 26 historias · 4 actores.

---

## Control de Cambios

| Versión | Fecha | Autor | Descripción |
| :--- | :--- | :--- | :--- |
| 1.0.0 | 2026-09-23 | Grupo 6 | Versión inicial para la línea base funcional. |
