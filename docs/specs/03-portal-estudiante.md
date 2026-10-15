# Spec 03: Portal del Estudiante — Consulta, Horarios y Rutas

> **Épica:** `epic:portal-estudiante`  
> **Issues Cubiertos:** #3.1, #3.2, #3.3, #3.4, #3.5, #3.6, #3.7, #3.8, #3.9, #3.10, #3.11, #3.12, #3.13, #3.14, #3.15, #3.16, #3.17, #3.18, #3.19, #3.20, #3.21, #3.22, #3.23, #3.24, #3.25, #3.26, #3.27, #3.28  
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
* `GET /api/v1/estudiante/mapa-ocupacion?pabellon=A&piso=1[&dia=LUNES&horaInicio=08:00&horaFin=10:00]` (Issue 3.13, rol `ALUMNO`)
  * Mapa en modo lectura: solo el estado de cada espacio del piso en la franja (sin franja, el momento actual en hora de Lima). Reutiliza `obtenerOcupacionPorPiso` (Issue 4.11, ver [Spec 04](04-panel-alertas-y-admin.md) §2.2) pero **no expone** curso, docente ni alertas.
  * `pabellon` y `piso` son obligatorios; `dia`, `horaInicio` y `horaFin` van juntos o ninguno (400 en otro caso).
  * Respuesta: `{ pabellon, piso, franja: { diaSemana, horaInicio, horaFin }, espacios: [{ id, identificador, tipo, estado: 'DISPONIBLE' | 'OCUPADO' }] }`. Un espacio con alerta se muestra según su asignación.
* `GET /api/v1/estudiante/ruta/:asignacionId`
  * Calcula la ruta estática de 3 tramos (Entrada Pabellón $\rightarrow$ Escalares/Elevador $\rightarrow$ Puerta del Espacio asignado).

### 2.4 Avisos por Telegram (#3.24, #3.25, #3.26, #3.27, #3.28)
Canal opcional y voluntario de avisos al alumno (decisión D-06). Contexto y secretos en [`arquitectura.md`](../arquitectura.md) §5.3, §5.4, §6.3 y §8.

* **Modelo (#3.24):** tabla `VinculacionTelegram` (`alumno_id` único, `chat_id` único, `activo`, `fecha_vinculacion`, `fecha_baja`, `fecha_ultimo_resumen`), con Row Level Security. Ver [`modelo-datos.md`](../modelo-datos.md) §4.19.
* **Bot de vinculación (#3.25):** `POST /api/v1/telegram/webhook` (sin JWT; lo autentica el encabezado `X-Telegram-Bot-Api-Secret-Token`).
  * `/start` o `/ayuda`: instrucciones. Un mensaje de dos palabras, `<código> <clave>`, vincula la cuenta; `/baja` la desactiva.
  * Credenciales inválidas: mensaje genérico, sin revelar si el código existe. Tras 5 fallos en 15 minutos el chat se bloquea 15 minutos.
  * El mensaje con la clave se borra del chat siempre. Solo atiende conversaciones privadas.
  * Un chat activo de otra cuenta no se pisa: el bot pide enviar `/baja` primero. Un alumno nunca tiene dos vinculaciones activas.
  * Siempre responde 200 tras validar el secreto (Telegram reintenta lo que no es 2xx); sin el secreto correcto, 401.
* **Aviso de cambio de aula (#3.26):** manejador de `asignacion.cambiada` ([Spec 02](02-motor-asignacion.md) §2.4). Mensaje con curso, sección, aula anterior, aula nueva y horario; **sin** datos de salud ni de movilidad reducida (RNF-11). Alumnos sin vinculación activa no reciben nada. Un 403 desactiva la vinculación; los errores transitorios se reintentan hasta 3 veces.
* **Resumen diario (#3.27):** `POST /api/v1/telegram/resumen-diario` con `Authorization: Bearer <RESUMEN_DIARIO_TOKEN>` (401 sin token, 403 incorrecto, 503 si no está configurado). Lo invoca `.github/workflows/resumen-diario.yml` (07:30 hora de Lima, lunes a sábado, y a mano con `workflow_dispatch`).
  * Envía a cada alumno vinculado con clases hoy (periodo vigente, día en hora de Lima) sus clases ordenadas por hora, con aula o "aula por confirmar". Quien no tiene clases no recibe nada.
  * Idempotente por vinculación y día. Respuesta: `{ destinatarios, enviados, sinClases, desactivados, fallidos }`.
* **Perfil del alumno (#3.28, pendiente):** `GET /api/v1/estudiante/telegram` (estado de la vinculación) y `DELETE /api/v1/estudiante/telegram` (baja), solo con JWT de rol `ALUMNO` y solo sobre la propia vinculación; más el apartado de Telegram en la pantalla de perfil (enlace `https://t.me/<TELEGRAM_BOT_USERNAME>` y pasos).

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
- [ ] Ningún mensaje de Telegram contiene datos de la ficha médica ni de movilidad reducida (RNF-11).
