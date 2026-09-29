# Spec 07: UI/UX, Guía de Estilos y Activos SVG

> **Épica:** `epic:docs` / Frontend UI  
> **Issues Cubiertos:** #6.6, #6.7, #6.10, #6.11, #6.12  
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
* **Ubicación de Activos:** `assets/planos/pabellon-a-piso-1.svg`, `pabellon-a-piso-2.svg`, `pabellon-a-piso-3.svg`.
* **Requisitos del SVG:**
  * Elementos `path` o `rect` etiquetados con identificadores únicos (ej. `id="espacio-A-101"`).
  * Clases CSS manipulables dinámicamente desde el DOM de React para aplicar colores de ocupación/alerta.
  * Coordenadas optimizadas para calculador de centroides utilizado por la vista 3D (Three.js) y el trazador de rutas.

---

## 3. Definition of Done (DoD)
- [ ] Guía de estilos aplicada consistentemente en todos los componentes React de `frontend/src/components/`.
- [ ] SVG de planos de los 3 pisos maquetados y vinculados al estado del mapa visual.
- [ ] Diseño 100% responsivo y accesible (WCAG 2.1 AA).
