**SAIE**

Sistema de Asignación Inteligente de Espacios

**DOCUMENTO DE DISEÑO UI/UX**
> 🔗 **Prototipo Interactivo en Figma:** [Ver Wireframes y Prototipo en Figma](https://www.figma.com/design/IuEYbDu9go6680czZ63DEO/SAIE?node-id=0-1&t=3JqT7T3UBpAkDjOJ-1)

| **Campo** | **Detalle** |
|---|---|
| **Nombre del proyecto** | SAIE (Sistema de Asignación de Infraestructura Espacial) |
| **Documento** | Especificación de Diseño UI/UX (Issue \#194) |
| **Versión** | 1.0 |
| **Estado** | Borrador para revisión |
| **Autor** | Equipo de Diseño UI/UX |
| **Audiencia** | Desarrollo, QA, Producto y Jefatura de Laboratorios |

## 1. Título y Control de Versiones

### 1.1 Datos del documento

| **Campo** | **Detalle** |
|---|---|
| Nombre del proyecto | SAIE (Sistema de Asignación Inteligente de Espacios) |
| Documento | Especificación de Diseño UI/UX (Issue \#194) |
| Versión | 1.0 |
| Documento relacionado | Guía de Estilos y Sistema de Diseño (Issue \#195): define colores, tipografía y componentes visuales referenciados en este documento. |

### 1.2 Historial de versiones

| **Versión** | **Fecha** | **Autor** | **Descripción del cambio** |
|---|---|---|---|
| 1.0 | 29/09/2026 | Diseño UI/UX | Versión inicial del Documento de Diseño UI/UX. Define los flujos completos para los portales de Estudiante, Docente, Administración/Jefatura y el módulo de Gestión y Reasignación de Espacios. |

### 1.3 Propósito y alcance

Este documento especifica el diseño de interfaz y la experiencia de usuario de SAIE, plataforma destinada a gestionar la asignación de aulas y laboratorios universitarios y a orientar a estudiantes y docentes hacia los espacios que les corresponden. Para cada pantalla se define su objetivo, elementos visuales, interacciones y criterios de comportamiento.

Este documento describe **qué hace** cada pantalla y **cómo se comporta**; el aspecto visual (colores, tipografía, componentes) se define en la Guía de Estilos (Issue \#195). Los identificadores en formato código corresponden a los nombres de pantalla utilizados en el prototipo y en el repositorio del proyecto.

### 1.4 Roles del sistema

| **Rol** | **Portal** | **Objetivo principal** |
|---|---|---|
| Estudiante | Portal del Estudiante | Consultar su horario y llegar al espacio asignado. |
| Docente | Portal del Docente | Conocer su carga y los requerimientos de cada clase, y reportar incidencias técnicas. |
| Administrativo / Jefatura de Laboratorios | Portal Administrativo | Monitorear la ocupación, atender alertas e incidencias y reasignar espacios. |

### 1.5 Principios de diseño transversales

- **Claridad:** cada pantalla responde a una pregunta principal del usuario (¿dónde tengo clase?, ¿cuándo me toca?, ¿qué está fallando?).

- **Consistencia:** componentes, tipografía, espaciado e iconografía reutilizables en los tres portales y el módulo de gestión.

- **Mobile-first** para estudiantes y docentes, con adaptación a escritorio para el portal administrativo.

- **Retroalimentación inmediata:** toda acción muestra estados de carga, éxito o error.

- **Accesibilidad:** contraste mínimo AA (WCAG 2.1), áreas táctiles de al menos 44×44 px, etiquetas para lectores de pantalla y foco visible.

- **Semántica de color unificada:** el color nunca es el único portador de información; siempre se acompaña de texto o icono.

### 1.6 Sistema de estados y color

Los colores siguen los tokens de la Guía de Estilos (Issue \#195). El guinda institucional identifica la acción primaria y la marca; los colores de estado se reservan para ocupación, alertas y prioridades.

| **Estado** | **Color (token)** | **Uso** | **Refuerzo no cromático** |
|---|---|---|---|
| Disponible / Resuelto | Verde \#2E7D32 | Espacio libre, incidencia o alerta resuelta | Icono de check + texto |
| Ocupado / Prioridad alta | Rojo \#D32F2F | Espacio en uso, pendiente, prioridad alta | Icono de usuario + texto |
| Mantenimiento / Prioridad media | Naranja \#F57C00 | Espacio no operativo, advertencias | Icono de llave + texto |
| En revisión | Amarillo lima \#C0CA33 | Ticket o reporte en revisión | Icono de lupa + texto |
| Alerta activa | Rojo \#E53935 con indicador pulsante | Conflicto pendiente de gestión | Icono de campana + insignia numérica |
| Acción primaria y marca | Guinda \#7B1113 | Botones principales, barra superior, pestaña activa | Etiqueta del botón + foco visible |

### 1.7 Estados de interfaz transversales

Toda pantalla que consulta datos debe contemplar, además del estado normal, los siguientes estados con tratamiento uniforme en los cuatro portales.

| **Estado** | **Tratamiento y comportamiento** |
|---|---|
| **Cargando** | Contenedores esqueleto con la forma del contenido, visibles si la carga supera 300 ms; nunca bloquean la navegación. |
| **Vacío** | Ilustración simple, título breve y acción sugerida; explica por qué no hay datos (por ejemplo, «Hoy no tienes clases programadas»). |
| **Error** | Mensaje claro con icono y botón «Reintentar»; sin códigos técnicos y conservando lo ya ingresado. |
| **Sin conexión** | Banner superior persistente y datos en caché con su última actualización; las acciones que requieren red se deshabilitan con explicación. |
| **Éxito** | Aviso breve (toast) de 4 s con icono de check, sin interrumpir el flujo. |

## 2. Sección 1: Portal del Estudiante

**Objetivo del portal:** brindar al estudiante acceso rápido a su horario y una guía clara para llegar a su aula o laboratorio.

**Flujo general:** Login → Inicio → (Horario \| Mapa de Ruta \| Ayuda \| Perfil).

### 2.1 Autenticación y Login

| | |
|---|---|
| **ID de pantalla** | login-estudiante |
| **Rol** | Estudiante (sin sesión) |
| **Se accede desde** | Apertura de la aplicación; cierre de sesión |
| **Navega hacia** | inicio-estudiante; recuperación de contraseña; saie-ayuda |
| **Estados a diseñar** | Reposo · Validando · Error de credenciales · Bloqueo temporal |

**Objetivo**

Permitir el acceso seguro del estudiante con la mínima fricción.

**Elementos visuales**

- Logotipo de SAIE y nombre de la institución en la parte superior.

- Título de bienvenida y subtítulo breve.

- Campo «Código de estudiante o correo institucional».

- Campo «Contraseña» con botón para mostrar u ocultar el texto.

- Casilla «Recordar sesión».

- Botón primario «Iniciar sesión» de ancho completo.

- Enlace secundario «¿Olvidaste tu contraseña?» y acceso al Centro de Ayuda.

- Área reservada para mensajes de error en línea.

**Interacciones y comportamiento**

- Validación en línea al perder el foco (campo vacío, formato de código o correo).

- El botón principal permanece deshabilitado hasta completar ambos campos y muestra un indicador de carga durante la autenticación.

- Ante credenciales inválidas se presenta un mensaje genérico que no revela cuál dato es incorrecto.

- Tras varios intentos fallidos consecutivos se aplica un bloqueo temporal con aviso al usuario.

- Autenticación exitosa: redirección a inicio-estudiante.

- La sesión recordada omite esta pantalla hasta su expiración.

### 2.2 Dashboard de Inicio

| | |
|---|---|
| **ID de pantalla** | inicio-estudiante |
| **Rol** | Estudiante |
| **Se accede desde** | Login; barra de navegación inferior |
| **Navega hacia** | horario-estudiante; saie-mapa-ruta; saie-ayuda; perfil-estudiante |
| **Estados a diseñar** | Con clases · Sin clases · Cargando · Error de conexión |

**Objetivo**

Ofrecer una vista inmediata de las clases del día y atajos a las tareas más frecuentes.

**Elementos visuales**

- Encabezado con saludo personalizado, fecha actual y avatar del usuario.

- **Accesos rápidos:** cuadrícula de iconos con etiqueta (Horario, Mapa de Ruta, Ayuda, Perfil).

- **Resumen de clases del día:** lista cronológica de tarjetas con hora de inicio y fin, nombre del curso, tipo de sesión (Teoría o Laboratorio), espacio asignado y estado (En curso, Próxima, Finalizada).

- Estado vacío ilustrado: «Hoy no tienes clases programadas».

- Barra de navegación inferior persistente.

**Interacciones y comportamiento**

- Tocar un acceso rápido navega a la pantalla correspondiente.

- Tocar una tarjeta de clase abre la ruta hacia el espacio (saie-mapa-ruta).

- La clase en curso o la más próxima se resalta visualmente.

- Gesto de «tirar para actualizar» refresca los datos.

- Si Jefatura reasigna un espacio, la tarjeta se actualiza y muestra una notificación visible del cambio.

### 2.3 Consulta de Horario Semanal y Diario

| | |
|---|---|
| **ID de pantalla** | horario-estudiante |
| **Rol** | Estudiante |
| **Se accede desde** | Inicio; barra de navegación inferior |
| **Navega hacia** | saie-mapa-ruta (mediante «Cómo llegar») |
| **Estados a diseñar** | Vista diaria · Vista semanal · Día vacío · Espacio actualizado |

**Objetivo**

Permitir revisar la programación académica en vista diaria y semanal.

**Elementos visuales**

- Control segmentado «Día / Semana».

- **Vista diaria:** tira de días con el día activo resaltado y bloques horarios en orden cronológico, con indicador de la hora actual.

- **Vista semanal:** cuadrícula de lunes a sábado con bloques de color por curso.

- Cada bloque muestra curso, horario, tipo de sesión y ubicación.

- Botón «Hoy» para regresar a la fecha actual.

**Interacciones y comportamiento**

- Cambio de día por toque o deslizamiento horizontal; cambio de semana mediante flechas anterior/siguiente.

- Tocar un bloque abre un panel inferior con docente, ubicación y tipo de sesión, además del botón «Cómo llegar».

- Estado vacío para días sin clases.

- Los bloques afectados por una reasignación reciente muestran la etiqueta «Espacio actualizado».

### 2.4 Navegación e Itinerario con Mapa de Ruta

| | |
|---|---|
| **ID de pantalla** | saie-mapa-ruta |
| **Rol** | Estudiante |
| **Se accede desde** | Tarjeta de clase en Inicio; panel de detalle en Horario |
| **Navega hacia** | Inicio; saie-ayuda |
| **Estados a diseñar** | Ruta cargada · En recorrido · Llegada · Espacio reasignado · Ruta no disponible |

**Objetivo**

Guiar paso a paso al estudiante desde su punto de acceso hasta el aula o laboratorio asignado.

**Elementos visuales**

- Encabezado con nombre del curso, hora de inicio y espacio de destino.

- Mapa esquemático del campus o edificio con marcador de origen, marcador de destino, línea de ruta resaltada y selector de piso.

- Panel inferior desplegable con el **itinerario textual paso a paso** y iconografía direccional (por ejemplo: «Ingresa por el hall principal», «Sube por las escaleras al piso 2», «Gira a la derecha; el laboratorio es la tercera puerta»).

- Indicadores de tiempo estimado y distancia.

- Acciones: «Iniciar recorrido», «Recentrar» y «Cambiar de piso».

**Interacciones y comportamiento**

- Los pasos se avanzan manualmente o se resaltan de forma progresiva al iniciar el recorrido; el paso activo se sincroniza entre mapa y lista.

- Zoom y desplazamiento libres sobre el mapa; al cambiar de piso se actualiza la porción de ruta visible.

- Opción de accesibilidad «Ruta sin escaleras» (ascensor o rampa).

- Confirmación visual al llegar al destino.

- Si el espacio fue reasignado, se muestra un aviso destacado con la nueva ubicación y la ruta se recalcula.

### 2.5 Centro de Ayuda y Preguntas Frecuentes

| | |
|---|---|
| **ID de pantalla** | saie-ayuda |
| **Rol** | Estudiante |
| **Se accede desde** | Inicio; Perfil; Login |
| **Navega hacia** | Canal de contacto de soporte |
| **Estados a diseñar** | Lista completa · Búsqueda sin resultados |

**Objetivo**

Resolver dudas comunes de forma autónoma y ofrecer un canal de contacto cuando las respuestas no sean suficientes.

**Elementos visuales**

- Barra de búsqueda con texto de apoyo.

- Chips de categorías (Acceso, Horario, Mapa, Cuenta).

- Lista de preguntas frecuentes en formato acordeón.

- Tarjeta final «¿No encontraste lo que buscabas?» con canal de contacto (correo o formulario de soporte).

**Interacciones y comportamiento**

- La búsqueda filtra las preguntas en tiempo real y los chips filtran por categoría.

- Al tocar una pregunta se expande su respuesta y se colapsa la anterior.

- Estado vacío sin coincidencias, con sugerencia de contacto.

- Valoración opcional «¿Te resultó útil?» al final de cada respuesta.

### 2.6 Perfil de Usuario y Ajustes

| | |
|---|---|
| **ID de pantalla** | perfil-estudiante |
| **Rol** | Estudiante |
| **Se accede desde** | Barra de navegación inferior |
| **Navega hacia** | login-estudiante (cerrar sesión); saie-ayuda |
| **Estados a diseñar** | Lectura · Edición de ajustes · Confirmación de cierre de sesión |

**Objetivo**

Mostrar los datos del estudiante y permitir configurar las preferencias de la aplicación.

**Elementos visuales**

- Cabecera con avatar, nombre completo, código de estudiante, carrera y correo institucional.

- Sección **Información académica** en modo solo lectura.

- Sección **Ajustes:** notificaciones (cambios de aula, recordatorios de clase), tamaño de texto, tema claro u oscuro y ruta accesible por defecto.

- Enlaces a Centro de Ayuda, Términos y Privacidad.

- Botón «Cerrar sesión».

**Interacciones y comportamiento**

- Los interruptores guardan el cambio de inmediato y muestran una confirmación breve.

- «Cerrar sesión» solicita confirmación mediante un modal y, al aceptar, redirige a login-estudiante.

- Los datos institucionales no son editables; se informa que su actualización corresponde a la oficina académica.

## 3. Sección 2: Portal del Docente

**Objetivo del portal:** permitir al docente conocer su próxima clase, su carga académica y los requerimientos técnicos de cada espacio, así como reportar fallas de equipamiento de manera estructurada.

**Flujo general:** Inicio → (Detalle de clase \| Horarios \| Mis Asignaciones \| Reporte de Incidencias).

### 3.1 Dashboard de Inicio

| | |
|---|---|
| **ID de pantalla** | inicio-docente |
| **Rol** | Docente |
| **Se accede desde** | Login; barra de navegación inferior |
| **Navega hacia** | detalle-proxima-clase-docente; horarios; resumen-academico-docente; reportar-incidencia |
| **Estados a diseñar** | Próxima clase · Clase en curso · Sin clases · Cambio de espacio |

**Objetivo**

Dar visibilidad inmediata a la siguiente obligación académica y a un resumen de la carga horaria del docente.

**Elementos visuales**

- Encabezado con saludo, fecha y avatar.

- **Tarjeta de Próxima Clase (destacada):** nombre del curso, sección, espacio asignado, hora de inicio y **conteo regresivo** (por ejemplo, «Empieza en 00:42:15»), con botón «Ver detalle».

- **Métricas de carga horaria** en tres tarjetas: Cursos, Secciones y Horas semanales.

- Lista de clases restantes del día con su estado.

- Accesos rápidos: Horarios, Mis Asignaciones y Reportar Incidencia.

- Barra de navegación inferior persistente.

**Interacciones y comportamiento**

- El conteo regresivo se actualiza cada segundo; al iniciar la clase la tarjeta cambia a «En curso» y muestra el tiempo transcurrido.

- Tocar la tarjeta de Próxima Clase abre detalle-proxima-clase-docente.

- Tocar una métrica navega a resumen-academico-docente.

- Si no quedan clases en el día, la tarjeta muestra la próxima clase de la siguiente jornada con fecha completa.

- Un cambio de espacio realizado por Jefatura se comunica mediante un banner en la parte superior de la tarjeta.

### 3.2 Detalle de Clase

| | |
|---|---|
| **ID de pantalla** | detalle-proxima-clase-docente |
| **Rol** | Docente |
| **Se accede desde** | inicio-docente; horarios |
| **Navega hacia** | saie-mapa-ruta; reportar-incidencia |
| **Estados a diseñar** | Software completo · Software faltante · Cargando |

**Objetivo**

Presentar toda la información necesaria para preparar la sesión, incluido el software instalado en el espacio asignado.

**Elementos visuales**

- Encabezado con curso, sección, tipo de sesión, horario y estudiantes matriculados.

- Tarjeta del **espacio asignado:** nombre, piso, capacidad y estado.

- Sección **Requerimientos de software:** lista de aplicaciones con nombre, versión e indicador de estado. Ejemplo: Docker, Visual Studio Code y PostgreSQL. Cada elemento muestra «Instalado» (verde) o «No disponible» (ámbar/rojo).

- Banner de compatibilidad global: «El espacio cumple con todos los requerimientos» o advertencia con los elementos faltantes.

- Botón primario **«Ver ruta»** hacia saie-mapa-ruta.

- Botón secundario «Reportar incidencia».

**Interacciones y comportamiento**

- «Ver ruta» abre el mapa con el destino preseleccionado.

- Si falta software requerido, la advertencia ofrece contactar a Jefatura o reportar una incidencia con el contexto precargado.

- Tocar una aplicación despliega su versión y la fecha de última verificación.

- El botón de retroceso regresa siempre a la pantalla de origen (Inicio o Horario).

### 3.3 Horarios de Clases

| | |
|---|---|
| **ID de pantalla** | horario-docente-dia, horario-docente-semana |
| **Rol** | Docente |
| **Se accede desde** | Inicio; barra de navegación inferior |
| **Navega hacia** | detalle-proxima-clase-docente |
| **Estados a diseñar** | Vista diaria · Vista semanal · Día vacío · Espacio actualizado |

**Objetivo**

Consultar la programación docente en dos niveles de detalle: jornada diaria y panorama semanal.

**Elementos visuales**

- Control segmentado «Día / Semana» y botón «Hoy».

- **Vista diaria** (horario-docente-dia): tira de días y línea de tiempo con bloques de clase que incluyen curso, sección, tipo (Teoría, Laboratorio, Proyecto), horario y espacio.

- **Vista semanal** (horario-docente-semana): cuadrícula de lunes a sábado con bloques de color por curso y leyenda.

- Indicador de hora actual y marca visual de huecos entre clases.

**Interacciones y comportamiento**

- Tocar un bloque abre detalle-proxima-clase-docente con la información de esa sesión.

- Navegación entre días y semanas mediante deslizamiento o flechas.

- El cambio entre vistas conserva el día seleccionado.

- Estados vacíos para días sin clases y etiqueta «Espacio actualizado» en sesiones reasignadas.

### 3.4 Mis Asignaciones

| | |
|---|---|
| **ID de pantalla** | resumen-academico-docente |
| **Rol** | Docente |
| **Se accede desde** | Métricas de inicio-docente; menú |
| **Navega hacia** | Horarios filtrados por curso |
| **Estados a diseñar** | Tarjeta colapsada · Tarjeta expandida · Sin asignaciones |

**Objetivo**

Resumir los cursos a cargo del docente y el desglose de sus horas por tipo de actividad.

**Elementos visuales**

- Encabezado con periodo académico activo.

- Resumen superior con total de cursos, secciones y horas.

- **Tarjetas de cursos a cargo:** nombre, código, sección, número de estudiantes y espacios habituales.

- **Desglose de horas** por curso: Teoría, Laboratorio y Proyecto, con valores numéricos y barra de proporción segmentada.

**Interacciones y comportamiento**

- Tocar una tarjeta la expande para mostrar el desglose y las sesiones semanales.

- Acceso directo desde cada curso a sus horarios filtrados.

- Ordenamiento por nombre o carga horaria.

- Los totales coinciden siempre con las métricas del dashboard (inicio-docente).

### 3.5 Módulo de Reporte de Incidencias Técnicas

| | |
|---|---|
| **ID de pantalla** | reportar-incidencia, incidencia-enviada |
| **Rol** | Docente |
| **Se accede desde** | Inicio; detalle-proxima-clase-docente |
| **Navega hacia** | incidencia-enviada; Inicio; listado de reportes |
| **Estados a diseñar** | Formulario · Validando · Subiendo imágenes · Sin conexión · Enviado |

**Objetivo**

Permitir al docente notificar fallas en equipos de laboratorio de forma estructurada y obtener un ticket de soporte con seguimiento.

**Elementos visuales: formulario (reportar-incidencia)**

- Selector de **espacio afectado** (precargado si se llega desde una clase).

- Selector de **tipo de falla:** equipo de cómputo, software, red, proyector, mobiliario u otro.

- Campo de **equipo o puesto afectado** (por ejemplo, PC-14).

- Selector de **nivel de prioridad:** Baja, Media, Alta y Crítica, con descripción breve y color asociado.

- Área de **descripción** con contador de caracteres.

- **Carga de fotografías de evidencia:** botón «Tomar foto» o «Adjuntar desde galería», con miniaturas y opción de eliminar (hasta 4 imágenes).

- Botones «Cancelar» y «Enviar reporte».

**Interacciones: formulario**

- Campos obligatorios: espacio, tipo de falla, prioridad y descripción.

- Validación en línea; el botón de envío se habilita al completar los obligatorios.

- Las imágenes se comprimen antes de cargarse y muestran barra de progreso; se controlan formato y peso máximo.

- Cancelar con datos ingresados solicita confirmación antes de descartar.

- El borrador se conserva ante pérdida de conexión y el envío se reintenta automáticamente.

**Elementos visuales: confirmación (incidencia-enviada)**

- Icono de éxito y mensaje «Reporte enviado correctamente».

- **Ticket de soporte:** número único (por ejemplo, INC-2026-0000), fecha y hora, espacio, prioridad y estado inicial «Recibido».

- Resumen de lo reportado y miniaturas de las evidencias adjuntas.

- Botones «Volver al inicio» y «Ver mis reportes».

**Interacciones: confirmación**

- El número de ticket puede copiarse con un toque.

- El docente recibe notificaciones ante cambios de estado (En revisión, En atención, Resuelto).

- El ticket se refleja en el portal administrativo (admin-reportes) con los datos y las evidencias adjuntas.

## 4. Sección 3: Portal Administrativo y Jefatura de Laboratorios

**Objetivo del portal:** dotar a la administración y a la jefatura de una vista operativa en tiempo real de la infraestructura, con herramientas para detectar conflictos, atender incidencias y tomar decisiones de reasignación.

**Flujo general:** Inicio → (Ocupación \| Alertas \| Reportes \| Asignaciones). Diseño responsivo con prioridad en escritorio, menú lateral persistente y adaptación a tablet.

### 4.1 Dashboard Administrativo

| | |
|---|---|
| **ID de pantalla** | inicio-admin |
| **Rol** | Administrativo / Jefatura |
| **Se accede desde** | Login; menú lateral o barra inferior |
| **Navega hacia** | admin-ocupacion; admin-alertas; admin-reportes; admin-asignaciones |
| **Estados a diseñar** | Sin alertas · Con alertas · Cargando · Actualización en tiempo real |

**Objetivo**

Mostrar el estado operativo global de la infraestructura y dirigir la atención hacia lo urgente.

**Elementos visuales**

- Encabezado con saludo, fecha, hora y sello «Actualizado en tiempo real».

- **Métricas clave** en tarjetas: **Aulas ocupadas 18/24**, **Labs ocupados 8/12** y **Alertas activas 3**, cada una con barra o anillo de progreso y porcentaje.

- **Resumen de alertas recientes:** lista de las últimas alertas con tipo, espacio afectado, hora e indicador de severidad.

- **Accesos rápidos:** Mapa de Ocupación, Centro de Alertas, Reportes y Asignaciones.

- Menú lateral con insignias numéricas para alertas y reportes pendientes.

**Interacciones y comportamiento**

- Las métricas se actualizan sin recargar la página y resaltan brevemente el valor que cambió.

- Tocar una métrica navega a la vista filtrada (aulas o laboratorios en admin-ocupacion; alertas en admin-alertas).

- Tocar una alerta reciente abre saie-admin-alerta-detalle.

- Cuando las alertas activas superan cero, la tarjeta correspondiente usa el color de alerta y una insignia.

- «Ver todas» dirige al Centro de Alertas.

### 4.2 Mapa de Ocupación por Pisos

| | |
|---|---|
| **ID de pantalla** | admin-ocupacion |
| **Rol** | Administrativo / Jefatura |
| **Se accede desde** | Dashboard; menú |
| **Navega hacia** | saie-admin-alerta-detalle; admin-asignacion-detalle; admin-reasignar-espacio |
| **Estados a diseñar** | Piso 1 · Piso 2 · Piso 3 · Filtros activos · Consulta de otra fecha |

**Objetivo**

Ofrecer una representación visual de la distribución y el estado de cada aula y laboratorio por nivel.

**Elementos visuales**

- Pestañas o selector de piso: **Piso 1, Piso 2 y Piso 3**.

- Plano esquemático de cada piso con las aulas y laboratorios como celdas identificadas por código.

- **Código de colores por estado:** Disponible (verde), Ocupado (rojo), Mantenimiento (ámbar) y Alerta activa (rojo con borde e indicador pulsante), acompañado de icono para no depender solo del color.

- Leyenda fija con el conteo por estado.

- Filtros por tipo de espacio (Aula, Laboratorio), estado y franja horaria; selector de fecha y hora.

- Panel lateral de detalle del espacio seleccionado.

**Interacciones y comportamiento**

- Pasar el cursor o tocar una celda muestra un tooltip con curso, docente, horario y capacidad.

- Seleccionar una celda abre el panel con el detalle y acciones contextuales: «Ver asignación», «Reasignar» y «Ver alertas».

- Es posible consultar la ocupación en otra fecha u hora con el selector temporal, con retorno rápido a «Ahora».

- Los espacios con alerta activa enlazan directamente a saie-admin-alerta-detalle.

- Los estados se actualizan en tiempo real.

### 4.3 Centro de Alertas

| | |
|---|---|
| **ID de pantalla** | admin-alertas, saie-admin-alerta-detalle |
| **Rol** | Administrativo / Jefatura |
| **Se accede desde** | Dashboard; Mapa de ocupación; menú |
| **Navega hacia** | admin-reasignar-espacio |
| **Estados a diseñar** | Activa · En gestión · Resuelta · Sin alertas |

**Objetivo**

Centralizar la detección y resolución de conflictos entre la programación y las condiciones reales de los espacios.

**Elementos visuales: listado (admin-alertas)**

- Pestañas por estado: Activas, En gestión y Resueltas.

- Filtros por tipo, severidad, piso y fecha; búsqueda por espacio o curso.

- Tarjetas de alerta con tipo, espacio, curso y docente involucrados, severidad y tiempo transcurrido.

- Tipos contemplados, entre otros: **Incompatibilidad de Software** y **Capacidad Excedida**.

**Elementos visuales: detalle (saie-admin-alerta-detalle)**

- Encabezado con tipo de alerta, severidad y estado.

- **Caso «Incompatibilidad de Software»:** comparación lado a lado entre lo requerido y lo instalado (por ejemplo, MATLAB v2026 requerido frente a v2021 instalado en el laboratorio asignado), con el elemento discrepante resaltado.

- **Caso «Capacidad Excedida»:** comparación entre estudiantes matriculados y capacidad del espacio, con indicador de exceso.

- Datos de contexto: curso, sección, docente, horario y espacio.

- **Historial de eventos:** línea de tiempo con detección, notificaciones, cambios de estado y comentarios, con fecha, hora y autor.

- Barra de acciones: **«Reasignar espacio»**, **«Marcar como resuelta»** y **«Agregar comentario»**.

**Interacciones y comportamiento**

- «Reasignar espacio» abre admin-reasignar-espacio con curso, horario y requerimientos precargados.

- «Marcar como resuelta» solicita una nota de resolución y confirma mediante modal.

- Cada acción se registra en el historial con autor y marca de tiempo.

- Al completarse una reasignación se notifica a docente y estudiantes afectados.

- La alerta pasa de «Activa» a «En gestión» al ser tomada por un usuario y a «Resuelta» al cerrarse, actualizando los contadores del dashboard.

### 4.4 Gestión de Incidencias y Reportes

| | |
|---|---|
| **ID de pantalla** | admin-reportes, admin-reporte-detalle |
| **Rol** | Administrativo / Jefatura |
| **Se accede desde** | Menú; detalle de espacio |
| **Navega hacia** | admin-reasignar-espacio; admin-ocupacion |
| **Estados a diseñar** | Recibido · En revisión · En atención · Resuelto |

**Objetivo**

Dar seguimiento a los tickets generados por los docentes hasta su resolución.

**Elementos visuales: listado (admin-reportes)**

- Tabla o lista con número de ticket, espacio, tipo de falla, prioridad, docente, fecha y estado.

- Estados de resolución: Recibido, En revisión, En atención y Resuelto.

- Filtros por estado, prioridad, piso y rango de fechas; búsqueda por número de ticket.

- Ordenamiento por prioridad o antigüedad.

**Elementos visuales: detalle (admin-reporte-detalle)**

- Datos del ticket: número, prioridad, espacio, equipo afectado, descripción y docente reportante.

- **Galería de evidencia fotográfica** con vista ampliada.

- Selector de estado, asignación de responsable (técnico) y campo de comentarios internos.

- Historial de cambios de estado y comentarios.

- Acciones: «Actualizar estado», «Marcar espacio en mantenimiento», «Resolver» y «Reasignar clases afectadas».

**Interacciones y comportamiento**

- Cada cambio de estado notifica al docente que generó el reporte.

- «Marcar espacio en mantenimiento» cambia su estado en admin-ocupacion y dispara la verificación de clases afectadas.

- Si existen clases programadas en el espacio afectado, se ofrece iniciar la reasignación.

- Cerrar un ticket exige registrar una nota de resolución.

## 5. Sección 4: Módulo de Gestión y Reasignación de Espacios

**Objetivo del módulo:** administrar las asignaciones de cursos a docentes, aulas y laboratorios, y permitir su modificación o traslado de forma segura, validando compatibilidad y disponibilidad antes de confirmar cualquier cambio.

**Flujo general:** Listado → Detalle → (Editar \| Reasignar \| Eliminar) → Confirmación.

### 5.1 Listado y Filtros de Asignaciones

| | |
|---|---|
| **ID de pantalla** | admin-asignaciones, admin-asignacion-detalle |
| **Rol** | Administrativo / Jefatura |
| **Se accede desde** | Menú; alerta o reporte asociado |
| **Navega hacia** | admin-editar-asignacion; admin-reasignar-espacio; admin-confirmar-eliminar |
| **Estados a diseñar** | Con resultados · Sin resultados · Filtrado · Cargando |

**Objetivo**

Consultar, localizar y revisar el detalle de todas las asignaciones vigentes del periodo académico.

**Elementos visuales: listado (admin-asignaciones)**

- Tabla con curso, sección, docente, aula teórica, laboratorio práctico, día y horario, y estado.

- Barra de búsqueda por curso, docente o espacio.

- Panel de filtros: periodo, docente, tipo de espacio, piso, día, franja horaria y estado (Confirmada, Con alerta, Pendiente).

- Chips de filtros activos con opción de limpiar todos.

- Paginación, ordenamiento por columna y botón «Nueva asignación».

**Elementos visuales: detalle (admin-asignacion-detalle)**

- Ficha con datos del curso, docente, estudiantes matriculados, espacios y horarios de teoría y laboratorio.

- Indicadores de compatibilidad de software y de capacidad.

- Alertas o incidencias asociadas.

- Acciones: «Editar», «Reasignar espacio» y «Eliminar».

**Interacciones y comportamiento**

- Los filtros se aplican de inmediato y se conservan al volver desde el detalle.

- Seleccionar una fila abre la ficha de detalle.

- Las asignaciones con alerta muestran una insignia que enlaza a saie-admin-alerta-detalle.

- Estado vacío con sugerencia de ampliar los filtros.

### 5.2 Edición de Asignaciones

| | |
|---|---|
| **ID de pantalla** | admin-editar-asignacion |
| **Rol** | Administrativo / Jefatura |
| **Se accede desde** | admin-asignacion-detalle |
| **Navega hacia** | Modal de confirmación de cambios |
| **Estados a diseñar** | Sin cambios · Con cambios · Conflicto · Advertencia |

**Objetivo**

Modificar los datos de una asignación (docente, aula teórica y laboratorio práctico) evitando conflictos.

**Elementos visuales**

- Encabezado con curso y sección (solo lectura) y estado actual.

- Selector de **docente** con búsqueda y disponibilidad en la franja.

- Selector de **aula teórica** con capacidad, piso y estado.

- Selector de **laboratorio práctico** con capacidad, piso, software instalado y estado.

- Campos de día y horario cuando corresponda.

- Panel de **validación en tiempo real:** conflictos de horario, capacidad y compatibilidad de software.

- Botones «Cancelar» y «Guardar cambios».

**Interacciones y comportamiento**

- Las opciones no disponibles se muestran deshabilitadas con el motivo (por ejemplo, «Ocupado en esta franja»).

- Los conflictos se indican en línea y bloquean el guardado; las advertencias permiten continuar con confirmación.

- El botón «Guardar cambios» solo se habilita si existen modificaciones.

- Al guardar se abre el modal de confirmación de cambios (5.4).

- Salir con cambios sin guardar solicita confirmación.

### 5.3 Reasignación Inteligente de Espacio

| | |
|---|---|
| **ID de pantalla** | admin-reasignar-espacio |
| **Rol** | Administrativo / Jefatura |
| **Se accede desde** | Alerta; detalle de asignación; reporte con mantenimiento |
| **Navega hacia** | Modal de confirmación; admin-asignaciones |
| **Estados a diseñar** | Buscando alternativas · Con opciones · Compatibilidad parcial · Sin alternativas |

**Objetivo**

Trasladar un curso a un laboratorio alternativo verificando de forma automática la compatibilidad del software y la disponibilidad horaria.

**Elementos visuales**

- Resumen de la asignación de origen: curso, sección, horario, espacio actual, motivo del traslado (alerta, mantenimiento o decisión manual), software requerido y estudiantes matriculados.

- **Lista de espacios alternativos sugeridos**, ordenada por nivel de compatibilidad. Cada opción muestra: nombre, piso, capacidad frente a matriculados, disponibilidad en el horario del curso y **porcentaje o insignia de compatibilidad** de software.

- Detalle de software por opción, con requerido frente a instalado, marcando en verde lo compatible y en rojo lo incompatible (por ejemplo, MATLAB v2026 frente a v2021).

- Insignias de resultado: «Compatible», «Compatible parcial» y «No compatible».

- Filtros: piso, capacidad mínima y solo espacios totalmente compatibles.

- Campo opcional de motivo o comentario.

- Botones «Cancelar» y «Confirmar reasignación».

**Interacciones y comportamiento**

- Al abrir la pantalla, el motor consulta automáticamente los laboratorios y valida cuatro criterios: software requerido, capacidad, disponibilidad en el horario y estado operativo.

- Las opciones no aptas permanecen visibles pero deshabilitadas, con el motivo del rechazo.

- Seleccionar una opción muestra la comparación detallada y habilita «Confirmar reasignación».

- Si la opción tiene compatibilidad parcial, se exige confirmación explícita indicando los elementos faltantes.

- Si no hay alternativas totalmente compatibles, se muestra un estado informativo con opciones cercanas y la posibilidad de flexibilizar criterios.

- Tras confirmar, se registra el cambio, se actualizan admin-ocupacion y admin-asignaciones, se resuelve la alerta vinculada y se notifica a docente y estudiantes con la nueva ubicación y ruta.

### 5.4 Modales de Confirmación

| | |
|---|---|
| **ID de pantalla** | admin-confirmar-eliminar y modal de confirmación de cambios |
| **Rol** | Administrativo / Jefatura |
| **Se accede desde** | Detalle de asignación; edición de asignación |
| **Navega hacia** | Listado de asignaciones |
| **Estados a diseñar** | Confirmación · Procesando · Éxito · Error |

**Objetivo**

Prevenir acciones accidentales y comunicar con claridad su impacto antes de ejecutarlas.

**Modal de eliminación (admin-confirmar-eliminar)**

- Icono de advertencia y título «¿Eliminar asignación?».

- Resumen de la asignación (curso, sección, docente, espacio y horario) e indicación del impacto: estudiantes y docente afectados y liberación del espacio.

- Aviso de que la acción no se puede deshacer.

- Botón secundario «Cancelar» (foco inicial) y botón destructivo «Eliminar» en rojo.

- Opcional: campo para escribir el código del curso para confirmar en asignaciones con alta afectación.

**Modal de confirmación de cambios**

- Título «¿Guardar los cambios?».

- Comparativo «Antes / Después» de los campos modificados (docente, aula, laboratorio, horario).

- Advertencias no bloqueantes, si las hay.

- Casilla «Notificar a docente y estudiantes» activada por defecto.

- Botones «Volver a editar» y «Confirmar cambios».

**Interacciones y comportamiento (ambos modales)**

- Se cierran con la tecla Esc o el botón «Cancelar»; el foco queda atrapado dentro del modal mientras está abierto.

- Mientras se procesa la acción, el botón principal muestra un indicador de carga y se bloquean las acciones duplicadas.

- Tras la ejecución se muestra un aviso de éxito (toast) y se regresa al listado con la lista actualizada.

- Ante un error se mantiene el modal abierto con un mensaje explicativo y opción de reintentar.

## Anexo A. Matriz de pantallas

| **Portal** | **ID de pantalla** | **Descripción** |
|---|---|---|
| Estudiante | login-estudiante | Autenticación |
| Estudiante | inicio-estudiante | Dashboard de inicio |
| Estudiante | horario-estudiante | Horario diario y semanal |
| Estudiante | saie-mapa-ruta | Mapa e itinerario paso a paso |
| Estudiante | saie-ayuda | Centro de ayuda y FAQ |
| Estudiante | perfil-estudiante | Perfil y ajustes |
| Docente | inicio-docente | Dashboard con próxima clase y métricas |
| Docente | detalle-proxima-clase-docente | Detalle de clase y requerimientos de software |
| Docente | horario-docente-dia / horario-docente-semana | Horarios de clases |
| Docente | resumen-academico-docente | Mis asignaciones y desglose de horas |
| Docente | reportar-incidencia / incidencia-enviada | Reporte de incidencias y ticket |
| Administrativo | inicio-admin | Dashboard administrativo |
| Administrativo | admin-ocupacion | Mapa de ocupación por pisos |
| Administrativo | admin-alertas / saie-admin-alerta-detalle | Centro de alertas |
| Administrativo | admin-reportes / admin-reporte-detalle | Gestión de incidencias |
| Gestión | admin-asignaciones / admin-asignacion-detalle | Listado y detalle de asignaciones |
| Gestión | admin-editar-asignacion | Edición de asignaciones |
| Gestión | admin-reasignar-espacio | Reasignación inteligente |
| Gestión | admin-confirmar-eliminar | Modales de confirmación |

## Anexo B. Glosario

| **Término** | **Definición** |
|---|---|
| **Asignación** | Vínculo entre un curso/sección, un docente, un aula teórica, un laboratorio práctico y un horario. |
| **Aula** | Espacio destinado a sesiones teóricas. |
| **Laboratorio** | Espacio equipado con computadoras y software específico para sesiones prácticas. |
| **Reasignación** | Traslado de una sesión a otro espacio, validando compatibilidad de software, capacidad y disponibilidad. |
| **Alerta** | Conflicto detectado automáticamente, como incompatibilidad de software o capacidad excedida. |
| **Incidencia / Reporte** | Falla técnica notificada por un docente, con prioridad, evidencia y estado de resolución. |
| **Ticket** | Registro numerado generado al enviar una incidencia, con seguimiento de estados. |
| **Compatibilidad de software** | Grado en que las aplicaciones y versiones instaladas en un espacio cubren las requeridas por el curso. |
| **Estado vacío** | Pantalla sin datos que explica la situación y propone una acción. |
