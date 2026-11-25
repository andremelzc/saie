# Propuesta de mejora: importar el reporte de programación del SUM

> **Estado:** propuesta analizada, no implementada. Fecha del análisis: 2026-11-25.
> **Relación con el sílabo:** convierte los temas de RPA y captura de documentos de [`silabo/definiciones-e-implementacion.md`](silabo/definiciones-e-implementacion.md) §7 de «justificado» a «aplicado».

## 1. Problema que resuelve

Hoy Coordinación exporta los datos del Sistema Único de Matrícula (SUM) y los convierte a mano en los CSV de cursos y secciones, horarios y docentes. Es el único paso manual del flujo de carga: el SUM no ofrece una API.

El SUM sí genera el **«Reporte de Programación de Asignaturas»** en PDF. De ese reporte se armaron los datos del seed. Leerlo automáticamente eliminaría la conversión manual.

## 2. Qué contiene el reporte

Analizado el reporte del periodo 2026-2: 6 páginas, 8 ciclos, **50 cursos y 116 secciones**. Es un PDF generado por sistema (no escaneado), con una tabla por ciclo:

| Columna | Uso en SAIE |
|---|---|
| Asignatura (código y nombre) | Cursos y secciones |
| Créditos | No se usa |
| Sección | Cursos y secciones |
| Docente (código y nombre) | Docentes y docente de la sección |
| Tope y matriculados | Solo el **número** de matriculados |
| Aula | Aula que asignó el SUM (sirve como dato AS-IS) |
| Día y horas | Horarios: **dos franjas por sección** (114 secciones), una franja en 2 casos |

## 3. Qué reemplaza y qué no

| CSV actual | ¿Lo reemplaza el reporte? |
|---|---|
| Cursos y secciones | Sí |
| Horarios | Sí |
| Docentes | En parte: código y nombre, sin correo ni departamento |
| Matrículas | **No**: no trae la lista de alumnos ni la movilidad reducida. Solo permite completar matrículas anónimas hasta el total, como hace el seed |
| Software requerido, espacios, PCs | No: no están en el SUM. Siguen saliendo del catálogo y de Jefatura |

## 4. Viabilidad comprobada

Se probó la extracción con `pdfplumber` (Python) sobre el reporte real:

- Las tablas salen con sus columnas separadas: las 116 secciones, cada una con su docente, tope, matriculados y franjas.
- Recupera bien **`202SW0303` Física Electrónica**, el curso que el texto plano mezclaba con `202SW0302` (issue 1.20, #432). El reporte sirve como fuente oficial para completarlo.
- El formato es fijo: mismas columnas, mismo orden y dos franjas por sección.

**Puntos por resolver:**

1. **Teoría y laboratorio:** el reporte no los marca. El seed asumió que la segunda franja es el laboratorio (`<sección>-LAB`). Hay que confirmar la regla y tratar las secciones de una sola franja (Ética Profesional y Legislación Informática, secciones 1 y 2).
2. **Lenguaje:** el backend es Node. Allí no hay un extractor de tablas tan directo como `pdfplumber`: habría que leer el texto con sus coordenadas (por ejemplo, con `pdfjs-dist`) y armar las columnas por posición.
3. **Dependencia del formato:** si el SUM cambia el diseño del reporte, el lector falla. Se mitiga con la validación todo o nada que ya existe.
4. **Datos personales:** el encabezado trae el código y el nombre de quien descargó el reporte. El lector debe ignorarlo y el PDF no debe guardarse en el repositorio.

## 5. Opciones

| Opción | Esfuerzo | Comentario |
|---|---|---|
| **A. Script que convierte el PDF a CSV** | Horas | Coordinación ejecuta el script y sube los CSV como hoy. Poco invasivo; mantiene un paso manual |
| **B. Zona «Reporte del SUM» en Carga de datos** | 1 a 2 días con pruebas | El backend extrae las tablas y produce las mismas filas que los CSV, que pasan por los validadores existentes (todo o nada, vista previa, normalización del periodo). Coordinación sube un solo archivo |
| **C. Bot que entra al SUM y descarga el reporte** | Alto | RPA completo. Requiere guardar credenciales institucionales y depende de la pantalla del SUM. No recomendado |

**Recomendación:** empezar por la opción A y, si funciona bien, integrarla como la opción B en una rama propia (`feature/1.21-importacion-pdf-sum`). La extracción alimenta el flujo actual sin cambiarlo: el reporte solo reemplaza el origen de los datos.

## 6. Dato AS-IS que aporta

El reporte también mide el proceso actual:

- **65 de 116 secciones (56 %) no tienen aula asignada** en la programación oficial.
- Las 51 secciones con aula usan la **misma aula teórica para sus dos franjas**: el SUM no distingue el laboratorio del aula.
- En las secciones con aula no hay choques de horario ni aulas más chicas que sus matriculados.
