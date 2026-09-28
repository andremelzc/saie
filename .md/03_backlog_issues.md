# Backlog de Issues
## SAIE — Sistema de Asignación Inteligente de Espacios

**Versión:** 2.0 · **Fecha:** 19 de septiembre de 2026

Organizado por **Épicas** (label, no milestone) y **Milestones** (= Sprints, con fechas). Cada issue indica su **Rol responsable**, uno de los 5 definidos en `05_roles_y_tareas.md`. El backlog tiene 118 issues.

**Criterio de granularidad:** un issue es una sola función, componente o documento que se puede completar y validar de forma aislada, sin necesitar que otro issue esté terminado para poder empezarlo o testearlo (aunque sí puede depender de otro para funcionar en producción — se anota como «Usa el Issue X.X»).

**Cómo se lee cada issue:**
- **Contexto:** por qué existe el issue y qué problema resuelve.
- **Descripción:** qué se construye.
- En los issues complejos también aparecen **Entradas y salida**, **Cómo funciona**, **Casos borde**, **Fuera de alcance** y **Notas técnicas**. Las secciones «Cómo funciona» son propuestas de diseño: se pueden discutir al implementar.
- **Dependencias:** con qué otros issues se relaciona.
- **Criterios de aceptación** y **Labels**.

**Roles (abreviatura usada en cada issue):**
`LP` Líder de Proyecto · `BM` Backend — Motor de Asignación · `BI` Backend + BD — Integraciones y Panel Administrativo · `FE` Frontend + UI/UX · `QA` Asegurador de Calidad

---

## 🗓️ Milestones (Sprints)

| Milestone | Fechas | Objetivo del sprint |
|---|---|---|
| `Sprint 0 — Cimientos` | 07–13 sept | Repositorio con el stack definido, modelo de datos (Documento de Modelo de Datos), historias de usuario, plan de línea base y arquitectura inicial listos |
| `Sprint 1 — Piezas base del algoritmo` | 14–27 sept | Capacidad real, disponibilidad, contigüidad, búsqueda de bloque — todo aplicado por igual a aulas y laboratorios; importador de datos por partes, incluidos los docentes; seed de espacios y contigüidad; diseño UI/UX y guía de estilos; plan de pruebas y ambiente controlado; CI/CD base |
| `Sprint 2 — Reglas de negocio del motor` | 28 sept–11 oct | Software (solo laboratorios), accesibilidad y cercanía entre secciones paralelas; endpoints de consulta del portal; autenticación del panel por rol; registro masivo de alumnos; despliegue inicial del backend y la base; planos SVG por piso y pabellón |
| `Sprint 3 — Integración` | 12–25 oct | Orquestación (individual y batch) + escalamiento, incluyendo cercanía entre secciones paralelas; asignación a demanda; encadenamiento import→asignación; panel de alertas completo (software y capacidad); login de administración y manejo de sesión; frontend del portal arranca; quality gates y auditoría; seed y dataset de demostración; backend base del portal del alumno y del docente |
| `Sprint 4 — MVP funcional` | 26 oct–8 nov | Portal terminado; panel de alertas, lista de secciones escaladas y mapa de ocupación 2D (backend + UI con datos de ejemplo) listos; escena 3D del mapa; cambio de contraseña; primera corrida de k6; arquitectura final; gestión de espacios por rol; mapa y ruta para el alumno; portal docente completo (UI + backend) incluyendo revisión de incidencias por Jefatura |
| `Sprint 5 — Estabilización` | 9–22 nov | Integración final de los mapas (2D y 3D) y de las vistas del alumno y del docente con endpoints reales; E2E; corrección de bugs; revisión de cobertura; pulido de UI; restablecimiento de contraseña; validación final de carga |
| `Cierre — Entrega y sustentación` | 23–29 nov | Validación manual de flujos, informe de resumen de pruebas, documentación final, ensayo de sustentación, acta de línea base de producto y entrega |

---

## 🏷️ Labels — catálogo

**Por tipo:** `setup` `infra` `database` `core` `algoritmo` `accesibilidad` `frontend` `backend` `consulta` `panel-admin` `testing` `unitarias` `integracion` `performance` `ci-cd` `quality` `docs` `bug` `logging` `gestion` `docente` `privacidad` `seguridad` `datos` `3d`

**Por épica:** `epic:setup` `epic:motor-asignacion` `epic:portal-estudiante` `epic:panel-alertas` `epic:calidad` `epic:docs` `epic:portal-docente`

---

## 🏗️ Épica: Setup del Proyecto
`epic:setup`

### Issue 1.1 — Configurar estructura base del repositorio y stack del proyecto
**Milestone:** Sprint 0 · **Rol:** BM

**Contexto:** Todo el equipo trabaja sobre el mismo repositorio desde el Sprint 0. Si la estructura, las convenciones y el stack no se fijan al inicio, cada rol termina configurando su propio entorno y aparecen diferencias que rompen el CI más adelante.

**Descripción:** Crea la estructura inicial del proyecto (backend, frontend, tests, docs) y configura el entorno de desarrollo con el stack acordado. Aquí solo se resume el stack: el detalle y la justificación de cada herramienta están en el Documento de Arquitectura (sección 4).

**Stack acordado:**
- **Backend:** Node.js + Express con TypeScript; Prisma (ORM) y Zod (validación) sobre PostgreSQL alojado en Supabase.
- **Frontend:** React + TypeScript, TailwindCSS, React Router y Axios.
- **Pruebas:** Jest (con ts-jest), Supertest, Playwright (E2E) y k6 (carga).
- **CI/CD:** GitHub Actions y SonarCloud.
- **Despliegue:** Vercel (frontend) y Render (backend).

**Estructura propuesta:** `/backend` (API, motor de reglas e importadores), `/frontend` (portales y panel), `/tests` (integración, E2E y carga), `/docs` (documentos del proyecto) y `/assets/planos` (SVG del Issue 6.10).

**Fuera de alcance:** El pipeline de CI (Issue 5.10a) y el despliegue (Issue 1.10). Este issue solo deja el repositorio listo para trabajar en local.

**Dependencias:** Ninguna: es el primer issue del proyecto.

**Criterios de aceptación:**
- [ ] Estructura de carpetas definida
- [ ] README con instrucciones de instalación y ejecución local
- [ ] `.gitignore` configurado
- [ ] Convenciones de commits/branching documentadas
- [ ] TypeScript configurado en backend y frontend, con linter y formateador
- [ ] Dependencias base instaladas con versiones fijadas y versión de Node indicada (`.nvmrc`)
- [ ] Prisma inicializado, con conexión a una base PostgreSQL local para desarrollo
- [ ] `.env.example` con las variables necesarias, sin secretos
- [ ] Scripts `dev`, `test` y `build` documentados
- [ ] README con la tabla del stack y la remisión al Documento de Arquitectura para el detalle

**Labels:** `epic:setup`, `setup`, `infra`

---

### Issue 1.2 — Diseñar el modelo de datos base y documentarlo (Documento de Modelo de Datos)
**Milestone:** Sprint 0 · **Rol:** BM (con aporte de BI)

**Contexto:** El motor de reglas, los importadores, las alertas y los portales comparten el mismo esquema. Se diseña una sola vez, con una entidad genérica de espacio, para que el motor sea único para aulas teóricas y laboratorios.

**Descripción:** Esquema de base de datos y su documento. Una entidad genérica **Espacio** con un campo `tipo` (`AULA_TEORICA` | `LABORATORIO`) cubre pabellón, piso, identificador y aforo nominal propio y configurable para ambos tipos. Software instalado y PCs malogradas vigentes son campos exclusivos de `LABORATORIO` (nulos/no aplicables para `AULA_TEORICA`) y son versionables. Incluye también cursos, secciones, matrículas, cuentas, asignaciones, alertas e incidencias. No incluye la relación de contigüidad (Issue 2.2) ni la lógica de importación (Issues 1.3–1.5).

**Entidades:**
- Espacio, EspacioContiguo, HistorialEspacio y EspacioResponsable (qué laboratorios están a cargo de cada cuenta de Jefatura).
- Curso, Sección (con docente, tipo de espacio requerido y stack de software requerido por sección), Horario y Matrícula (con el flag de movilidad reducida).
- Alumno, FichaMédica, Docente y Cuenta (rol, usuario, clave con hash y `debe_cambiar_clave`); Alumno y Docente enlazan su cuenta con `cuenta_id`.
- Asignación (con estado y huella de entrada), AsignaciónEspacio, Alerta, AlertaAsignaciónAfectada, Incidencia y RegistroAuditoría.

**Decisiones de diseño:**
- Un solo modelo para aulas y laboratorios, con ramas condicionadas por `tipo`, en vez de dos jerarquías de tablas.
- Los cambios de software y PCs no sobrescriben el estado anterior: cada cambio queda en HistorialEspacio.
- Una sección tiene como máximo una asignación VIGENTE o ESCALADA; las anteriores pasan a HISTORICA.
- Las restricciones que Prisma no declara (CHECK, unicidades compuestas) se escriben como SQL dentro de la migración.

**Fuera de alcance:** La relación de contigüidad y su seed (Issue 2.2) y la importación de datos (Issues 1.3 a 1.5).

**Dependencias:** Requiere el repositorio del Issue 1.1. Lo consumen prácticamente todos los demás issues.

**Criterios de aceptación:**
- [ ] Diagrama entidad-relación
- [ ] Migraciones iniciales creadas
- [ ] Campo `tipo` en Espacio (`AULA_TEORICA` | `LABORATORIO`)
- [ ] Campo de aforo nominal por espacio (editable individualmente), aplicable a ambos tipos
- [ ] Campo de PCs malogradas vigentes por espacio, versionable mediante HistorialEspacio, restringido a `LABORATORIO`
- [ ] Campo de software instalado por espacio, versionable mediante HistorialEspacio, restringido a `LABORATORIO`
- [ ] Campo de tipo de espacio requerido y de stack de software requerido en Sección (por sección, no por curso)
- [ ] Campo `identificador` en Espacio (nombre o código visible, único dentro del pabellón)
- [ ] Tabla de historial de cambios de software y PCs (HistorialEspacio)
- [ ] Tabla de responsables de laboratorio por cuenta de Jefatura (EspacioResponsable)
- [ ] Cuenta con rol, clave con hash y `debe_cambiar_clave`; `cuenta_id` en Alumno y Docente
- [ ] Campo `huella_entrada` y estados VIGENTE / ESCALADA / HISTORICA en Asignación
- [ ] Restricciones de unicidad que permiten importaciones re-ejecutables (Curso, Sección, Horario, Matrícula, Alumno y Docente)
- [ ] Documento de Modelo de Datos entregado (entidades, campos, restricciones y ER)

**Labels:** `epic:setup`, `setup`, `database`, `docs`

---

### Issue 1.3 — Importar cursos y secciones
**Milestone:** Sprint 1 · **Rol:** BI

**Contexto:** Cursos y secciones son la base de todo lo demás: sin ellos no hay horarios, matrículas ni asignaciones. Vienen de un sistema fuente que no se integra en vivo, así que entran por archivo (RF-13).

**Descripción:** Permite cargar, mediante el botón manual de importación, los cursos y secciones del periodo. Por cada sección se declara el docente, el tipo de espacio requerido (aula teórica o laboratorio) y, si es laboratorio, el stack de software que necesita. El stack se define por sección, porque puede depender del pedido de cada docente.

**Entradas y salida:** Un archivo CSV o JSON. Cursos: código y nombre. Secciones: código de curso, código de sección, periodo, código de docente, tipo de espacio requerido y stack de software. Salida: cursos y secciones persistidos y un reporte de filas aceptadas y rechazadas.

**Cómo funciona:**
- Lee el archivo y valida cada fila con Zod antes de escribir nada.
- Si alguna fila es inválida, rechaza el archivo completo y reporta todas las filas con error, sin persistir datos parciales.
- Inserta o actualiza por clave única (código de curso; curso + código de sección + periodo), de modo que reimportar el mismo archivo no duplica.
- Marca el periodo del archivo como periodo vigente del sistema, que usan las consultas del alumno y del docente.

**Casos borde:** Sección que referencia un docente inexistente; tipo de espacio inválido; stack de software en una sección de aula (se ignora y se advierte); cursos repetidos dentro del mismo archivo; archivo vacío.

**Fuera de alcance:** Horarios (Issue 1.4), matrículas (Issue 1.5) y la pantalla de carga (Issue 1.9).

**Dependencias:** Requiere el esquema del Issue 1.2 y los docentes cargados (Issue 1.8).

**Criterios de aceptación:**
- [ ] Acepta un archivo CSV y/o JSON con cursos y secciones (docente, tipo de espacio requerido y, si es laboratorio, stack de software requerido por sección)
- [ ] Valida la entrada antes de persistir y reporta errores de forma clara, sin persistir datos parciales
- [ ] Es re-ejecutable: correr la importación dos veces con el mismo archivo no duplica registros
- [ ] Es un flujo de carga independiente de los Issues 1.4 y 1.5 (archivo y botón propios, no una sola pantalla combinada) — ver Issue 1.9
- [ ] Rechaza secciones que referencien un docente inexistente, con mensaje claro
- [ ] Marca el periodo importado como periodo vigente del sistema

**Labels:** `epic:setup`, `setup`, `database`

---

### Issue 1.4 — Importar horarios
**Milestone:** Sprint 1 · **Rol:** BI

**Contexto:** Los horarios son un dato de entrada fijo: el sistema nunca los modifica (restricción del proyecto). Sirven para calcular disponibilidad y solapes.

**Descripción:** Permite cargar los horarios de cada sección importada en el Issue 1.3, en un archivo separado.

**Casos borde:** Hora de fin menor o igual a la de inicio; día de la semana inválido; sesiones repetidas de la misma sección; sección inexistente.

**Dependencias:** Requiere las secciones del Issue 1.3.

**Criterios de aceptación:**
- [ ] Acepta un archivo CSV y/o JSON con horarios, referenciando secciones ya importadas
- [ ] Rechaza horarios que referencien una sección inexistente, con mensaje claro
- [ ] Es re-ejecutable sin duplicar registros
- [ ] Es un flujo de carga independiente de los Issues 1.3 y 1.5 (archivo y botón propios, no una sola pantalla combinada) — ver Issue 1.9
- [ ] Rechaza filas con hora de fin menor o igual a la hora de inicio

**Labels:** `epic:setup`, `setup`, `database`

---

### Issue 1.5 — Importar matrículas (con flag de movilidad reducida)
**Milestone:** Sprint 1 · **Rol:** BI

**Contexto:** La matrícula da el número de alumnos de cada sección (el N que necesita el motor) y el flag de movilidad reducida que activa la prioridad del Piso 1.

**Descripción:** Permite cargar la matrícula de alumnos por sección, incluyendo el flag de movilidad reducida. Si el alumno todavía no existe, lo crea con su código, nombre y correo.

**Casos borde:** Alumno matriculado dos veces en la misma sección; flag con valor no booleano; sección inexistente; alumno ya existente con un nombre distinto (se conserva el ya registrado).

**Dependencias:** Requiere las secciones del Issue 1.3.

**Criterios de aceptación:**
- [ ] Acepta un archivo CSV y/o JSON con matrículas, referenciando secciones ya importadas
- [ ] Valida el flag de movilidad reducida como campo opcional booleano
- [ ] Es re-ejecutable sin duplicar registros
- [ ] Es un flujo de carga independiente de los Issues 1.3 y 1.4 (archivo y botón propios, no una sola pantalla combinada) — ver Issue 1.9
- [ ] Crea el alumno si no existe y no lo duplica si ya existe

**Labels:** `epic:setup`, `setup`, `database`

---

### Issue 1.6 — Encadenar corrida de asignación tras una importación exitosa
**Milestone:** Sprint 3 · **Rol:** BI

**Contexto:** Sin este issue, Coordinación tendría que cargar los datos y luego pedir la asignación en un segundo paso. El proceso se diseñó para tener un solo punto de intervención humana (Documento de Arquitectura, sección 9).

**Descripción:** Al completarse con éxito las importaciones de cursos/secciones, horarios y matrículas de un periodo, dispara automáticamente la corrida de asignación en modo batch (Issue 2.11), sin requerir un segundo clic. Se agenda en Sprint 3 porque depende de que el modo batch ya exista.

**Qué es un lote:** Como los tres flujos de carga son independientes (Issue 1.9), un lote se define por periodo: está completo cuando cursos/secciones, horarios y matrículas de ese periodo tienen al menos una importación exitosa. Desde ese momento, cada importación exitosa posterior de cualquiera de los tres dispara una nueva corrida, que es idempotente (Issue 2.11).

**Dependencias:** Usa el Issue 2.11. La corrida a demanda desde la API es el Issue 2.15.

**Criterios de aceptación:**
- [ ] Cuando el periodo ya tiene sus tres importaciones exitosas, cada nueva importación exitosa dispara automáticamente el Issue 2.11
- [ ] Si una importación falla, no se dispara la corrida de asignación

**Labels:** `epic:setup`, `setup`

---

### Issue 1.7 — Registro masivo de alumnos con credenciales de acceso
**Milestone:** Sprint 2 · **Rol:** BI

**Contexto:** La consulta pública por código no requiere sesión, pero el horario completo, los cursos y el perfil sí. Para eso cada alumno necesita una cuenta que crea Coordinación Académica (no hay autorregistro).

**Descripción:** Extiende el import de matrículas (Issue 1.5) para incluir la credencial de acceso inicial (código + clave) de cada alumno. El alumno no se autorregistra: Coordinación Académica lo da de alta al importar el lote. Complementa el alta individual del Issue 4.17.

**Cómo funciona:**
- La cuenta se crea con rol ALUMNO, usuario igual al código de alumno y la clave guardada con hash (bcrypt).
- Si el archivo no trae clave, se genera una inicial.
- La cuenta nace con `debe_cambiar_clave = true`: el alumno debe cambiar la clave en su primer ingreso (Issue 4.21).
- Reimportar no modifica las cuentas existentes.

**Dependencias:** Extiende la importación de matrículas (Issue 1.5). El login llega con el Issue 3.21.

**Criterios de aceptación:**
- [ ] El archivo de matrículas acepta una columna/campo de clave inicial por alumno
- [ ] Genera una clave inicial válida si el archivo no la trae, sin bloquear la importación
- [ ] Es re-ejecutable sin duplicar ni sobrescribir credenciales ya usadas por el alumno
- [ ] Usa el Issue 1.5, no reimplementa la importación de matrículas
- [ ] Las cuentas se crean con `debe_cambiar_clave = true`

**Labels:** `epic:setup`, `setup`, `database`

---

### Issue 1.8 — Registro masivo de docentes con credenciales de acceso
**Milestone:** Sprint 1 · **Rol:** BI

**Contexto:** Cada sección tiene un docente, y los docentes deben existir antes de importar las secciones (Issue 1.3). Por eso este issue va en el Sprint 1, aunque el login de docente llegue después.

**Descripción:** Permite a Coordinación Académica dar de alta docentes en bloque (nombre, correo institucional, código de docente, departamento) junto con su credencial de acceso inicial. El docente no se autorregistra. Complementa el alta individual del Issue 4.18.

**Cómo funciona:**
- Valida cada fila (nombre, correo institucional, código de docente y departamento) con Zod.
- Crea el docente y su cuenta con rol DOCENTE: usuario igual al correo institucional y clave con hash (bcrypt).
- La cuenta nace con `debe_cambiar_clave = true`.
- Reimportar no duplica docentes ni modifica cuentas existentes.

**Notas técnicas:** Crear la cuenta solo necesita la tabla Cuenta (Issue 1.2) y bcrypt; no necesita el login.

**Dependencias:** Requiere el esquema del Issue 1.2. El login de docente llega con el Issue 7.1.

**Criterios de aceptación:**
- [ ] Acepta un archivo CSV y/o JSON con los docentes del periodo y su clave inicial
- [ ] Valida la entrada y rechaza filas con campos obligatorios faltantes, sin persistir datos parciales
- [ ] Es re-ejecutable sin duplicar registros
- [ ] Las cuentas se crean con `debe_cambiar_clave = true`

**Labels:** `epic:setup`, `setup`, `database`

---

### Issue 1.9 — Componente UI: pantallas de importación de datos maestros (3 flujos separados)
**Milestone:** Sprint 4 · **Rol:** FE

**Contexto:** Coordinación carga los datos maestros por partes y necesita ver el resultado de cada carga: qué se aceptó, qué se rechazó y por qué.

**Descripción:** Construye la UI de importación para Coordinación Académica, con 3 flujos de carga independientes y re-ejecutables por separado — cursos/secciones (Issue 1.3), horarios (Issue 1.4) y matrículas (Issue 1.5) —, cada uno con su propio archivo y botón. El diseño actual en Figma ("Importar Datos Maestros") solo contempla un único flujo combinado y necesita rediseñarse antes de implementarse; no construir directamente sobre esa pantalla sin antes ajustarla.

**Notas técnicas:** Muestra el reporte de errores por fila que devuelve el backend; no inventa mensajes propios.

**Dependencias:** Usa los importadores de los Issues 1.3, 1.4 y 1.5, y se apoya en el Documento de Diseño (Issue 6.6).

**Criterios de aceptación:**
- [ ] Expone 3 zonas de carga independientes (o un selector de tipo de importación reutilizando la misma pantalla), una por cada Issue 1.3/1.4/1.5
- [ ] Cada flujo muestra su propio estado de éxito/error sin afectar a los otros dos
- [ ] No asume que los 3 archivos se suben juntos en un solo envío

**Labels:** `epic:setup`, `setup`, `frontend`

---

### Issue 1.10 — Configurar el despliegue (Vercel, Render y Supabase)
**Milestone:** Sprint 2 · **Rol:** BI

**Contexto:** El sistema se despliega en capas gratuitas, en un solo entorno de demostración (Documento de Arquitectura, sección 5). Hoy nadie despliega: el Issue 5.10b bloquea el despliegue si falla un gate, pero ningún issue lo realiza.

**Descripción:** Deja el sistema publicado y con despliegue automático desde la rama principal.

**Cómo funciona:**
- **Supabase:** el proyecto se usa solo como Postgres. Se habilita RLS en todas las tablas sin políticas y se obtienen dos cadenas de conexión: el pooler para la aplicación y la directa para las migraciones.
- **Render:** un servicio web con el backend, con sus variables de entorno (conexiones, secreto de JWT y dominio permitido por CORS) y un endpoint de salud.
- **Vercel:** el frontend, en cuanto exista la primera vista.
- **GitHub Actions:** un job que, tras pasar los checks, aplica las migraciones y publica el backend.

**Fuera de alcance:** Staging separado, balanceo de carga, réplicas y backups automatizados.

**Notas técnicas:** En el Sprint 2 solo se despliegan el backend y la base. El backend gratuito puede tardar hasta un minuto en responder tras un periodo de inactividad, y Supabase se pausa tras una semana sin uso: ambas limitaciones se documentan.

**Dependencias:** Requiere los Issues 1.1, 1.2 y 5.10a.

**Criterios de aceptación:**
- [ ] El backend en Render responde 200 en el endpoint de salud
- [ ] La base en Supabase tiene las migraciones aplicadas y RLS habilitado en todas las tablas
- [ ] Las migraciones se aplican desde el pipeline con la conexión directa, y la aplicación usa la del pooler
- [ ] El despliegue solo corre en la rama principal y después de pasar los checks
- [ ] CORS acepta únicamente el dominio del frontend
- [ ] Ningún secreto está en el repositorio; las variables necesarias están en `.env.example`
- [ ] El README documenta las URLs, cómo reactivar Supabase, cómo calentar Render y cómo reconstruir la base con el seed (Issue 5.17)

**Labels:** `epic:setup`, `infra`, `ci-cd`

---


## ⚙️ Épica: Motor de Reglas — Asignación de Espacios (Aulas y Laboratorios)
`epic:motor-asignacion`

Motor único aplicado por igual a aulas teóricas y laboratorios; el `tipo` de espacio (Issue 1.2) determina qué ramas de cada función se ejecutan (p. ej. descuento de PCs y validación de software solo corren para `LABORATORIO`).

### Issue 2.1 — Calcular capacidad real de un espacio
**Milestone:** Sprint 1 · **Rol:** BM

**Contexto:** Un aula asignada a un curso que excede su aforo, o un laboratorio con PCs malogradas que todavía se cuentan como asientos, son justo los problemas que origina este proyecto. La capacidad real es la base de la regla más importante del motor.

**Descripción:** Función pura que calcula la capacidad real de un espacio. Si `tipo = LABORATORIO`: aforo nominal menos PCs malogradas vigentes. Si `tipo = AULA_TEORICA`: aforo nominal íntegro (no hay PCs que descontar).

**Entradas y salida:** Recibe un espacio (tipo, aforo nominal y, si es laboratorio, PCs malogradas vigentes) y devuelve un entero mayor o igual a 0.

**Casos borde:** Laboratorio con 0 PCs malogradas; laboratorio con todas las PCs malogradas (capacidad 0, nunca negativa); aula con el campo de PCs vacío (no se lee); aforo editado a un valor menor que las PCs malogradas.

**Notas técnicas:** El cálculo es una función pura sobre los datos del espacio; una capa fina lee el espacio por su ID. Se reutiliza en la alerta de capacidad (Issue 4.4) y en el estado de equipos del docente (Issue 7.4).

**Dependencias:** Usa el esquema del Issue 1.2.

**Criterios de aceptación:**
- [ ] Función pura que reciba el ID de un espacio y devuelva su capacidad real, ramificando según `tipo`
- [ ] Maneja casos borde de laboratorio (0 PCs malogradas, todas las PCs malogradas → capacidad real 0, nunca un valor negativo)
- [ ] Para `AULA_TEORICA`, la función nunca intenta leer PCs malogradas (campo no aplicable) y retorna directamente el aforo nominal
- [ ] Lee el aforo nominal propio del espacio (Issue 1.2), no asume un valor fijo
- [ ] **DoD:** no se cierra hasta que el Issue 5.1 pase en verde en CI

**Labels:** `epic:motor-asignacion`, `core`, `algoritmo`

---

### Issue 2.2 — Definir esquema y sembrar datos de contigüidad entre espacios
**Milestone:** Sprint 1 · **Rol:** BM

**Contexto:** El motor solo puede formar bloques con espacios que estén puerta con puerta. Esa información no viene de ningún archivo de importación: se carga una sola vez a partir del plano real del edificio.

**Descripción:** Modela en base de datos qué espacios son contiguos entre sí y siembra los espacios y las contigüidades reales del edificio de 3 pisos, aulas teóricas y laboratorios.

**Cómo funciona:**
- Cada relación A–B se guarda en ambas direcciones, o se consulta de forma simétrica.
- Una validación rechaza contigüidades entre espacios de distinto tipo.
- El seed vive en un script reutilizable, que también usa el Issue 5.17.

**Casos borde:** Espacios sin ninguna contigüidad (forman bloques de un solo espacio); contigüidades duplicadas o contradictorias; espacios que se agregan después (su contigüidad se edita en el Issue 4.15).

**Dependencias:** Requiere el modelo del Issue 1.2.

**Criterios de aceptación:**
- [ ] Tabla/relación de contigüidad modelada (simétrica: si A-B, entonces B-A)
- [ ] La relación de contigüidad solo se permite entre espacios del mismo `tipo` (una validación rechaza una contigüidad aula-laboratorio)
- [ ] Datos sembrados para el edificio completo, incluyendo aulas y laboratorios
- [ ] Validación de que no hay contigüidades contradictorias en el seed
- [ ] Espacios sembrados con tipo, pabellón, piso, identificador, aforo, PCs malogradas y software instalado
- [ ] El seed es idempotente: correrlo dos veces no duplica espacios ni relaciones

**Labels:** `epic:motor-asignacion`, `database`

---

### Issue 2.3 — Implementar función de consulta de espacios contiguos
**Milestone:** Sprint 1 · **Rol:** BM

**Contexto:** El algoritmo de búsqueda de bloque (Issue 2.5) y la ruta al aula (Issue 3.14) necesitan saber qué espacios son vecinos.

**Descripción:** Función pura que, dado un ID de espacio, devuelve la lista de espacios contiguos del mismo tipo.

**Casos borde:** Espacio sin vecinos (devuelve lista vacía, no error); ID de espacio inexistente (error explícito).

**Dependencias:** Usa las relaciones del Issue 2.2.

**Criterios de aceptación:**
- [ ] Recibe un ID de espacio, devuelve lista de IDs contiguos
- [ ] Devuelve lista vacía (no error) si el espacio no tiene contiguos registrados
- [ ] Funciona igual para `AULA_TEORICA` y `LABORATORIO`
- [ ] **DoD:** no se cierra hasta que el Issue 5.2 pase en verde en CI

**Labels:** `epic:motor-asignacion`, `core`, `algoritmo`

---

### Issue 2.4 — Calcular disponibilidad de espacios por horario (no doble reserva)
**Milestone:** Sprint 1 · **Rol:** BM

**Contexto:** Un espacio nunca se asigna dos veces en la misma franja. La disponibilidad se calcula al vuelo contra las asignaciones vigentes; no se guarda como estado.

**Descripción:** Función pura que, dado un horario y un tipo de espacio requerido, devuelve la lista de espacios de ese tipo disponibles (sin solape con asignaciones vigentes). Se calcula al vuelo.

**Cómo funciona:**
- Toma las asignaciones VIGENTES que usan cada espacio y sus horarios (vía Sección → Horario).
- Dos horarios se solapan si son del mismo día y sus rangos se cruzan; un rango que termina justo cuando otro empieza no se solapa.

**Casos borde:** Solape parcial; mismo horario en distinto día (no se solapa); espacio sin asignaciones; asignaciones HISTORICA o ESCALADA (no ocupan el espacio).

**Notas técnicas:** Consulta SQL con índices por espacio, día y hora. La usan el algoritmo de bloque (Issue 2.5), la vista del docente (Issue 7.3) y el mapa de ocupación (Issue 4.11).

**Dependencias:** Usa el modelo del Issue 1.2.

**Criterios de aceptación:**
- [ ] Recibe un horario y un tipo de espacio, devuelve la lista de espacios de ese tipo sin solape con asignaciones vigentes
- [ ] Detecta solapes parciales de horario
- [ ] Un espacio nunca aparece como disponible si tiene una asignación vigente en franja que se solapa
- [ ] **DoD:** no se cierra hasta que el Issue 5.3 pase en verde en CI

**Labels:** `epic:motor-asignacion`, `core`, `algoritmo`

---

### Issue 2.5 — Implementar algoritmo de búsqueda de bloque contiguo con capacidad suficiente
**Milestone:** Sprint 1 · **Rol:** BM

**Contexto:** Cuando un curso no cabe en un solo espacio (40 a 60 alumnos), el docente necesita varios espacios contiguos para supervisar a todo su grupo. Este algoritmo decide qué combinaciones de espacios son candidatas. Las demás reglas (software, accesibilidad y cercanía) actúan después, sobre la lista que produce.

**Descripción:** Dada una sección, arma todos los bloques mínimos de espacios contiguos del tipo requerido, disponibles en su horario, cuya capacidad real sume al menos N alumnos. Funciona igual para aulas y laboratorios, pero nunca mezcla ambos tipos en un bloque.

**Entradas y salida:** Número de alumnos N, tipo de espacio requerido y horario. Devuelve una lista de bloques candidatos, cada uno con sus espacios y su capacidad total, o el estado explícito «sin bloque encontrado».

**Cómo funciona (propuesta):**
- Pide al Issue 2.4 los espacios disponibles del tipo requerido.
- Desde cada espacio disponible, expande el bloque sumando vecinos contiguos disponibles (Issue 2.3) hasta cubrir N.
- Descarta el bloque si se acaban los vecinos antes de llegar a N.
- Elimina duplicados: el mismo conjunto de espacios encontrado desde puntos de partida distintos.
- Ordena por menos espacios primero y luego por identificador, para que el resultado sea idéntico entre corridas (RF-06).

**Casos borde:** Un solo espacio alcanza; ningún conjunto contiguo llega a N; espacios contiguos pero ocupados en ese horario (no cuentan y no se puentea por ellos); laboratorio con capacidad real 0.

**Fuera de alcance:** Software (Issue 2.7), accesibilidad (Issue 2.9), cercanía (Issues 2.13 y 2.14) y confirmar la asignación (Issue 2.10).

**Notas técnicas:** Función pura en TypeScript que no accede a la base: recibe los datos ya consultados. El edificio tiene unas decenas de espacios, así que basta una búsqueda exhaustiva, con un tope configurable al tamaño del bloque.

**Dependencias:** Usa los Issues 2.1, 2.3 y 2.4; no reimplementa su propia noción de capacidad, contigüidad ni disponibilidad.

**Criterios de aceptación:**
- [ ] El algoritmo expande el bloque (siempre contiguos y del mismo tipo) hasta que la suma de capacidad real ≥ N
- [ ] Descarta combinaciones no contiguas aunque estén en el mismo piso
- [ ] Descarta cualquier combinación que mezcle `AULA_TEORICA` con `LABORATORIO` dentro del mismo bloque
- [ ] Solo considera espacios reportados como disponibles por el Issue 2.4 para el tipo requerido
- [ ] Si se agotan los espacios contiguos disponibles del tipo requerido sin alcanzar la capacidad requerida, retorna estado explícito "sin bloque encontrado"
- [ ] Usa los Issues 2.1, 2.3 y 2.4, no reimplementa su propia noción de capacidad, contigüidad ni disponibilidad
- [ ] Devuelve una lista de bloques candidatos, no solo uno, en orden determinista
- [ ] No devuelve bloques duplicados
- [ ] **DoD:** no se cierra hasta que el Issue 5.4 pase en verde en CI

**Labels:** `epic:motor-asignacion`, `core`, `algoritmo`

---

### Issue 2.6 — Función: ¿un laboratorio individual cumple el stack de software requerido?
**Milestone:** Sprint 2 · **Rol:** BM

**Contexto:** Un laboratorio sin el software del curso no sirve aunque tenga capacidad. Esta función responde si un laboratorio individual cumple el stack requerido.

**Descripción:** Función pura de comparación entre stack requerido e instalado, devuelve boolean y detalle de lo faltante. Solo se invoca para espacios `tipo = LABORATORIO`.

**Casos borde:** Stack requerido vacío (siempre cumple); nombres con mayúsculas o espacios distintos; stack instalado nulo (se trata como vacío).

**Notas técnicas:** Compara nombres normalizados. Las versiones se tratan como parte del nombre (p. ej. «Python 3.12»).

**Dependencias:** La usa el Issue 2.7 y, a través de él, la alerta del Issue 4.3.

**Criterios de aceptación:**
- [ ] Recibe stack requerido + stack instalado, devuelve boolean + lista de software faltante
- [ ] Maneja stack requerido vacío (siempre cumple)
- [ ] Compara nombres de software sin distinguir mayúsculas ni espacios sobrantes
- [ ] **DoD:** no se cierra hasta que el Issue 5.5 (caso "un laboratorio") pase en verde en CI

**Labels:** `epic:motor-asignacion`, `core`, `algoritmo`

---

### Issue 2.7 — Función: ¿un bloque completo cumple el stack de software?
**Milestone:** Sprint 2 · **Rol:** BM

**Contexto:** Un bloque de laboratorios solo es válido si todos sus laboratorios cumplen el stack. Para aulas teóricas el control se omite: no tienen PCs ni software.

**Descripción:** Si el bloque es de `LABORATORIO`, usa el Issue 2.6 sobre cada laboratorio del bloque candidato y rechaza el bloque si al menos uno falla, registrando el motivo para trazabilidad (lo consume el Issue 4.3). Si el bloque es de `AULA_TEORICA`, retorna "cumple" automáticamente sin evaluar nada, ya que las aulas no tienen software.

**Casos borde:** Bloque de un solo laboratorio; bloque donde falla más de un laboratorio (se registran todos); bloque de aulas (cumple de inmediato, sin leer campos inexistentes).

**Dependencias:** Usa el Issue 2.6. Lo consume la alerta del Issue 4.3.

**Criterios de aceptación:**
- [ ] Para bloques de laboratorios: rechaza el bloque completo si al menos un laboratorio no cumple
- [ ] Para bloques de laboratorios: registra qué laboratorio y qué software faltó
- [ ] Para bloques de aulas teóricas: retorna "cumple" de inmediato, sin invocar el Issue 2.6 ni acceder a un campo de software inexistente
- [ ] Usa el Issue 2.6, no duplica esa lógica
- [ ] **DoD:** no se cierra hasta que el Issue 5.5 (casos "bloque completo" de laboratorio y de aula) pase en verde en CI

**Labels:** `epic:motor-asignacion`, `core`, `algoritmo`

---

### Issue 2.8 — Detectar flag de movilidad reducida desde la matrícula
**Milestone:** Sprint 2 · **Rol:** BM

**Contexto:** El flag vive en la matrícula de cada alumno, no en el alumno. Basta con que un alumno del grupo lo tenga para que todo el grupo se priorice en el Piso 1.

**Descripción:** Función que revisa el registro de matrícula de un grupo y determina si incluye alumnos con movilidad reducida.

**Dependencias:** Usa el modelo del Issue 1.2 y los datos de la importación del Issue 1.5.

**Criterios de aceptación:**
- [ ] Devuelve verdadero si al menos un alumno del grupo tiene el flag activo
- [ ] Maneja el caso de grupo sin ningún alumno con el flag

**Labels:** `epic:motor-asignacion`, `core`, `accesibilidad`

---

### Issue 2.9 — Priorizar bloques candidatos hacia Piso 1 cuando aplica el flag
**Milestone:** Sprint 2 · **Rol:** BM

**Contexto:** Un alumno con movilidad reducida no debe recibir un aula en un piso alto si existe una en el Piso 1. Como hay ascensor, si el Piso 1 no tiene un bloque válido la asignación puede ir a otro piso, pero el fallback queda documentado.

**Descripción:** Usando el Issue 2.8, reordena la lista de bloques candidatos del Issue 2.5 para que los del Piso 1 se evalúen primero. Aplica igual para bloques de aulas y de laboratorios.

**Casos borde:** Ningún bloque candidato en el Piso 1 (se usa otro piso y se documenta); flag inactivo (el orden no cambia); bloque que abarca más de un piso.

**Dependencias:** Usa el Issue 2.8 y la lista de candidatos del Issue 2.5.

**Criterios de aceptación:**
- [ ] Bloques en Piso 1 quedan primeros en el orden cuando el flag está activo, sea el bloque de aulas o de laboratorios
- [ ] Si no hay bloque disponible en Piso 1, se documenta el fallback usado
- [ ] Sin el flag activo, el orden no se altera
- [ ] **DoD:** no se cierra hasta que el Issue 5.6 pase en verde en CI

**Labels:** `epic:motor-asignacion`, `core`, `algoritmo`, `accesibilidad`

---

### Issue 2.10 — Orquestar el camino feliz para una sección individual
**Milestone:** Sprint 3 · **Rol:** BM

**Contexto:** Es el corazón del motor: encadena las reglas sueltas en el orden correcto para asignar una sección y decide si se confirma o se escala.

**Descripción:** Integra 2.4 → 2.5 → 2.7 → 2.9 → 2.14 en secuencia para una sola sección (teórica o práctica), en el caso en que sí existe un bloque que cumple todo. El tipo de espacio requerido lo determina la sección y filtra cada paso. Es también el modo por sección, para altas tardías o cambios puntuales de matrícula.

**Cómo funciona:**
- Calcula la huella de entrada de la sección: número de alumnos, movilidad reducida, horarios y stack requerido.
- Si ya existe una asignación VIGENTE con la misma huella, la mantiene y termina.
- Obtiene los candidatos de 2.5, descarta los que no cumplen software (2.7), prioriza el Piso 1 si hay movilidad reducida (2.9) y elige por cercanía a las secciones paralelas (2.14).
- Verifica la capacidad real final del bloque elegido.
- Persiste la asignación como VIGENTE, con sus espacios y su huella. La anterior, si existía, pasa a HISTORICA.
- Si no hay ningún bloque válido, delega en el escalamiento (Issue 2.12).

**Casos borde:** Sección sin alumnos matriculados; sección cuyos horarios cambiaron entre corridas; sección ESCALADA que ahora sí tiene un bloque válido.

**Fuera de alcance:** La corrida de todo el periodo (Issue 2.11) y su disparo desde la API (Issue 2.15).

**Dependencias:** Usa los Issues 2.4, 2.5, 2.7, 2.9, 2.14 y 2.12.

**Criterios de aceptación:**
- [ ] Devuelve una asignación válida cuando existe un bloque que cumple capacidad real, contigüidad, software (si aplica) y accesibilidad
- [ ] Funciona igual para una sección que requiere aula teórica que para una que requiere laboratorio
- [ ] Aplica la priorización de cercanía entre secciones paralelas (Issue 2.14) como último paso antes de confirmar
- [ ] Es idempotente: si la sección ya tiene una asignación VIGENTE con la misma huella de datos de entrada, la mantiene; si cambió, la anterior pasa a HISTORICA y se calcula una nueva (o queda ESCALADA si ya no hay bloque válido)
- [ ] Persiste la asignación con sus espacios y su huella de entrada, y registra el evento para auditoría (Issue 5.11)
- [ ] **DoD:** no se cierra hasta que el Issue 5.7 (caso feliz, sección individual, aula y laboratorio) pase en verde en CI

**Labels:** `epic:motor-asignacion`, `core`, `algoritmo`

---

### Issue 2.11 — Modo batch: corrida de asignación de todas las secciones del periodo
**Milestone:** Sprint 3 · **Rol:** BM

**Contexto:** Coordinación necesita asignar todo el periodo de una vez y con un resultado predecible. Es el proceso principal del sistema (Proceso 1 del documento de alcance).

**Descripción:** Usa el Issue 2.10 sobre cada sección del periodo —teóricas y prácticas por igual— en orden determinista, y entrega un resumen final (asignadas vs. escaladas). Cada resultado se registra para auditoría (usa el Issue 5.11).

**Cómo funciona:**
- Ordena las secciones de forma determinista: primero las que tienen alumnos con movilidad reducida, luego por mayor número de alumnos y por último por id de sección (orden propuesto; se puede ajustar).
- Aplica el Issue 2.10 a cada sección, sin reimplementar la orquestación.
- Devuelve un resumen con las secciones asignadas, mantenidas y escaladas, desglosado por tipo de espacio.
- Registra cada resultado para auditoría (Issue 5.11).

**Casos borde:** Periodo sin secciones; corrida repetida sin cambios; dos corridas simultáneas (lo evita el Issue 2.15).

**Dependencias:** Usa el Issue 2.10. Lo disparan el Issue 1.6 (automático) y el Issue 2.15 (a demanda).

**Criterios de aceptación:**
- [ ] Procesa todas las secciones del periodo (teóricas y prácticas) en un orden determinista (primero movilidad reducida, luego mayor número de alumnos y luego id de sección), igual en corridas repetidas
- [ ] Entrega un resumen con conteo de secciones asignadas y escaladas, desglosado por tipo de espacio
- [ ] Es idempotente: una segunda corrida con los mismos datos mantiene las asignaciones VIGENTES, no crea nuevas y no duplica las ESCALADAS, que se reevalúan en cada corrida
- [ ] Usa el Issue 2.10 por sección, no reimplementa la orquestación individual

**Labels:** `epic:motor-asignacion`, `core`, `algoritmo`

---

### Issue 2.12 — Implementar escalamiento a revisión manual
**Milestone:** Sprint 3 · **Rol:** BM

**Contexto:** El sistema no debe forzar una asignación inválida ni mover horarios. Cuando no hay un bloque válido, el caso queda en manos de una persona.

**Descripción:** Camino de excepción del Issue 2.10: cuando ningún bloque disponible cumple simultáneamente capacidad real, contigüidad y software (si aplica), marca el caso como "requiere revisión manual", con el motivo. Aplica igual a secciones que requieren aula que a las que requieren laboratorio.

**Cómo funciona:**
- Guarda la asignación con estado ESCALADA y el motivo (qué criterio no se pudo cumplir).
- Una sección ESCALADA no ocupa ningún espacio.
- Se reevalúa en cada corrida: si ahora existe un bloque válido, pasa a VIGENTE.
- Aparece en la lista de secciones escaladas del panel (Issue 4.22).

**Dependencias:** Es el camino de excepción del Issue 2.10.

**Criterios de aceptación:**
- [ ] No asigna un bloque que no cumple todos los criterios, bajo ninguna circunstancia, sea aula o laboratorio
- [ ] El estado de "revisión manual" incluye el motivo (qué criterio no se pudo cumplir)
- [ ] **DoD:** no se cierra hasta que el Issue 5.7 (caso de escalamiento) pase en verde en CI

**Labels:** `epic:motor-asignacion`, `core`, `algoritmo`

---

### Issue 2.13 — Función: evaluar cercanía entre un bloque candidato y las secciones paralelas ya asignadas
**Milestone:** Sprint 2 · **Rol:** BM

**Contexto:** Las secciones paralelas de un mismo curso suelen quedar lejos entre sí, lo que dificulta la coordinación de evaluaciones y contenidos entre docentes.

**Descripción:** Función pura que, dado un bloque candidato y el curso de la sección, consulta las asignaciones vigentes de las demás secciones paralelas del mismo curso en el periodo, y calcula una puntuación de cercanía (mismo piso = mejor puntuación, piso adyacente = puntuación intermedia, piso no adyacente = peor puntuación). Si el curso no tiene otras secciones paralelas asignadas aún, la función retorna una puntuación neutra (no penaliza ni prioriza).

**Cómo funciona:** Mismo piso puntúa mejor, piso adyacente puntúa intermedio y piso no adyacente puntúa peor. Sin secciones paralelas ya asignadas, la puntuación es neutra.

**Notas técnicas:** Con más de un pabellón, conviene que el mismo pabellón puntúe mejor que otro (propuesta a confirmar al implementar).

**Dependencias:** Usa las asignaciones vigentes de las demás secciones del mismo curso.

**Criterios de aceptación:**
- [ ] Recibe un bloque candidato + ID de curso, devuelve una puntuación de cercanía respecto a las secciones paralelas ya asignadas de ese curso
- [ ] Sin secciones paralelas asignadas aún, retorna puntuación neutra en vez de fallar
- [ ] Funciona igual para bloques de aulas y de laboratorios
- [ ] **DoD:** no se cierra hasta que el Issue 5.16 pase en verde en CI

**Labels:** `epic:motor-asignacion`, `core`, `algoritmo`

---

### Issue 2.14 — Integrar criterio de cercanía entre secciones paralelas en la selección de bloque
**Milestone:** Sprint 3 · **Rol:** BM

**Contexto:** La cercanía es un desempate, no una regla de descarte: si el único bloque válido queda lejos de las otras secciones, se usa igual.

**Descripción:** Entre los bloques candidatos que ya superaron capacidad real, contigüidad, software (si aplica) y accesibilidad (Issue 2.9), usa la puntuación del Issue 2.13 para elegir el bloque más cercano a las secciones paralelas ya asignadas del mismo curso. Es un criterio de desempate/priorización: nunca descarta el único bloque válido restante solo por baja cercanía.

**Dependencias:** Usa el Issue 2.13. Se ejecuta como último paso del Issue 2.10.

**Criterios de aceptación:**
- [ ] Entre dos o más bloques igualmente válidos, elige el de mejor puntuación de cercanía (Issue 2.13)
- [ ] Si solo queda un bloque válido, lo usa sin importar su puntuación de cercanía
- [ ] No aplica antes que los controles de capacidad, contigüidad, software y accesibilidad — solo desempata entre los que ya los cumplen
- [ ] Usa el Issue 2.13, no reimplementa el cálculo de puntuación
- [ ] **DoD:** no se cierra hasta que el Issue 5.7 (casos de desempate por cercanía) pase en verde en CI

**Labels:** `epic:motor-asignacion`, `core`, `algoritmo`

---

### Issue 2.15 — Endpoint HTTP: disparar la asignación a demanda
**Milestone:** Sprint 3 · **Rol:** BI

**Contexto:** RF-15 y el documento de alcance piden que la asignación pueda dispararse también de forma manual, y que exista el modo por sección para altas tardías. Hoy el Issue 1.6 solo cubre el encadenamiento automático tras una importación, y los Issues 2.10 y 2.11 son funciones sin acceso desde la web.

**Descripción:** Expone el motor por HTTP para que Coordinación Académica ejecute la corrida completa del periodo o la asignación de una sola sección, y pueda reintentar las secciones escaladas.

**Entradas y salida:** Opcionalmente el id de una sección. Sin id, ejecuta la corrida completa del periodo vigente. Devuelve el resumen (asignadas, mantenidas y escaladas) y el id de la corrida.

**Casos borde:** Corrida ya en curso (responde 409 y no lanza otra); sección inexistente (404); periodo sin datos; usuario sin rol de Coordinación (403).

**Fuera de alcance:** El botón en el panel, que se construye en el Issue 4.20.

**Notas técnicas:** Ejecuta en el mismo proceso, sin colas ni infraestructura adicional (principio de diseño: automatización de decisión, no de infraestructura).

**Dependencias:** Usa los Issues 2.10 y 2.11, y la autenticación del Issue 4.8.

**Criterios de aceptación:**
- [ ] Con un id de sección, ejecuta el Issue 2.10 solo para esa sección
- [ ] Sin id, ejecuta el Issue 2.11 sobre el periodo vigente y devuelve su resumen
- [ ] Rechaza con 409 una corrida mientras hay otra en curso
- [ ] Solo puede ejecutarlo Coordinación Académica
- [ ] Reintentar una sección ESCALADA la reevalúa con los datos actuales

**Labels:** `epic:motor-asignacion`, `backend`, `integracion`

---


## 🎓 Épica: Portal de Consulta del Estudiante
`epic:portal-estudiante`

### Issue 3.1 — Servicio: obtener asignación por código de alumno
**Milestone:** Sprint 2 · **Rol:** BI

**Contexto:** Es la consulta más frecuente del sistema: el alumno escribe su código y ve dónde le toca. Es pública (sin sesión), por eso no expone datos personales.

**Descripción:** Servicio de lógica de negocio (sin capa HTTP) que, dado un código de alumno, devuelve su asignación: tipo de espacio (aula o laboratorio), pabellón, piso, identificador(es) de espacio, horario, docente.

**Casos borde:** Alumno sin matrícula; alumno con una sección ESCALADA (la ubicación está pendiente y se informa así, en lugar de mostrar un espacio); alumno con secciones en varios espacios.

**Notas técnicas:** Solo lee asignaciones VIGENTES. La respuesta no incluye DNI, correo ni ficha médica (RNF-09).

**Dependencias:** Usa las asignaciones generadas por los Issues 2.10 y 2.11 y el modelo del Issue 1.2.

**Criterios de aceptación:**
- [ ] Devuelve los datos completos para un código válido
- [ ] Devuelve un resultado explícito de "no encontrado" para código inexistente
- [ ] Si la sección del alumno está pendiente de asignación (ESCALADA), la respuesta lo indica en lugar de un espacio

**Labels:** `epic:portal-estudiante`, `backend`, `consulta`

---

### Issue 3.2 — Endpoint HTTP: consulta por código de alumno
**Milestone:** Sprint 2 · **Rol:** BI

**Contexto:** Expone el Issue 3.1 a la web. Es el endpoint sobre el que corren las pruebas de carga (Issue 5.8): el pico del primer día de clases.

**Descripción:** Expone el Issue 3.1 como endpoint REST.

**Notas técnicas:** Ruta pública de lectura; el parámetro se valida con Zod; los errores no revelan detalles internos (RF-10).

**Dependencias:** Usa el Issue 3.1.

**Criterios de aceptación:**
- [ ] Responde 200 con los datos para código válido
- [ ] Responde con mensaje claro para código inexistente
- [ ] Usa el Issue 3.1, no reimplementa la búsqueda

**Labels:** `epic:portal-estudiante`, `backend`, `consulta`

---

### Issue 3.3 — Servicio: obtener asignación por código de curso
**Milestone:** Sprint 2 · **Rol:** BI

**Contexto:** Permite consultar por curso en lugar de por alumno, por ejemplo cuando un alumno quiere saber dónde se dicta un curso al que aún no está matriculado.

**Descripción:** Igual que el Issue 3.1 pero por código de curso, incluyendo el caso de un curso con múltiples espacios asignados (aulas o laboratorios).

**Casos borde:** Curso con varias secciones (se devuelven todas); curso con una sección en varios espacios (bloque); curso con una sección pendiente de asignación.

**Dependencias:** Usa las asignaciones de los Issues 2.10 y 2.11.

**Criterios de aceptación:**
- [ ] Devuelve los datos completos para un código de curso válido, incluyendo todos sus espacios asignados
- [ ] Devuelve un resultado explícito de "no encontrado" para código inexistente
- [ ] Si una sección del curso está pendiente de asignación (ESCALADA), la respuesta lo indica en lugar de un espacio

**Labels:** `epic:portal-estudiante`, `backend`, `consulta`

---

### Issue 3.4 — Endpoint HTTP: consulta por código de curso
**Milestone:** Sprint 2 · **Rol:** BI

**Contexto:** Expone el Issue 3.3 a la web; también entra en las pruebas de carga (Issue 5.8).

**Descripción:** Expone el Issue 3.3 como endpoint REST.

**Notas técnicas:** Ruta pública de lectura; el parámetro se valida con Zod; mensajes de error sin detalles internos (RF-10).

**Dependencias:** Usa el Issue 3.3.

**Criterios de aceptación:**
- [ ] Responde 200 con los datos para código de curso válido
- [ ] Responde con mensaje claro para código inexistente
- [ ] Usa el Issue 3.3, no reimplementa la búsqueda

**Labels:** `epic:portal-estudiante`, `backend`, `consulta`

---

### Issue 3.5 — Componente UI: formulario de búsqueda
**Milestone:** Sprint 3 · **Rol:** FE

**Contexto:** Es la puerta de entrada del portal: un único campo donde el alumno escribe su código de alumno o de curso.

**Descripción:** Componente donde el alumno ingresa su código, siguiendo el Documento de Diseño (Issue 6.6).

**Dependencias:** Se construye a partir del Documento de Diseño (Issue 6.6) y la Guía de Estilos (Issue 6.7).

**Criterios de aceptación:**
- [ ] Acepta código de alumno o de curso en el mismo campo
- [ ] Valida formato básico antes de habilitar el envío

**Labels:** `epic:portal-estudiante`, `frontend`, `consulta`

---

### Issue 3.6 — Componente UI: tarjeta de resultado
**Milestone:** Sprint 3 · **Rol:** FE

**Contexto:** Es la respuesta visible de la consulta. Debe leerse de un vistazo: dónde es la clase, en qué piso, con quién y a qué hora.

**Descripción:** Componente que muestra el resultado de la consulta: tipo de espacio, pabellón, piso, identificador(es) de espacio, horario y docente. Diferencia visualmente si el espacio es aula o laboratorio (p. ej. ícono o etiqueta). Se construye y testea con datos de ejemplo de ambos tipos.

**Casos borde:** Bloque de varios espacios (se listan todos); sección pendiente de asignación; docente sin nombre registrado.

**Dependencias:** Se construye a partir del Documento de Diseño (Issue 6.6). Se integra en el Issue 3.7.

**Criterios de aceptación:**
- [ ] Muestra correctamente los 6 campos requeridos con datos de ejemplo, tanto para aula como para laboratorio
- [ ] Maneja el estado "sin resultado" de forma clara

**Labels:** `epic:portal-estudiante`, `frontend`, `consulta`

---

### Issue 3.7 — Integrar formulario, tarjeta y endpoints en la vista de consulta
**Milestone:** Sprint 4 · **Rol:** FE

**Contexto:** Une el formulario, la tarjeta y los endpoints en la primera vista funcional del portal del estudiante.

**Descripción:** Conecta el Issue 3.5 con los Issues 3.2/3.4 y el Issue 3.6 en una vista funcional.

**Dependencias:** Usa los Issues 3.2, 3.4, 3.5 y 3.6. La prueba E2E del Issue 5.9 valida esta vista.

**Criterios de aceptación:**
- [ ] El flujo completo funciona: ingresar código → ver resultado real
- [ ] Maneja estados de carga y error de red

**Labels:** `epic:portal-estudiante`, `frontend`, `consulta`

---

### Issue 3.8 — Ajustes de diseño responsive de la vista de consulta
**Milestone:** Sprint 4 · **Rol:** FE

**Contexto:** Los alumnos consultan sobre todo desde el celular (RNF-04).

**Descripción:** Adapta la vista integrada (Issue 3.7) para móvil (RNF-04).

**Fuera de alcance:** Las demás pantallas del portal, del docente y del panel: su revisión responsive se hace en la validación manual del Issue 5.15.

**Dependencias:** Requiere la vista integrada del Issue 3.7.

**Criterios de aceptación:**
- [ ] Usable en viewport móvil sin scroll horizontal ni elementos cortados

**Labels:** `epic:portal-estudiante`, `frontend`

---

### Issue 3.9 — Auditoría y ajustes de accesibilidad de la vista de consulta
**Milestone:** Sprint 4 · **Rol:** FE

**Contexto:** Cumple RNF-05: contraste y tamaño de fuente legibles.

**Descripción:** Revisa y ajusta la vista integrada contra criterios básicos de accesibilidad (RNF-05).

**Fuera de alcance:** Las demás pantallas: su revisión de accesibilidad se hace en el Issue 5.15.

**Dependencias:** Requiere la vista integrada del Issue 3.7 y las reglas de la Guía de Estilos (Issue 6.7).

**Criterios de aceptación:**
- [ ] Contraste de texto cumple un mínimo razonable (ej. WCAG AA)
- [ ] Tamaño de fuente legible sin necesidad de zoom

**Labels:** `epic:portal-estudiante`, `frontend`, `accesibilidad`

---

### Issue 3.10 — Servicio + endpoint: horario semanal completo de un alumno
**Milestone:** Sprint 3 · **Rol:** BI

**Contexto:** Complementa la consulta puntual con el horario semanal completo, para el alumno que inició sesión.

**Descripción:** Dado un alumno autenticado, devuelve todas sus clases de la semana (curso, docente, espacio, horario), agrupadas por día. Distinto de los Issues 3.1/3.2 (consulta pública puntual por código, sin login).

**Notas técnicas:** Usa el JWT del alumno: solo devuelve sus propias sesiones.

**Dependencias:** Requiere el login de alumno del Issue 3.21.

**Criterios de aceptación:**
- [ ] Devuelve todas las sesiones de la semana del alumno, con curso, docente, espacio y horario de cada una
- [ ] Soporta vista por día y por semana completa
- [ ] Requiere autenticación de alumno (Issue 3.21)

**Labels:** `epic:portal-estudiante`, `backend`, `consulta`

---

### Issue 3.11 — Servicio + endpoint: listar cursos matriculados de un alumno
**Milestone:** Sprint 3 · **Rol:** BI

**Contexto:** Muestra todos los cursos del alumno sin que tenga que buscarlos uno por uno (RF-22).

**Descripción:** Dado un alumno autenticado, devuelve la lista completa de cursos en los que está matriculado en el periodo, con docente, horario y el próximo espacio asignado de cada uno.

**Notas técnicas:** Considera el periodo vigente (Issue 1.3). El «próximo espacio» sale de la siguiente sesión del curso a partir de la fecha y hora actuales.

**Dependencias:** Requiere el login de alumno del Issue 3.21.

**Criterios de aceptación:**
- [ ] Devuelve todos los cursos matriculados del alumno, sin necesidad de buscar cada uno por su código
- [ ] Cada curso incluye docente, horario y próximo espacio asignado
- [ ] Requiere autenticación de alumno (Issue 3.21)

**Labels:** `epic:portal-estudiante`, `backend`, `consulta`

---

### Issue 3.12 — Backend: datos personales y ficha médica del alumno
**Milestone:** Sprint 3 · **Rol:** BI

**Contexto:** El perfil del alumno incluye datos personales y una ficha médica básica. Es la información más sensible del sistema (RNF-09).

**Descripción:** Almacena y expone los datos personales del alumno (nombre, DNI, fecha de nacimiento, teléfono, dirección) y su ficha médica básica (tipo de sangre, alergias, condición especial, contacto de emergencia). Cubre RNF-09: es información sensible.

**Cómo funciona:**
- Guarda los datos personales en Alumno (DNI, fecha de nacimiento, teléfono y dirección) y la ficha médica en su propia tabla.
- Cada lectura o edición verifica que el id del token corresponda al alumno dueño del registro.

**Notas técnicas:** El DNI y la ficha médica se tratan como datos personales sensibles (Ley 29733 de protección de datos personales del Perú): no se registran en logs, no salen en ningún endpoint público y se validan con Zod.

**Dependencias:** Requiere el login de alumno del Issue 3.21 y las tablas del Issue 1.2.

**Criterios de aceptación:**
- [ ] Solo el propio alumno autenticado puede leer o editar su ficha médica
- [ ] La ficha médica nunca se expone en los endpoints de consulta pública (Issues 3.1–3.4)
- [ ] Valida formato básico de los campos (DNI, teléfono, fecha)

**Labels:** `epic:portal-estudiante`, `backend`, `database`, `privacidad`

---

### Issue 3.13 — Endpoint: exponer mapa de ocupación al portal del alumno
**Milestone:** Sprint 4 · **Rol:** BI

**Contexto:** El portal del alumno muestra qué espacios están libres, pero sin exponer datos de nadie. Por eso este endpoint es público y devuelve menos que el del panel.

**Descripción:** Expone el mapa de ocupación por piso en modo de solo lectura y sin autenticación para el portal del alumno. Devuelve únicamente el estado de cada espacio (disponible u ocupado): sin alertas y sin el detalle de curso y docente.

**Dependencias:** Usa el Issue 4.11 y no reimplementa su lógica.

**Criterios de aceptación:**
- [ ] Devuelve el estado (disponible u ocupado) de todos los espacios (aulas y laboratorios) de un piso
- [ ] No requiere autenticación (a diferencia del Issue 4.12, que sí la exige)
- [ ] Usa el Issue 4.11, no reimplementa la lógica de ocupación
- [ ] No incluye alertas ni el detalle de curso y docente

**Labels:** `epic:portal-estudiante`, `backend`, `consulta`

---

### Issue 3.14 — Algoritmo: calcular ruta de referencia hacia un espacio asignado
**Milestone:** Sprint 4 · **Rol:** BM

**Contexto:** El alumno necesita llegar a su aula. Una ruta de referencia (no geolocalización en vivo) es suficiente para el MVP y evita infraestructura de beacons.

**Descripción:** Dado el espacio asignado, arma una ruta de referencia en tres tramos: entrada del pabellón → piso (escalera o ascensor si el piso es mayor a 1) → espacios del bloque asignado, ordenados con el grafo de contigüidad del Issue 2.3. Estima el tiempo de caminata con constantes de configuración (base por pabellón, por piso y por espacio del bloque). La entrada del pabellón es un punto fijo por pabellón, marcado en el plano del piso 1 (no se guarda en la base de datos). No implica geolocalización en tiempo real (ver el documento de alcance, «Fuera de alcance»).

**Casos borde:** Espacio del piso 1 (sin tramo de cambio de piso); bloque de varios espacios; espacio sin pabellón o piso registrado.

**Notas técnicas:** La contigüidad solo relaciona espacios del mismo tipo y no cubre cambios de piso; por eso el cambio de piso es un tramo propio y no sale del grafo.

**Dependencias:** Usa el Issue 2.3. Lo expone el Issue 3.15.

**Criterios de aceptación:**
- [ ] Devuelve la ruta como una secuencia de tramos (entrada del pabellón, piso y espacios del bloque)
- [ ] Estima un tiempo de caminata aproximado a partir de constantes de configuración
- [ ] Usa el Issue 2.3 para ordenar los espacios del bloque, no reimplementa su propia noción de contigüidad
- [ ] Si el espacio no tiene pabellón o piso, devuelve el estado explícito «ruta no disponible»

**Labels:** `epic:portal-estudiante`, `core`, `algoritmo`

---

### Issue 3.15 — Endpoint: exponer ruta calculada y tiempo estimado
**Milestone:** Sprint 4 · **Rol:** BI

**Contexto:** Lleva el cálculo del Issue 3.14 a la pantalla de ruta del alumno.

**Descripción:** Expone el Issue 3.14 como endpoint REST para el portal del alumno.

**Dependencias:** Usa el Issue 3.14.

**Criterios de aceptación:**
- [ ] Responde con la ruta y el tiempo estimado para un espacio válido
- [ ] Responde con mensaje claro si la ruta no está disponible
- [ ] Usa el Issue 3.14, no reimplementa el cálculo

**Labels:** `epic:portal-estudiante`, `backend`, `consulta`

---

### Issue 3.16 — Componente UI: horario y mis cursos del alumno
**Milestone:** Sprint 4 · **Rol:** FE

**Contexto:** Son las dos vistas que más usará el alumno con sesión: su horario y sus cursos.

**Descripción:** Construye las vistas de horario (día y semana) y de cursos matriculados del alumno, siguiendo el Documento de Diseño (Issue 6.6). Se construye con datos de ejemplo.

**Dependencias:** Se construye a partir del Documento de Diseño (Issue 6.6). Se conecta con datos reales en el Issue 3.20.

**Criterios de aceptación:**
- [ ] Vista de horario alterna entre día y semana
- [ ] Vista de cursos muestra docente, horario y próximo espacio de cada curso matriculado

**Labels:** `epic:portal-estudiante`, `frontend`, `consulta`

---

### Issue 3.17 — Componente UI: perfil, datos personales, configuración y ayuda del alumno
**Milestone:** Sprint 4 · **Rol:** FE

**Contexto:** Reúne el perfil, la ficha médica, la configuración y la ayuda. La ficha médica es sensible: solo debe verse dentro de la sesión del propio alumno.

**Descripción:** Construye las vistas de perfil, datos personales (incluida la ficha médica), configuración de la app y ayuda/FAQ, siguiendo el Documento de Diseño (Issue 6.6). Se construye con datos de ejemplo.

**Dependencias:** Se construye a partir del Documento de Diseño (Issue 6.6). Se conecta con el backend del Issue 3.12 en el Issue 3.20.

**Criterios de aceptación:**
- [ ] La ficha médica es visible y editable solo dentro de la sesión del propio alumno
- [ ] La vista de ayuda es alcanzable desde la navegación principal del portal (evitar pantallas huérfanas)

**Labels:** `epic:portal-estudiante`, `frontend`, `privacidad`

---

### Issue 3.18 — Componente UI: mapa de distribución/ocupación de aulas (vista alumno)
**Milestone:** Sprint 4 · **Rol:** FE

**Contexto:** Permite al alumno ver qué espacios están libres por pabellón y piso, en modo de solo lectura.

**Descripción:** Construye la vista de distribución de espacios por pabellón y piso con estado de disponibilidad, para el portal del alumno. Se construye con datos de ejemplo.

**Notas técnicas:** Se dibuja sobre los planos SVG del Issue 6.10, la misma base del mapa del panel (Issue 4.13). La vista 3D opcional (Issue 4.24) reutiliza esos mismos planos.

**Dependencias:** Usa los planos del Issue 6.10. Se conecta con el Issue 3.13 en el Issue 3.20.

**Criterios de aceptación:**
- [ ] Muestra los espacios de un pabellón/piso con su estado (disponible/ocupada)
- [ ] Permite alternar entre pisos y pabellones

**Labels:** `epic:portal-estudiante`, `frontend`, `consulta`

---

### Issue 3.19 — Componente UI: pantalla de mapa de ruta
**Milestone:** Sprint 5 · **Rol:** FE

**Contexto:** Es la pantalla donde el alumno ve cómo llegar a su espacio asignado.

**Descripción:** Construye la pantalla de ruta hacia el espacio asignado: plano estático del pabellón/piso (Issue 6.10) con overlay de la ruta calculada, la entrada del pabellón como punto de partida, destino, y tiempo estimado de caminata. Se construye con datos de ejemplo.

**Dependencias:** Usa el Issue 3.15 y los planos del Issue 6.10.

**Criterios de aceptación:**
- [ ] Muestra el punto de referencia y el destino sobre el plano correspondiente
- [ ] Muestra el tiempo estimado de caminata
- [ ] Maneja el estado "ruta no disponible" de forma clara

**Labels:** `epic:portal-estudiante`, `frontend`, `consulta`

---

### Issue 3.20 — Integrar horario, cursos, perfil, mapa y ruta con endpoints reales
**Milestone:** Sprint 5 · **Rol:** FE

**Contexto:** Reemplaza los datos de ejemplo de las cuatro vistas del alumno por los endpoints reales.

**Descripción:** Conecta los Issues 3.16, 3.17, 3.18 y 3.19 con sus endpoints reales (Issues 3.10, 3.11, 3.12, 3.13, 3.15), protegidos por el login del Issue 3.22 donde corresponda.

**Dependencias:** Usa los Issues 3.10 a 3.13 y 3.15, protegidos por el login del Issue 3.22.

**Criterios de aceptación:**
- [ ] Las 4 vistas muestran datos reales, no de ejemplo
- [ ] Maneja estados de carga y error de red en cada una
- [ ] Horario, cursos y perfil son inaccesibles sin haber iniciado sesión como alumno

**Labels:** `epic:portal-estudiante`, `frontend`, `consulta`

---

### Issue 3.21 — Extender autenticación (JWT) con rol "alumno"
**Milestone:** Sprint 3 · **Rol:** BI

**Contexto:** El alumno con sesión ve su horario, sus cursos y su perfil. Reutiliza el mecanismo de autenticación del panel, sin crear uno nuevo.

**Descripción:** Añade "alumno" como rol de acceso sobre el mecanismo de autenticación del Issue 4.8. El alumno no se autorregistra: su cuenta y clave inicial las crea Coordinación Académica (Issues 1.7 y 4.17). La consulta pública por código (Issues 3.1–3.4) sigue sin requerir este login.

**Notas técnicas:** La consulta puntual por código (Issues 3.1 a 3.4) sigue sin requerir sesión.

**Dependencias:** Usa el Issue 4.8. Las cuentas las crean los Issues 1.7 y 4.17.

**Criterios de aceptación:**
- [ ] El login de alumno (código + clave) emite un token JWT válido, distinguible por rol de los de Coordinación/Jefatura/Docente
- [ ] Rechaza login con credenciales que no correspondan a una cuenta ya creada por admin
- [ ] Usa el Issue 4.8, no reimplementa el mecanismo de autenticación
- [ ] El login informa si la cuenta debe cambiar su clave inicial (`debe_cambiar_clave`)

**Labels:** `epic:portal-estudiante`, `backend`, `consulta`

---

### Issue 3.22 — Componente UI: pantalla de login del alumno
**Milestone:** Sprint 3 · **Rol:** FE

**Contexto:** Es la pantalla de entrada del alumno con sesión. No invita a «crear cuenta»: las cuentas las crea Coordinación.

**Descripción:** Pantalla de login del alumno (código + clave), aún no diseñada en Figma — a construir con un patrón similar al login del docente (Issue 7.7), siguiendo el Documento de Diseño (Issue 6.6). Sin autorregistro: la cuenta ya existe, creada por Coordinación Académica.

**Dependencias:** Usa el login del Issue 3.21 y sigue el patrón visual del Issue 7.7.

**Criterios de aceptación:**
- [ ] Formulario de login con código de alumno y clave
- [ ] Mensaje claro si las credenciales no corresponden a una cuenta creada por admin (no invita a "crear cuenta")
- [ ] Sigue el mismo patrón visual que el login de docente (Issue 7.7)

**Labels:** `epic:portal-estudiante`, `frontend`, `consulta`

---

### Issue 3.23 — Pulido de UI del portal de consulta y del panel de alertas
**Milestone:** Sprint 5 · **Rol:** FE

**Contexto:** Cuando las pantallas pasan de datos de ejemplo a datos reales suelen aparecer inconsistencias visuales y de texto. El Sprint 5 debe reservar tiempo explícito para cerrarlas, en lugar de dejarlo como una tarea sin dueño.

**Descripción:** Revisa cada pantalla del portal del estudiante y del panel de alertas ya integradas y corrige lo que se aparta de la Guía de Estilos o del diseño.

**Qué se revisa:**
- Consistencia de colores, tipografía y espaciados con la Guía de Estilos (Issue 6.7).
- Estados vacíos, de carga y de error en cada pantalla.
- Textos: sin placeholders ni etiquetas de ejemplo (por ejemplo, los «Etiqueta» y «Valor» que quedaron en algunos diseños de Figma).
- Navegación: ninguna pantalla huérfana, y el retorno al inicio disponible en todas.

**Fuera de alcance:** Cambios de diseño nuevos y las revisiones de responsive y accesibilidad, que se hacen en el Issue 5.15.

**Dependencias:** Requiere las pantallas integradas con datos reales (Issues 3.20, 4.10 y 4.14).

**Criterios de aceptación:**
- [ ] Cada pantalla del portal del estudiante y del panel de alertas fue revisada contra la Guía de Estilos
- [ ] Las pantallas tienen estados de carga, vacío y error definidos
- [ ] No quedan textos de ejemplo ni placeholders en ninguna pantalla
- [ ] La lista de ajustes realizados queda registrada en el Registro de Versiones

**Labels:** `epic:portal-estudiante`, `frontend`

---


## 🔔 Épica: Panel de Alertas y Administración
`epic:panel-alertas`

### Issue 4.1 — Endpoint HTTP: registrar cambio de software instalado en un laboratorio
**Milestone:** Sprint 3 · **Rol:** BI

**Contexto:** Es el evento de entrada del flujo de alerta por software (Proceso 3): una persona reporta que el software de un laboratorio cambió y el sistema evalúa el resto de forma automática.

**Descripción:** Permite a Jefatura de Laboratorios (sobre sus laboratorios) o a Coordinación Académica registrar que el software instalado en un laboratorio cambió. Es el evento de entrada que consume el Issue 4.3. *Nota: el formulario de Figma (`37:4874`) que probablemente corresponde a este flujo todavía tiene texto placeholder ("Etiqueta"/"Valor") sin editar — confirmar campos reales antes de que el Issue 4.19 (UI) empiece a construirse sobre él.*

**Cómo funciona:**
- Verifica el rol y, si es Jefatura, que el laboratorio esté a su cargo (EspacioResponsable).
- Guarda el nuevo software en el laboratorio y una fila en HistorialEspacio (valor anterior, valor nuevo, fecha y cuenta).
- Dispara la evaluación del Issue 4.3.

**Dependencias:** Requiere la autenticación del Issue 4.8 y las tablas del Issue 1.2.

**Criterios de aceptación:**
- [ ] Recibe el laboratorio y el nuevo estado de software instalado, y lo persiste sobre el campo versionable del Issue 1.2
- [ ] Al persistir el cambio, dispara automáticamente la evaluación del Issue 4.3
- [ ] Responde con mensaje claro si el laboratorio no existe
- [ ] Solo puede ejecutarlo Coordinación Académica o la Jefatura responsable de ese laboratorio
- [ ] Registra el cambio en el historial del espacio (valor anterior, valor nuevo, fecha y cuenta)

**Labels:** `epic:panel-alertas`, `backend`, `panel-admin`

---

### Issue 4.2 — Endpoint HTTP: registrar cambio de estado operativo de PCs de un laboratorio
**Milestone:** Sprint 3 · **Rol:** BI

**Contexto:** Es el evento de entrada del flujo de alerta por capacidad cuando cambia el estado de las PCs (Proceso 4): actualiza la capacidad real del laboratorio y dispara la revisión de las asignaciones que lo usan.

**Descripción:** Permite a Jefatura de Laboratorios (sobre sus laboratorios) o a Coordinación Académica registrar cuántas PCs de un laboratorio pasaron a estar malogradas o fueron reparadas. Es el evento de entrada que consume el Issue 4.4 y actualiza la capacidad real que usa el Issue 2.1. *Nota: mismo formulario de Figma (`37:4874`) que el Issue 4.1 — ver esa nota sobre texto placeholder pendiente de confirmar.*

**Cómo funciona:**
- Verifica el rol y, si es Jefatura, que el laboratorio esté a su cargo.
- Guarda el nuevo conteo de PCs malogradas y una fila en HistorialEspacio.
- Dispara la evaluación del Issue 4.4.

**Dependencias:** Requiere la autenticación del Issue 4.8 y las tablas del Issue 1.2.

**Criterios de aceptación:**
- [ ] Recibe el laboratorio y el nuevo conteo de PCs malogradas, y lo persiste sobre el campo versionable del Issue 1.2
- [ ] Al persistir el cambio, dispara automáticamente la evaluación del Issue 4.4
- [ ] Responde con mensaje claro si el laboratorio no existe o si el conteo excede el aforo nominal
- [ ] Solo puede ejecutarlo Coordinación Académica o la Jefatura responsable de ese laboratorio
- [ ] Registra el cambio en el historial del espacio (valor anterior, valor nuevo, fecha y cuenta)

**Labels:** `epic:panel-alertas`, `backend`, `panel-admin`

---

### Issue 4.3 — Detectar incompatibilidad de software en una asignación vigente
**Milestone:** Sprint 3 · **Rol:** BI

**Contexto:** Separa la detección de la persistencia: este issue solo responde qué asignaciones vigentes quedaron incompatibles.

**Descripción:** Cuando el Issue 4.1 registra un cambio de software, compara contra las asignaciones vigentes que usan ese laboratorio (usando el Issue 2.7) y devuelve la lista de incompatibilidades. No persiste nada — eso es el Issue 4.5.

**Casos borde:** Laboratorio sin asignaciones vigentes; cambio de software que no afecta a ningún curso; bloque con varios laboratorios donde solo uno cambió.

**Dependencias:** Usa el Issue 2.7 para evaluar el stack. Lo dispara el Issue 4.1 y lo consume el Issue 4.5.

**Criterios de aceptación:**
- [ ] Recibe el nuevo estado de software de un laboratorio, devuelve lista de asignaciones afectadas
- [ ] Usa el Issue 2.7, no duplica esa lógica
- [ ] Pruebas unitarias propias: caso con afectados, caso sin afectados, laboratorio sin asignaciones vigentes

**Labels:** `epic:panel-alertas`, `backend`, `panel-admin`

---

### Issue 4.4 — Detectar capacidad insuficiente en una asignación vigente
**Milestone:** Sprint 3 · **Rol:** BI

**Contexto:** La capacidad real puede caer por dos motivos: PCs malogradas en un laboratorio (Issue 4.2) o una edición del aforo nominal de cualquier espacio (Issue 4.15). En ambos casos hay que revisar las asignaciones vigentes.

**Descripción:** Cuando el Issue 4.2 registra un cambio en PCs malogradas de un laboratorio, o cuando se edita manualmente el aforo nominal de cualquier espacio (aula o laboratorio), recalcula la capacidad real del espacio (Issue 2.1) y compara contra las asignaciones vigentes que lo usan. Devuelve la lista de asignaciones con capacidad insuficiente. No persiste nada — eso es el Issue 4.5.

**Casos borde:** Aula con aforo editado; laboratorio con PCs reparadas (la capacidad sube y no genera alerta); espacio sin asignaciones vigentes; bloque de varios espacios donde la suma sigue alcanzando.

**Dependencias:** Usa el Issue 2.1. Lo disparan los Issues 4.2 y 4.15 y lo consume el Issue 4.5.

**Criterios de aceptación:**
- [ ] Recibe el nuevo estado de PCs malogradas (laboratorio) o el nuevo aforo nominal (aula o laboratorio), devuelve lista de asignaciones afectadas
- [ ] Usa el Issue 2.1 para recalcular capacidad real, no duplica esa lógica
- [ ] Pruebas unitarias propias: caso con afectados, caso sin afectados, espacio sin asignaciones vigentes, caso de aula con aforo editado

**Labels:** `epic:panel-alertas`, `backend`, `panel-admin`

---

### Issue 4.5 — Persistir y registrar alerta (software o capacidad)
**Milestone:** Sprint 3 · **Rol:** BI

**Contexto:** Un único mecanismo de persistencia para ambos tipos de alerta (software y capacidad) evita dos tablas y dos flujos paralelos.

**Descripción:** Usa el resultado del Issue 4.3 o del Issue 4.4 para guardar la alerta: laboratorio, motivo, cursos/grupos afectados, fecha/hora de detección, estado "pendiente" y un campo de tipo ("software" | "capacidad"). Mecanismo de persistencia único, compartido por ambos tipos.

**Casos borde:** Si ya existe una alerta pendiente idéntica (mismo espacio, tipo y asignaciones afectadas), se actualiza en lugar de duplicarse; una alerta puede afectar a varias asignaciones.

**Dependencias:** Usa los resultados de los Issues 4.3 y 4.4. La consumen los Issues 4.6 y 5.11.

**Criterios de aceptación:**
- [ ] La alerta guardada indica laboratorio, tipo, motivo específico y cursos/grupos afectados
- [ ] Se registra con fecha/hora de detección
- [ ] Acepta entradas de los Issues 4.3 y 4.4 sin duplicar la lógica de detección de ninguno
- [ ] No duplica una alerta pendiente idéntica (mismo espacio, tipo y asignaciones afectadas)

**Labels:** `epic:panel-alertas`, `backend`, `panel-admin`, `database`

---

### Issue 4.6 — Endpoint HTTP: listar alertas activas
**Milestone:** Sprint 4 · **Rol:** BI

**Contexto:** Alimenta la lista de alertas del panel. Coordinación ve todas; Jefatura solo las de sus laboratorios.

**Descripción:** Expone las alertas del Issue 4.5, ordenadas por fecha, con filtro opcional por tipo.

**Dependencias:** Usa el Issue 4.5 y la autenticación del Issue 4.8.

**Criterios de aceptación:**
- [ ] Devuelve las alertas ordenadas por fecha de detección
- [ ] Incluye el campo de estado y el campo de tipo
- [ ] Soporta filtrar por tipo de alerta
- [ ] Para un usuario de Jefatura, devuelve solo las alertas de sus laboratorios; Coordinación recibe todas

**Labels:** `epic:panel-alertas`, `backend`, `panel-admin`

---

### Issue 4.7 — Endpoint HTTP: marcar una alerta como resuelta
**Milestone:** Sprint 4 · **Rol:** BI

**Contexto:** Cierra el ciclo de la alerta: una vez atendida, la persona la marca como resuelta.

**Descripción:** Cambia el estado de una alerta del Issue 4.5 a "resuelta", sin importar su tipo.

**Dependencias:** Usa el Issue 4.5 y la autenticación del Issue 4.8.

**Criterios de aceptación:**
- [ ] Cambia el estado de una alerta existente a "resuelta"
- [ ] Responde con mensaje claro si el ID de alerta no existe

**Labels:** `epic:panel-alertas`, `backend`, `panel-admin`

---

### Issue 4.8 — Autenticación (JWT) y control por rol para el panel administrativo
**Milestone:** Sprint 2 · **Rol:** BI

**Contexto:** El panel lo usan dos roles con permisos distintos: Coordinación Académica y Jefatura de Laboratorios. El resto de los logins (alumno y docente) se construyen sobre este mismo mecanismo, así que conviene resolverlo pronto (RNF-06).

**Descripción:** Protege los Issues 4.1, 4.2, 4.6 y 4.7 con autenticación y control por rol: Coordinación Académica accede a todo el panel; Jefatura de Laboratorios accede solo a los laboratorios bajo su responsabilidad (RNF-06).

**Cómo funciona:**
- El login recibe usuario y contraseña, compara con el hash (bcrypt) y devuelve un JWT con el id de la cuenta y su rol.
- Un middleware valida el token y el rol en cada endpoint (control simple por rol, sin permisos granulares).
- Para Jefatura, los endpoints del panel filtran por sus laboratorios, con la tabla EspacioResponsable.
- Las cuentas de Coordinación y Jefatura son cuentas de sistema: se cargan con el seed (Issue 5.17), no por el flujo de altas.

**Fuera de alcance:** Doble factor, rotación de secretos y permisos más granulares que un rol por conjunto fijo de endpoints (documento de arquitectura, sección 6).

**Notas técnicas:** Durante el Sprint 2, mientras no exista el seed completo, se usan cuentas de prueba creadas por un script de desarrollo.

**Dependencias:** Requiere el modelo del Issue 1.2 (Cuenta y EspacioResponsable). Sobre este issue se construyen los Issues 3.21 y 7.1.

**Criterios de aceptación:**
- [ ] Los endpoints del panel rechazan peticiones sin token válido
- [ ] El login emite un token JWT válido para usuarios de Coordinación Académica y de Jefatura de Laboratorios, distinguible por rol
- [ ] Un usuario de Jefatura solo puede operar sobre los laboratorios asignados a su cuenta
- [ ] El login informa si la cuenta debe cambiar su clave inicial

**Labels:** `epic:panel-alertas`, `backend`, `panel-admin`

---

### Issue 4.9 — Componente UI: fila/tarjeta de alerta
**Milestone:** Sprint 4 · **Rol:** FE

**Contexto:** Es la pieza que se repite en la lista de alertas: cada alerta se ve igual y se resuelve igual.

**Descripción:** Componente visual que muestra una alerta individual con su tipo, estado y una acción para marcarla como resuelta. Se construye con datos de ejemplo.

**Dependencias:** Se construye a partir del Documento de Diseño (Issue 6.6). Se integra en el Issue 4.10.

**Criterios de aceptación:**
- [ ] Muestra laboratorio, tipo, motivo, cursos afectados, fecha y estado
- [ ] El tipo de alerta es visualmente distinguible
- [ ] Expone una acción de "marcar como resuelta"

**Labels:** `epic:panel-alertas`, `frontend`, `panel-admin`

---

### Issue 4.10 — Integrar vista de lista de alertas
**Milestone:** Sprint 4 · **Rol:** FE

**Contexto:** Conecta el componente de alerta con los endpoints reales; es la pantalla central del panel.

**Descripción:** Conecta el Issue 4.9 con los Issues 4.6 y 4.7, protegida por el Issue 4.8. Para Jefatura de Laboratorios, la lista se filtra automáticamente a los laboratorios bajo su responsabilidad.

**Dependencias:** Usa los Issues 4.6 y 4.7, protegidos por el Issue 4.8.

**Criterios de aceptación:**
- [ ] Lista real de alertas de ambos tipos, ordenada por fecha
- [ ] Marcar como resuelta desde la UI actualiza el backend sin recargar la página
- [ ] Vista inaccesible sin autenticación válida
- [ ] Un usuario de Jefatura solo ve alertas de sus laboratorios; Coordinación ve todas

**Labels:** `epic:panel-alertas`, `frontend`, `panel-admin`

---

### Issue 4.11 — Servicio: obtener estado de ocupación de espacios por piso
**Milestone:** Sprint 4 · **Rol:** BI

**Contexto:** Es la base de los dos mapas: el del panel (autenticado) y el del alumno (público, más limitado).

**Descripción:** Para un piso dado, devuelve el estado de cada espacio (aula o laboratorio): disponible u ocupado (con curso, docente y horario), y sus alertas activas (usa el Issue 4.6 filtrado por espacio).

**Dependencias:** Usa las asignaciones vigentes y el Issue 4.6. Lo exponen los Issues 4.12 y 3.13.

**Criterios de aceptación:**
- [ ] Para cada espacio del piso, devuelve tipo (aula/laboratorio), estado y, si está ocupado, curso + docente + horario
- [ ] Incluye las alertas activas del espacio, si las tiene
- [ ] Usa las asignaciones vigentes y el Issue 4.6, no reimplementa esa lógica

**Labels:** `epic:panel-alertas`, `backend`, `panel-admin`

---

### Issue 4.12 — Endpoint HTTP: consultar mapa de ocupación por piso
**Milestone:** Sprint 4 · **Rol:** BI

**Contexto:** Es el endpoint del mapa de ocupación para Coordinación y Jefatura, con el detalle completo.

**Descripción:** Expone el Issue 4.11, protegido por el Issue 4.8.

**Dependencias:** Usa el Issue 4.11 y la autenticación del Issue 4.8.

**Criterios de aceptación:**
- [ ] Responde con el estado de todos los espacios (aulas y laboratorios) de un piso dado
- [ ] Rechaza peticiones sin autenticación válida

**Labels:** `epic:panel-alertas`, `backend`, `panel-admin`

---

### Issue 4.13 — Componente UI: mapa visual interactivo por piso
**Milestone:** Sprint 4 · **Rol:** FE

**Contexto:** El mapa de ocupación es la vista más visual del sistema: muestra de un vistazo qué espacios están libres, ocupados o con alerta.

**Descripción:** Renderiza los espacios de un piso sobre el plano SVG del Issue 6.10 (cada espacio es una figura cuyo id coincide con su identificador) (aulas y laboratorios), coloreados según estado y con una marca visual que distingue el tipo de espacio, con un click que abre el detalle. Se construye con datos de ejemplo de ambos tipos.

**Notas técnicas:** Es la vista 2D por defecto y el respaldo de la vista 3D opcional (Issues 4.23 y 4.24). Se construye con datos de ejemplo y sin depender del backend.

**Dependencias:** Requiere los planos del Issue 6.10. Se conecta con datos reales en el Issue 4.14.

**Criterios de aceptación:**
- [ ] Los 3 estados (disponible/ocupado/con alerta) son visualmente distinguibles
- [ ] El tipo de espacio (aula/laboratorio) es visualmente distinguible
- [ ] Al hacer click en un espacio se muestra su detalle con datos de ejemplo
- [ ] Permite alternar entre pisos

**Labels:** `epic:panel-alertas`, `frontend`, `panel-admin`

---

### Issue 4.14 — Integrar mapa visual con el endpoint de ocupación
**Milestone:** Sprint 5 · **Rol:** FE

**Contexto:** Reemplaza los datos de ejemplo del mapa por el estado real del sistema.

**Descripción:** Conecta el Issue 4.13 con el Issue 4.12, protegido por el Issue 4.8.

**Dependencias:** Usa el Issue 4.12, protegido por el Issue 4.8.

**Criterios de aceptación:**
- [ ] El mapa muestra el estado real de los espacios, aulas y laboratorios
- [ ] El detalle al hacer click trae datos reales
- [ ] Vista inaccesible sin autenticación válida

**Labels:** `epic:panel-alertas`, `frontend`, `panel-admin`

---

### Issue 4.15 — UI + backend: gestión de espacios con campos acotados por rol
**Milestone:** Sprint 4 · **Rol:** FE + BI

**Contexto:** Los espacios son un dato vivo del sistema: se dan de alta y se editan desde el panel, con campos distintos según el rol.

**Descripción:** Formulario de alta/edición de un espacio (aula o laboratorio) sobre el modelo del Issue 1.2. Coordinación Académica ve y edita todos los campos de cualquier tipo de espacio. Jefatura de Laboratorios ve y edita únicamente los campos de laboratorios bajo su responsabilidad (PCs malogradas, software instalado), con el pabellón como campo no editable.

**Cómo funciona:**
- Coordinación crea y edita todos los campos, incluida la contigüidad con otros espacios del mismo tipo.
- Jefatura solo edita PCs y software de sus laboratorios; el pabellón se muestra pero no se puede cambiar.
- Editar el aforo nominal dispara la evaluación de capacidad del Issue 4.4.
- Los cambios de PCs y software no escriben directo en la base: llaman a los endpoints de los Issues 4.1 y 4.2, para que generen historial y alertas.

**Casos borde:** Espacio nuevo sin ninguna contigüidad; aforo editado por debajo del número de alumnos de una asignación vigente; laboratorio sin responsable.

**Dependencias:** Usa el modelo del Issue 1.2 y los endpoints de los Issues 4.1, 4.2 y 4.4.

**Criterios de aceptación:**
- [ ] Coordinación Académica puede crear/editar aulas teóricas y laboratorios, todos los campos
- [ ] Jefatura de Laboratorios solo puede editar laboratorios, y solo los campos de PCs y software; el pabellón se muestra pero no es editable
- [ ] Los campos exclusivos de laboratorio (PCs, software) no aparecen al editar un aula teórica
- [ ] Endpoint rechaza una edición fuera de los campos permitidos para el rol autenticado
- [ ] Permite definir las contigüidades de un espacio con otros espacios del mismo tipo, y rechaza una contigüidad entre tipos distintos
- [ ] Al editar el aforo nominal de un espacio, se dispara la evaluación del Issue 4.4
- [ ] Los cambios de PCs y software se envían a los endpoints de los Issues 4.1 y 4.2, para que generen historial y alertas

**Labels:** `epic:panel-alertas`, `frontend`, `backend`, `panel-admin`

---

### Issue 4.16 — Componente UI: panel de inicio y listado de laboratorios (Jefatura)
**Milestone:** Sprint 4 · **Rol:** FE

**Contexto:** Es la pantalla de inicio de Jefatura de Laboratorios: le muestra el estado de sus laboratorios y lo que requiere atención.

**Descripción:** Vista de inicio para Jefatura de Laboratorios con métricas (labs activos, PCs operativas/inoperativas), alerta destacada más reciente, y una vista previa del mapa de ocupación de su pabellón; más un listado completo de laboratorios con búsqueda y filtro (por piso, con alerta, libres). Se construye con datos de ejemplo.

**Dependencias:** Se construye a partir del Documento de Diseño (Issue 6.6) y usa el mapa del Issue 4.13.

**Criterios de aceptación:**
- [ ] El panel de inicio muestra el conteo de labs activos y PCs operativas/inoperativas
- [ ] El listado de laboratorios es filtrable por piso y por estado
- [ ] Cada laboratorio del listado muestra aforo real vs. nominal

**Labels:** `epic:panel-alertas`, `frontend`, `panel-admin`

---

### Issue 4.17 — Endpoint + UI: alta individual de alumno (Coordinación Académica)
**Milestone:** Sprint 4 · **Rol:** BI + FE

**Contexto:** Cubre las altas tardías de alumnos que no vienen en el lote de matrícula.

**Descripción:** Formulario en el panel administrativo para que Coordinación Académica dé de alta a un alumno puntual (fuera del lote masivo del Issue 1.7), con su credencial de acceso inicial. Cubre altas tardías individuales.

**Notas técnicas:** La cuenta se crea con `debe_cambiar_clave = true` y se vincula al alumno con `cuenta_id`.

**Dependencias:** Complementa el registro masivo del Issue 1.7. El login llega con el Issue 3.21.

**Criterios de aceptación:**
- [ ] Formulario con código de alumno, nombre, correo y genera/asigna una clave inicial
- [ ] Rechaza el alta si el código de alumno ya existe, con mensaje claro
- [ ] El alumno dado de alta puede iniciar sesión de inmediato con la clave asignada (Issue 3.21)
- [ ] La cuenta se crea con `debe_cambiar_clave = true`

**Labels:** `epic:panel-alertas`, `backend`, `frontend`, `panel-admin`

---

### Issue 4.18 — Endpoint + UI: alta individual de docente (Coordinación Académica)
**Milestone:** Sprint 4 · **Rol:** BI + FE

**Contexto:** Cubre las altas de docentes que no vienen en el lote masivo.

**Descripción:** Formulario en el panel administrativo para que Coordinación Académica dé de alta a un docente puntual (fuera del lote masivo del Issue 1.8), con su credencial de acceso inicial.

**Notas técnicas:** La cuenta se crea con `debe_cambiar_clave = true` y se vincula al docente con `cuenta_id`.

**Dependencias:** Complementa el registro masivo del Issue 1.8. El login llega con el Issue 7.1.

**Criterios de aceptación:**
- [ ] Formulario con nombre, correo institucional, código de docente, departamento y genera/asigna una clave inicial
- [ ] Rechaza el alta si el código de docente ya existe, con mensaje claro
- [ ] El docente dado de alta puede iniciar sesión de inmediato con la clave asignada (Issue 7.1)
- [ ] La cuenta se crea con `debe_cambiar_clave = true`

**Labels:** `epic:panel-alertas`, `backend`, `frontend`, `panel-admin`

---

### Issue 4.19 — Componente UI: formulario de cambio de software/PCs de un laboratorio (Jefatura)
**Milestone:** Sprint 4 · **Rol:** FE

**Contexto:** Es la pantalla con la que Jefatura reporta los cambios que originan las alertas: software instalado y PCs malogradas o reparadas.

**Descripción:** Construye la UI que consumen los Issues 4.1 y 4.2 (registrar cambio de software instalado y cambio de estado operativo de PCs de un laboratorio). No existía un issue de Frontend dedicado a este formulario — se detectó el hueco al auditar el diseño de Figma. El diseño de referencia (`37:4874`) todavía tiene texto placeholder sin editar; confirmar los campos reales (laboratorio, tipo de cambio, lista de software o conteo de PCs) antes de construir sobre él.

**Dependencias:** Usa los endpoints de los Issues 4.1 y 4.2.

**Criterios de aceptación:**
- [ ] Permite registrar un cambio de software instalado (Issue 4.1) y un cambio de PCs malogradas/reparadas (Issue 4.2), separados o combinados según lo que confirme el diseño final
- [ ] Valida que el laboratorio seleccionado exista antes de habilitar el envío
- [ ] Muestra confirmación o error según la respuesta del backend

**Labels:** `epic:panel-alertas`, `frontend`, `panel-admin`

---

### Issue 4.20 — Componente UI: panel de inicio de Coordinación Académica
**Milestone:** Sprint 4 · **Rol:** FE

**Contexto:** Es la pantalla de inicio de Coordinación Académica: el punto desde donde se lanza la asignación y se atienden los casos que requieren revisión manual.

**Descripción:** Construye la vista de inicio de Coordinación Académica (`academic-coordination-home`), con el estado de la corrida del periodo y accesos a carga de datos, gestión de espacios comunes y alertas de aforo. No existía un issue de Frontend dedicado a esta pantalla — se detectó el hueco al auditar el diseño de Figma. A diferencia de las demás pantallas de admin, este diseño no incluye la barra inferior de 4 tabs (Inicio/Espacios/Alertas/Carga): queda pendiente decidir si es intencional (home como hub de tarjetas) o si se agrega la misma barra por consistencia de navegación.

**Notas técnicas:** La lista de secciones escaladas y el botón de asignación usan los endpoints de los Issues 4.22 y 2.15.

**Dependencias:** Usa los Issues 1.9, 4.6, 4.15, 4.22 y 2.15.

**Criterios de aceptación:**
- [ ] Muestra el estado de la corrida del periodo (secciones asignadas/escaladas)
- [ ] Expone accesos a carga de datos maestros (Issue 1.9), gestión de espacios (Issue 4.15) y alertas (Issue 4.6)
- [ ] Decisión de navegación (con o sin bottom-nav) tomada y documentada antes de cerrar el issue, no dejada por defecto
- [ ] Lista las secciones escaladas a revisión manual con su motivo (Issue 4.22)
- [ ] Permite ejecutar la corrida de asignación del periodo o reintentar una sección escalada (Issue 2.15)

**Labels:** `epic:panel-alertas`, `frontend`, `panel-admin`

---

### Issue 4.21 — Endpoint + UI: cambio de contraseña (todos los roles)
**Milestone:** Sprint 4 · **Rol:** BI + FE

**Contexto:** Las cuentas las crea Coordinación con una clave inicial. Para que esa clave no la conozca nadie más, el usuario debe cambiarla en su primer ingreso, y poder cambiarla después cuando quiera (RF-36).

**Descripción:** Permite a cualquier usuario autenticado cambiar su contraseña verificando la actual. Las cuentas nacen con `debe_cambiar_clave = true`: mientras sea así, el sistema solo permite esta operación.

**Cómo funciona:**
- El endpoint recibe la contraseña actual y la nueva, con una longitud mínima.
- Verifica la actual con bcrypt y guarda el nuevo hash.
- Pone `debe_cambiar_clave` en false.
- Mientras `debe_cambiar_clave` sea true, los demás endpoints rechazan las peticiones de ese usuario.

**Casos borde:** Contraseña actual incorrecta; nueva contraseña igual a la actual; nueva contraseña demasiado corta.

**Fuera de alcance:** Recuperación por correo (no hay correo) y el restablecimiento por Coordinación (Issue 4.26).

**Dependencias:** Usa el mecanismo del Issue 4.8.

**Criterios de aceptación:**
- [ ] Pide la contraseña actual y una nueva con longitud mínima; rechaza con un mensaje claro si la actual no coincide
- [ ] Guarda el nuevo hash (bcrypt) y pone `debe_cambiar_clave` en false
- [ ] Mientras `debe_cambiar_clave` sea true, los demás endpoints rechazan las peticiones de ese usuario
- [ ] La UI redirige a esta pantalla cuando el login informa que la clave debe cambiarse

**Labels:** `epic:panel-alertas`, `backend`, `frontend`, `panel-admin`, `seguridad`

---

### Issue 4.22 — Endpoint HTTP: listar secciones escaladas a revisión manual
**Milestone:** Sprint 4 · **Rol:** BI

**Contexto:** RF-05 exige informar a Coordinación cuando una sección no puede asignarse. Hoy el panel solo muestra un conteo de escaladas (Issue 4.20), pero nadie puede ver cuáles son ni por qué.

**Descripción:** Expone las asignaciones en estado ESCALADA (Issue 2.12) con su sección, curso, tipo de espacio requerido, motivo y fecha, para que Coordinación Académica las revise.

**Casos borde:** Sección que fue escalada y luego recibió un bloque en una corrida posterior (ya no aparece); periodo sin escaladas (lista vacía).

**Fuera de alcance:** Asignar un espacio a mano. Coordinación puede corregir datos (por ejemplo, agregar un espacio) y reintentar con el Issue 2.15.

**Dependencias:** Usa el estado ESCALADA del Issue 2.12 y la autenticación del Issue 4.8. Lo consume el Issue 4.20.

**Criterios de aceptación:**
- [ ] Devuelve las asignaciones ESCALADA ordenadas por fecha
- [ ] Cada elemento incluye curso, sección, tipo de espacio requerido y motivo del escalamiento
- [ ] Solo accede Coordinación Académica
- [ ] Una sección deja de aparecer al recibir una asignación VIGENTE

**Labels:** `epic:panel-alertas`, `backend`, `panel-admin`

---

### Issue 4.23 — Escena 3D del mapa de ocupación (three.js)
**Milestone:** Sprint 4 · **Rol:** BM (con apoyo de FE)

**Contexto:** Se aprobó ofrecer el mapa de ocupación también como una maqueta 3D navegable. El mapa 2D sigue siendo la vista por defecto y lo que exigen los requisitos; el 3D es una vista alternativa.

**Descripción:** Componente que arma una maqueta 3D del edificio extruyendo los SVG del Issue 6.10, con cámara orbital, selección por clic y vista por piso. Recibe el estado de cada espacio por props y se construye con datos de ejemplo, independiente del backend.

**Entradas y salida:** Los SVG por piso y un listado con el estado y el tipo de cada espacio. Emite el identificador del espacio seleccionado.

**Cómo funciona (propuesta):**
- Carga los SVG y extruye cada figura de espacio a una altura fija (mayor para laboratorios) y los muros a una altura menor.
- Colorea cada espacio según su estado y distingue aula de laboratorio.
- Cámara orbital con límites (sin inclinaciones extremas ni acercamientos infinitos), selector de piso y vista de edificio completo.
- Selección por clic (raycasting) y resaltado del bloque asignado.
- Solo vuelve a dibujar cuando algo cambia, y limita la resolución en móvil.

**Casos borde:** Sin WebGL (muestra el mapa 2D); figura del SVG cuyo id no coincide con ningún espacio (se ignora y se avisa); piso sin espacios.

**Fuera de alcance:** Modelo 3D detallado (puertas, mobiliario, texturas) y la conexión con el backend, que hace el Issue 4.24.

**Notas técnicas:** React con `@react-three/fiber`; se importa con carga diferida para no aumentar el bundle inicial. El componente recibe todo por props y no llama al backend.

**Dependencias:** Requiere los planos del Issue 6.10. Se integra en el Issue 4.24.

**Criterios de aceptación:**
- [ ] La geometría sale de los SVG, sin modelado manual
- [ ] Cada espacio se colorea según su estado y se distingue aula de laboratorio
- [ ] Permite girar, acercar, desplazar, elegir un piso y ver el edificio completo
- [ ] El clic en un espacio emite su identificador para abrir el detalle
- [ ] Se carga de forma diferida y, si no hay WebGL, muestra el mapa 2D

**Labels:** `epic:panel-alertas`, `frontend`, `panel-admin`, `3d`

---

### Issue 4.24 — Integrar la vista 3D con datos reales, detalle y accesibilidad
**Milestone:** Sprint 5 · **Rol:** FE

**Contexto:** La escena 3D del Issue 4.23 se construye con datos de ejemplo. Este issue la conecta con el sistema real y resuelve lo que un canvas no resuelve solo: accesibilidad y pruebas.

**Descripción:** Conecta la escena 3D con el endpoint de ocupación (Issues 4.12 y 3.13), el panel de detalle del mapa 2D y una lista de espacios navegable con teclado (RNF-05). Se activa con un botón; el mapa 2D es la vista por defecto y el respaldo.

**Cómo funciona:**
- Un botón alterna entre la vista 2D y la 3D, y la elección se conserva durante la sesión.
- La lista de espacios por piso ofrece el mismo detalle y es la alternativa para teclado y lectores de pantalla.
- El panel de detalle es HTML común, el mismo del mapa 2D.

**Notas técnicas:** Las pruebas E2E no hacen clic sobre el canvas: seleccionan desde la lista y verifican el panel de detalle.

**Dependencias:** Requiere la escena del Issue 4.23 y los mapas de los Issues 4.13, 4.14 y 3.18.

**Criterios de aceptación:**
- [ ] Muestra el estado real de los espacios y el mismo detalle que el mapa 2D
- [ ] Hay una lista de espacios por piso, navegable con teclado y con el mismo detalle
- [ ] Los E2E cubren la selección desde la lista y el panel de detalle, no sobre el canvas
- [ ] Funciona en móvil con un rendimiento aceptable

**Labels:** `epic:panel-alertas`, `frontend`, `panel-admin`, `3d`, `accesibilidad`

---

### Issue 4.25 — Componente UI: login de Coordinación y Jefatura, y manejo de sesión (todos los roles)
**Milestone:** Sprint 3 · **Rol:** FE

**Contexto:** Los logins de alumno (Issue 3.22) y docente (Issue 7.7) tienen pantalla, pero el panel administrativo no. Además, ningún issue cubre qué pasa cuando la sesión vence o el usuario cierra sesión.

**Descripción:** Construye la pantalla de login de Coordinación Académica y Jefatura de Laboratorios, y el manejo de sesión común a los cuatro roles: guardar el token, cerrar sesión, manejar el vencimiento y proteger las rutas según el rol.

**Cómo funciona:**
- Login con usuario y contraseña; el rol viene en el token (Issue 4.8).
- Un interceptor de Axios adjunta el token a cada petición y, ante un 401, cierra la sesión y redirige al login.
- Las rutas privadas verifican el rol: un rol no autorizado ve un mensaje claro, no una pantalla rota.
- Cerrar sesión borra el token y vuelve al login.
- Si el login informa que la clave debe cambiarse, redirige a la pantalla del Issue 4.21.

**Fuera de alcance:** Recuperación de contraseña por correo (no hay correo); el restablecimiento lo hace Coordinación (Issue 4.26).

**Notas técnicas:** Dónde se guarda el token (memoria o almacenamiento de sesión) se decide al implementar y se documenta con su riesgo.

**Dependencias:** Usa el Issue 4.8. Complementa los Issues 3.22 y 7.7.

**Criterios de aceptación:**
- [ ] Existe una pantalla de login para Coordinación Académica y Jefatura de Laboratorios, sin opción de crear cuenta
- [ ] Cerrar sesión borra el token y vuelve al login, en los cuatro roles
- [ ] Un token vencido cierra la sesión y redirige al login con un mensaje claro
- [ ] Las rutas privadas rechazan a un usuario sin sesión o con un rol no autorizado
- [ ] Si la cuenta debe cambiar su clave inicial, se redirige a la pantalla del Issue 4.21

**Labels:** `epic:panel-alertas`, `frontend`, `panel-admin`, `seguridad`

---

### Issue 4.26 — Endpoint + UI: restablecer la contraseña de un usuario (Coordinación Académica)
**Milestone:** Sprint 5 · **Rol:** BI + FE

**Contexto:** Sin autorregistro ni correo electrónico, un usuario que olvida su clave queda bloqueado. Coordinación Académica es quien puede desbloquearlo.

**Descripción:** Permite a Coordinación Académica restablecer la clave de un alumno o docente a una clave inicial nueva. El usuario deberá cambiarla en su próximo ingreso.

**Cómo funciona:**
- Coordinación busca al usuario por código o correo.
- El sistema genera una clave inicial, guarda su hash y pone `debe_cambiar_clave` en true.
- Muestra la clave inicial una sola vez a Coordinación, para que se la entregue al usuario.

**Casos borde:** Usuario inexistente; intento de restablecer una cuenta de Coordinación o Jefatura (no permitido: son cuentas de sistema).

**Dependencias:** Usa el Issue 4.21 (cambio de contraseña) y la autenticación del Issue 4.8.

**Criterios de aceptación:**
- [ ] Solo Coordinación Académica puede restablecer la clave de un alumno o docente
- [ ] La clave restablecida es nueva, se guarda con hash y obliga a cambiarla en el siguiente ingreso
- [ ] La clave inicial se muestra una sola vez
- [ ] Rechaza con un mensaje claro un usuario inexistente o una cuenta de Coordinación o Jefatura

**Labels:** `epic:panel-alertas`, `backend`, `frontend`, `panel-admin`, `seguridad`

---


## 🧪 Épica: Automatización y Control de Calidad
`epic:calidad`

> Los issues 5.1–5.7 y 5.16 se corrigen dentro del mismo sprint en que se implementa su issue de origen. Los issues 5.8 y 5.9 corren sobre el sistema ya integrado: cualquier falla ahí se registra como un issue de bug nuevo, no como corrección silenciosa.

### Issue 5.1 — Pruebas unitarias del cálculo de capacidad real
**Milestone:** Sprint 1 · **Rol:** QA · Valida: Issue 2.1

**Contexto:** Valida el cálculo de capacidad real (Issue 2.1), la regla más importante del motor.

**Descripción:** Casos borde de laboratorio: 0 PCs malogradas, todas malogradas, aforos nominales distintos entre laboratorios. Casos de aula teórica: capacidad real igual al aforo nominal, sin descuento de PCs.

**Dependencias:** Valida el Issue 2.1.

**Criterios de aceptación:**
- [ ] Cubre laboratorio sin PCs malogradas, con todas las PCs malogradas y aula teórica sin descuento
- [ ] Los casos descritos pasan en CI y la cobertura del módulo es ≥ 85 %

**Labels:** `epic:calidad`, `testing`, `unitarias`

---

### Issue 5.2 — Pruebas unitarias de la función de consulta de contigüidad
**Milestone:** Sprint 1 · **Rol:** QA · Valida: Issue 2.3

**Contexto:** Valida la consulta de espacios contiguos (Issue 2.3), de la que dependen el algoritmo de bloque y la ruta al aula.

**Descripción:** Casos: espacio con varios contiguos, sin contiguos, simetría de la relación, para aulas y para laboratorios.

**Dependencias:** Valida el Issue 2.3.

**Criterios de aceptación:**
- [ ] Cubre espacio con varios contiguos, sin contiguos y la simetría de la relación, para aulas y laboratorios
- [ ] Los casos descritos pasan en CI y la cobertura del módulo es ≥ 85 %

**Labels:** `epic:calidad`, `testing`, `unitarias`

---

### Issue 5.3 — Pruebas de disponibilidad de espacios por horario
**Milestone:** Sprint 1 · **Rol:** QA · Valida: Issue 2.4

**Contexto:** Valida que un espacio nunca se ofrezca como disponible si tiene una asignación vigente en una franja que se solapa.

**Descripción:** Casos: sin solape, con solape total, con solape parcial, espacio sin asignaciones vigentes, para aulas y para laboratorios.

**Dependencias:** Valida el Issue 2.4.

**Criterios de aceptación:**
- [ ] Cubre sin solape, solape total, solape parcial y espacio sin asignaciones vigentes, para aulas y laboratorios
- [ ] Los casos descritos pasan en CI y la cobertura del módulo es ≥ 85 %

**Labels:** `epic:calidad`, `testing`, `unitarias`

---

### Issue 5.4 — Pruebas parametrizadas del algoritmo de búsqueda de bloque con capacidad variable
**Milestone:** Sprint 1 · **Rol:** QA · Valida: Issue 2.5

**Contexto:** Es la prueba del algoritmo más delicado del motor: el que arma los bloques de espacios contiguos.

**Descripción:** Casos: bloque de 1 espacio suficiente por aforo alto, bloque de 3+ por aforo bajo, capacidad justo en el límite, espacios contiguos pero no disponibles, caso "sin bloque encontrado", repetido para aulas y para laboratorios, más un caso que verifique que nunca se mezclan ambos tipos en un mismo bloque.

**Dependencias:** Valida el Issue 2.5.

**Criterios de aceptación:**
- [ ] Cubre bloque de 1 espacio, bloque de 3 o más, capacidad justo en el límite, espacios contiguos no disponibles y «sin bloque encontrado»
- [ ] Verifica que nunca se mezclan aulas y laboratorios en un bloque
- [ ] Verifica que la lista de candidatos es determinista y no tiene duplicados
- [ ] Los casos descritos pasan en CI y la cobertura del módulo es ≥ 85 %

**Labels:** `epic:calidad`, `testing`, `unitarias`

---

### Issue 5.5 — Pruebas parametrizadas de validación de software (individual y bloque)
**Milestone:** Sprint 2 · **Rol:** QA · Valida: Issues 2.6 y 2.7

**Contexto:** Valida que un bloque de laboratorios se descarte si alguno no tiene el software requerido, y que en las aulas el control se omita.

**Descripción:** Cumplimiento total, cumplimiento parcial, stack requerido vacío (laboratorios); caso de bloque de aula teórica, donde el control debe omitirse automáticamente y no fallar por falta de campo de software.

**Dependencias:** Valida los Issues 2.6 y 2.7.

**Criterios de aceptación:**
- [ ] Cubre cumplimiento total, cumplimiento parcial y stack requerido vacío en laboratorios
- [ ] En bloques de aula teórica el control se omite sin fallar por la ausencia del campo de software
- [ ] Los casos descritos pasan en CI y la cobertura del módulo es ≥ 85 %

**Labels:** `epic:calidad`, `testing`, `unitarias`

---

### Issue 5.6 — Pruebas de accesibilidad / priorización Piso 1
**Milestone:** Sprint 2 · **Rol:** QA · Valida: Issues 2.8 y 2.9

**Contexto:** Valida que los alumnos con movilidad reducida sean priorizados en el Piso 1 y que el fallback funcione cuando no hay lugar.

**Descripción:** Con movilidad reducida y Piso 1 disponible; con movilidad reducida y Piso 1 no disponible; sin movilidad reducida. Repetido para bloques de aulas y de laboratorios.

**Dependencias:** Valida los Issues 2.8 y 2.9.

**Criterios de aceptación:**
- [ ] Cubre movilidad reducida con el Piso 1 disponible, con el Piso 1 no disponible y sin movilidad reducida, para aulas y laboratorios
- [ ] Los casos descritos pasan en CI y la cobertura del módulo es ≥ 85 %

**Labels:** `epic:calidad`, `testing`, `unitarias`, `accesibilidad`

---

### Issue 5.7 — Pruebas de integración del flujo completo (caso feliz, batch y escalamiento)
**Milestone:** Sprint 3 · **Rol:** QA · Valida: Issues 2.10, 2.11, 2.12 y 2.14

**Contexto:** Es la prueba del motor completo como una sola unidad: el flujo feliz, el escalamiento y la corrida del periodo.

**Descripción:** Prueba el pipeline completo como una sola unidad, incluyendo el camino en que ningún bloque cumple, y la corrida batch sobre varias secciones a la vez —teóricas y prácticas— (idempotencia incluida en ambos modos). Incluye también los casos de desempate por cercanía a las secciones paralelas (con el caso en que solo queda un bloque válido), una segunda corrida sin cambios y una corrida con una sección modificada.

**Dependencias:** Valida los Issues 2.10, 2.11, 2.12 y 2.14.

**Criterios de aceptación:**
- [ ] Cubre el flujo feliz para una sección individual (aula y laboratorio), la corrida del periodo y el escalamiento
- [ ] Cubre una segunda corrida sin cambios (mantiene las asignaciones) y una corrida con una sección modificada (la anterior pasa a HISTORICA)
- [ ] Cubre el desempate por cercanía, incluido el caso en que solo queda un bloque válido
- [ ] Los casos descritos pasan en CI

**Labels:** `epic:calidad`, `testing`, `integracion`

---

### Issue 5.8 — Pruebas de carga con k6 sobre los endpoints de consulta
**Milestone:** Sprint 4 (primera corrida) / Sprint 5 (validación final) · **Rol:** QA · Valida: Issues 3.2 y 3.4

**Contexto:** El primer día de clases todos los alumnos consultan a la vez. Esta prueba verifica que el endpoint público de consulta lo soporte (RNF-01).

**Descripción:** Simular el pico de tráfico del primer día de clases.

**Notas técnicas:** Los datos de volumen salen del seed del Issue 5.17. Se corre contra un entorno local o de CI con la misma configuración, no contra la instancia gratuita desplegada.

**Dependencias:** Valida los Issues 3.2 y 3.4. Usa el dataset del Issue 5.17.

**Criterios de aceptación:**
- [ ] Script de k6 versionado en `/tests/load`
- [ ] Reporte documentado (latencia p95, error rate)
- [ ] Falla de umbral → issue `bug` nuevo referenciando este issue
- [ ] El entorno de ejecución queda documentado en el reporte (local o CI, no la instancia gratuita desplegada)

**Labels:** `epic:calidad`, `testing`, `performance`

---

### Issue 5.9 — Pruebas E2E del flujo del estudiante
**Milestone:** Sprint 5 · **Rol:** QA · Valida: Issue 3.7

**Contexto:** Es la prueba de extremo a extremo del flujo principal del alumno, sobre el sistema ya integrado.

**Descripción:** Automatizar con Playwright: ingresar código → ver resultado, incluyendo caso de error.

**Dependencias:** Valida la vista del Issue 3.7.

**Criterios de aceptación:**
- [ ] Cubre caso feliz y caso de código inexistente
- [ ] Falla → issue `bug` nuevo, no corrección silenciosa

**Labels:** `epic:calidad`, `testing`

---

### Issue 5.10a — Configurar pipeline CI/CD base
**Milestone:** Sprint 1 · **Rol:** QA

**Contexto:** El pipeline de CI corre las pruebas en cada cambio, para detectar errores cuando son baratos de corregir.

**Descripción:** GitHub Actions con linter, formato y pruebas unitarias/parametrizadas en cada push. Sin quality gates todavía.

**Cómo funciona:** Un workflow de GitHub Actions con jobs de lint y formato, y de pruebas contra una base PostgreSQL de servicio, con caché de dependencias.

**Dependencias:** Requiere el repositorio del Issue 1.1. Sobre él se construye el Issue 5.10b.

**Criterios de aceptación:**
- [ ] Pipeline se dispara en cada push y pull request
- [ ] Corre linter + pruebas unitarias existentes hasta ese momento

**Labels:** `epic:calidad`, `ci-cd`

---

### Issue 5.10b — Añadir quality gates al pipeline (SonarCloud)
**Milestone:** Sprint 3 · **Rol:** QA

**Contexto:** Los quality gates convierten los criterios de calidad (cobertura ≥ 85 %, 0 bugs críticos) en un control automático que bloquea el despliegue (RNF-02 y RNF-03).

**Descripción:** Sobre el Issue 5.10a, integra SonarCloud y bloquea merge/deploy si no se cumplen los gates.

**Dependencias:** Usa el pipeline del Issue 5.10a. Sobre él se despliega en el Issue 1.10.

**Criterios de aceptación:**
- [ ] Cobertura ≥ 85% como gate obligatorio
- [ ] 0 bugs críticos como gate obligatorio
- [ ] Pipeline bloquea el deploy si algún gate falla

**Labels:** `epic:calidad`, `ci-cd`, `quality`

---

### Issue 5.11 — Registro de auditoría (logging) de asignaciones y alertas
**Milestone:** Sprint 3 · **Rol:** QA · Valida: RNF-07

**Contexto:** La trazabilidad de cada asignación y cada alerta es un requisito (RNF-07): permite saber qué decidió el sistema y cuándo.

**Descripción:** Registra con fecha y hora cada asignación (individual y batch, incluyendo escaladas del Issue 2.12) y cada alerta (Issue 4.5, de cualquier tipo), de forma consultable.

**Fuera de alcance:** Una pantalla o un endpoint de consulta del registro: en el MVP el registro se consulta directamente en la tabla RegistroAuditoría.

**Dependencias:** Lo alimentan los Issues 2.10, 2.11, 2.12 y 4.5.

**Criterios de aceptación:**
- [ ] Cada asignación confirmada por los Issues 2.10/2.11 queda registrada con fecha/hora
- [ ] Cada caso escalado por el Issue 2.12 queda registrado con fecha/hora y el motivo
- [ ] Cada alerta persistida por el Issue 4.5 queda registrada con fecha/hora de detección
- [ ] El registro se puede consultar en la tabla RegistroAuditoría, con su fecha y hora

**Labels:** `epic:calidad`, `logging`, `quality`

---

### Issue 5.12 — Plan Maestro de Pruebas
**Milestone:** Sprint 0 (inicio) / Sprint 1 (cierre) · **Rol:** QA

**Contexto:** La estrategia de pruebas se define antes de escribir el primer test, para que todos prueben con el mismo criterio.

**Descripción:** Define la estrategia de testing del proyecto antes de escribir el primer test: qué se cubre con unitarias/parametrizadas vs. integración vs. E2E, los escenarios de carga (k6) y sus umbrales de latencia/error rate aceptables, los flujos E2E a automatizar, y la definición formal de los quality gates y la política de manejo de bugs de sistema.

**Dependencias:** Es la base de los Issues 5.1 a 5.11.

**Criterios de aceptación:**
- [ ] Define el criterio de granularidad de pruebas por tipo (unitaria/integración/E2E/carga)
- [ ] Define umbrales de aceptación para k6 (latencia p95, error rate)
- [ ] Define los quality gates (cobertura, bugs críticos) y la política de bug nuevo vs. corrección silenciosa

**Labels:** `epic:calidad`, `docs`

---

### Issue 5.13 — Plan de Ambiente Controlado
**Milestone:** Sprint 1 · **Rol:** QA

**Contexto:** Un entorno controlado evita que las pruebas dependan de la máquina de cada persona o de datos reales.

**Descripción:** Define los entornos del proyecto (desarrollo, pruebas), cómo se aíslan entre sí, qué datos de prueba se usan (sin datos reales de alumnos) y cómo se garantiza reproducibilidad entre entornos.

**Dependencias:** Se apoya en el pipeline del Issue 5.10a y en el despliegue del Issue 1.10.

**Criterios de aceptación:**
- [ ] Define los entornos existentes (local, CI y el desplegado en Vercel, Render y Supabase), su propósito y sus limitaciones (cold starts de Render, pausa de Supabase por inactividad)
- [ ] Define el origen de los datos de prueba (no reales)
- [ ] Define cómo se verifica que el pipeline de CI/CD reproduce el mismo resultado en cualquier entorno
- [ ] Referencia el script de seed del Issue 5.17 como origen de los datos de prueba

**Labels:** `epic:calidad`, `docs`

---

### Issue 5.14 — Informe de Resumen de Pruebas
**Milestone:** Cierre · **Rol:** QA

**Contexto:** Es el documento que dice si el sistema cumple los criterios de salida acordados.

**Descripción:** Documento de cierre: qué se probó, tasa de éxito/fallo por tipo de prueba, defectos encontrados vs. resueltos, cobertura final lograda, resultado de la validación manual (Issue 5.15), y si se cumplieron los criterios de salida para la entrega.

**Dependencias:** Usa los resultados de todas las suites y de la validación del Issue 5.15.

**Criterios de aceptación:**
- [ ] Resume resultados de todas las suites de prueba (unitarias, integración, E2E, carga)
- [ ] Incluye hallazgos de la validación manual del Issue 5.15
- [ ] Concluye explícitamente si el sistema cumple los criterios de salida definidos en el Issue 5.12

**Labels:** `epic:calidad`, `docs`

---

### Issue 5.15 — Validación manual y exploratoria de los flujos completos
**Milestone:** Cierre · **Rol:** QA

**Contexto:** Las pruebas automáticas no detectan mensajes confusos ni UX inconsistente: una persona debe recorrer el sistema completo.

**Descripción:** Recorrido manual del sistema integrado (importar → asignación → consulta del estudiante → alerta → mapa visual) buscando problemas que las pruebas automatizadas no capturan: mensajes confusos, UX inconsistente, casos borde no cubiertos. Complementa, no reemplaza, al Issue 5.9.

**Dependencias:** Complementa las pruebas del Issue 5.9.

**Criterios de aceptación:**
- [ ] Se recorre al menos una vez cada flujo completo end-to-end del sistema
- [ ] Los hallazgos quedan documentados y alimentan el Issue 5.14
- [ ] Revisa el diseño responsive y la accesibilidad de las vistas del alumno, del docente y del panel (RNF-04 y RNF-05)
- [ ] Recorre también el flujo de asignación a demanda y la lista de secciones escaladas

**Labels:** `epic:calidad`, `testing`

---

### Issue 5.16 — Pruebas de cercanía entre secciones paralelas
**Milestone:** Sprint 2 · **Rol:** QA · Valida: Issue 2.13

**Contexto:** Valida la función que puntúa la cercanía a las secciones paralelas.

**Descripción:** Casos: curso sin otras secciones paralelas asignadas (puntuación neutra), secciones paralelas en el mismo piso, en piso adyacente y en piso no adyacente. Repetido para aulas y para laboratorios. Los casos de desempate (Issue 2.14) se cubren en el Issue 5.7.

**Dependencias:** Valida el Issue 2.13.

**Criterios de aceptación:**
- [ ] Cubre puntuación neutra sin secciones paralelas, mismo piso, piso adyacente y piso no adyacente, para aulas y laboratorios
- [ ] Los casos descritos pasan en CI y la cobertura del módulo es ≥ 85 %

**Labels:** `epic:calidad`, `testing`, `unitarias`

---

### Issue 5.17 — Script de seed y dataset de demostración
**Milestone:** Sprint 3 · **Rol:** QA

**Contexto:** Los importadores y el mapa funcionan, pero ningún issue dice que se cargue el sistema con datos. Sin un seed, cada persona arma su base a mano, las pruebas no son reproducibles y la sustentación depende de que alguien cargue los datos correctos.

**Descripción:** Script único que reconstruye la base desde cero (local, CI y Supabase) con los espacios reales del edificio, las cuentas de sistema y un conjunto de datos maestros sintéticos, cargado a través de los importadores (Issues 1.3 a 1.5 y 1.8). Incluye un escenario de demostración y un conjunto de volumen para k6.

**Qué carga:**
- Los espacios del edificio con tipo, pabellón, piso, identificador, aforo, PCs malogradas y software, y su contigüidad (Issue 2.2).
- Las cuentas de Coordinación y de Jefatura, con sus laboratorios asignados (EspacioResponsable).
- Datos maestros sintéticos: cursos, secciones (con secciones paralelas), docentes, horarios, alumnos y matrículas, incluidos alumnos con movilidad reducida.

**Escenario de demostración:** Un conjunto documentado que ejercita la asignación, el escalamiento, una alerta de software, una alerta de capacidad y una incidencia, para que la sustentación sea predecible.

**Fuera de alcance:** Datos reales de alumnos: se usan datos sintéticos (Issue 5.13). Usar la matrícula real requeriría el permiso de la facultad.

**Notas técnicas:** Supabase gratuito no hace backups y se pausa por inactividad, así que este script es también el plan de recuperación de la base.

**Dependencias:** Usa los importadores (Issues 1.3 a 1.5 y 1.8), el seed de contigüidad (Issue 2.2) y el modelo del Issue 1.2.

**Criterios de aceptación:**
- [ ] Un solo comando reconstruye la base, y correrlo dos veces no duplica registros
- [ ] Carga todos los espacios (tipo, pabellón, piso, aforo, PCs malogradas, software) y la contigüidad del Issue 2.2
- [ ] Crea las cuentas de Coordinación y de Jefatura y asigna los laboratorios de esta última (EspacioResponsable)
- [ ] Los datos de alumnos, docentes y matrículas son sintéticos (Issue 5.13), con secciones paralelas y alumnos con movilidad reducida
- [ ] Incluye un escenario de demostración documentado que ejercita asignación, escalamiento, alerta de software, alerta de capacidad e incidencia
- [ ] Ofrece un conjunto de volumen configurable para la primera corrida de k6 (Issue 5.8)

**Labels:** `epic:calidad`, `testing`, `database`, `datos`

---

### Issue 5.18 — Revisión de cobertura y corrección de bugs de SonarCloud
**Milestone:** Sprint 5 · **Rol:** QA

**Contexto:** El gate de cobertura (≥ 85 %, Issue 5.10b) se activa en el Sprint 3, pero el código de integraciones sigue creciendo hasta el Sprint 4. Los issues de pruebas 5.1 a 5.7 cubren el motor; los importadores, la autenticación, las alertas y los endpoints del portal no tienen un issue de pruebas propio.

**Descripción:** Revisa el reporte de cobertura y de SonarCloud sobre el sistema ya integrado, escribe las pruebas que faltan y corrige o hace corregir los bugs críticos.

**Fuera de alcance:** Corregir el código de otros roles: los bugs se abren como issues `bug` y los atienden sus dueños (Issue 5.19).

**Dependencias:** Usa el gate del Issue 5.10b.

**Criterios de aceptación:**
- [ ] La cobertura global es ≥ 85 % y no hay bugs críticos abiertos en SonarCloud
- [ ] Los módulos con menor cobertura (importadores, autenticación, alertas y endpoints del portal) tienen pruebas nuevas
- [ ] Cada bug crítico abierto tiene un issue `bug` trazable

**Labels:** `epic:calidad`, `testing`, `quality`

---

### Issue 5.19 — Corrección de bugs de sistema (E2E y carga)
**Milestone:** Sprint 5 · **Rol:** BM + BI

**Contexto:** Las pruebas de extremo a extremo y de carga (Issues 5.8 y 5.9) abren issues `bug` en lugar de corregir en silencio. En el Sprint 5, BM y BI no tienen otras tareas asignadas: este issue reserva ese tiempo para atenderlos.

**Descripción:** Corrige los bugs de backend y del motor que detecten las pruebas E2E y de carga, y valida la corrección con la misma prueba que los encontró.

**Fuera de alcance:** Los bugs de frontend, que atiende FE dentro de sus issues del Sprint 5.

**Dependencias:** Usa los issues `bug` abiertos por los Issues 5.8 y 5.9.

**Criterios de aceptación:**
- [ ] Cada issue `bug` de backend abierto por las pruebas E2E y de carga se cierra, o se difiere con una justificación escrita
- [ ] Tras cada corrección, la prueba que detectó el bug pasa en verde
- [ ] Las correcciones que afectan el comportamiento quedan anotadas en el Registro de Versiones

**Labels:** `epic:calidad`, `backend`, `bug`

---


## 📄 Épica: Documentación y Gestión
`epic:docs`

### Issue 6.1 — Historias de Usuario y Requisitos
**Milestone:** Sprint 0 · **Rol:** LP

**Contexto:** Las historias de usuario son el origen de los requisitos: cada requisito funcional debe poder trazarse a una historia.

**Descripción:** Historias de usuario del sistema (estudiante, docente, Coordinación Académica y Jefatura de Laboratorios) que dan origen a los requisitos funcionales de `02_requisitos.md`.

**Dependencias:** Alimenta el documento de requisitos y el Plan de Línea Base (Issue 6.3).

**Criterios de aceptación:**
- [ ] Historias redactadas para cada actor principal (estudiante, docente, Coordinación Académica y Jefatura de Laboratorios)
- [ ] Cada RF de `02_requisitos.md` se puede trazar a al menos una historia

**Labels:** `epic:docs`, `docs`, `gestion`

---

### Issue 6.2 — Documentar el modelo de reglas y decisiones de alcance
**Milestone:** Sprint 0 · **Rol:** LP

**Contexto:** Deja escrito qué entra y qué no entra en el MVP, y por qué, para que las decisiones de alcance no dependan de la memoria de nadie.

**Descripción:** Dejar en `/docs` el documento de definición de alcance, con la justificación de qué queda dentro y fuera del MVP.

**Dependencias:** Es la base de la línea base funcional (Issue 6.4).

**Criterios de aceptación:**
- [ ] El documento de alcance lista lo que entra al MVP y lo que queda fuera, con la justificación de cada exclusión
- [ ] Está en `/docs` y queda congelado en la línea base funcional (Issue 6.4)

**Labels:** `epic:docs`, `docs`, `gestion`

---

### Issue 6.3 — Plan de Línea Base
**Milestone:** Sprint 0 · **Rol:** LP

**Contexto:** Sin un procedimiento de cambios, todo se puede modificar en cualquier momento y las líneas base pierden sentido.

**Descripción:** Define qué constituye cada línea base del proyecto (funcional, de diseño, de producto), quién la aprueba y cómo se solicita un cambio sobre algo ya congelado.

**Dependencias:** Lo usan las actas del Issue 6.4. Cualquier cambio sobre un elemento congelado sigue este procedimiento.

**Criterios de aceptación:**
- [ ] Define las 3 líneas base del proyecto y qué documentos/entregables congela cada una
- [ ] Define el procedimiento de control de cambios sobre un elemento ya congelado

**Labels:** `epic:docs`, `docs`, `gestion`

---

### Issue 6.4 — Actas de Aprobación de Línea Base
**Milestone:** Fin de Sprint 0 (funcional) / Fin de Sprint 1 (diseño) / Cierre (producto) · **Rol:** LP

**Contexto:** Cada acta deja constancia de qué quedó congelado, quién lo aprobó y cuándo.

**Descripción:** Acta corta que registra qué queda congelado, quién la aprobó y en qué fecha, siguiendo la plantilla del Issue 6.3. Se genera 3 veces sobre el mismo issue.

**Dependencias:** Sigue la plantilla del Issue 6.3.

**Criterios de aceptación:**
- [ ] Acta de línea base funcional generada al cierre del Sprint 0
- [ ] Acta de línea base de diseño generada al cierre del Sprint 1
- [ ] Acta de línea base de producto generada en Cierre

**Labels:** `epic:docs`, `docs`, `gestion`

---

### Issue 6.5 — Documento de Arquitectura del sistema
**Milestone:** Sprint 0 (borrador) / Sprint 4 (versión final) · **Rol:** BM (con aporte de BI)

**Contexto:** Reúne las decisiones técnicas del proyecto en un solo lugar, para que el equipo y quien evalúe entiendan por qué el sistema está armado como está.

**Descripción:** Componentes, tecnologías, infraestructura y despliegue, seguridad, flujo de datos (con el modelo de datos del Issue 1.2 documentado en el Documento de Modelo de Datos), decisiones técnicas clave, los triggers de cada proceso y el principio "automatización de decisión, no de infraestructura".

**Dependencias:** Se apoya en el Documento de Modelo de Datos (Issue 1.2) y se actualiza al cierre de la implementación.

**Criterios de aceptación:**
- [ ] Versión inicial: diagrama de componentes, modelo de datos y flujo de datos de alto nivel
- [ ] Versión inicial: sección explícita de triggers de cada proceso y su justificación
- [ ] Versión final: refleja decisiones reales tomadas durante la implementación
- [ ] Incluye las secciones de tecnologías, infraestructura y despliegue, y seguridad

**Labels:** `epic:docs`, `docs`

---

### Issue 6.6 — Documento de Diseño (UI/UX)
**Milestone:** Sprint 1 · **Rol:** FE

**Contexto:** Los wireframes se acuerdan antes de construir cualquier componente, para no rehacer pantallas.

**Descripción:** Wireframes y flujos de pantalla del portal del estudiante y del panel de alertas/mapa visual, antes de construir cualquier componente.

**Dependencias:** Lo usan los Issues 3.5, 3.6, 4.9 y 4.13, entre otros.

**Criterios de aceptación:**
- [ ] Wireframes de las pantallas del portal del estudiante y del portal del docente
- [ ] Wireframes de las pantallas del panel de alertas y del mapa visual
- [ ] Los Issues 3.5, 3.6, 4.9 y 4.13 se construyen a partir de este documento
- [ ] Wireframes de las vistas de Jefatura de Laboratorios

**Labels:** `epic:docs`, `docs`, `frontend`

---

### Issue 6.7 — Guía de Estilos
**Milestone:** Sprint 1 · **Rol:** FE

**Contexto:** Una guía de estilos común evita que cada pantalla se vea distinta y fija de antemano las reglas de accesibilidad (RNF-05).

**Descripción:** Paleta de colores, tipografía, espaciados y componentes reutilizables, incluyendo las reglas de contraste y tamaño de fuente que exige RNF-05.

**Dependencias:** Lo usan todos los issues de interfaz y el Issue 3.23.

**Criterios de aceptación:**
- [ ] Define paleta, tipografía y espaciados
- [ ] Define reglas de contraste mínimo y tamaño de fuente legible

**Labels:** `epic:docs`, `docs`, `frontend`

---

### Issue 6.8 — Registro de Versiones
**Milestone:** Continuo, desde Sprint 1 · **Rol:** BI

**Contexto:** Los cambios de esquema, endpoints y comportamiento del importador deben quedar registrados, para poder explicar qué cambió entre una entrega y otra.

**Descripción:** Registro de qué cambia en cada entrega relevante del sistema (esquema de datos, endpoints, comportamiento del importador).

**Dependencias:** Lo alimentan los issues que cambian el esquema, la API o los importadores.

**Criterios de aceptación:**
- [ ] Cada entrega relevante queda registrada con fecha, alcance del cambio y motivo

**Labels:** `epic:docs`, `docs`, `gestion`

---

### Issue 6.9 — Documentación final y material de sustentación
**Milestone:** Cierre · **Rol:** LP (con aporte de todo el equipo)

**Contexto:** Es el cierre documental del proyecto: lo que evalúa quien revisa y lo que usaría alguien que herede el sistema.

**Descripción:** Informe final, README actualizado, manual técnico y de usuario, material de demo.

**Dependencias:** Se alimenta de todos los documentos anteriores.

**Criterios de aceptación:**
- [ ] Informe final entregado
- [ ] README refleja el estado real del sistema
- [ ] Manual técnico y de usuario completos
- [ ] Incluye la lista de tecnologías y la guía para reconstruir la base con el seed (Issue 5.17)

**Labels:** `epic:docs`, `docs`, `gestion`

---

### Issue 6.10 — Planos SVG por piso y pabellón
**Milestone:** Sprint 2 · **Rol:** FE

**Contexto:** El documento de alcance habla de «planos fijos por piso/pabellón» y los Issues 4.13, 3.18 y 3.19 los usan, pero ningún issue los produce. Tampoco hay quien defina cómo se enlaza un dibujo con un espacio de la base de datos.

**Descripción:** Define y produce los planos SVG del edificio, uno por piso y pabellón, que usan el mapa 2D (Issues 4.13 y 3.18), la pantalla de ruta (Issue 3.19) y la vista 3D. Documenta la convención del SVG para enlazar dibujo y datos por identificador.

**Qué se define:**
- Qué dibujan los planos: el edificio real o un esquema simplificado (decisión a tomar antes del Sprint 2).
- La convención de ids: cada espacio es una figura cuyo id combina pabellón e identificador (p. ej. `A-101`), igual al identificador que guarda la base.
- Las capas: espacios, muros, puertas, escaleras, ascensor, entrada del pabellón y patios.
- La escala y la orientación, iguales en todos los pisos.

**Notas técnicas:** Los SVG viven en el repositorio (`/assets/planos`). Un script de validación comprueba que los ids del SVG coinciden con los espacios sembrados, para detectar diferencias temprano.

**Dependencias:** Requiere el seed de espacios del Issue 2.2. Lo usan los Issues 4.13, 3.18, 3.19 y 4.23.

**Criterios de aceptación:**
- [ ] Hay un SVG por cada piso de cada pabellón, versionado en el repositorio
- [ ] Cada espacio es una figura cuyo id combina pabellón e identificador, igual al de la base
- [ ] Las capas están separadas: espacios, muros, puertas, escaleras, ascensor, entrada del pabellón y patios
- [ ] La escala y la orientación están documentadas y son iguales en todos los pisos
- [ ] Un script de validación comprueba que los ids del SVG coinciden con los espacios sembrados (Issues 2.2 y 5.17)
- [ ] La convención queda documentada en el Documento de Diseño (Issue 6.6)

**Labels:** `epic:docs`, `docs`, `frontend`

---

### Issue 6.11 — Ensayo de sustentación y lista previa a la demo
**Milestone:** Cierre · **Rol:** LP (con todo el equipo)

**Contexto:** El ensayo y la entrega aparecían en el cronograma sin un issue que los respalde. La demo en vivo depende de infraestructura gratuita que se duerme o se pausa, y eso hay que preverlo.

**Descripción:** Ensayo completo de la sustentación con el sistema desplegado, y una lista de verificación que se recorre antes de la demo real.

**Lista previa a la demo:**
- Reactivar el proyecto de Supabase si está pausado.
- Calentar el backend de Render para evitar el primer arranque lento.
- Correr el seed con el escenario de demostración (Issue 5.17).
- Verificar las cuentas de demostración y que el mapa muestre los estados esperados.
- Tener un plan de respaldo: capturas o video del recorrido si falla la conexión.

**Fuera de alcance:** La documentación final (Issue 6.9) y la entrega (Issue 6.12).

**Dependencias:** Requiere el sistema completo y el escenario del Issue 5.17.

**Criterios de aceptación:**
- [ ] El ensayo recorre el guion completo de la sustentación con el sistema desplegado
- [ ] Existe una lista previa a la demo y se ejecutó completa al menos una vez
- [ ] Los problemas encontrados en el ensayo quedan registrados como issues o resueltos
- [ ] Cada integrante conoce su parte de la exposición

**Labels:** `epic:docs`, `gestion`

---

### Issue 6.12 — Entrega final
**Milestone:** Cierre · **Rol:** LP

**Contexto:** La entrega final es un hito con fecha fija (29 de noviembre) y un conjunto de artefactos que deben estar completos y consistentes entre sí.

**Descripción:** Reúne, revisa y entrega todos los artefactos del proyecto en la fecha de cierre.

**Qué se entrega:** Código en el repositorio, sistema desplegado, documentación final (Issue 6.9), informe de pruebas (Issue 5.14), actas de línea base (Issue 6.4) y el Registro de Versiones (Issue 6.8).

**Dependencias:** Requiere los Issues 5.14, 6.4 y 6.9.

**Criterios de aceptación:**
- [ ] Todos los artefactos del proyecto están completos, versionados y entregados en la fecha de cierre
- [ ] Las líneas base funcional, de diseño y de producto tienen su acta aprobada
- [ ] El repositorio tiene el README actualizado y la versión final etiquetada

**Labels:** `epic:docs`, `gestion`

---


## 🧑‍🏫 Épica: Portal del Docente
`epic:portal-docente`

Portal propio para docentes, con su propio login (cuenta creada por Coordinación Académica, sin autorregistro — ver Issues 1.8 y 4.18). No forma parte del alcance original (`01_definicion_y_alcance.md` v1); se incorpora tras revisar el diseño completo en Figma, que ya contemplaba estas 11 pantallas con un flujo coherente, incluyendo su contraparte administrativa (revisión de incidencias por Jefatura).

### Issue 7.1 — Extender autenticación (JWT) con rol "docente"
**Milestone:** Sprint 3 · **Rol:** BI

**Contexto:** El docente con sesión ve su horario, sus asignaciones y puede reportar incidencias. Reutiliza el mecanismo del panel, sin crear uno nuevo.

**Descripción:** Añade "docente" como rol de acceso sobre el mecanismo de autenticación del Issue 4.8. El docente **no se autorregistra**: su cuenta es creada por Coordinación Académica (Issues 1.8 y 4.18); este issue solo cubre el login con credenciales ya existentes.

**Dependencias:** Usa el Issue 4.8. Las cuentas las crean los Issues 1.8 y 4.18.

**Criterios de aceptación:**
- [ ] El login de docente emite un token JWT válido, distinguible por rol de los de Coordinación/Jefatura/Alumno
- [ ] Rechaza login con credenciales que no correspondan a una cuenta de docente ya creada por admin
- [ ] Usa el Issue 4.8, no reimplementa el mecanismo de autenticación
- [ ] El login informa si la cuenta debe cambiar su clave inicial (`debe_cambiar_clave`)

**Labels:** `epic:portal-docente`, `backend`, `docente`

---

### Issue 7.2 — Servicio + endpoint: horario y asignaciones activas de un docente
**Milestone:** Sprint 3 · **Rol:** BI

**Contexto:** Es la vista principal del docente: qué tiene que dictar y dónde.

**Descripción:** Dado un docente autenticado, devuelve su horario (día y semana) y la lista de sus asignaciones activas del periodo (curso, sección, espacio, horario, número de alumnos).

**Notas técnicas:** Usa el JWT del docente: solo devuelve sus propias secciones. Considera el periodo vigente.

**Dependencias:** Requiere el login del Issue 7.1 y las asignaciones de los Issues 2.10 y 2.11.

**Criterios de aceptación:**
- [ ] Devuelve todas las sesiones del docente, agrupadas por día y por semana
- [ ] Devuelve la lista de asignaciones activas con curso, sección, espacio y horario
- [ ] Requiere autenticación de docente

**Labels:** `epic:portal-docente`, `backend`, `docente`

---

### Issue 7.3 — Endpoint: explorar disponibilidad de espacios (vista docente)
**Milestone:** Sprint 3 · **Rol:** BI

**Contexto:** Permite al docente ver qué espacios están libres antes de proponer un cambio o reportar un problema.

**Descripción:** Permite a un docente autenticado explorar y filtrar los espacios del campus (tipo, pabellón, piso, capacidad), viendo su disponibilidad actual.

**Dependencias:** Usa la función de disponibilidad del Issue 2.4.

**Criterios de aceptación:**
- [ ] Soporta filtro por tipo de espacio (aula teórica / laboratorio), pabellón y piso
- [ ] Muestra la disponibilidad actual de cada espacio
- [ ] Usa el Issue 2.4, no reimplementa la lógica de disponibilidad

**Labels:** `epic:portal-docente`, `backend`, `docente`

---

### Issue 7.4 — Endpoint: estado de equipos del laboratorio del docente
**Milestone:** Sprint 4 · **Rol:** BI

**Contexto:** Antes de una clase en laboratorio, el docente necesita saber si el laboratorio tiene las PCs y el software que su curso requiere.

**Descripción:** Dado un docente autenticado, devuelve el estado operativo de PCs y el software instalado del laboratorio de su próxima clase.

**Casos borde:** Docente sin próxima clase en laboratorio; laboratorio con software faltante (se avisa); bloque de varios laboratorios (se muestran todos).

**Dependencias:** Usa los Issues 1.2 y 2.1.

**Criterios de aceptación:**
- [ ] Devuelve PCs operativas/inoperativas y software instalado del laboratorio de la próxima clase del docente
- [ ] Devuelve un aviso si el laboratorio no tiene el software requerido por el curso
- [ ] Usa los Issues 1.2 y 2.1, no reimplementa esa lógica

**Labels:** `epic:portal-docente`, `backend`, `docente`

---

### Issue 7.5 — Endpoint: registrar incidencia reportada por un docente
**Milestone:** Sprint 3 · **Rol:** BI

**Contexto:** Cuando algo falla en el espacio asignado (una PC apagada, un software faltante), el docente necesita una forma de avisar y de obtener un número de seguimiento.

**Descripción:** Permite a un docente autenticado reportar una incidencia sobre el espacio que tiene asignado (tipo, descripción, prioridad, evidencia opcional), y persiste el reporte con un identificador de seguimiento.

**Dependencias:** Requiere el login del Issue 7.1. La atiende el Issue 7.6.

**Criterios de aceptación:**
- [ ] Recibe tipo de incidencia, descripción, prioridad, la asignación afectada y el espacio del bloque sobre el que se reporta, y genera un identificador único
- [ ] Responde con el identificador de seguimiento y la confirmación de envío
- [ ] La incidencia queda visible para el Issue 7.6

**Labels:** `epic:portal-docente`, `backend`, `database`, `docente`

---

### Issue 7.6 — Endpoint: listar y resolver incidencias reportadas (Jefatura)
**Milestone:** Sprint 4 · **Rol:** BI

**Contexto:** Es la contraparte del reporte: Jefatura revisa cada incidencia con el detalle técnico del laboratorio y decide si se resuelve o se descarta.

**Descripción:** Permite a Jefatura de Laboratorios listar las incidencias reportadas por docentes (Issue 7.5), ver el detalle técnico del espacio asociado (aforo, PCs inoperativas, software instalado) y marcarlas como resueltas o descartadas.

**Notas técnicas:** Jefatura solo ve las incidencias de sus laboratorios (EspacioResponsable).

**Dependencias:** Usa el Issue 7.5 y la autenticación del Issue 4.8.

**Criterios de aceptación:**
- [ ] Lista las incidencias con su estado, ordenadas por fecha
- [ ] El detalle de cada incidencia incluye el estado técnico del espacio (aforo, PCs, software)
- [ ] Permite marcar una incidencia como resuelta o descartada
- [ ] Requiere autenticación de Jefatura de Laboratorios
- [ ] Jefatura solo ve las incidencias de los laboratorios bajo su responsabilidad

**Labels:** `epic:portal-docente`, `backend`, `panel-admin`

---

### Issue 7.7 — Componente UI: login de docente
**Milestone:** Sprint 3 · **Rol:** FE

**Contexto:** Es la pantalla de entrada del docente. No invita a «crear cuenta»: las cuentas las crea Coordinación.

**Descripción:** Pantalla de login del docente, siguiendo el Documento de Diseño (Issue 6.6). No incluye autorregistro: la cuenta ya existe, creada por Coordinación Académica (Issues 4.18).

**Dependencias:** Usa el login del Issue 7.1 y sigue el patrón visual del Issue 3.22.

**Criterios de aceptación:**
- [ ] Formulario de login con correo y contraseña
- [ ] Mensaje claro si las credenciales no corresponden a una cuenta creada por admin (no invita a "crear cuenta")

**Labels:** `epic:portal-docente`, `frontend`, `docente`

---

### Issue 7.8 — Componente UI: inicio, horario y asignaciones del docente
**Milestone:** Sprint 4 · **Rol:** FE

**Contexto:** Es lo primero que ve el docente al iniciar sesión.

**Descripción:** Construye la pantalla de inicio del docente (próxima clase, accesos rápidos) y las vistas de horario (día/semana) y asignaciones activas. Se construye con datos de ejemplo.

**Dependencias:** Se construye a partir del Documento de Diseño (Issue 6.6). Se conecta con datos reales en el Issue 7.12.

**Criterios de aceptación:**
- [ ] La pantalla de inicio muestra la próxima clase con cuenta regresiva
- [ ] El horario alterna entre vista de día y semana
- [ ] La vista de asignaciones muestra todas las secciones activas del docente

**Labels:** `epic:portal-docente`, `frontend`, `docente`

---

### Issue 7.9 — Componente UI: explorador de espacios y estado de equipos (vista docente)
**Milestone:** Sprint 4 · **Rol:** FE

**Contexto:** Le permite al docente explorar el campus y revisar su laboratorio antes de clase.

**Descripción:** Construye la vista de exploración de salas/laboratorios (con filtro por tipo) y la vista de estado de equipos del laboratorio del docente. Se construye con datos de ejemplo.

**Dependencias:** Se construye a partir del Documento de Diseño (Issue 6.6). Se conecta con datos reales en el Issue 7.12.

**Criterios de aceptación:**
- [ ] El explorador filtra por tipo de espacio (aula teórica/laboratorio) y muestra disponibilidad
- [ ] La vista de estado de equipos muestra PCs operativas/inoperativas y software instalado

**Labels:** `epic:portal-docente`, `frontend`, `docente`

---

### Issue 7.10 — Componente UI: reportar incidencia + confirmación
**Milestone:** Sprint 4 · **Rol:** FE

**Contexto:** Es el formulario con el que el docente reporta una incidencia.

**Descripción:** Construye el formulario de reporte de incidencia (tipo, descripción, prioridad, evidencia opcional) y la pantalla de confirmación con el identificador de seguimiento. Se construye con datos de ejemplo.

**Dependencias:** Se construye a partir del Documento de Diseño (Issue 6.6). Se conecta con el Issue 7.5 en el Issue 7.12.

**Criterios de aceptación:**
- [ ] El formulario valida tipo de incidencia y descripción como campos obligatorios antes de habilitar el envío
- [ ] La confirmación muestra el identificador, prioridad y ubicación del reporte

**Labels:** `epic:portal-docente`, `frontend`, `docente`

---

### Issue 7.11 — Componente UI: revisión de incidencias (Jefatura)
**Milestone:** Sprint 4 · **Rol:** FE

**Contexto:** Es la pantalla con la que Jefatura atiende las incidencias que reportan los docentes.

**Descripción:** Construye la vista donde Jefatura de Laboratorios revisa una incidencia reportada, con el detalle técnico del laboratorio asociado, y la resuelve o descarta. Se construye con datos de ejemplo. El diseño de referencia en Figma (`37:5028`) todavía tiene texto placeholder ("Etiqueta"/"Valor") sin editar — confirmar los campos reales antes de construir sobre él.

**Dependencias:** Se construye a partir del Documento de Diseño (Issue 6.6). Se conecta con el Issue 7.6 en el Issue 7.12.

**Criterios de aceptación:**
- [ ] Muestra el detalle técnico del espacio (aforo real, PCs inoperativas, software instalado) junto a la incidencia
- [ ] Expone acciones para resolver o descartar la incidencia

**Labels:** `epic:portal-docente`, `frontend`, `panel-admin`

---

### Issue 7.12 — Integrar todas las vistas de docente con endpoints reales
**Milestone:** Sprint 5 · **Rol:** FE

**Contexto:** Reemplaza los datos de ejemplo de las vistas del docente por los endpoints reales.

**Descripción:** Conecta los Issues 7.7, 7.8, 7.9, 7.10 y 7.11 con sus endpoints reales (Issues 7.1 a 7.6).

**Dependencias:** Usa los Issues 7.1 a 7.6.

**Criterios de aceptación:**
- [ ] El flujo completo funciona de extremo a extremo: login → inicio → horario/asignaciones/espacios/incidencias, con datos reales
- [ ] La revisión de incidencias por Jefatura refleja cambios de estado sin recargar la página
- [ ] Maneja estados de carga y error de red en cada vista

**Labels:** `epic:portal-docente`, `frontend`, `docente`

---
