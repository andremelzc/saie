# Conversor de planos (Canva → SVG limpio)

Convierte la exportación SVG de Canva de un piso en un SVG con **un `id` por espacio**, que es lo
que necesita el mapa de ocupación (Issue 4.23) para enlazar cada figura con un `Espacio` de la
base de datos. Canva exporta sin ids ni texto legible, así que el enlace se completa una vez en
una tabla y el script lo reutiliza.

## Uso

```bash
node tools/planos/convertir-plano.mjs "<exportacion.svg>" --piso 1
# opcional: --out <carpeta>   (por defecto tools/planos/salida/piso-1/)
# opcional: --marco-fijo       (conserva las coordenadas y el viewBox del archivo)
```

Sin dependencias; requiere Node 18 o superior.

## Flujo

1. Dibujar el piso en Canva y exportarlo como SVG.
2. Ejecutar el script. Genera en la carpeta de salida:
   - `piso-N.preview.svg`: el plano con cada figura rotulada (`FIG-01`, `FIG-02`…). Abrirlo en el
     navegador para saber qué figura es cuál.
   - `piso-N.codigos.json`: la tabla figura → código.
   - `piso-N.svg`: el plano limpio.
3. Completar `codigo` en la tabla para los espacios reservables (aula y laboratorio),
   por ejemplo `NUE-101`, y para las escaleras y ascensores (ver más abajo).
4. Volver a ejecutar el script: el `id` de cada figura pasa a ser su código.
5. Copiar `piso-N.svg` a `assets/planos/`.

Al cambiar el dibujo se repite desde el paso 1. El script reutiliza los códigos por **clase y
posición** (tolerancia de 4 unidades del plano).

## Planos fuente (`fuentes/`)

`fuentes/piso-1.svg`, `piso-2.svg` y `piso-3.svg` son el dibujo vigente de cada piso. Se abren en
cualquier navegador y llevan los rótulos como texto. Cada figura trae su `data-codigo` (el `id`
final, p. ej. `NUE-101`) y su `data-nombre`, así que **no hace falta completar la tabla**:

```bash
for p in 1 2 3; do
  node tools/planos/convertir-plano.mjs tools/planos/fuentes/piso-$p.svg --piso $p --marco-fijo --out tools/planos/salida/piso-$p
  cp tools/planos/salida/piso-$p/piso-$p.svg assets/planos/piso-$p.svg
done
```

- Los tres pisos comparten marco y origen: una escalera o ascensor está en las mismas coordenadas
  en cada piso. Los pisos 2 y 3 caben dentro de la huella del piso 1 (el patio queda abierto).
- Código de un espacio reservable: `NUE-` o `ANT-` más el número del aula (`ANT-104`; el laboratorio
  lleva el código del aula). `Aula 208 y 209 - Aula Magna` es `ANT-208-209`.
- Lugares que no están en la base de datos (auditorio, biblioteca, capilla, baños, administrativos,
  comedor, etc.) llevan id y nombre pero no son reservables. Las figuras sin nombre usan el color
  `sala`.
- Cada piso lleva además dos figuras de estructura para la maqueta 3D: `losa` (el suelo; en la planta baja incluye el patio) y `techo` (la parte construida). Salen del contorno del edificio y no se dibujan en el plano 2D.
- La Capilla (piso 1), el Tercio (piso 2) y el Soporte técnico (piso 3) ocupan la misma columna.

## Avisos

- **Sin código asignado:** una figura reservable todavía usa su id provisional `FIG-NN`.
- **Código sin figura:** el dibujo cambió y el código ya no coincide con ninguna figura. No se
  pierde: queda en `sinFigura` de la tabla. Para recuperarlo, copiar su `cx` y `cy` actuales a la
  figura nueva (o mover la figura a su sitio) y borrar la entrada de `sinFigura`.
- **Código repetido:** dos figuras con el mismo código.

## Convención de colores del dibujo

El script clasifica por color de relleno. Si se cambia un color, hay que actualizar
`COLOR_A_CLASE` en el script.

| Color     | Clase                                                        |
| --------- | ------------------------------------------------------------ |
| `#b2d9ff` | aula                                                         |
| `#d3c8ff` | laboratorio, o ascensor si es mucho más pequeño que un salón |
| `#ffbdbd` | escalera                                                     |
| `#ff86e4` | baño                                                         |
| `#efe7cb` | administrativo                                               |
| `#d0ffaf` | patio                                                        |
| `#802323` | auditorio                                                    |
| `#faff93` | biblioteca                                                   |
| `#ffbd59` | comedor                                                      |
| `#3a7ebf` | administrativo (oscuro)                                      |
| `#dbe4ee` | sala sin nombre o por definir                                |
| `#e5e7eb` / `#d6d3d1` | losa / techo del piso (estructura para la maqueta 3D)         |
| `#ff751f` | puerta (solo una marca al dibujar: en el plano sale como abertura blanca) |

Se ignoran el título, la nota adhesiva y las etiquetas. Los trazos sin relleno que no son
rectángulos se conservan como muros (perímetro y muros interiores).

## Escaleras y ascensores entre pisos

El mapa 3D permite subir y bajar entre pisos desde una escalera o un ascensor. Para saber que la
escalera del piso 1 es la misma que la del piso 2, **su figura debe llevar el mismo código en
cada plano** (por ejemplo `NUE-escalera-1` en `piso-1.svg`, `piso-2.svg` y `piso-3.svg`). Si el
código difiere entre pisos, el mapa los trata como escaleras distintas y no ofrece subir.
