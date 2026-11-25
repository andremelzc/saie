# Issues propuestos — auditoría del portal docente

Un issue por cada hallazgo de prioridad Alta de la sección 10 de [`docs/AUDITORIA_UI_UX.md`](../AUDITORIA_UI_UX.md), con el formato de `SAIE_Issues_Propuestos.md`. Listos para crearse.

- **Numeración sugerida:** sigue la de cada épica en el repositorio al 2026-11-17 (último `3.57` y último `7.13`).
- **Hito:** por definir. Los hitos abiertos (Sprint 4, Sprint 5 y Cierre) vencieron el 11 de noviembre.
- **Responsable sugerido:** según `05_roles_y_tareas.md` (BI para el backend y FE para la interfaz).
- **Líneas de código:** corresponden al commit `e71fd91`; antes de implementar, verificar que el hallazgo sigue vigente.

| n | Título | Prioridad | Responsable sugerido | Hallazgo |
| --- | --- | --- | --- | --- |
| 1 | 7.14 — Portal docente: consultar el estado de mis incidencias | Alta | `andremelzc` (endpoint) y `meowleery` (UI) | `DEN-24` |
| 2 | 7.15 — Mi laboratorio: historial de software legible, sin JSON | Alta | `meowleery` | `MAP-16` |
| 3 | 7.16 — Explorador y Solicitudes: no mostrar el estado vacío cuando la carga falla | Alta | `meowleery` | `FDB-15` |
| 4 | 3.58 — Cabecera del alumno y del docente: foco visible en el logo | Alta | `meowleery` | `ACC-18` |

---

## Issue 1 — 7.14 — Portal docente: consultar el estado de mis incidencias

| | |
|---|---|
| **Hito** | Por definir |
| **Prioridad** | Alta |
| **Etiquetas** | frontend, backend, docente, auditoria-ui-ux, epic:portal-docente |
| **Asignado sugerido** | `andremelzc` (endpoint) y `meowleery` (UI) |
| **Hallazgos** | `DEN-24` |

**Contexto:** Al registrar una incidencia, la confirmación dice «Guarda el código para hacerle seguimiento», pero el docente no tiene dónde usar ese código: no hay pantalla ni endpoint para consultar sus incidencias. El requisito RF-18 (`docs/02_requisitos.md:57`) pide que el docente reciba «un identificador de seguimiento para consultar su estado». Hoy el código `INC-…` solo se ve en la confirmación y desaparece al pulsar «Reportar otra incidencia».

**Descripción:** Crear `GET /api/v1/docente/incidencias`, que devuelva solo las incidencias del docente autenticado, de la más reciente a la más antigua: `identificadorSeguimiento`, `tipo`, `prioridad`, `estado`, `fechaReporte`, `comentarioCierre`, `fechaCierre`, `espacio` y `asignacion` (el mismo contrato de `IncidenciaAdminDTO` sin `docente`). En `IncidenciasDocentePage`, añadir debajo del formulario la sección «Mis incidencias»: una tarjeta por incidencia con el código, el espacio, la clase, el estado con `BadgeEstado` y, si está cerrada, el comentario de Jefatura.

**Notas técnicas:** Spec-Driven: documentar el contrato en `docs/specs/05-portal-docente.md` antes de codificar. Reutilizar `describirPrioridadIncidencia` y añadir al diccionario el estado de la incidencia (`PENDIENTE`, `RESUELTA`, `DESCARTADA`) si falta. Tras enviar una incidencia, la lista se recarga. Respetar `EstadoError` y `EstadoVacio` («Aún no has reportado incidencias») sin mostrarlos a la vez (ver `FDB-15`).

**Fuera de alcance:** Notificaciones al docente cuando Jefatura cierra una incidencia; la pantalla de Jefatura (`IncidenciasAdminPage`).

**Dependencias:** Ninguna.

**Criterios de aceptación:**
- [ ] `GET /api/v1/docente/incidencias` devuelve solo las incidencias del docente autenticado, ordenadas de la más reciente a la más antigua
- [ ] Responde 401 sin token y 403 para roles que no son docentes
- [ ] La pantalla muestra «Mis incidencias» con código, espacio, clase, estado y, si existe, el comentario de cierre
- [ ] La lista se actualiza después de reportar una incidencia
- [ ] Si la consulta falla se muestra solo el error, sin el estado vacío
- [ ] El contrato queda documentado en la spec 05
- [ ] Compila sin errores (`npx tsc --noEmit` en el backend y en el frontend) y pasan `eslint` y `prettier --check`
- [ ] QA (`Angel14den`) recibe los casos de prueba del endpoint nuevo

<details><summary>Detalle del hallazgo en la auditoría</summary>

**`DEN-24` — Reportar incidencia (confirmación)** (prioridad Alta, esfuerzo M, estado en la auditoría: Pendiente)

- Archivos: `pages/docente/IncidenciasDocentePage.tsx:88-90`; `backend/src/routes/docente.routes.ts:20-27` (sin `GET /docente/incidencias`); `docs/02_requisitos.md:57` (RF-18)
- Problema: La confirmación dice «Guarda el código para hacerle seguimiento», pero no hay pantalla ni endpoint donde el docente consulte el estado de sus incidencias. **Verificado en navegador:** el código `INC-3F9A2C1B` solo aparece en la confirmación y desaparece al pulsar «Reportar otra incidencia» (`incidencia-confirmacion-1280.jpg`)
- Impacto: El docente no sabe si Jefatura atendió su reporte; la interfaz promete algo que no existe
- Solución propuesta: Sección «Mis incidencias» sobre un `GET /api/v1/docente/incidencias` que devuelva solo las propias; mientras tanto, retirar la frase del seguimiento

</details>

---

## Issue 2 — 7.15 — Mi laboratorio: historial de software legible, sin JSON

| | |
|---|---|
| **Hito** | Por definir |
| **Prioridad** | Alta |
| **Etiquetas** | frontend, docente, bug, auditoria-ui-ux, epic:portal-docente |
| **Asignado sugerido** | `meowleery` |
| **Hallazgos** | `MAP-16` |

**Contexto:** En Espacios → «Mi laboratorio», el bloque «Cambios recientes» muestra el historial de software tal como lo guarda el backend: `backend/src/services/laboratorio.service.ts:115-116` registra `JSON.stringify` de la lista anterior y de la nueva. El docente ve `Software: ["Visual Studio Code 1.95","Python 3.11"] → ["Visual Studio Code 1.95","Python 3.11","IntelliJ IDEA Community 2024.2"]`: corchetes y comillas, y dos listas que hay que comparar a ojo para saber qué cambió.

**Descripción:** En `EspaciosDocentePage` (`DetalleLaboratorio`), cuando `campo` es `SOFTWARE`, interpretar `valorAnterior` y `valorNuevo` como listas y mostrar la diferencia en frases: «Se instaló IntelliJ IDEA Community 2024.2», «Se retiró Python 3.10». Si el texto no se puede interpretar, mostrar «Se actualizó el software instalado» y no el texto crudo. Las PCs inoperativas siguen como hoy («PCs inoperativas: 1 → 3»).

**Notas técnicas:** Poner la interpretación en una función pura de `utils/docente.ts`, con pruebas (lista vacía, `valorAnterior` `null`, JSON inválido, sin cambios). No cambiar el formato que guarda el backend ni el contrato de `GET /docente/laboratorio-estado/:espacioId`.

**Fuera de alcance:** El historial de laboratorios del panel de Jefatura.

**Dependencias:** Ninguna.

**Criterios de aceptación:**
- [ ] «Cambios recientes» no muestra corchetes, comillas ni listas completas
- [ ] Cada cambio de software dice qué se instaló y qué se retiró
- [ ] Un valor que no se puede interpretar muestra un texto genérico, nunca el crudo
- [ ] La función tiene pruebas para lista vacía, `null`, JSON inválido y sin cambios
- [ ] Compila sin errores (`npx tsc --noEmit` en el frontend) y pasan `eslint` y `prettier --check`

<details><summary>Detalle del hallazgo en la auditoría</summary>

**`MAP-16` — Mi laboratorio («Cambios recientes»)** (prioridad Alta, esfuerzo S, estado en la auditoría: Pendiente)

- Archivos: `pages/docente/EspaciosDocentePage.tsx:317-320`; origen: `backend/src/services/laboratorio.service.ts:115-116`
- Problema: El historial de software muestra el registro crudo con corchetes y comillas, y repite las dos listas completas en vez de decir qué cambió. **Verificado en navegador** (`espacios-laboratorio-390.jpg`)
- Impacto: Texto de programación ante el docente; hay que comparar dos listas a ojo
- Solución propuesta: Interpretar el JSON y mostrar la diferencia, con un texto genérico de respaldo

</details>

---

## Issue 3 — 7.16 — Explorador y Solicitudes: no mostrar el estado vacío cuando la carga falla

| | |
|---|---|
| **Hito** | Por definir |
| **Prioridad** | Alta |
| **Etiquetas** | frontend, docente, bug, auditoria-ui-ux, epic:portal-docente |
| **Asignado sugerido** | `meowleery` |
| **Hallazgos** | `FDB-15` |

**Contexto:** En el explorador de espacios y en Solicitudes de software, el estado vacío se decide con `datos ?? []`, así que cuando la carga falla se muestran a la vez el error y el vacío. Con un 500, el explorador dice «Algo salió mal…» y debajo «Sin espacios que coincidan. Prueba con otro tipo, piso o franja horaria»; Solicitudes dice «Algo salió mal…» y «Aún no has pedido ningún software». El vacío contradice al error: culpa a los filtros o afirma que no hay solicitudes cuando no se pudieron leer.

**Descripción:** En `EspaciosDocentePage` (`ExploradorEspacios`) y `SolicitudesSoftwareDocentePage`, mostrar el estado vacío solo cuando hay datos cargados y la lista está vacía. Si hay error y no hay datos, solo `EstadoError` con «Reintentar». Si hay error al recargar con datos previos, mantener la lista y el error.

**Notas técnicas:** Revisar de paso las demás pantallas del docente con el mismo patrón (Inicio duplica el error, ver `FDB-16`). Añadir una prueba por pantalla que simule el error de carga y compruebe que el texto del vacío no aparece.

**Fuera de alcance:** El doble mensaje de error del inicio (`FDB-16`), que se puede resolver en el mismo PR si es trivial.

**Dependencias:** Ninguna.

**Criterios de aceptación:**
- [ ] Con un error de carga, el explorador no muestra «Sin espacios que coincidan»
- [ ] Con un error de carga, Solicitudes no muestra «Aún no has pedido ningún software»
- [ ] El estado vacío sigue apareciendo cuando la respuesta llega bien y vacía
- [ ] Hay una prueba por pantalla para el caso de error
- [ ] Compila sin errores (`npx tsc --noEmit` en el frontend) y pasan `eslint` y `prettier --check`

<details><summary>Detalle del hallazgo en la auditoría</summary>

**`FDB-15` — Explorador y Solicitudes (error de carga)** (prioridad Alta, esfuerzo S, estado en la auditoría: Pendiente)

- Archivos: `pages/docente/EspaciosDocentePage.tsx:208-217`; `pages/docente/SolicitudesSoftwareDocentePage.tsx:207-215`
- Problema: Si la carga falla se muestran a la vez el error y el estado vacío. **Verificado en navegador** con un 500 simulado (`estado-explorador-500.jpg`, `estado-software-500.jpg`)
- Impacto: Mensajes contradictorios ante una falla del servidor
- Solución propuesta: Con `error` y sin `datos`, solo `EstadoError`; el vacío solo con datos cargados

</details>

---

## Issue 4 — 3.58 — Cabecera del alumno y del docente: foco visible en el logo

| | |
|---|---|
| **Hito** | Por definir |
| **Prioridad** | Alta |
| **Etiquetas** | frontend, accesibilidad, bug, auditoria-ui-ux, epic:portal-estudiante, epic:portal-docente |
| **Asignado sugerido** | `meowleery` |
| **Hallazgos** | `ACC-18` |

**Contexto:** El enlace del logo de `CabeceraAlumno`, que comparten los portales del alumno y del docente, usa el aro de foco global de `index.css:150-152` (3 px en `#222222`). Sobre la cabecera guinda (`#7b1113`) ese aro tiene un contraste de 1.46:1, y WCAG 1.4.11 pide 3:1 para el indicador de foco. Es el primer control de cada pantalla después de «Saltar al contenido». «Cerrar sesión», en la misma cabecera, ya usa un aro blanco.

**Descripción:** Dar a los enlaces de la cabecera guinda un aro de foco blanco (`focus-visible:outline-white`, con el mismo grosor y separación del aro global), igual que «Cerrar sesión». Revisar las demás cabeceras con fondo guinda (`LayoutAdmin`, `CabeceraPortal`) y aplicar lo mismo si les pasa lo mismo.

**Notas técnicas:** No cambiar el aro global, que es correcto sobre fondos claros. El blanco sobre `#7b1113` da 10.9:1.

**Fuera de alcance:** El nombre accesible del logo («SAIE, ir al inicio», `ACC-10`), que se puede resolver en el mismo PR.

**Dependencias:** Ninguna.

**Criterios de aceptación:**
- [ ] Con el foco en el logo, el aro tiene un contraste ≥ 3:1 contra la cabecera, en los portales del alumno y del docente
- [ ] Las demás cabeceras guinda tienen un foco visible con el mismo criterio
- [ ] El aro global sobre fondos claros no cambia
- [ ] La prueba de axe del navegador sigue en verde
- [ ] Compila sin errores (`npx tsc --noEmit` en el frontend) y pasan `eslint` y `prettier --check`

<details><summary>Detalle del hallazgo en la auditoría</summary>

**`ACC-18` — Cabecera del portal docente (compartida con el alumno)** (prioridad Alta, esfuerzo S, estado en la auditoría: Pendiente)

- Archivos: `components/estudiante/CabeceraAlumno.tsx:37`; `index.css:150-152`
- Problema: El aro de foco del logo es `#222222` sobre `#7b1113`: 1.46:1 (1.4.11 pide 3:1). **Verificado en navegador** (`foco-logo-cabecera.jpg`)
- Impacto: Con teclado no se ve el foco en el primer control de cada pantalla
- Solución propuesta: Aro blanco en los enlaces de la cabecera, como el de «Cerrar sesión»

</details>
