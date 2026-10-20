# Registro de Versiones (Changelog) — SAIE

> **Proyecto:** SAIE (Sistema de Asignación Inteligente de Espacios)  
> **Issue Vinculado:** [#196 - Issue 6.8](https://github.com/andremelzc/saie/issues/196)  
> **Estándar:** [Keep a Changelog 1.0.0](https://keepachangelog.com/es-ES/1.0.0/)

---

## [Sin publicar]
Trabajo aún no fusionado a `develop`: la rama `feature/espacios-habilitados-seed-excel` (espacios habilitados y seed desde Excel) y el PR #302 (`feature/4.15-edicion-espacios-y-pulido-ui-panel`), con el sistema de diseño del panel, el rediseño de las pantallas administrativas y el alta y edición de espacios por rol.

### Añadido
- **Espacios habilitados o deshabilitados:** `Espacio.habilitado` (por defecto `true`) y `Espacio.descripcionUso` (rótulo visual, máximo 120 caracteres). El aforo puede omitirse o ser 0 solo si el espacio está deshabilitado; habilitarlo exige un aforo mayor a 0 (422). Coordinación cambia ambos campos en `POST` y `PATCH /api/v1/admin/espacios`. El mapa del panel marca los espacios como `DESHABILITADO` (`resumen.deshabilitados`) y expone `descripcionUso`; el alumno y el explorador del docente no los muestran.
- **Seed desde Excel:** `backend/prisma/data/seed-plantilla.xlsx` pasa a ser la única fuente de datos (espacios, contigüidades, docentes, cursos, secciones, horarios, alumnos y matrículas), sin datos sintéticos. Valida todo el archivo antes de escribir y es idempotente. Las matrículas anónimas (`X-<curso>-<sección>-NNN`) completan el total declarado en `matriculados`. Nueva lógica en `plantilla.seed.ts`. Se agrega al Excel a la alumna 23200263 con sus 16 matrículas (teoría y laboratorio de 8 cursos), por lo que el seed descuenta sus lugares de los anónimos.
- **Spec 08:** borrador de la especificación del catálogo de software (Issues 4.27 a 4.30).
- **Sistema de diseño del panel (`frontend/src/components/ui/`):** `Boton` (variantes, tamaño táctil de 44 px y motivo visible de por qué está deshabilitado), `BadgeEstado`, `Aviso`, `Acordeon`, `Drawer` y `ProveedorAvisos` con una región viva siempre montada para los avisos globales. Los botones, badges y avisos duplicados del panel se reemplazan por estas piezas y los tintes de éxito y peligro quedan unificados en tokens.
- **Alta y edición de espacios por rol (Issue 4.15):** formulario de alta y de edición de espacios con `camposEditables`, que acota qué puede modificar cada rol (Coordinación, Jefatura y Administración), con validación en línea y aviso de las alertas que genera el cambio. El listado de espacios gana contador por tipo, filtros combinables, estado por fila y un drawer de detalle.
- **Pruebas de accesibilidad con axe (Issue 3.23):** helper `frontend/src/test/axe.ts` que ejecuta axe sobre un contenedor y falla solo con violaciones `serious` o `critical`, aplicado a las pantallas del panel (Espacios, Alertas, Inicio, Carga de datos, Cambio de laboratorio y el formulario de espacio dentro de su drawer). En paralelo, `tests/e2e/accesibilidad.spec.ts` repite la auditoría **en un navegador real** con `@axe-core/playwright`, que es donde sí se mide el contraste de color. Detectó y se corrigieron tres violaciones reales: el contraste insuficiente de los distintivos de estado, el nombre accesible de los botones de filtro de alertas y el de los enlaces de acceso del inicio.
- **Panel usable en móvil:** el listado de espacios pasa de tabla a tarjetas por debajo de 1024 px (decidido con el hook `usePantallaAncha`, de modo que nunca coexisten las dos versiones en el DOM) y las columnas de las plantillas de carga se apilan en pantallas estrechas. `tests/e2e/responsive.spec.ts` comprueba que ninguna pantalla del panel desborda a 320, 375 y 390 px.
- **E2E del flujo de espacios:** `tests/e2e/espacios-admin.spec.ts` cubre el ingreso al panel como Coordinación, la edición del aforo de un espacio, el guardado y la comprobación del aviso y de la fila actualizada. No necesita backend ni base de datos: el login y las consultas al panel se interceptan, igual que en el spec de consulta pública. Se incorpora al CI con un job propio de Playwright.

### Cambiado
- **Motor de asignación:** solo carga los espacios habilitados, de modo que los deshabilitados quedan fuera del grafo de contigüidad y de la disponibilidad.
- **Seed:** reemplaza el dataset sintético del Issue 5.17 (v1.5.0).
- **Carga de datos maestros (Issue 1.9):** la guía y las plantillas pasan a un drawer para no tapar la tarea principal; cada flujo conserva su estado (sin cargar, con errores, cargado) y su última carga; el resultado distingue filas leídas de filas con problemas, permite descargar los errores en CSV, avisa que no se asignaron aulas y ofrece continuar con el siguiente flujo.
- **Alertas (Issue 4.10):** el contador pasa a "N pendientes de M" sobre el total real, los vacíos se distinguen (sin alertas pendientes frente a sin coincidencias con el filtro), resolver una alerta pide confirmación y se confirma con un aviso, y el error de la resolución se puede reintentar.
- **Inicio de Coordinación (Issue 4.20):** la corrida se desglosa en secciones con aula nueva, que conservan la suya y que necesitan revisión; pide confirmación antes de ejecutarse; el resultado de una sección reintentada se muestra aparte del resultado del periodo; y el veredicto del verificador queda visible tras la corrida.
- **Cambio de laboratorio (Issue 4.19):** software y PCs se editan en pestañas pero se guardan con un solo botón y un solo estado; se distingue "sin registrar" de 0, el catálogo tiene búsqueda y los controles deshabilitados explican el motivo.
- **Consulta pública (Issues 3.5 a 3.7):** el resultado de la búsqueda recibe el foco y se anuncia en una región viva.
- **Tintes del panel:** los colores sueltos (`#E8F3E9`, `#FBE9E9`, `#FDF0E1` y sus equivalentes) se sustituyen por los tokens `saie-success-soft`, `saie-danger-soft` y `saie-warning-soft` con el texto en la variante fuerte, que es la que cumple el contraste mínimo de 4,5:1.

### Corregido
- **Corrida batch:** la transacción interactiva hacía unas 900 consultas seguidas y, contra una base remota, superaba el tiempo máximo de Prisma y respondía 500. Ahora usa 4 operaciones masivas (`updateMany` y 3 `createMany`) en una sola transacción: 228 secciones en unos 8 s.
- **CD:** el job `ci` de `cd.yml` hereda los secrets (`secrets: inherit`). Sin esto `SONAR_TOKEN` llegaba vacío al workflow reutilizable, el análisis de SonarCloud fallaba y el job de despliegue (migraciones, Render, Vercel) quedaba omitido en cada push a `develop` desde el 10 de octubre.
- **Corrida de asignación en el panel:** reintentar una sección ya no sobrescribe el resultado del periodo, las alertas se vuelven a pedir después de la corrida y el contador distingue las secciones asignadas de las que conservan su aula.
- **Cambio de laboratorio:** el aviso de éxito ya no sobrevive a una edición posterior y los valores sin registrar ya no se muestran como 0.
- **Interfaz:** se quitan los números de issue de las pantallas y se sustituyen por un mensaje honesto con la acción disponible.
- **Carga de datos:** el resumen de la importación distingue las filas leídas de las guardadas («10 filas leídas · 8 guardadas · 2 con problemas»), un dato exacto: cada importador genera una entrada de error por fila rechazada.
- **Calidad del código del panel:** la lógica de `FormularioEspacio`, `CambioLaboratorio`, `CargaDatos`, `EspaciosAdmin` e `InicioAdmin` se parte en funciones y componentes pequeños, y los roles ARIA que tenían un equivalente semántico pasan a usar el elemento correspondiente (`<fieldset>`, `<section>`, `<output>`).

### Base de datos
- Migración `20261013000000_espacio_habilitado`.

### Pendiente
- Actualizar las pruebas de QA que simulan la transacción fila por fila: `motorService.test.ts` (`procesarCorridaBatchPeriodo`), `registroAuditoria.test.ts` y `docente.test.ts` (7.3, ahora la consulta incluye `habilitado: true`).

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
- El perfil se entregó dentro de #279, pero el Issue 3.17 (#146) sigue abierto.
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
