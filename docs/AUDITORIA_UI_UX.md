# Auditoría UI/UX – SAIE (Sistema de Asignación Inteligente de Espacios)

**Fecha:** 2026-10-21 | **Alcance:** `frontend/src` completo (portal público, área del alumno, panel administrativo, componentes `ui/`, servicios y utilidades) | **Versión del documento:** 1.0

> Documento de **diagnóstico**. No se ha modificado código de producción. Todos los hallazgos están en estado **Pendiente** hasta que se apruebe la auditoría y se ejecute el plan (§7).
> Rutas relativas a `frontend/src/` salvo que se indique otra cosa. Los números de línea corresponden al commit `2c22615` de la rama `feature/sprint3-cierre-panel-gestion-individual`.
> Sustituye a una auditoría previa del mismo nombre (sin versionar). El documento histórico `docs/auditoria_ux_ui_frontend.md` no se toca.

---

## 1. Resumen ejecutivo

SAIE tiene una base visual coherente (paleta guinda/crema, tipografía serif en títulos, foco visible global, `prefers-reduced-motion`, sesión vencida bien resuelta, pruebas con axe). El problema no es la falta de sistema de diseño sino que **el sistema existe a medias y cada pantalla lo reimplementa**: hay un `Boton`, un `BadgeEstado`, un `Aviso` y un `Drawer`, pero 15 archivos de pantalla o de funcionalidad siguen declarando `<button>` propios, el estado «sin aula» tiene al menos seis redacciones distintas, y la tarjeta más visible del portal público (`TarjetaResultado`) vive fuera de los tokens con 38 colores hexadecimales y 20 usos de una paleta Tailwind ajena.

Lo más grave no es estético sino de **veracidad del dato mostrado**: hay un caso en que el alumno ve «Espacio confirmado» y «Aún no hay aula asignada» a la vez, el tablero de Coordinación muestra una cifra equivocada como «Con aula nueva», y el día de la semana llega al usuario como `LUNES`. Segundo bloque: **no existe una capa central de errores ni de etiquetas** — los códigos del backend se traducen con mapas locales sin valor por defecto, y los mensajes de error se resuelven con 13 `catch` distintos.

El área del alumno tiene además una inconsistencia estructural: el inicio y las pantallas internas usan dos marcos distintos (las internas no tienen «Cerrar sesión» ni logo), y las pantallas de Ayuda y Configuración existen pero no tienen ruta.

### 1.1 Conteo de hallazgos

| Categoría | Alta | Media | Baja | Total |
| --- | ---: | ---: | ---: | ---: |
| VIS · Uniformidad visual | 5 | 11 | 6 | 22 |
| DEN · Densidad de información | 4 | 14 | 4 | 22 |
| MAP · Mapeo de datos del backend | 6 | 6 | 3 | 15 |
| FDB · Feedback al usuario | 3 | 9 | 2 | 14 |
| ACC · Accesibilidad | 4 | 6 | 6 | 16 |
| RES · Responsive | 4 | 5 | 2 | 11 |
| PER · Rendimiento percibido | 0 | 3 | 3 | 6 |
| TXT · UX writing | 0 | 5 | 7 | 12 |
| **Total** | **26** | **59** | **33** | **118** |

**Avance:** 51 de 118 hallazgos resueltos y 8 en progreso; el resto sigue Pendiente. Etapas 1 a 4 completadas; faltan las etapas 5 a 9 (ver §9.3).

*Excluye 2 hallazgos descartados: `DEN-13` (por decisión del equipo) y `ACC-05` (desmentido en navegador).*

### 1.2 Los 5 problemas más críticos

| # | ID | Problema | Por qué importa |
| --- | --- | --- | --- |
| 1 | `MAP-03` | `TarjetaResultado` muestra a la vez la insignia «Espacio confirmado» y el aviso «Aún no hay aula asignada» cuando una sección `VIGENTE` llega sin espacios | Información contradictoria sobre dónde es su clase, en la pantalla pública que usa cualquier alumno |
| 2 | `MAP-04` + `MAP-01` + `MAP-02` | Se muestran valores crudos del backend: `LUNES` en el portal público y en Secciones, `ALUMNO`/`DOCENTE` en la cabecera, UUID de corrida y texto técnico en Auditoría | Rompe la regla «nunca mostrar códigos»; ya existen los diccionarios (`ETIQUETA_DIA`, `etiquetaRol`) pero no se usan en esos sitios |
| 3 | `FDB-02` + `MAP-06` | Sin manejo global de errores: 13 `catch` independientes, `mensajeDeError` vive en el servicio del alumno, un *timeout* se reporta como «Revisa tu conexión» y los 4xx pasan el `message` del backend sin filtrar | Mensajes inconsistentes y a veces engañosos; cada pantalla reinventa el bloque de error (7 variantes) |
| 4 | `FDB-01` | Cerrar el drawer, pulsar Escape o navegar descarta cambios en formularios de Espacio, Sección y Laboratorio sin avisar, aunque el formulario ya calcula `hayCambios` | Pérdida silenciosa de trabajo en el flujo principal de Coordinación |
| 5 | `DEN-02` | «Con aula nueva» en el tablero cae al total de escaladas cuando no hay corrida y repite la cifra de «Esperan revisión» | Métrica engañosa en la primera pantalla del coordinador |

La pasada en navegador añadió tres problemas altos de maquetación: `RES-08` (el inicio del alumno desborda a 712 px en un móvil de 390), `RES-09` (el panel admin desborda a 768 px) y `RES-03` verificado (el tablero de Coordinación corta contenido en ventanas de 600 px de alto). Siguientes en gravedad: `ACC-12` (los ajustes «Texto grande» y «Reducir movimiento» no hacen nada), `ACC-01` (contraste 4.48:1 en el badge de advertencia), `ACC-02` (sin `document.title` por ruta ni enlace «saltar al contenido»), `RES-01` (dos marcos distintos en el área del alumno), `DEN-20` (Ayuda y Configuración sin ruta) y `FDB-14` (sin `ErrorBoundary`: un fallo de render deja la página en blanco), `VIS-02` (dos implementaciones del badge de asignación) y `DEN-01` (listados limitados a 200 que ignoran el `total` que devuelve la API).

### 1.3 Fortalezas verificadas en el código

- `Boton` centraliza variantes, tamaños táctiles de 44/48 px, `cargando`, `textoCargando` y `motivoDeshabilitado` accesible (`components/ui/Boton.tsx`).
- `BadgeEstado` combina color, ícono y texto; los estados no dependen solo del color.
- `Drawer`: diálogo modal con trampa de foco, Escape, bloqueo de scroll y devolución de foco.
- `useCarga` descarta respuestas obsoletas (condición de carrera) y conserva los datos previos al recargar.
- Sesión: el 401 de una petición autenticada cierra la sesión, redirige al login del rol y conserva un aviso de «vencida» (`context/AuthProvider.tsx`, `services/api.ts`); además cierra por expiración del token sin esperar al 401.
- `index.css`: foco visible de 3 px global (`:where` con especificidad 0), `prefers-reduced-motion`, estilos de impresión.
- Existe una pantalla de preferencias de accesibilidad (texto grande, reducir movimiento), pero **hoy no tiene efecto** (ver `ACC-12`).
- Validación por campo con `aria-invalid`/`aria-describedby` en `FormularioEspacio` y `FormularioBusqueda`.
- El motivo de escalamiento ya se traduce a lenguaje llano con acción sugerida (`utils/admin.ts:describirMotivoEscalamiento`), con el código técnico plegado.
- Contraste de la mayoría de pares verificado por cálculo (ver §2.3): texto principal, secundario, borde de campo y éxito cumplen AA.

---

## 2. Alcance y metodología

### 2.1 Qué se revisó

- **Portal público:** `Home`, `Consulta`, `FormularioBusqueda`, `TarjetaResultado`.
- **Autenticación:** `LoginFormBase`, `LoginLayout`, `AccesoDenegado`, `RutaProtegida`, `AuthProvider`, `services/api.ts`.
- **Alumno:** `InicioEstudiante`, `PerfilAlumno`, `SeccionEditable`, `ConfiguracionAlumno`, `TelegramAlumnoPage`, `LayoutEstudiante`, `CabeceraPantalla`, `NavegacionEstudiante`, `ElementosHorario`.
- **Panel administrativo:** `LayoutAdmin`, `InicioAdmin`, `EspaciosAdmin`, `SeccionesAdmin`, `AlertasAdmin`, `TarjetaAlerta`, `AuditoriaAdmin`, `ReporteSalones`, `CargaDatos`, `VeredictoVerificacion`, `ProximamenteAdminPage`.
- **Inventario completo de componentes (31) y de cobertura de estados por pantalla (§4.6, §4.7)**, `max-w` de todo el árbol (§4.4) y uso tipográfico (§4.5).
- **Sistema:** `index.css`, `components/ui/*`, `hooks/useCarga.ts`, `services/*`, `utils/admin.ts`, `config/rutas.ts`, `AppRoutes.tsx`, `index.html`.

### 2.2 Qué no se revisó a fondo (declarado)

- **Lectura completa de todos los componentes y pantallas del alcance** tras tres pasadas (se leyeron todos los archivos de `components/` salvo `mapa3d`, `pages/` salvo docente y `ProximamenteAdminPage` en detalle, `hooks/`, `config/`, `utils/horario.ts`, `utils/perfil.ts`, `utils/admin.ts`, `services/api.ts`, `services/estudiante.ts`, `main.tsx` y `App.tsx`). **Lectura parcial, sin impacto en UI:** `services/admin.ts`, `services/sesion.ts`, `context/AuthProvider.tsx`, `types/*` y el tramo de lógica de `FormularioEspacio` (contiguos y alta).
- **Fuera de alcance:** `components/mapa3d/*` (en curso, issue 4.23), las pantallas de docente y los *placeholders* (`PantallaEnDesarrollo`), el backend (no es objeto de esta revisión de UI/UX; si se desea, puede auditarse aparte la forma de los mensajes de error y los códigos HTTP que devuelve) y las pruebas.
- **Verificado ejecutando:** `vite build` (tamaño del bundle) y una **pasada en navegador (2026-10-21)** con Chromium automatizado (Playwright) contra una API simulada propia, sin tocar la base de datos real: 390, 768 y 1280 px, 640×400 (equivale a zoom 200 %) y ventanas bajas (1280×600, 1366×560, 1024×640); 39 capturas de rutas, medición de anchos, fuentes, objetivos táctiles y foco, y pruebas de interacción (drawers, errores públicos, formularios, teclado, 404). Los hallazgos comprobados dicen «Verificado en navegador».
- **Sigue sin verificarse:** lector de pantalla real (NVDA/VoiceOver), CLS y Lighthouse, el salto de maquetación por la barra de scroll al abrir un drawer (las barras de Chromium sin ventana son superpuestas), el alto contraste de Windows y las respuestas reales del backend (la API simulada respeta el contrato de tipos). Los hallazgos marcados *(por verificar)* dependen de eso. El contraste se calculó con la fórmula WCAG sobre los hex de `index.css`.

### 2.3 Cómo se evaluó

| Técnica | Detalle |
| --- | --- |
| Lectura de código | Componentes compartidos y pantallas, con cita de archivo y línea. |
| Medición por búsqueda | Conteo de colores hex, valores arbitrarios de Tailwind, `<button>` nativos, `catch`, `aria-*`, plurales con `(s)`, etc. (§4). |
| Contraste | Cálculo WCAG 2.x sobre los pares reales de `index.css`: advertencia 4.48:1 ✗; texto/`muted`/éxito/peligro/info ≥ 4.5 ✓; borde de campo 3.68:1 ✓ (1.4.11); `--saie-divider` sobre blanco 1.33:1 (válido solo como decoración). |
| Criterios | Heurísticas de Nielsen, WCAG 2.2 AA, guía propia (`docs/07_guia_de_estilos_ui_ux.md`), y los cinco ejes de la solicitud (uniformidad, densidad, mapeo, feedback, patrones). |

Prioridad: **Alta** = dato incorrecto/contradictorio, pérdida de trabajo o barrera de accesibilidad AA; **Media** = inconsistencia que degrada la experiencia o el mantenimiento; **Baja** = pulido. Esfuerzo: **S** < 2 h, **M** ½–2 días, **L** > 2 días.

---

## 3. Hallazgos por categoría

### 3.1 VIS — Uniformidad visual

| ID | Pantalla/Componente | Archivo(s) | Problema | Impacto | Prioridad | Solución propuesta | Esfuerzo | Estado |
|----|---------------------|------------|----------|---------|-----------|--------------------|----------|--------|
| VIS-01 | Resultado de consulta (portal público) | `components/consulta/TarjetaResultado.tsx` (38 hex; 20 usos de `teal/indigo/emerald/amber/rose`; sombra `shadow-[0_2px_8px…]`) | La tarjeta más vista del sistema no usa tokens: colores literales (`#E6DFD0`, `#7B1113`, `#666666`…) y paleta Tailwind ajena. Reimplementa badges de tipo y de estado | Un cambio de marca o de contraste no la alcanza; deriva visual frente al resto | Alta | Sustituir hex por clases `saie-*`; reemplazar los dos badges locales por `BadgeEstado` + diccionario (ver MAP-03, VIS-02) | M | Pendiente |
| VIS-02 | Badge de estado de asignación | `components/consulta/TarjetaResultado.tsx:73-137`; `components/estudiante/ElementosHorario.tsx:37-67`; `pages/admin/SeccionesAdmin.tsx:41-49` | Tres implementaciones del mismo concepto: emerald/amber/rose con «En revisión»/«Sin asignar»; hex `#C0CA33`(lima)/`#F57C00` con «Clase en revisión»/«Sin aula asignada»; y `BadgeEstado` con «Sin aula · revisión». Colores y textos distintos para el mismo estado | El alumno ve el mismo estado con aspecto y palabra diferentes según la pantalla | Alta | Un solo componente `EstadoAsignacion` alimentado por el diccionario de §6.1 | M | Pendiente |
| VIS-03 | Botones en todo el sistema | `<button>` nativos en 15 archivos de pantalla o funcionalidad (los otros 4 son componentes base o interruptores legítimos): `pages/admin/SeccionesAdmin.tsx:285-299`, `pages/TelegramAlumnoPage.tsx:24,185-221`, `components/estudiante/SeccionEditable.tsx:47`, `pages/InicioEstudiante.tsx:425`, `pages/PerfilAlumno.tsx:147`, `pages/HorarioMisCursos.tsx:108`, `components/estudiante/HorarioDia.tsx:102`, `components/admin/LayoutAdmin.tsx:138`, `components/consulta/FormularioBusqueda.tsx:232`, `components/auth/LoginFormBase.tsx:330` | `Boton` se usa en 14 archivos pero otros reconstruyen la misma pieza con `min-h-11 … rounded-xl` y variaciones (opacidad de deshabilitado 50 vs 60, radio 10 vs 12, sin estado de carga) | Botones primario/secundario con aspecto y comportamiento ligeramente distintos; sin `cargando` ni `motivoDeshabilitado` | Alta | Migrar a `Boton`; añadir `BotonEnlace` (mismo estilo para `<Link>`/`<a>`) y variante de solo-ícono | M | Resuelto |
| VIS-04 | Bloque de error de carga | `components/estudiante/SeccionEditable.tsx:336`, `pages/HorarioMisCursos.tsx:98`, `pages/InicioEstudiante.tsx:419`, `pages/PerfilAlumno.tsx:140`, `pages/TelegramAlumnoPage.tsx:83,103`, `components/admin/LayoutAdmin.tsx:128` (`AvisoError`) | Siete variantes: unas con `border-rose-200 bg-rose-50 text-saie-danger` (paleta ajena), otras con `saie-danger-soft`; el panel admin usa `AvisoError`, el alumno no | Tono de error distinto por área; el texto rojo sobre `rose-50` queda en ≈4.5:1 (justo en el límite) | Alta | Un componente `EstadoError` (ícono + mensaje + «Reintentar» con `Boton`) basado en `Aviso`; `AvisoError` pasa a usarlo | S | Resuelto |
| VIS-05 | Cabeceras de pantalla | `components/admin/LayoutAdmin.tsx`; `components/estudiante/LayoutEstudiante.tsx`; `components/estudiante/CabeceraPantalla.tsx`; `pages/Consulta.tsx:195`; `components/CabeceraPortal.tsx`; `components/auth/LoginLayout.tsx` | Siete cabeceras (se suma `CabeceraPortal.tsx`) con alturas de 85, 72 y 64 px y tamaños de `h1` propios (24/30, 28/34, 28/32) | Cambio de ancho/alto al navegar; sin patrón de «encabezado de página» | Media | Componente `EncabezadoPagina` + `ContenedorPagina` con anchos por token (`estrecho`, `normal`, `ancho`) | M | Pendiente |
| VIS-06 | `LayoutAdmin` — alineación | `components/admin/LayoutAdmin.tsx:69,92,108` | Cabecera y pestañas en `max-w-6xl`; el `<main>` en `max-w-7xl`: el contenido es más ancho que la barra que lo encabeza | Desalineación visible de bordes en escritorio ancho | Baja | Unificar en un único `max-w-*` (token de ancho) | S | Pendiente |
| VIS-07 | Tokens de color / config | `index.css:4-50`; `tailwind.config.js` | Cada color se declara dos veces (`--saie-*` y `--color-saie-*`); `tailwind.config.js` está vacío y es ignorado por Tailwind v4. Faltan tokens `warning` base, `info-strong`, `border-strong`, escala tipográfica, espaciado semántico, `z-index`, movimiento | Dos fuentes de verdad que pueden divergir; los valores sin token acaban escritos a mano | Media | Declarar una vez en `@theme` y derivar las variables CSS con `var(--color-…)`; eliminar `tailwind.config.js`; completar tokens (§5) | S | Resuelto |
| VIS-08 | Sombras, radios y tamaños arbitrarios | Sombras: `shadow-[0_2px_8px_rgba(34,34,34,0.08)]` ×11, `…0.06` ×9, `var(--saie-shadow-1)` ×5, más 4 de color guinda. Radios: `rounded-xl` ×92, `full` ×51, `lg` ×32, `2xl` ×29, `[12px]` ×3, `[10px]` ×3. Tipo: `text-[10px]`, `[11px]`, `[26/28/30/32/34/44px]` | Hay token `--saie-shadow-1` pero se escribe el valor a mano; tres sombras casi idénticas; radios de 10 y 12 px compiten con `xl`/`lg` | Ruido visual casi imperceptible pero imposible de mantener | Media | Mapear a `shadow-card/pop/modal` y `rounded-campo/tarjeta/boton`; prohibir valores arbitrarios (regla ESLint o revisión) | M | Resuelto |
| VIS-09 | Íconos | `utils/admin.ts:91-103`, `components/ui/BadgeEstado.tsx:13-20`, `pages/admin/InicioAdmin.tsx:266,272,544-564`, `components/estudiante/ElementosHorario.tsx:8-14`, `components/estudiante/NavegacionEstudiante.tsx:5-20` | Cada ícono es una cadena `path` copiada por archivo (el mismo triángulo de alerta y el mismo monitor aparecen en ≥4 sitios); el cierre del drawer y de avisos es el carácter `×` | Peso duplicado, tamaños y trazos desiguales, sin una librería | Media | Un módulo `components/ui/Icono.tsx` con un registro de trazos nombrados (`alerta`, `monitor`, `cerrar`…), tamaño y trazo únicos | M | Resuelto |
| VIS-10 | Esqueletos de carga | `components/estudiante/ElementosHorario.tsx:141` (`saie-esqueleto`), `pages/PerfilAlumno.tsx:101` (`animate-pulse`), `components/consulta/TarjetaResultado.tsx:149` (`animate-pulse`, hex) | Tres implementaciones; `EsqueletoCarga` es siempre «3 tarjetas de 96 px» aunque cargue una tabla | Salto de maquetación al llegar los datos; aspecto desigual | Media | `Esqueleto` con variantes (`lista`, `tabla`, `tarjeta`, `texto`) | S | Resuelto |
| VIS-11 | Tablas | `pages/admin/AuditoriaAdmin.tsx:105,206`, `SeccionesAdmin.tsx:375`, `EspaciosAdmin.tsx:168`, `ReporteSalones.tsx:115`, `CargaDatos.tsx:706` | Cinco tablas con el mismo `thead`/`th`/`td` copiado (12 líneas por tabla solo en cabeceras) y relleno distinto (`px-4 py-3` vs `px-3 py-2` vs `px-2 py-2`) | Mantenimiento y consistencia | Media | Componente `Tabla` (columnas declarativas, `scroll` focusable, vacío, orden opcional) | M | Resuelto |
| VIS-12 | Campos de formulario | `components/ui/campos.ts`; patrón `<label className="flex flex-col gap-1"><span className={CLASE_ETIQUETA}>` en ≥20 sitios; `components/admin/FormularioEspacio.tsx` (`ErrorCampo`, `claseCampo` propios); `SeccionesAdmin.tsx:267` (select con `rounded-lg border-saie-divider` distinto al resto) | Sin componente `Campo`: etiqueta, ayuda y error se componen a mano; algunos selects no usan `CLASE_CAMPO` | Estados de error/ayuda con presentación desigual | Media | Componente `Campo` (etiqueta, obligatorio, ayuda, error, `id` enlazado) con `Entrada`/`Seleccion` | M | Resuelto |
| VIS-13 | Breakpoints de navegación | `LayoutAdmin.tsx:56,64` (`md`), `hooks/usePantallaAncha.ts` (1024 px = `lg`), 53 usos de `md:` y 67 de `lg:` | La barra de pestañas cambia a 768 px y las tablas/dashboards a 1024 px; entre 768 y 1023 px conviven navegación de escritorio con listados de móvil | Comportamiento intermedio no diseñado en tabletas | Baja | Fijar dos puntos de corte documentados (móvil <768, escritorio ≥1024) y una zona intermedia explícita | S | Pendiente |
| VIS-14 | Archivos huérfanos de la plantilla Vite | `App.css` (2.9 KB), `assets/react.svg`, `assets/vite.svg`, `assets/hero.png` | Ninguno se importa (búsqueda sin coincidencias) | Ruido en el repo; riesgo de reintroducir estilos globales | Baja | Eliminar tras confirmar con `vite build` | S | Resuelto |
| VIS-15 | Estados de hover/activo | `components/ui/Boton.tsx:68` | Hay `hover` y foco, pero no `active:`; cada variante tiene un hover distinto de opacidad (`/5`) y de color | Falta de respuesta táctil percibida | Baja | Añadir `active:` y unificar la capa de estado | S | Resuelto |
| VIS-16 | Cifras de tableros y métricas | `pages/admin/InicioAdmin.tsx:109`, `pages/InicioEstudiante.tsx:175,398` (`font-serif` en valores numéricos); sin `tabular-nums` en todo el árbol (búsqueda sin resultados) | Las cifras de los tableros usan Playfair Display, cuyas cifras por defecto son de estilo antiguo (alturas desiguales: 3, 4, 5, 7 y 9 descienden). Ninguna columna numérica de las tablas (alumnos, capacidad, PCs) usa cifras tabulares, así que no se alinean. **Verificado en navegador:** en los tableros los números de una cifra se ven como «o», «4», «5» con alturas distintas y el «0» de la tira semanal parece una letra | Los números, lo más escaneado de un tablero, se leen irregulares y las columnas no alinean. **Evidencia:** en una captura del tablero (compilación anterior, bloque «Requieren tu atención») el `0` de «alertas pendientes» se lee como una letra «O» y el `1` queda más bajo que el texto | Media | Se resuelve con la decisión de VIS-18: cifras en Inter con `tabular-nums`, también en las celdas numéricas de las tablas | S | Resuelto |
| VIS-17 | Familias y pesos tipográficos | `index.css:26-27,48-49`; `font-mono` en `components/consulta/TarjetaResultado.tsx`, `pages/admin/CargaDatos.tsx`, `AuditoriaAdmin.tsx`, `InicioAdmin.tsx`, `ReporteSalones.tsx`; `index.html:11-15` | `font-mono` no tiene token: usa la pila por defecto de Tailwind, que cambia según el sistema operativo (Consolas, Menlo, DejaVu). La pila sans (`Inter, Roboto, system-ui…`) mezcla métricas distintas si Inter no carga. Se descarga Inter 800 sin usarse (se emplean 400, 500, 600 y 700) y Playfair solo en 700 | Aspecto distinto por dispositivo y peso de fuentes innecesario | Baja | Token `font-mono` explícito; con una sola familia, cargar únicamente Inter 400-700 con pila de respaldo con ajuste de métricas | S | Resuelto |
| VIS-18 | Mezcla de dos familias tipográficas (Playfair Display + Inter) | `font-serif` en 24 sitios: `components/admin/LayoutAdmin.tsx:114`, `auth/LoginFormBase.tsx:135`, `auth/LoginLayout.tsx:74`, `estudiante/CabeceraPantalla.tsx:72`, `estudiante/ElementosHorario.tsx:134`, `estudiante/HorarioDia.tsx:95`, `estudiante/LayoutEstudiante.tsx:73`, `estudiante/SeccionEditable.tsx:279`, `pages/Home.tsx:137`, `pages/InicioEstudiante.tsx:75,106,175,365,398`, `pages/PerfilAlumno.tsx:170,179`, `pages/TelegramAlumnoPage.tsx:134,263,338`, `pages/admin/InicioAdmin.tsx:109`, `pages/admin/ReporteSalones.tsx:72`; títulos **sin** serif en `pages/admin/CargaDatos.tsx` (9), `EspaciosAdmin.tsx` (5), `Consulta.tsx` (6), `InicioAdmin.tsx` (3), `TarjetaResultado.tsx` (3), `Drawer.tsx`, `TarjetaAlerta.tsx`, `VeredictoVerificacion.tsx`, `AccesoDenegado.tsx:15` | No hay una regla: el `h1` lleva serif en 9 de 10 pantallas, pero los `h2`/`h3` unas veces sí y otras no (según quién los escribió), las cifras de los tableros son serif y el resto de los números son sans. En una misma pantalla conviven ambas: `Consulta` (`h1` serif, `h2`/`h3` sans), `InicioAdmin` (`h1` serif, `h2` sans, cifras serif), `Telegram` (`h2` serif y `h2` sans). `AccesoDenegado` es la única pantalla cuyo `h1` va en sans | Percepción de producto sin pulir: los títulos del mismo nivel cambian de aspecto entre pantallas y dentro de una misma | Alta | **Decisión: una sola familia, Inter, en todo el producto.** Retirar Playfair Display (24 usos de `font-serif`, `--font-serif`, la carga en `index.html`) y expresar la jerarquía con tamaño, peso (700) y espaciado de letras. Clases semánticas `titulo-pagina`, `titulo-seccion`, `cifra` | M | Resuelto |
| VIS-19 | Anchos máximos de contenedor | `components/admin/LayoutAdmin.tsx:69,92,108` (`6xl`/`6xl`/`7xl`); `estudiante/LayoutEstudiante.tsx:45,67` y `NavegacionEstudiante.tsx:50` (`7xl`); `CabeceraPortal.tsx:18` (`6xl`, alto 85 px); `pages/Home.tsx:114,126,181` y `Consulta.tsx:196` (`[1200px]`); `pages/HorarioMisCursos.tsx:170` (`6xl`); `Perfil`/`Telegram`/`Configuración`/`Ayuda` (`4xl`, con `ancho="max-w-4xl"` pasado a mano a `CabeceraPantalla`); `Consulta.tsx:212` (`xl`); `PantallaEnDesarrollo.tsx:122` y `InicioDocentePage.tsx:17` (`3xl`); `Drawer.tsx:79` (`2xl`); `LoginFormBase.tsx:115` (`md md:max-w-lg lg:max-w-md`) | Hay tres anchos «de página ancha» distintos (1152, 1200 y 1280 px) y cinco «de lectura» (576, 672, 768, 896 y 1152). El mismo rol usa valores diferentes: el panel admin tiene cabecera y pestañas en 1152 px y contenido en 1280 px. En el área del alumno el inicio mide 1280 px, Horario 1152 px y Perfil/Telegram/Configuración/Ayuda 896 px: al navegar el contenido y la cabecera saltan de ancho. `CabeceraPantalla.ancho` es una clase Tailwind que cada pantalla debe repetir a mano (su comentario dice «debe coincidir con el de la pantalla»), un acoplamiento frágil | Saltos de maquetación al navegar y bordes desalineados | Media | Tres tokens de ancho (`contenedor-lectura` 56rem, `contenedor-normal` 72rem, `contenedor-ancho` 80rem) en un `ContenedorPagina` que usan cabecera, navegación y `main` a la vez; eliminar `[1200px]` y la prop `ancho` | S | Resuelto |
| VIS-20 | `Drawer`: forma de aparecer | `components/ui/Drawer.tsx:66-79`; `index.css:262-275` (`saie-fundido`) | El panel «lateral» no entra desde el lado: aparece con un fundido y un desplazamiento vertical de 6 px (0,32 s) y el fondo se oscurece al 40 % sin más. Parece una ventana flotante que se superpone, no un panel anclado a la derecha | Se pierde la metáfora de «detalle que sale de la lista» y no se entiende de dónde viene | Media | Entrada deslizante desde la derecha (≈200 ms, `translateX`), salida simétrica y sin movimiento con `prefers-reduced-motion` | S | Resuelto |
| VIS-21 | `Drawer`: un solo tamaño para todo | `components/ui/Drawer.tsx:79` (`max-w-2xl`); usos en `SeccionesAdmin.tsx:476`, `EspaciosAdmin.tsx:602`, `InicioAdmin.tsx:590`, `CargaDatos.tsx:517,868` | El mismo ancho de 672 px sirve para un detalle corto (Sección, Espacio), un formulario de 900 líneas (`FormularioEspacio`), un veredicto con siete reglas y una guía larga con tablas de 4 columnas. La tabla de columnas de la guía decide «tabla o lista» según el ancho de la **ventana** (`usePantallaAncha(640)`, `CargaDatos.tsx:688`) y no según el del drawer | Detalles cortos con mucho vacío; formularios y tablas estrechos | Media | Prop `tamano`: `sm` 28 rem (detalle), `md` 36 rem (formulario), `lg` 48 rem (guía); el cambio tabla/lista se hace con *container queries* | S | Resuelto |
| VIS-22 | Color por curso inestable entre pantallas | `pages/InicioEstudiante.tsx:194-197`; `pages/HorarioMisCursos.tsx:78-85`; `utils/horario.ts:168-185` | La paleta de 8 colores se asigna por orden alfabético sobre el conjunto de cursos de **cada pantalla**: el inicio usa solo los cursos con sesiones y Horario suma también los matriculados sin clases. Un curso puede cambiar de color entre ambas pantallas; con más de 8 cursos los colores se repiten | El color deja de ser un identificador fiable del curso | Baja | Asignar el color por una función estable del código del curso (hash) o calcularlo una vez en un contexto | S | Pendiente |

### 3.2 DEN — Densidad de información

| ID | Pantalla/Componente | Archivo(s) | Problema | Impacto | Prioridad | Solución propuesta | Esfuerzo | Estado |
|----|---------------------|------------|----------|---------|-----------|--------------------|----------|--------|
| DEN-01 | Secciones, Auditoría e Historial | `pages/admin/SeccionesAdmin.tsx:323,468`; `pages/admin/AuditoriaAdmin.tsx:56,168`; `types/admin.ts:270-272,308-310` | Se pide `limite: 200` y se ignoran `pagina` y el `total` que ya devuelve la API (`ListadoSeccionesDTO.total`). **Verificado:** con 250 secciones el contador dice «200 secciones» y la página mide 14 070 px con 200 filas. El contador muestra `secciones.length` | El usuario cree ver todas las secciones; las 201+ quedan ocultas sin aviso | Alta | Paginador con `total`, tamaño de página recordado, texto «Mostrando 1–50 de 312» | M | Pendiente |
| DEN-02 | Tablero de Coordinación | `pages/admin/InicioAdmin.tsx:353-371,387-392` | «Con aula nueva» usa `resumenCorrida?.asignadas ?? escaladas.datos?.total`: sin corrida muestra el número de escaladas como si fueran asignadas; «Esperan revisión» usa la misma cifra; la tarjeta guinda repite lo mismo en texto | Métrica engañosa en el primer vistazo (verificado: sin corrida muestran «4 Con aula nueva» y «4 Esperan revisión» a la vez) | Alta | Mostrar «—» si no hay corrida; nunca reutilizar el total de escaladas; quitar la duplicación de cifras | S | Resuelto |
| DEN-03 | Tablas sin control de columnas | `EspaciosAdmin.tsx:168-218` (7 col.), `ReporteSalones.tsx:115-172` (8 col.), `AuditoriaAdmin.tsx` | Todas las columnas siempre visibles; sin ordenar, sin mostrar/ocultar, sin menú «⋯» para acciones; la acción es un botón «Ver» por fila | Densidad alta en escritorio y desbordamiento horizontal en pantallas medias | Media | `Tabla` con orden por columna, columnas opcionales recordadas, truncado con *tooltip* y acciones secundarias en menú | L | Pendiente |
| DEN-04 | Filtros sin chips ni «Limpiar» | `SeccionesAdmin.tsx:433-471`, `AuditoriaAdmin.tsx:66-90,178-191`, `ReporteSalones.tsx:49-58` (solo `EspaciosAdmin.tsx:358-363,570` lo tiene) | No se ve qué filtros están activos ni hay forma de limpiarlos de una vez en 3 de 4 listados | Filtros «olvidados» que explican resultados vacíos | Media | Componente `FiltrosActivos` (chips + «Limpiar filtros») | S | Pendiente |
| DEN-05 | Filtro de periodo por texto libre | `SeccionesAdmin.tsx:457-466`, `AuditoriaAdmin.tsx:67-76`, `ReporteSalones.tsx:49-58` | El periodo se teclea (`placeholder="Ej. 2026-2"`); un error de tipeo devuelve una lista vacía | Errores evitables en el dato más usado del panel | Media | `<select>` con los periodos existentes (el periodo vigente por defecto) | M | Pendiente |
| DEN-06 | Detalle de sección en el drawer | `SeccionesAdmin.tsx:524-529` | Los horarios se concatenan en una sola cadena `LUNES 08:00-10:00 · MIÉRCOLES …` | Difícil de leer con 3+ bloques | Media | Lista estructurada «Lunes · 08:00–10:00» (depende de MAP-01) | S | Pendiente |
| DEN-07 | Tarjeta móvil de sección | `SeccionesAdmin.tsx:94-131` | La tarjeta omite Docente y Tipo que sí tiene la tabla | Se pierde información al pasar a móvil | Media | Incluir los campos clave o abrir el drawer con un toque en la tarjeta | S | Pendiente |
| DEN-08 | Rol repetido en cabecera | `components/admin/LayoutAdmin.tsx:72-82` | El rol aparece **tres** veces (píldora, «Sesión activa / rol» y, en el inicio, el subtítulo de la pantalla; verificado en navegador) | Ruido y doble lectura con lector de pantalla | Baja | Conservar una sola | S | Pendiente |
| DEN-09 | Conteos duplicados | `EspaciosAdmin.tsx:555-559` y `579-596` | «X de Y coinciden» y las píldoras de «N espacios / N aulas / N laboratorios» dicen casi lo mismo | Ruido sobre la lista | Baja | Mantener un resumen y mostrar los totales por tipo solo en el filtro | S | Pendiente |
| DEN-10 | Preferencias de vista no recordadas | `AuditoriaAdmin.tsx:255` (pestaña), filtros de todos los listados | Pestaña activa, filtros y tamaño de página se pierden al cambiar de ruta | Repetir filtros cada visita | Baja | Guardar en la URL (`?periodo=&tipo=`) y/o `localStorage` con `try/catch` | M | Pendiente |
| DEN-11 | Tablero de Coordinación (presentación) | `pages/admin/InicioAdmin.tsx:103-112,351-372,382-444,486-525` | Las cuatro métricas tienen el mismo peso visual y ningún contexto (ni comparación con la corrida anterior ni meta); el color del número es el único énfasis («Esperan revisión» en ámbar, «Alertas» en rojo). Mientras carga muestra `…` como valor (se anuncia como «puntos suspensivos»). `Metrica` es un `div`/`p` sin vínculo semántico entre cifra y etiqueta y no es accionable, aunque más abajo hay un enlace aparte a alertas. La cifra de revisiones aparece tres veces (métrica, texto de la tarjeta guinda, encabezado de la lista) | Los números no cuentan una historia ni dicen qué hacer; con lector de pantalla se leen desligados | Media | `Metrica` como `dl` con tono + ícono, delta opcional y enlace a la lista; esqueleto en lugar de `…`; priorizar «Esperan revisión» como indicador principal y quitar las repeticiones | M | Pendiente |
| DEN-12 | Inicio del alumno (presentación) | `pages/InicioEstudiante.tsx:55,375-381,435-452,204-232,393-401` | La próxima clase se muestra dos veces: en la tarjeta guinda y de nuevo como primera tarjeta de «Tu día de hoy». Las clases van en una fila horizontal de tarjetas de 224 px (`overflow-x-auto`) donde las siguientes quedan fuera de vista y sin región de desplazamiento enfocable. Las cuatro cifras 2×2 («clases por semana», «minutos de clase») tienen poco valor accionable y la tira semanal muestra «0» con el mismo peso que un día con clases | Información redundante y parte de la agenda oculta | Media | Excluir la clase destacada de la lista (o resumirla), lista vertical o con indicador de «hay más», reducir las cifras a las que mueven una decisión | M | Pendiente |
| DEN-17 | Resultado de importación | `pages/admin/CargaDatos.tsx:222-309,316-356,286-300` | El resumen del resultado se escribe dos veces (en la tarjeta y de nuevo en el drawer, con el mismo texto y el mismo distintivo). La lista de filas con problemas se muestra completa y abierta por defecto (`abiertoInicial`), sin límite, agrupación ni paginación, aunque el archivo puede tener hasta 20 000 filas. Los mensajes son los textos del backend tal cual («Fila N: …») | Un archivo con muchos errores genera una lista interminable e inmanejable | Media | Agrupar por tipo de error con conteo, mostrar los primeros 20 y «Descargar todos (CSV)» (ya existe), y no repetir el resumen en el drawer | M | Pendiente |
| DEN-18 | Horario semanal: información truncada | `components/estudiante/GridHorarioSemanal.tsx:101-128` | Cada bloque muestra código, aula y hora en 12 px con `truncate`, y `title` solo con el nombre del curso (no accesible por teclado). Las clases cortas pierden líneas por `overflow-hidden`; el docente no aparece. La grilla mide 14 filas fijas de 08:00 a 22:00 con desplazamiento horizontal sin región enfocable | Datos recortados sin forma de leerlos con teclado o táctil | Media | Mostrar el detalle al seleccionar un bloque (mismo patrón de drawer o *popover*), alturas mínimas y rango horario según las clases existentes | M | Pendiente |
| DEN-19 | Sin acciones masivas ni atajos; muchas acciones primarias | `pages/admin/AlertasAdmin.tsx` y `components/admin/TarjetaAlerta.tsx:139-180` (una confirmación por alerta); `pages/admin/InicioAdmin.tsx:141-203` (un «Reintentar» por sección escalada); `pages/admin/CargaDatos.tsx` (4 botones «Importar» primarios) | Resolver, reintentar o editar es siempre de una en una. No hay selección múltiple, «Reintentar todas», «Resolver todas las de este tipo» ni atajos de teclado, y en una misma pantalla compiten varios botones primarios iguales | Trabajo repetitivo para quien gestiona decenas de alertas o secciones | Media | Selección múltiple con barra de acciones («Marcar N como resueltas»), «Reintentar las N secciones» y atajos básicos (`/` buscar, `g` + letra ir a) | L | Pendiente |
| DEN-14 | `Drawer`: encabezado pobre | `components/ui/Drawer.tsx:81-94`; `EspaciosAdmin.tsx:105-108,602-606`; `SeccionesAdmin.tsx:482-485` | El encabezado solo admite una cadena de texto. El título es el mismo en vista y en edición (el cuerpo cambia a formulario pero el título sigue siendo «AULA-101»); no muestra el estado (Habilitado, Con aula), ni el tipo/ubicación, ni el modo («Editando») | Poco contexto: el usuario no sabe si está leyendo o editando ni qué estado tiene el registro | Media | `titulo` + `subtitulo` + `acciones`/insignia en el encabezado (p. ej. «AULA-101 · Aula teórica · Pabellón A, piso 2 · Habilitado») y título «Editar AULA-101» en modo edición | S | Resuelto |
| DEN-15 | `Drawer`: títulos repetidos | `pages/admin/InicioAdmin.tsx:590-596` + `components/admin/VeredictoVerificacion.tsx:86-88`; `components/admin/FormularioEspacio.tsx:811-814`; `CargaDatos.tsx:520` | El drawer del verificador se titula «Veredicto del verificador» y el componente que contiene repite un `h2` idéntico (mismo nivel de encabezado). En el alta de espacio, el `fieldset` tiene `legend` y `label` con el mismo texto «Tipo de espacio». El título del resultado de carga encadena nombre de tarjeta con número («Resultado de la carga · 1. Cursos y secciones») | Texto duplicado y lectura doble con lector de pantalla | Baja | Que el contenido del drawer no repita su título (prop `ocultarTitulo`) y quitar el `legend` redundante | S | Resuelto |
| DEN-16 | `Drawer`: sin estado en la URL | `SeccionesAdmin.tsx:315,478`, `EspaciosAdmin.tsx:336,603` (estado local) | Abrir un drawer no cambia la URL: el botón «Atrás» del navegador (o el gesto atrás del móvil) abandona la pantalla en lugar de cerrar el panel, y no se puede compartir ni recargar un enlace a «Sección X» o «Espacio Y» | Navegación impredecible, sobre todo en móvil | Media | Parámetro de consulta (`?espacio=AULA-101`) sincronizado con el drawer | M | Pendiente |
| DEN-13 | Funciones anunciadas sin construir | 14 de 30 rutas son pantallas de «En desarrollo»: alumno `MapaOcupacionPage`, `RutaAlumnoPage`; docente `InicioDocentePage`, `HorarioDocentePage`, `EspaciosDocentePage`, `IncidenciasDocentePage`; admin `AltaAlumno`, `AltaDocente`, `Claves`, `Incidencias`, `Laboratorios`, `MapaAdmin`, `Software`, `Solicitudes` (+ `ProximamenteAdminPage`); `components/estudiante/NavegacionEstudiante.tsx:27-28` | La navegación del alumno incluye «Mapa» y «Ruta» (en desarrollo) con el mismo peso que «Horario» y «Perfil»; el portal del docente completo es un anuncio | El usuario descubre al pulsar que no hay nada | Media | Descartado por decisión del equipo: mostrar las pantallas en desarrollo en la navegación es intencional | S | Descartado |
| DEN-20 | Pantallas del alumno sin ruta | `pages/AyudaAlumno.tsx`, `pages/ConfiguracionAlumno.tsx` (con pruebas) frente a `AppRoutes.tsx` y `config/rutas.ts`; `pages/AyudaAlumno.tsx:86` (`<Link to="/estudiante/configuracion">`); `config/portales.ts:30` («Perfil y ayuda») | **Ayuda y Configuración existen pero no están registradas** en `AppRoutes` ni en `RUTAS`, y ningún enlace llega a ellas. El enlace de Ayuda hacia Configuración cae en la ruta comodín y muestra la portada. La tarjeta del portal del estudiante en la portada promete «Perfil y ayuda». El comentario de Ayuda dice «alcanzable desde el inicio» y el de Configuración «la ayuda, en su icono»: esos íconos ya no existen | Funciones prometidas (ayuda y ajustes de accesibilidad) a las que el alumno no puede llegar | Alta | Registrar las rutas y añadirlas a la navegación o a la cabecera, o retirar las pantallas y la promesa de la portada | S | En progreso |
| DEN-21 | «Periodo» vacío significa cosas distintas según la pantalla | `pages/admin/SeccionesAdmin.tsx:457-466`, `AuditoriaAdmin.tsx:67-76`, `ReporteSalones.tsx:49-58`; `backend/src/services/seccionAdmin.service.ts:181`, `auditoria.service.ts:96,144`; `backend/src/services/periodo.service.ts` | Con el campo vacío, **Secciones** e **Informe** muestran el periodo vigente (el backend lo calcula), el **Historial** muestra todos los periodos y la vista **Auditoría** no tiene filtro de periodo. Solo el Informe lo explica («vacío = vigente»). Un periodo con formato inválido responde 400 y un periodo bien escrito pero inexistente devuelve una lista vacía sin explicación. El backend **no tiene un endpoint que liste los periodos** (solo `obtenerPeriodoVigente`) | Resultados distintos sin saberlo y errores evitables | Media | Selector de periodo con el vigente preseleccionado y la misma regla en todas las pantallas; requiere un endpoint nuevo `GET /api/v1/admin/periodos` → `{ vigente, periodos[] }` (ver §8, pregunta 7) | M | Pendiente |
| DEN-22 | Auditoría e historial: no responde la pregunta para la que existe | `pages/admin/AuditoriaAdmin.tsx:47-246`; `backend/src/services/auditoria.service.ts:16-23,31-46,90-98` | El backend documenta el propósito («¿qué pasó con esta sección?») y admite filtrar por `seccionId` (historial) y por `desde`/`hasta` (auditoría), pero la pantalla solo ofrece **periodo** y **estado** en el historial y **tipo de evento** en la auditoría. No hay búsqueda por curso o sección, ni rango de fechas, y las filas no son clicables: para ver todo lo que pasó con una sección hay que recorrer a mano hasta 200 filas | La pantalla existe para investigar una sección y no permite hacerlo | Alta | Buscador de sección/curso (usa `obtenerSecciones?q=` para elegir una y filtra por `seccionId`), rango de fechas, y al pulsar una fila un drawer con la **línea de tiempo de esa sección** (asignada a X → pasó a revisión → reasignada a Y) | M | Pendiente |
| DEN-23 | Historial: columnas que no aportan y datos que faltan | `AuditoriaAdmin.tsx:105-153`; `backend/src/types/auditoria.ts` (el DTO trae `motivoEscalamiento` y pabellón/piso) | Se muestran el UUID de la corrida (10 px) y las cinco columnas con el mismo peso; **no** se muestra el motivo de una escalada ni la ubicación del aula (pabellón y piso) aunque el backend los envía. Tampoco se agrupa por corrida: 40 filas de la misma corrida repiten el mismo UUID | Ruido donde debería haber contexto y contexto donde falta | Media | Quitar la columna de corrida y agrupar por corrida con una cabecera («Corrida del 12 oct, 10:32 · 230 asignadas · 17 en revisión»); mostrar el motivo traducido (`describirMotivoEscalamiento` ya existe) y «Pabellón C · piso 3» | M | Pendiente |

### 3.3 MAP — Mapeo de datos del backend

| ID | Pantalla/Componente | Archivo(s) | Problema | Impacto | Prioridad | Solución propuesta | Esfuerzo | Estado |
|----|---------------------|------------|----------|---------|-----------|--------------------|----------|--------|
| MAP-01 | Día de la semana crudo | `components/consulta/TarjetaResultado.tsx:437` (`{h.diaSemana}`); `pages/admin/SeccionesAdmin.tsx:527`; `types/admin.ts:257` (`diaSemana: string`) | Se imprime `LUNES`, `MIERCOLES` (mayúsculas, sin tilde). El diccionario `ETIQUETA_DIA` ya existe en `utils/horario.ts:19` y lo usa el área del alumno | Aparece en la pantalla pública y en el panel | Alta | Usar `ETIQUETA_DIA`; tipar `diaSemana` como `DiaSemana` en `types/admin.ts` | S | Resuelto |
| MAP-02 | Rol de sesión crudo | `pages/InicioEstudiante.tsx:371`; `components/estudiante/LayoutEstudiante.tsx:57`; `components/CabeceraPortal.tsx:30` | Se muestra `{sesion.rol}` → «ALUMNO»/«DOCENTE». `etiquetaRol()` existe solo para roles de admin (`utils/admin.ts:151`) | Código técnico en una cabecera visible siempre | Alta | Mover `etiquetaRol` a un diccionario global con los 4 roles | S | Resuelto |
| MAP-03 | Estado de asignación contradictorio | `components/consulta/TarjetaResultado.tsx:277-279,283-313,316-344` | Si `VIGENTE` llega sin espacios: insignia «Espacio confirmado» + aviso «Aún no hay aula asignada». Si `ESCALADA` sin espacios: «En revisión» + el mismo aviso rojo. `estadoAMostrar()` (`utils/horario.ts`) ya resuelve este caso en el área del alumno y aquí no se usa | Mensaje contradictorio sobre la propia clase | Alta | Derivar un único estado visible con `estadoAMostrar(estado, espacios.length)` y un solo aviso | S | Resuelto |
| MAP-04 | Datos técnicos en Auditoría y alertas | `pages/admin/AuditoriaAdmin.tsx:147-149` (UUID `corridaId` en 10 px) y `234` (`r.detalle` crudo); `components/admin/VeredictoVerificacion.tsx:146` (`violacion.detalle`); `components/admin/TarjetaAlerta.tsx:101` (`alerta.motivo`) | Se muestran identificadores internos y texto libre del motor tal cual lo emite el backend. **Formatos reales** (`backend/src/services/motor.service.ts`, `alerta.service.ts`, `verificador.service.ts`): «[Origen: PERIODO] Corrida Batch [<uuid>] - Asignada a: [<uuid>, <uuid>]» (los espacios van como UUID), «Asignación automática exitosa a espacios: [<uuid>] (Puntaje cercanía: 0.8)», «Sección escalada a revisión manual: [SOFTWARE_FALTANTE] …», «Alerta SOFTWARE resuelta por la cuenta <uuid>» y «Verificación con 3 violación(es): CAPACIDAD_SUFICIENTE (3).». **Verificado en navegador** con esos textos: la columna «Detalle» es ilegible | Ruido técnico e incomprensible para Coordinación | Alta | Ocultar la corrida tras un detalle («Corrida del 12 oct, 10:32»); traducir tipos de `detalle`; mostrar el crudo solo bajo «Detalle técnico» | M | Pendiente |
| MAP-05 | Seis redacciones del estado «sin aula» | «Sin asignar» (`SeccionesAdmin.tsx:43`, `TarjetaResultado.tsx:134`); «Sin aula · revisión» (`SeccionesAdmin.tsx:46`); «Sin aula» (`ReporteSalones.tsx:162`); «Sin aula asignada» (`ElementosHorario.tsx:52`); «En revisión» / «Clase en revisión» / «Esperan revisión» / «Escalada» (`AuditoriaAdmin.tsx:36`) | Los mismos estados del backend (`PENDIENTE`, `ESCALADA`) llegan al usuario con palabras distintas; «Escalada/Escalamiento» es jerga interna | Confusión; no se puede buscar ni citar un estado | Alta | Diccionario único (§6.1) con textos por audiencia (alumno / coordinación) | M | Resuelto |
| MAP-06 | Errores HTTP: mapeo incompleto | `services/estudiante.ts:59-78`; `components/auth/LoginFormBase.tsx:79-105`; `components/consulta/FormularioBusqueda.tsx:110-136`; `components/estudiante/SeccionEditable.tsx:131-134` | Solo se mapean 401, 403 y ≥500. **Verificado en navegador (con una respuesta 500 simulada) y contra el backend:** la interfaz muestra cualquier `message` sin filtrarlo. El backend devuelve «Error interno del servidor» en producción, pero el manejador global de `backend/src/app.ts` devuelve `err.message` técnico fuera de producción y con otra forma (`{ error, message }`, sin `success`), que la UI muestra tal cual (por ejemplo «connection to pooler terminated»). Un *timeout* (`ECONNABORTED`, 30 s en `api.ts:9`) cae en «Revisa tu conexión»; 400/404/409/413/422/429 pasan el `message` del backend sin revisar. Dos pantallas duplican su propio parseo y `SeccionEditable` descarta el error (`catch {}`) y responde siempre «Revisa tu conexión», también ante un 400 de validación del servidor | Mensajes erróneos (timeout ≠ sin conexión) o ininteligibles | Alta | `errores/mensajesHttp.ts` con tabla completa y regla: nunca mostrar `message` crudo salvo lista blanca (§6.6) | M | Resuelto |
| MAP-07 | Mapas sin valor por defecto | `AuditoriaAdmin.tsx:20-44` (`ETIQUETAS_EVENTO`, `TONO_EVENTO`, `ETIQUETA_ESTADO`, `TONO_ESTADO`); `SeccionesAdmin.tsx:29`; `EspaciosAdmin.tsx:21`; `VeredictoVerificacion.tsx:5`; `TarjetaAlerta.tsx:16` | Se indexa `Record<Enum, …>[valor]` directo. Si el backend añade un valor, el resultado es `undefined`: `BadgeEstado` recibe `tono` inválido y no pinta estilos ni ícono, sin registro en consola | Rotura silenciosa ante cualquier enum nuevo | Media | Función `etiquetaDe(mapa, codigo)` con fallback «Estado no disponible» y `console.warn` | S | Resuelto |
| MAP-08 | Fechas y zona horaria | `utils/admin.ts:4-26`; `pages/TelegramAlumnoPage.tsx:19-21`; `utils/perfil.ts`; `utils/horario.ts:221`; `ReporteSalones.tsx:177-178` | Cuatro formateadores de fecha distintos; ninguno fija zona horaria (usa la del navegador) mientras el informe afirma «horarios en hora de Lima»; no hay formato relativo («hace 2 h») | Horas distintas según dónde se abra; textos inconsistentes | Media | `formatear/fechas.ts` único con `timeZone: 'America/Lima'` y relativo para < 24 h | S | En progreso |
| MAP-09 | Tipo de espacio en tres versiones | `SeccionesAdmin.tsx:29`, `EspaciosAdmin.tsx:21`, `utils/horario.ts:133`, `TarjetaResultado.tsx:43,65` («Aula Teórica») | Mismo mapa copiado; el portal público escribe «Aula Teórica» con T mayúscula, el resto «Aula teórica», y las grillas usan «Lab.» / «Teoría» (`utils/horario.ts:137-139`) | Inconsistencia visible | Baja | Diccionario único | S | Resuelto |
| MAP-10 | Clave de campo cruda como fallback | `EspaciosAdmin.tsx:296` | `ETIQUETA_CAMPO[campo] ?? campo` imprime la clave técnica (`softwareIds`, …) si falta la etiqueta | Texto técnico ante un campo nuevo | Baja | Fallback genérico («otros datos») + `console.warn` | S | Resuelto |
| MAP-11 | Texto de relleno como dato | `TarjetaResultado.tsx:263-265` | Si falta `codigoCurso` se muestra el literal «CURSO» dentro de la etiqueta de código | Parece un código real | Baja | Ocultar la etiqueta cuando no hay código | S | Resuelto |
| MAP-12 | «Última carga» en Carga de datos | `pages/admin/CargaDatos.tsx:84,805-813`; `utils/admin.ts:17` | La fecha de «Última carga: 12 oct, 10:32» sale de `localStorage` del navegador, no del servidor. En otro equipo, en modo privado o tras limpiar datos aparece vacía; otra persona de Coordinación nunca ve la carga ajena | Dato que parece oficial pero es local y puede faltar o estar desfasado | Media | Mostrar la fecha desde el servidor (historial de importaciones) o rotularla «en este navegador» | M | Pendiente |
| MAP-13 | Estado de carga contradictorio en Carga de datos | `pages/admin/CargaDatos.tsx:116-121,464-473,798-803` | El estado («Sin cargar», «Cargado», «Con errores») vive en memoria de React y empieza siempre en «Sin cargar», mientras la fecha «Última carga» se lee de `localStorage`. Al volver a la pantalla puede mostrarse «Sin cargar» junto a «Última carga: 12 oct» | Dos mensajes opuestos en la misma tarjeta | Media | Derivar el estado del servidor (última importación y su resultado) o, si no existe el endpoint, no mostrar «Sin cargar» cuando hay fecha | M | Pendiente |
| MAP-14 | Mensajes del backend con identificadores y claves técnicas | `backend/src/services/*` (más de 20 mensajes 404 como «El espacio con ID '<uuid>' no existe», «La sección con ID …», «La alerta con ID …»); `backend/src/services/espacioAdmin.service.ts` («Tu rol no puede editar: identificador, pabellon» y `errors: ['Campo no editable: aforoNominal']`); `services/estudiante.ts:75-77` | La UI muestra el `message` del backend para cualquier 4xx salvo 401/403, así que el usuario puede ver UUID de la base de datos y nombres internos de campo. Solo los 4xx de reglas de negocio (409, 422, 413, 403) están redactados para personas | Identificadores internos y claves técnicas en mensajes de error | Media | Política en `errores/mensajesHttp.ts`: mostrar `message` solo en 400/403/409/413/422 con `success: false`; en 404 un texto genérico por recurso; traducir las claves de campo con el diccionario (§6.6) y quitar con expresión regular los fragmentos «ID '…'» | S | Resuelto |
| MAP-15 | El detalle de los errores 400 se descarta | `backend/src/lib/http.ts:25-37`; `services/estudiante.ts:59-78`; `pages/admin/*` | El backend responde `{ success: false, message: 'Parámetros inválidos', errors: ['El periodo debe tener formato AAAA-N (ej. 2026-1)'] }`, pero la UI solo lee `message`. El usuario ve «Parámetros inválidos» sin saber qué corregir (por ejemplo, un periodo mal escrito en Secciones o Informe) | Error genérico donde el backend ya explica la causa en español | Media | `mensajeDeError` devuelve también `detalles: string[]` y los componentes los muestran como lista bajo el campo o en el aviso | S | Resuelto |

### 3.4 FDB — Feedback al usuario

| ID | Pantalla/Componente | Archivo(s) | Problema | Impacto | Prioridad | Solución propuesta | Esfuerzo | Estado |
|----|---------------------|------------|----------|---------|-----------|--------------------|----------|--------|
| FDB-01 | Cambios sin guardar | `components/ui/Drawer.tsx:35-39,67`; `components/admin/FormularioEspacio.tsx:889` (`hayCambios`); `SeccionesAdmin.tsx:134-303`; `CambioLaboratorio.tsx:67-71,256-265` (al elegir otro laboratorio se descarta la selección sin avisar) | Escape, clic en el fondo, «×» y la navegación descartan sin preguntar. No hay `beforeunload`, `useBlocker` ni comprobación (búsqueda sin resultados). `CambioLaboratorio` muestra «Cambios sin guardar» pero no protege la salida | Pérdida silenciosa de trabajo | Alta | Hook `useGuardaCambios(hayCambios)` + `DialogoConfirmacion`; el `Drawer` acepta `confirmarCierre` | M | Resuelto |
| FDB-02 | Sin manejo global de errores | `services/api.ts:71-99` (solo registra y gestiona 401); 13 `catch` en `pages/*`, `components/*` | El interceptor no traduce ni notifica: cada pantalla captura y compone su propio bloque (ver VIS-04) | Retroalimentación desigual; riesgo de olvidar un `catch` y no avisar nada | Alta | Interceptor que adjunta `error.mensajeUsuario` (vía `mensajesHttp`) y un `useAccion()` que ejecuta, muestra toast/inline y gestiona `cargando` | L | En progreso |
| FDB-03 | «Actualizar» recarga la página | `AuditoriaAdmin.tsx:262` | `window.location.reload()` borra pestaña, filtros y scroll; en el resto de pantallas «Actualizar» solo recarga los datos | Parpadeo y pérdida de contexto | Media | Exponer `recargar` desde la vista activa (o elevar `useCarga`) | S | Resuelto |
| FDB-04 | Recarga con filtros sin indicador | `SeccionesAdmin.tsx:474`, `AuditoriaAdmin.tsx:93,194`, `ReporteSalones.tsx:66` (`cargando && !datos`) | Al cambiar un filtro se conservan los datos viejos y no hay *spinner* ni `aria-busy`; la lista parece definitiva hasta que cambia | El usuario lee resultados del filtro anterior | Media | Indicador de actualización sobre la tabla (`aria-busy`, opacidad y texto «Actualizando…») | S | Pendiente |
| FDB-05 | Confirmaciones sin patrón común | `InicioAdmin.tsx:416-442` (bloque dentro de la tarjeta), `TarjetaAlerta.tsx:141-167` (`fieldset`), `TelegramAlumnoPage.tsx:173-203` (`role=group`) | Tres presentaciones distintas. «Marcar como resuelta» es irreversible desde la UI y no ofrece «Deshacer» | Patrón impredecible; sin vía de corrección | Media | `DialogoConfirmacion` único para destructivas; toast con «Deshacer» para acciones reversibles | M | Resuelto |
| FDB-06 | Toasts: alcance y comportamiento | `components/ui/Avisos.tsx:45-67`; uso solo en `AlertasAdmin`, `EspaciosAdmin`, `SeccionesAdmin` | Solo 3 pantallas los usan; el resto confirma con mensajes inline propios (`CambioLaboratorio`, `Telegram`, `Perfil`, `CargaDatos`). La región usa `aria-live="polite"` también para errores; el temporizador (5/8 s) no se pausa con el foco o el cursor (WCAG 2.2.1) | Feedback de éxito inconsistente; mensajes que desaparecen antes de leerse | Media | Región `status` para éxito y `alert` para error; pausar al enfocar; adoptar en todas las acciones | M | Resuelto |
| FDB-07 | Validación en formularios | `SeccionesAdmin.tsx:189` (`noValidate` sin reglas), `components/estudiante/SeccionEditable.tsx:117` (solo al enviar), `components/auth/LoginFormBase.tsx` (solo mensaje del servidor) | Coexisten validación por campo y en tiempo real (`FormularioEspacio`, `FormularioBusqueda`) con validación solo al enviar o ninguna | Errores descubiertos tarde; criterio distinto por formulario | Media | `Campo` con validación al salir del campo y resumen de errores; reglas compartidas | M | Pendiente |
| FDB-08 | Estados vacíos | `components/estudiante/ElementosHorario.tsx:123-138`; `InicioAdmin.tsx:214-219`; `InicioEstudiante.tsx:403,455` | `EstadoVacio` siempre dibuja el mismo ícono de calendario que además flota sin fin (`saie-flota`); los vacíos principales («Sin secciones», «Sin asientos de auditoría», «Sin espacios») no ofrecen CTA; tres pantallas usan `<p>` punteado ad hoc | Vacío poco accionable y movimiento perpetuo innecesario | Media | `EstadoVacio` con `icono` configurable y CTA obligatorio donde exista salida (p. ej. «Ir a Carga de datos») | S | En progreso |
| FDB-09 | Ruta inexistente | `AppRoutes.tsx:299` | `path="*"` renderiza `Home` sin avisar: la URL sigue siendo la errónea y nadie sabe por qué | Confusión ante enlaces rotos | Media | Página «No encontramos esta página» con enlace al inicio de su rol | S | Resuelto |
| FDB-10 | Procesos largos | `InicioAdmin.tsx:304-322` (`ejecutarCorrida`), `CargaDatos.tsx:424-439` (`importarCsv`) | Solo texto «Asignando…/Importando…» y botón en carga; sin indicación de duración esperada. Si pasa el *timeout* se reporta un error aunque el servidor haya terminado | Incertidumbre sobre si se completó | Media | Mensaje de espera («puede tardar hasta 1 min»), `aria-busy`, y tras *timeout* «puede que haya terminado: actualiza para comprobar» | S | Pendiente |
| FDB-11 | Reintentar sin estado de carga | `InicioEstudiante.tsx:425`, `PerfilAlumno.tsx:147`, `HorarioMisCursos.tsx:108`, `TelegramAlumnoPage.tsx:89,109` | Los «Reintentar» son `<button>` nativos: no deshabilitan ni muestran progreso, permitiendo clics repetidos | Peticiones duplicadas | Baja | Resolver con VIS-03 (`Boton cargando`) | S | Pendiente |
| FDB-12 | Informe de salones sin estado vacío | `pages/admin/ReporteSalones.tsx:144-170` | Si el periodo no tiene secciones se dibuja la tabla solo con cabecera y los totales en cero, sin mensaje ni acción | Pantalla que parece rota | Baja | `EstadoVacio` («No hay secciones en este periodo» + enlace a Carga de datos) | S | Pendiente |
| FDB-13 | `Drawer`: acciones al final del scroll | `components/admin/FormularioEspacio.tsx:867-897` (pie dentro del formulario); `SeccionesAdmin.tsx:284-300`; `components/ui/Drawer.tsx:95` | Guardar y Cancelar, la insignia «Cambios sin guardar» y el error del servidor viven al final del cuerpo que desplaza. En un formulario largo (software, contiguos, PCs) hay que bajar hasta el final para guardar y el aviso de error puede quedar fuera de vista | El usuario no ve el estado ni la acción principal mientras edita | Media | Slot `pie` fijo del `Drawer` (con sombra superior) que contenga la insignia de estado y las acciones | S | Resuelto |
| FDB-14 | Sin red de seguridad ante errores de render | `main.tsx`, `App.tsx`, `AppRoutes.tsx` (no hay `ErrorBoundary`; solo `Mapa3D` tiene uno) | Una excepción al dibujar cualquier pantalla (un dato inesperado del backend, por ejemplo) deja la página en blanco, sin mensaje ni forma de volver | Pantalla en blanco sin recuperación | Alta | `ErrorBoundary` global (y uno por área) con mensaje, botón «Reintentar» y enlace al inicio; registrar el error | S | Resuelto |

### 3.5 ACC — Accesibilidad (WCAG 2.2 AA)

| ID | Pantalla/Componente | Archivo(s) | Problema | Impacto | Prioridad | Solución propuesta | Esfuerzo | Estado |
|----|---------------------|------------|----------|---------|-----------|--------------------|----------|--------|
| ACC-01 | Badge/aviso de advertencia | `index.css:18,45` (`#b45309` sobre `#fdf0e1`) → 4.48:1; usado en `BadgeEstado`, `Aviso`, `TarjetaAlerta` (chip Capacidad), `ReporteSalones.tsx:108`, `TelegramAlumnoPage.tsx:149` | Texto de 12 px por debajo de 4.5:1 (1.4.3). Con `#92400e` sube a 6.32:1 | Difícil de leer con baja visión | Alta | Cambiar `--color-saie-warning-strong` a `#92400e` (comprobar que no rompe el contraste de `border`) | S | Resuelto |
| ACC-02 | Título de documento y salto de bloques | `index.html:10` (título fijo); ninguna ruta actualiza `document.title`; no hay enlace «Saltar al contenido» (búsqueda sin coincidencias) | Un lector de pantalla no distingue las páginas al navegar; teclado debe recorrer cabecera y pestañas en cada ruta (2.4.1, 2.4.2) | Barrera de navegación en toda la app | Alta | Hook `useTituloPagina(titulo)` en los layouts + `EnlaceSaltar` al `<main id="contenido">` | S | Resuelto |
| ACC-03 | Contenedores con scroll horizontal | `AuditoriaAdmin.tsx:101,203`, `SeccionesAdmin.tsx:371`, `EspaciosAdmin.tsx:164`, `ReporteSalones.tsx:114`, `CargaDatos.tsx:705` (`overflow-x-auto`) | Sin `tabIndex={0}` ni nombre: un usuario de teclado no puede desplazar la tabla (regla axe *scrollable-region-focusable*) | Contenido inalcanzable a ciertos anchos | Media | Contenedor de `Tabla` enfocable con `role="region"` y `aria-label` | S | Resuelto |
| ACC-04 | Bordes de controles | `components/estudiante/SeccionEditable.tsx:187,355` (**todos los campos de Datos personales y Ficha médica**), `SeccionesAdmin.tsx:267,296`, `TelegramAlumnoPage.tsx:197,210`, `AlertasAdmin.tsx:151` (`border-saie-divider`, 1.33:1) | Los campos del perfil del alumno (DNI, teléfono, ficha médica) usan `border-saie-divider` y no `border-saie-border` como el resto de los formularios; además el contorno de «Cancelar» y de un `select` de Secciones apenas se distingue del fondo (1.4.11 pide 3:1). Es un incumplimiento AA en formularios principales | Controles poco perceptibles | Alta | Usar `border-saie-border` (3.68:1); resuelto al migrar a `Boton cancelar` | S | Pendiente |
| ACC-05 | Foco en campos | `components/ui/campos.ts:7` | Se sospechaba que el indicador de foco de los campos era débil. **Verificado en navegador:** el campo enfocado muestra el contorno de 3 px (`outline: solid 3px`) además del cambio de borde; en el perfil se ve un anillo negro claro | Sin problema | Baja | Descartado: el foco de los campos es visible | S | Descartado |
| ACC-06 | Tamaños de texto mínimos | `AuditoriaAdmin.tsx:147` y `InicioAdmin.tsx:172` (`text-[10px]`), `NavegacionEstudiante.tsx:32` (`text-[11px]`), medido en navegador: 40 elementos de texto por debajo de 12 px solo en Auditoría y 5 en el inicio del alumno; 116 usos de `text-xs` (12 px) incluso en datos principales (fechas, estado en tablas) | Información útil en 10–12 px, agravada por la fuente en un entorno de «Texto grande» | Legibilidad en baja visión y en móvil | Media | Mínimo 14 px para contenido; 12 px solo para metadatos secundarios | M | Pendiente |
| ACC-07 | Cambio de ruta sin anuncio | `AppRoutes.tsx` (SPA); solo `Consulta.tsx:186-190` mueve el foco al resultado | Al navegar entre pantallas el foco queda en el enlace anterior y no se anuncia la nueva página | Desorientación con lector de pantalla *(por verificar con NVDA/VoiceOver)* | Media | Mover el foco al `<h1>` al cambiar de ruta (en el hook de ACC-02) | S | Pendiente |
| ACC-08 | Toasts: tiempo y tipo de región | `components/ui/Avisos.tsx` | Ver FDB-06: errores anunciados con prioridad `polite` y sin pausa | Mensajes perdidos | Media | Ver FDB-06 | S | Resuelto |
| ACC-09 | Enlaces que abren pestaña | `TelegramAlumnoPage.tsx:218,282` (`target="_blank"`) | No se avisa a usuarios de lector de pantalla | Cambio de contexto inesperado | Baja | Añadir «(se abre en una pestaña nueva)» oculto visualmente | S | Resuelto |
| ACC-10 | Nombre del enlace del logo | `components/estudiante/LayoutEstudiante.tsx:47-49` | `<Link>` con solo `<img alt="SAIE">`: el nombre no dice el destino | Enlace ambiguo | Baja | `alt="SAIE, ir al inicio"` | S | Pendiente |
| ACC-11 | Altura fija de cabecera | `LayoutAdmin.tsx:69`, `LayoutEstudiante.tsx:45` (`h-[72px]`) | Con «Texto grande» o zoom del navegador el contenido de la cabecera puede recortarse *(por verificar)* | Posible recorte | Baja | `min-h` en lugar de `h` | S | Pendiente |
| ACC-12 | Ajustes «Texto grande» y «Reducir movimiento» | `utils/preferencias.ts:22-23,59-63`; `pages/ConfiguracionAlumno.tsx:15-26`; `index.css` (sin reglas); `pages/ConfiguracionAlumno.test.tsx:57,74` | `aplicarPreferencias` agrega las clases `saie-texto-grande` y `saie-sin-movimiento` a `<html>`, pero **ninguna hoja de estilos las define** (búsqueda en `src/`, `public/` e `index.html`). Además, `aplicarPreferencias` solo se llama al pulsar un interruptor (nunca al arrancar la app, ver `main.tsx`/`App.tsx`), así que la preferencia no se reaplicaría al recargar, y la propia pantalla no tiene ruta (`DEN-20`). Los interruptores cambian de estado y muestran «Cambio guardado», pero no cambian nada. La pantalla promete «Aumenta el tamaño del texto en toda la app» y «Quita las animaciones». Las pruebas solo comprueban que la clase se añade, por eso no lo detectan. «Reducir movimiento» solo funciona por la media query del sistema | Función de accesibilidad prometida que no hace nada | Alta | Definir `html.saie-texto-grande { font-size: 125% }` (y pasar tamaños a `rem`) y `html.saie-sin-movimiento * { animation: none; transition: none }`; añadir una prueba que verifique el efecto y no solo la clase *(coordinar con QA)* | S | Resuelto |
| ACC-15 | Home: tarjetas de portal y encabezado | `pages/Home.tsx:37,115-117` | El enlace de cada portal tiene `aria-label="Ingresar al …"`, que **sustituye** al contenido: el lector de pantalla no anuncia la descripción ni la lista de funciones de la tarjeta. El único `h1` de la página es solo el logo (`alt="SAIE"`), mientras que el título real es un `h2` | Contexto de cada portal inaccesible; esquema de encabezados débil | Baja | Quitar el `aria-label` y referenciar título y descripción con `aria-labelledby`/`aria-describedby`; `h1` visible «Bienvenido a SAIE» | S | Pendiente |
| ACC-16 | `SelectorSegmentado`: semántica | `components/estudiante/SelectorSegmentado.tsx:36-71`; usos en `HorarioMisCursos.tsx:171`, `AuditoriaAdmin.tsx:267`, `CargaDatos.tsx:874`, `CambioLaboratorio.tsx:368` | Se implementa como un grupo de botones con `aria-pressed`, pero en cuatro usos funciona como pestañas que cambian el contenido; no tiene `role="tablist"`/`tab`/`tabpanel` ni navegación por flechas. Las etiquetas cambian de ancho (p. ej. «PCs (sin registrar)») y el control salta | Un lector de pantalla anuncia botones, no pestañas | Baja | Variante `pestañas` con roles ARIA y flechas, y etiquetas de ancho estable | S | Pendiente |
| ACC-14 | `Drawer`: foco y fondo | `components/ui/Drawer.tsx:28-34,67` | Al abrir el foco va siempre al botón «×», incluso en formularios (donde debería ir al primer campo) o en detalles (al título). El resto de la página no se marca como `inert` y el bloqueo de scroll (`body.style.overflow = hidden`) no compensa el ancho de la barra de desplazamiento, por lo que el contenido puede desplazarse al abrir *(por verificar)*. El clic en el fondo y Escape cierran sin comprobar cambios (FDB-01) | Usuarios de teclado y lector de pantalla empiezan lejos de lo útil; salto visual al abrir | Media | Prop `focoInicial`; `inert` en el contenido de fondo; `scrollbar-gutter: stable` en `html` | S | Resuelto |
| ACC-17 | Foco perdido al pasar a edición | `pages/admin/EspaciosAdmin.tsx:299,469-473` | **Verificado en navegador:** al pulsar «Editar espacio» el botón desaparece del DOM y el foco pasa a `body` (se comprobó con `document.activeElement`); un usuario de teclado queda sin posición dentro del drawer | Pérdida de contexto con teclado y lector de pantalla | Media | Llevar el foco al primer campo del formulario (o al título) al cambiar de vista | S | Resuelto |
| ACC-13 | Navegación de retorno rotulada como ruta | `components/PantallaEnDesarrollo.tsx:124` (`<nav aria-label="Ruta de navegación">` con un solo botón «Volver») | No hay migas de pan reales en ninguna pantalla; este `nav` anuncia una «ruta de navegación» que contiene un único enlace de retorno | Etiqueta engañosa para lector de pantalla | Baja | Cambiar el rótulo a «Volver» o implementar migas de pan reales en el panel | S | Pendiente |

### 3.6 RES — Responsive

| ID | Pantalla/Componente | Archivo(s) | Problema | Impacto | Prioridad | Solución propuesta | Esfuerzo | Estado |
|----|---------------------|------------|----------|---------|-----------|--------------------|----------|--------|
| RES-01 | Marco del área del alumno | `components/estudiante/LayoutEstudiante.tsx:44-62`; `components/estudiante/CabeceraPantalla.tsx:32-83`; `components/estudiante/NavegacionEstudiante.tsx:57`; `config/rutas.ts` | Hay **dos marcos distintos**. El inicio (`LayoutEstudiante`) tiene logo, insignia de rol y botón «Cerrar sesión». Las pantallas internas (`CabeceraPantalla`: Horario, Perfil, Telegram) tienen una banda con «Volver al inicio», plano decorativo animado y **no tienen logo, rol ni «Cerrar sesión»**: para salir hay que volver al inicio. Ambos incluyen `NavegacionEstudiante`, que no tiene «Inicio» y que, pese al comentario del código («en móvil se fija abajo»), no es fija (`z-30 border-b md:static`, sin `fixed`). *(Corrige la versión anterior de este hallazgo, que decía erróneamente que la barra solo existía en el inicio.)* | Cambia el aspecto y las acciones disponibles al navegar; la sesión no se puede cerrar desde las pantallas donde el alumno pasa más tiempo | Alta | Un único marco del alumno con logo, rol y «Cerrar sesión» siempre visibles, pestaña «Inicio» y navegación fija abajo en móvil; el título grande de la banda pasa a un encabezado de página | M | Pendiente |
| RES-02 | Pestañas ocultas en móvil | `utils/admin.ts:128-148` (`soloEscritorio`), `LayoutAdmin.tsx:96` (`hidden md:flex`) | Secciones, Auditoría e Informe desaparecen de la barra por debajo de 768 px; solo se alcanzan desde los atajos del inicio | Funciones del panel sin ruta visible en móvil | Media | Pestaña «Más» con menú para las secundarias, o barra con scroll | M | Pendiente |
| RES-03 | Modo tablero con alto fijo | `components/admin/LayoutAdmin.tsx:64-66,109-111`, `estudiante/LayoutEstudiante.tsx:40-42,67-69` (`lg:h-screen lg:overflow-hidden`); `pages/admin/InicioAdmin.tsx:349` | **Verificado en navegador:** el inicio de Coordinación recorta contenido sin forma de desplazarse en ventanas de 1280×600, 1366×560 y 1024×640 (contenido de 594–597 px frente a 435–515 visibles, `overflow: hidden`, sin scroll de página). En 1366×560 la tarjeta «Secciones que requieren revisión» y «Accesos» quedan cortadas e inalcanzables; es un tamaño habitual de portátil con las barras del navegador. El inicio del alumno no se recorta a 1280×600 | Contenido inalcanzable (WCAG 1.4.10 y 2.1.1) | Alta | Alto mínimo y `overflow-y-auto` en `main`; limitar el modo tablero a alturas ≥ 800 px | M | Pendiente |
| RES-08 | Inicio del alumno desborda en móvil | `pages/InicioEstudiante.tsx:355-357` (rejilla `lg:grid-cols-12` sin `min-w-0`) y `:204` (lista horizontal de tarjetas `w-56`) | **Verificado en navegador:** a 390 px el documento mide 712 px (y a 640 px también 712): la tarjeta guinda y todo el contenido se ensanchan a 712 px mientras la cabecera y la navegación quedan en 390 px, lo que genera scroll horizontal de toda la página. El elemento que lo provoca es la rejilla, estirada por la fila de tarjetas de las clases del día | Pantalla principal del alumno rota en móvil: contenido cortado a la derecha y cabecera desalineada | Alta | `min-w-0` en los hijos de la rejilla y `overflow-x-auto` solo en la lista; mejor, lista vertical en móvil | S | Pendiente |
| RES-09 | Panel admin desborda en tabletas | `components/admin/LayoutAdmin.tsx:92-101`, `utils/admin.ts:117-149` | **Verificado en navegador:** a 768 px todas las pantallas del panel miden 826 px de ancho (scroll horizontal de la página): desde `md` se muestran las 7 pestañas en una fila que no cabe y «Informe» queda cortada en el borde | Scroll horizontal en tabletas y ventanas intermedias | Alta | Mostrar las pestañas completas solo desde `lg` y usar «Más» o la barra inferior por debajo | S | Pendiente |
| RES-10 | Lista de revisión truncada en móvil | `pages/admin/InicioAdmin.tsx:151-200` | **Verificado en navegador:** a 390 px el nombre del curso y el motivo se cortan («CC-117 · 3 …», «La sección no …») porque «Cargar horario» y «Reintentar» ocupan el ancho; la insignia del motivo se parte en tres líneas | Se pierde la información que identifica la sección | Media | Apilar: datos arriba y acciones debajo en móvil | S | Pendiente |
| RES-11 | Auditoría e historial en móvil | `AuditoriaAdmin.tsx:15-18,101-105,258-266`; `components/estudiante/SelectorSegmentado.tsx:59` | **Verificado en navegador (390 px):** la etiqueta «Historial de asignaciones» se corta («…asignacione»), la tabla de 5 columnas queda recortada (la fecha sale partida en tres líneas y «Corrida» fuera de vista) y «Actualizar» ocupa una fila entera sobre el título | El historial es casi ilegible en el móvil | Media | Tarjetas por registro en móvil, etiquetas cortas en las pestañas («Asignaciones» / «Registro») y acciones en la fila del título | M | Pendiente |
| RES-04 | Doble marcado tabla/tarjetas | `hooks/usePantallaAncha.ts`, `SeccionesAdmin.tsx:370-415`, `EspaciosAdmin.tsx:119-161`, `CargaDatos.tsx:688` | El cambio depende de JavaScript (`matchMedia`) tras el primer render, con el riesgo de un parpadeo de maquetación; `AuditoriaAdmin` y `ReporteSalones` (8 columnas) solo ofrecen scroll horizontal, sin vista de tarjetas | Experiencia dispar en móvil | Media | Resolver con CSS (`hidden lg:block` / `lg:hidden`) y una vista de tarjetas para Auditoría e Informe | M | Pendiente |
| RES-05 | Objetivos táctiles pequeños | `InicioAdmin.tsx:178-183` (enlace de acción `py-1 text-xs`), `InicioAdmin.tsx:171` y `VeredictoVerificacion.tsx:136` (`<summary>` de 12 px), casillas de 24 px | Controles por debajo de los 44 px que fija la propia guía (medido en navegador: 11 de 21 controles del inicio de Coordinación, 8 de 11 en Auditoría) | Pulsaciones erróneas en móvil | Media | Alto mínimo 44 px (`Boton sm` / `BotonEnlace`) | S | Pendiente |
| RES-06 | Toasts y barra inferior | `components/ui/Avisos.tsx:66` (`bottom-24 md:bottom-6`) | Posición calculada para la barra fija del *admin*; en el área del alumno (sin barra fija) queda alta | Aviso flotando lejos del borde | Baja | Variable CSS para el alto de la barra inferior | S | Pendiente |
| RES-07 | Scroll dentro del scroll en los drawers | `components/admin/FormularioEspacio.tsx:551` (`max-h-56 overflow-auto`), `pages/admin/SeccionesAdmin.tsx:234` (`max-h-64 overflow-y-auto`), `components/ui/Drawer.tsx:95` | Las listas de software viven en un área con scroll propio dentro del cuerpo del drawer, que también hace scroll: al arrastrar con el dedo se «atrapa» el gesto en la lista | Fricción en móvil y en tabletas | Baja | Dejar que la lista crezca y que solo desplace el drawer, o fijar un buscador y mostrar los marcados primero | S | Pendiente |

### 3.7 PER — Rendimiento percibido

| ID | Pantalla/Componente | Archivo(s) | Problema | Impacto | Prioridad | Solución propuesta | Esfuerzo | Estado |
|----|---------------------|------------|----------|---------|-----------|--------------------|----------|--------|
| PER-01 | Carga de código | `AppRoutes.tsx:3-31` (30 `import` estáticos); `vite build` verificado: un único chunk de 586 KB (168 KB comprimido) y advertencia de Vite por superar 500 KB | Todo el código (alumno, docente, admin, formularios largos) se descarga junto desde la pantalla pública | Primera carga más lenta en el móvil del alumno | Media | `React.lazy` + `Suspense` por área (`alumno`, `docente`, `admin`) con el esqueleto de VIS-10 | M | Pendiente |
| PER-02 | Búsqueda sin *debounce* | `SeccionesAdmin.tsx:319-327`, `AuditoriaAdmin.tsx:51-59`, `ReporteSalones.tsx:22-25` | `texto`/`periodo` están en las dependencias de la carga: una petición por tecla (las obsoletas se descartan en cliente, pero el servidor las procesa) | Carga innecesaria al backend/Supabase | Media | Hook `useValorDiferido(valor, 300)` o envío con Enter | S | Pendiente |
| PER-03 | Saltos de maquetación | `EsqueletoCarga` (3 × 96 px) frente a tablas reales; `usePantallaAncha` | El esqueleto no tiene la forma del contenido, y el intercambio tabla/tarjetas ocurre tras montar *(por verificar CLS)* | Salto visible al llegar los datos | Baja | Esqueletos por tipo (VIS-10) y CSS para la conmutación (RES-04) | S | Pendiente |
| PER-04 | Animaciones largas | `index.css:107-130,224-240`: entrada 0.55–0.6 s, escalonada hasta 0.35 s, rebote, `saie-float` infinito | La guía de la solicitud recomienda 150–250 ms; las animaciones respetan `prefers-reduced-motion`, pero la duración de entrada es más del doble | Sensación de lentitud | Baja | Reducir a 200–250 ms y retirar animaciones infinitas decorativas | S | En progreso |
| PER-05 | Fuentes de Google | `index.html:11-15` | Hoja de estilos externa de Google Fonts (bloquea el render) con 5 pesos de Inter y Playfair. Si el CDN está bloqueado (red universitaria o sin conexión) se cae a Roboto/Georgia, con métricas distintas, y con `display=swap` el texto cambia de tamaño al cargar (FOUT/CLS) | Dependencia externa en la ruta crítica y saltos de maquetación | Media | Al retirar Playfair (VIS-18) queda una sola fuente: autoalojar Inter 400-700 con `size-adjust` en la respaldo | M | Resuelto |
| PER-06 | Sin caché entre pantallas | `hooks/useCarga.ts` | Cada visita vuelve a pedir y vacía la vista hasta que llega; `SeccionesAdmin` pide docentes y catálogo al montar aunque el drawer esté cerrado | Esperas repetidas | Baja | Caché breve (*stale-while-revalidate*) y carga diferida del catálogo al abrir la edición | M | Pendiente |

### 3.8 TXT — UX writing

| ID | Pantalla/Componente | Archivo(s) | Problema | Impacto | Prioridad | Solución propuesta | Esfuerzo | Estado |
|----|---------------------|------------|----------|---------|-----------|--------------------|----------|--------|
| TXT-01 | Plurales con paréntesis | `VeredictoVerificacion.tsx:92,95,137` («violación(es)», «asignación(es) revisada(s)»); `InicioAdmin.tsx:120`; `EspaciosAdmin.tsx:582-588`; `ReporteSalones.tsx:109`; `SeccionesAdmin.tsx:357` | Producto percibido como sin pulir. `Consulta.tsx:17` ya tiene un helper `plural` que no se reutiliza | Redacción poco profesional | Media | `formatear/plural.ts` compartido y reemplazo en los 6 sitios (actualizar las pruebas que fijan esas cadenas — coordinar con QA) | S | Resuelto |
| TXT-02 | «Descargar PDF» | `ReporteSalones.tsx:29-31,42` | El botón llama a `window.print()`: abre el diálogo de impresión, no descarga un PDF | Promesa que el botón no cumple | Media | «Imprimir o guardar como PDF» (o generación real si se decide) | S | Resuelto |
| TXT-03 | Jerga del motor | «motor», «corrida», «verificador», «reglas duras», «violación», «asiento de auditoría», «escalamiento» en `InicioAdmin.tsx:455`, `AuditoriaAdmin.tsx:98,199,260`, `VeredictoVerificacion.tsx`, `utils/admin.ts` | Vocabulario del equipo técnico presentado a Coordinación/Jefatura | Curva de aprendizaje innecesaria | Media | Glosario: «asignación automática», «incumplimiento», «requiere revisión»; tecnicismo solo en un detalle | M | En progreso |
| TXT-04 | Textos dispersos | JSX de todas las pantallas (solo `config/plantillas.ts` centraliza texto) | No hay archivo de constantes ni i18n; el mismo mensaje se redacta a mano en varios sitios (p. ej. «Sin aula») | Imposible cambiar el tono de forma consistente | Media | `config/textos.ts` por dominio (acciones, estados, errores, vacíos) | L | En progreso |
| TXT-05 | Etiquetas de acción ambiguas | `SeccionesAdmin.tsx:87,127`, `EspaciosAdmin.tsx:153,212` («Ver»); «Actualizar» en 6 pantallas; «Sí, asignar aulas»/«Sí, resolver» | «Ver» no dice qué; «Actualizar» es ambiguo (¿datos o página?) | Menor claridad, sobre todo con lector de pantalla | Baja | «Ver detalle», «Actualizar datos»; verbos + objeto en las confirmaciones | S | Pendiente |
| TXT-06 | Abreviaturas | `ReporteSalones.tsx:125,137` («Sec.», «Alm.») | Cabeceras abreviadas sin necesidad aparente | Menos claro | Baja | Texto completo o `<abbr title>` | S | Resuelto |
| TXT-07 | Promesas de hoja de ruta en la UI | `AlertasAdmin.tsx:190-193` («el historial completo llegará con la próxima actualización») | Compromiso de producto dentro de la interfaz | Expectativas sin fecha | Baja | Retirar o enlazar a «Hoja de ruta» | S | Pendiente |
| TXT-08 | Mayúsculas | `VeredictoVerificacion.tsx:105` («CONFORME»/«NO CONFORME»), `TarjetaResultado.tsx:304` (`uppercase`), `TarjetaResultado.tsx:65` («Aula Teórica») | Texto en mayúsculas sostenidas y capitalización inconsistente | Lectura más lenta | Baja | Capitalización de oración | S | Pendiente |
| TXT-09 | Texto interno en pantallas públicas | `pages/Home.tsx:184` y pie de `LoginLayout` («SAIE © 2026 · UNMSM · Grupo 6») | La etiqueta del grupo de trabajo universitario aparece en el pie de la portada pública | Información interna de equipo en un producto de cara al usuario | Baja | Sustituir por el nombre institucional o retirar «Grupo 6» | S | Pendiente |
| TXT-10 | Cinco palabras para el mismo estado del espacio | `pages/admin/EspaciosAdmin.tsx:67-68,568,592,26-36`; `components/admin/FormularioEspacio.tsx:484-488` | `habilitado` se escribe «Habilitado» / «No asignable» (badge), «Espacio en servicio» (casilla), «Solo deshabilitados» (filtro), «no asignables» (resumen) y «fuera de servicio» (en «PCs fuera de servicio»). Además «PCs malogradas» (coloquial) en la interfaz y «fuera de servicio» en otro punto | El usuario no sabe si son conceptos distintos | Media | Un término por concepto en el diccionario (p. ej. «En servicio» / «Fuera de servicio» y «PCs averiadas») | S | Resuelto |
| TXT-11 | Punto doble en la fecha de asignación | `pages/admin/SeccionesAdmin.tsx:547` + `utils/admin.ts:17-26` | **Verificado en navegador:** el drawer muestra «Asignada el 21 oct., 11:34 a. m..» porque la fecha ya termina en punto y el texto añade otro | Error tipográfico visible | Baja | Quitar el punto sobrante o formatear sin abreviaturas con punto | S | Resuelto |
| TXT-12 | Nombres confusos en Auditoría e historial | `AuditoriaAdmin.tsx:15-18,259-260` | La pantalla se llama «Auditoría e historial» y su segunda pestaña «Auditoría»; el subtítulo dice «Qué decidió el motor en cada corrida y qué dejó registrado» (jerga del equipo) | El usuario no distingue las dos vistas ni entiende el vocabulario | Baja | Pantalla «Historial»; pestañas «Asignaciones» y «Registro de actividad»; subtítulo «Qué pasó con cada sección y cuándo» | S | En progreso |

---

## 4. Inventario de inconsistencias

### 4.1 Valores hardcodeados (medidos)

| Tipo | Medición | Archivos principales |
| --- | --- | --- |
| Colores hex fuera de `index.css` | 137 apariciones en 19 archivos | `TarjetaResultado.tsx` (38), `FormularioBusqueda.tsx` (12), `LogoEdificioGuinda.tsx` (11), `utils/horario.ts` (9), `AccesoDenegado.tsx` (5), `ElementosHorario.tsx` (4) |
| Hex que **ya tienen token** | `#666666` ×19, `#222222` ×19, `#e6dfd0` ×18, `#7b1113` ×14, `#faf6ed` ×11, `#d32f2f` ×8, `#8a8578` ×4, `#5c0d0e` ×4 | reemplazables 1 a 1 por `saie-muted/text/divider/primary/canvas/danger/border/primary-dark` |
| `font-mono` | 10 usos en 5 archivos, sin token | `TarjetaResultado.tsx`, `CargaDatos.tsx`, `AuditoriaAdmin.tsx`, `InicioAdmin.tsx`, `ReporteSalones.tsx` |
| Hex **sin token** | `#f1ede3` ×3, `#a8383a` ×3, `#c0ca33`, `#f57c00`, `#c9bfa9`, `#a79c85`, y 9 colores de la paleta de `utils/horario.ts` | `ElementosHorario.tsx`, `Consulta.tsx:243`, `ConfiguracionAlumno.tsx:42` |
| Paleta Tailwind ajena (`rose/emerald/amber/teal/indigo/…`) | 49 usos | `TarjetaResultado.tsx` (20), `TelegramAlumnoPage.tsx`, `PerfilAlumno.tsx`, `InicioEstudiante.tsx`, `HorarioMisCursos.tsx`, `SeccionEditable.tsx`, `LoginFormBase.tsx` |
| Tamaños de texto arbitrarios | `text-[10px]` ×2, `[11px]`, `[26px]`, `[28px]` ×3, `[30px]`, `[32px]` ×2, `[34px]`, `[44px]` | `Consulta.tsx`, `CabeceraPantalla.tsx`, `AuditoriaAdmin.tsx`, `InicioAdmin.tsx`, `NavegacionEstudiante.tsx` |
| Sombras literales | 6 variantes (`0 2px 8px` a 0.08 / 0.06 / 0.16 / 0.25 y `0 8px 24px` a 0.16 / 0.28) | `Consulta.tsx`, `TarjetaResultado.tsx`, `InicioEstudiante.tsx`, `PerfilAlumno.tsx`, `FormularioBusqueda.tsx` |
| Radios | `rounded-xl` 92, `full` 51, `lg` 32, `2xl` 29, `md` 4, `[12px]` 3, `[10px]` 3, `rounded` 2 | todo el árbol |
| `z-index` | 10, 30, 40, 50 (coherentes: cabecera sticky / navegación / drawer / toast) | — (formalizar como token) |

### 4.2 Variantes duplicadas de un mismo componente

| Componente | Variantes encontradas |
| --- | --- |
| Botón primario | `Boton` + `<button>` nativo en `SeccionesAdmin`, `SeccionEditable`, `Telegram`, `InicioEstudiante`, `PerfilAlumno`, `HorarioMisCursos`, `FormularioBusqueda`, `LoginFormBase` (8) |
| Botón «Cancelar» | `Boton cancelar` (borde `saie-border`), nativo con `saie-divider` en 3 sitios |
| Bloque de error | 7 (ver VIS-04) |
| Badge de estado de asignación | 3 (ver VIS-02) |
| Badge de tipo de espacio | `TarjetaResultado` (teal/indigo con ícono) vs texto plano en el resto |
| Esqueleto de carga | 3 (ver VIS-10) |
| Confirmación de acción | 3 (ver FDB-05) |
| Cabecera de página | 6 (ver VIS-05) |
| Formateo de fecha | 4 (ver MAP-08) |
| Parseo de error HTTP | 3 (`mensajeDeError`, `LoginFormBase`, `FormularioBusqueda`) |

### 4.3 Códigos del backend que llegan (o pueden llegar) al usuario sin mapear

| Código | Dónde aparece sin mapear | Hallazgo |
| --- | --- | --- |
| `LUNES`…`DOMINGO` | `TarjetaResultado.tsx:437`, `SeccionesAdmin.tsx:527` | MAP-01 |
| `ALUMNO`, `DOCENTE` | `InicioEstudiante.tsx:371`, `LayoutEstudiante.tsx:57`, `CabeceraPortal.tsx:30` | MAP-02 |
| `corridaId` (UUID) | `AuditoriaAdmin.tsx:147-149` | MAP-04 |
| `detalle` (texto libre del motor) | `AuditoriaAdmin.tsx:234`, `VeredictoVerificacion.tsx:146` | MAP-04 |
| `motivo` de alerta | `TarjetaAlerta.tsx:101` | MAP-04 |
| `VIGENTE/ESCALADA/PENDIENTE` | inconsistentes entre 3 componentes | MAP-03, MAP-05 |
| `message` de errores 4xx | `mensajeDeError`, `LoginFormBase`, `FormularioBusqueda` | MAP-06 |
| Claves de campo (`softwareIds`, …) | fallback de `EspaciosAdmin.tsx:296` | MAP-10 |

---

### 4.4 Anchos máximos (`max-w`) por rol

| Rol del contenedor | Valores encontrados | Dónde |
| --- | --- | --- |
| Página ancha (cabecera, navegación, contenido) | `6xl` (1152 px) · `7xl` (1280 px) · `[1200px]` | Admin: cabecera y pestañas 6xl, contenido 7xl · Alumno inicio: todo 7xl · `CabeceraPortal` y `HorarioMisCursos` 6xl · `Home` y `Consulta` 1200 |
| Página de lectura / formulario | `3xl` (768) · `4xl` (896) · `xl` (576) | Docente y «En desarrollo» 3xl · Perfil, Telegram, Configuración, Ayuda 4xl · Consulta pública y sus tarjetas xl |
| Login | `md` (448) · `md:lg` · `lg:md` | `LoginFormBase.tsx:115`: cambia a `lg` en tabletas y vuelve a `md` en escritorio |
| Panel lateral | `2xl` (672) | `Drawer` (igual para detalle, formularios largos de 900 líneas y guía de carga) |
| Texto auxiliar | `xs` / `sm` / `full` | etiquetas de filtros, descripciones de vacío, tooltip del mapa |

Cabeceras: 85 px (`CabeceraPortal`), 72 px (`LayoutAdmin`, `LayoutEstudiante`), 64 px (`Home`, `Consulta`).

### 4.5 Uso tipográfico por rol (serif / sans)

> Decisión: todo pasa a Inter (ver VIS-18); esta tabla describe el estado actual.

| Rol del texto | Familia hoy | Observación |
| --- | --- | --- |
| `h1` de página | serif en 9 de 10 (`AccesoDenegado` es sans) | consistente salvo una excepción |
| `h2`/`h3` de sección | **mixto**: serif en `SeccionEditable`, `Home`, `InicioEstudiante`, `Telegram`, `ReporteSalones`, `HorarioDia`, `EstadoVacio`; sans en `CargaDatos`, `EspaciosAdmin`, `Consulta`, `InicioAdmin`, `TarjetaResultado`, `TarjetaAlerta`, `Drawer` | sin regla |
| Cifras de tablero | serif (`Metrica`, resumen del alumno, tira semanal) | cifras de estilo antiguo (VIS-16) |
| Cifras en tablas y tarjetas | sans | no coinciden con las de los tableros |
| Códigos / identificadores | `font-mono` sin token | VIS-17 |
| Saludo y titular de bienvenida | serif (`InicioEstudiante:365`, `LoginLayout:74`) | decorativo, aceptable si la regla lo prevé |

### 4.6 Inventario de componentes (31, sin contar `mapa3d`)

| Componente | Función y características | Usado en | Observaciones |
| --- | --- | --- | --- |
| `ui/Boton` | 5 variantes (primario, secundario, peligro, cancelar, fantasma), 2 tamaños (44/48 px), `cargando`, `motivoDeshabilitado`, `anchoCompleto` | 10 archivos | Base correcta; subutilizado (VIS-03). Sin variante de solo ícono ni versión para enlaces |
| `ui/BadgeEstado` | 5 tonos, ícono + texto | 10 | Los tonos `advertencia` y `neutro` comparten el mismo ícono; sin fallback si el tono es inválido |
| `ui/Aviso` | mensaje inline, 4 tonos, rol por defecto según tono | 6 | Bien resuelto; falta ícono |
| `ui/Avisos` (+ `useAvisos`) | toasts con región viva, 5/8 s | 3 pantallas | FDB-06 |
| `ui/Drawer` | diálogo modal, foco atrapado, Escape, ancho único 2xl | 4 | Sin tamaños ni confirmación de cierre (FDB-01) |
| `ui/Acordeon` | `<details>` nativo | 1 | La Ayuda del alumno reimplementa el mismo patrón por su cuenta |
| `ui/campos.ts` | 3 constantes de clase (campo, etiqueta, ayuda) | 9 pantallas | No es un componente; no cubre error/obligatorio (VIS-12) |
| `admin/LayoutAdmin` | cabecera + pestañas (7, 3 ocultas en móvil) + título + acciones + modo tablero; incluye `AvisoError` | 17 | Cabecera/contenido en anchos distintos (VIS-19) |
| `admin/TarjetaAlerta` | alerta con tipo, cursos afectados plegables, confirmación en línea | 1 | Confirmación propia (FDB-05); chip de tipo no usa `BadgeEstado` |
| `admin/VeredictoVerificacion` | veredicto + 7 reglas con detalle plegable | 2 | Plurales «(es)» y detalle crudo (TXT-01, MAP-04) |
| `admin/FormularioEspacio` | crear/editar espacio, 924 líneas, validación por campo, `hayCambios` | 1 | Excelente validación; es el único formulario con `ErrorCampo`/`aria-invalid` completos y no se reutiliza |
| `auth/LoginFormBase` | formulario de login, mostrar/ocultar clave | 3 | Parseo de error propio (MAP-06); botón nativo |
| `auth/LoginLayout` | marco de dos paneles del login | 3 | Hero en serif |
| `auth/LoginRoute` / `RutaProtegida` | enrutamiento y control de acceso | 1 / 1 | Correctos; manejan sesión vencida |
| `auth/AccesoDenegado` | pantalla de rol no autorizado | 1 | `h1` en sans; 5 hex literales |
| `auth/BotonCerrarSesion` | cierra sesión | 4 | Se estiliza desde fuera con clases `!` importantes (`h-10! bg-white/10!…`), señal de que `Boton` no cubre la variante «sobre fondo guinda» |
| `auth/IconoPortal` | ícono por portal | 2 | — |
| `consulta/FormularioBusqueda` | búsqueda de alumno/curso con detección de tipo | 1 | 12 hex, botón propio (VIS-03) |
| `consulta/TarjetaResultado` | 4 estados (carga, error, sin resultado, resultado) | 1 | 38 hex, badges propios (VIS-01, VIS-02) |
| `estudiante/LayoutEstudiante` | cabecera con logo, rol y «Cerrar sesión» + navegación + título; modo tablero | 1 (solo el inicio) | RES-01: es el único marco con «Cerrar sesión» |
| `estudiante/CabeceraPantalla` | banda guinda con «Volver al inicio», título, plano animado e **incluye** `NavegacionEstudiante`; recibe `ancho` | 5 | Sin logo, rol ni «Cerrar sesión»; acoplada a mano al `main` de cada pantalla |
| `estudiante/NavegacionEstudiante` | 5 enlaces (Horario, Perfil, Mapa, Ruta, Telegram; 2 en desarrollo) | 2 (en los dos marcos) | Sin «Inicio», «Ayuda» ni «Configuración»; no es fija en móvil |
| `estudiante/ElementosHorario` | `Icono`, `BadgeEstadoAsignacion`, `BadgeEstadoClase`, `UbicacionEspacios`, `EstadoVacio`, `EsqueletoCarga`, `BarraProgresoClase`, `PuntoEnVivo` | 15 | Un «cajón» de 8 piezas reutilizado por el panel admin; debería vivir en `ui/` |
| `estudiante/SelectorSegmentado` | control segmentado con `aria-pressed` y pulgar deslizante | 4 | Usado también en admin |
| `estudiante/SeccionEditable` | sección de perfil con lectura/edición, validación al enviar | 1 | Botones propios (VIS-03) |
| `estudiante/GridHorarioSemanal` / `HorarioDia` / `ListaMisCursos` | vistas del horario (semana, día, cursos) | 1 c/u | Colores de curso desde una paleta de 9 hex (`utils/horario.ts`) |
| `CabeceraPortal` | cabecera de docente y «En desarrollo» | 2 | Séptima cabecera, 85 px |
| `PantallaEnDesarrollo` / `AvisoEnDesarrollo` | anuncia funciones pendientes | 15 | 14 pantallas lo usan (DEN-13, descartado por decisión del equipo) |
| `LogoEdificioGuinda` | logo SVG con `currentColor` | 2 | 11 hex |

### 4.7 Cobertura de estados por pantalla

Medición por búsqueda de componentes de estado en cada archivo (columnas: carga · vacío · error · toast).

| Módulo | Pantallas | Carga | Vacío | Error | Toast | Comentario |
| --- | --- | :-: | :-: | :-: | :-: | --- |
| Portal público | `Home`, `Consulta` | vía `TarjetaResultado` | vía `TarjetaResultado` | vía `TarjetaResultado` | — | completo, pero con componentes propios |
| Login | 3 | — | — | inline | — | — |
| Alumno | `InicioEstudiante` | ✓ | ✓ (`<p>` propio) | ✓ (propio) | — | |
| | `HorarioMisCursos` | ✓ | ✓ | ✓ (propio) | — | |
| | `PerfilAlumno` | ✓ (propio) | — | ✓ (propio) | inline | |
| | `TelegramAlumno` | ✓ | — | ✓ ×2 (propio) | inline | |
| | `Configuración`, `Ayuda` | n/a | n/a | n/a | inline | estáticas |
| Panel admin | `InicioAdmin` | ✓ | ✓ (`<p>` propio) | `AvisoError` | — | |
| | `EspaciosAdmin` | ✓ | ✓ | `AvisoError` | ✓ | el más completo |
| | `SeccionesAdmin` | ✓ | ✓ | `AvisoError` | ✓ | |
| | `AlertasAdmin` | ✓ | ✓ | `AvisoError` | ✓ | |
| | `AuditoriaAdmin` | ✓ | ✓ | `AvisoError` | — | |
| | `ReporteSalones` | ✓ | **✗** (FDB-12) | `AvisoError` | — | |
| | `CambioLaboratorio` | ✓ | ✗ | inline | inline | |
| | `CargaDatos` | ✓ | n/a | `Aviso` | inline | |
| Docente y «en desarrollo» | 14 pantallas | n/a | n/a | n/a | n/a | sin funcionalidad |

### 4.8 Análisis del `Drawer` (cómo aparece y se comporta hoy)

| Característica | Hoy | Hallazgo |
| --- | --- | --- |
| Instancias | 5 en 4 pantallas: Secciones (detalle y edición), Espacios (detalle, edición y alta), Inicio (veredicto), Carga (guía y resultado de cada una de las 4 tarjetas) | — |
| Posición | `fixed inset-0 z-40`, panel a la derecha, `h-full`; en móvil ocupa todo el ancho | Correcto; sin zona segura ni portal |
| Tamaño | `max-w-2xl` (672 px) fijo | VIS-21 |
| Fondo | `bg-saie-text/40`, el clic cierra | Cierra sin comprobar cambios (FDB-01) |
| Animación | fundido + 6 px vertical, 0,32 s | VIS-20 |
| Encabezado | `h2` de texto + botón «×» de 44 px sobre fondo blanco | DEN-14 |
| Cuerpo | `p-5`, con scroll interno | — |
| Pie | **no existe** | FDB-13 |
| Foco | al abrir, siempre al «×»; al cerrar vuelve al disparador | ACC-14 |
| Teclado | Escape y atrapar Tab: sí | Bien resuelto |
| Scroll del fondo | bloqueado con `overflow: hidden` | Sin compensar la barra (ACC-14) |
| URL | sin estado | DEN-16 |
| Contenido que embebe | detalle, formularios, veredicto, guía con tablas | títulos repetidos (DEN-15) |

**Especificación propuesta:** `Drawer` con `tamano` (sm/md/lg), entrada deslizante ≈200 ms (sin movimiento si el usuario lo reduce), encabezado con título, subtítulo e insignia de estado, slot `pie` fijo con las acciones y el estado de cambios, `confirmarCierre` para formularios, `focoInicial`, `inert` en el fondo y estado en la URL.

### 4.9 Auditoría e historial: análisis y mejoras propuestas

**Qué es hoy.** Una pantalla con dos pestañas: **Historial de asignaciones** (qué aula tuvo cada sección en cada corrida: sección, aula, estado, fecha, corrida) y **Auditoría** (registro de eventos del motor: evento, sección, detalle, fecha). Ambas son listados de hasta 200 filas, sin paginación, con un filtro o dos.

**Qué funciona.** Orden cronológico inverso, estados con color + ícono + texto, estados de carga/vacío/error reutilizados y un botón «Actualizar». Los datos relevantes ya existen en el backend (la pestaña de historial incluye asignaciones `HISTORICA`).

**Qué falla** (hallazgos: DEN-22, DEN-23, MAP-04, DEN-01, FDB-03, RES-11, TXT-12):
1. No se puede buscar una sección ni filtrar por fechas aunque el backend lo permite.
2. La columna «Detalle» muestra UUID y códigos internos (los espacios, la corrida y la cuenta que resolvió una alerta).
3. Las escaladas no explican su motivo y la ubicación del aula no aparece.
4. No hay vista por corrida: 40 filas repiten el mismo UUID.
5. En móvil las dos tablas se recortan.

**Mejoras propuestas, de más a menos impacto:**

| # | Mejora | Qué cambia para el usuario | Depende de |
| --- | --- | --- | --- |
| 1 | **Buscar una sección y ver su línea de tiempo** en un drawer | Responde «¿qué pasó con CC-101?» sin recorrer 200 filas | Solo frontend (`seccionId` ya existe para el historial) |
| 2 | **Agrupar por corrida** con resumen («12 oct, 10:32 · 230 asignadas · 17 en revisión · verificación conforme») | Se lee por corrida y desaparece el UUID repetido | Solo frontend |
| 3 | **Frases legibles en lugar del `detalle` crudo**: reemplazar UUID de espacios por su identificador (se puede cruzar con `obtenerEspacios`), mostrar «Corrida del …» y traducir códigos con el diccionario de §6 | «CC-101 · 1 pasó a AULA-102 (Pabellón C, piso 3)» | Frontend (parcial); lo ideal es que el backend envíe campos estructurados |
| 4 | **Filtros completos con chips y «Limpiar»**: periodo (lista), estado, tipo, rango de fechas | Menos pasos para acotar | Periodos: endpoint de §8, fila 7 |
| 5 | **Paginación de 50, total y «Exportar CSV»** | Se ve cuántos registros hay y se pueden llevar a una hoja de cálculo | Solo frontend |
| 6 | **Tarjetas en móvil** y nombres claros («Asignaciones» / «Registro de actividad») | Legible en el teléfono | Solo frontend |

**Observación fuera de la UI (backend).** La «auditoría» solo registra lo que hace el motor y la resolución de alertas (`motor.service.ts`, `alerta.service.ts`, `verificador.service.ts`). **No registra las acciones de las personas** (editar un espacio o una sección, cambiar el software de un laboratorio, importar un CSV) ni «quién» lo hizo de forma legible (el usuario aparece como un UUID de cuenta). Si se espera que Coordinación pueda responder «¿quién cambió esto?», haría falta registrar esas acciones con el nombre del usuario. Es una decisión de producto que conviene confirmar antes de rediseñar el título «Auditoría».

## 5. Propuesta de design tokens y componentes base

### 5.1 Tokens (declarar **una vez** en `@theme`; las variables `--saie-*` pasan a derivarse de ellos)

| Grupo | Token | Valor propuesto | Notas |
| --- | --- | --- | --- |
| Color · marca | `primary` / `primary-dark` | `#7b1113` / `#5c0d0e` | existen |
| Color · superficie | `canvas` / `surface` / `divider` | `#faf6ed` / `#ffffff` / `#e6dfd0` | `surface` hoy es `white` literal |
| Color · borde de control | `border-strong` | `#8a8578` (3.68:1) | existe como `border` |
| Color · texto | `text` / `muted` / `on-primary` | `#222222` / `#666666` / `#ffffff` | `muted` 5.74:1 sobre blanco |
| Color · éxito | `success`, `-soft`, `-strong` | `#2e7d32`, `#e8f5e9`, `#1b5e20` | existen |
| Color · advertencia | `warning` (base), `-soft`, `-strong` | `#b45309`, `#fdf0e1`, **`#92400e`** | `-strong` cambia a 6.32:1 (ACC-01); falta el base |
| Color · error | `danger`, `-soft`, `-strong` | `#d32f2f`, `#fdecea`, `#b71c1c` | reemplaza `rose-*` |
| Color · info | `info`, `-soft`, `-strong` | `#1f5fa8`, `#e7eff9`, `#174a85` | falta `-strong` |
| Tipografía · familias | `font-sans` (única) / `font-mono` | Inter / pila monoespaciada explícita | **se elimina `font-serif` (Playfair)** por decisión de VIS-18 |
| Tipografía · escala | `texto-meta` 12/16 · `texto-sm` 14/20 · `texto-base` 16/24 · `texto-lg` 18/28 · `titulo-3` 20/28 · `titulo-2` 24/32 · `titulo-1` 30/36 · `display` 34/40 | sustituyen `text-[26…44px]` | `meta` solo para metadatos |
| Tipografía · pesos | 400, 500, 600, 700 | reducir de 5 a 4 pesos de Inter | |
| Tipografía · mono y cifras | `font-mono` (token explícito) · `numeros-tablero`: sans + `tabular-nums` + `lnum` | evita cifras de estilo antiguo y columnas desalineadas | |
| Espaciado | escala de 4 px (`1…12` de Tailwind) | prohibir `px`/`rem` arbitrarios | |
| Anchos de contenedor | `contenedor-lectura 56rem` · `contenedor-normal 72rem` · `contenedor-ancho 80rem` | sustituyen `xl/3xl/4xl/6xl/7xl/[1200px]`; los usa un único `ContenedorPagina` | |
| Alto de cabecera | `cabecera 4.5rem` (72 px) | unifica 64/72/85 px | |
| Radios | `radio-campo` 10 · `radio-boton` 12 · `radio-tarjeta` 16 · `radio-pill` 9999 | mapear `[10px]`/`[12px]` y unificar `xl`/`2xl` | |
| Sombras | `sombra-tarjeta` (0 2 8 /.08) · `sombra-elevada` (0 8 24 /.16) · `sombra-accion` (guinda /.25) | reemplaza 6 literales | |
| Movimiento | `mov-rapido` 150 ms · `mov-base` 200 ms · `mov-lento` 300 ms · `ease-saie` | entrada ≤ 300 ms | |
| Capas | `z-sticky` 10 · `z-nav` 30 · `z-drawer` 40 · `z-toast` 50 | existen de hecho | |

### 5.2 Componentes base a crear o unificar

| Componente | Estado actual | Acción | Hallazgos que resuelve |
| --- | --- | --- | --- |
| `Boton` | existe, 14 archivos lo usan | extender (`BotonEnlace`, solo-ícono, `active:`) y migrar los `<button>` nativos | VIS-03, VIS-15, ACC-04, FDB-11 |
| `BadgeEstado` + `EstadoAsignacion` | existe + 2 copias locales | alimentarlo desde el diccionario y retirar las copias | VIS-02, MAP-05 |
| `Campo` / `Entrada` / `Seleccion` | no existe (clases sueltas) | crear con etiqueta, ayuda, error y validación | VIS-12, FDB-07 |
| `Tabla` | no existe (5 copias) | crear con orden, columnas opcionales, región enfocable | VIS-11, DEN-03, ACC-03 |
| `Paginador` + `FiltrosActivos` | no existen | crear | DEN-01, DEN-04 |
| `EstadoError` | 7 variantes | unificar sobre `Aviso` | VIS-04 |
| `EstadoVacio` | existe (ícono fijo) | `icono` y `accion` configurables | FDB-08 |
| `Esqueleto` | 3 variantes | variantes por forma | VIS-10, PER-03 |
| `DialogoConfirmacion` + `useGuardaCambios` | no existen (3 patrones) | crear | FDB-01, FDB-05 |
| `Toast` (`Avisos`) | existe, uso parcial | `status`/`alert`, pausa al foco, adopción global | FDB-06, ACC-08 |
| `EncabezadoPagina` + `ContenedorPagina` | 6 cabeceras | crear | VIS-05, VIS-06 |
| `Icono` (registro) | trazos copiados | crear | VIS-09 |
| Utilidades `diccionario/`, `formatear/`, `errores/` | dispersas | crear (ver §6) | MAP-*, TXT-01, TXT-04 |
| `useTituloPagina`, `EnlaceSaltar` | no existen | crear | ACC-02, ACC-07 |

---

## 6. Diccionario de mapeo propuesto

Los textos son una **propuesta** para validar con Coordinación (ver §8). Todo valor no listado debe caer en *«No disponible»* y registrarse con `console.warn`.

### 6.1 Estado de asignación (alumno y panel)

| Código backend | Texto para el usuario | Color/variante | Tooltip/descripción |
|----------------|-----------------------|----------------|---------------------|
| `VIGENTE` con espacios | Aula confirmada | `exito` + ✓ | «Tu aula ya está confirmada.» |
| `VIGENTE` sin espacios *(inconsistencia)* | Aula por confirmar | `neutro` + log | Se registra en consola; nunca se muestra «confirmada» |
| `ESCALADA` | En revisión | `advertencia` + ! | Alumno: «Coordinación está revisando el aula.» · Panel: «Requiere revisión de Coordinación.» |
| `PENDIENTE` / sin asignación | Sin aula asignada | `neutro` + reloj | «Aún no se ha asignado un aula a esta sección.» |
| `HISTORICA` | Anterior | `neutro` | «Asignación reemplazada por una más reciente.» |

### 6.2 Roles

| Código backend | Texto para el usuario | Color/variante | Tooltip/descripción |
|----------------|-----------------------|----------------|---------------------|
| `ALUMNO` | Estudiante | `info` | — |
| `DOCENTE` | Docente | `info` | — |
| `COORDINACION_ACADEMICA` | Coordinación Académica | `info` | — |
| `JEFATURA_LABORATORIOS` | Jefatura de Laboratorios | `info` | — |

### 6.3 Tipo de espacio, día y tipo de alerta

| Código backend | Texto para el usuario | Color/variante | Tooltip/descripción |
|----------------|-----------------------|----------------|---------------------|
| `AULA_TEORICA` | Aula teórica | `neutro` + ícono pizarra | «Sin computadoras; capacidad = aforo.» |
| `LABORATORIO` | Laboratorio | `neutro` + ícono monitor | «Con computadoras y software instalado.» |
| `LUNES … DOMINGO` | Lunes … domingo (abreviado: Lun … Dom) | — | usar `ETIQUETA_DIA` / `ABREVIATURA_DIA` |
| `SOFTWARE` (alerta) | Software | `info` | «Falta software requerido.» |
| `CAPACIDAD` (alerta) | Capacidad | `advertencia` | «El aula no alcanza para los matriculados.» |
| `PENDIENTE` / `RESUELTA` (alerta) | Pendiente / Resuelta | `peligro` / `exito` | — |

### 6.4 Eventos de auditoría

| Código backend | Texto para el usuario | Color/variante | Tooltip/descripción |
|----------------|-----------------------|----------------|---------------------|
| `ASIGNACION` | Aula asignada | `exito` | «El sistema asignó un aula.» |
| `ESCALAMIENTO` | Enviada a revisión | `advertencia` | «No se encontró un aula adecuada.» |
| `ALERTA` | Alerta generada | `peligro` | — |
| `VERIFICACION` | Comprobación | `info` | «Revisión automática de la asignación.» |

### 6.5 Motivos de revisión (`[CODIGO] descripción`)

| Código backend | Texto para el usuario | Color/variante | Tooltip/descripción |
|----------------|-----------------------|----------------|---------------------|
| `SIN_HORARIOS_DEFINIDOS` | Sin horarios definidos | `advertencia` | acción: Cargar horario |
| `SIN_ESPACIOS_DISPONIBLES` | Sin espacios del tipo requerido | `advertencia` | acción: Revisar espacios |
| `CAPACIDAD_INSUFICIENTE` | Capacidad insuficiente | `advertencia` | acción: Revisar espacios |
| `HORARIO_BLOQUEADO` | Horario ocupado | `advertencia` | acción: Revisar ocupación |
| `SOFTWARE_FALTANTE` | Software faltante | `advertencia` | acción: Revisar laboratorios |
| `CONTIGUEDAD_NO_ALCANZADA` | Sin bloque contiguo | `advertencia` | — |
| *(otro)* | Requiere revisión | `advertencia` | fallback + `console.warn` (ya existe) |

*(Los siete incumplimientos del verificador ya están traducidos en `VeredictoVerificacion.tsx:5`; solo falta el fallback de MAP-07.)*

### 6.6 Errores HTTP y de red (revisado contra `backend/src`)

El backend responde con una forma uniforme `{ success: false, message, errors?: string[] }` (`lib/http.ts`) y lanza unos 59 mensajes de error de dominio distintos (la mayoría 404 y 409, el resto 400, 401, 403, 413, 422 y un 500). **No existe el 429**: no hay limitador de peticiones. **Regla propuesta:** mostrar el `message` del backend solo si `success === false` y el estado es 400, 403, 409, 413 o 422 (son frases en español pensadas para personas); en 404 y en cualquier cuerpo que no tenga `success` usar un texto propio.

| Código backend | Texto para el usuario | Color/variante | Tooltip/descripción |
|----------------|-----------------------|----------------|---------------------|
| 400 (validación Zod) | «Revisa los datos ingresados.» + lista de `errors[]` | `error` inline junto al campo | Hoy la UI solo muestra «Parámetros inválidos» (MAP-15). Ejemplo de `errors`: «El periodo debe tener formato AAAA-N (ej. 2026-1)» |
| 400 (regla de negocio) | el `message` tal cual | `error` | Ejemplos reales: «La clave actual es incorrecta», «Un aula teórica no tiene software ni PCs malogradas» |
| 401 en login | «Código o contraseña incorrectos. Las cuentas las asigna Coordinación Académica.» | `error` inline | Backend: «Credenciales inválidas»; no cierra sesión |
| 401 con sesión | «Tu sesión venció. Vuelve a iniciar sesión.» | redirección | ya implementado |
| 403 | el `message` | `error` | Ejemplos: «Solo Coordinación Académica puede editar una sección», «No tienes asignado este laboratorio». Excepción: «Tu rol no puede editar: <claves>» → traducir las claves con `ETIQUETA_CAMPO` |
| 404 | «No encontramos ese {espacio / sección / alerta…}. Puede que ya no exista: actualiza la lista.» | `neutro` | **No mostrar el `message` cuando contiene un identificador** («El espacio con ID '…' no existe»); sí se muestran los 404 de la consulta pública («No se encontró ningún estudiante con el código …»), que son frases seguras |
| 409 · corrida en curso | el `message`: «Ya hay una corrida de asignación en curso. Intenta de nuevo al terminar.» | `advertencia` | `asignacionDemanda.service.ts`; deshabilitar «Asignar aulas» mientras tanto |
| 409 · ya existe | el `message`: «Ya existe un espacio con ese identificador en el pabellón» / «Ya existe un software con ese nombre y versión» | `error` inline en el campo | `espacioAdmin.service.ts`, `software.service.ts` |
| 409 · ya resuelta/cerrada | «Esta alerta ya estaba resuelta.» + **refrescar la lista** | `info` (no es un error) | `alerta.service.ts`, `incidenciaAdmin.service.ts`: la acción ya se hizo, no hay nada que reintentar |
| 413 | el `message`: «El archivo supera el máximo de 20000 filas por envío» | `error` | La UI ya valida 10 MB en el cliente; el límite de filas solo lo conoce el servidor |
| 422 | el `message` (reglas de negocio) | `error` inline | Ejemplos: «El aforo nominal debe ser mayor a 0 en un espacio habilitado», «El conteo de PCs malogradas (5) excede el aforo nominal (4)», «La contigüidad solo se permite entre espacios del mismo tipo» |
| 429 | — | — | El backend no lo emite; se retira del diccionario |
| 500 | «Algo salió mal de nuestro lado. Inténtalo de nuevo en unos minutos.» | `error` | Backend: «Error interno del servidor». Fuera de producción el manejador global de `app.ts` devuelve `err.message` técnico: no mostrarlo |
| Cuerpo sin `success` (`{ error, message }`) | texto genérico según el estado | `error` | Ruta inexistente y errores no controlados (`app.ts`) |
| *timeout* (`ECONNABORTED`) | «La operación tardó más de lo esperado. Puede que se haya completado: actualiza para comprobarlo.» | `advertencia` | hoy se reporta como «sin conexión» |
| Sin respuesta | «No hay conexión con el servidor. Revisa tu internet.» | `error` | |

### 6.7 Formato de valores

| Dato | Formato propuesto |
| --- | --- |
| Fecha y hora | `12 oct 2026, 10:32` en `America/Lima`; «hace 2 h» si es de hoy |
| Rango horario | `08:00 – 10:00` |
| Vacío / nulo | `—` (nunca `null`, `undefined` ni cadena vacía) |
| Conteos | helper `plural(n, 'sección', 'secciones')`; sin «(s)» |
| Periodo | `2026-2` (lista de valores, no texto libre) |

---

## 7. Plan de acción priorizado

### 7.0 Etapas de implementación

Cada etapa termina con `npx tsc --noEmit`, lint, `vite build` y las pruebas existentes (sin modificarlas), y con el estado de los hallazgos actualizado en §9.

| Etapa | Contenido | Hallazgos principales | Riesgo |
| --- | --- | --- | --- |
| 1 | **Hecha.** Correcciones rápidas de datos y accesibilidad: un solo estado en la consulta, días y roles legibles, cifra del tablero, color de advertencia, «Texto grande» y «Reducir movimiento» con efecto, título por ruta + «Saltar al contenido», 404, `ErrorBoundary`, rutas de Ayuda y Configuración, plurales, «Imprimir», punto doble, archivos huérfanos | MAP-01/02/03, DEN-02, ACC-01/02/12, FDB-03/09/14, DEN-20, TXT-01/02/11, VIS-14 | Bajo |
| 2 | Tokens y tipografía: Inter única, cifras tabulares, anchos de contenedor, sombras y radios, fuentes autoalojadas — **hecha** | VIS-07/08/16/17/18/19, PER-05 | Medio: cambia el aspecto de todos los títulos |
| 3 | **Hecha.** Capas transversales: `diccionario/`, `formatear/`, `errores/` con la política de §6.6 y manejo global de errores | MAP-04…MAP-15, FDB-02, TXT-03/04/10 | Medio |
| 4 | Componentes base: `Boton`/`BotonEnlace`, `Campo`, `Icono`, `Esqueleto`, `EstadoVacio`/`EstadoError`, `Tabla`, `Paginador`, `FiltrosActivos`, `DialogoConfirmacion`, `Toast` y el nuevo `Drawer` | VIS-02/03/04/09/10/11/12/20/21, FDB-01/05/06/13, ACC-14/17 | Medio: toca muchas pantallas |
| 5 | Marcos y responsive: `EncabezadoPagina`/`ContenedorPagina`, marco único del alumno, pestaña «Más» del admin, fin del recorte del tablero y de los desbordes | VIS-05/06, RES-01/02/03/08/09/10, DEN-08 | Medio |
| 6 | Panel: Inicio, Secciones, Espacios, Alertas, Carga e Informe | DEN-01/03/04/05/06/07/11/17/19/21, FDB-04/10/12, MAP-12/13 | Medio |
| 7 | **Auditoría e historial** según §4.9 (buscador de sección y línea de tiempo, agrupar por corrida, filtros, paginación, exportar CSV, móvil) | DEN-22/23, RES-11, TXT-12, MAP-04 | Medio: parte depende del backend |
| 8 | Portal público y área del alumno: consulta, horario, perfil, Telegram | VIS-01/22, DEN-12/18, ACC-04/15/16, RES-04 | Bajo |
| 9 | Verificación final: `tsc`, lint, build, pruebas, axe, nueva pasada en navegador y checklist de §9 | todos | — |

**Fuera de este plan** (tareas aparte): el endpoint `GET /api/v1/admin/periodos`, el registro de las acciones de las personas en la auditoría, y la actualización de las pruebas que fijan textos (QA, rama aparte). No se modifican `backend/tests/`, `CHANGELOG.md` ni `docs/registro_versiones.md`.

Las tablas por fase de abajo detallan las dependencias entre tareas.

### Fase 1 — Quick wins (esfuerzo S, sin dependencias)

| Orden | Hallazgo | Acción |
| --- | --- | --- |
| 0 | ACC-12 | Dar efecto real a «Texto grande» y «Reducir movimiento» |
| 0b | VIS-18, VIS-16, VIS-17 | Retirar Playfair, Inter única con cifras tabulares |
| 1 | MAP-03 | Un solo estado visible en `TarjetaResultado` (`estadoAMostrar`) |
| 2 | MAP-01 | `ETIQUETA_DIA` en portal público y Secciones; tipar `diaSemana` |
| 3 | MAP-02 | `etiquetaRol` global para los 4 roles |
| 4 | DEN-02 | «—» en «Con aula nueva» sin corrida |
| 5 | ACC-01 | `--color-saie-warning-strong: #92400e` |
| 6 | ACC-02 | `useTituloPagina` + «Saltar al contenido» |
| 7 | FDB-03 | Quitar `window.location.reload()` |
| 8 | TXT-01, TXT-02 | Helper de plural y rótulo de «Imprimir» |
| 9 | FDB-09 | Página 404 |
| 10 | VIS-14 | Retirar archivos huérfanos |

### Fase 2 — Transversal (tokens, componentes base, capas de datos y errores)

| Orden | Trabajo | Hallazgos | Depende de |
| --- | --- | --- | --- |
| 2.1 | Tokens únicos en `@theme` y escala | VIS-07, VIS-08, PER-04 | — |
| 2.2 | Capa `diccionario/` + `formatear/` + `errores/` con fallback y la política de mensajes de §6.6 | MAP-04…MAP-11, MAP-14, MAP-15, TXT-04 | — |
| 2.3 | Interceptor + `useAccion` + `EstadoError` | FDB-02, MAP-06, VIS-04, FDB-11 | 2.2 |
| 2.4 | `Boton`/`BotonEnlace`, `Campo`, `Icono`, `Esqueleto`, `EstadoVacio` | VIS-03, VIS-09, VIS-10, VIS-12, VIS-15, FDB-08 | 2.1 |
| 2.5 | `Tabla`, `Paginador`, `FiltrosActivos` | VIS-11, DEN-01, DEN-03, DEN-04, ACC-03 | 2.4 |
| 2.6 | `DialogoConfirmacion`, `useGuardaCambios`, `Toast` revisado | FDB-01, FDB-05, FDB-06, ACC-08 | 2.4 |
| 2.7 | `EncabezadoPagina`/`ContenedorPagina` (anchos y alto de cabecera) | VIS-05, VIS-06, VIS-19 | 2.1 |

### Fase 3 — Por pantalla

| Orden | Pantalla | Hallazgos | Depende de |
| --- | --- | --- | --- |
| 3.1 | Portal público (`Consulta`, `TarjetaResultado`, `FormularioBusqueda`) | VIS-01, VIS-02, MAP-09, MAP-11 | 2.1, 2.2 |
| 3.2 | Área del alumno (layout único con navegación) | RES-01, VIS-04, TXT-* | 2.3, 2.7 |
| 3.3 | Panel: Inicio | DEN-02, DEN-08, RES-03, RES-05 | 2.5 |
| 3.4 | Panel: Secciones, Espacios, Auditoría, Informe (Auditoría: ver §4.9) | DEN-01, DEN-05, DEN-06, DEN-07, DEN-21, DEN-22, DEN-23, RES-11, TXT-12, FDB-04, RES-04, PER-02 | 2.5, 2.6 y, para el selector de periodo, el endpoint `GET /api/v1/admin/periodos` (§8, fila 7) |
| 3.5 | Panel: Alertas, Carga | FDB-05, FDB-10, TXT-03 | 2.6 |
| 3.6 | Accesibilidad transversal y rendimiento | ACC-05…ACC-11, RES-02, RES-06, PER-01, PER-03, PER-05, PER-06 | 3.1–3.5 |

---

## 8. Decisiones, riesgos y dudas abiertas

Todas las preguntas de la primera versión están resueltas. Registro de decisiones (2026-10-21):

| # | Tema | Decisión | Origen |
| --- | --- | --- | --- |
| 0 | Tipografía (VIS-18) | Una sola familia, Inter, en todo el producto | el equipo delegó la elección |
| 1 | Textos de los estados (§6.1) | Se aprueban «Aula confirmada / En revisión / Sin aula asignada / Anterior», con redacción distinta para alumno y Coordinación | aprobado |
| 2 | Pruebas | **Actualizado:** las pruebas que fijan textos se corrigen en esta misma rama (`feature/auditoria-ui-ux`), solo para reflejar los cambios de UI/UX; no se añaden pruebas nuevas ni se toca `backend/tests/` | el equipo |
| 3 | Marco del alumno (RES-01, DEN-20) | Un solo marco con logo, rol y «Cerrar sesión» siempre visibles, pestaña «Inicio» y navegación fija abajo en móvil; se publican Ayuda y Configuración | aprobado |
| 4 | Navegación admin en tablet y móvil (RES-02, RES-09) | Pestaña «Más» con menú | aprobado |
| 5 | Paginación (DEN-01) | **Revisado en el backend:** `limite` va de 1 a 200 (por defecto 50), `pagina` desde 1, y `total` cuenta toda la consulta (no solo la página); el esquema es `.strict()`, así que no se pueden enviar parámetros desconocidos. Se usa 50 por página (hoy la UI pide 200, el máximo) | aprobado + backend |
| 6 | Códigos HTTP (§6.6) | **Revisado en el backend:** existen 400, 401, 403, 404, 409, 413, 422 y 500; **no existe el 429**. Hay tres familias de 409 con tratamientos distintos y los 404 incluyen UUID, por lo que no se muestran (MAP-14, MAP-15). Política y diccionario en §6.6 | revisión del backend |
| 7 | Periodos (DEN-05, DEN-21) | **Revisado en el backend:** no existe un endpoint que liste los periodos; solo `obtenerPeriodoVigente` (variable `PERIODO_VIGENTE` o el más reciente con secciones). Se propone un endpoint nuevo de solo lectura `GET /api/v1/admin/periodos` → `{ vigente, periodos[] }` (`distinct` de `seccion.periodo`), a cargo de quien mantiene el backend. Mientras no exista, la UI valida el formato `AAAA-N` y rotula qué significa «vacío» en cada pantalla | revisión del backend |
| 8 | Color de advertencia (ACC-01) | `#b45309` → `#92400e` | aprobado |
| 9 | «Descargar PDF» (TXT-02) | Se renombra a «Imprimir o guardar como PDF» | aprobado |
| 10 | Modo oscuro | Se pospone | aprobado |
| 11 | Modo tablero (RES-03) | El contenido nunca se recorta; el modo tablero solo en alturas ≥ 800 px | aprobado |
| 12 | Alcance | Fuera: pantallas de docente, *placeholders* y mapa 3D | el equipo |
| 13 | Pasada en navegador | Hecha (§2.2). Queda fuera lector de pantalla real y Lighthouse | — |
| 14 | Mejoras de Auditoría e historial (§4.9) | Entran en la etapa 7; registrar las acciones de las personas en el backend es una tarea aparte | aprobado |

**Dependencia nueva con el backend (fuera de la UI):** el endpoint de periodos de la fila 7. No bloquea las Fases 1 y 2.

Riesgos: (a) los hallazgos marcados *(por verificar)* dependen de lector de pantalla real, Lighthouse y la barra de scroll al abrir un drawer; (b) el cambio de los tokens de color afecta a todo y debe validarse con la suite de axe; (c) la migración de `<button>` a `Boton` altera alturas y puede mover layouts; (d) retirar Playfair cambia el aspecto de todos los títulos: conviene revisarlo con quien aprueba el diseño antes de la Fase 1.

---

## 9. Registro de avance y verificación

### 9.1 Seguimiento por etapa

| Etapa | Hallazgos resueltos | Archivos modificados | Fecha |
| --- | --- | --- | --- |
| Auditoría (este documento) | — | `docs/AUDITORIA_UI_UX.md` (nuevo) | 2026-10-21 |
| Pasada en navegador | Verificados `RES-03`, `MAP-01`, `MAP-03`, `MAP-06`, `DEN-01`, `DEN-02`, `DEN-14`, `DEN-15`, `DEN-20`, `FDB-01`, `FDB-09`, `FDB-13`, `ACC-02`, `ACC-04`, `VIS-16`, `VIS-18`; nuevos `RES-08`, `RES-09`, `RES-10`, `ACC-17`, `TXT-11`; descartado `ACC-05` | `docs/AUDITORIA_UI_UX.md` | 2026-10-21 |
| Revisión del backend | Decisiones 5, 6 y 7 cerradas; nuevos `MAP-14`, `MAP-15`, `DEN-21`; corregido el diccionario de errores (§6.6) | `docs/AUDITORIA_UI_UX.md` | 2026-10-21 |
| Análisis de Auditoría e historial | Nuevos `DEN-22`, `DEN-23`, `RES-11`, `TXT-12`; `MAP-04` con los formatos reales del backend; sección 4.9 | `docs/AUDITORIA_UI_UX.md` | 2026-10-21 |
| Revisión de la auditoría | Corrección de `RES-01` (la barra de navegación sí existe en las pantallas internas) | `docs/AUDITORIA_UI_UX.md` | 2026-10-21 |
| Etapa 1 — Correcciones rápidas (rama `feature/auditoria-ui-ux`) | **Resueltos:** `MAP-01`, `MAP-02`, `MAP-03`, `DEN-02`, `ACC-01`, `ACC-02`, `ACC-12`, `FDB-03`, `FDB-09`, `FDB-14`, `TXT-01`, `TXT-02`, `TXT-11`, `VIS-14`. **En progreso:** `DEN-20` (falta la navegación, Etapa 5) | Nuevos: `components/ErrorBoundary.tsx`, `components/ui/EnlaceSaltar.tsx`, `hooks/useTituloPagina.ts`, `pages/NoEncontrada.tsx`, `utils/texto.ts`. Modificados: `index.css`, `main.tsx`, `App.tsx`, `AppRoutes.tsx`, `config/rutas.ts`, `types/admin.ts`, `utils/admin.ts`, `LayoutAdmin`, `LayoutEstudiante`, `CabeceraPantalla`, `CabeceraPortal`, `PantallaEnDesarrollo`, `AccesoDenegado`, `LoginFormBase`, `TarjetaResultado`, `VeredictoVerificacion`, `Consulta`, `Home`, `InicioEstudiante`, `InicioAdmin`, `EspaciosAdmin`, `SeccionesAdmin`, `AuditoriaAdmin`, `ReporteSalones`, `PerfilAlumno`, `HorarioMisCursos`, `TelegramAlumnoPage`, `ConfiguracionAlumno`, `AyudaAlumno`. Eliminados: `App.css`, `assets/react.svg`, `vite.svg`, `hero.png` | 2026-10-21 |
| Etapa 2 — Tokens y tipografía | **Resueltos:** `VIS-07`, `VIS-08`, `VIS-16`, `VIS-17`, `VIS-18`, `VIS-19`, `PER-05`. Inter única (variable, autoalojada con `@fontsource-variable/inter`; sin peticiones externas), tokens definidos una sola vez en `@theme`, sombras `shadow-saie-card/pop/accion`, radio `rounded-saie-campo`, anchos `max-w-saie-lectura/normal/ancho`, cabeceras de 72 px, 137 colores literales sustituidos donde ya existía el token, cifras tabulares, tamaños de 10–11 px subidos a 12 px | `index.css` (reescrito), `index.html`, `package.json` y `package-lock.json` (nueva dependencia), 38 componentes y pantallas con sustituciones mecánicas; eliminado `tailwind.config.js`. **Pruebas:** corregidas en esta rama las 8 que fijaban textos de la Etapa 1 (`PantallaEnDesarrollo`, `VeredictoVerificacion`, `AuditoriaAdmin`, `EspaciosAdmin`, `InicioAdmin`); 408 de 408 pasan | 2026-10-21 |
| Etapa 3 — Capas de diccionario, formatos y errores | **Resueltos:** `MAP-05`, `MAP-06`, `MAP-07`, `MAP-09`, `MAP-10`, `MAP-11`, `MAP-14`, `MAP-15`, `TXT-10`. **En progreso:** `MAP-08`, `FDB-02`, `TXT-03`, `TXT-04`, `TXT-12` (el manejo global de errores con avisos unificados llega con los componentes de la Etapa 4; quedan frases con jerga como «verificador» y los textos todavía escritos en cada pantalla). Nuevos: `config/textos.ts`, `services/errores.ts` (política de §6.6: el `message` del backend solo se muestra si es una frase de dominio y no contiene UUID; los 400 incluyen el detalle de `errors`; el tiempo agotado se distingue de la falta de conexión; las claves de campo se traducen), `utils/diccionarios.ts` (estados, eventos, tipos, roles, campos y reglas, con valor por defecto y aviso en consola). Modificados: `BadgeEstado` (tono desconocido), `TarjetaAlerta`, `TarjetaResultado`, `ElementosHorario`, `VeredictoVerificacion`, `FormularioEspacio`, `LoginFormBase` (un servidor caído ya no dice «credenciales inválidas»), `FormularioBusqueda`, `AuditoriaAdmin`, `EspaciosAdmin`, `SeccionesAdmin`, `ReporteSalones`, `InicioAdmin`, `TelegramAlumnoPage`, `utils/admin.ts` (fechas en hora de Lima y `formatearFechaRelativa`), `services/estudiante.ts`. Textos unificados: «Aula confirmada / En revisión / Sin aula asignada / Anterior», «En servicio / Fuera de servicio», «PCs malogradas». **Pruebas:** 408 de 408 pasan (actualizadas las que fijaban textos; la de fechas ahora es independiente de la zona horaria) | 2026-10-21 |
| Etapa 4 — Componentes base (**parcial**, checkpoint) | **Resueltos:** `FDB-05`, `FDB-06`, `FDB-13`, `ACC-14`, `ACC-17`, `ACC-08`, `VIS-20`, `VIS-21`, `DEN-14`, `DEN-15`, `VIS-04`, `VIS-15`. **En progreso:** `FDB-01`, `VIS-03`, `VIS-11`, `VIS-12`. Nuevos: `Drawer` renovado (tamaños, entrada deslizante, subtítulo e insignia, pie fijo, confirmación al cerrar con cambios, foco al primer campo o al título y al cambiar de vista, `scrollbar-gutter`), `DialogoConfirmacion` (usado en asignar aulas, resolver alerta y desvincular Telegram), `BotonEnlace` y `clasesBoton`, `EstadoError` (sustituye 7 bloques), `TablaDatos`/`CabeceraTabla`, `Campo`, `hooks/useAtraparFoco`, `hooks/useAdvertenciaSalida`; avisos con dos regiones vivas (éxito amable, error asertivo) y pausa con cursor o foco. **Falta de esta etapa:** usar `TablaDatos` y `Campo` en las pantallas, migrar los `<button>` sueltos a `Boton`, registro de íconos, esqueletos y estados vacíos, `Paginador` y `FiltrosActivos`, y aplicar `useAdvertenciaSalida` en Cambio de laboratorio. **Pruebas:** 408 de 408 pasan | 2026-10-21 |
| Etapa 4 — Componentes base (**completa**) | **Resueltos en esta tanda:** `VIS-03`, `VIS-09`, `VIS-10`, `VIS-11`, `VIS-12`, `FDB-01`, `ACC-03`, `ACC-09`, `TXT-06`; **en progreso:** `FDB-08`, `PER-04`. Hecho: barras de desplazamiento con los colores del sistema (pulgar guinda sobre carril crema, en la página, los drawers y cualquier zona con scroll); `TablaDatos`/`CabeceraTabla` en Auditoría (2), Secciones, Espacios e Informe (región enfocable con teclado); `Campo` en los filtros y formularios del panel; `Boton` en lugar de los botones sueltos (Telegram, perfil, horario, alertas, carga, login, consulta, cerrar sesión; quedan nativos solo los interruptores y selectores segmentados, que son controles distintos); `BotonEnlace` en la acción sugerida de cada sección escalada, 404 y acceso denegado; registro único de íconos `components/ui/iconos.ts` (20 trazos que estaban copiados en 15 archivos); `EsqueletoCarga` con forma de tabla y un solo estilo de esqueleto; `EstadoVacio` con ícono propio y sin animación infinita; Cambio de laboratorio avisa antes de cerrar la pestaña o cambiar de laboratorio con cambios sin guardar; el enlace al bot de Telegram avisa que abre una pestaña nueva; cabeceras del Informe sin abreviaturas. **Contenedor responsive:** un `Contenedor` con utilidades estándar de Tailwind (`max-w-4xl/6xl/7xl`, `px-4 sm:px-6 lg:px-8`) que comparten cabecera, barra y contenido; se retiraron los tokens propios de ancho, sombra y radio. **Área del alumno:** todas las pantallas (Inicio, Horario, Perfil, Telegram, Ayuda y Configuración) usan ahora el mismo ancho (`max-w-6xl`), así la barra y el contenido ya no saltan al cambiar de pestaña. **Pruebas:** 408 de 408 pasan | 2026-10-21 |
| Fase 1 — Quick wins | — | — | — |
| Fase 2 — Transversal | — | — | — |
| Fase 3 — Por pantalla | — | — | — |

### 9.2 Checklist final de verificación

- [ ] Tokens aplicados y declarados una sola vez (`@theme`).
- [ ] Sin colores hex, sombras ni tamaños arbitrarios fuera de los tokens.
- [ ] Una sola regla tipográfica aplicada (serif/sans) y `max-w` solo vía tokens de ancho.
- [ ] Sin códigos crudos visibles (días, roles, estados, UUID, `detalle`).
- [ ] Todo mapa con valor por defecto y registro en consola.
- [ ] Sin plurales con «(s)»; textos en un archivo central.
- [ ] Estados de carga, vacío y error cubiertos en cada listado y formulario.
- [ ] Advertencia de cambios sin guardar en formularios y drawers.
- [ ] Interceptor global de errores y mensajes HTTP completos.
- [ ] Accesibilidad: contraste AA, título por ruta, saltar al contenido, tablas con scroll enfocable, axe en verde.
- [ ] Responsive revisado en 320, 768 y 1280 px (y zoom 200 %).
- [ ] Una sola cabecera/navegación por área; pestañas secundarias accesibles en móvil.
- [ ] `npx tsc --noEmit`, `npm run lint`, `npm run test` y `npm run build` sin errores.

### 9.3 Próximos pasos (punto de reanudación)

Rama: `feature/auditoria-ui-ux`. Estado: `tsc`, lint, prettier y las 408 pruebas pasan.

1. **Etapa 5 — marcos y responsive** (empezar por aquí; es lo que más se nota):
   - **Marco único del alumno** (`RES-01`, `DEN-08`): hoy el inicio (`LayoutEstudiante`, cabecera de 72 px con «Cerrar sesión») y las demás pantallas (`CabeceraPantalla`, banner de 160 px con «Volver al inicio») se ven como dos productos; el usuario lo notó al cambiar de pestaña. Unificar en un solo marco con logo, rol y «Cerrar sesión» siempre visibles, pestaña «Inicio», y navegación fija abajo en móvil.
   - Desborde del inicio del alumno en móvil (`RES-08`), desborde del panel admin a 768 px y pestaña «Más» (`RES-09`, `RES-02`), tablero que corta contenido en ventanas bajas (`RES-03`) y lista de revisión truncada en móvil (`RES-10`).
2. **Etapa 6 — panel:** paginación de a 50 con `Paginador` y `FiltrosActivos` (componentes aún por crear), periodo como lista, tablero más claro, acciones masivas, CTA en los estados vacíos (`FDB-08`).
3. **Etapa 7 — Auditoría e historial** según §4.9.
4. **Etapa 8 — portal público y alumno:** tarjeta de consulta sobre tokens (`VIS-01`, `VIS-02`), horario semanal (`DEN-18`), bordes de los campos del perfil (`ACC-04`).
5. **Etapa 9 — verificación final:** nueva pasada en navegador (la API simulada y los scripts de Playwright se pueden rehacer con `vite --port 5199` y `VITE_API_BASE_URL`), checklist de §9.2.

**Criterio fijado por el equipo:** usar las utilidades estándar de Tailwind y diseño responsive (no valores exactos propios); no tocar la lógica de negocio ni los contratos con la API.

