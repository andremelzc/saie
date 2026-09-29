## 1. Título y Generalidades

### 1.1 Datos del documento

| **Campo** | **Detalle** |
|---|---|
| Proyecto | SAIE (Guía de Estilos UI/UX - Issue \#195) |
| Versión | 1.0 |
| Alcance | Fundamentos visuales (color, tipografía, espaciado, elevación) y componentes reutilizables de la aplicación móvil y web de SAIE, comunes a los portales Estudiante, Docente y Administrativo. |
| Fuente de los valores | Prototipo de SAIE. Los tokens que no figuran en el prototipo se marcan como «Propuesto». |
| Identidad visual | Guinda institucional como firma de marca, lienzo crema cálido de bajo deslumbramiento, serif editorial para títulos y marca, sans-serif funcional para la interfaz. Los colores de estado se reservan para ocupación, alertas y prioridades. |

### 1.2 Historial de versiones

| **Versión** | **Fecha** | **Autor** | **Descripción del cambio** |
|---|---|---|---|
| 1.0 | \[29/09/2026\] | Design Systems | Versión inicial de la guía de estilos: paleta, tipografía, componentes y accesibilidad (RNF-05). |

### 1.3 Principios de diseño

Los tres principios siguientes orientan cada decisión visual del sistema. Cuando dos criterios entren en conflicto, prevalece el principio de mayor número de usuarios beneficiados en su contexto de uso real.

| **Principio** | **Definición** | **Aplicación en el sistema** |
|---|---|---|
| **Claridad** | Cada pantalla comunica una sola prioridad y el estado de la infraestructura se entiende de un vistazo. | Un único botón primario por vista.<br>Jerarquía tipográfica marcada y KPIs de gran tamaño.<br>Estados con etiqueta, icono y color. |
| **Accesibilidad académica** | El sistema debe ser utilizable por toda la comunidad universitaria: estudiantes, docentes y personal administrativo, con distintas capacidades y dispositivos. | Contraste mínimo WCAG 2.1 AA en todo texto.<br>Color nunca como único portador de información.<br>Áreas táctiles de al menos 44×44 px. |
| **Legibilidad en movilidad** | El estudiante consulta SAIE de pie, en pasillos, con luz variable y una sola mano. | Fondo crema de bajo deslumbramiento y texto oscuro de alto contraste.<br>Cuerpo de texto de 16 px, acciones al alcance del pulgar.<br>Navegación inferior fija y mensajes breves. |

## 2. Paleta de Colores

La paleta se organiza en cuatro grupos: marca, superficies, texto y estados. Cada color se define como token de diseño para garantizar su uso consistente en diseño y desarrollo.

### 2.1 Colores base del sistema

| **Muestra** | **Nombre y token** | **HEX** | **Uso en el prototipo** | **Contraste clave** |
|---|---|---|---|---|
| **\#7B1113** | **Guinda Institucional**<br>--saie-primary | \#7B1113 | AppBars, botones primarios, tarjetas destacadas, pestaña activa y anillo de foco. | Blanco sobre guinda: 10.87:1 |
| **\#5C0D0E** | **Guinda Profundo**<br>--saie-primary-dark | \#5C0D0E | Estados pressed/hover del primario, degradado de tarjetas destacadas y barra de estado. | Blanco sobre guinda profundo: 13.83:1 |
| **\#FAF6ED** | **Crema Canvas**<br>--saie-canvas | \#FAF6ED | Fondo general de pantallas. Tono cálido que mejora la legibilidad. | Texto \#222222: 14.75:1 |
| **\#F9F6EE** | **Crema Canvas (variante)**<br>--saie-canvas-alt | \#F9F6EE | Variante detectada en el prototipo; diferencia imperceptible con el anterior. | Texto \#222222: 14.73:1 |
| **\#FFFFFF** | **Blanco**<br>--saie-surface | \#FFFFFF | Contenedores de tarjetas, inputs, modales y barra de navegación. | Texto \#222222: 15.91:1 |
| **\#222222** | **Texto principal**<br>--saie-text | \#222222 | Títulos, cuerpo de texto, valores y etiquetas de campos. | Sobre blanco: 15.91:1 |
| **\#666666** | **Texto secundario**<br>--saie-text-muted | \#666666 | Descripciones, metadatos, placeholders y etiquetas inactivas. | Sobre crema: 5.32:1 |

> **Nota:** El prototipo contiene dos valores de fondo crema (#FAF6ED y #F9F6EE) cuya diferencia es imperceptible. Se recomienda consolidar en #FAF6ED como único valor oficial durante la implementación y retirar la variante.

### 2.2 Colores de estado (ocupación y alertas)

| **Muestra** | **Nombre y token** | **HEX** | **Estados que representa** | **Regla de uso** |
|---|---|---|---|---|
| **\#2E7D32** | **Verde Éxito**<br>--saie-success | \#2E7D32 | Disponible, Resuelto, operación exitosa, Prioridad Baja. | Texto blanco sobre verde: 5.13:1 (AA). |
| **\#C0CA33** | **Amarillo Lima**<br>--saie-review | \#C0CA33 | En revisión. | Solo como relleno con texto \#222222 (8.89:1). No usar como color de texto (1.79:1). |
| **\#F57C00** | **Naranja Ámbar**<br>--saie-warning | \#F57C00 | Mantenimiento, Prioridad Media, advertencias. | Solo como relleno con texto \#222222 (5.88:1). No usar como color de texto (2.70:1). |
| **\#D32F2F** | **Rojo Alerta**<br>--saie-danger | \#D32F2F | Ocupado, Pendiente, Prioridad Alta, acciones destructivas. | Texto blanco sobre rojo: 4.98:1 (AA). Apto también como texto sobre blanco. |
| **\#E53935** | **Rojo Alerta Activa**<br>--saie-alert | \#E53935 | Indicador de Alerta activa: punto pulsante, bordes e iconografía. | Blanco sobre este rojo: 4.23:1. No usar con texto de tamaño normal; reservar para indicadores gráficos. |

> **Nota:** En el brief original, la familia «Naranja / Rojo» incluía los valores #D32F2F y #E53935, que son tonos rojos. En este sistema el naranja lo aporta #F57C00 y el rojo se divide en dos niveles: #D32F2F para elementos con texto y #E53935 como acento gráfico de alerta activa.

### 2.3 Tokens derivados (Propuestos)

Para completar los estados de interacción y las variantes suaves de los badges se proponen los siguientes tokens auxiliares. No figuran en el prototipo y requieren validación del equipo.

| **Muestra** | **Token** | **HEX** | **Uso** | **Contraste** |
|---|---|---|---|---|
| **\#E6DFD0** | --saie-divider | \#E6DFD0 | Separadores y contornos decorativos (no informativos). | Decorativo |
| **\#8A8578** | --saie-border | \#8A8578 | Bordes de inputs, dropdowns y áreas de carga. | 3.68:1 sobre blanco (mín. 3:1) |
| **\#F1EDE3** | --saie-disabled | \#F1EDE3 | Fondo de campos deshabilitados. | Texto \#666666: 4.91:1 |
| **\#E8F5E9** | --saie-success-tint / --saie-success-dark (#1B5E20) | \#E8F5E9 | Badge «Resuelto» (fondo suave y texto). | 7.00:1 |
| **\#FDECEA** | --saie-danger-tint / --saie-danger-dark (#B71C1C) | \#FDECEA | Badge «Alerta activa» y hover del botón de peligro (#B71C1C). | 5.74:1 |

### 2.4 Reglas de proporción y uso

- **Superficies (≈ 70 %):** crema como lienzo y blanco para contenedores. Toda tarjeta o input blanco se apoya sobre el lienzo crema.

- **Marca (≈ 20 %):** guinda en la AppBar, el botón primario, la pestaña activa y las tarjetas destacadas. No usar guinda para comunicar estados.

- **Estados (≈ 10 %):** verde, amarillo, naranja y rojo se reservan para semántica de ocupación, alerta y prioridad. No se emplean con fines decorativos.

- **Texto:** \#222222 para contenido principal y \#666666 para apoyo. Nunca usar un color de estado como color de texto de cuerpo.

- **Independencia del color:** todo estado combina color con etiqueta textual e icono (ver sección 4.3).

## 3. Tipografía y Jerarquía Visual

El sistema combina dos familias con roles diferenciados. El uso de un serif en títulos y marca aporta el carácter institucional académico; el sans-serif se emplea en la interfaz funcional para maximizar la legibilidad en pantallas pequeñas.

### 3.1 Familias tipográficas

| **Rol** | **Familia recomendada** | **Alternativas (fallback)** | **Uso** |
|---|---|---|---|
| **Serif** | Playfair Display | Georgia, «Times New Roman», serif | Títulos principales de bienvenida («Buen día…»), marca SAIE e identificadores de módulo. |
| **Sans-Serif** | Inter | Roboto, system-ui, -apple-system, «Segoe UI», sans-serif | Cuerpo de texto, etiquetas, inputs, tablas, botones, badges, navegación y valores numéricos. |

### 3.2 Escala tipográfica

| **Nivel** | **Familia** | **Tamaño / Interlineado** | **Peso** | **Uso** |
|---|---|---|---|---|
| **Marca SAIE** | Serif | 24 / 28 px · tracking +1.5 px | Bold (700) | Wordmark en AppBar y pantalla de login. |
| **H1** | Serif | 28 / 36 px | Bold (700) | Título de bienvenida («Buen día, \[nombre\]») y título principal de pantalla. |
| **H2** | Serif | 22 / 30 px | Bold (700) | Identificador de módulo y encabezados de sección mayor. |
| **H3** | Sans-Serif | 18 / 26 px | Bold (700) | Título de tarjeta, subsección y encabezado de modal. |
| **KPI / Cifra destacada** | Sans-Serif | 32 / 38 px · cifras tabulares | Bold (700) | Números grandes de tarjetas de métricas (por ejemplo, 18/24). |
| **Body** | Sans-Serif | 16 / 24 px | Regular (400) | Texto principal, contenido de inputs y descripciones. |
| **Body pequeño** | Sans-Serif | 14 / 20 px | Regular (400) | Texto secundario, filas de tabla y ayudas de campo. |
| **Label / Botón** | Sans-Serif | 16 / 20 px (botón) · 14 / 20 px (etiqueta) | Medium (500) | Texto de botones y etiquetas de formulario. |
| **Caption / Badge** | Sans-Serif | 12 / 16 px · tracking +0.2 px | Medium (500) | Badges, pills, etiquetas de navegación y metadatos. |

### 3.3 Ajuste para web de escritorio (≥ 1024 px)

| **Nivel** | **Móvil** | **Escritorio** |
|---|---|---|
| H1 | 28 / 36 px | 32 / 40 px |
| H2 | 22 / 30 px | 24 / 32 px |
| H3 | 18 / 26 px | 20 / 28 px |
| KPI | 32 / 38 px | 36 / 44 px |
| Body / Body pequeño / Caption | 16 / 14 / 12 px | Sin cambio |

### 3.4 Reglas tipográficas

- Máximo dos familias por pantalla. El serif no se utiliza en cuerpo de texto, tablas ni botones.

- Tamaño mínimo absoluto: 12 px (solo captions y badges). Inputs y cuerpo: 16 px, lo que además evita el zoom automático de campos en iOS.

- Longitud de línea recomendada: 45–75 caracteres; en móvil el ancho de pantalla lo regula de forma natural.

- Uso de mayúscula inicial de oración («Aulas ocupadas»); evitar texto completo en mayúsculas en cuerpos y etiquetas largas.

- Cifras tabulares (font-variant-numeric: tabular-nums) en KPIs, horarios y tablas para alinear dígitos.

- Tamaños definidos en unidades relativas (rem/sp) para respetar la configuración de texto del usuario hasta 200 %.

- Color de texto: \#222222 para títulos y cuerpo, \#666666 para apoyo, blanco sobre guinda.

## 4. Componentes UI Reutilizables

### 4.1 Fundamentos: espaciado, radios, elevación e iconografía

| **Fundamento** | **Valores** |
|---|---|
| **Espaciado (base 4 px)** | 4 · 8 · 12 · 16 · 24 · 32 · 48 px. Margen lateral de pantalla en móvil: 16 px. Separación entre tarjetas: 12–16 px. |
| **Radios de borde** | Inputs: 10 px · Tarjetas, botones y modales: 12 px · Pills y badges: 999 px (totalmente redondeado). |
| **Elevación** | E1 (tarjetas): 0 2px 8px rgba(34,34,34,0.08)<br>E2 (barra de navegación): 0 -2px 12px rgba(34,34,34,0.10)<br>E3 (modales): 0 8px 24px rgba(34,34,34,0.16) |
| **Iconografía** | Estilo lineal (outline), trazo de 2 px, tamaño estándar 24 px (20 px en línea con texto y 14 px dentro de badges). Todo icono informativo va acompañado de texto o etiqueta accesible. |
| **Cuadrícula** | Móvil: 4 columnas, márgenes de 16 px. Tablet: 8 columnas, márgenes de 24 px. Escritorio: 12 columnas, ancho máximo de 1200 px, con menú lateral de 240 px en el portal administrativo. |

### 4.2 Tarjetas de Métricas / KPIs

Las tarjetas de métricas resumen indicadores clave, como las aulas ocupadas o las alertas activas, en un formato escaneable. La cifra es el elemento dominante.

| **Propiedad** | **Especificación** |
|---|---|
| Contenedor | Fondo \#FFFFFF, radio de 12 px, elevación E1 (0 2px 8px rgba(34,34,34,0.08)). Sin borde. |
| Padding interno | 16 px (móvil) · 20 px (escritorio). Alto mínimo: 96 px. |
| Etiqueta | Body pequeño 14 px Regular, color \#666666 (por ejemplo, «Aulas ocupadas»). |
| Cifra destacada | KPI 32 px Bold, color \#222222; el total puede mostrarse en \#666666 (18/24). |
| Indicador secundario | Barra de progreso de 6 px de alto, radio 999 px, pista \#E6DFD0 y relleno según el estado. |
| Interacción | Tarjeta completa clicable con área táctil íntegra, estado pressed con fondo \#FAF6ED y flecha o icono de navegación opcional. |

**Variantes**

| **Variante** | **Características** | **Ejemplo** |
|---|---|---|
| **Estándar** | Fondo blanco, cifra en \#222222, barra en verde, ámbar o rojo según ocupación. | Aulas ocupadas 18/24 · Labs ocupados 8/12 |
| **Destacada** | Fondo guinda \#7B1113 (o degradado hacia \#5C0D0E), texto blanco. Se limita a una por pantalla. | Tarjeta «Próxima clase» con conteo regresivo |
| **Con alerta** | Fondo blanco con acento lateral de 4 px en \#D32F2F e icono de campana cuando el valor es mayor que cero. | Alertas activas 3 |

### 4.3 Badges y Pills de Estado

Los badges comunican estados de forma compacta. Todos combinan tres canales: color, icono y texto, de modo que la información no dependa solo del color.

| **Propiedad** | **Especificación** |
|---|---|
| Forma | Píldora (radio 999 px). |
| Dimensiones | Alto 24 px; padding horizontal 10 px; icono de 14 px con separación de 4 px respecto al texto. |
| Tipografía | Caption 12 px Medium, tracking +0.2 px, sin truncar. |
| Comportamiento | No interactivos por defecto. Si funcionan como filtro (chip), su área táctil se amplía a 44 px de alto sin cambiar el tamaño visual. |

**Catálogo de estados**

| **Badge** | **Relleno** | **Texto** | **Borde** | **Icono** | **Contraste** |
|---|---|---|---|---|---|
| **Disponible** | \#2E7D32 | \#FFFFFF | — | Check en círculo | 5.13:1 |
| **Ocupado** | \#D32F2F | \#FFFFFF | — | Usuario | 4.98:1 |
| **Pendiente** | \#FFFFFF | \#D32F2F | 1.5 px \#D32F2F | Reloj | 4.98:1 |
| **En revisión** | \#C0CA33 | \#222222 | — | Lupa | 8.89:1 |
| **Mantenimiento** | \#F57C00 | \#222222 | — | Llave | 5.88:1 |
| **Resuelto** | \#E8F5E9 | \#1B5E20 | 1.5 px \#2E7D32 | Check | 7.00:1 |
| **Alerta activa** | \#FDECEA | \#B71C1C | 1.5 px \#E53935 | Punto pulsante + campana | 5.74:1 |
| **Prioridad Alta** | \#D32F2F | \#FFFFFF | — | Bandera + «!» | 4.98:1 |
| **Prioridad Media** | \#F57C00 | \#222222 | — | Bandera | 5.88:1 |
| **Prioridad Baja** | \#FFFFFF | \#2E7D32 | 1.5 px \#2E7D32 | Bandera | 5.13:1 |

> **Nota:** Los badges de prioridad incluyen siempre el prefijo «Prioridad» para distinguirse de «Mantenimiento», que comparte el naranja. El punto del badge «Alerta activa» pulsa suavemente; debe desactivarse cuando el usuario tiene habilitada la opción «Reducir movimiento».

### 4.4 Formas de Navegación: Bottom Navigation Bar

La barra de navegación inferior es el mecanismo principal de navegación en móvil. Se mantiene fija en todas las pantallas de primer nivel y ubica las acciones al alcance del pulgar.

| **Propiedad** | **Especificación** |
|---|---|
| Contenedor | Fondo \#FFFFFF, borde superior de 1 px \#E6DFD0, elevación E2. Alto 64 px más el área segura inferior del dispositivo. |
| Estructura | 5 pestañas fijas de igual ancho. Cada pestaña: icono de 24 px, etiqueta Caption de 12 px Medium, separación de 4 px. |
| Estado inactivo | Icono y etiqueta en \#666666 (5.74:1 sobre blanco). |
| Estado activo | Icono y etiqueta en guinda \#7B1113, fondo de píldora suave (guinda al 8 %) detrás del icono y peso de etiqueta Bold. |
| Notificación numérica | Círculo \#D32F2F con número blanco de 12 px Bold, mínimo 18 px de diámetro, en el ángulo superior derecho del icono de Alertas. |
| Área táctil | Cada pestaña ocupa como mínimo 72 × 64 px en un ancho de 360 px, superando el mínimo de 44 × 44 px. |
| Comportamiento | Cambio de pestaña conserva el estado de cada sección. Tocar la pestaña activa devuelve a la raíz de la sección. |

**Pestañas**

| **\#** | **Etiqueta** | **Icono sugerido** | **Destino** |
|---|---|---|---|
| 1 | Inicio | Casa | Dashboard de inicio del rol |
| 2 | Ocupación / Horario | Cuadrícula / Calendario | Mapa de ocupación (Administrativo) o Horario (Estudiante y Docente) |
| 3 | Alertas | Campana | Centro de alertas con contador de pendientes |
| 4 | Reportes | Portapapeles | Reportes e incidencias |
| 5 | Perfil | Usuario | Perfil y ajustes |

> **Nota:** El brief indica «Alertas/Alertas» en la tercera pestaña; se unificó como «Alertas». La segunda pestaña cambia de etiqueta según el rol. Producto debe confirmar el contenido de las pestañas 3 y 4 para los roles Estudiante y Docente, que en el Documento de Diseño UI/UX (Issue #194) no disponen de Centro de Alertas.

En web de escritorio (≥ 1024 px), la barra inferior se transforma en un menú lateral de 240 px con las mismas cinco entradas, icono a la izquierda y etiqueta en Body 16 px.

### 4.5 Formularios e Inputs

Campo de texto

| **Propiedad** | **Especificación** |
|---|---|
| Contenedor | Fondo \#FFFFFF, borde de 1 px \#8A8578, radio de 10 px, alto de 48 px, padding horizontal de 16 px. |
| Etiqueta | Sobre el campo, Label 14 px Medium, \#222222. Los campos obligatorios se marcan con asterisco y texto «(obligatorio)» para lectores de pantalla. |
| Texto ingresado | Body 16 px Regular, \#222222. Placeholder en \#666666. |
| Texto de ayuda / error | Body pequeño 14 px bajo el campo; ayuda en \#666666, error en \#D32F2F con icono. |

**Estados**

| **Estado** | **Borde** | **Fondo** | **Otros** |
|---|---|---|---|
| Reposo | 1 px \#8A8578 | \#FFFFFF | Placeholder \#666666 |
| Foco | 2 px \#7B1113 | \#FFFFFF | Anillo exterior de 3 px guinda al 20 % |
| Error | 2 px \#D32F2F | \#FFFFFF | Icono de error y mensaje descriptivo debajo |
| Éxito | 1 px \#2E7D32 | \#FFFFFF | Icono de check a la derecha |
| Deshabilitado | 1 px \#E6DFD0 | \#F1EDE3 | Texto \#666666, sin interacción |

Drop-down de selección

- Mismo contenedor que el campo de texto, con icono de chevron de 24 px alineado a la derecha.

- Lista desplegable sobre fondo blanco, radio 12 px, elevación E3; cada opción con alto mínimo de 48 px y separación de 1 px \#E6DFD0.

- Opción seleccionada con fondo guinda al 8 %, texto en guinda y check a la derecha.

- En móvil, listas de más de 5 opciones se presentan en una hoja inferior (bottom sheet) con búsqueda.

Área de carga de archivos

| **Propiedad** | **Especificación** |
|---|---|
| Contenedor | Borde punteado (dashed) de 1.5 px en guinda \#7B1113, radio 12 px, fondo \#FFFDF8, alto mínimo de 120 px. |
| Contenido | Icono de carga de 32 px en guinda, texto «Toca para adjuntar o arrastra tus archivos» (Body 16 px) y ayuda «PNG o JPG, hasta 5 MB» (14 px, \#666666). |
| Estados | Reposo · Foco/arrastre (fondo guinda al 8 %, borde sólido) · Cargando (barra de progreso) · Error (borde \#D32F2F y mensaje). |
| Miniaturas | 72 × 72 px, radio 8 px, con botón de eliminar de 44 × 44 px de área táctil en la esquina superior derecha. |
| Accesibilidad | El área es operable con teclado (Enter/Espacio) y ofrece alternativa «Tomar foto» en móvil. |

### 4.6 Botones

| **Propiedad** | **Especificación** |
|---|---|
| Dimensiones | Alto 48 px (móvil y web), mínimo 44 px en contextos compactos. Padding horizontal de 24 px. Ancho mínimo de 88 px. |
| Forma y tipografía | Radio de 12 px. Label 16 px Medium, sin mayúsculas forzadas. Icono opcional de 20 px a la izquierda del texto. |
| Foco | Contorno visible de 3 px \#222222 con separación de 2 px, en todas las variantes. |
| Ubicación | En móvil, ancho completo y apilados (primario arriba). En modales y formularios web, secundario a la izquierda y primario a la derecha. |
| Regla de jerarquía | Un solo botón primario por vista o modal. |
| Estado de carga | El botón conserva su ancho, sustituye el icono por un indicador circular de 20 px y bloquea nuevas pulsaciones; el texto puede pasar a forma verbal en progreso («Enviando…»). |

**Variantes y estados**

| **Variante** | **Reposo** | **Hover / Pressed** | **Deshabilitado** | **Uso** |
|---|---|---|---|---|
| **Primario** | Fondo \#7B1113, texto \#FFFFFF | Fondo \#5C0D0E | Fondo \#E6DFD0, texto \#666666 | Acción principal: Iniciar sesión, Guardar, Enviar reporte, Confirmar reasignación. |
| **Secundario** | Fondo \#FFFFFF o transparente, borde 1.5 px \#7B1113, texto \#7B1113 | Fondo guinda al 8 % | Borde \#E6DFD0, texto \#666666 | Acciones alternativas: Ver ruta, Volver a editar, Reasignar. |
| **Peligro** | Fondo \#D32F2F, texto \#FFFFFF | Fondo \#B71C1C | Fondo \#E6DFD0, texto \#666666 | Acciones destructivas: Eliminar asignación, Descartar reporte. |
| **Cancelar** | Fondo transparente, borde 1.5 px \#8A8578, texto \#222222 | Fondo \#222222 al 6 % | Borde \#E6DFD0, texto \#666666 | Cierre sin ejecutar: Cancelar en formularios y modales. |

## 5. Cumplimiento de Accesibilidad y RNF-05

Esta sección describe cómo el sistema de diseño satisface el Requisito No Funcional de Accesibilidad y Legibilidad (RNF-05). El sistema toma como referencia las Pautas de Accesibilidad para el Contenido Web (WCAG) 2.1 y 2.2, nivel AA, complementado con criterios AAA en texto principal y áreas táctiles.

> **Nota:** El enunciado literal del RNF-05 debe citarse desde la especificación de requisitos del proyecto. Esta sección traduce su intención (accesibilidad y legibilidad) a criterios medibles de diseño.

### 5.1 Alto contraste tipográfico

La combinación de texto oscuro (#222222) sobre fondos claros (crema \#FAF6ED y blanco \#FFFFFF) produce razones de contraste de 14.75:1 y 15.91:1, muy superiores al mínimo de 4.5:1 exigido por WCAG AA para texto normal y al 7:1 del nivel AAA. Esta decisión garantiza la lectura en condiciones adversas: luz solar intensa en exteriores, brillo reducido de pantalla y visión reducida.

El tono crema, además de suavizar el deslumbramiento propio del blanco puro, mantiene la relación de contraste en un rango AAA sin sacrificar la calidez de la marca institucional. El texto secundario \#666666 conserva 5.32:1 sobre crema y 5.74:1 sobre blanco, por lo que también cumple AA.

Tabla de contraste verificada

| **Combinación (texto / fondo)** | **Ratio** | **Resultado WCAG** |
|---|---|---|
| \#222222 sobre \#FFFFFF | 15.91:1 | **AAA** |
| \#222222 sobre \#FAF6ED | 14.75:1 | **AAA** |
| \#FFFFFF sobre \#5C0D0E | 13.83:1 | **AAA** |
| \#FFFFFF sobre \#7B1113 | 10.87:1 | **AAA** |
| \#7B1113 sobre \#FAF6ED | 10.08:1 | **AAA** |
| \#222222 sobre \#C0CA33 | 8.89:1 | **AAA** |
| \#666666 sobre \#FFFFFF | 5.74:1 | **AA** |
| \#666666 sobre \#FAF6ED | 5.32:1 | **AA** |
| \#222222 sobre \#F57C00 | 5.88:1 | **AA** |
| \#FFFFFF sobre \#2E7D32 | 5.13:1 | **AA** |
| \#FFFFFF sobre \#D32F2F | 4.98:1 | **AA** |
| \#D32F2F sobre \#FAF6ED | 4.62:1 | **AA** |
| \#FFFFFF sobre \#E53935 | 4.23:1 | **Solo texto grande** |
| \#F57C00 sobre \#FFFFFF | 2.70:1 | **No apto como texto** |
| \#C0CA33 sobre \#FFFFFF | 1.79:1 | **No apto como texto** |

> **Nota:** Los colores #C0CA33 y #F57C00 no cumplen contraste como texto sobre fondos claros. Por ello se usan únicamente como relleno de badges con texto #222222. #E53935 no debe usarse con texto de tamaño normal; solo para indicadores gráficos y texto grande (≥ 24 px, o ≥ 18.66 px en negrita).

### 5.2 Áreas táctiles mínimas (Touch Targets)

Todo elemento interactivo debe ofrecer un área táctil de al menos **44 × 44 px**, equivalente al criterio WCAG 2.5.5 (AAA) y a la guía de Apple (44 pt). Esto supera el mínimo AA de WCAG 2.2 (2.5.8: 24 × 24 px) y se acerca a los 48 dp recomendados por Material Design. La medida es compatible con el uso con una sola mano en movimiento.

| **Elemento** | **Tamaño visual** | **Área táctil mínima** | **Notas** |
|---|---|---|---|
| Botones | Alto 48 px, ancho ≥ 88 px | 48 × 88 px | Cumple con holgura. |
| Botones de icono | Icono 24 px | 44 × 44 px | Padding de 10 px alrededor del icono. |
| Pestañas de navegación inferior | Icono 24 px + etiqueta | ≥ 72 × 64 px | Toda la pestaña es táctil. |
| Campos de texto y drop-downs | Alto 48 px | 48 px de alto, ancho completo | La etiqueta también enfoca el campo. |
| Filas de lista y tarjetas clicables | Alto variable | ≥ 56 px de alto | Toda la fila responde. |
| Chips de filtro y badges interactivos | Alto 32 px | 44 px de alto | Se amplía el área invisible (hit slop). |
| Checkbox y radio | Control 24 px | 44 × 44 px | La etiqueta forma parte del área. |
| Interruptor (switch) | 52 × 32 px | 52 × 44 px | Alto ampliado a 44 px. |
| Eliminar miniatura de archivo | Icono 20 px | 44 × 44 px | Ubicado en la esquina de la miniatura. |

**Separación entre objetivos:** mínimo de 8 px entre elementos interactivos contiguos para reducir toques accidentales. Las acciones destructivas se separan de las primarias por al menos 16 px.

### 5.3 Otras pautas de accesibilidad y legibilidad

- **Independencia del color (WCAG 1.4.1):** todo estado incluye texto e icono además del color; en el mapa de ocupación cada celda añade un icono o patrón por estado.

- **Contraste de componentes (WCAG 1.4.11):** bordes de inputs (#8A8578, 3.68:1) e iconos informativos mantienen al menos 3:1 frente a su fondo.

- **Foco visible (WCAG 2.4.7):** contorno de 3 px \#222222 con separación de 2 px en botones y elementos interactivos; foco de inputs en guinda de 2 px.

- **Escalado de texto (WCAG 1.4.4):** la interfaz debe soportar el texto ampliado al 200 % sin pérdida de contenido ni funcionalidad; se usan unidades relativas.

- **Reducción de movimiento:** las animaciones (indicador pulsante de alerta, conteo regresivo) se atenúan cuando el usuario activa esta preferencia del sistema.

- **Lectores de pantalla:** cada icono sin texto tiene etiqueta accesible; los badges anuncian su estado completo (por ejemplo, «Estado: disponible»); los cambios dinámicos (alertas nuevas) se comunican con regiones de anuncio en vivo.

- **Mensajes de error (WCAG 3.3.1 y 3.3.3):** siempre en texto, junto al campo, indicando cómo corregirlo.

- **Orientación y reflujo:** el diseño funciona en vertical y horizontal, y se reorganiza sin scroll horizontal hasta 320 px de ancho.

### 5.4 Lista de verificación para QA

| **Criterio** | **Umbral** | **Cómo verificar** |
|---|---|---|
| Contraste de texto normal | ≥ 4.5:1 (AA) | Herramientas de contraste (por ejemplo, WebAIM Contrast Checker) y auditoría con Lighthouse o axe. |
| Contraste de texto grande y componentes | ≥ 3:1 | Inspección manual de bordes, iconos e indicadores. |
| Áreas táctiles | ≥ 44 × 44 px | Inspección de layout en el navegador y prueba en dispositivo real. |
| Independencia del color | Todo estado con texto o icono | Revisión en escala de grises y con simulador de daltonismo. |
| Texto ampliado | Hasta 200 % sin pérdida | Prueba con tamaño de fuente del sistema y zoom del navegador. |
| Lector de pantalla | Flujos principales operables | Pruebas con TalkBack (Android) y VoiceOver (iOS). |
| Navegación por teclado (web) | Orden lógico y foco visible | Recorrido completo con Tab y Shift+Tab. |

Anexo A. Tokens de diseño (referencia para desarrollo)

Definición de los tokens principales como variables CSS. Los tokens marcados como «Propuesto» requieren validación.

```css
:root {
/* Marca */
--saie-primary: #7B1113;
--saie-primary-dark: #5C0D0E;
/* Superficies */
--saie-canvas: #FAF6ED;
--saie-surface: #FFFFFF;
/* Texto */
--saie-text: #222222;
--saie-text-muted: #666666;
/* Estados */
--saie-success: #2E7D32;
--saie-review: #C0CA33;
--saie-warning: #F57C00;
--saie-danger: #D32F2F;
--saie-alert: #E53935;
/* Derivados (Propuesto) */
--saie-divider: #E6DFD0;
--saie-border: #8A8578;
--saie-disabled: #F1EDE3;
--saie-success-tint: #E8F5E9; --saie-success-dark: #1B5E20;
--saie-danger-tint: #FDECEA; --saie-danger-dark: #B71C1C;
/* Forma y elevación */
--saie-radius-input: 10px;
--saie-radius-card: 12px;
--saie-radius-pill: 999px;
--saie-shadow-1: 0 2px 8px rgba(34,34,34,0.08);
--saie-shadow-2: 0 -2px 12px rgba(34,34,34,0.10);
--saie-shadow-3: 0 8px 24px rgba(34,34,34,0.16);
/* Tipografía */
--saie-font-serif: 'Playfair Display', Georgia, 'Times New Roman', serif;
--saie-font-sans: Inter, Roboto, system-ui, -apple-system, 'Segoe UI', sans-serif;
}
```
