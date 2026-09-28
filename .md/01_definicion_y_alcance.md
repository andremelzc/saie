# Definición del Proyecto y Alcance
## SAIE — Sistema de Asignación Inteligente de Espacios
**Curso:** Automatización y Control de Software
**Versión:** 2.0 · **Fecha:** 19 de septiembre de 2026
**Nombre provisional:** "SAIE" es un nombre de trabajo, no el nombre final del producto.

---

## 1. Contexto y Problemática

La facultad presenta un edificio de 3 pisos donde coexisten aulas teóricas y laboratorios de cómputo. Ambos tipos de espacio tienen el **mismo nivel de importancia** dentro de este proyecto: la única diferencia estructural entre ellos es que los laboratorios cuentan con PCs (y por tanto con un stack de software instalable y un riesgo de PCs malogradas), mientras que las aulas teóricas no. Cada espacio (aula o laboratorio) tiene un **aforo propio** (no es un número fijo igual para todos), y en el caso de los laboratorios ese aforo nominal puede verse reducido en la práctica por PCs malogradas. El problema central identificado es:

- **Desconexión entre demanda y disponibilidad real:** hoy la asignación de espacios por curso no cruza la cantidad de alumnos matriculados con la capacidad *real* del espacio, y el registro de PCs malogradas vive aislado de ese proceso de asignación. Un laboratorio puede quedar asignado a un curso sin tener, en la práctica, suficientes PCs operativas para todos sus alumnos; un aula puede quedar asignada a un curso que excede su aforo.
- **Fraccionamiento ineficiente cuando un curso no cabe en un solo espacio:** cursos de 40 a 60 alumnos (teóricos o prácticos) suelen requerir más de un aula o laboratorio, y terminan asignados en espacios separados o en pisos distintos, impidiendo que el docente supervise a todo su grupo.
- **Incompatibilidad de software:** se asignan laboratorios que no cuentan con los programas o licencias que el docente necesita para su curso. (Este problema es exclusivo de laboratorios; no aplica a aulas teóricas, que no tienen PCs.)
- **Fricción en accesibilidad:** falta de priorización de espacios en pisos bajos para alumnos con movilidad reducida, tanto en aulas como en laboratorios.
- **Descoordinación entre secciones paralelas:** las secciones paralelas de un mismo curso suelen quedar en espacios alejados entre sí, dificultando la coordinación de evaluaciones y contenidos entre docentes.
- **Desinformación estudiantil:** los alumnos consultan su ubicación (de aula o de laboratorio) por canales informales o PDFs desactualizados.

**Nota de alcance real:** se identificó un problema adicional —choques de horario donde ningún aula o bloque de aulas disponible alcanza para un curso de alta capacidad en ese horario (p. ej. un curso de 50 alumnos con una sola aula disponible en ese horario)— que requeriría modificar la malla de horarios o un algoritmo de *timetabling* con reasignación en cascada. Esa reasignación de horarios **no es abordada por este proyecto** (ver sección 3, "Fuera de alcance"); el sistema sí asigna aulas y laboratorios sobre los horarios ya fijados, y si ningún espacio disponible cumple los criterios, escala el caso a revisión manual en lugar de forzar una asignación inválida o modificar horarios.

---

## 2. Objetivo del Proyecto

Automatizar la asignación de **espacios académicos** —aulas teóricas y laboratorios de cómputo, con el mismo nivel de importancia entre sí— mediante un motor de reglas único que garantice **capacidad real suficiente** (aforo nominal de cada espacio, descontando PCs malogradas cuando el espacio es un laboratorio), **contigüidad física**, **compatibilidad de software** (únicamente exigible en laboratorios), **criterios de accesibilidad** y **cercanía entre secciones paralelas de un mismo curso** — junto con un portal de consulta para estudiantes y un panel de alertas para Coordinación Académica — aplicando prácticas de automatización y control de calidad de software (pruebas unitarias/parametrizadas, pruebas de carga y pipeline CI/CD) como eje central del proyecto.

Estas cinco reglas (capacidad real, contigüidad, software, accesibilidad, cercanía entre secciones paralelas) se aplican todas sobre el mismo bloque candidato, ya sea de aulas o de laboratorios; ninguna reemplaza a las otras. La regla de software es la única condicional: se evalúa solo cuando el bloque candidato es de tipo laboratorio, y se considera automáticamente cumplida para bloques de aulas teóricas.

**Principio de diseño (ver sección 7):** la automatización que evalúa el curso es la de la *decisión* (el motor de reglas) y la del *control de calidad* (testing y CI/CD) — no la automatización de infraestructura. Por eso los triggers del sistema son acciones manuales puntuales (un clic) que disparan procesamiento 100% automático a partir de ahí.

---

## 3. Alcance (Scope)

### ✅ Incluido en el MVP

| Módulo | Descripción |
|---|---|
| **Carga de datos maestros** | Importación manual (botón, re-ejecutable) desde archivos CSV/JSON de **cursos, secciones, horarios y matrículas** (con flag de movilidad reducida, el tipo de espacio requerido por sección —aula teórica o laboratorio— y el stack de software requerido cuando corresponda a laboratorio). No incluye datos de espacios físicos. |
| **Gestión de espacios — aulas y laboratorios (dato vivo del sistema)** | Los espacios (pabellón, piso, aforo nominal, contigüidad con otros espacios del mismo tipo, tipo de espacio) se registran y mantienen dentro del propio sistema, no vía importación masiva. Los laboratorios además llevan software instalado y PCs malogradas; las aulas teóricas no tienen esos dos campos, ya que no cuentan con PCs. |
| **Asignación de espacios (aulas y laboratorios)** | Motor de reglas único que calcula la capacidad real de cada espacio candidato (aforo nominal − PCs malogradas si es laboratorio; aforo nominal íntegro si es aula), calcula disponibilidad por horario, valida contigüidad estricta dentro de un mismo tipo de espacio (un bloque no mezcla aulas con laboratorios), verifica matriz de software requerida por el docente (solo si el bloque es de laboratorios), prioriza Piso 1 para alumnos con movilidad reducida, y prioriza cercanía entre las secciones paralelas de un mismo curso. El bloque de espacios necesario no tiene un tamaño fijo: se expande hasta que la suma de capacidad real cubra a los N alumnos matriculados. |
| **Consulta del estudiante** | Portal web/móvil donde el alumno ingresa su código o el del curso y visualiza: tipo de espacio, pabellón, piso, número(s) de aula o laboratorio, horario y docente. Incluye también horario semanal completo, listado de cursos matriculados, perfil con datos personales y ficha médica, mapa de ocupación en modo lectura, y ruta de referencia hacia el espacio asignado. |
| **Panel de alertas (Coordinación Académica / Jefatura de Laboratorios)** | Registro manual de cambios de software y de estado operativo de PCs por laboratorio (no aplica a aulas teóricas), que dispara automáticamente la detección de incompatibilidades (de software o de capacidad) y la lista de alertas. Jefatura de Laboratorios tiene una vista propia acotada a los laboratorios bajo su responsabilidad. |
| **Mapa visual de ocupación por piso** | Vista interactiva por piso: cada espacio (aula o laboratorio) se ve coloreado según su estado (disponible / ocupado / con alerta activa). Al hacer click sobre un espacio se abre su detalle: curso y docente asignados en ese momento, horario, y alertas activas si las tiene. Se reutiliza en modo lectura en el portal del alumno. Además de la vista 2D, ofrece una vista 3D navegable como alternativa (una maqueta construida con los mismos planos SVG por piso); el mapa 2D es la vista por defecto y el respaldo. |
| **Gestión de espacios con campos acotados por rol** | Alta/edición de aulas y laboratorios desde el panel administrativo. Coordinación Académica edita todos los campos de cualquier espacio; Jefatura de Laboratorios edita únicamente los campos de los laboratorios bajo su cargo (PCs, software), sin poder cambiar el pabellón. |
| **Portal del Docente** | Portal propio con login (cuenta creada por Coordinación Académica, sin autorregistro), donde el docente consulta su horario y asignaciones activas, explora disponibilidad de espacios, revisa el estado de equipos de su próximo laboratorio, y reporta incidencias sobre el espacio asignado. |
| **Revisión de incidencias reportadas** | Jefatura de Laboratorios revisa las incidencias reportadas por los docentes, con el detalle técnico del espacio asociado, y las resuelve o descarta. |
| **Auditoría / trazabilidad** | Registro con fecha y hora de cada asignación (incluidas las escaladas a revisión manual) y cada alerta generada, consultable para trazabilidad directamente en la tabla de auditoría (sin pantalla en el MVP). |
| **Datos iniciales y de demostración** | Script único y repetible que reconstruye la base con los espacios reales del edificio (con su contigüidad), las cuentas de sistema (Coordinación y Jefatura, con sus laboratorios) y datos maestros sintéticos de alumnos, docentes y matrículas, más un escenario de demostración y un conjunto de volumen para las pruebas de carga. |
| **Despliegue de demostración** | Sistema publicado en capas gratuitas (Vercel, Render y Supabase) con despliegue automático desde la rama principal, condicionado a los quality gates. Las limitaciones (arranque lento del backend, pausa de la base por inactividad) se documentan. |

### ❌ Fuera de alcance (y justificación)

| Elemento excluido | Justificación |
|---|---|
| **Reasignación de horarios / timetabling con reasignación en cascada** | Si ningún aula o bloque de aulas disponible en un horario dado alcanza para la matrícula de un curso, resolverlo modificando la malla de horarios (moviendo otras secciones para liberar espacio) es un problema de timetabling de complejidad NP-difícil, que excede el tiempo y objetivo del MVP. El sistema asigna espacios sobre horarios fijos y, si no hay bloque válido, escala a revisión manual — no reordena horarios. |
| **Inventario de hardware detallado (marca, modelo, especificaciones técnicas de cada PC)** | El MVP solo necesita saber cuántas PCs de un laboratorio están operativas vs. malogradas, no un inventario técnico completo. |
| **Reservas externas para eventos de terceros** | Fuera del caso de uso académico que motiva el proyecto. |
| **Integración en vivo con el sistema fuente de matrícula/horarios** | Se asume que esa información llega por archivo (CSV/JSON), no por API/webhook en tiempo real; ver sección 6 y supuestos en `02_requisitos.md`. |
| **Geolocalización indoor en tiempo real (GPS/beacons) para la ruta al aula** | La "ruta al aula" del portal del alumno se resuelve como una ruta de referencia estática, calculada en tres tramos (entrada del pabellón → piso → espacios del bloque asignado, ordenados con el grafo de contigüidad del Issue 2.3) y renderizada sobre planos fijos por piso/pabellón — no como posicionamiento en vivo del dispositivo del alumno, que requeriría infraestructura de beacons/BLE fuera del alcance y tiempo del MVP. |
| **Modelo 3D detallado (puertas, mobiliario, texturas)** | La vista 3D del mapa de ocupación es una maqueta extruida a partir de los planos SVG por piso, no un modelo arquitectónico. Modelar el edificio en detalle exige un trabajo de diseño 3D que excede el tiempo y el objetivo del MVP. |
| **Asignación manual de un espacio a una sección** | Las secciones escaladas se revisan corrigiendo los datos (por ejemplo, agregando un espacio o ajustando un aforo) y reintentando la asignación; el sistema no permite fijar a mano un espacio para una sección. |

---

## 4. Actores / Stakeholders

- **Estudiantes:** consultan su aula o laboratorio asignado, su horario semanal completo y sus cursos matriculados; los alumnos con movilidad reducida reciben ubicación priorizada en Piso 1. Tienen un perfil propio (datos personales, ficha médica) y acceso de solo lectura al mapa de ocupación y a una ruta de referencia hacia su espacio asignado. Inician sesión con una cuenta creada por Coordinación Académica (código + clave inicial); no se autorregistran.
- **Docentes de teoría:** su grupo queda garantizado en aulas contiguas con capacidad real suficiente, y sus secciones paralelas quedan ubicadas cerca entre sí cuando es posible. Tienen su propio portal (login, horario, asignaciones, exploración de espacios) y pueden reportar incidencias sobre el espacio asignado.
- **Docentes de laboratorio:** su grupo queda garantizado en laboratorios contiguos, con capacidad real suficiente, el software instalado, y sus secciones paralelas ubicadas cerca entre sí cuando es posible. Además de lo anterior, consultan el estado de equipos del laboratorio antes de su clase.
- **Coordinación Académica:** carga los datos maestros del periodo, da de alta y mantiene todos los espacios (aulas y laboratorios), dispara la corrida de asignación, recibe alertas automáticas sin depender de reclamos manuales, y **registra las cuentas de acceso de alumnos y docentes** (individual o masivamente) y **restablece sus contraseñas** si las olvidan — ninguno de los cuatro roles del sistema (alumno, docente, Coordinación, Jefatura) se autorregistra.
- **Jefatura de Laboratorios:** mantiene el software instalado y el estado operativo de PCs de los laboratorios bajo su responsabilidad, edita esos laboratorios con campos acotados (no puede cambiar el pabellón), recibe una vista de alertas propia filtrada a sus laboratorios, y revisa/resuelve las incidencias reportadas por los docentes.

**Nota sobre cuentas de acceso:** las cuentas de los 4 roles (alumno, docente, Coordinación Académica, Jefatura de Laboratorios) son creadas administrativamente, nunca por autorregistro del propio usuario. Alumnos y docentes se dan de alta desde el panel de Coordinación Académica, de forma individual o masiva (extendiendo los imports de matrícula/secciones). Coordinación y Jefatura se consideran cuentas de sistema provistas fuera de este flujo (no hay autorregistro para ningún rol administrativo tampoco). Toda cuenta nace con una clave inicial que el usuario debe cambiar en su primer ingreso.

---

## 5. Motor de Reglas (dentro del alcance)

El motor de reglas es **único** para ambos tipos de espacio (aula teórica o laboratorio); un `tipo` en el modelo de datos determina qué reglas aplican. Un bloque candidato nunca mezcla tipos de espacio: una sección que requiere aula se asigna solo contra aulas, y una que requiere laboratorio solo contra laboratorios.

| Regla | Condición |
|---|---|
| **Capacidad real** | Cada espacio tiene un aforo nominal propio (configurable). Si es laboratorio: capacidad real = aforo nominal − PCs malogradas vigentes. Si es aula teórica: capacidad real = aforo nominal (no hay PCs que descontar). Un bloque de espacios contiguos del mismo tipo es válido solo si la suma de sus capacidades reales cubre a los N alumnos matriculados. |
| Disponibilidad | Un espacio solo es candidato si no está ya asignado a otra sección con horario que se solapa |
| Contigüidad | Los espacios de un mismo bloque deben ser estrictamente contiguos (puerta con puerta, mismo pasillo) y del mismo tipo entre sí |
| Matriz de software | Solo aplica si el bloque es de laboratorios: el pool de laboratorios asignados debe tener preinstalado el stack requerido por el docente. Para bloques de aulas teóricas, este control se considera automáticamente cumplido. |
| Accesibilidad | Priorizar automáticamente el Piso 1 para alumnos con movilidad reducida, tanto en aulas como en laboratorios |
| **Cercanía entre secciones paralelas** | Cuando un curso tiene más de una sección paralela en el mismo periodo, priorizar bloques ubicados cerca (mismo piso o piso adyacente, pasillos próximos) de los bloques ya asignados a las otras secciones paralelas del curso, sin descartar un bloque válido solo por no lograr cercanía si no hay alternativa mejor disponible |

### Controles (gates) asociados
- **Control de capacidad real:** el bloque candidato se descarta o se amplía si la suma de capacidad real de sus espacios no alcanza para los N alumnos.
- **Control de disponibilidad:** descarta espacios ya ocupados por otra sección en un horario que se solapa; un espacio nunca se asigna dos veces en la misma franja. Se calcula al vuelo contra las asignaciones vigentes.
- **Control de contigüidad:** descarta el bloque si no está puerta con puerta o si mezcla tipos de espacio.
- **Control de compatibilidad de software:** rechaza y busca otro bloque si no cumple (solo cuando el bloque es de laboratorios; se omite para aulas).
- **Control de accesibilidad:** fuerza reordenar hacia Piso 1.
- **Control de cercanía entre secciones paralelas:** entre los bloques que ya cumplen los controles anteriores, prioriza el más cercano a las secciones paralelas del mismo curso; es un criterio de desempate/priorización, no un motivo de descarte por sí solo.
- **Control de excepción/alerta:** si ningún bloque cumple capacidad, disponibilidad, contigüidad y (cuando aplica) software, no asigna y escala al panel.

---

## 6. Procesos dentro del MVP

**0. Carga de datos maestros** *(trigger: botón manual de importación, re-ejecutable sin duplicar registros)*
Coordinación Académica sube el archivo CSV/JSON con cursos, secciones, horarios y matrículas (con flag de movilidad reducida, el tipo de espacio requerido por cada sección —aula teórica o laboratorio— y el stack de software requerido cuando corresponda a laboratorio). Los espacios físicos no forman parte de este import.

**0b. Gestión de espacios (aulas y laboratorios)** *(trigger: alta/edición manual y puntual, dentro del sistema)*
Coordinación Académica / Jefatura de Laboratorios da de alta cada espacio con su tipo (aula teórica o laboratorio), pabellón, piso, aforo nominal y contigüidad con otros espacios del mismo tipo. El software instalado y el estado operativo de PCs (exclusivos de laboratorios) se mantienen mediante los Procesos 3 y 4.

**1. Asignación de espacio** *(trigger: encadenado al final de una importación exitosa, o manual bajo demanda desde el panel de Coordinación)*
Dos modos, sobre la misma orquestación del motor, aplicados por igual a secciones que requieren aula teórica o laboratorio:
- **Modo principal — corrida batch del periodo:** procesa todas las secciones del periodo (teóricas y prácticas) en un solo disparo, en orden determinista, y entrega un resumen (secciones asignadas vs. escaladas a revisión manual).
- **Modo secundario — por sección:** para altas tardías o cambios puntuales de matrícula.

Flujo interno: calcular disponibilidad para el horario → buscar bloque contiguo entre los espacios del tipo requerido que estén disponibles, expandiéndolo hasta cubrir la capacidad real requerida → control de software (solo si el bloque es de laboratorios) → control de accesibilidad → priorización por cercanía a las secciones paralelas del mismo curso ya asignadas → control de capacidad real final → persistir (confirmar) o escalar a revisión manual, registrando el evento para auditoría. Una sección escalada queda en estado ESCALADA, se lista en el panel con su motivo y se reevalúa en cada corrida.

**Re-ejecución (idempotencia):** volver a correr el proceso con los mismos datos da el mismo resultado. Si los datos de una sección (alumnos, movilidad reducida, horarios y stack requerido) no cambiaron desde su asignación, se mantiene la asignación vigente; si cambiaron, la anterior pasa a histórica y se calcula una nueva.

**2. Consulta del estudiante** *(trigger: bajo demanda, cada consulta del alumno)*
Código de alumno/curso → tipo de espacio → pabellón/piso → n.º de laboratorios → horario y docente.

**3. Alerta administrativa por software** *(trigger: manual y puntual — Jefatura de Laboratorios registra un cambio de software; exclusivo de laboratorios, no aplica a aulas teóricas)*
Jefatura registra que un laboratorio perdió o ganó software → dispara automáticamente: control de incompatibilidad sobre todas las asignaciones vigentes que usan ese laboratorio → generación de alerta (tipo "software") → la alerta queda visible en el panel de Coordinación Académica.

**4. Alerta administrativa por capacidad** *(trigger: manual y puntual — Jefatura de Laboratorios registra PCs malogradas o reparadas en un laboratorio, o Coordinación edita el aforo nominal de un aula o laboratorio)*
Jefatura registra que N PCs de un laboratorio pasaron a estar malogradas (o se repararon) → se recalcula la capacidad real de ese laboratorio → se revisan las asignaciones vigentes que lo usan → si alguna se queda sin capacidad suficiente, se genera una alerta (tipo "capacidad") → la alerta queda visible en el panel de Coordinación Académica. Usa el mismo panel y flujo que la alerta de software, diferenciada solo por el campo "tipo". El mismo mecanismo aplica si se edita manualmente el aforo nominal de un aula teórica y una asignación vigente queda con capacidad insuficiente.

**5. Consulta visual de ocupación por piso** *(trigger: bajo demanda, cada vez que Coordinación abre el mapa)*
Coordinación Académica visualiza, por piso, el estado de cada espacio —aula o laboratorio— (disponible / ocupado / con alerta activa) construido a partir de las asignaciones vigentes y las alertas de los Procesos 3/4. Al hacer click en un espacio se muestra su detalle: curso y docente asignados, horario, y alertas activas. La misma información se ofrece en una vista 3D opcional.

---

## 7. Conexión con Automatización y Control de Software

Este es el eje central del curso, y se aplica directamente sobre el motor de reglas del punto 5:

- **Pruebas unitarias y parametrizadas:** cubrir casos borde del cálculo de capacidad real (laboratorio sin PCs malogradas, laboratorio con todas sus PCs malogradas, aula teórica —sin descuento de PCs—, capacidad justo en el límite de N), disponibilidad, contigüidad (bloques que deben expandirse a 3+ espacios por aforo bajo, sin mezclar aulas con laboratorios), matriz de software (incluyendo que se omita automáticamente en bloques de aulas) y cercanía entre secciones paralelas.
- **Pruebas de estrés y concurrencia (k6):** simular el pico de tráfico del primer día de clases.
- **Pipeline CI/CD con Quality Gates:** GitHub Actions + SonarCloud, exigiendo cobertura de código ≥ 85%, 0 bugs críticos y bloqueo automático de despliegue ante fallos de lógica.

### Principio de diseño: automatización de decisión, no de infraestructura

Los triggers del sistema (carga de datos, ejecución de asignación, registro de cambio de software, registro de estado operativo de PCs) son acciones manuales puntuales — un botón, un clic — en vez de mecanismos automáticos de infraestructura. La automatización que el curso evalúa está en lo que ocurre después de ese único punto de intervención humana: el motor de reglas decide sin intervención, y el pipeline de calidad valida sin intervención.

---

## 8. Métricas de Éxito

- 100% de cumplimiento de requerimientos de software en laboratorios asignados.
- 0% de grupos (teóricos o prácticos) divididos en espacios no contiguos.
- 0 casos de asignación con capacidad real insuficiente para el número de alumnos matriculados, tanto en aulas como en laboratorios.
- 0 incidentes de accesibilidad para alumnos con movilidad reducida.
- 0 casos de doble reserva de un espacio en horarios que se solapan.
- Máxima proporción posible de secciones paralelas de un mismo curso ubicadas en espacios cercanos, dentro de las alternativas disponibles.
- Cobertura de pruebas ≥ 85%, 0 bugs críticos en el pipeline de CI/CD.

---

## 9. Tecnologías y despliegue

El stack acordado (TypeScript, Node.js con Express, Prisma, Zod, PostgreSQL en Supabase, React, TailwindCSS, Jest, Playwright, k6, GitHub Actions, SonarCloud, Vercel y Render) y la justificación de cada elección están en el Documento de Arquitectura. Este documento no lo repite, para evitar que ambos se desalineen.
