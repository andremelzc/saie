# CSVs de demo — carga y asignación

## Carga normal (en este orden)

1. `cursos-secciones.csv`
2. `horarios.csv`
3. `plantillas/matriculas.csv`
4. `plantillas/docentes.csv` (opcional)

## Errores de carga

| Archivo | Importador | Errores que demuestra | Resultado esperado |
|---|---|---|---|
| `cursos-secciones-con-errores.csv` | cursos-secciones | Sin código de curso, tipo `SALON`, sin sección, sin periodo, software no registrado | 5 rechazadas de 228; las filas válidas se guardan; **no** se dispara la asignación |
| `carga-errores-cursos-secciones-extra.csv` | cursos-secciones | Sin nombre, tipo `AULA`, tipo vacío, software no registrado | 4 rechazadas de 5; la fila válida se guarda; **no** se dispara la asignación |
| `carga-errores-horarios.csv` | horarios | Sin curso/sección/periodo, día inválido, hora inválida, inicio ≥ fin, curso/sección/periodo inexistente | 10 rechazadas de 11; la fila válida se guarda; **no** se dispara la asignación |
| `carga-errores-matriculas.csv` | matrículas | Sin código/nombre/correo/curso/sección/periodo, correo inválido, curso/sección inexistente | 8 rechazadas de 9; la fila válida se guarda; **no** se dispara la asignación |
| `carga-errores-docentes.csv` | docentes | Sin código/nombre/correo/departamento, correo inválido | 4 rechazadas de 5; la fila válida se guarda; **no** se dispara la asignación |

## Error de asignación

| Archivo | Qué hace |
|---|---|
| `asignacion-error-sin-horario.csv` | Crea una sección válida **sin horario** → el motor la deja **ESCALADA** con `[SIN_HORARIOS_DEFINIDOS]` |
| `asignacion-error-con-horario.csv` | Le agrega horario → la corrida la asigna y queda **0 escaladas** |

## Reglas importantes para la demo

- El backend solo encadena la asignación si **no hay ninguna fila rechazada** (`exitosa = errores.length === 0`). Por eso los CSV de errores de carga **no** producen una escalada.
- El importer **persiste las filas válidas** aunque haya errores. Es una desviación conocida de los issues 1.3–1.5; sirve para explicar la diferencia entre validar y guardar.
- En matrículas, las filas con curso/sección inexistente **crean el alumno y la cuenta antes de fallar**. Por eso `alumnosProcesados` puede ser mayor que `matriculasProcesadas`.
- El importador de **docentes** no dispara la asignación, ni siquiera cuando todas las filas son válidas.
- En la base actual, `MATLAB R2024b` no está en el catálogo activo. Por eso las filas que lo usan se rechazan con `SOFTWARE_NO_REGISTRADO`. Si se registra el software, esos conteos bajan.
- Los códigos demo (`DEMO001`, `9999999x`, `D9999`) quedan en la BD. Si no se quieren dejar, hay que borrarlos después de la presentación.
- La asignación automática es **diaria a las 02:00 Lima** (07:00 UTC) por GitHub Actions; el coordinador también puede ejecutarla a mano desde `/admin`.
