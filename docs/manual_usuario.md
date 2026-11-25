# Manual de usuario — SAIE

> **Issue:** 6.9 (#197) · **Versión del sistema:** `develop` al 25/11/2026
> **Para quién es:** estudiantes, docentes, Coordinación Académica y Jefatura de Laboratorios de la FISI.
> **Sistema en línea:** <https://saie-plum.vercel.app/>

SAIE asigna las aulas y los laboratorios de cada sección y le muestra a cada persona dónde le toca clase. Este manual explica qué puede hacer cada rol y cómo. Para recorrer el sistema caso por caso (incluidos los errores esperados), use la [Guía de pruebas manuales por rol](guia_pruebas_por_rol.md).

---

## 1. Conceptos básicos

| Término | Qué significa |
|---|---|
| **Espacio** | Un aula teórica o un laboratorio del edificio. |
| **Aula teórica** | Sin computadoras; su capacidad real es su aforo. |
| **Laboratorio** | Con computadoras; su capacidad real es el aforo menos las PCs malogradas, y tiene software instalado. |
| **Sección** | Un grupo de un curso en un periodo (por ejemplo `202SW0805` sección `2-LAB`). |
| **Corrida** | Una ejecución del motor de asignación. |
| **Escalada / en revisión** | Sección a la que el motor no pudo darle espacio; queda para que Coordinación la resuelva. Nunca se muestra con un aula falsa. |
| **Periodo** | Semestre académico (`2026-1`, `2026-2`). Solo uno está **vigente**; los demás están en preparación o cerrados. |
| **Pabellón antiguo / nuevo** | Los dos edificios de la facultad, unidos por el patio. La única entrada desde la calle está en el pabellón antiguo. |

---

## 2. Acceso al sistema

### 2.1 Consulta pública (sin cuenta)

En la página de inicio, **«Consultar»** (`/consulta`) permite buscar:

- **por código de alumno** (8 dígitos): sus cursos y aulas del periodo vigente;
- **por código de curso** (por ejemplo `202SW0805`): sus secciones y los espacios asignados.

La consulta pública nunca muestra datos de salud ni datos personales.

### 2.2 Iniciar sesión

Cada rol tiene su propia puerta de entrada:

| Rol | Pantalla de ingreso | Usuario |
|---|---|---|
| Estudiante | `/login/alumno` | Código de alumno |
| Docente | `/login/docente` | Código de docente |
| Coordinación Académica y Jefatura de Laboratorios | `/login/admin` | Usuario asignado |

- **Primer ingreso:** la clave inicial de alumnos y docentes es su propio código. Al entrar, el sistema obliga a cambiarla en `/cambiar-clave` y no deja usar el portal hasta hacerlo.
- **Clave olvidada o cuenta bloqueada:** tras 5 intentos fallidos el usuario queda bloqueado 10 minutos. Coordinación puede restablecer la clave (ver §5.8); la clave temporal también obliga a cambiarla.
- **Servidor dormido:** si nadie usó el sistema en los últimos 15 minutos, el primer ingreso puede tardar hasta un minuto o fallar por tiempo de espera. Reintente una vez.

---

## 3. Portal del estudiante (`/estudiante`)

El portal está pensado para el celular. El menú tiene: **Inicio, Horario, Perfil, Mapa, Ruta**, y en «Más»: **Telegram, Ayuda y Configuración**.

| Pantalla | Para qué sirve |
|---|---|
| **Inicio** | Su próxima clase con el aula, el resto del día y la semana. |
| **Horario** | La semana completa, cada clase con su espacio. Las clases de hoy se marcan como *En curso*, *Próxima* o *Finalizada*. Una sección en revisión aparece como pendiente, sin aula. |
| **Perfil** | Datos personales y ficha médica. Desde aquí se **declara la movilidad reducida** (§3.1). |
| **Mapa** | Plano del edificio por piso (2D) o maqueta 3D, con sus aulas resaltadas. |
| **Ruta** | Recorrido de referencia desde la entrada principal (u otro lugar) hasta el aula. Si tiene movilidad reducida aprobada, la ruta usa el ascensor. El plano no tiene escala en metros: el recorrido es orientativo. |
| **Telegram** | Vincula su cuenta con el bot de SAIE para recibir el resumen diario de clases y el aviso cuando le cambian de aula. Se puede desvincular en cualquier momento. |
| **Ayuda** | Preguntas frecuentes del portal. |
| **Configuración** | Texto grande y reducción de animaciones. |

### 3.1 Declarar movilidad reducida

1. En **Perfil**, en la ficha médica, marque que tiene movilidad reducida. Si es temporal, indique la **fecha de fin**.
2. La declaración queda **pendiente** hasta que Coordinación Académica la revise.
3. Al aprobarla, el sistema reasigna sus secciones dando prioridad al **piso 1**. El perfil muestra el resultado (cuántas clases quedaron en el piso 1).
4. Si no hay lugar en el piso 1, su clase queda en el piso más cercano al ascensor y Coordinación recibe una alerta de accesibilidad.
5. Si se rechaza, el perfil muestra el motivo.

---

## 4. Portal del docente (`/docente`)

Menú: **Inicio, Horario, Espacios, Incidencias y Software**.

| Pantalla | Para qué sirve |
|---|---|
| **Inicio** | Su próxima clase, las de hoy y la semana, y la tarjeta **«Aulas en el piso 1»** para declarar movilidad reducida (misma aprobación de Coordinación que el alumno; admite fecha de fin). |
| **Horario** | Sus secciones con los espacios asignados. En la pestaña **«Laboratorio»** puede pedir **dictar todo en laboratorio** una sección de teoría (§4.1). |
| **Espacios** | Explorador de aulas y laboratorios con filtros por tipo y piso. En un laboratorio donde tiene clase ve PCs operativas, malogradas y software instalado. |
| **Incidencias** | Reporta problemas de un espacio (§4.2) y sigue el estado de los que ya reportó. |
| **Software** | Solicita software que no está en el catálogo (§4.3) y ve el estado de sus solicitudes. |

### 4.1 Dictar todo en laboratorio

Por defecto, la teoría recibe un aula y el laboratorio un laboratorio. Si necesita dictar la teoría en el laboratorio:

1. En **Horario → Laboratorio**, elija la sección de teoría (solo aparecen las que tienen laboratorio en su grupo, por ejemplo `2` y `2-LAB`).
2. Escriba la justificación (10 a 500 caracteres). La pantalla muestra cómo quedaría el horario.
3. Coordinación aprueba o rechaza; el resultado y, si corresponde, el motivo aparecen en la misma pestaña.

### 4.2 Reportar una incidencia

1. **Incidencias → Nueva**: elija el espacio, el tipo (por ejemplo *Equipo no operativo*), la prioridad y describa el problema (mínimo 5 caracteres).
2. Opcionalmente adjunte **una foto** como evidencia (JPEG, PNG o WebP, hasta 2 MB).
3. Al enviar recibe un **identificador de seguimiento**; la incidencia queda *Pendiente*.
4. Jefatura la atiende; las de prioridad **Alta** le llegan además por Telegram. Cuando la cierra, usted ve *Resuelta* o *Descartada* con el comentario de cierre.

### 4.3 Solicitar software

1. **Software → Nueva solicitud**: nombre, versión, sección donde lo necesita y justificación.
2. Si el programa ya está en el catálogo, el sistema lo indica: no hay nada que solicitar.
3. Coordinación aprueba (y puede añadirlo a los requisitos de la sección) o rechaza con motivo.

---

## 5. Panel de Coordinación Académica (`/admin`)

Menú: **Inicio, Espacios, Alertas, Carga**, y en «Más»: **Secciones, Accesibilidad, Dictar en laboratorio, Periodos, Historial, Mapa e Informe**. Desde el inicio se llega también a altas de cuentas, claves, catálogo de software, solicitudes de software, incidencias y laboratorios.

### 5.1 Inicio: correr la asignación y revisar escaladas

- **Métricas:** secciones que esperan revisión, alertas pendientes e incidencias.
- **Correr la asignación:** ejecuta el motor sobre todo el periodo vigente (pide confirmación). El resultado distingue secciones con aula nueva, las que conservan la suya y las que quedaron en revisión, y muestra el veredicto del verificador (sin dobles reservas).
- **Secciones en revisión:** cada una con su motivo (capacidad, software, horario…). **«Reintentar»** vuelve a evaluarla; si nada cambió, lo explica.
- **Datos incompletos:** secciones sin horario cargado, con el acceso «Cargar horarios». No cuentan como escaladas.
- **Reorganizar con prioridad:** solo durante las **2 primeras semanas** del periodo. Procesa primero las secciones en revisión y puede mover otras de aula; antes de confirmar muestra cuántas cambiarían. Los alumnos afectados reciben el aviso por Telegram.

> La asignación también corre sola cada madrugada (02:00, hora de Lima).

### 5.2 Carga de datos (`/admin/carga`)

Los datos entran por archivos CSV, en este orden: **docentes → cursos y secciones → horarios → matrículas**. La pestaña **Guía** explica las columnas y **Plantillas** descarga ejemplos; el detalle está en la [Guía de CSV](guia-csv.md).

- **Todo o nada:** si el archivo tiene un error, no se guarda ninguna fila y se listan todos los errores (se pueden descargar en CSV).
- **Vista previa:** antes de guardar, el sistema muestra qué cambiará (por ejemplo, secciones que quedarán inactivas por no venir en el archivo) y pide confirmación.
- **Reemplazo:** cargar horarios o matrículas **reemplaza** los de cada sección incluida. No suba archivos parciales de secciones reales.
- **Avisos:** un docente o alumno con dos clases a la vez no impide guardar, pero se informa.
- Los archivos guardados desde Excel en español (Windows-1252, separador `;`) se aceptan; los que tienen caracteres dañados se rechazan con instrucciones.

### 5.3 Espacios y secciones

- **Espacios:** alta y edición de aulas y laboratorios (aforo, habilitado, descripción de uso, contigüidad). Deshabilitar un espacio con clases o bajar su aforo genera una **alerta de capacidad**.
- **Secciones:** editar el tipo de espacio que necesita, el docente, el software requerido (con versión mínima o exacta) y **el horario**. Al guardar un horario nuevo la sección se reasigna, y se avisa si el docente quedaría con dos clases a la vez.

### 5.4 Alertas

Filtro por tipo: **Software, Capacidad y Accesibilidad**.

- **Reubicar secciones** (capacidad y software): reasigna las secciones afectadas; el aviso resume cuántas cambiaron, cuántas conservan su aula y cuántas quedaron en revisión.
- **Marcar como resuelta:** cierra la alerta sin mover nada (las de accesibilidad solo se resuelven así).

### 5.5 Accesibilidad y «Dictar en laboratorio»

- **Accesibilidad:** lista las declaraciones de movilidad reducida pendientes y aprobadas de alumnos y docentes. Al aprobar, el sistema reasigna sus secciones y muestra el resultado; al rechazar, se escribe el motivo.
- **Dictar en laboratorio:** solicitudes de los docentes (§4.1) para aprobar o rechazar.

### 5.6 Periodos

- **Registrar periodo:** crea uno **en preparación** (por ejemplo `2027-1`) para cargar sus datos sin que alumnos y docentes lo vean.
- **Activar periodo:** el nuevo pasa a **vigente** y el anterior a **cerrado** en el mismo paso. Un periodo cerrado solo admite consulta y no se puede reactivar.

### 5.7 Software

- **Catálogo:** alta, edición y baja de programas. Uno dado de baja no se puede asignar.
- **Solicitudes de software:** aprobar (opcionalmente añadiéndolo a la sección) o rechazar con motivo. Añadir un software que ningún laboratorio tiene hace que la sección quede en revisión hasta que Jefatura lo instale.

### 5.8 Cuentas

- **Alta de alumno / docente:** crea la cuenta con clave inicial igual al código.
- **Claves:** restablece la clave de un alumno o docente; muestra una clave temporal **una sola vez** y obliga a cambiarla.

### 5.9 Historial, mapa e informe

- **Historial:** asignaciones por periodo y registro de actividad (quién hizo qué, con valor anterior y nuevo).
- **Mapa:** ocupación de los espacios por piso.
- **Informe de salones:** las secciones del periodo con el aula asignada, listo para presentar.

---

## 6. Panel de Jefatura de Laboratorios (`/admin`)

Menú: **Inicio, Alertas, Incidencias, Laboratorios** y **Cambio de laboratorio**. Jefatura solo ve y edita los laboratorios a su cargo, y solo puede cambiar PCs malogradas y software.

| Pantalla | Para qué sirve |
|---|---|
| **Inicio** | Laboratorios activos, PCs operativas e incidencias pendientes. |
| **Laboratorios** | Tarjetas con el estado de cada laboratorio; filtros *Con alerta, Libres ahora, Ocupados ahora, No asignables*. |
| **Cambio de laboratorio** | Registra **PCs malogradas** y **software instalado** con un solo botón de guardar. Si la capacidad baja por debajo de los alumnos de una sección, se genera una alerta de capacidad para Coordinación. |
| **Incidencias** | Bandeja de las incidencias de los docentes (Alta primero) con su foto, si la tienen. Se cierran como *Resuelta* o *Descartada* con un comentario. |
| **Alertas** | Ve las alertas de sus laboratorios y puede marcarlas como resueltas; **reubicar** secciones es tarea de Coordinación. |

Si está configurado el canal de Telegram de Jefatura, llegan allí las incidencias de prioridad Alta y las alertas nuevas de capacidad y software.

---

## 7. Flujos entre roles

| Flujo | Recorrido |
|---|---|
| **PCs malogradas** | Jefatura registra PCs malogradas → alerta de capacidad → Coordinación reubica → alumnos y docente ven el aula nueva (y reciben aviso por Telegram). |
| **Incidencia** | Docente reporta → Jefatura la atiende y, si corresponde, registra PCs malogradas → cierra con comentario → el docente lo ve. |
| **Software nuevo** | Docente solicita → Coordinación aprueba y lo añade a la sección → la sección queda en revisión → Jefatura lo instala en un laboratorio → Coordinación reintenta. |
| **Movilidad reducida** | Alumno o docente declara → Coordinación aprueba → reasignación con prioridad al piso 1 → si no hay lugar, alerta de accesibilidad. |
| **Cambio de semestre** | Coordinación registra el periodo nuevo → carga sus datos → corre la asignación → activa el periodo. |

---

## 8. Limitaciones conocidas

- **Catálogo de software vacío:** hasta que el equipo apruebe y cargue el catálogo (issue #438), los requisitos de software no restringen la asignación.
- **Sin asignación manual a un espacio concreto:** una sección en revisión sale de ese estado al cambiar sus datos o los espacios, con «Reintentar», con «Reubicar» desde una alerta o, al inicio del ciclo, con «Reorganizar con prioridad».
- **Recorrido de referencia:** el plano no tiene escala; la ruta orienta, no mide.
- **Sin ciclo de verano:** por ahora solo existen los periodos `AAAA-1` y `AAAA-2`.
- El primer acceso tras 15 minutos sin uso puede tardar (servidor gratuito).
