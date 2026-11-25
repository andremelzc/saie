# Registro de Versiones (Changelog) — SAIE

> **Proyecto:** SAIE (Sistema de Asignación Inteligente de Espacios)  
> **Issue Vinculado:** [#196 - Issue 6.8](https://github.com/andremelzc/saie/issues/196)  
> **Estándar:** [Keep a Changelog 1.0.0](https://keepachangelog.com/es-ES/1.0.0/)

---

## [Sin publicar]
Sin cambios fusionados a `develop` después de la v1.12.0.

---

## [1.12.0] - 2026-11-25
**Hitos:** Sprint 5 — Estabilización (cierre) y Sprint 6 — Correcciones de la auditoría (abierto). **PR:** #398, #399, #404, #405, #406, #407, #441, #442, #443, #444, #445, #446, #447, #448.

### Añadido
- **Observabilidad (#398, Issue 1.15):** logger estructurado con `pino` (nivel por `LOG_LEVEL`) que reemplaza los `console.*` del backend; middleware `requestId` que devuelve `X-Request-Id` en cada respuesta y lo incluye en los errores 500; `GET /api/health` comprueba la base con `SELECT 1` y un tiempo máximo (`HEALTH_DB_TIMEOUT_MS`) y responde 503 si falla.
- **Auditoría estructurada (#398, Issue 4.48):** `RegistroAuditoria` gana `corridaId`, `espaciosIds`, `cuentaId`, `puntaje` y `origen`; `detalle` se conserva por compatibilidad.
- **Auditoría de acciones de personas (#407, Issue 4.58):** eventos `EDICION_ESPACIO`, `EDICION_SECCION` y `CAMBIO_LABORATORIO` con la cuenta que hizo el cambio y la lista `{ campo, anterior, nuevo }`, en la misma transacción y sin datos sensibles.
- **Registro de importaciones (#407, Issue 4.54):** cada carga de CSV queda registrada en el servidor (tipo, resultado, filas y cuenta), de modo que la última carga se ve igual en cualquier navegador.
- **Incidencias del docente (#404, Issue 7.14):** `GET /api/v1/docente/incidencias` y sección «Mis incidencias» con código, estado y respuesta de Jefatura (RF-18).
- **Gestión de periodos (#441, Issue 4.64):** tabla `Periodo` con estados *en preparación*, *vigente* y *cerrado*, y pantalla «Periodos» para que Coordinación registre, active y cierre el semestre. Las escrituras exigen un periodo abierto, y la consulta pública, las alertas y el mapa filtran por el vigente. Ya no depende de `PERIODO_VIGENTE`.
- **Reubicar secciones (#441, Issue 2.22):** el motor solo conserva una asignación si sus espacios siguen sirviendo; deshabilitar un espacio con clases genera una alerta y `POST /admin/alertas/:id/reubicar` mueve las secciones afectadas.
- **Alerta de accesibilidad (#441, Issue 3.59):** nueva alerta `ACCESIBILIDAD` cuando una sección con alumnos con movilidad reducida queda fuera del piso 1.
- **Importación en segundo plano (#441, Issues 1.18 y 1.19):** la carga detecta la codificación del CSV (UTF-8 o Windows-1252), rechaza filas con caracteres dañados, corre en segundo plano con avance visible y no admite dos cargas del mismo tipo a la vez.
- **Vista previa e inactivación de secciones (#445, Issue 1.17):** se puede revisar la importación antes de confirmarla, y las secciones que dejan de figurar en el CSV pasan a `activa = false` (no se borran, liberan su aula y no entran al motor). Las matrículas y los horarios reflejan los retiros y los cambios de hora.
- **Avisos a Jefatura (#442, Issue 4.60):** aviso inmediato por Telegram (`TELEGRAM_CHAT_JEFATURA`) de las incidencias de prioridad alta y de las alertas nuevas de software o capacidad, y las pendientes en el inicio de Jefatura.
- **Editar el horario de una sección (#446, Issue 4.62):** `PATCH /admin/secciones/:id` acepta `horarios`, valida las franjas, registra el cambio en la auditoría, reasigna con el motor y advierte el choque con otra sección del mismo docente.
- **Confirmación de la declaración de accesibilidad (#447, Issue 3.60):** la casilla del alumno crea una `SolicitudAccesibilidad` pendiente; Coordinación la aprueba o la rechaza (`GET /admin/accesibilidad`, `PATCH /admin/accesibilidad/:id/resolver`) antes de que cambie alguna matrícula.
- **Reorganizar con prioridad (#448, Issue 2.26):** al inicio del ciclo (`REORGANIZACION_SEMANAS`, 2 por defecto) la corrida puede procesar primero las secciones escaladas, con una simulación previa que no escribe nada y muestra qué cambiaría.
- **Pruebas E2E del marco del alumno (#405, Issue 5.27):** `tests/e2e/marco-estudiante.spec.ts` comprueba la cabecera persistente, la ausencia de desborde en móvil y la pestaña «Más».
- **Documentación de la auditoría final (#441):** `docs/guia_pruebas_por_rol.md` (casos de prueba por rol y flujos de escalamiento) y `docs/riesgos_y_brechas.md` (52 riesgos con su decisión, propuesta y criterio de aceptación).
- **Auditoría de UI/UX del portal docente (#399, Issue 7.13):** sección 10 de `docs/AUDITORIA_UI_UX.md` con 19 hallazgos, capturas y mediciones en `docs/auditoria-docente/`.
- **Informe de pruebas (#405, Issue 5.14):** `docs/informe_resumen_pruebas.md`.

### Cambiado
- **Motor de asignación (#441, Issue 2.21):** el desempate prioriza el aula con menor desperdicio de asientos; la cercanía con las otras secciones del curso solo decide entre bloques de tamaño parecido.
- **Importación todo o nada (#441, Issue 1.16):** `validarImportacion` revisa el archivo completo antes de escribir; con un solo error no se guarda ninguna fila. Avisa, sin bloquear, si un docente o un alumno quedaría con dos clases a la vez.
- **Periodos normalizados (#441):** «2026-II» pasa a «2026-2» y los formatos inválidos se rechazan en las importaciones y en el seed.
- **Horario y Telegram (#444, Issue 3.62):** teoría y laboratorio del mismo curso se agrupan bajo el curso y se rotulan «Teoría» o «Laboratorio».
- **Historial de software legible (#407, Issue 7.15):** «Cambios recientes» del laboratorio describe el cambio en una frase en lugar del JSON guardado.
- **Inicio de administración (#441, Issue 2.25):** las secciones sin horarios se muestran aparte como datos incompletos y no cuentan como «Esperan revisión».

### Corregido
- **Doble reserva en la corrida completa (#441, Issue 2.20):** las asignaciones conservadas se reservan antes de recorrer el lote y `detectarDobleReserva` aborta la corrida (409) si encontrara una.
- **Privacidad de la consulta pública (#441, Issue 3.63):** ya no lee la ficha médica y solo muestra el periodo vigente.
- **Movilidad reducida (#441):** reimportar matrículas ya no borra la condición declarada en la ficha del alumno.
- **Telegram (#441, Issue 3.64):** el bot descarta las actualizaciones repetidas (`update_id`).
- **Jefatura sin laboratorios (#441, Issue 4.59):** el seed y `npm run prisma:vincular-jefatura` vinculan a Jefatura con los laboratorios.
- **Nombres de curso mezclados (#443, Issue 1.20):** la importación rechaza un nombre con horas, `--` o el código de otro curso, y se corrige `202SW0302`.
- **Estado vacío con error (#406, Issue 7.16):** el explorador y las solicitudes del docente ya no muestran a la vez el error y el vacío.
- **Foco en la cabecera (#405, Issue 3.58):** el aro de foco del logo pasa a blanco sobre guinda (10,9:1).

### Base de datos
- `20261111000000_auditoria_estructurada`, `20261124000000_auditoria_acciones_personas`, `20261124000100_importaciones`, `20261125000000_alerta_accesibilidad`, `20261126000000_periodos`, `20261127000000_seccion_activa` y `20261128000000_solicitudes_accesibilidad`.

### Issues cerrados
1.15 (#368), 1.16 (#428), 1.17 (#429), 1.18 (#430), 1.19 (#431), 2.20 (#409), 2.21 (#410), 2.22 (#411), 2.25 (#414), 2.26 (#415), 3.58 (#403), 3.60 (#417), 3.62 (#419), 3.63 (#420), 3.64 (#421), 4.48 (#339), 4.54 (#345), 4.58 (#349), 4.59 (#422), 4.60 (#423), 4.62 (#425), 4.64 (#427), 5.14 (#187), 5.19 (#221), 5.27 (#371), 5.29 (#379), 5.31 (#434), 7.13 (#372), 7.14 (#400), 7.15 (#401), 7.16 (#402).

### Notas
- 1.20 (#432) sigue abierto: falta cargar `202SW0303 – Física Electrónica` desde la fuente oficial que se defina en 6.15 (#439).
- 3.59 (#416) sigue abierto: falta la distancia al ascensor de los espacios (R42).
- Las migraciones `alerta_accesibilidad` y `periodos` se aplicaron en Supabase el 2026-11-25.

---

## [1.11.0] - 2026-11-11
**Hitos:** Sprint 4 — Control, excepciones y validación (cerrado) y Sprint 5 — Estabilización. **PR:** #377, #378, #386, #387, #388, #389, #390, #391, #392, #393, #394, #395, #396.

### Añadido
- **Cambio de clave obligatorio (#377, Issue 4.45):** el JWT lleva `debeCambiarClave` mientras la cuenta deba cambiarla; `authGuard` responde 403 con `CLAVE_DEBE_CAMBIARSE` y solo `POST /auth/cambiar-clave` deja pasar y devuelve un token nuevo. Pantalla `/cambiar-clave` (Issue 4.21).
- **Planos reales y mapa 2D/3D (#387):** planos de los tres pisos en `assets/planos/` enlazados con los 54 espacios de la base, mapa de ocupación con zoom, buscador, filtros y franja horaria, maqueta 3D, y ruta que sigue los pasillos y elige escalera o ascensor.
- **Portal docente (#388, Issues 7.8 a 7.12):** inicio, horario, explorador de espacios con disponibilidad, estado de equipos del laboratorio y formulario de incidencias con código de seguimiento, conectados a `/docente/*`.
- **Incidencias de Jefatura (#388, Issue 7.11):** bandeja con filtros, detalle técnico del laboratorio y cierre (resolver o descartar) con comentario.
- **Inicio de Jefatura y laboratorios (#389, Issue 4.16):** métricas de laboratorios y PCs, alerta más reciente, mapa con sus laboratorios y listado con aforo real frente al nominal.
- **Catálogo de software (#393, Issue 4.30):** pantalla `/admin/software` con filtros, alta, edición y baja lógica; laboratorios y secciones eligen el software del catálogo.
- **Solicitudes de software (#378, Issue 4.29):** el docente pide un software y ve su estado; Coordinación lo aprueba o lo rechaza con motivo.
- **Periodos (#394, Issue 4.42):** `GET /api/v1/admin/periodos` con el vigente y la lista; selector de periodo en Secciones, Historial e Informe (Issue 4.43).
- **Endurecimiento HTTP (#394, Issue 1.12):** `helmet`, `trust proxy` configurable, límite de intentos fallidos en los tres logins (5 por usuario y 20 por IP cada 10 min, 429 con `Retry-After`) y límite de 120 consultas públicas por minuto. La consulta pública devuelve solo los datos mínimos (Issue 3.37).
- **Componentes del panel (#386):** `EstadoAsignacion` único (Issue 3.57), `Paginador` con el total real (Issues 4.38 y 4.39) y `FiltrosActivos` (Issue 4.40).
- **Historial (#378, #390, Issues 4.46, 4.47 y 4.50):** agrupado por corrida, con buscador, filtro de fechas y línea de tiempo de cada sección.

### Cambiado
- **Accesibilidad y feedback (#378):** pestañas ARIA en `SelectorSegmentado` (Issue 3.46), foco al `h1` al cambiar de ruta (Issue 3.45), hook `useAccion` para acciones con aviso (Issue 3.51), estados vacíos con salida (Issue 3.43) y avisos de espera en la corrida y la importación (Issue 4.56).
- **Rendimiento (#378, Issues 3.47 y 3.49):** carga diferida por pantalla (el paquete principal baja de más de 500 KB a unos 330 KB) y caché breve en `useCarga`.
- **Fechas y colores (#378, Issues 3.50 y 3.40):** un único módulo de fechas en hora de Lima y un color estable por curso.
- **Textos y estilo (#391, Issues 3.44, 3.48, 3.52, 3.53 y 3.55):** glosario sin jerga («asignación automática» en lugar de «motor»), sin mayúsculas sostenidas, texto mínimo de 14 px, esqueletos de carga y animaciones de 250 ms o menos.
- **Portal del alumno (#392, #395, Issues 3.38, 3.39 y 3.41):** inicio sin la clase destacada repetida, bloques del horario con su detalle en un drawer, marco único con `LayoutEstudiante` y validación al salir de cada campo con resumen de errores.
- **Panel de Coordinación (#390, Issues 4.49, 4.52 y 4.57):** mensajes con el aula y su ubicación en lugar de UUID, métricas con enlace a su lista e informe con estado vacío.
- **Panel administrativo (#396):** carga sin vacíos falsos, navegación que manda a «Más» solo lo que no cabe y una acción principal por vista.
- **Listados (#377, Issue 4.41):** búsqueda con espera de 300 ms e indicador «Actualizando…» al refrescar con datos previos.

### Corregido
- **Drawers en la URL (#378, Issue 4.51):** «Atrás» cierra el drawer de Secciones y Espacios, y el enlace lo abre.
- **Pantallas del panel desbordadas o con vacíos falsos (#396):** Incidencias y Solicitudes muestran el esqueleto mientras cargan, y el relleno inferior del marco ya no desaparece entre `md` y `lg`.

### Issues cerrados
1.12 (#332), 3.15 (#144), 3.23 (#212), 3.37 (#336), 3.38 (#350), 3.39 (#351), 3.40 (#352), 3.41 (#353), 3.42 (#354), 3.43 (#355), 3.44 (#356), 3.45 (#357), 3.46 (#358), 3.47 (#359), 3.48 (#360), 3.49 (#361), 3.50 (#362), 3.51 (#363), 3.52 (#364), 3.53 (#365), 3.54 (#366), 3.55 (#367), 3.56 (#373), 3.57 (#374), 4.16 (#167), 4.17 (#168), 4.18 (#169), 4.21 (#213), 4.26 (#218), 4.29 (#275), 4.30 (#276), 4.38 (#325), 4.39 (#326), 4.40 (#327), 4.41 (#328), 4.42 (#329), 4.43 (#330), 4.44 (#331), 4.45 (#335), 4.46 (#337), 4.47 (#338), 4.49 (#340), 4.50 (#341), 4.51 (#342), 4.52 (#343), 4.53 (#344), 4.56 (#347), 4.57 (#348), 7.8 (#205), 7.9 (#206), 7.10 (#207), 7.11 (#208), 7.12 (#209).

### Notas
- 4.55 (#346) sigue abierto en el Sprint 5: la pantalla aún rotula la última carga «en este navegador». El registro de importaciones del servidor llegó en la v1.12.0 (#407, Issue 4.54).
- 3.23 (#212) se cerró con #391; las pruebas con axe ya estaban en la v1.9.0.

---

## [1.10.0] - 2026-10-28
**Hitos:** Sprint 3.1 (cerrado) y parte del Sprint 4 y del Sprint 5. **PR:** #316, #375, #380, #381, #382, #383, #384, #385.

### Añadido
- **Auditoría de UI/UX, etapas 1 a 4 (#316):** `docs/AUDITORIA_UI_UX.md` (118 hallazgos y plan por etapas), tokens, diccionario de etiquetas y componentes base (`Drawer`, `Campo`, `TablaDatos`, `DialogoConfirmacion`, `EstadoError`). Playfair Display para la marca y los títulos, según la guía de estilos.
- **Runbook de rollback (#383, Issue 5.26):** `docs/runbook_rollback.md` para Render, Vercel y las migraciones de Prisma, y alerta en el resumen del CD cuando el despliegue falla.
- **Paginación acotada (#382, Issue 5.25):** `pagina` y `limite` (1 a 200) en alertas, escaladas, incidencias, espacios y docentes, con `docs/auditoria_paginacion_endpoints.md`.
- **Pruebas del cambio de clave obligatorio (#381, Issue 5.28).**

### Cambiado
- **Navegación responsive (#375, Issues 4.35 y 3.34):** barra inferior con «Más» por debajo de 1024 px en el panel y en el portal del alumno.
- **Cabecera única del alumno (#380, Issue 3.33)** y modo tablero solo con 1024 × 800 px o más (Issue 4.36).
- **Bordes de los campos (#375, Issue 3.35)** con contraste de 3,68:1, y filas de revisión apiladas en móvil (Issue 4.37).

### Corregido
- **Respuestas de error (#384, Issue 1.13):** 404 y 500 con la forma `{ success: false, message }`, sin detalle técnico.
- **Clave inicial (#385, Issue 1.14):** las cuentas nuevas reciben una clave aleatoria no derivable del código, con `debeCambiarClave`.
- **Desborde del inicio del alumno en móvil (#380, Issue 3.32)** y `<summary>` de 44 px de alto (Issue 3.36).

### Issues cerrados
1.13 (#333), 1.14 (#334), 3.32 (#317), 3.33 (#320), 3.34 (#321), 3.35 (#322), 3.36 (#324), 4.35 (#318), 4.36 (#319), 4.37 (#323), 5.25 (#369), 5.26 (#370), 5.28 (#376).

---

## [1.9.0] - 2026-10-21
**Hito:** Sprint 3 — MVP funcional (cerrado). **PR:** #277, #284, #285, #288, #290, #291, #292, #293, #295, #296, #298, #299, #300, #301, #302, #310, #311, #312, #314. **Publicada en `main`** con los PR #313 y #315.

### Añadido
- **Espacios habilitados o deshabilitados (#277):** `Espacio.habilitado` y `Espacio.descripcionUso`. El aforo puede ser 0 solo si el espacio está deshabilitado; el motor, el alumno y el explorador del docente no toman los deshabilitados.
- **Seed desde Excel (#277):** `backend/prisma/data/seed-plantilla.xlsx` es la única fuente de datos de demostración; valida todo el archivo antes de escribir y es idempotente.
- **Verificador de la corrida (#290, Issue 2.17):** regla pura que comprueba las 7 reglas duras después de cada corrida, con el veredicto en la respuesta, en la auditoría y en el panel (#299).
- **Asignación programada (#290, Issue 2.18):** `POST /api/v1/asignaciones/programada` con token de servicio y workflow nocturno.
- **Catálogo de software (#291, #292, Issues 4.27 a 4.29):** tablas `Software`, `EspacioSoftware` y `SeccionSoftware` con regla de versión (`CUALQUIERA`, `EXACTA`, `MINIMA`), endpoints de administración y solicitudes de software del docente. Spec 08.
- **Telegram y accesibilidad (#285):** alta y baja de Telegram desde el perfil del alumno (pantalla en #299) y `Espacio.distanciaAscensor` para la regla de accesibilidad.
- **Condición de accesibilidad en la ficha médica (#310, Issue 3.30):** el alumno la declara y se propaga a `Matricula.movilidadReducida`.
- **Gestión individual de secciones, historial e informe de salones (#310, Issues 4.31 a 4.33).**
- **Exportador de CSVs (#310, Issue 4.34):** `npm run prisma:export` vuelca la base a diez archivos, con `docs/guia-csv.md`.
- **Panel administrativo (#296, #302):** inicio de Coordinación y Jefatura (Issue 4.20), alertas (Issues 4.9 y 4.10), carga de datos (Issue 1.9), cambio de laboratorio (Issue 4.19) y alta y edición de espacios por rol (Issue 4.15).
- **Sistema de diseño del panel (#302):** `Boton`, `BadgeEstado`, `Aviso`, `Acordeon`, `Drawer` y `ProveedorAvisos`, con tokens de estado que cumplen 4,5:1.
- **Configuración y ayuda del alumno (#295, Issue 3.17)** e inicio del alumno rediseñado (#293).
- **Pruebas de carga y E2E (#284, Issues 5.8 y 5.9):** k6 sobre la consulta pública en el pico del primer día y Playwright sobre los flujos principales. Pruebas de accesibilidad con axe en jsdom y en navegador real, y E2E de espacios con su job en el CI (#302).
- **Cobertura (#288, Issue 5.18):** pruebas de todos los controllers y módulos auxiliares para superar el 85 % global.
- **Compilación TypeScript en el CI (#290, Issue 5.24)** y health check después del despliegue.

### Cambiado
- **Corrida batch (#277):** 4 operaciones masivas en una transacción en lugar de unas 900 consultas: 228 secciones en unos 8 s.
- **Sesión entre pestañas (#310, Issue 3.31):** las pestañas comparten el inicio y el cierre de sesión con `BroadcastChannel`, sin mover el token a `localStorage`.
- **Portal y panel en modo tablero (#310, #311, Issue 3.29):** la portada y el tablero caben en una pantalla, y el detalle se abre en drawers en lugar de scrolls internos.
- **Vocabulario único (#312):** ninguna pantalla muestra enums, UUID ni códigos internos.
- **Línea base (#310, Issues 1.11 y 6.13):** se aplicó el cambio de alcance de Telegram (#247).

### Corregido
- **CD (#277):** el job `ci` de `cd.yml` hereda los secrets; sin `SONAR_TOKEN` el despliegue se omitía desde el 10 de octubre.
- **SonarCloud en `main` (#314):** se omite el Quality Gate en el push a `main`, que el plan no permite consultar.
- **Rutas directas en Vercel (#300):** rewrite a `index.html` para que React Router resuelva las rutas internas.
- **Validación manual (#298, Issue 5.15):** orden de las clases por cercanía, cursos agrupados, ruta de la corrida (`/asignaciones/batch`) y reintento en el inicio del alumno.
- **Secciones escaladas (#301):** motivo legible y acción «Cargar horario».
- **Orden determinista (#290):** comparador explícito en los `.sort()` del motor y los servicios (SonarCloud S2871).

### Base de datos
- `20261013000000_espacio_habilitado`, `20261014000000_espacio_distancia_ascensor`, `20261019000000_auditoria_verificacion`, `20261020000000_catalogo_software`, `20261021000000_catalogo_software_limpieza`, `20261021000000_ficha_accesible` y `20261022000000_solicitudes_software`.

### Issues cerrados
1.9 (#115), 1.11 (#248), 2.17 (#280), 2.18 (#281), 3.17 (#146), 3.29 (#307), 3.30 (#308), 3.31 (#309), 4.9 (#160), 4.10 (#161), 4.15 (#166), 4.19 (#170), 4.20 (#171), 4.27 (#273), 4.28 (#274), 4.31 (#303), 4.32 (#304), 4.33 (#305), 4.34 (#306), 5.8 (#180), 5.9 (#181), 5.15 (#188), 5.18 (#220), 5.20 (#255), 5.21 (#267), 5.22 (#268), 5.23 (#269), 5.24 (#282), 6.13 (#256), #247, #286.

---

## [1.8.0] - 2026-10-14
**Hito:** Sprint 4 — MVP funcional (abierto). **PR:** #278, #279.

### Añadido
- **Vista pública de consulta de espacios (#278, Issue 3.7):** integra el formulario y la tarjeta de resultado con estados de carga y error, ajustes responsive y de accesibilidad, sobre el mismo armazón visual del inicio.
- **Portal del estudiante (#279, Issue 3.16):** inicio del estudiante, horario con vista diaria y semanal, y lista de cursos con docente, horarios y próximo espacio. Rutas `/estudiante/horario` y `/estudiante/perfil` protegidas para el rol `ALUMNO`, servicio `estudiante.ts` y hook `useCarga`.
- **Perfil del alumno (#279):** datos institucionales, datos personales y ficha médica con edición.

### Issues cerrados
3.7 (#136), 3.16 (#145).

### Notas
- El perfil se entregó dentro de #279; el Issue 3.17 (#146) se cerró en la v1.9.0 con #295.
- Se mantiene el desvío al cambio de clave inicial tras el login.

---

## [1.7.0] - 2026-10-13
**Hito:** Sprint 3 — Integración. **PR:** #272.

### Añadido
- **Home:** selección de portales con la nueva identidad visual (logos, favicon, tipografías, `lang="es"`).
- **Logins:** alumno (3.22), docente (7.7) y administración, Coordinación y Jefatura (4.25), sin opción de crear cuenta y con mensajes claros ante credenciales inválidas.
- **Sesión y roles:** `AuthProvider`, rutas protegidas por rol, aviso de sesión vencida, pantalla de acceso denegado y redirección tras el login. El cambio de clave y las áreas privadas quedan como marcadores de posición.
- **Consulta del alumno:** formulario de búsqueda (3.5) y tarjeta de resultado (3.6).
- **Pruebas:** 84 pruebas del frontend (pantallas, rutas, servicio de sesión y API).

### Issues cerrados
3.5 (#134), 3.6 (#135), 3.22 (#151), 7.7 (#204), 4.25 (#217).

---

## [1.6.0] - 2026-10-12
**Hito:** Sprint 4 — MVP funcional (abierto) y cierre de pendientes del Sprint 3. **PR:** #263, #264, #265, #266, #270, #271.

### Añadido
- **Alertas (#263, 4.6, 4.7):** `GET /admin/alertas` y `PATCH /admin/alertas/:id/resolver`, que deja `RegistroAuditoria` (404, 403 y 409).
- **Mapa de ocupación (#263, 4.11, 4.12, 3.13):** servicio de ocupación y `GET /admin/mapa-ocupacion?pabellon&piso[&franja]` con los estados `DISPONIBLE`, `OCUPADO` y `ALERTA_ACTIVA`. `GET /estudiante/mapa-ocupacion` muestra solo libre u ocupado, sin curso, docente ni alertas.
- **Secciones escaladas e incidencias (#263, 4.22, 7.4, 7.6):** `GET /admin/secciones-escaladas`, `GET /docente/laboratorio-estado/:espacioId` (solo laboratorios con asignación vigente del docente) y `GET` y `PATCH /admin/incidencias` con comentario de cierre.
- **Cuentas (#263, parte backend de 4.17, 4.18, 4.21 y 4.26):** `POST /admin/alumnos` y `POST /admin/docentes` (clave inicial igual al código), `POST /auth/cambiar-clave` para los 4 roles y `POST /admin/usuarios/restablecer-clave` (clave aleatoria mostrada una sola vez; rechaza cuentas de Coordinación y Jefatura).
- **Gestión de espacios (#263, parte backend de 4.15):** `GET`, `POST` y `PATCH /admin/espacios` con campos acotados por rol. Jefatura solo opera los espacios de `EspacioResponsable`.
- **Bus de eventos (#266, 2.16):** bus interno tipado con `asignacion.cambiada` y `alerta.creada`, emitidos tras confirmar la transacción.
- **Telegram (#266, 3.24 a 3.27):** tabla `VinculacionTelegram` con Row Level Security; bot con `POST /api/v1/telegram/webhook` para vincular con código y clave y dar de baja (bloqueo del chat tras 5 intentos en 15 minutos); aviso de cambio de aula a los matriculados vinculados, sin datos de salud ni de movilidad reducida; y resumen diario con `POST /api/v1/telegram/resumen-diario` (token de servicio, idempotente por día) y el workflow `resumen-diario.yml` a las 07:30 de Lima, de lunes a sábado.
- **Ruta de referencia (#270, #271, 3.14):** `GET /estudiante/ruta/:asignacionId` en tres tramos (entrada del pabellón, cambio de piso por escalera o ascensor accesible, y espacios del bloque) con estimación de caminata y estado `RUTA_NO_DISPONIBLE` cuando falta el pabellón o el piso.
- **Mapa 3D, borrador (#264, Issue 4.23 abierto):** componente `mapa3d` (`three` y `@react-three/fiber`) con extrusión de planos SVG, color por estado, cámara orbital, selector de piso y vista de edificio; y conversor de planos de Canva en `tools/planos/`.
- **Documentación (#265):** `arquitectura.md` y specs 02, 03, 04, 05 y 07 actualizadas con el Sprint 3-4, el bus de eventos, Telegram y el mapa 3D.

### Base de datos
- Migración `20261010000000_incidencia_cierre`: `Incidencia` gana `comentario_cierre` y `fecha_cierre` (nulables).
- Migración `20261011000000_vinculacion_telegram`: tabla `VinculacionTelegram` con Row Level Security.

### Operación
- Variables de entorno en Render: `TELEGRAM_BOT_TOKEN`, `TELEGRAM_WEBHOOK_SECRET`, `TELEGRAM_BOT_USERNAME`, `RESUMEN_DIARIO_TOKEN`. Secretos de GitHub: `BACKEND_URL` y `RESUMEN_DIARIO_TOKEN`. Registrar el webhook una vez con `setWebhook`. Sin `TELEGRAM_BOT_TOKEN` el sistema funciona igual, pero no avisa.

### Issues cerrados
2.16 (#249), 3.13 (#142), 3.14 (#143), 3.24 (#250), 3.25 (#251), 3.26 (#252), 3.27 (#253), 4.6 (#157), 4.7 (#158), 4.11 (#162), 4.12 (#163), 4.22 (#214), 7.4 (#201), 7.6 (#203).

### Notas
- Siguen abiertos por falta de interfaz: 4.15 (#166), 4.17 (#168), 4.18 (#169) y 4.21 (#213); y 4.26 (#218), del Sprint 5, adelantado.
- Según los PR, las consultas de Prisma de #263 y #266 se verificaron solo por compilación y revisión, sin ejecutarlas contra Postgres ni contra la API real de Telegram. #263 pasó 417 pruebas existentes y #266, 393. No incluyen pruebas nuevas (son de QA: 5.20 y 5.21).
- Límite conocido: el contador de intentos fallidos del bot vive en memoria y se reinicia si Render reinicia el contenedor.

---

## [1.5.0] - 2026-10-10
**Hito:** Sprint 3 — Integración. **PR:** #257.

### Añadido
- **Seed de demostración (5.17):** script `backend/prisma/seed.ts` idempotente.
- **Pruebas de integración (5.7):** flujo completo de las reglas del motor en `flujoCompleto.test.ts`.
- **Auditoría (5.11):** pruebas del servicio de registro de auditoría en `registroAuditoria.test.ts`.
- **SonarCloud (5.10b):** análisis con Quality Gate en `ci.yml` y `sonar-project.properties` (cobertura mínima de 85 % y cero bugs).

### Issues cerrados
5.7 (#179), 5.10b (#183), 5.11 (#184), 5.17 (#219).

### Notas
- Desde esta versión, el CD falla en cada push a `develop`: el workflow reutilizable no recibe `SONAR_TOKEN`. Se corrige en `[Sin publicar]`.

---

## [1.4.0] - 2026-10-08
**Hito:** Sprint 3 — Integración. **PR:** #240, #241, #242, #243, #244, #245, #246.

### Añadido
- **Autenticación por rol (#242, 3.21, 7.1, 4.8):** `POST /api/v1/auth/{admin,alumno,docente}/login` con JWT, indicador `debeCambiarClave` y middlewares `authGuard` y `roleGuard`. Una cuenta de otro rol recibe 401 con el mismo mensaje que una clave incorrecta.
- **Alertas (#242, 4.1 a 4.5):** `POST /admin/laboratorios/:id/software` y `.../pcs-malogradas`, que guardan el cambio, registran `HistorialEspacio` y evalúan alertas en una transacción; detección de incompatibilidad de software y de capacidad insuficiente; y persistencia sin duplicados.
- **Portal del alumno (#242, 3.10 a 3.12):** `GET /estudiante/horario`, `GET /estudiante/cursos` (con próxima sesión en hora de Lima) y `GET` y `PATCH /estudiante/perfil`.
- **Portal del docente (#242, 7.2, 7.3, 7.5):** `GET /docente/horario`, `GET /docente/espacios/explorador` y `POST /docente/incidencias` (devuelve un identificador `INC-XXXXXXXX`).
- **Orquestación del motor (#243, 2.10, 2.11, 2.12, 2.14):** asignación individual idempotente (huella SHA-256), corrida batch por periodo con orden determinista, escalamiento a revisión manual con diagnóstico de causa (`CAPACIDAD_INSUFICIENTE`, `SOFTWARE_FALTANTE`, `HORARIO_BLOQUEADO`, `CONTIGUEDAD_NO_ALCANZADA`, `SIN_HORARIOS_DEFINIDOS`) y cercanía entre secciones paralelas como criterio de desempate, nunca de descarte.
- **Asignación a demanda (#244, 2.15):** `POST /api/v1/asignaciones/batch` y `POST /api/v1/asignaciones/seccion/:id`, solo para Coordinación, con candado en memoria contra corridas simultáneas (409).
- **Importación por HTTP (#246, Issue 1.11):** `POST /api/v1/import/:tipo` (`cursos-secciones`, `horarios`, `matriculas`, `docentes`) con CSV o JSON de hasta 10 mb y 20 000 filas, reporte por fila, y asignación encadenada si el periodo vigente queda completo (1.6).
- **Migración inicial de Prisma (#245):** 18 tablas y 11 enums, y habilitación de Row Level Security.
- **Planos SVG por piso (#241, borrador de 6.10):** pisos 1 a 3 en `assets/planos/`.
- **Sílabo (#246):** `docs/silabo/` con el registro de cobertura de los temas de las semanas 1 a 8.

### Cambiado
- **CD (#240, Issue 1.10):** se separa en `cd.yml`, que usa `ci.yml` como puerta de calidad y evita migraciones simultáneas con `concurrency`. El frontend se despliega con Vercel CLI en lugar del Deploy Hook, y las migraciones usan el script `prisma:deploy` del workspace.
- **Specs (#246):** la spec 01 se alinea con las rutas reales de importación.

### Base de datos
- Migraciones `20261008004857_init` y `20261008005030_habilitar_rls`. El CD las aplica en Supabase con `prisma migrate deploy`.

### Operación
- Variable `PERIODO_VIGENTE` (documentada en `.env.example`): si falta, se usa el periodo más reciente entre las secciones.

### Issues cerrados
2.10 (#126), 2.11 (#127), 2.12 (#128), 2.14 (#129), 2.15 (#211), 3.10 (#139), 3.11 (#140), 3.12 (#141), 3.21 (#150), 4.1 (#152), 4.2 (#153), 4.3 (#154), 4.4 (#155), 4.5 (#156), 4.8 (#159), 7.1 (#198), 7.2 (#199), 7.3 (#200), 7.5 (#202).

### Notas
- Siguen abiertos 1.11 (#248), 6.10 (#222) y 1.9 (#115, pantalla de importación).
- Los importadores guardan las filas válidas y reportan las inválidas, mientras que los issues 1.3 a 1.5 piden rechazar el archivo completo. Por eso el endpoint no encadena la asignación cuando hay filas rechazadas.
- Según los PR, #242 se probó con Prisma simulado (288 pruebas) y #246 además contra un PostgreSQL temporal (393 pruebas).

---

## [1.3.0] - 2026-10-04
**Hito:** Sprint 2 — Reglas de negocio del motor (cerrado). **PR:** #231, #234, #238, #239.

### Añadido
- **Regla de software (#234, 2.6, 2.7):** `validarSoftwareLaboratorio` y `validarSoftwareBloque`, insensibles a mayúsculas y espacios; en aulas teóricas el control se omite, y en laboratorios se rechaza el bloque completo y se registran los faltantes por espacio.
- **Accesibilidad y cercanía (#234, 2.8, 2.9, 2.13):** `detectarMovilidadReducida`, `priorizarBloquesPiso1` y evaluación de cercanía entre un bloque candidato y las secciones paralelas.
- **Consultas públicas (#231, 3.1 a 3.4):** `obtenerAsignacionPorAlumno` y `obtenerAsignacionPorCurso`, con `GET /api/v1/consulta/alumno/:codigoAlumno` y su equivalente por curso.
- **Despliegue continuo (#238, 1.10):** job `deploy` en `ci.yml` condicionado a pruebas y linter en `develop`, `directUrl` en `schema.prisma` para migraciones seguras en Supabase, y URLs públicas oficiales en el `README`.
- **Pruebas (#239, 5.5, 5.6, 5.16) y Plan de Ambiente Controlado (5.13):** pruebas parametrizadas de validación de software, accesibilidad y cercanía.

### Issues cerrados
1.10 (#210), 2.6 (#121), 2.7 (#122), 2.8 (#123), 2.9 (#124), 2.13 (#125), 3.1 (#130), 3.2 (#131), 3.3 (#132), 3.4 (#133), 5.5 (#176), 5.6 (#177), 5.16 (#178), 5.13 (#186).

---

## [1.2.0] - 2026-09-29
**Hito:** Sprint 1 — Piezas base del algoritmo (cerrado). **PR:** #232, #235, #236, #237.

### Añadido (Sprint 1 - Motor de Asignación Base)
- **Regla 1 - Capacidad Real (`calcularCapacidadReal`):** Retorna $AforoNominal$ para aulas teóricas y $\max(0, AforoNominal - PCsMalogradas)$ para laboratorios.
- **Regla 2 - Grafo de Contigüidad (`sembrarEspaciosYContiguedades`):** Seed e interfaz para adjacencia de aulas en el mismo piso/pabellón.
- **Regla 3 - Consulta de Espacios Contiguos (`obtenerEspaciosContiguos`):** Búsqueda BFS de espacios adyacentes del mismo tipo.
- **Regla 4 - Disponibilidad (`calcularEspaciosDisponibles`):** Verificación de no doble reserva contra asignaciones vigentes.
- **Regla 5 - Algoritmo de Bloque Contiguo (`buscarBloqueContiguo`):** Expansión codiciosa (greedy) de bloques hasta satisfacer la suma de aforo requerido.
- **Pruebas unitarias y parametrizadas (#235, 5.1 a 5.4):** capacidad real, consulta de contigüidad, disponibilidad por horario y búsqueda de bloque con capacidad variable.
- **Documento de Diseño UI/UX (#236, 6.6)** y **Guía de Estilos (#237, 6.7).**

### Issues cerrados
2.1 (#116), 2.2 (#117), 2.3 (#118), 2.4 (#119), 2.5 (#120), 5.1 (#172), 5.2 (#173), 5.3 (#174), 5.4 (#175), 6.6 (#194), 6.7 (#195).

---

## [1.1.0] - 2026-09-28
**Hito:** Sprint 1 — Piezas base del algoritmo (cerrado). **PR:** #230.

### Añadido (Sprint 1 - Importadores de Datos)
- **Importador de Cursos y Secciones:** Ingesta de CSV/JSON para `Curso` y `Seccion` (`cursosSecciones.importer.ts`).
- **Importador de Horarios:** Ingesta de `HorarioSeccion` con validación de franjas temporales (`horarios.importer.ts`).
- **Importador de Matrículas:** Ingesta de `Matricula` registrando el flag `movilidadReducida` por alumno (`matriculas.importer.ts`).
- **Importador de Docentes:** Ingesta de perfil de profesores (`docentes.importer.ts`).
- **Orquestador Principal:** Módulo unificado de ejecución de importaciones (`importers/index.ts`).

### Issues cerrados
1.3 (#109), 1.4 (#110), 1.5 (#111), 1.6 (#112), 1.7 (#113), 1.8 (#114).

### Notas
- Los issues 1.6 a 1.8 figuran en el hito Sprint 3 pero se cerraron con este PR. El Issue 1.6 (encadenar la asignación tras una importación) se cerró sin que su criterio de aceptación estuviera en `develop`; se construyó en la v1.4.0 (#246).

---

## [1.0.0] - 2026-09-27
**Hito:** Sprint 0 — Cimientos (cerrado) y base del Sprint 1. **PR:** #225, #226, #227, #228, #229, #233.

### Añadido (Fundamentos & CI/CD)
- **Estructura Monorepo:** Configuración de workspaces npm (`backend` + `frontend`).
- **Modelo de Datos Prisma:** Esquema en PostgreSQL (Supabase) con enums, tablas y relaciones.
- **Pipeline CI/CD (GitHub Actions):** `.github/workflows/ci.yml` ejecutando linting (ESLint), formateo (Prettier) y pruebas unitarias (Jest).
- **Especificaciones Técnicas (Specs):** Índice y specs en `docs/specs/` para los 118 issues de las 7 épicas.
- **Reglas del Agente (`AGENTS.md`):** Protocolos y delimitación estricta de roles de desarrollo (`BI`, `BM`, `FE`) vs QA (`Angel14den`).
- **Documentos de línea base:** historias de usuario y requisitos (6.1), modelo de reglas y alcance (6.2), plan de línea base (6.3) y acta de línea base funcional (6.4), en `docs/`.
- **Arquitectura y modelo de datos (#225, 6.5, 1.2):** `docs/arquitectura.md` y `docs/modelo-datos.md`, junto con las 18 entidades de `schema.prisma` y la plantilla de Pull Requests.
- **Plan Maestro de Pruebas (#226, #227, 5.12).**
- **Registro de Versiones (#233, 6.8).**

### Issues cerrados
1.1 (#107), 1.2 (#108), 5.10a (#182), 5.12 (#185), 6.1 (#189), 6.2 (#190), 6.3 (#191), 6.4 (#192), 6.5 (#193), 6.8 (#196).
