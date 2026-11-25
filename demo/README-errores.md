# CSVs de demo — carga y asignación

> Actualizado el 25/11/2026 para el comportamiento de la rama `feat/andre-auditoria` (PR #441): importación «todo o nada», periodos registrados, retiros y cambios de horario, y lectura de CSV de Excel. Los casos de prueba completos, con resultados esperados, están en la sección 6 de [`docs/guia_pruebas_por_rol.md`](../docs/guia_pruebas_por_rol.md).

## ⚠️ Antes de subir cualquier archivo

- **Cargar matrículas u horarios reemplaza los de cada sección incluida en el archivo** (issue #429). Un archivo con solo algunos alumnos de una sección real deja a esa sección solo con esos alumnos. Para probar, usa los archivos de [`pruebas/`](./pruebas/), que solo tocan secciones de prueba (`DEMO002`, `DEMO003`).
- **Solo se puede cargar en periodos registrados y no cerrados** (pantalla *Periodos*). Hoy solo existe `2026-2`, vigente.
- **Todo o nada:** si un archivo tiene al menos una fila con error, **no se guarda ninguna** y se listan todos los errores.

## Carga normal del semestre actual

| Archivo | Zona | Resultado esperado |
|---|---|---|
| `cursos-secciones.csv` | Cursos y secciones | Se guarda (228 filas, los mismos datos de la base) |
| `horarios.csv` | Horarios | Se guarda (228 filas). Reemplaza los horarios de cada sección del archivo por los del archivo |

Las matrículas reales no están en esta carpeta: se cargaron con el seed (`backend/prisma/data/seed-plantilla.xlsx`).

## Errores de carga

Con la importación «todo o nada», ninguno de estos archivos guarda filas: la tarjeta muestra **0 guardadas** y la lista completa de errores. La asignación no se dispara.

| Archivo | Zona | Errores que demuestra | Resultado esperado |
|---|---|---|---|
| `cursos-secciones-con-errores.csv` | Cursos y secciones | Sin código de curso, tipo `SALON`, sin sección, sin periodo, software no registrado | Rechazado: 5 filas con error de 228; **0 guardadas** |
| `carga-errores-cursos-secciones-extra.csv` | Cursos y secciones | Sin nombre, tipo `AULA`, tipo vacío, software no registrado | Rechazado: 4 filas con error de 5; **0 guardadas** |
| `carga-errores-horarios.csv` | Horarios | Sin curso/sección/periodo, día inválido, hora inválida, inicio ≥ fin, curso/sección/periodo inexistente | Rechazado: 10 filas con error de 11; **0 guardadas** |
| `carga-errores-matriculas.csv` | Matrículas | Sin código/nombre/correo/curso/sección/periodo, correo inválido, curso/sección inexistente | Rechazado: 8 filas con error de 9; **0 guardadas** (ya no se crean alumnos ni cuentas antes de fallar) |
| `carga-errores-docentes.csv` | Docentes | Sin código/nombre/correo/departamento, correo inválido | Rechazado: 4 filas con error de 5; **0 guardadas** |

> ⚠️ No «corrijas» `carga-errores-matriculas.csv` dejando solo su fila válida para volver a subirlo: esa fila es de `202SW0104` sección 1 (real) y, por el reemplazo de matrículas, dejaría a esa sección con un solo alumno.

## Error de asignación (sección sin horarios)

| Archivo | Zona | Qué hace |
|---|---|---|
| `asignacion-error-sin-horario.csv` | Cursos y secciones | Crea `DEMO001 DEMO` sin horario. Aparece en el inicio de administración en **«Datos incompletos: falta cargar horarios»** (no entre las escaladas) |
| `asignacion-error-con-horario.csv` | Horarios | Le da horario (domingo 08:00–10:00). Se guarda, se encadena la asignación y la sección sale de «Datos incompletos» |

## Casos de prueba nuevos

La carpeta [`pruebas/`](./pruebas/) tiene un archivo por caso: carga de prueba, retiros y cambios de horario, periodos (romanos, inválidos, en preparación), todo o nada, filas repetidas, choques de docente y de alumno, y CSV guardado desde Excel en Windows-1252. El orden y el resultado esperado de cada uno están en la sección 6 de la guía de pruebas (casos CD-01 a CD-51).

## Plantillas

Los archivos de `plantillas/` son **ejemplos de formato** con datos ficticios en el periodo `2027-1`; no son para subir. Mientras `2027-1` no esté registrado en *Periodos*, los de cursos, horarios y matrículas se rechazan («El periodo 2027-1 no está registrado»). El de docentes sí se guardaría y crearía un docente de ejemplo: no lo subas en la base real.

## Otras reglas para la demo

- El backend solo encadena la asignación si **no hay ninguna fila con error** y el periodo vigente ya tiene secciones, horarios y matrículas.
- El importador de **docentes** no dispara la asignación, ni siquiera cuando todas las filas son válidas.
- En la base actual el catálogo de software está vacío, así que cualquier software en `stackSoftwareRequerido` se rechaza con `SOFTWARE_NO_REGISTRADO`.
- Los cursos de prueba (`DEMO001`, `DEMO002`, `DEMO003`) y los alumnos `99999901`–`99999906` quedan en la base; no hay pantalla para borrarlos.
- La asignación automática es **diaria a las 02:00 Lima** (07:00 UTC) por GitHub Actions; Coordinación también puede ejecutarla a mano desde `/admin`.
