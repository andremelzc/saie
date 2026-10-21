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
  1. Detecta cada figura por su **color de relleno** (aula `#b2d9ff`, laboratorio `#d3c8ff`, escalera `#ffbdbd`, baño `#ff86e4`, administrativo `#efe7cb`, patio `#d0ffaf`, auditorio `#802323`, biblioteca `#faff93`; el lila pequeño es un ascensor), conserva los muros y descarta el título, la nota y las etiquetas.
  2. Genera una vista con cada figura rotulada (`FIG-01`…) y la tabla `piso-N.codigos.json` figura → código.
  3. Quien dibuja completa el `codigo` de aulas, laboratorios, auditorios, escaleras y ascensores; al volver a ejecutarlo el `id` de cada figura es su código.
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
  * La geometría sale de los SVG, sin modelado manual: aulas, laboratorios y auditorios se extruyen (los laboratorios más altos y con borde turquesa), los muros a menor altura y el resto (escaleras, baños, administrativos) como volumen bajo no seleccionable.
  * Color de cada espacio por estado según los tokens de §2.2 (disponible `#10b981`, ocupado `#64748b`, alerta `#f59e0b`); una figura reservable sin datos se dibuja neutra y no es interactiva.
  * Cámara orbital con límites, selector de piso y vista **Edificio** con los pisos apilados. Selección por clic (se ignora el arrastre de cámara); lo seleccionado se eleva y resalta.
  * **Subir y bajar:** al hacer clic en una escalera o ascensor aparece un panel con "Subir al piso N" / "Bajar al piso N" para los pisos donde exista esa misma figura. Al cambiar de piso se conserva el ángulo de cámara y la escalera sigue resaltada en el destino. En la vista Edificio se dibuja una columna translúcida que une los pisos de esa escalera. Es navegación entre vistas de piso, no un recorrido animado ni una ruta (la ruta hacia un aula es de los Issues 3.14 y 3.15).
  * Se vuelve a dibujar solo cuando algo cambia (`frameloop="demand"`) y limita la resolución del dispositivo.
* **Casos borde:** sin WebGL o si falla al iniciarlo se muestra el `fallback`; una figura reservable sin espacio, o un espacio sin figura, se avisa por `onAviso` y no se rompe; un piso sin espacios se muestra vacío.
* **Fuera de alcance:** modelo 3D detallado (puertas, mobiliario, texturas), recorrido animado y accesibilidad por teclado de la escena (Issue 4.24).
* **Demostración:** `npm run dev` en `frontend` y abrir `/demo-mapa3d.html`; usa el plano borrador y datos de ejemplo (`?pisos=3` repite el plano para probar la vista de edificio).

---

## 3. Definition of Done (DoD)
- [ ] Guía de estilos aplicada consistentemente en todos los componentes React de `frontend/src/components/`.
- [ ] SVG de planos de los 3 pisos maquetados, con un `id` por espacio, y vinculados al estado del mapa visual.
- [ ] Cada escalera y ascensor lleva el mismo código en todos los pisos donde existe.
- [ ] Diseño 100% responsivo y accesible (WCAG 2.1 AA).
