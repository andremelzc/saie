# Documento de Arquitectura del Sistema (DA) - SAIE

> **Sistema de Asignación Inteligente de Espacios (SAIE)**  
> Universidad Nacional Mayor de San Marcos — Facultad de Ingeniería de Sistemas e Informática  
> Escuela Académica Profesional de Ingeniería de Software — Grupo 6 (2026)  
> *Autores:* Carrasco Flores, Gutiérrez Bendezú, Jimenez Vera, Medrano Ayma, Melendez Cava.

---

## 1. Introducción

### 1.1. Propósito y Versión
Este documento describe la arquitectura del sistema **SAIE**: sus componentes estructurales, flujo de datos, principios de diseño, decisiones técnicas clave, modelo de seguridad y triggers de proceso, integrando el principio rector de *"automatización de decisión, no de infraestructura"*.

### 1.2. Autoría y Responsabilidades
* **Backend y Motor de Asignación (BM):** Arquitectura general, motor de reglas pedagógicas y espaciales, orquestación, algoritmos de contigüidad y accesibilidad.
* **Backend e Integraciones (BI):** Gestión de datos vivos (espacios, laboratorios, historial versionado), endpoints administrativos, autenticación y control de acceso.

---

## 2. Principios de Diseño

### 2.1. Motor Único, No Dos Motores Paralelos
El motor de asignación es unificado para aulas teóricas y laboratorios. Se sustenta en una única entidad genérica `Espacio` con un discriminador `tipo`:
* Ciertas ramas se evalúan condicionalmente (p. ej. descuento de PCs malogradas y verificación de stack de software solo se ejecutan para `LABORATORIO`).
* Evita duplicidad de código en el algoritmo de búsqueda de bloque, el cálculo de disponibilidad, la contigüidad física y la orquestación.

### 2.2. Automatización de Decisión, No de Infraestructura
Los triggers del sistema (carga de archivos maestros, ejecución de asignación, actualización de PCs o software) son acciones puntuales disparadas por usuarios autorizados (un botón o acción administrativa en la interfaz), en vez de listeners automáticos o integraciones complejas en tiempo real.  
La automatización se concentra en lo que ocurre inmediatamente después de esa acción: el motor evalúa las reglas complejas y decide sin sesgo humano, y el pipeline de calidad verifica el sistema sin intervención manual.

---

## 3. Vista General de Componentes

### 3.1. Diagrama de Componentes de Alto Nivel

```
 +-----------------------------------------------------------------------+
 |                         Clientes Web (Frontend)                       |
 |  [Portal Alumno]      [Portal Docente]      [Panel Coordinación / Jef]|
 +-----------------------------------+-----------------------------------+
                                     |
                                HTTPS / REST (Axios + JWT)
                                     |
                                     v
 +-----------------------------------------------------------------------+
 |                           Backend API (Express)                       |
 |  +--------------------+  +--------------------+  +------------------+ |
 |  | Capa de Endpoints  |  | Autenticación JWT  |  | Validación (Zod) | |
 |  +---------+----------+  +---------+----------+  +--------+---------+ |
 |            |                       |                      |           |
 |  +---------v-----------------------v----------------------v---------+ |
 |  |                   Capa de Servicios y Negocio                     | |
 |  |  - Importación Masiva (CSV / JSON)                                | |
 |  |  - Detección de Alertas e Incidencias                            | |
 |  |  - Trazabilidad y Registro de Auditoría                          | |
 |  +---------------------------------+--------------------------------+ |
 |                                    |                                  |
 |  +---------------------------------v--------------------------------+ |
 |  |                     Motor de Reglas de Asignación                | |
 |  |  * Capacidad Real           * Disponibilidad Horaria             | |
 |  |  * Regla de Accesibilidad   * Búsqueda de Bloque Contiguo        | |
 |  |  * Compatibilidad Software  * Cercanía entre Paralelas           | |
 |  |  * Orquestación Individual  * Modo Batch & Escalamiento          | |
 |  +---------------------------------+--------------------------------+ |
 |                                    |                                  |
 |                                Prisma ORM                             |
 +------------------------------------+----------------------------------+
                                      |
                                      v
 +-----------------------------------------------------------------------+
 |                     Base de Datos PostgreSQL (Supabase)               |
 |   Espacios | Secciones | Matrículas | Cuentas | Asignaciones | Alertas|
 +-----------------------------------------------------------------------+
```

### 3.2. Responsabilidades por Componente

| Componente | Responsabilidad Principal |
| :--- | :--- |
| **Capa de Importación** | Ingesta y validación de archivos CSV/JSON de cursos, secciones, horarios, matrículas y docentes. Creación masiva e idempotente de cuentas de alumno y docente con clave inicial provisoria. |
| **Motor de Reglas de Asignación** | Núcleo de decisión: cálculo de capacidad real, disponibilidad temporal, validación de accesibilidad (movilidad reducida), búsqueda de bloques contiguos, stack de software, cercanía de secciones paralelas y escalamiento a revisión manual. |
| **Capa de API / Endpoints HTTP** | Exposición de servicios REST, protección de rutas mediante middlewares, serialización de DTOs y control de accesos basados en rol (RBAC). |
| **Autenticación (JWT)** | Emisión y verificación de tokens firmados para los 4 roles. Control del flag `debe_cambiar_clave`. |
| **Detección de Alertas e Incidencias** | Detección automática de discrepancias tras cambios de software o fallas de PCs en asignaciones vigentes; gestión del ciclo de vida de incidencias reportadas por docentes. |
| **Capa de Persistencia (Prisma)** | Mapeo objeto-relacional tipado estricto contra PostgreSQL, gestión de migraciones y constraints relacionales. |
| **Registro de Auditoría** | Registro inmutable de eventos críticos (asignaciones, escalamientos y alertas) para trazabilidad institucional. |
| **Clientes (Frontend SPA)** | Portal público de consulta del alumno, portal del docente (horarios, incidencias) y panel administrativo unificado (Coordinación y Jefatura) con planos interactivos SVG por piso. |

---

## 4. Tecnologías y Herramientas

### 4.1. Backend
* **Node.js (v24 LTS) + TypeScript:** Runtime de alto rendimiento y tipado estático compartido.
* **Express:** Framework HTTP robusto y flexible para la API REST.
* **PostgreSQL (Supabase / Docker local):** Motor relacional ACID. Utiliza pooler PgBouncer en producción y contenedor local en desarrollo.
* **Prisma ORM:** Mapeo tipado de entidades, migraciones declarativas y generación segura de tipos TypeScript.
* **Zod:** Validación estricta en tiempo de ejecución de payloads y archivos importados.
* **jsonwebtoken & bcrypt:** Autenticación stateless y hash seguro de contraseñas.
* **csv-parse:** Motor de streaming y parseo de archivos CSV masivos.

### 4.2. Frontend
* **React 19 + TypeScript + Vite:** SPA reactiva y modular con tipado estricto.
* **TailwindCSS:** Sistema de diseño utility-first alineado a la Guía de Estilos institucional.
* **React Router v7:** Gestión declarativa de rutas protegidas por roles.
* **Axios:** Cliente HTTP con interceptores para inyección de JWT y manejo unificado de errores.
* **Planos SVG Interactivos por Piso:** Visualización gráfica bidimensional por pabellón/piso donde cada aula/laboratorio se mapea con `Espacio.identificador`, indicando disponibilidad, alertas y accesibilidad.

### 4.3. Calidad y Pruebas
* **Jest + ts-jest:** Pruebas unitarias y suites parametrizadas de las funciones puras del motor de reglas.
* **Supertest:** Pruebas de integración de endpoints HTTP sin levantar servidor en red.
* **Playwright:** Automatización end-to-end (E2E) en navegadores reales (Chromium, Firefox, WebKit) con resoluciones desktop y mobile.
* **k6:** Pruebas de carga y estrés para validar concurrencia y tiempos de respuesta.
* **GitHub Actions & SonarCloud:** Integración continua, quality gates automáticos y análisis estático de código.

---

## 5. Modelo de Seguridad y Control de Acceso

### 5.1. Roles del Sistema
1. **ALUMNO:** Consulta de asignación de espacios por código de alumno o curso, visualización de rutas accesibles y plano interactivo del campus. Acceso restringido a su propia ficha médica.
2. **DOCENTE:** Visualización de horario institucional, espacios y laboratorios asignados, estado operativo de equipos y reporte de incidencias con identificador de seguimiento.
3. **COORDINACION_ACADEMICA:** Importación masiva de datos maestros, ejecución de asignaciones (individual y batch), revisión de secciones escaladas, alta/restablecimiento de cuentas.
4. **JEFATURA_LABORATORIOS:** Actualización del estado de PCs y software de laboratorios asignados, atención de alertas del sistema y resolución/descarte de incidencias reportadas.

### 5.2. Aislamiento de Datos Sensibles (RNF-09)
Los datos de salud y condiciones especiales del estudiante residen exclusivamente en la tabla [`FichaMédica`](modelo-datos.md#48-fichamédica). Los endpoints de consulta pública del estudiante jamás exponen esta información.

---

## 6. Flujo de Datos del Motor de Asignación

### 6.1. Asignación Individual (Camino Feliz y Escalamiento)
1. Recepción del identificador de la `Sección` y consulta de sus requerimientos (`tipo_espacio_requerido`, cupo matriculado, horarios, `stack_software_requerido` y flag de `movilidad_reducida`).
2. Filtrado de espacios candidatos según:
   * **Tipo homogéneo:** Solo aulas o solo laboratorios según requerimiento.
   * **Disponibilidad horaria:** Sin solapamiento temporal con otras asignaciones vigentes.
   * **Accesibilidad:** Si existe al menos un alumno con movilidad reducida, se priorizan espacios en Piso 1.
   * **Software:** (Solo para laboratorios) El espacio debe contener el stack requerido.
3. Evaluación de capacidad real:
   * Si un espacio individual cubre el aforo, se selecciona prioritariamente por cercanía a secciones paralelas.
   * Si se requiere mayor capacidad, se ejecuta la **búsqueda de bloque contiguo** (`EspacioContiguo`).
4. Si no se encuentra ningún bloque válido, la asignación cambia a estado `ESCALADA` con su respectivo `motivo_escalamiento`.
5. Si se encuentra bloque, se persiste la asignación en estado `VIGENTE` y se asocian los espacios en `AsignaciónEspacio`.

### 6.2. Asignación en Lote (Modo Batch)
Ordena las secciones del periodo aplicando heurísticas de optimización (secciones con alumnos con movilidad reducida primero, luego mayor demanda de aforo y requerimientos de software especializado) y ejecuta la orquestación individual generando un informe global de asignadas vs escaladas bajo un mismo `corrida_id`.

---

## 7. Triggers del Sistema

| Disparador (Trigger) | Tipo de Acción | Consecuencia Automatizada |
| :--- | :--- | :--- |
| **Importación de Datos Maestros** | Manual (Coordinación) | Validación Zod, persistencia idempotente y generación de cuentas base. |
| **Ejecución de Asignación (Batch/Ind.)**| Manual (Coordinación) | Ejecución integral del motor de reglas y registro de auditoría. |
| **Actualización de PCs Malogradas** | Manual (Jefatura) | Recálculo de capacidad real y emisión de alerta `CAPACIDAD` si afecta vigentes. |
| **Modificación de Software en Lab** | Manual (Jefatura) | Verificación de stacks de secciones vigentes y emisión de alerta `SOFTWARE`. |
| **Reporte de Incidencia Docente** | Manual (Docente) | Generación de ticket con seguimiento y notificación a Jefatura de Laboratorios. |
