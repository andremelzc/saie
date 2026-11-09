# Spec 07: UI/UX, Guía de Estilos y Activos SVG

> **Épica:** `epic:docs` / Frontend UI  
> **Issues Cubiertos:** #6.6, #6.7, #6.10, #6.11, #6.12, #4.23  
> **Roles:** FE, LP  
> **Documentos de Referencia:** [`docs/arquitectura.md`](../arquitectura.md)

---

## 1. Visión General del Módulo

Especifica el sistema de diseño visual (UI/UX), la paleta de colores acorde a las pautas de diseño moderno (Tailwind CSS), la librería de componentes reutilizables en React y la estructuración de los planos en formato SVG por piso y pabellón.

---

## 2. Componentes e Issues Técnicos

### 2.1 Issue 6.6 — Documento de Diseño (UI/UX)
* **Definición:** Wireframes, arquitectura de información y flujos de pantalla para:
  1. Portal del Alumno (Consulta rápida, Horario, Perfil, Ruta).
  2. Panel de Administración (Alertas, Mapa 2D/3D por piso, Gestión de Espacios).
  3. Portal Docente (Horarios, Incidencias, Explorador de laboratorios).

### 2.2 Issue 6.7 — Guía de Estilos y Tokens de Diseño
* **Configuración:** `frontend/tailwind.config.js`
* **Tokens de Color:**
  * Primario: Slate / Indigo profundo (`#1e1b4b`, `#312e81`)
  * Secundario / Acento: Teal brillante (`#0d9488`)
  * Estado Disponible: Verde esmeralda (`#10b981`)
  * Estado Ocupado: Azul slate (`#64748b`)
  * Estado Alerta / PCs Malogradas: Ámbar / Rojo coral (`#f59e0b`, `#ef4444`)
* **Tipografía:** Font Sans moderna (Inter / Outfit / Roboto).

### 2.3 Issue 6.10 — Planos SVG por Piso y Pabellón
* **Ubicación de Activos:** `assets/planos/piso-1.svg`, `piso-2.svg` y `piso-3.svg`. Cada archivo trae los dos pabellones (nuevo y antiguo) del piso.
* **Requisitos del SVG:**
  * Cada espacio es un `<rect>` o `<polygon>` con `id` único con la forma `{PABELLÓN}-{CÓDIGO}` (p. ej. `NUE-101`, `ANT-laboratorio-1`), una clase (`espacio aula`, `espacio laboratorio`, `administrativo`…) y `data-clase`.
  * Capas con nombre (`espacios`, `escaleras`, `ascensores`, `muros`, `puertas`, `entradas`, `etiquetas`…).
  * Clases CSS manipulables dinámicamente desde el DOM de React para aplicar colores de ocupación/alerta.
  * Coordenadas optimizadas para el cálculo de centroides de la vista 3D (Three.js) y el trazador de rutas.
* **Vínculo con la base de datos:** el `id` de la figura es la clave que enlaza con `Espacio` (`modelo-datos.md` §4.1: el `identificador` "coincide con id en planos SVG"). La regla es mecánica, sin tablas intermedias: `id del plano = prefijo(pabellon) + "-" + código`. El código debe ser único dentro del pabellón, sin repetirse entre aula y laboratorio.

### 2.4 Issue 4.23 — Mapa de Ocupación 3D y Conversión de Planos
* **Conversor de planos** (`tools/planos/convertir-plano.mjs`, sin dependencias, ver su `README.md`). Los planos se dibujan en Canva, que exporta sin ids ni texto legible; el conversor los convierte en el SVG limpio de §2.3:
  1. Detecta cada figura por su **color de relleno** (aula `#b2d9ff`, laboratorio `#d3c8ff`, escalera `#ffbdbd`, baño `#ff86e4`, administrativo `#efe7cb` (o `#3a7ebf`), patio `#d0ffaf`, auditorio `#802323`, biblioteca `#faff93`, comedor `#ffbd59`, sala sin nombre `#dbe4ee`, puerta `#ff751f`; el lila pequeño es un ascensor), conserva los muros y descarta el título, la nota y las etiquetas. Si la figura trae `data-codigo` y `data-nombre` (los planos de `tools/planos/fuentes/`), se usan tal cual y no hace falta la tabla; `--marco-fijo` conserva las coordenadas para que los tres pisos compartan marco.
  2. Genera una vista con cada figura rotulada (`FIG-01`…) y la tabla `piso-N.codigos.json` figura → código.
  3. Quien dibuja completa el `codigo` de aulas, laboratorios, escaleras y ascensores (el auditorio, la biblioteca, la capilla y demás lugares no están en la base de datos: solo llevan nombre); al volver a ejecutarlo el `id` de cada figura es su código.
  4. Al cambiar el dibujo se reutilizan los códigos por clase y posición (tolerancia de 4 unidades); un código que ya no coincide con ninguna figura se guarda en `sinFigura` y se avisa, no se pierde.
* **Escaleras y ascensores entre pisos:** una escalera es la misma en todos los pisos solo si su figura lleva el **mismo código en cada plano** (p. ej. `NUE-escalera-1`). Si difiere, el mapa las trata como distintas y no ofrece subir.
* **Componente** (`frontend/src/components/mapa3d/`, React con `@react-three/fiber`; se importa con `Mapa3DLazy`, carga diferida). Recibe todo por props y **no llama al backend** (la conexión con datos reales es el Issue 4.24):
  ```typescript
  interface Mapa3DProps {
    planos: Record<number, string>;     // piso -> URL del SVG limpio
    espacios: { id: string; tipo: 'AULA_TEORICA' | 'LABORATORIO'; estado: 'DISPONIBLE' | 'OCUPADO' | 'ALERTA_ACTIVA' }[];
    seleccionado?: string | null;       // controlado, opcional
    resaltados?: string[];              // p. ej. el bloque asignado
    pisoInicial?: number | 'todos';
    onSeleccionar?: (id: string | null) => void;  // id del espacio, o null al hacer clic en vacío
    onAviso?: (mensaje: string) => void;          // figuras sin espacio y espacios sin figura
    fallback?: ReactNode;               // mapa 2D si no hay WebGL
  }
  ```
* **Comportamiento:**
  * La geometría sale de los SVG, sin modelado manual, y se arma como un **edificio**: cada piso tiene losa, fachada con ventanas (cortinas amarillas y vidrio oscuro, como la facultad) y techo, y los pisos se apilan de verdad. Los espacios son suelos coloreados por estado con muros bajos y su rótulo; los laboratorios llevan borde turquesa; las escaleras se dibujan con peldaños y el ascensor como cabina. La losa y el techo de cada piso salen de las figuras `losa` y `techo` del plano.
  * Color de cada espacio por estado según los tokens de §2.2 (disponible `#10b981`, ocupado `#64748b`, alerta `#f59e0b`); una figura reservable sin datos se dibuja neutra y no es interactiva.
  * Cámara orbital con límites y selector de piso. **Edificio** muestra el conjunto cerrado (pulsar un piso lo abre); **Piso N** es un corte: ese piso abierto sobre los de abajo. Selección por clic (se ignora el arrastre de cámara); lo seleccionado se eleva y su contorno se dibuja por delante de todo.
  * **Subir y bajar:** al hacer clic en una escalera o ascensor aparece un panel con "Subir al piso N" / "Bajar al piso N" para los pisos donde exista esa misma figura. Al cambiar de piso se conserva el ángulo de cámara y la escalera sigue resaltada en el destino. En la vista Edificio se dibuja una columna translúcida que une los pisos de esa escalera. Es navegación entre vistas de piso, no un recorrido animado ni una ruta (la ruta hacia un aula es de los Issues 3.14 y 3.15).
  * Se vuelve a dibujar solo cuando algo cambia (`frameloop="demand"`) y limita la resolución del dispositivo.
* **Casos borde:** sin WebGL o si falla al iniciarlo se muestra el `fallback`; una figura reservable sin espacio, o un espacio sin figura, se avisa por `onAviso` y no se rompe; un piso sin espacios se muestra vacío.
* **Mapa 2D y ventana ampliada** (`frontend/src/components/mapa2d/`, Issues 4.13 y 3.18): `Mapa2D` dibuja los mismos SVG como elementos de React (estado por color y patrón, laboratorio con borde turquesa, botones operables con teclado, contorno de la selección por encima de todo). `VistaMapa` ofrece el plano 2D (por defecto) y la maqueta 3D, y «Ampliar mapa» lo abre en una ventana modal que cubre casi toda la página y deja solo el mapa. Las puertas del dibujo (naranja) se ven como abertura blanca en el plano y no se extruyen en la maqueta.
* **Interacción del mapa** (`VistaMapa`, común al plano 2D y a la maqueta 3D):
  * **Zoom y desplazamiento en el plano 2D:** rueda (con Ctrl o ⌘ en la página; sin él dentro de la ventana ampliada), pellizco y arrastre táctil, botones Acercar / Alejar / Ver todo el piso, y las teclas `+`, `-` y `0`. Un arrastre no cuenta como clic. Las etiquetas de escala y el norte se redibujan con el zoom.
  * **Buscador** de aulas y laboratorios por código, nombre, tipo o pabellón (combobox con flechas, Enter y Escape): lleva al piso, selecciona el espacio y acerca el plano 2D o vuela la cámara en la maqueta.
  * **Tooltip** con nombre, estado, tipo y aforo al pasar el cursor o enfocar con el teclado. Con el teclado, las flechas pasan al espacio vecino.
  * **Filtros** por estado y tipo: lo que no cumple se atenúa y deja de ser interactivo (en la maqueta se quita de los espacios).
  * **Marcas:** entrada de cada pabellón (puertas `entrada-1` = antiguo y `entrada-2` = nuevo en `entradas.ts`), íconos de escalera y ascensor, flecha del norte y barra de escala. **La escala (`METROS_POR_UNIDAD = 0,2`) y el norte (`NORTE_GRADOS = 0`, arriba) son estimaciones**: se ajustan en `entradas.ts` cuando se midan los pabellones; la barra dice «≈».
  * **Día y hora:** si se pasa `onFranjaCambiada`, aparece el selector (`dia`, `horaInicio`, `horaFin`, los mismos nombres del endpoint 3.13); «Ahora» es `null`.
  * **URL:** `useMapaEnUrl` guarda `vista`, `piso`, `espacio`, `dia`, `desde` y `hasta` (reemplaza la entrada del historial); lo que vale por defecto no se escribe.
  * **Móvil:** el detalle del espacio se fija sobre el borde inferior (`PanelEspacio hojaMovil`) y el plano responde a gestos.
  * **Cámara 3D:** vuelo suave hasta el espacio buscado, «Reiniciar vista» y «Vista desde arriba».
* **Fuera de alcance:** mobiliario, texturas y puertas en 3D, recorrido animado y accesibilidad por teclado de la escena (Issue 4.24).
* **Demostración:** `npm run dev` en `frontend` y abrir `/demo-mapa3d.html`; usa el plano borrador y datos de ejemplo (`?pisos=3` repite el plano para probar la vista de edificio).

---

## 3. Definition of Done (DoD)
- [ ] Guía de estilos aplicada consistentemente en todos los componentes React de `frontend/src/components/`.
- [ ] SVG de planos de los 3 pisos maquetados, con un `id` por espacio, y vinculados al estado del mapa visual.
- [ ] Cada escalera y ascensor lleva el mismo código en todos los pisos donde existe.
- [ ] Diseño 100% responsivo y accesible (WCAG 2.1 AA).
