# Auditoría UX/UI del frontend — SAIE

> **Estado:** aplicada. Ver §0.4 para el estado de cada hallazgo.
> **Fecha:** 20 de octubre de 2026.
> **Rama auditada:** `feature/5.15-validacion-manual`.
> **Alcance:** `frontend/src/` (React 19 + TypeScript + Vite + Tailwind v4). Contraste de comportamiento con `backend/src/` y `docs/specs/`.
> **Objetivo:** recomendaciones concretas, priorizadas y accionables para mejorar jerarquía, feedback, densidad, consistencia y accesibilidad.

---

## 0. Alcance, supuestos y limitaciones

### 0.1 Supuestos

El brief original llegó con los campos de contexto sin rellenar; se dedujeron del repositorio:

| Campo | Supuesto |
|---|---|
| Tipo de sistema | Sistema académico de asignación de espacios (aulas y laboratorios). |
| Usuarios principales | Coordinación Académica, Jefatura de Laboratorios, docentes y alumnos. |
| Tecnologías | React 19, TypeScript, Vite, Tailwind CSS v4, React Router 7, Axios. |
| Material revisado | Código fuente, guía de estilos (`docs/07_guia_de_estilos_ui_ux.md`) y specs (`docs/specs/04-panel-alertas-y-admin.md`). |
| Problema percibido | No se indicó. Los hallazgos se derivan del análisis del código. |

### 0.2 Limitaciones de esta auditoría

- **No hubo render real ni capturas.** No se evalúa alineación pixel-perfect, contraste medido en pantalla ni comportamiento en dispositivos reales; lo visual se deduce de clases, tokens y valores definidos en el código.
- **No se levantó backend ni base de datos.** Los estados de carga, error y resultados masivos se evaluaron por lectura de código y de los contratos del backend.
- **Fuera de alcance profundo:** `frontend/src/components/mapa3d/` y el flujo de Telegram del alumno.
- **Decisiones de producto no inferibles:**
  - ¿Coordinación usa tablet o celular? Esto cambia la prioridad de la tabla de Espacios.
  - ¿Varias personas cargan archivos a la vez? Esto cambia el diseño de bloqueo y estado por flujo en Carga de datos.
- **Endpoints por confirmar:** no existe endpoint de historial de alertas resueltas ni de reapertura, ni endpoint de "última corrida de asignación". Las recomendaciones que dependen de ellos están marcadas.

### 0.3 Convención de referencias

Las rutas son relativas a la raíz del repositorio. Los números de línea corresponden a la rama y fecha indicadas y pueden desplazarse con cambios posteriores.

### 0.4 Estado de aplicación

La auditoría se aplicó en la rama `feature/4.15-edicion-espacios-y-pulido-ui-panel`:

| Hallazgos | Estado | Dónde |
|---|---|---|
| 1–7 · Carga de datos maestros | Resuelto | `pages/admin/CargaDatos.tsx` (Issue 1.9) |
| 8 · Rol crudo en la cabecera | Resuelto | `components/admin/LayoutAdmin.tsx` |
| 9 y 20 · Placeholders e issues en la UI | Resuelto | `components/PantallaEnDesarrollo.tsx`, `pages/docente/InicioDocentePage.tsx`, `pages/admin/ProximamenteAdminPage.tsx` |
| 10 · Resumen engañoso de la corrida | Resuelto | `pages/admin/InicioAdmin.tsx` (Issue 4.20) |
| 11 y 12 · Cambio de laboratorio | Resuelto | `pages/admin/CambioLaboratorio.tsx` (Issue 4.19) |
| 13 y 14 · Centro de alertas | Resuelto | `components/admin/TarjetaAlerta.tsx`, `pages/admin/AlertasAdmin.tsx` (Issues 4.9 y 4.10) |
| 15 · Espacios | Resuelto | `pages/admin/EspaciosAdmin.tsx`, `components/admin/FormularioEspacio.tsx` (Issue 4.15) |
| 16–18 · Sistema de diseño | Resuelto | `components/ui/`, `index.css` |
| 19 · Consulta pública | Resuelto | `pages/Consulta.tsx`, `components/consulta/` (Issues 3.5–3.7) |

**Fase 3 (parcial):** las pruebas de accesibilidad automáticas con `axe` ya existen
(`frontend/src/test/axe.ts` y `frontend/src/pages/admin/accesibilidad.test.tsx`): fallan solo con
violaciones `serious` o `critical`, que es lo que pide la spec 03. Lo que jsdom no puede resolver
(contraste de color y texto visible) queda como «incomplete» y se documenta en el propio test.

**Diferido a propósito:** la extracción de un `ModalConfirmacion`. La confirmación de resolver
alerta se resolvió en línea, dentro de la tarjeta, y la de la corrida de asignación, en el panel
de inicio. No hay una segunda acción irreversible que justifique un modal genérico, así que no se
crea el componente hasta que aparezca una.

**Pendiente de proceso:** el registro de estos ajustes en el Registro de Versiones lo hace el maintainer al cerrar el sprint.

---

## 1. Resumen general

El lado **público y del alumno está muy bien resuelto**: jerarquía clara, una acción principal, validación inline, estados de carga/error/vacío y accesibilidad real. El problema se concentra en el **panel administrativo**, que funciona como una consola de documentación: en `CargaDatos` la acción real (subir el CSV) aparece después de cinco bloques de guía y cuatro tablas de plantillas.

El **feedback de administración es débil**: éxito que permanece visible después de volver a editar (`CambioLaboratorio`), "Marcar como resuelta" irreversible con un clic (`TarjetaAlerta`), contadores que cambian con el filtro (`AlertasAdmin`) y ausencia de una región global de anuncios o toasts.

Hay una tercera capa: **deriva del sistema de diseño** (inputs de ~36 px con borde `#E6DFD0` de ~1.3:1, botones de ~36 px, dos verdes y dos rojos distintos, badges reimplementados) y **placeholders publicados como producto** (portal docente y "Próximamente" con números de issue visibles).

**Conclusión:** no hace falta reescribir. Ya existen `EstadoVacio`, `EsqueletoCarga`, `BadgeEstadoAsignacion`, `SelectorSegmentado` y un acordeón accesible en `AyudaAlumno`. El trabajo es **reordenar, extraer y reutilizar**.

---

## 2. Tabla de problemas

| # | Pantalla / componente | Problema (evidencia) | Anti-patrón | Impacto | Recomendación concreta |
|---|---|---|---|---|---|
| 1 | `frontend/src/pages/admin/CargaDatos.tsx:396-414` | El único objetivo real (subir CSV) aparece tras 5 bloques de guía + 4 plantillas con tablas. | Acción principal debajo de documentación; mezcla doc + config + acción | **Alto** | Invertir el orden: zonas de carga primero. Guía y plantillas a un drawer "Guía y plantillas" desde el encabezado. |
| 2 | `CargaDatos.tsx:181-329` | Guía de 5 bloques, el primero **abierto por defecto**, con párrafos y `PERIODO_VIGENTE` (variable del backend) explicada al usuario académico. | Muro de texto; acordeón abierto; jerga técnica | **Alto** | Un solo acordeón "¿Cómo funciona la carga?" cerrado. `Periodo vigente` y `Asignación` como tooltips. El detalle de backend sale de la UI. |
| 3 | `CargaDatos.tsx:334-372` | Cada plantilla muestra su tabla de columnas siempre; en móvil hay scroll horizontal **dentro de la card**. | Tabla de referencia siempre visible; scroll horizontal en card | **Alto** | Dejar "Descargar plantilla" + "Ver columnas" (drawer). En móvil, definiciones apiladas, sin tabla. |
| 4 | `CargaDatos.tsx:408` | 4 flujos en `lg:grid-cols-3`: la 4.ª card queda huérfana y las alturas se desalinean al aparecer resultados. | Grid roto; cards de alturas distintas | Medio | `lg:grid-cols-2` o stepper vertical; acciones ancladas abajo (`mt-auto`). |
| 5 | `CargaDatos.tsx:80-110` | Dropzone = `label` con `<input class="sr-only">`: sin foco visible; no valida `.csv`/10 MB antes de enviar; el archivo se puede cambiar mientras importa. | Accesibilidad; prevención de errores; estado inconsistente | **Alto** | `:focus-within` en el label (o input visible); validar al elegir; bloquear el dropzone durante el envío y mostrar el archivo enviado. |
| 6 | `CargaDatos.tsx:118-150` | Resultado masivo con claves crudas (`cursosProcesados`), errores en `<ul>` con scroll y **sin descarga**; si hay rechazos, la asignación no corre y la UI no lo dice. | Resultado masivo incompleto; dependencia no comunicada | **Alto** | Etiquetas humanas + "Descargar errores (CSV)" + mensaje "la asignación no se ejecutó por los rechazos" + CTA "Corregir y reintentar". |
| 7 | `CargaDatos.tsx:45-153` | Sin estado por flujo (sin cargar / importando / con errores / cargado), sin fecha de última carga, sin "siguiente paso". | Estado por elemento ausente | Medio | `EstadoFlujo` con badge icono+texto, "Última carga: 12 oct, 10:32" y "Continuar con Horarios →". |
| 8 | `frontend/src/components/admin/LayoutAdmin.tsx:61` | La cabecera imprime el rol crudo: **`COORDINACION_ACADEMICA`**. | Jerga técnica en UI | **Alto (5 min)** | `etiquetaRol(sesion?.rol)` (ya existe en `frontend/src/utils/admin.ts:46-50`). |
| 9 | `frontend/src/pages/admin/InicioAdmin.tsx:190-194` | Card "Próximamente" que lleva a otra pantalla de "En desarrollo" con **números de issue**. Jefatura tiene acceso directo a "Incidencias", también placeholder. | Jerga; laberinto de placeholders | **Alto** | Sacar lo no construido del inicio operativo. Una sola página "Hoja de ruta", sin issues y sin enlaces circulares. |
| 10 | `InicioAdmin.tsx:106-130,147-158` | "X asignadas" suma nuevas + mantenidas; tras reintentar **una sección**, el hero muestra ese resultado como corrida del periodo; la corrida no refresca alertas. | Feedback engañoso; estado desactualizado | **Alto** | Separar `resumenCorrida` de `resultadoSeccion`; desglosar "N nuevas · M mantenidas"; refrescar alertas y escaladas; mostrar hora de última corrida. |
| 11 | `frontend/src/pages/admin/CambioLaboratorio.tsx:53` | Lab con `pcsMalogradas = null` → se rellena **"0"**: guardar convierte "sin registrar" en cero. | Prevención de errores; dato falso | **Alto** | Estado `number \| null`, placeholder "Sin registrar", guardar deshabilitado hasta que el valor sea explícito. |
| 12 | `CambioLaboratorio.tsx:58-63,72,91,132-206` | El éxito persiste al volver a editar; dos formularios con dos botones primarios; catálogo con scroll interno sin búsqueda; controles deshabilitados sin motivo. | Feedback obsoleto; jerarquía; scroll en card; botón deshabilitado sin explicación | **Alto** | Tabs "Software / PCs", un solo "Guardar cambios" con estado sucio/guardando/guardado, buscador de catálogo y callout "Elige un laboratorio para editar". |
| 13 | `frontend/src/pages/admin/AlertasAdmin.tsx:31-42` + `frontend/src/components/admin/TarjetaAlerta.tsx:117-126` | "Marcar como resuelta" es **irreversible** (spec 04 §2.1: 409 si ya estaba resuelta, sin endpoint de reapertura) y se dispara con un clic; el estado "Resuelta" es local y desaparece al recargar. | Acción destructiva sin confirmación; feedback efímero | **Alto** | Confirmación inline en la card + toast de éxito. Quitar el estado RESUELTA falso o pedir endpoint de historial. |
| 14 | `AlertasAdmin.tsx:29,85-96` | El contador "pendientes" se calcula **sobre la lista filtrada**; el vacío dice "Sin alertas" también cuando el filtro no tiene resultados; se listan todos los cursos afectados. | Información engañosa; estado vacío inútil; densidad | Medio | "3 pendientes de 12"; vacío diferenciado con "Ver todas"; mostrar 2 cursos + "+N más". |
| 15 | `frontend/src/pages/admin/EspaciosAdmin.tsx:22-24,51-92` | "Gestión de espacios" no gestiona: la spec 04 §2.3 define alta/edición con `camposEditables` + `PATCH`, pero la vista solo lista; sin contador, orden ni paginación; `pcsMalogradas ?? '—'` mezcla "no aplica" con "sin registrar". | Etiqueta engañosa; listado sin control; ambigüedad | **Alto** | Renombrar a "Espacios" mientras no haya edición, o implementar drawer de detalle + edición por rol. Contador "24 de 38", filtros de pabellón/piso (el backend ya los soporta), textos "No aplica"/"Sin registrar"/"0". |
| 16 | `EspaciosAdmin.tsx:33,39`, `CambioLaboratorio.tsx:116,190`, `CargaDatos.tsx:107` | Inputs/selects con borde `#E6DFD0` (≈1.3:1; la guía exige `#8A8578` a 3:1) y alto ≈36 px; botones de admin ≈36 px con `text-sm`. | Contraste de componentes; área táctil < 44 px | **Alto** | Tokens de campo del sistema (borde `#8A8578`, `min-h-12`, `text-base`) y botones 44–48 px. |
| 17 | Global | Badges, avisos y botones reimplementados; existen `SelectorSegmentado`, `EstadoVacio`, `BadgeEstadoAsignacion` y el acordeón accesible de `frontend/src/pages/AyudaAlumno.tsx:125-141` sin reutilizar. Más de 100 hex sueltos con **dos verdes** (`#E8F3E9` vs `#E8F5E9`) y **dos rojos** (`#FBE9E9` vs `#FDECEA`). | Duplicación; deriva del sistema de diseño | Medio | Extraer `Boton`, `BadgeEstado`, `Aviso`, `Acordeon`, `ModalConfirmacion`, `Drawer`; unificar tints en tokens. |
| 18 | `LayoutAdmin.tsx:41-46` | En móvil la pestaña activa **solo cambia de color** (la píldora guinda es `md:`). | Color como único canal | Medio | Píldora guinda al 8% + `font-bold` + icono distinto; conservar `aria-current` (NavLink ya lo pone). |
| 19 | `frontend/src/pages/Consulta.tsx:232-236` | El botón "Buscar" está deshabilitado si el código no es válido, así que la validación de envío vacío (`intentoEnvio`) **nunca se ejecuta** (código muerto). Al llegar resultados no se mueve el foco. | Botón deshabilitado sin motivo; feedback para lector de pantalla | Medio | Mantener "Buscar" habilitado y validar al enviar (o explicar bajo el botón); `focus()` al `<h2>` de resultados con `tabIndex={-1}`. |
| 20 | `frontend/src/pages/docente/InicioDocentePage.tsx:56-88`, `frontend/src/components/PantallaEnDesarrollo.tsx:6-9,97-101` | El portal docente es un índice de placeholders con números de issue; el copy es "Se va a tener listo para otra presentación". | Jerga; producto vacío | **Alto** | No publicar un portal sin al menos un flujo real. Mensaje único, sin issues, con salida clara. |

### 2.1 Lo que está bien hecho y hay que conservar

- **Consulta pública** (`frontend/src/pages/Consulta.tsx` + `frontend/src/components/consulta/FormularioBusqueda.tsx`): la mejor pantalla del sistema. H1 claro, una sola acción, validación tras blur, botón con spinner, distinción real entre 404 ("no existe") y error de red, detección en vivo del tipo de código, estado vacío específico y `mostrarErrorServidor={false}` para no duplicar el mensaje.
- **Inicio del alumno** (`frontend/src/pages/InicioEstudiante.tsx`): hero "clase en curso" con barra de progreso, resumen semanal, esqueletos y `saie-respira`; todo el movimiento se apaga con `prefers-reduced-motion` (`frontend/src/index.css:57-65`).
- **Login** (`frontend/src/components/auth/LoginFormBase.tsx`): campos de 48 px, `aria-required`, texto `(obligatorio)` para lectores, mostrar/ocultar clave con `aria-label`, error con `role="alert"`. Es el patrón que debería seguir el panel.
- **Acordeón de ayuda** (`frontend/src/pages/AyudaAlumno.tsx:125-141`): `<details>` nativo, chevron, `focus-visible:outline-3` y `[&::-webkit-details-marker]:hidden`. Es el componente a extraer, no a reinventar.
- **`useCarga`** (`frontend/src/hooks/useCarga.ts`): resuelve carreras (ignora respuestas viejas y no muestra error mientras recarga). Base sólida para el estado por elemento que falta.
- **Cultura de pruebas:** hay `*.test.tsx` para casi todas las pantallas; cualquier refactor puede cubrirse con la infraestructura existente.

---

## 3. Propuesta por pantalla

### 3.1 Carga de datos maestros — prioridad 1

**Se queda visible:** título, periodo vigente, las 4 zonas de carga con su dropzone y botón, y el resultado de cada importación.

**Pasa a otro soporte:**

| Información | Destino |
|---|---|
| Guía completa de carga | Drawer lateral "Guía y plantillas" |
| Orden de carga | Numeración + CTA "Continuar con…" |
| Periodo académico y periodo vigente | Tooltip en "Periodo vigente" |
| Formatos admitidos | Popover "Ver formato" dentro del dropzone |
| Tabla de "Errores frecuentes" | Ayuda contextual dentro del resultado |
| Columnas de cada plantilla | Drawer por plantilla ("Ver columnas") |

| Componente | Tipo | Props principales | Responsabilidad |
|---|---|---|---|
| `PanelCargaDatos` | Contenedor | — | Orquesta periodo, estado de los 4 flujos y el drawer de guía. |
| `ZonaCarga` | Contenedor | `tipo, titulo, descripcion, plantilla, estado, onImportar` | Máquina de estados de un flujo: sin archivo → elegido → importando → resultado/error. |
| `Dropzone` | Presentacional | `archivo, onSeleccionar, onQuitar, deshabilitado, error` | Área de archivo accesible, con foco visible y validación de tipo/tamaño. |
| `EstadoFlujo` | Presentacional | `estado, fechaUltimaCarga` | Badge icono+texto: "Sin cargar / Importando / Con errores / Cargado". |
| `ResultadoImportacion` | Presentacional | `resultado, onDescargarErrores, onSiguiente` | Resumen con etiquetas humanas, errores descargables y aviso de asignación. |
| `PanelGuiaCarga` | Contenedor (drawer) | `abierto, onCerrar` | Guía + plantillas + tabla de columnas bajo demanda. |
| `ResumenPeriodo` | Contenedor | `periodo, secciones, horarios, matriculas` | Barra "Periodo vigente 2026-2 · Secciones 120 · Horarios 340". |

```text
ANTES — primer viewport
┌──────────────────────────────────────────────────────────────┐
│ Carga de datos maestros                                      │
│ Cómo cargar los datos de un semestre                         │
│ ┌ 1. Orden de carga  ▲ ABIERTO ────────────────────────────┐ │
│ │ párrafo + lista de 4 pasos + párrafo de 6 líneas         │ │
│ └──────────────────────────────────────────────────────────┘ │
│ ┌ 2. El periodo académico y el periodo vigente  ▼ ─────────┐ │
│ ┌ 3. Qué hace el sistema después de cada carga  ▼ ─────────┐ │
│ ┌ 4. Formatos admitidos  ▼ ─────────────────────────────────┐ │
│ ┌ 5. Errores frecuentes  ▼ ─────────────────────────────────┐ │
│ Plantillas de carga                                          │
│ [tabla 4 cols] [tabla 4 cols] [tabla 4 cols] [tabla 4 cols]  │
│ Cargar un archivo           ← la acción real empieza aquí     │
│ [1 Cursos] [2 Horarios] [3 Matrículas]                       │
│ [4 Docentes]                    ← hueco de 2 columnas         │
└──────────────────────────────────────────────────────────────┘

DESPUÉS — primer viewport
┌──────────────────────────────────────────────────────────────┐
│ Carga de datos        Periodo 2026-2 · 120 secciones         │
│ Sube un archivo por vez. Reemplaza sin duplicar.  [Guía ⓘ]   │
│                                                              │
│ ┌ 1 · Cursos y secciones            ⚠ Sin cargar ──────────┐ │
│ │ Arrastra tu CSV o [Elegir archivo]   (máx. 10 MB)        │ │
│ │ ¿Sin plantilla? [Descargar CSV] [Ver columnas]           │ │
│ │ [ Importar archivo ]   ← único primario de la card       │ │
│ └──────────────────────────────────────────────────────────┘ │
│ ┌ 2 · Horarios                      ✓ Cargado 12 oct ──────┐ │
│ │ [ Reemplazar archivo ]   [ Ver resultado de la carga ]   │ │
│ └──────────────────────────────────────────────────────────┘ │
│ [ 3 · Matrículas ]  [ 4 · Docentes ]                         │
└──────────────────────────────────────────────────────────────┘
```

### 3.2 Inicio del panel administrativo

**Se queda visible:** estado de la corrida con desglose real, botón de ejecutar con alcance, accesos a lo que sí funciona y "Requieren tu atención" (máximo 3).

**Pasa a:** lista completa de escaladas → acordeón; "Próximamente" → enlace discreto al pie, sin issues.

| Componente | Tipo | Props | Responsabilidad |
|---|---|---|---|
| `PanelCorrida` | Contenedor | `periodo, ultimaCorrida, resumen, ejecutando, onEjecutar` | Muestra el estado real y pide confirmación con alcance. |
| `Metrica` | Presentacional | `valor, etiqueta, tono, onClic` | Ya existe en `InicioAdmin.tsx:40-49`; añadirle `onClic`. |
| `TarjetaAccion` | Presentacional | `to, titulo, descripcion, contador` | Reemplaza al `Acceso` actual, sin contadores duplicados. |
| `ListaEscaladas` | Contenedor | `secciones, onReintentar, reintentando` | Muestra 3 y expande; separa el resultado por sección del resumen del periodo. |

```text
ANTES
┌──────────────────────────────────────────────────────────────┐
│ Corrida de asignación · Periodo 2026-2                       │
│ 42 asignadas · 3 escaladas de 45     [Ejecutar asignación]   │
│  ↑ "42" incluye mantenidas                                   │
│ [Carga] [Espacios] [Alertas 3] [Próximamente →]              │
│   Secciones escaladas a revisión manual                      │
│   [sección 1 Reintentar] [sección 2 Reintentar] …            │
└──────────────────────────────────────────────────────────────┘

DESPUÉS
┌──────────────────────────────────────────────────────────────┐
│ Periodo 2026-2 · última corrida hoy 10:32   [Ejecutar ▶]     │
│ 39 nuevas · 3 mantenidas · 3 escaladas de 45                 │
│ [Ejecutar] → confirmación: "Recalcula 45 secciones del       │
│ periodo 2026-2. No duplica aulas. ¿Continuar?"               │
│ ── Requieren tu atención ──────────────────────────────────── │
│ ⚠ 3 alertas pendientes        [Ver alertas]                  │
│ ⚠ 3 secciones escaladas  ▼    [Ver las 3]                    │
│ ── Accesos ───────────────────────────────────────────────── │
│ [Carga de datos] [Espacios] [Alertas]                        │
│ Hoja de ruta (lo que viene) ─────────────── enlace al pie →  │
└──────────────────────────────────────────────────────────────┘
```

### 3.3 Cambio de laboratorio

**Se queda visible:** selector de laboratorio, resumen del lab (aforo, PCs, software), las dos tareas y el botón de guardado.

**Pasa a:** catálogo completo → tab con buscador; detalle histórico → fuera de alcance por ahora.

| Componente | Tipo | Props | Responsabilidad |
|---|---|---|---|
| `FormularioLaboratorio` | Contenedor | `laboratorioId` | Estado sucio/guardando/guardado y envío único. |
| `SelectorLaboratorio` | Presentacional | `laboratorios, valor, onCambiar, cargando` | Selección con búsqueda si hay muchos labs. |
| `PestanasDatos` | Presentacional | `valor, opciones, onCambiar` | Reutiliza `SelectorSegmentado` existente. |
| `ListaSoftware` | Contenedor | `items, seleccionados, onAlternar` | Buscador + "N seleccionados" + "Quitar todos". |
| `CampoNumero` | Presentacional | `valor: number \| null, onCambio, ayuda` | Distingue `null` ("Sin registrar") de `0`. |
| `BarraGuardado` | Presentacional | `estado: 'limpio'\|'sucio'\|'guardando'\|'guardado'` | Hace visible si hay cambios sin guardar. |

```text
ANTES
┌──────────────────────────────────────────────────────────────┐
│ Laboratorio [LAB-3 ▾]   Aforo 30 · 4 PCs malogradas          │
│ ┌ Software instalado ────────┐ ┌ PCs malogradas ───────────┐ │
│ │ ☑ Python 3.12              │ │ Número total…             │ │
│ │ ☐ VS Code   (scroll ↓)     │ │ [ 0 ]  ← null se volvió 0 │ │
│ │ [Guardar software] PRIMARIO│ │ [Guardar PCs]  PRIMARIO   │ │
│ └────────────────────────────┘ └───────────────────────────┘ │
│ ✓ "Software del laboratorio actualizado."  ← persiste al editar│
└──────────────────────────────────────────────────────────────┘

DESPUÉS
┌──────────────────────────────────────────────────────────────┐
│ Laboratorio [LAB-3 ▾]   Aforo 30 · 4 PCs · 12 programas      │
│ [ Software (12) | PCs (4) ]                                  │
│ ┌ Software ─────────────────────────────────────────────────┐│
│ │ [Buscar en el catálogo…]      12 seleccionados            ││
│ │ ☑ Python 3.12   ☑ VS Code   ☐ AutoCAD …                   ││
│ └───────────────────────────────────────────────────────────┘│
│ ● Tienes cambios sin guardar        [ Guardar cambios ]      │
│   PCs: [ 4 ]  o  "Sin registrar"  (nunca se asume 0)         │
└──────────────────────────────────────────────────────────────┘
```

### 3.4 Centro de alertas

**Se queda visible:** contador global, filtros por tipo y estado, tarjeta con motivo, 2 cursos afectados y la acción.

**Pasa a:** resto de cursos → "+N más"; detalle e historial → drawer o pestaña (requiere endpoint; hoy `GET /admin/alertas` solo devuelve activas).

```text
ANTES
┌──────────────────────────────────────────────────────────────┐
│ [Todas|Software|Capacidad]          3 pendiente(s) ← filtrado│
│ ┌ LAB-3 · Capacidad · Pendiente ────────────────────────────┐│
│ │ 30 alumnos para aforo 25                                  ││
│ │ CURSOS AFECTADOS (9)                                      ││
│ │ [CC-101·1] [CC-102·2] [CC-103·1] [CC-104·3] … (9 chips)   ││
│ │ Detectada el 12 oct   [Marcar como resuelta] ← 1 clic     ││
│ └───────────────────────────────────────────────────────────┘│
└──────────────────────────────────────────────────────────────┘

DESPUÉS
┌──────────────────────────────────────────────────────────────┐
│ Alertas   3 pendientes de 12    [Todas|Software|Capacidad]   │
│            [ Pendientes | Resueltas* ]   *requiere endpoint  │
│ ┌ LAB-3 · Capacidad · Pendiente ────────────────────────────┐│
│ │ 30 alumnos para aforo 25                                  ││
│ │ Cursos: CC-101·1, CC-102·2   [+7 más ▾]                   ││
│ │ Detectada el 12 oct                                       ││
│ │ ¿Marcar como resuelta?  [Cancelar] [Sí, resolver]         ││
│ └───────────────────────────────────────────────────────────┘│
│ Toast: "Alerta de LAB-3 marcada como resuelta."              │
└──────────────────────────────────────────────────────────────┘
```

### 3.5 Espacios

**Se queda visible:** contador, filtros, tabla con columnas esenciales (Espacio, Tipo, Ubicación, Aforo, Estado).

**Pasa a drawer de detalle:** software instalado, PCs, `descripcionUso`, `contiguos`, `camposEditables` y el formulario de edición por rol (el backend ya expone `GET /admin/espacios/:id` y `PATCH`).

```text
ANTES
┌──────────────────────────────────────────────────────────────┐
│ Gestión de espacios                                          │
│ [Buscar por identificador…] [Todos ▾]                        │
│ ┌──────┬────────┬─────────┬──────┬───────┬───────────────┐   │
│ │Espac.│Tipo    │Ubicación│Aforo │PCs    │Estado         │   │
│ │LAB-3 │Lab     │A · Piso3│30    │4      │[Fuera servicio]│  │
│ │A-201 │Aula    │A · Piso2│40    │—      │[Habilitado]   │   │
│ └──────┴────────┴─────────┴──────┴───────┴───────────────┘   │
│ (38 filas, sin contador, sin orden, sin paginación)          │
└──────────────────────────────────────────────────────────────┘

DESPUÉS
┌──────────────────────────────────────────────────────────────┐
│ Espacios   24 de 38 coinciden        [+ Nuevo espacio]       │
│ [Buscar…] [Tipo ▾] [Pabellón ▾] [Piso ▾] [Estado ▾]          │
│ ┌──────┬────────┬─────────┬──────┬───────────────┬────────┐  │
│ │Espac.│Tipo    │Ubicación│Aforo │PCs            │Estado  │  │
│ │LAB-3 │Lab     │A · Piso3│30    │4 malogradas   │⚠ Fuera │  │
│ │      │        │         │      │               │  → clic │  │
│ └──────┴────────┴─────────┴──────┴───────────────┴────────┘  │
│ ── Drawer LAB-3 ──────────────────────────────────────────── │
│ Aforo 30 · Capacidad real 26                                 │
│ Software: Python 3.12, VS Code                               │
│ Uso: "Sala de investigación"                                 │
│ Contiguos: LAB-2, LAB-4                                      │
│ [Editar]  (solo campos que el rol puede cambiar)             │
└──────────────────────────────────────────────────────────────┘
```

### 3.6 Consulta pública (mantener, dos ajustes)

- **Se queda todo** lo que ya está: hero, un solo campo, validación tras blur, badge de detección, tarjetas de resultado, "Qué verás".
- **Cambio 1:** habilitar "Buscar" siempre y validar al enviar (el branch `intentoEnvio` ya existe y hoy es inalcanzable). Si se prefiere deshabilitarlo, poner debajo "Ingresa 8 dígitos o un código como CC-101" como motivo visible.
- **Cambio 2:** al pasar a `fase === 'resultado'`, mover el foco al `<h2>` de resultados (`tabIndex={-1}`) y anunciar el conteo (ya tiene `role="status"`). Hoy el usuario de teclado se queda en el formulario sin saber que llegó el resultado.

### 3.7 Portal docente y "Próximamente"

No son auditables como UX porque no ofrecen ninguna tarea. Recomendación: una sola pantalla honesta ("Esta sección estará disponible en la próxima entrega"), **sin números de issue, sin enlaces a pantallas vacías y sin repetir el mensaje en cada card**. Si el portal no puede ofrecer al menos un flujo real, es mejor no publicarlo y dejar el login fuera del Home temporalmente.

---

## 4. Quick wins (alto impacto, poco esfuerzo)

| Acción | Archivo | Esfuerzo | Impacto |
|---|---|---|---|
| Reemplazar `{sesion?.rol}` por `etiquetaRol(...)` | `LayoutAdmin.tsx:61` | 5 min | Quita jerga de la cabecera de todo el panel. |
| Subir las zonas de carga por encima de guía y plantillas | `CargaDatos.tsx:396-414` | 30 min | La acción principal entra en el primer viewport. |
| `lg:grid-cols-2` en las zonas de carga | `CargaDatos.tsx:408` | 5 min | Elimina la card huérfana y el hueco de 2 columnas. |
| Quitar la card "Próximamente" del inicio y los `Issue #…` de la UI | `InicioAdmin.tsx:190-194`, `ProximamenteAdminPage.tsx:93`, `InicioDocentePage.tsx:85-88` | 30 min | Deja de parecer un repositorio, no un producto. |
| Validar `.csv` y ≤10 MB al elegir + `:focus-within` en el dropzone | `CargaDatos.tsx:80-101` | 30 min | Evita el error a los 2 minutos y arregla el foco de teclado. |
| Limpiar el mensaje de éxito al editar y no asumir PCs = 0 | `CambioLaboratorio.tsx:53,58-63,189` | 30 min | Elimina dos mentiras de estado. |
| "3 pendientes de 12" y vacío con "Ver todas" | `AlertasAdmin.tsx:29,85-96` | 30 min | Deja de confundir filtro con total. |
| Renombrar "Gestión de espacios" → "Espacios" (o implementar edición) | `EspaciosAdmin.tsx:22-24` | 5 min | Alinea promesa con capacidad. |
| Confirmación inline antes de resolver una alerta | `TarjetaAlerta.tsx:117-126` | 1 h | Evita el clic irreversible. |
| Campos de admin con borde `#8A8578` y `min-h-12` | `EspaciosAdmin`, `CambioLaboratorio` | 1 h | Cumple contraste 3:1 y área táctil 44 px. |
| Contador y "Limpiar filtros" en listados | `EspaciosAdmin`, `AlertasAdmin` | 1 h | Orientación básica en listas. |
| `focus()` al resultado de la consulta | `Consulta.tsx:271` | 30 min | Feedback real para teclado/lector. |

---

## 5. Plan de mejora priorizado

### Fase 0 — Confianza (1 día)

Aplicar los quick wins 1, 3, 4, 6, 7, 8, 9 y 11.

**Criterio de aceptación:** en la cabecera del panel no aparece ningún rol en mayúsculas; ninguna pantalla muestra "Issue #"; no queda ningún mensaje de éxito que sobreviva a una edición posterior; guardar PCs sin dato no es posible.

### Fase 1 — Carga de datos (2–3 días)

Reordenar la pantalla y extraer `ZonaCarga`, `Dropzone`, `EstadoFlujo`, `ResultadoImportacion` y `PanelGuiaCarga`; añadir descarga de errores en CSV, aviso explícito de asignación no ejecutada y "Continuar con Horarios →".

**Criterio de aceptación:** un usuario puede importar los 4 archivos sin abrir la guía; ante 10 filas rechazadas sabe exactamente qué corregir y descarga el detalle.

### Fase 2 — Operación diaria (3–4 días)

- `CambioLaboratorio`: tabs y estado de guardado.
- `AlertasAdmin`: confirmación, contador global y cursos plegados.
- `EspaciosAdmin`: contador, filtros de pabellón/piso y drawer de detalle.
- `InicioAdmin`: desglose nuevas/mantenidas, hora de corrida y refresco de alertas.

**Criterio de aceptación:** ninguna acción del panel queda sin respuesta visible; ninguna acción irreversible se ejecuta sin confirmación.

### Fase 3 — Sistema (1 semana)

Extraer `Boton`, `Aviso` + `ProveedorAvisos`, `Acordeon`, `ModalConfirmacion`, `BadgeEstado` y `Drawer`; unificar tokens (borde de input, tints de éxito/peligro); pestaña activa móvil con píldora; auditar teclado y contraste; añadir pruebas de accesibilidad (`vitest-axe`) a las pantallas del panel.

**Criterio de aceptación:** no quedan hex sueltos duplicados y los componentes de admin se importan del sistema, no se copian.

---

## 6. Ejemplos

### 6.1 Botón con variantes, carga y motivo de deshabilitación

```tsx
// frontend/src/components/ui/Boton.tsx
import React, { useId } from 'react';

type Variante = 'primario' | 'secundario' | 'peligro' | 'cancelar';
type Tamano = 'md' | 'sm';

const VARIANTES: Record<Variante, string> = {
  primario: 'bg-saie-primary text-white hover:bg-saie-primary-dark',
  secundario: 'border border-saie-primary text-saie-primary hover:bg-saie-primary/5',
  peligro: 'bg-saie-danger text-white hover:bg-[#B71C1C]',
  cancelar: 'border border-[#8A8578] text-saie-text hover:bg-saie-text/5',
};

// Guía §4.6: 48 px; mínimo absoluto 44 px.
const TAMANOS: Record<Tamano, string> = {
  md: 'min-h-12 px-6 text-base',
  sm: 'min-h-11 px-4 text-sm',
};

export interface BotonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variante?: Variante;
  tamano?: Tamano;
  cargando?: boolean;
  textoCargando?: string;
  /** Motivo visible y accesible de por qué el botón no se puede usar. */
  motivoDeshabilitado?: string;
}

export const Boton: React.FC<BotonProps> = ({
  variante = 'primario',
  tamano = 'md',
  cargando = false,
  textoCargando,
  motivoDeshabilitado,
  disabled,
  children,
  className = '',
  ...props
}) => {
  const generado = useId();
  const id = props.id ?? generado;
  const idMotivo = `${id}-motivo`;
  const inactivo = disabled || cargando;

  return (
    <span className="inline-flex flex-col items-start gap-1">
      <button
        {...props}
        id={id}
        disabled={inactivo}
        aria-busy={cargando || undefined}
        aria-describedby={motivoDeshabilitado && disabled ? idMotivo : undefined}
        className={`inline-flex w-full items-center justify-center gap-2 rounded-xl font-medium
          transition-colors focus-visible:outline-3 focus-visible:outline-offset-2
          focus-visible:outline-saie-text disabled:cursor-not-allowed disabled:opacity-50
          sm:w-auto ${VARIANTES[variante]} ${TAMANOS[tamano]} ${className}`}
      >
        {cargando && (
          <svg className="h-5 w-5 animate-spin motion-reduce:animate-none" viewBox="0 0 24 24" aria-hidden="true" fill="none">
            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-25" />
            <path d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" fill="currentColor" className="opacity-75" />
          </svg>
        )}
        <span>{cargando ? (textoCargando ?? children) : children}</span>
      </button>
      {motivoDeshabilitado && disabled && (
        <span id={idMotivo} className="text-xs text-saie-muted">{motivoDeshabilitado}</span>
      )}
    </span>
  );
};
```

### 6.2 Acordeón accesible (extraído de `AyudaAlumno`)

```tsx
// frontend/src/components/ui/Acordeon.tsx
import React, { useState } from 'react';

export const Acordeon: React.FC<{
  titulo: string;
  abiertoInicial?: boolean;
  className?: string;
  children: React.ReactNode;
}> = ({ titulo, abiertoInicial = false, className = '', children }) => {
  const [abierto, setAbierto] = useState(abiertoInicial);

  return (
    <details
      open={abierto}
      onToggle={(e) => setAbierto((e.currentTarget as HTMLDetailsElement).open)}
      className={`group rounded-xl border border-saie-divider bg-white ${className}`}
    >
      <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 rounded-xl px-5 py-3 font-semibold text-saie-text hover:bg-saie-canvas focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-saie-text [&::-webkit-details-marker]:hidden">
        <span>{titulo}</span>
        <span aria-hidden="true" className="shrink-0 text-saie-primary transition-transform group-open:rotate-180">▾</span>
      </summary>
      <div className="border-t border-saie-divider px-5 py-4 text-sm leading-6">{children}</div>
    </details>
  );
};
```

### 6.3 Avisos globales (región viva siempre montada)

```tsx
// frontend/src/components/ui/Avisos.tsx
import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';

type Tono = 'exito' | 'error' | 'info';
interface Aviso { id: number; tono: Tono; texto: string; }
interface ValorContexto { mostrar: (tono: Tono, texto: string) => void; }

const TONOS: Record<Tono, string> = {
  exito: 'border-saie-success/40 bg-[#E8F5E9] text-[#1B5E20]',
  error: 'border-saie-danger/40 bg-[#FDECEA] text-[#B71C1C]',
  info: 'border-saie-divider bg-white text-saie-text',
};

const Contexto = createContext<ValorContexto | null>(null);

export const ProveedorAvisos: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [avisos, setAvisos] = useState<Aviso[]>([]);

  const mostrar = useCallback((tono: Tono, texto: string) => {
    const id = Date.now() + Math.random();
    setAvisos((previos) => [...previos, { id, tono, texto }]);
    window.setTimeout(() => setAvisos((p) => p.filter((a) => a.id !== id)), tono === 'error' ? 8000 : 5000);
  }, []);

  const valor = useMemo(() => ({ mostrar }), [mostrar]);

  return (
    <Contexto.Provider value={valor}>
      {children}
      {/* La región vive siempre en el DOM: si se monta con el mensaje, el lector no lo anuncia. */}
      <div
        aria-live="polite"
        aria-atomic="false"
        className="pointer-events-none fixed inset-x-4 bottom-24 z-50 flex flex-col items-end gap-2 md:bottom-6 md:left-auto md:right-6 md:w-96"
      >
        {avisos.map((a) => (
          <div key={a.id} className={`pointer-events-auto w-full rounded-xl border px-4 py-3 text-sm shadow-[var(--saie-shadow-3)] ${TONOS[a.tono]}`}>
            {a.texto}
          </div>
        ))}
      </div>
    </Contexto.Provider>
  );
};

export function useAvisos(): ValorContexto {
  const contexto = useContext(Contexto);
  if (!contexto) throw new Error('useAvisos debe usarse dentro de <ProveedorAvisos>');
  return contexto;
}
```

> Para errores que deban interrumpir (falló el guardado y el usuario debe corregir algo), usar **aviso inline junto al control** con `role="alert"`; dejar el toast para confirmaciones y errores transitorios. No poner `role="status"` en cada toast dentro de una región `aria-live`: se anuncia dos veces.

### 6.4 Resultado de importación con etiquetas humanas y errores descargables

```tsx
// frontend/src/components/admin/ResultadoImportacion.tsx
import React from 'react';
import { Boton } from '../ui/Boton';
import type { ResultadoImportacionDTO, TipoImportacion } from '../../types/admin';

const ETIQUETAS: Record<string, string> = {
  cursosProcesados: 'Cursos',
  seccionesProcesadas: 'Secciones',
  horariosProcesados: 'Bloques de horario',
  matriculasProcesadas: 'Matrículas',
  alumnosProcesados: 'Alumnos',
  docentesProcesados: 'Docentes',
  cuentasCreadas: 'Cuentas de acceso',
};

export function descargarErrores(tipo: TipoImportacion, errores: string[]): void {
  const filas = [
    'fila,mensaje',
    ...errores.map((e) => {
      const fila = /^Fila (\d+)/.exec(e)?.[1] ?? '';
      return `"${fila}","${e.replace(/"/g, '""')}"`;
    }),
  ];
  const url = URL.createObjectURL(new Blob(['\uFEFF' + filas.join('\n')], { type: 'text/csv;charset=utf-8' }));
  const enlace = document.createElement('a');
  enlace.href = url;
  enlace.download = `errores-${tipo}.csv`;
  enlace.click();
  URL.revokeObjectURL(url);
}

export const ResultadoImportacion: React.FC<{ resultado: ResultadoImportacionDTO }> = ({ resultado }) => {
  const rechazadas = resultado.errores.length;

  return (
    <div role="status" className="flex flex-col gap-3 rounded-xl border border-saie-divider bg-white p-4">
      <div>
        <p className="m-0 font-semibold">
          {resultado.exitosa
            ? `Listo: ${resultado.filasRecibidas} filas procesadas sin errores.`
            : `${resultado.filasRecibidas} filas recibidas, ${rechazadas} rechazadas.`}
        </p>
        <p className="m-0 mt-1 text-sm text-saie-muted">
          {resultado.exitosa
            ? 'Los datos ya están disponibles en el sistema.'
            : 'Las filas válidas sí se guardaron. Corrige solo las rechazadas y vuelve a subir el archivo: no se duplica nada.'}
        </p>
      </div>

      <dl className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
        <div>
          <dt className="text-saie-muted">Filas recibidas</dt>
          <dd className="m-0 font-semibold">{resultado.filasRecibidas}</dd>
        </div>
        <div>
          <dt className="text-saie-muted">Filas rechazadas</dt>
          <dd className="m-0 font-semibold">{rechazadas}</dd>
        </div>
        {Object.entries(resultado.procesados).map(([clave, valor]) => (
          <div key={clave}>
            <dt className="text-saie-muted">{ETIQUETAS[clave] ?? clave}</dt>
            <dd className="m-0 font-semibold">{valor}</dd>
          </div>
        ))}
      </dl>

      {rechazadas > 0 && (
        <>
          <div className="flex flex-wrap gap-2">
            <Boton variante="secundario" tamano="sm" onClick={() => descargarErrores(resultado.tipo, resultado.errores)}>
              Descargar errores (CSV)
            </Boton>
          </div>
          <details className="group">
            <summary className="cursor-pointer text-sm font-semibold text-saie-primary">
              Ver las {rechazadas} filas rechazadas
            </summary>
            <ul className="mt-2 max-h-64 list-disc overflow-auto pl-5 text-sm">
              {resultado.errores.map((e) => <li key={e}>{e}</li>)}
            </ul>
          </details>
          <p className="m-0 text-sm text-[#B45309]">
            La asignación no se ejecutó porque el archivo tiene filas rechazadas.
          </p>
        </>
      )}
    </div>
  );
};
```

### 6.5 Confirmación de acción irreversible (alertas)

```tsx
// Dentro de TarjetaAlerta.tsx
const [confirmando, setConfirmando] = useState(false);

{!resuelta && onResolver && (
  confirmando ? (
    <div role="group" aria-label={`Confirmar resolución de ${alerta.espacio.identificador}`}
         className="flex flex-wrap items-center gap-2">
      <p className="m-0 text-sm">¿Marcar como resuelta? Dejará de aparecer en pendientes.</p>
      <Boton tamano="sm" variante="cancelar" onClick={() => setConfirmando(false)}>Cancelar</Boton>
      <Boton tamano="sm" cargando={resolviendo} onClick={() => onResolver(alerta.id)}>Sí, resolver</Boton>
    </div>
  ) : (
    <Boton tamano="sm" onClick={() => setConfirmando(true)}>Marcar como resuelta</Boton>
  )
)}
```

```tsx
// En AlertasAdmin.tsx, tras resolver:
const { mostrar } = useAvisos();
await resolverAlerta(id);
mostrar('exito', `Alerta de ${alerta.espacio.identificador} marcada como resuelta.`);
```

> No prometer "Deshacer" aquí: no existe endpoint de reapertura (spec 04 §2.1; responde 409 si ya estaba resuelta). Si más adelante se quiere deshacer, primero hace falta el endpoint; el toast puede incluir la acción después.

### 6.6 Textos de ejemplo (listos para copiar)

**Éxito (importación completa)**

> Listo: se guardaron 1 240 filas de Cursos y secciones. Los datos ya están disponibles.

**Éxito parcial (importación con rechazos)**

> Se guardaron 1 240 de 1 250 filas. Las 10 rechazadas no se modificaron y el resto ya está disponible. La asignación no se ejecutó porque el archivo tiene filas rechazadas: corrige el CSV y vuelve a subirlo (no se duplica nada). [Descargar errores (CSV)]

**Error de archivo**

> No pudimos leer el archivo. Verifica que sea un CSV con encabezado, separado por coma o punto y coma, y que pese menos de 10 MB.

**Error de red**

> No pudimos conectar con el servidor. El archivo no se envió. Revisa tu conexión y vuelve a intentarlo.

**Éxito (guardar laboratorio)**

> Software de LAB-3 actualizado: 12 programas seleccionados. Última actualización: hoy, 10:32.

**Cambios sin guardar**

> Tienes cambios sin guardar. [Guardar cambios]

**Confirmación destructiva**

> ¿Marcar como resuelta la alerta de LAB-3? Dejará de aparecer en pendientes y no se puede reabrir. [Cancelar] [Sí, resolver]

**Botón deshabilitado con motivo**

> Elige un laboratorio para editar el software.

**Vacío: sin espacios cargados**

> Todavía no hay espacios en el sistema. Cuando importes el catálogo, aparecerán aquí. [Ir a Carga de datos]

**Vacío: búsqueda sin coincidencias**

> No encontramos espacios con "LAB". Prueba con otro identificador o quita los filtros. [Limpiar filtros]

**Vacío: sin alertas**

> No hay alertas pendientes. Te avisaremos aquí cuando el sistema detecte un problema de aforo o de software.

**Confirmación de corrida**

> Se recalcularán 45 secciones del periodo 2026-2. Las asignaciones que siguen siendo válidas se conservan y no se duplican aulas. [Cancelar] [Ejecutar asignación]

**Mensaje honesto de sección no construida**

> Esta sección estará disponible en la próxima entrega. Mientras tanto, puedes seguir usando Carga de datos, Espacios y Alertas.

---

## 7. Checklist final por pantalla

### Jerarquía

- [ ] ¿La acción principal se ve en el primer viewport y sin scroll?
- [ ] ¿Hay un solo botón primario por vista o modal?
- [ ] ¿El título dice qué se hace aquí (verbo), no solo el nombre del módulo?
- [ ] ¿Lo secundario (documentación, referencia) está detrás de un control?

### Feedback

- [ ] Cada guardar/importar/eliminar tiene confirmación visible y anunciada (`role="status"` o toast).
- [ ] Ningún mensaje de éxito sobrevive a una edición posterior.
- [ ] Los procesos largos muestran progreso y qué hacer si tardan.
- [ ] Los botones deshabilitados explican el motivo (texto visible o `aria-describedby`).
- [ ] Las acciones irreversibles piden confirmación y no prometen deshacer si no existe endpoint.
- [ ] Los errores dicen qué pasó, en qué fila/campo y cómo corregirlo.
- [ ] Los resultados masivos muestran recibidas/rechazadas, detalle consultable y descarga.

### Densidad

- [ ] No hay párrafos largos ni tablas técnicas siempre visibles.
- [ ] No hay scroll horizontal dentro de cards a 320 px.
- [ ] Los listados extensos tienen contador, filtros, orden y paginación o carga diferida.
- [ ] Los elementos repetitivos (cursos afectados, software) se pliegan con "+N más".
- [ ] La misma información no aparece dos veces en la pantalla.

### Estados

- [ ] Existen y se distinguen: cargando, vacío real, vacío por filtro, error y sin permisos.
- [ ] Cada vacío ofrece la acción que lo resuelve ("Limpiar filtros", "Ir a Carga de datos").
- [ ] Cada flujo muestra su estado (pendiente/cargado/con errores) y su última actualización.

### Accesibilidad

- [ ] Foco visible en todo elemento interactivo, incluidos `summary`, inputs de archivo ocultos y selects.
- [ ] Inputs con borde `#8A8578` y altura ≥ 44 px; botones ≥ 44 px.
- [ ] El estado no depende solo del color (icono + texto + color).
- [ ] Los resultados dinámicos mueven el foco o se anuncian en una región viva.
- [ ] Todo se puede completar con Tab/Enter, sin ratón.
- [ ] Texto de lectura ≥ 14 px (12 px solo captions y badges).

### Consistencia

- [ ] Se usan `Boton`, `BadgeEstado`, `Aviso`, `Acordeon`, `EstadoVacio`, `SelectorSegmentado` en vez de copias.
- [ ] No quedan hex sueltos: tokens para éxito, peligro, borde y superficies.
- [ ] Los botones y títulos se comportan igual en todas las pantallas del panel.
- [ ] No hay jerga técnica en la UI (roles crudos, variables de entorno, números de issue, rutas de API).

---

## Anexo A. Inventario auditado

| Área | Archivos revisados en profundidad |
|---|---|
| Panel administrativo | `LayoutAdmin.tsx`, `InicioAdmin.tsx`, `AlertasAdmin.tsx`, `TarjetaAlerta.tsx`, `CargaDatos.tsx`, `EspaciosAdmin.tsx`, `CambioLaboratorio.tsx`, `ProximamenteAdminPage.tsx`, `IncidenciasAdminPage.tsx`, `ClavesAdminPage.tsx`, `SolicitudesSoftwareAdminPage.tsx` |
| Portal del alumno | `InicioEstudiante.tsx`, `Consulta.tsx`, `FormularioBusqueda.tsx`, `TarjetaResultado.tsx`, `AyudaAlumno.tsx`, `ConfiguracionAlumno.tsx`, `SeccionEditable.tsx`, `ElementosHorario.tsx`, `SelectorSegmentado.tsx` |
| Portal docente | `InicioDocentePage.tsx` y pantallas de `PantallaEnDesarrollo` |
| Público y autenticación | `Home.tsx`, `LoginFormBase.tsx`, `LoginLayout.tsx`, `BotonCerrarSesion.tsx`, `CabeceraPortal.tsx` |
| Transversal | `index.css`, `AppRoutes.tsx`, `config/rutas.ts`, `config/plantillas.ts`, `utils/admin.ts`, `hooks/useCarga.ts`, `services/estudiante.ts`, `services/admin.ts`, `types/admin.ts` |
| Documentación | `docs/07_guia_de_estilos_ui_ux.md`, `docs/specs/04-panel-alertas-y-admin.md` |

## Anexo B. Evidencia por archivo

| Archivo | Hallazgos |
|---|---|
| `frontend/src/pages/admin/CargaDatos.tsx` | Orden de la pantalla (guía → plantillas → carga), guía abierta por defecto, jerga de backend, tablas de plantilla siempre visibles, grid 3×4 roto, dropzone sin foco visible ni validación previa, resultado masivo incompleto, sin estado por flujo. |
| `frontend/src/pages/admin/InicioAdmin.tsx` | "Asignadas" incluye mantenidas, resultado por sección sobrescribe el del periodo, alertas no se refrescan tras la corrida, card "Próximamente" y contador duplicado. |
| `frontend/src/pages/admin/CambioLaboratorio.tsx` | `null` convertido en `0`, éxito persistente tras editar, dos primarios simultáneos, catálogo sin búsqueda, controles deshabilitados sin motivo. |
| `frontend/src/pages/admin/AlertasAdmin.tsx` | Contador sobre lista filtrada, vacío que confunde filtro con total, resolución sin confirmación, estado "Resuelta" local y efímero. |
| `frontend/src/components/admin/TarjetaAlerta.tsx` | Acción irreversible con un clic; cursos afectados sin plegar; `title` como única ayuda para el nombre del curso. |
| `frontend/src/pages/admin/EspaciosAdmin.tsx` | Título "Gestión" sin acciones, sin contador/orden/paginación, ambigüedad `null` vs `0` vs "no aplica", campos del backend (`softwareInstalado`, `camposEditables`) sin usar. |
| `frontend/src/components/admin/LayoutAdmin.tsx` | Rol crudo en cabecera, pestaña activa móvil solo por color, navegación horizontal en desktop en vez del sidebar de la guía. |
| `frontend/src/pages/Consulta.tsx` | Botón deshabilitado que anula la validación de envío vacío; sin foco en resultados. |
| `frontend/src/pages/Home.tsx` | Contenido oculto por altura de viewport (`[@media(max-height:820px)]:hidden`); nombre accesible del enlace de portal demasiado verboso. |
| `frontend/src/components/PantallaEnDesarrollo.tsx` | Copy vago y números de issue visibles en la UI. |
| `frontend/src/index.css` | Foco global solo para `a` y `button` (faltan `summary`, `select`, `input`). Tokens correctos y `prefers-reduced-motion` bien resuelto. |
| Global | Badges, botones y avisos duplicados; componentes reutilizables sin usar; más de 100 hex sueltos con tints inconsistentes. |

## Anexo C. Pendientes de verificar

1. **Endpoint de última corrida / historial de alertas.** Sin él no se puede mostrar "última corrida: hoy 10:32" ni una pestaña de resueltas. Verificar en `backend/src/routes/admin.routes.ts`.
2. **`filasAceptadas` explícito en `ResultadoImportacionDTO`.** Hoy solo hay `filasRecibidas`, `errores` y `procesados`; mostrar "guardadas" derivado de `filasRecibidas - errores.length` asume un error por fila. Confirmar con backend antes de mostrarlo como dato exacto.
3. **Uso real en móvil del panel administrativo.** Define si la tabla de Espacios se convierte en tarjetas o se mantiene con scroll horizontal.
4. **Concurrencia de cargas.** Define si hace falta bloquear una zona mientras otra persona importa el mismo flujo.
5. **Diseño de Figma del cambio de laboratorio.** El propio código lo señala como pendiente: `CambioLaboratorio.tsx:16-18`.
