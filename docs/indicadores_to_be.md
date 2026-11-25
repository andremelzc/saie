# Indicadores TO-BE — SAIE

> **Fuente:** exportación de la base de Supabase con `npm run prisma:export` (2026-11-25), periodo `2026-2`.
> **Cómo se calcularon:** sobre `06-asignaciones.csv`, `01-espacios.csv`, `03-horarios.csv` y `fallos-04-auditoria.csv`, de forma independiente al verificador del sistema (los espacios se identifican por pabellón y nombre, porque «Aula 101» existe en los dos pabellones).

## Datos del periodo

| Dato | Valor |
|---|---|
| Secciones del periodo (sin la sección de demostración `DEMO001`) | 228 |
| Espacios | 54 (49 habilitados, 18 laboratorios) |
| Matrículas | 4470 (2237 alumnos) |
| Docentes | 68 |

## Indicadores del proceso

| Indicador | Resultado TO-BE | Cómo se obtiene |
|---|---|---|
| Secciones asignadas automáticamente | **100 %** (228 de 228) | Estado `VIGENTE` en las asignaciones. La única escalada es `DEMO001`, creada a propósito para la demo, sin horarios |
| Secciones con capacidad real menor a sus matriculados | **0** | Suma de la capacidad real de los espacios asignados frente a los matriculados |
| Dobles reservas (mismo espacio, mismo día y franja superpuesta) | **0** | Cruce de asignaciones con horarios |
| Espacios de tipo incorrecto (aula para laboratorio o al revés) | **0** | Tipo requerido de la sección frente al tipo del espacio |
| Secciones que necesitaron varios espacios | 35 (máximo 3 espacios) | Asignaciones con más de un espacio |
| De ellas, en un bloque contiguo | **100 %** (35 de 35) | Recorrido del grafo de contigüidad |
| Verificaciones posteriores a la corrida | **102 de 102 conformes** (19-oct al 24-nov) | Eventos `VERIFICACION` de la auditoría |
| Tiempo de la corrida del periodo | **menos de 1 minuto** para 228 secciones (unos 8 s medidos) | Las 228 asignaciones de la corrida del 13-oct quedaron registradas en el mismo minuto |
| Ocupación media de los espacios asignados | **55,9 %** (mediana por sección 57,3 %) | Matriculados entre capacidad real |
| Asientos libres por sección | mediana **13** | Capacidad real menos matriculados |
| Secciones paralelas del mismo curso en el mismo pabellón | **96 %** (53 de 55 grupos); mismo piso: 60 % (33 de 55) | Pabellón y piso de las secciones del mismo curso y tipo |
| Consulta pública en el pico del primer día | p95 de **847 ms** con 300 usuarios, 0,3 % de error | k6, `docs/informe_resumen_pruebas.md` |

## Limitaciones de los datos

- **Movilidad reducida:** ninguna matrícula del periodo la tiene marcada, así que no se puede medir el porcentaje ubicado en el Piso 1. La regla R-07 está cubierta por las pruebas unitarias.
- **Software requerido:** ninguna de las 113 secciones de laboratorio declara software, así que la regla R-06 no se ejercita con estos datos.
- **PCs malogradas:** ningún laboratorio tiene PCs malogradas registradas, así que la capacidad real coincide con el aforo nominal.
- **Alumnos:** 2232 de los 2237 son anónimos, generados para completar las vacantes declaradas en la plantilla.

Para que estas reglas se vean en la demo y den números, [`demo/indicadores/README.md`](../demo/indicadores/README.md) explica cómo cargar casos de software, movilidad reducida y PCs malogradas desde la aplicación. Los indicadores se recalculan con `demo/indicadores/calcular_indicadores.py`.

## Indicadores AS-IS pendientes

Para comparar, falta la línea base del proceso manual: el tiempo que toma la asignación del semestre y el número de secciones con conflicto de capacidad, software o doble reserva. Debe salir de Coordinación o de la distribución publicada del semestre, indicando la fuente.
