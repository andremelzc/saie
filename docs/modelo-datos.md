# Documento de Modelo de Datos (DMD) - SAIE

> **Sistema de Asignación Inteligente de Espacios (SAIE)**  
> Universidad Nacional Mayor de San Marcos — Facultad de Ingeniería de Sistemas e Informática  
> Escuela Académica Profesional de Ingeniería de Software — Grupo 6 (2026)

---

## 1. Introducción

Este documento especifica el esquema de datos base del sistema SAIE. Define todas las entidades, campos, tipos, relaciones y restricciones necesarias para representar los espacios académicos (aulas teóricas y laboratorios), datos maestros importados (cursos, secciones, horarios, matrículas, docentes y alumnos), cuentas de usuario para los 4 roles de acceso, asignaciones de espacios, alertas automáticas, incidencias operativas, historial versionado de espacios y registros de auditoría.

---

## 2. Principios de Diseño del Modelo

1. **Modelo de Espacio Único (no dos jerarquías paralelas):**  
   No se dividen aulas y laboratorios en tablas distintas. Se define una entidad genérica `Espacio` con un campo `tipo` (`AULA_TEORICA` | `LABORATORIO`) que determina qué atributos y reglas aplican. Esto coincide directamente con el principio de motor de reglas único.
2. **Campos exclusivos de Laboratorio:**  
   `software_instalado` y `pcs_malogradas` solo aplican a `LABORATORIO`; para `AULA_TEORICA` son nulos.
3. **Aforo Nominal Individual:**  
   Propio de cada espacio, configurable individualmente y aplicable a ambos tipos de espacios.
4. **Contigüidad Homogénea:**  
   La relación de contigüidad física solo se permite entre espacios del mismo tipo (`Espacio.tipo`). Un bloque asignado nunca combina aulas con laboratorios.
5. **Versionado de Estados Físicos:**  
   Los cambios en `software_instalado` y `pcs_malogradas` no destruyen el valor anterior; quedan registrados históricamente en `HistorialEspacio`.
6. **Aislamiento de Datos Sensibles (RNF-09):**  
   Los datos médicos y de condición especial de los alumnos se aíslan en la entidad `FichaMédica` (relación 1:1 con `Alumno`), garantizando acceso restringido exclusivo y protegiendo la consulta pública.
7. **Unicidad e Idempotencia:**  
   Restricciones de unicidad rigurosas que permiten re-ejecutar importaciones masivas de datos maestros sin duplicar registros ni corromper contraseñas ya modificadas.

---

## 3. Diagrama Entidad-Relación Lógico

```
 [Cuenta] 1 <------- 0..1 [Alumno] 1 <------- 1 [FichaMédica]
    |                         ^
    | 1                       | 1
    |                         | N
    | 0..1                 [Matrícula] N --------> 1 [Sección] N -------> 1 [Curso]
 [Docente] <---------------------------------------------+     |
    |                                                          | 1
    | N                                                        | N
 [Incidencia] N ---------> 1 [Asignación] 1 <------------ [Horario]
    |                              |
    | N                            | 1..N
    |                        [AsignaciónEspacio]
    |                              | N
    v                              v 1
 [Espacio] 1 <-----------+---- [Espacio] 1 <------- N [Alerta]
    ^                    |         ^                     |
    | 1                  | 1       | 1                   | 1
 [EspacioContiguo]       |         |                     | N
 (espacio_a, espacio_b)  |  [HistorialEspacio]    [AlertaAsignaciónAfectada]
                         |                               |
                         +-------- 1..N [EspacioResponsable] (Jefatura)
```

---

## 4. Catálogo Detallado de Entidades

### 4.1. `Espacio`
Entidad central que modela aulas teóricas y laboratorios de la facultad. Corresponde a datos vivos gestionados administrativamente.

| Campo | Tipo | Nulable | Descripción / Regla de Negocio |
| :--- | :--- | :---: | :--- |
| `id` | UUID / PK | No | Identificador único del espacio. |
| `identificador` | VARCHAR(50) | No | Código o nombre visible (ej. "Aula 201", "Lab 03"). Coincide con id en planos SVG. |
| `tipo` | ENUM (`AULA_TEORICA`, `LABORATORIO`) | No | Determina comportamiento del motor y reglas aplicables. |
| `pabellón` | VARCHAR(50) | No | Ubicación del espacio dentro del campus (ej. "Antiguo", "Nuevo"). |
| `piso` | INT | No | Número de piso. Usado en la regla de accesibilidad (prioridad Piso 1). |
| `aforo_nominal` | INT | No | Capacidad máxima configurada para el espacio. |
| `software_instalado` | TEXT[] / JSONB | Sí | Lista de software disponible. Solo aplica si `tipo = LABORATORIO`. Versionable. |
| `pcs_malogradas` | INT | Sí | PCs no operativas. Solo aplica si `tipo = LABORATORIO`. Versionable (`pcs_malogradas <= aforo_nominal`). |

---

### 4.2. `EspacioContiguo`
Relación de contigüidad física entre dos espacios adyacentes del mismo tipo, para conformar bloques ampliados.

| Campo | Tipo | Nulable | Descripción / Regla de Negocio |
| :--- | :--- | :---: | :--- |
| `espacio_id_a` | UUID / FK | No | Referencia al primer espacio (`Espacio.id`). |
| `espacio_id_b` | UUID / FK | No | Referencia al segundo espacio (`Espacio.id`). |

> **Reglas:** Relación simétrica bidireccional (si existe A–B, existe B–A). `EspacioContiguo.espacio_id_a.tipo == EspacioContiguo.espacio_id_b.tipo`. Par único `(espacio_id_a, espacio_id_b)`.

---

### 4.3. `Curso`
Asignatura académica del plan de estudios. Dato maestro importado.

| Campo | Tipo | Nulable | Descripción / Regla de Negocio |
| :--- | :--- | :---: | :--- |
| `id` | UUID / PK | No | Identificador único del curso. |
| `código` | VARCHAR(20) | No | Código oficial del curso (UNIQUE, ej. "2020101"). Clave de búsqueda del estudiante. |
| `nombre` | VARCHAR(150) | No | Nombre de la asignatura. |

---

### 4.4. `Sección`
Instancia de dictado de un curso en un periodo lectivo determinado.

| Campo | Tipo | Nulable | Descripción / Regla de Negocio |
| :--- | :--- | :---: | :--- |
| `id` | UUID / PK | No | Identificador único de la sección. |
| `curso_id` | UUID / FK | No | Referencia a `Curso.id`. |
| `docente_id` | UUID / FK | Sí | Docente asignado para la sección (`Docente.id`). |
| `código_sección` | VARCHAR(10) | No | Identificador dentro del curso (ej. "1", "2"). |
| `periodo` | VARCHAR(10) | No | Periodo académico (ej. "2026-1"). |
| `tipo_espacio_requerido` | ENUM (`AULA_TEORICA`, `LABORATORIO`) | No | Pool de espacios requerido para el dictado. |
| `stack_software_requerido`| TEXT[] / JSONB | Sí | Software requerido si `tipo_espacio_requerido = LABORATORIO`. Nulo o ignorado para aulas teóricas. |

> **Restricción de unicidad:** Clave compuesta única `(curso_id, código_sección, periodo)`.  
> **Secciones paralelas:** Se determinan al vuelo agrupando por `(curso_id, periodo)`.

---

### 4.5. `Horario`
Bloques horarios en los que se imparte una sección durante la semana.

| Campo | Tipo | Nulable | Descripción / Regla de Negocio |
| :--- | :--- | :---: | :--- |
| `id` | UUID / PK | No | Identificador único del bloque de horario. |
| `sección_id` | UUID / FK | No | Referencia a `Sección.id`. |
| `día_semana` | ENUM / VARCHAR | No | Día de la sesión (`LUNES`, `MARTES`, etc.). |
| `hora_inicio` | TIME | No | Hora de inicio de la sesión. |
| `hora_fin` | TIME | No | Hora de culminación de la sesión. |

> **Restricción de unicidad:** `(sección_id, día_semana, hora_inicio)`. Utilizado para cálculo de solapamiento y prevención de doble reserva.

---

### 4.6. `Matrícula`
Inscripción de un alumno en una sección específica para un periodo lectivo.

| Campo | Tipo | Nulable | Descripción / Regla de Negocio |
| :--- | :--- | :---: | :--- |
| `id` | UUID / PK | No | Identificador único de la matrícula. |
| `alumno_id` | UUID / FK | No | Referencia a `Alumno.id`. |
| `sección_id` | UUID / FK | No | Referencia a `Sección.id`. |
| `movilidad_reducida` | BOOLEAN | No | Default `false`. Flag que activa la regla de accesibilidad (prioridad Piso 1). |

> **Restricción de unicidad:** Clave compuesta única `(alumno_id, sección_id)`.

---

### 4.7. `Alumno`
Datos personales e institucionales del estudiante.

| Campo | Tipo | Nulable | Descripción / Regla de Negocio |
| :--- | :--- | :---: | :--- |
| `id` | UUID / PK | No | Identificador único del alumno. |
| `código` | VARCHAR(20) | No | Código de matrícula (UNIQUE, ej. "22200101"). Clave de consulta pública. |
| `nombre` | VARCHAR(150) | No | Nombre completo del alumno. |
| `correo` | VARCHAR(120) | No | Correo de contacto institucional. |
| `dni` | VARCHAR(15) | Sí | Documento nacional de identidad. |
| `fecha_nacimiento`| DATE | Sí | Fecha de nacimiento. |
| `telefono` | VARCHAR(25) | Sí | Teléfono de contacto. |
| `direccion` | VARCHAR(255) | Sí | Dirección de residencia. |
| `cuenta_id` | UUID / FK | Sí | Referencia a `Cuenta.id` (UNIQUE). Nulo hasta que Coordinación Académica active la cuenta. |

---

### 4.8. `FichaMédica`
Información clínica y de condiciones especiales del alumno (relación 1:1, aislada para RNF-09).

| Campo | Tipo | Nulable | Descripción / Regla de Negocio |
| :--- | :--- | :---: | :--- |
| `alumno_id` | UUID / PK / FK | No | Clave primaria y foránea hacia `Alumno.id`. |
| `tipo_sangre` | VARCHAR(10) | Sí | Grupo y factor sanguíneo. Dato sensible. |
| `alergias` | TEXT | Sí | Alergias reportadas. Dato sensible. |
| `condición_especial` | TEXT | Sí | Diagnóstico o requerimiento específico de apoyo. Dato sensible. |
| `contacto_emergencia`| VARCHAR(150) | Sí | Nombre y teléfono de emergencia. Dato sensible. |

---

### 4.9. `Docente`
Planta docente de la facultad.

| Campo | Tipo | Nulable | Descripción / Regla de Negocio |
| :--- | :--- | :---: | :--- |
| `id` | UUID / PK | No | Identificador único del docente. |
| `código_docente` | VARCHAR(20) | No | Código institucional (UNIQUE). |
| `nombre` | VARCHAR(150) | No | Nombre completo del docente. |
| `correo_institucional` | VARCHAR(120) | No | Correo institucional (usuario de login). |
| `departamento` | VARCHAR(100) | No | Departamento académico al que pertenece. |
| `cuenta_id` | UUID / FK | Sí | Referencia a `Cuenta.id` (UNIQUE). Nulo hasta creación de credenciales. |

---

### 4.10. `Cuenta`
Gestión unificada de autenticación y credenciales de acceso para los 4 roles del sistema.

| Campo | Tipo | Nulable | Descripción / Regla de Negocio |
| :--- | :--- | :---: | :--- |
| `id` | UUID / PK | No | Identificador único de la cuenta. |
| `rol` | ENUM | No | `ALUMNO`, `DOCENTE`, `COORDINACION_ACADEMICA`, `JEFATURA_LABORATORIOS`. |
| `usuario_login` | VARCHAR(100) | No | Nombre de usuario o correo de login (UNIQUE). |
| `clave_hash` | VARCHAR(255) | No | Hash seguro con bcrypt de la contraseña. |
| `debe_cambiar_clave` | BOOLEAN | No | Default `true`. Si es `true`, el usuario solo puede cambiar contraseña. |
| `fecha_creación` | TIMESTAMP | No | Fecha y hora de creación de la cuenta. |

---

### 4.11. `Asignación`
Resultado de la decisión del motor de reglas para una sección determinada.

| Campo | Tipo | Nulable | Descripción / Regla de Negocio |
| :--- | :--- | :---: | :--- |
| `id` | UUID / PK | No | Identificador único de la asignación. |
| `sección_id` | UUID / FK | No | Sección asignada (`Sección.id`). |
| `estado` | ENUM | No | `VIGENTE` (activa), `ESCALADA` (sin bloque válido), `HISTORICA` (reemplazada). |
| `fecha_asignación` | TIMESTAMP | No | Momento en que se confirmó o escaló la asignación (RNF-07). |
| `motivo_escalamiento`| TEXT | Sí | Justificación técnica del escalamiento (solo si `estado = ESCALADA`). |
| `corrida_id` | VARCHAR(50) | Sí | Identificador de lote de la corrida batch para reportes. |
| `huella_entrada` | VARCHAR(64) | Sí | Hash resumen de los parámetros de entrada para verificar idempotencia. |

---

### 4.12. `AsignaciónEspacio`
Tabla puente N:N que asocia una asignación con el bloque de espacios contiguos seleccionados.

| Campo | Tipo | Nulable | Descripción / Regla de Negocio |
| :--- | :--- | :---: | :--- |
| `asignación_id` | UUID / FK | No | Referencia a `Asignación.id`. |
| `espacio_id` | UUID / FK | No | Referencia a `Espacio.id`. |

> **Regla:** Todos los espacios de una misma asignación deben ser del mismo `tipo`.

---

### 4.13. `Alerta`
Registro de alertas operativas disparadas por cambios en datos vivos de espacios asignados.

| Campo | Tipo | Nulable | Descripción / Regla de Negocio |
| :--- | :--- | :---: | :--- |
| `id` | UUID / PK | No | Identificador único de la alerta. |
| `tipo` | ENUM (`SOFTWARE`, `CAPACIDAD`) | No | Motivo que originó la alerta. |
| `espacio_id` | UUID / FK | No | Espacio o laboratorio afectado (`Espacio.id`). |
| `motivo` | TEXT | No | Explicación detallada de la discrepancia detectada. |
| `fecha_detección` | TIMESTAMP | No | Timestamp de detección (RNF-07). |
| `estado` | ENUM (`PENDIENTE`, `RESUELTA`) | No | Estado de atención de la alerta. |

---

### 4.14. `AlertaAsignaciónAfectada`
Tabla puente N:N entre alertas e incidencias sobre asignaciones vigentes.

| Campo | Tipo | Nulable | Descripción / Regla de Negocio |
| :--- | :--- | :---: | :--- |
| `alerta_id` | UUID / FK | No | Referencia a `Alerta.id`. |
| `asignación_id` | UUID / FK | No | Referencia a `Asignación.id`. |

---

### 4.15. `Incidencia`
Reportes manuales emitidos por docentes sobre incidencias en espacios o equipos durante sus clases.

| Campo | Tipo | Nulable | Descripción / Regla de Negocio |
| :--- | :--- | :---: | :--- |
| `id` | UUID / PK | No | Identificador único de la incidencia. |
| `docente_id` | UUID / FK | No | Docente que genera el reporte (`Docente.id`). |
| `asignación_id` | UUID / FK | No | Asignación activa sobre la que se reporta. |
| `espacio_id` | UUID / FK | No | Espacio físico específico dentro del bloque. |
| `tipo` | ENUM | No | `EQUIPO_NO_OPERATIVO`, `SOFTWARE_FALTANTE`, `OTRO`. |
| `descripción` | TEXT | No | Detalle del problema. |
| `prioridad` | ENUM (`BAJA`, `MEDIA`, `ALTA`)| No | Nivel de severidad asignado por el docente. |
| `evidencia` | VARCHAR(255) | Sí | Referencia a imagen o archivo adjunto. |
| `estado` | ENUM | No | `PENDIENTE`, `RESUELTA`, `DESCARTADA`. Gestionado por Jefatura. |
| `fecha_reporte` | TIMESTAMP | No | Fecha y hora del reporte. |
| `identificador_seguimiento`| VARCHAR(20) | No | Código público para consulta y seguimiento docente. |

---

### 4.16. `HistorialEspacio`
Trazabilidad y versionado de cambios sobre atributos operativos de laboratorios.

| Campo | Tipo | Nulable | Descripción / Regla de Negocio |
| :--- | :--- | :---: | :--- |
| `id` | UUID / PK | No | Identificador único del registro histórico. |
| `espacio_id` | UUID / FK | No | Laboratorio modificado (`Espacio.id`, tipo `LABORATORIO`). |
| `campo` | ENUM (`SOFTWARE`, `PCS_MALOGRADAS`) | No | Atributo modificado. |
| `valor_anterior` | TEXT | Sí | Valor previo a la modificación. |
| `valor_nuevo` | TEXT | No | Nuevo valor registrado en el sistema. |
| `fecha_cambio` | TIMESTAMP | No | Timestamp del cambio. |
| `cuenta_id` | UUID / FK | No | Cuenta de usuario que ejecutó la modificación. |

---

### 4.17. `EspacioResponsable`
Asignación de laboratorios a cuentas de Jefatura de Laboratorios para control de acceso acotado.

| Campo | Tipo | Nulable | Descripción / Regla de Negocio |
| :--- | :--- | :---: | :--- |
| `cuenta_id` | UUID / FK | No | Cuenta de rol `JEFATURA_LABORATORIOS`. |
| `espacio_id` | UUID / FK | No | Laboratorio bajo su responsabilidad (`Espacio.id`). |

---

### 4.18. `RegistroAuditoría`
Registro inmutable para trazabilidad de eventos críticos del motor y de seguridad.

| Campo | Tipo | Nulable | Descripción / Regla de Negocio |
| :--- | :--- | :---: | :--- |
| `id` | UUID / PK | No | Identificador único del evento. |
| `tipo_evento` | ENUM | No | `ASIGNACION`, `ESCALAMIENTO`, `ALERTA`. |
| `asignacion_id` | UUID / FK | Sí | Referencia a asignación (no nulo si aplica). |
| `alerta_id` | UUID / FK | Sí | Referencia a alerta (no nulo si aplica). |
| `detalle` | TEXT | No | Descripción contextual del evento. |
| `fecha_hora` | TIMESTAMP | No | Marca temporal inmutable. |

> **Restricción CHECK:** En `RegistroAuditoría`, exactamente uno entre `asignacion_id` y `alerta_id` debe ser no nulo según `tipo_evento`.

---

## 5. Reglas de Integridad y Restricciones del Negocio

1. **No doble reserva de un espacio:** Un espacio no puede tener dos asignaciones con estado `VIGENTE` cuyos horarios se solapen en día y rango temporal (`hora_inicio` – `hora_fin`).
2. **Capacidad Real de Laboratorio:** `capacidad_real = aforo_nominal - pcs_malogradas`. `pcs_malogradas <= aforo_nominal`.
3. **Capacidad Real de Aula Teórica:** `capacidad_real = aforo_nominal`.
4. **Regla de Accesibilidad:** Si una sección tiene al menos una matrícula con `movilidad_reducida = true`, el motor filtra candidatos priorizando espacios con `piso = 1` o infraestructura accesible.
5. **Máximo una Asignación Activa:** Una `Sección` solo puede tener una asignación en estado `VIGENTE` o `ESCALADA`; cualquier asignación previa debe pasar a `HISTORICA`.
6. **Contigüidad Homogénea:** `EspacioContiguo` solo vincula espacios del mismo tipo; un bloque candidato no mezcla aulas con laboratorios.
