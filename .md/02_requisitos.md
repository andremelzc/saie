# Documento de Requisitos
## SAIE — Sistema de Asignación Inteligente de Espacios

**Versión:** 2.0 · **Fecha:** 19 de septiembre de 2026

---

## 1. Introducción

Este documento especifica los requisitos funcionales y no funcionales del sistema, en base al alcance definido para el MVP (ver `01_definicion_y_alcance.md`) y a las historias de usuario del equipo. Cada requisito funcional se traza directamente a uno o más issues del backlog (`03_backlog_issues.md`).

---

## 2. Requisitos Funcionales

### Módulo: Motor de Asignación de Espacios (Aulas Teóricas y Laboratorios)

Este motor es único: aplica el mismo conjunto de funciones a ambos tipos de espacio, diferenciando comportamiento solo donde el tipo lo exige (capacidad real y matriz de software). Un bloque candidato nunca mezcla aulas con laboratorios.

**RF-01 — Cálculo de capacidad real de un espacio**
El sistema debe calcular la capacidad real de un espacio como su aforo nominal (propio de cada espacio, configurable). Si el espacio es un **laboratorio**, a ese aforo nominal se le restan las PCs reportadas como malogradas vigentes en ese laboratorio. Si el espacio es un **aula teórica**, la capacidad real es igual al aforo nominal (las aulas no tienen PCs que descontar).
*Trazabilidad: Issue 2.1.*

**RF-02 — Búsqueda de bloque contiguo con capacidad suficiente**
El sistema debe identificar, entre los espacios disponibles del tipo requerido por la sección (RF-13), un bloque de espacios físicamente contiguos (puerta con puerta, mismo pasillo) cuya suma de capacidad real (RF-01) sea suficiente para los N alumnos matriculados en el curso. El número de espacios del bloque se determina dinámicamente según la capacidad real disponible en cada espacio candidato. Un bloque nunca combina aulas teóricas con laboratorios: el tipo de espacio requerido lo determina la sección (según si es teórica o práctica).
*Trazabilidad: Issue 2.5 (usa Issues 2.1, 2.3 y 2.4).*

**RF-03 — Validación de matriz de software**
El sistema debe verificar que todos los laboratorios de un bloque candidato tengan preinstalado el stack de software requerido por el docente antes de confirmar la asignación. Si al menos uno no cumple, el bloque debe ser descartado. **Este requisito aplica únicamente cuando el bloque candidato es de laboratorios**; para bloques de aulas teóricas, el sistema considera este control automáticamente satisfecho y no lo evalúa.
*Trazabilidad: Issues 2.6 y 2.7.*

**RF-04 — Priorización de accesibilidad**
Cuando un grupo incluya alumnos con movilidad reducida, el sistema debe priorizar automáticamente bloques ubicados en el Piso 1 antes de evaluar otros pisos, tanto para aulas teóricas como para laboratorios.
*Trazabilidad: Issues 2.8 y 2.9.*

**RF-20 — Priorización de cercanía entre secciones paralelas de un mismo curso**
Cuando un curso tenga más de una sección paralela programada en el mismo periodo, el sistema debe priorizar, entre los bloques candidatos que ya cumplan capacidad real, disponibilidad, contigüidad y (si aplica) software, el bloque más cercano (mismo piso o piso adyacente) a los espacios ya asignados a las otras secciones paralelas del curso. Esta priorización es un criterio de desempate: no descarta un bloque válido si no existe una alternativa más cercana disponible. Aplica por igual a secciones que requieren aula teórica y a secciones que requieren laboratorio.
*Trazabilidad: Issues 2.13 y 2.14 (usa Issue 2.5).*

**RF-05 — Escalamiento ante asignación imposible**
Si ningún bloque disponible cumple simultáneamente los criterios de capacidad real, contigüidad y software, el sistema no debe forzar una asignación inválida: debe marcar el caso como "requiere revisión manual" e informarlo a Coordinación Académica, con la lista de secciones escaladas y su motivo visible en el panel.
*Trazabilidad: Issues 2.12 y 4.22.*

**RF-06 — Idempotencia del proceso de asignación**
Ejecutar el proceso de asignación dos veces con los mismos datos de entrada debe producir el mismo resultado, tanto para una sección individual como para la corrida completa del periodo (RF-15). En concreto, una segunda corrida mantiene las asignaciones vigentes cuyos datos de entrada no cambiaron, y reemplaza solo las de secciones nuevas o modificadas (la anterior pasa a histórica).
*Trazabilidad: Issues 2.10 (individual) y 2.11 (corrida batch).*

**RF-13 — Carga de datos maestros**
El sistema debe permitir importar desde archivos fuente (CSV/JSON) los datos maestros: cursos, secciones, horarios y matrículas (incluyendo el flag de movilidad reducida, el tipo de espacio requerido por cada sección —aula teórica o laboratorio— y, cuando la sección requiera laboratorio, el stack de software requerido por sección). Este import no incluye datos de espacios físicos — esos se gestionan como dato vivo dentro del propio sistema (RF-16, RF-17). La importación debe validar la entrada y ser re-ejecutable sin duplicar registros. Trigger: botón manual de importación.
*Trazabilidad: Issues 1.3, 1.4 y 1.5.*

**RF-14 — Disponibilidad de espacios / no doble reserva**
El sistema debe considerar disponible un espacio (aula o laboratorio) para un horario dado solo si no está ya asignado a otra sección cuyo horario se solapa. El cálculo se hace al vuelo contra las asignaciones vigentes.
*Trazabilidad: Issue 2.4.*

**RF-15 — Corrida de asignación del periodo**
El sistema debe poder ejecutar la asignación para todas las secciones del periodo — teóricas y prácticas por igual — en una sola corrida, en un orden determinista, y entregar un resumen (secciones asignadas vs. escaladas a revisión manual). Trigger: encadenado al final de una importación exitosa (RF-13), o manual bajo demanda desde el panel de Coordinación Académica, para todo el periodo o para una sola sección (por ejemplo, para reintentar una sección escalada).
*Trazabilidad: Issues 2.11, 1.6 y 2.15.*

**RF-16 — Registro de cambios de software del laboratorio**
El sistema debe permitir a Coordinación Académica / Jefatura de Laboratorios registrar cambios en el software instalado de un laboratorio; este registro dispara la detección de incompatibilidades de software (RF-11). **Este requisito aplica únicamente a laboratorios**; las aulas teóricas no tienen software instalado. Trigger: manual y puntual.
*Trazabilidad: Issue 4.1.*

**RF-17 — Registro de estado operativo de PCs por laboratorio**
El sistema debe permitir a Jefatura de Laboratorios registrar cuántas PCs de un laboratorio están malogradas o han sido reparadas. Este registro actualiza la capacidad real del laboratorio (RF-01) y dispara la revisión de las asignaciones vigentes que lo usan (RF-18). **Este requisito aplica únicamente a laboratorios**, ya que las aulas teóricas no tienen PCs. Trigger: manual y puntual.
*Trazabilidad: Issue 4.2.*

**RF-18 — Generación de alerta por capacidad insuficiente**
El sistema debe generar automáticamente una alerta cuando una asignación vigente quede con capacidad real insuficiente para el número de alumnos matriculados del curso. Esto puede originarse por un cambio de estado operativo de PCs en un laboratorio (RF-17) o por una edición manual del aforo nominal de un aula teórica o laboratorio. Usa el mismo mecanismo de alerta que RF-11, diferenciada por un campo de tipo ("software" | "capacidad").
*Trazabilidad: Issues 4.4 y 4.5 (usa Issue 2.1 para el recálculo de capacidad).*

---

### Módulo: Consulta del Estudiante

**RF-07 — Consulta por código de alumno**
El sistema debe permitir a un estudiante consultar su ubicación asignada ingresando su código de alumno.
*Trazabilidad: Issues 3.1 y 3.2.*

**RF-08 — Consulta por código de curso**
El sistema debe permitir consultar la ubicación asignada ingresando el código de un curso.
*Trazabilidad: Issues 3.3 y 3.4.*

**RF-09 — Información mostrada en la consulta**
El resultado de la consulta debe incluir: tipo de espacio (aula teórica o laboratorio), pabellón, piso, identificador(es) del o los espacios asignados, horario y nombre del docente.
*Trazabilidad: Issues 3.6 y 3.7.*

**RF-10 — Manejo de código inexistente**
Si el código ingresado no existe, el sistema debe mostrar un mensaje claro al usuario, sin exponer errores técnicos internos.
*Trazabilidad: Issues 3.1, 3.2, 3.3, 3.4.*

**RF-21 — Horario semanal del alumno**
El sistema debe permitir a un estudiante consultar todas sus clases de la semana (no solo la consulta puntual de RF-07), con horario, curso, docente y espacio asignado para cada sesión, en vista de día y de semana.
*Trazabilidad: Issue 3.10.*

**RF-22 — Listado de cursos matriculados**
El sistema debe permitir a un estudiante ver la lista completa de los cursos en los que está matriculado en el periodo actual, con docente, horario y el próximo espacio asignado de cada uno, sin necesidad de buscar cada curso por su código.
*Trazabilidad: Issue 3.11.*

**RF-23 — Datos personales y ficha médica del alumno**
El sistema debe permitir a un estudiante consultar (y editar) sus datos personales, incluyendo una ficha médica básica (tipo de sangre, alergias, condición especial, contacto de emergencia). Este dato es sensible y se rige por RNF-09.
*Trazabilidad: Issue 3.12.*

**RF-24 — Mapa de ocupación de aulas visible para el alumno**
El sistema debe exponer al portal del alumno una vista de disponibilidad de espacios por piso y pabellón (disponible/ocupada), reutilizando el mapa de ocupación de Coordinación (RF-19) en modo de solo lectura y sin autenticación.
*Trazabilidad: Issue 3.13 (usa Issues 4.11, 4.12).*

**RF-25 — Ruta hacia el espacio asignado**
El sistema debe poder calcular y mostrar al alumno una ruta de referencia (entrada del pabellón → piso → espacios del bloque que se le asignó), junto con un tiempo estimado de caminata, usando el grafo de contigüidad (Issue 2.3) para ordenar los espacios del bloque, sin requerir geolocalización en tiempo real.
*Trazabilidad: Issues 3.14 y 3.15.*

**RF-33 — Autenticación del alumno**
El sistema debe permitir a un alumno autenticarse (código + clave) para acceder a sus vistas personales: horario completo, cursos matriculados, perfil, datos personales y ficha médica. La consulta puntual por código (RF-07/RF-08) sigue sin requerir autenticación, ya que expone solo la ubicación asignada, no datos personales.
*Trazabilidad: Issue 3.21 (extiende Issue 4.8).*

**RF-34 — Registro de alumnos por Coordinación Académica**
El sistema debe permitir a Coordinación Académica registrar alumnos y sus credenciales de acceso iniciales, tanto de forma individual (alta puntual) como masiva (extensión del import de matrículas, RF-13). El alumno **no se autorregistra**.
*Trazabilidad: Issues 1.7 y 4.17.*

---

### Módulo: Portal del Docente

**RF-26 — Autenticación de docentes**
El sistema debe permitir a un docente autenticarse con su correo institucional y contraseña, como rol de acceso (junto a alumno, Coordinación Académica y Jefatura de Laboratorios), extendiendo el mecanismo de autenticación de RNF-06. El docente **no se autorregistra**: su cuenta la crea Coordinación Académica (ver RF-35).
*Trazabilidad: Issue 7.1 (extiende Issue 4.8).*

**RF-27 — Horario y asignaciones activas del docente**
El sistema debe permitir a un docente consultar su horario (día y semana) y la lista de sus asignaciones activas (curso, sección, espacio, horario) para el periodo actual.
*Trazabilidad: Issue 7.2.*

**RF-28 — Exploración de disponibilidad de espacios (vista docente)**
El sistema debe permitir a un docente explorar y filtrar los espacios del campus (aula teórica o laboratorio) por pabellón, piso o capacidad, viendo su disponibilidad actual, reutilizando la función de disponibilidad de RF-14.
*Trazabilidad: Issue 7.3 (usa Issue 2.4).*

**RF-29 — Estado de equipos del laboratorio asignado**
El sistema debe permitir a un docente consultar el estado operativo de PCs y el software instalado del laboratorio de su próxima clase, antes de dictarla.
*Trazabilidad: Issue 7.4 (usa Issues 1.2, 2.1).*

**RF-30 — Reporte de incidencias por parte del docente**
El sistema debe permitir a un docente reportar una incidencia (equipo no operativo, software faltante, u otro) sobre el espacio que tiene asignado, indicando tipo, descripción y prioridad, y debe confirmar el envío con un identificador de seguimiento.
*Trazabilidad: Issue 7.5.*

**RF-31 — Revisión y resolución de incidencias reportadas**
El sistema debe permitir a Jefatura de Laboratorios revisar las incidencias reportadas por los docentes, ver el detalle técnico asociado al espacio (aforo, PCs inoperativas, software instalado) y resolverlas o descartarlas.
*Trazabilidad: Issue 7.6.*

**RF-32 — Gestión de espacios con campos acotados por rol**
El sistema debe permitir dar de alta y editar espacios (aulas y laboratorios) desde el panel administrativo, con Coordinación Académica viendo y editando todos los campos de cualquier tipo de espacio, y Jefatura de Laboratorios viendo y editando únicamente los campos de laboratorios bajo su responsabilidad (PCs, software), con el pabellón como campo no editable para Jefatura.
*Trazabilidad: Issue 4.15 (usa el modelo de datos del Issue 1.2).*

**RF-35 — Registro de docentes por Coordinación Académica**
El sistema debe permitir a Coordinación Académica registrar docentes y sus credenciales de acceso iniciales, tanto de forma individual (alta puntual) como masiva. El docente **no se autorregistra**.
*Trazabilidad: Issues 1.8 y 4.18.*

---

### Módulo: Cuentas y sesión (todos los roles)

**RF-36 — Cambio de contraseña**
El sistema debe permitir a cualquier usuario autenticado cambiar su contraseña verificando la actual. Las cuentas creadas administrativamente nacen con una clave inicial y deben reemplazarla en el primer ingreso: mientras no lo hagan, solo se permite esta operación.
*Trazabilidad: Issue 4.21 (extiende Issue 4.8).*

**RF-37 — Restablecimiento de contraseña por Coordinación Académica**
El sistema debe permitir a Coordinación Académica restablecer la clave de un alumno o docente a una clave inicial nueva, que el usuario deberá cambiar en su próximo ingreso. Las cuentas de Coordinación y Jefatura son cuentas de sistema y no se restablecen por esta vía.
*Trazabilidad: Issue 4.26 (usa Issue 4.21).*

**RF-38 — Inicio y cierre de sesión de los cuatro roles**
El sistema debe permitir a los cuatro roles (alumno, docente, Coordinación Académica y Jefatura de Laboratorios) iniciar y cerrar sesión, cerrar la sesión cuando el token vence y restringir cada vista según el rol del usuario.
*Trazabilidad: Issues 4.25, 3.22 y 7.7 (usan Issue 4.8).*

---

### Módulo: Panel de Alertas (Coordinación Académica)

**RF-11 — Generación de alerta por incompatibilidad de software**
El sistema debe generar automáticamente una alerta cuando un laboratorio deje de cumplir la matriz de software requerida para un curso ya asignado, indicando el laboratorio, el software faltante y los cursos/grupos afectados. **Este requisito aplica únicamente a laboratorios**; no existe una alerta equivalente de software para aulas teóricas.
*Trazabilidad: Issues 4.3 y 4.5.*

**RF-12 — Listado de alertas**
El sistema debe mostrar a Coordinación Académica una lista de alertas activas (de tipo software o capacidad), ordenadas por fecha, con la posibilidad de marcarlas como resueltas. Jefatura de Laboratorios ve la misma lista filtrada solo a los laboratorios bajo su responsabilidad.
*Trazabilidad: Issues 4.6, 4.7, 4.9, 4.10.*

**RF-19 — Mapa visual interactivo de ocupación por piso**
El sistema debe mostrar a Coordinación Académica un mapa por piso donde cada espacio (aula teórica o laboratorio) se visualice según su estado (disponible / ocupado / con alerta activa), distinguiendo visualmente el tipo de espacio. Al hacer click sobre un espacio debe abrirse su detalle: curso y docente asignados en ese momento, horario, y alertas activas si las tiene. Este mismo mapa se reutiliza, en versión de solo lectura y sin autenticación, en el portal del alumno (RF-24). Además de la vista 2D, el sistema ofrece una vista 3D navegable del mismo mapa (una maqueta construida con los mismos planos por piso), que el usuario activa con un botón; el mapa 2D es la vista por defecto y el respaldo, y una lista de espacios navegable con teclado ofrece el mismo detalle.
*Trazabilidad: Issues 4.11, 4.12, 4.13, 4.14, 4.23, 4.24 y 6.10.*

---

## 3. Requisitos No Funcionales

| ID | Requisito | Categoría | Trazabilidad |
|---|---|---|---|
| RNF-01 | El endpoint de consulta debe soportar el pico de tráfico simultáneo del primer día de clases sin degradar el tiempo de respuesta de forma crítica. | Rendimiento | Issue 5.8 |
| RNF-02 | La cobertura de pruebas del código debe ser ≥ 85%, verificada automáticamente en el pipeline de CI/CD. | Calidad | Issue 5.10b |
| RNF-03 | El pipeline de CI/CD debe bloquear automáticamente el despliegue si SonarCloud detecta bugs críticos. | Calidad | Issue 5.10b |
| RNF-04 | La interfaz del portal del estudiante, del portal del docente y del panel debe ser responsive. | Usabilidad | Issues 3.8 y 5.15 |
| RNF-05 | La interfaz debe cumplir criterios básicos de accesibilidad (contraste, tamaño de fuente). | Accesibilidad | Issues 3.9 y 5.15 |
| RNF-06 | El acceso al panel administrativo debe estar restringido a usuarios de Coordinación Académica y de Jefatura de Laboratorios, cada uno con sus permisos (autenticación requerida). | Seguridad | Issue 4.8 |
| RNF-07 | El sistema debe registrar (log) cada asignación realizada y cada alerta generada, con fecha y hora, para trazabilidad. | Auditoría | Issue 5.11 |
| RNF-08 | El código debe seguir un estándar de commits/branching documentado en el repositorio. | Mantenibilidad | Issue 1.1 |
| RNF-09 | Los datos de ficha médica del alumno (tipo de sangre, alergias, condición especial, contacto de emergencia) son información sensible: acceso restringido al propio alumno, nunca expuestos en la consulta pública (RF-07/RF-08). | Seguridad / Privacidad | Issue 3.12 |
| RNF-10 | Debe existir un script único que reconstruya la base con los espacios reales del edificio, las cuentas de sistema y datos sintéticos de demostración, de forma repetible. | Operación | Issue 5.17 |
| RNF-11 | El sistema debe desplegarse en un entorno de demostración (Vercel, Render y Supabase) de forma automática desde la rama principal, y solo después de pasar los quality gates. | Operación | Issues 1.10 y 5.10b |

---

## 4. Restricciones

- El sistema no puede modificar los horarios de los cursos; estos son un dato de entrada fijo. El sistema no resuelve conflictos de horario mediante reasignación/timetabling (ver `01_definicion_y_alcance.md`, sección "Fuera de alcance"); si ningún bloque de espacios cumple los criterios para el horario fijado, se escala a revisión manual.
- El stack tecnológico y su justificación están en el Documento de Arquitectura; los requisitos de este documento no dependen de una herramienta concreta.
- El aforo de cada espacio (aula o laboratorio) es propio de cada espacio y configurable — no existe un valor fijo único para todos.
- El software instalado y el estado operativo de PCs solo existen como conceptos para laboratorios; las aulas teóricas no los tienen.
- No hay integración en vivo con el sistema fuente: los datos de cursos entran únicamente por importación de archivos (RF-13); los datos de espacios (aulas y laboratorios) se gestionan dentro del sistema (RF-16, RF-17).

---

## 5. Supuestos

- Se asume que la información de matrícula, cursos, horarios, tipo de espacio requerido y requerimiento de software ya existe en un sistema fuente y se consume mediante importación de archivos CSV/JSON (RF-13); una integración en vivo queda fuera de alcance.
- Se asume que los datos de espacios físicos (aforo, contigüidad, software instalado, estado operativo de PCs) no vienen de ese mismo archivo — se dan de alta y se mantienen dentro del sistema. Para aulas teóricas, solo aplican aforo, pabellón, piso y contigüidad (no hay software ni PCs).
- Se asume que los horarios de las secciones son un dato de entrada fijo.
- Se asume que el flag de "movilidad reducida" está disponible en el registro de matrícula del alumno.
- Se asume que la disposición física de los espacios (aulas y laboratorios) es información conocida y estable durante el periodo académico.
- Se asume que Jefatura de Laboratorios reporta el estado operativo de PCs de forma razonablemente oportuna.
- Se asume que cada sección declara explícitamente si requiere aula teórica o laboratorio, y que este dato viene en la importación de secciones (RF-13).
- Se asume que los datos de personas usados en las pruebas y en la demostración (alumnos, docentes y matrículas) son sintéticos; usar datos reales requeriría el permiso de la facultad.
