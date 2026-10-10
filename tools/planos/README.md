# Conversor de planos (Canva → SVG limpio)

Convierte la exportación SVG de Canva de un piso en un SVG con **un `id` por espacio**, que es lo
que necesita el mapa de ocupación (Issue 4.23) para enlazar cada figura con un `Espacio` de la
base de datos. Canva exporta sin ids ni texto legible, así que el enlace se completa una vez en
una tabla y el script lo reutiliza.

## Uso

```bash
node tools/planos/convertir-plano.mjs "<exportacion.svg>" --piso 1
# opcional: --out <carpeta>   (por defecto tools/planos/salida/piso-1/)
```

Sin dependencias; requiere Node 18 o superior.

## Flujo

1. Dibujar el piso en Canva y exportarlo como SVG.
2. Ejecutar el script. Genera en la carpeta de salida:
   - `piso-N.preview.svg`: el plano con cada figura rotulada (`FIG-01`, `FIG-02`…). Abrirlo en el
     navegador para saber qué figura es cuál.
   - `piso-N.codigos.json`: la tabla figura → código.
   - `piso-N.svg`: el plano limpio.
3. Completar `codigo` en la tabla para los espacios reservables (aula, laboratorio y auditorio),
   por ejemplo `NUE-101`.
4. Volver a ejecutar el script: el `id` de cada figura pasa a ser su código.
5. Copiar `piso-N.svg` a `assets/planos/`.

Al cambiar el dibujo se repite desde el paso 1. El script reutiliza los códigos por **clase y
posición** (tolerancia de 4 unidades del plano).

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

Se ignoran el título, la nota adhesiva y las etiquetas. Los trazos sin relleno que no son
rectángulos se conservan como muros (perímetro y muros interiores).
