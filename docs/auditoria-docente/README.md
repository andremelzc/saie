# Auditoría UI/UX del portal docente — evidencias

Evidencias de la sección 10 de [`docs/AUDITORIA_UI_UX.md`](../AUDITORIA_UI_UX.md) (issue #372). No forman parte del código de producción.

| Archivo | Qué contiene |
| --- | --- |
| [`mediciones.json`](mediciones.json) | Resultado de la pasada en navegador: por ruta y ventana, título del documento, `h1`, ancho del documento frente a la ventana, controles con menos de 44 px de alto, texto de menos de 14 px y violaciones de axe; además, las interacciones (orden de tabulación, foco tras navegar y tras enviar, región viva de la cuenta regresiva, clic en la tira semanal, salida con el formulario a medio llenar) y los estados de carga, vacío y error |
| [`capturas/`](capturas/) | 56 capturas JPEG (ver abajo) |
| [`issues-propuestos.md`](issues-propuestos.md) | Un issue listo para crearse por cada hallazgo de prioridad Alta |

## Cómo se obtuvieron

- **Fecha y versión:** 2026-11-17, rama `docs/372-auditoria-docente` sobre `develop` en `e71fd91`.
- **Navegador:** Chromium 1243 automatizado con Playwright contra `vite` en local (`http://localhost:5199`).
- **API simulada:** `page.route` responde a `/api/v1/docente/*` con datos que respetan los DTO de `frontend/src/types/docente.ts` y `types/solicitudesSoftware.ts`. No se usó el backend ni la base de datos. El historial de software del laboratorio reproduce el formato que guarda `backend/src/services/laboratorio.service.ts:115-116` (`JSON.stringify` de la lista).
- **Sesión:** un JWT sin firma con rol `DOCENTE` en `sessionStorage` (`saie.sesion`), como en `tests/e2e/helpers-panel.ts`.
- **Reloj fijo:** martes 17 de noviembre de 2026, 10:15 (hora de Lima), con una clase en curso (10:00–12:00).
- **Ventanas:** 390×844, 768×1024, 1280×800 y 640×400 (equivale a zoom 200 % sobre 1280×800).
- **axe-core 4.10** con las reglas `wcag2a`, `wcag2aa`, `wcag21a`, `wcag21aa` y `wcag22aa`, a 390 y 1280 px en las 8 vistas y en el login.
- **Estados simulados:** carga (respuesta demorada 4 s), vacíos (sin clases, sin solicitudes), 401, 403, 404, 500 y tiempo agotado en `GET /docente/horario`; 500 en el explorador y en las solicitudes; 409, 422, 500 y tiempo agotado al enviar una incidencia; 409 y 422 al enviar una solicitud.

## Capturas

| Grupo | Archivos |
| --- | --- |
| Rutas × ventanas (32) | `{vista}-{390,768,1280,640x400}.jpg` para `inicio`, `horario`, `horario-asignaciones`, `horario-semana`, `espacios`, `espacios-laboratorio`, `incidencias` y `software`. Las de 390, 768 y 1280 son de página completa: la barra de navegación fija aparece a media altura porque la captura une la página en una sola imagen (en pantalla queda abajo y el contenido reserva su espacio) |
| Login | `login-390.jpg`, `login-1280.jpg` |
| Interacciones | `interaccion-clic-jueves.jpg`, `incidencia-confirmacion-1280.jpg`, `software-errores-1280.jpg`, `foco-logo-cabecera.jpg` |
| Estados | `estado-{carga,vacio-inicio,vacio-horario,vacio-incidencias,vacio-software}.jpg`, `estado-inicio-{401,403,404,500,timeout}.jpg`, `estado-explorador-500.jpg`, `estado-software-500.jpg`, `estado-enviar-incidencia-{409,422,500,timeout}.jpg`, `estado-enviar-solicitud-{409,422}.jpg` |

## Resumen de las mediciones

| Medición | Resultado |
| --- | --- |
| Scroll horizontal de página | Ninguno en las 32 combinaciones de vista y ventana (`scrollWidth` = ancho de la ventana) |
| Controles con menos de 44 px de alto | A 390, 768 y 640×400: solo el enlace «Saltar al contenido», oculto hasta recibir el foco. A 1280: además las 5 pestañas de la barra (36 px de alto), que en escritorio se usan con puntero |
| Texto de menos de 14 px (a 390) | Entre 6 y 26 elementos por vista, todos de 12 px: la insignia de rol, las 5 etiquetas de la barra inferior, las etiquetas de las cifras y de los campos `dt`, y los bloques de la vista semanal (igual que `ACC-06`) |
| axe | 0 violaciones en las 8 vistas a 390 y 1280 px, y en el login |
| Título del documento y `h1` | Propios en cada ruta («Portal del docente · SAIE», «Mi horario y asignaciones · SAIE»…) |
| Foco tras navegar con la barra | Pasa al `h1` de la pantalla nueva |
| Foco tras enviar una incidencia | Queda en `body` (`ACC-20`) |
| Región viva de la cuenta regresiva | «Termina en 1 h 45 min» → «Termina en 1 h 44 min» al pasar 61 s (`ACC-19`) |
| Clic en «Jueves» de la tira semanal | Abre `/docente/horario` en la vista de día con el **martes** seleccionado (`DEN-25`) |
| Salir de Solicitudes con el formulario lleno | Navega sin aviso y se pierde el texto (`FDB-17`) |
| Aro de foco del logo | `3px solid #222222` sobre la cabecera `#7b1113`: 1.46:1 (`ACC-18`) |
