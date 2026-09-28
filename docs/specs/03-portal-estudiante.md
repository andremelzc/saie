# Spec 03: Portal del Estudiante — Consulta, Horarios y Rutas

> **Épica:** `epic:portal-estudiante`  
> **Issues Cubiertos:** #3.1, #3.2, #3.3, #3.4, #3.5, #3.6, #3.7, #3.8, #3.9, #3.10, #3.11, #3.12, #3.13, #3.14, #3.15, #3.16, #3.17, #3.18, #3.19, #3.20, #3.21, #3.22, #3.23  
> **Roles:** FE, BI, QA  
> **Documentos de Referencia:** [`docs/modelo-datos.md`](../modelo-datos.md), [`docs/arquitectura.md`](../arquitectura.md)

---

## 1. Visión General del Módulo

El **Portal del Estudiante** es la interfaz web/móvil responsiva donde los alumnos autenticados o en búsqueda rápida consultan la ubicación de su aula/laboratorio, su horario semanal completo, lista de cursos matriculados, ficha personal/médica, mapa 2D de ocupación en modo lectura y la ruta de referencia hacia su espacio asignado.

---

## 2. Endpoints Backend y Servicios

### 2.1 Consulta por Alumno / Curso (#3.1, #3.2, #3.3, #3.4)
* `GET /api/v1/consulta/alumno/:codigoAlumno`
  * Devuelve la lista de asignaciones vigentes del estudiante (Curso, Sección, Pabellón, Piso, Números de Aula/Lab, Horario y Docente).
* `GET /api/v1/consulta/curso/:codigoCurso`
  * Devuelve la ubicación y docente asignado a cada sección de un curso.

### 2.2 Horario y Perfil del Alumno (#3.9, #3.10, #3.11, #3.12)
* `GET /api/v1/estudiante/horario` (Autenticado JWT)
  * Devuelve la grilla semanal completa de asignaciones (Lunes a Sábado, 08:00 a 22:00).
* `GET /api/v1/estudiante/cursos`
  * Lista de cursos matriculados del ciclo actual.
* `GET /api/v1/estudiante/perfil`
  * Datos personales, código, carrera y ficha médica (flag de movilidad reducida).

### 2.3 Mapa de Ocupación Estudiantil y Ruta de Referencia (#3.13, #3.14, #3.15)
* `GET /api/v1/estudiante/mapa-ocupacion?pabellon=A&piso=1`
  * Mapa en modo lectura (solo estado: libre / ocupado).
* `GET /api/v1/estudiante/ruta/:asignacionId`
  * Calcula la ruta estática de 3 tramos (Entrada Pabellón $\rightarrow$ Escalares/Elevador $\rightarrow$ Puerta del Espacio asignado).

---

## 3. Componentes UI (React + Tailwind CSS)

### 3.1 Componentes del Portal (#3.5, #3.6, #3.16, #3.17, #3.18, #3.19, #3.22)
* `FormularioBusqueda`: Campo de código de alumno o curso con autocompletado y validación rápida.
* `TarjetaResultado`: Card interactivo que muestra el aula/laboratorio asignado, tipo de espacio y badge de horario.
* `GridHorarioSemanal`: Vista de calendario interactivo con colores por curso.
* `VistaMapaRuta`: Renderizado del plano SVG con el trazado resaltado hacia el aula/laboratorio asignado.
* `LoginEstudiante`: Formulario de autenticación con código de alumno y clave inicial.

---

## 4. Pruebas y Criterios de Calidad (#3.8, #3.9, #5.8, #5.9)
* **WCAG 2.1 AA:** Accesibilidad por teclado, contraste alto de colores y atributos ARIA en `TarjetaResultado` y `GridHorarioSemanal`.
* **Pruebas de Carga (k6):** Los endpoints `GET /api/v1/consulta/...` son evaluados en el [Issue 5.8] bajo el escenario de pico del primer día de clases (300 VUs, $p95 < 2000\text{ ms}$).
* **Pruebas E2E (Playwright):** Cobertura del flujo feliz de login $\rightarrow$ búsqueda $\rightarrow$ horario $\rightarrow$ ver ruta ([Issue 5.9]).

---

## 5. Definition of Done (DoD)
- [ ] Responsive design optimizado para móviles (360px) y desktop (1920px).
- [ ] Integración completa de componentes React con los endpoints reales mediante Axios.
- [ ] 0 violaciones de accesibilidad grave en auditoría de `axe-core`.
