# Modelo de Reglas y Definición de Alcance - SAIE

> **Sistema de Asignación Inteligente de Espacios (SAIE)**  
> Universidad Nacional Mayor de San Marcos — Facultad de Ingeniería de Sistemas e Informática  
> Escuela Académica Profesional de Ingeniería de Software — Grupo 6 (2026)  
> **Issue de referencia:** #190 (6.2) · **Versión:** 1.0.0 · **Fecha:** 2026-09-23  
> **Línea base:** Funcional (ver [Plan de Línea Base](04_plan_linea_base.md))

---

## 1. Propósito

Este documento deja por escrito dos cosas que no deben depender de la memoria de nadie:

1. **El modelo de reglas** que aplica el motor de asignación: qué reglas existen, cuáles son obligatorias y cuáles son preferencias, y en qué orden se evalúan.
2. **El alcance del MVP**: qué entra, qué queda fuera y por qué.

Una vez congelado en la línea base funcional, cualquier cambio sigue el procedimiento de [`04_plan_linea_base.md`](04_plan_linea_base.md#5-procedimiento-de-control-de-cambios).

---

## 2. Modelo de Reglas del Motor

### 2.1. Tipos de regla

* **Regla dura (D):** restricción obligatoria. Un candidato que la incumple se descarta. Si ningún candidato cumple todas las reglas duras, la sección se escala.
* **Regla blanda (B):** preferencia. Solo ordena candidatos que ya cumplen todas las reglas duras. Nunca justifica violar una regla dura.

### 2.2. Catálogo de reglas

| ID | Tipo | Regla | Definición operativa | RF |
| :--- | :---: | :--- | :--- | :--- |
| **R-01** | D | Tipo homogéneo | Todos los espacios de una asignación tienen `Espacio.tipo == Sección.tipo_espacio_requerido`. | RF-05 |
| **R-02** | D | Disponibilidad horaria | Ningún espacio candidato tiene otra asignación `VIGENTE` cuyo horario se solape con **alguno** de los bloques de `Horario` de la sección (mismo día y rangos `[hora_inicio, hora_fin)` que se intersectan). Bloques consecutivos (uno termina 12:00 y otro empieza 12:00) no se solapan. | RF-12 |
| **R-03** | D | Capacidad real | `capacidad_real(aula) = aforo_nominal`; `capacidad_real(lab) = aforo_nominal − pcs_malogradas`. La suma de capacidades reales del bloque debe ser ≥ número de matriculados. | RF-07 |
| **R-04** | D | Fraccionamiento mínimo | Si ningún espacio individual cubre la demanda, se busca el bloque de **menor cantidad de espacios** que la cubra. Para laboratorios de 20 PCs sin fallas esto equivale a ⌈N/20⌉ salas; con PCs malogradas puede requerir más. | RF-09 |
| **R-05** | D | Contigüidad estricta | Todo bloque de 2 o más espacios forma un camino conexo en el grafo `EspacioContiguo` ("puerta con puerta"). Solo hay contigüidad entre espacios del mismo tipo. | RF-09 |
| **R-06** | D | Compatibilidad de software | Solo para laboratorios: `stack_software_requerido ⊆ software_instalado` en **cada** sala del bloque. | RF-08 |
| **R-07** | B | Accesibilidad | Solo aplica si al menos una matrícula de la sección tiene `movilidad_reducida = true`. Es la preferencia de **mayor peso**: se elige primero un bloque en `piso = 1`; si no existe ninguno válido, se elige el bloque con **menor distancia al ascensor** (`Espacio.distancia_ascensor`). Nunca provoca escalamiento por sí sola. | RF-10 |
| **R-08** | B | Cercanía entre paralelas | Entre candidatos válidos, se prefiere el que está más cerca de secciones paralelas (mismo `curso_id` y `periodo`) ya asignadas: mismo piso > piso adyacente > otro piso. Sin paralelas asignadas, la regla es neutra. | RF-11 |
| **R-09** | B | Menor desperdicio | Ante empate en R-08, se prefiere el candidato con menor sobrante `Σ capacidad_real − matriculados`, para no ocupar un aula grande con un grupo pequeño. | RF-05 |
| **R-10** | D | Escalamiento explicable | Si ningún candidato cumple las reglas duras, la asignación queda `ESCALADA` y `motivo_escalamiento` indica la regla que eliminó a los últimos candidatos (ej. "R-06: ninguna sala con MATLAB"). | RF-13 |
| **R-11** | D | Una asignación activa | Una sección tiene como máximo una asignación `VIGENTE` o `ESCALADA`; la anterior pasa a `HISTORICA` al reasignar. | RF-05 |

### 2.3. Orden de evaluación (asignación individual)

```
Sección
  │
  ├─ 1. Filtro de pool .............. R-01 tipo homogéneo
  ├─ 2. Filtro de disponibilidad .... R-02 sin solapamiento
  ├─ 3. Filtro de software .......... R-06 (solo laboratorios)
  │
  ├─ 4. ¿Algún espacio individual cumple R-03?
  │       ├─ Sí → candidatos individuales
  │       └─ No → búsqueda de bloque con R-04 + R-05 + R-03
  │
  ├─ 5. ¿Hay candidatos?
  │       ├─ No → R-10: ESCALADA con motivo
  │       └─ Sí → ordenar por R-07 (si hay movilidad reducida: Piso 1 primero,
  │               luego menor distancia al ascensor), luego R-08, luego R-09,
  │               luego identificador (desempate determinista)
  │
  └─ 6. Persistir primer candidato como VIGENTE (R-11) + registro de auditoría
        (si R-07 no logró Piso 1, el registro lo indica: "accesible vía ascensor")
```

Los filtros baratos (1–3) van primero para reducir el espacio de búsqueda antes de la búsqueda de bloques, que es la operación más costosa. El desempate final por identificador hace que el motor sea **determinista**: la misma entrada produce siempre la misma salida, lo que permite probarlo y cumplir RNF-06.

### 2.4. Orden de la asignación batch

En una corrida batch las secciones se procesan en este orden, porque las más restringidas deben elegir primero:

1. Secciones con al menos un alumno con movilidad reducida (compiten por el Piso 1).
2. Secciones de laboratorio con stack de software requerido (pool más pequeño).
3. Mayor número de matriculados primero (necesitan bloques más grandes).
4. Desempate por código de curso y código de sección.

### 2.5. Asignación manual (secciones escaladas)

Coordinación Académica puede elegir espacios a mano para una sección escalada. El sistema valida **todas las reglas duras** antes de confirmar; si alguna falla, rechaza la asignación e indica cuál. Las reglas blandas no se validan en la asignación manual, pero si la sección tiene alumnos con movilidad reducida y el espacio elegido no está en Piso 1, el sistema muestra una advertencia antes de confirmar.

---

## 3. Alcance del MVP

### 3.1. Dentro del MVP

| Funcionalidad | RF | Justificación |
| :--- | :--- | :--- |
| Importación CSV de datos maestros y creación de cuentas | RF-01, RF-02 | Sin datos reales el motor no tiene sobre qué decidir. |
| Autenticación por rol | RF-03, RF-24 | Los datos de matrícula y salud exigen control de acceso. |
| Gestión de espacios y contigüidad | RF-04 | La contigüidad es la base del fraccionamiento de laboratorios. |
| Asignación de aulas teóricas | RF-05, RF-12 | Alcance comprometido en la propuesta. |
| Asignación modular de laboratorios contiguos con validación de software | RF-07, RF-08, RF-09 | Resuelve los dolores 01 y 02 de la propuesta. |
| Regla de accesibilidad por piso y cercanía al ascensor | RF-10 | Resuelve el dolor 03; métrica de éxito "0 incidentes". |
| Cercanía entre secciones paralelas | RF-11 | Resuelve parte del dolor 04; es una preferencia de bajo costo sobre el mismo motor. |
| Asignación batch y escalamiento | RF-06, RF-13, RF-14 | Sin batch el sistema no reemplaza el proceso manual; sin escalamiento, el motor fallaría en silencio. |
| Consulta web/móvil para estudiantes y portal docente | RF-15, RF-16, RF-17 | Resuelve la desinformación (dolor 04). |
| Actualización de PCs y software con historial y alertas | RF-19, RF-20, RF-21 | Sin esto la matriz de software y la capacidad real quedan obsoletas a la segunda semana. |
| Incidencias docentes | RF-18 | Canal formal para los problemas que hoy llegan por mensajes informales. |
| Mapa de ocupación y auditoría | RF-22, RF-23 | Panel de control administrativo comprometido en la propuesta. |

### 3.2. Fuera del MVP

| Exclusión | Justificación |
| :--- | :--- |
| **Inventario de componentes de hardware interno de cada PC** (RAM, CPU, discos) | Al motor solo le importa si la PC funciona (`pcs_malogradas`). Un inventario detallado es otro sistema, con otro dueño (soporte técnico). |
| **Reservas externas para eventos de terceros** | Introduce solicitantes externos, aprobaciones y cobros que no forman parte del proceso académico que queremos resolver. |
| **Generación de horarios** | El SAIE asigna *espacios* a horarios ya definidos. Construir el horario es un problema de optimización distinto y lo hace hoy la facultad. |
| **Integración en tiempo real con el sistema de matrícula** | Principio de diseño *"automatización de decisión, no de infraestructura"*: los datos entran por importación CSV disparada por Coordinación. Una integración en vivo depende de accesos institucionales que el equipo no controla. |
| **Reserva o cambio de aula por parte de estudiantes o docentes** | Los estudiantes y docentes consultan y reportan; solo Coordinación asigna. Permitir autoservicio rompería la validación centralizada de reglas. |
| **Navegación paso a paso (indoor)** | Se muestra el espacio en el plano SVG del piso. Un navegador guiado exige posicionamiento en interiores, fuera del alcance del curso. |
| **Aplicación móvil nativa** | Una web responsive cubre la consulta desde el móvil sin publicar en tiendas de aplicaciones. |
| **Notificaciones por correo o push** | Las alertas se muestran dentro del panel. El envío externo agrega infraestructura (servidor de correo, proveedor push) sin cambiar la decisión del motor. |
| **Optimización global exacta** (programación entera) | El motor usa una heurística determinista con orden de prioridad. Es explicable, fácil de probar y suficiente para el tamaño del edificio. |
| **Varias facultades o sedes** | El MVP modela un solo edificio de 3 pisos con ascensor. El modelo de datos (`pabellón`) permite crecer después sin rediseño. |

---

## 4. Decisiones de Alcance Registradas

| ID | Decisión | Alternativa descartada | Motivo |
| :--- | :--- | :--- | :--- |
| **D-01** | La accesibilidad (R-07) es la preferencia de mayor peso: Piso 1 primero; si no hay, el siguiente mejor espacio más cercano al ascensor. La sección no se escala por accesibilidad. | Tratarla como regla dura y escalar la sección si no hay Piso 1. | El edificio tiene ascensor, así que un piso alto cercano a él sigue siendo accesible. Escalar dejaría al alumno sin aula publicada hasta una revisión manual, lo que genera más fricción que asignarle un espacio cercano al ascensor. |
| **D-02** | Una sección recibe el **mismo bloque** para todas sus sesiones semanales. | Asignar un espacio distinto por cada bloque de horario. | Simplifica la consulta del estudiante ("tu aula es la 201") y el modelo (`Asignación` por sección). |
| **D-03** | La contigüidad se modela como pares explícitos (`EspacioContiguo`), no por numeración. | Deducir contigüidad de números consecutivos (201–202). | La numeración no garantiza que haya puerta entre salas; los pares los define Coordinación con el plano. |
| **D-04** | La consulta por código de alumno o curso es pública, pero solo devuelve datos de ubicación y horario. | Exigir inicio de sesión para toda consulta. | Reduce fricción el primer día de clases (RNF-01) sin exponer datos personales ni de salud (RNF-09). |
| **D-05** | El motor es determinista (desempate por identificador). | Desempate aleatorio. | Permite pruebas parametrizadas reproducibles e idempotencia (RNF-06). |

---

## Control de Cambios

| Versión | Fecha | Autor | Descripción |
| :--- | :--- | :--- | :--- |
| 1.0.0 | 2026-09-23 | Grupo 6 | Versión inicial para la línea base funcional. R-07 definida como preferencia de mayor peso (Piso 1, luego cercanía al ascensor). |
