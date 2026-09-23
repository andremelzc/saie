# Documento de Requisitos (DR) - SAIE

> **Sistema de Asignación Inteligente de Espacios (SAIE)**  
> Universidad Nacional Mayor de San Marcos — Facultad de Ingeniería de Sistemas e Informática  
> Escuela Académica Profesional de Ingeniería de Software — Grupo 6 (2026)  
> **Issue de referencia:** #189 (6.1) · **Versión:** 1.0.0 · **Fecha:** 2026-09-23  
> **Línea base:** Funcional (ver [Plan de Línea Base](04_plan_linea_base.md))

---

## 1. Introducción

Este documento especifica los requisitos funcionales (RF) y no funcionales (RNF) del SAIE. Cada RF se origina en al menos una historia de usuario de [`01_historias_usuario.md`](01_historias_usuario.md); la matriz de trazabilidad completa está en la sección 4 de ese documento.

Las reglas de negocio que el motor aplica (R-01 a R-11) se definen en [`03_alcance_y_reglas.md`](03_alcance_y_reglas.md) y se referencian aquí sin repetirse.

### 1.1. Convenciones
* **Prioridad (MoSCoW):** `M` Must (imprescindible para el MVP), `S` Should (importante, no bloqueante), `C` Could (deseable si hay tiempo).
* **Actor:** `EST` Estudiante, `DOC` Docente, `COO` Coordinación Académica, `JEF` Jefatura de Laboratorios, `SIS` el propio sistema.

---

## 2. Requisitos Funcionales

### 2.1. Datos maestros y cuentas

| ID | Requisito | Actor | Prioridad |
| :--- | :--- | :---: | :---: |
| **RF-01** | El sistema debe permitir importar archivos CSV de cursos, secciones, horarios, matrículas y docentes, validando cada fila y devolviendo un reporte de filas aceptadas y rechazadas con el motivo del rechazo. | COO | M |
| **RF-02** | Al importar alumnos y docentes, el sistema debe crear sus cuentas con clave provisoria de forma idempotente: una reimportación no duplica cuentas ni sobrescribe claves ya cambiadas. | SIS | M |
| **RF-03** | El sistema debe autenticar a los usuarios de los 4 roles mediante JWT y obligar a cambiar la clave provisoria en el primer ingreso (`debe_cambiar_clave`). | Todos | M |
| **RF-04** | El sistema debe permitir registrar y editar espacios (identificador, tipo, pabellón, piso, aforo nominal) y sus relaciones de contigüidad física. | COO | M |
| **RF-24** | El sistema debe permitir a Coordinación Académica restablecer la clave de una cuenta, volviendo a marcarla con `debe_cambiar_clave = true`. | COO | S |

### 2.2. Motor de asignación

| ID | Requisito | Actor | Prioridad |
| :--- | :--- | :---: | :---: |
| **RF-05** | El sistema debe asignar espacios a una sección individual aplicando el modelo de reglas R-01 a R-11. | COO | M |
| **RF-06** | El sistema debe ejecutar la asignación en lote (batch) de todas las secciones de un periodo bajo un mismo `corrida_id` y generar un informe de secciones asignadas y escaladas. | COO | M |
| **RF-07** | El sistema debe calcular la capacidad real de cada espacio (R-03): aforo nominal para aulas; aforo nominal menos PCs malogradas para laboratorios. | SIS | M |
| **RF-08** | El sistema debe asignar a una sección de laboratorio solo salas cuyo software instalado contenga todo el stack requerido por la sección (R-06). | SIS | M |
| **RF-09** | Cuando un solo espacio no cubra la demanda, el sistema debe asignar el menor bloque de espacios estrictamente contiguos y del mismo tipo cuya capacidad real sumada cubra a los matriculados (R-04, R-05). | SIS | M |
| **RF-10** | Si una sección tiene al menos un matriculado con movilidad reducida, el sistema debe asignarle espacios en Piso 1; si no hay ninguno válido, el espacio válido más cercano al ascensor (R-07). | SIS | M |
| **RF-11** | Entre candidatos válidos, el sistema debe preferir los espacios más cercanos a los ya asignados a secciones paralelas del mismo curso (R-08). | SIS | S |
| **RF-12** | El sistema debe impedir que un espacio quede asignado a dos secciones con horarios solapados (R-02). | SIS | M |
| **RF-13** | Si ningún candidato cumple las reglas duras, el sistema debe marcar la asignación como `ESCALADA` e indicar el motivo concreto (R-10). | SIS | M |
| **RF-14** | El sistema debe permitir a Coordinación Académica revisar secciones escaladas y asignarlas manualmente, validando igualmente las reglas duras antes de confirmar. | COO | M |

### 2.3. Consulta y portales

| ID | Requisito | Actor | Prioridad |
| :--- | :--- | :---: | :---: |
| **RF-15** | El sistema debe permitir consultar, por código de alumno o código de curso, el tipo de espacio, pabellón, piso, aula o salas asignadas, horario y docente de cada sección. | EST | M |
| **RF-16** | El sistema debe mostrar el espacio asignado resaltado sobre el plano SVG del piso correspondiente e indicar si la ubicación es accesible. | EST | S |
| **RF-17** | El sistema debe mostrar al docente su horario, los espacios asignados a cada sección y el estado operativo (PCs disponibles, software) de sus laboratorios. | DOC | M |
| **RF-18** | El sistema debe permitir al docente reportar una incidencia sobre un espacio de su asignación y entregarle un identificador de seguimiento para consultar su estado. | DOC | S |

### 2.4. Operación de laboratorios y supervisión

| ID | Requisito | Actor | Prioridad |
| :--- | :--- | :---: | :---: |
| **RF-19** | El sistema debe permitir a Jefatura de Laboratorios actualizar las PCs malogradas y el software instalado de los laboratorios bajo su responsabilidad, conservando el historial de cada cambio. | JEF | M |
| **RF-20** | Tras un cambio de PCs o software, el sistema debe detectar las asignaciones vigentes afectadas y generar una alerta de tipo `CAPACIDAD` o `SOFTWARE`. | SIS | M |
| **RF-21** | El sistema debe permitir a Jefatura de Laboratorios marcar alertas como resueltas y resolver o descartar incidencias. | JEF | S |
| **RF-22** | El sistema debe mostrar un mapa de ocupación de aulas y laboratorios por pabellón y piso, con las alertas pendientes. | COO, JEF | S |
| **RF-23** | El sistema debe registrar de forma inmutable los eventos de asignación, escalamiento y alerta. | SIS | M |

> **Nota de numeración:** RF-24 se ubica en la sección 2.1 por afinidad temática; la numeración no implica orden de implementación.

---

## 3. Requisitos No Funcionales

| ID | Categoría | Requisito | Verificación |
| :--- | :--- | :--- | :--- |
| **RNF-01** | Rendimiento | La consulta del estudiante (RF-15) debe responder con latencia p95 < 2 000 ms bajo 300 usuarios concurrentes. | k6, escenario "pico primer día" (Plan Maestro de Pruebas §2) |
| **RNF-02** | Confiabilidad | La tasa de error bajo carga de pico debe ser < 1 %. | k6 |
| **RNF-03** | Usabilidad | El portal del estudiante debe ser usable desde móvil (ancho mínimo 360 px) sin instalar una app. | Playwright en viewport móvil |
| **RNF-04** | Seguridad | Las claves se almacenan con bcrypt; cada endpoint valida rol mediante JWT (RBAC). | Pruebas de integración |
| **RNF-05** | Calidad | Cobertura de código ≥ 85 % y 0 bugs críticos en SonarCloud como condición de merge. | Quality Gate CI |
| **RNF-06** | Consistencia | La importación y la asignación batch son idempotentes: repetirlas con la misma entrada no altera el resultado (`huella_entrada`). | Pruebas de integración |
| **RNF-07** | Trazabilidad | Toda asignación, escalamiento, alerta e incidencia registra fecha y hora de ocurrencia. | Revisión de modelo + pruebas |
| **RNF-08** | Explicabilidad | Toda asignación escalada indica la regla que no se pudo cumplir; ninguna sección queda sin estado. | Pruebas unitarias del motor |
| **RNF-09** | Privacidad | Los datos de salud del alumno residen solo en `FichaMédica` y ningún endpoint de consulta pública los expone. | Pruebas de integración de endpoints públicos |
| **RNF-10** | Mantenibilidad | Código en TypeScript estricto, con ESLint/Prettier y Conventional Commits verificados en CI. | Pipeline CI |

---

## Control de Cambios

| Versión | Fecha | Autor | Descripción |
| :--- | :--- | :--- | :--- |
| 1.0.0 | 2026-09-23 | Grupo 6 | Versión inicial para la línea base funcional. |
