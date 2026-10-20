# Guía de los archivos CSV del SAIE

> **Estado:** vigente desde el cierre de Sprint 3 (2026-10-21) · **Issue:** 4.34

El SAIE trabaja con dos clases de archivos CSV:

1. **Los que se suben** al panel administrativo (`Carga de datos`):courses y secciones, horarios,
   matrículas y docentes. Sus encabezados son fijos y el sistema los valida fila por fila.
2. **Los que se descargan** de la base para revisarlos: el estado de las asignaciones y los
   **archivos de fallos**, que dicen qué falta corregir.

Este documento explica ambos: cómo se genera cada uno, qué columnas tiene y cómo leerlo.

---

## 1. Generar los CSV de diagnóstico

```bash
cd backend
npm run prisma:export
```

Los archivos quedan en `backend/prisma/export/` (esa carpeta está en `.gitignore`: son datos
reales, no se versionan).

Variables opcionales:

| Variable | Para qué sirve | Ejemplo |
|---|---|---|
| `EXPORT_DIR` | Escribe en otra carpeta | `EXPORT_DIR=../descargas npm run prisma:export` |
| `EXPORT_PERIODO` | Solo ese periodo | `EXPORT_PERIODO=2026-2 npm run prisma:export` |

Los archivos se escriben con **BOM** y separador **punto y coma**: es lo que Excel en español
abre sin romper los acentos ni convertir los códigos de curso en fechas.

---

## 2. Los archivos que se pueden volver a subir

Estos llevan **los encabezados exactos que espera cada importador**. Sirven de respaldo del
estado actual y de base para preparar el siguiente periodo.

### `01-espacios.csv`

| Columna | Qué es |
|---|---|
| `identificador` | Código visible del aula o laboratorio (ej. `Lab 03`) |
| `pabellon`, `piso` | Ubicación dentro del campus |
| `tipo` | `AULA_TEORICA` o `LABORATORIO` |
| `aforoNominal` | Capacidad nominal |
| `pcsMalogradas` | Solo laboratorios |
| `habilitado` | `sí` / `no`. Un espacio deshabilitado no se asigna (aparece como «no asignable» en el panel) |
| `descripcionUso` | Rótulo opcional (ej. «Sala de investigación») |
| `distanciaAscensor` | Metros hasta el ascensor: base de la regla de accesibilidad |
| `softwareInstalado` | Software del catálogo, separado por ` \| ` |
| `contiguos` | Códigos de los espacios contiguos, separados por ` \| ` |

> Este archivo **no** se sube por la pantalla de carga: los espacios se gestionan uno por uno
> desde `Espacios`. Se exporta para tener el respaldo del inventario.

### `02-cursos-secciones.csv`

Encabezado: `codigoCurso,nombreCurso,codigoSeccion,periodo,tipoEspacioRequerido,stackSoftwareRequerido`

| Columna | Qué es |
|---|---|
| `codigoCurso` | Código del curso (el mismo en todas sus secciones) |
| `nombreCurso` | Nombre completo del curso |
| `codigoSeccion` | Código de la sección (suele ser el número; si tiene laboratorio, el mismo con `-LAB`) |
| `periodo` | Periodo académico (ej. `2026-2`) |
| `tipoEspacioRequerido` | `AULA_TEORICA` o `LABORATORIO` |
| `stackSoftwareRequerido` | Software del catálogo separado por ` \| ` |

**Es el primer archivo que se sube.** Horarios y matrículas buscan la sección por
`(curso, sección, periodo)`: si la sección no existe, la fila se rechaza.

### `03-horarios.csv`

Encabezado: `codigoCurso,codigoSeccion,periodo,diaSemana,horaInicio,horaFin`

| Columna | Qué es |
|---|---|
| `diaSemana` | `LUNES` … `DOMINGO` (acepta minúsculas y sin tilde) |
| `horaInicio`, `horaFin` | `HH:mm` en 24 horas. La hora de fin debe ser posterior a la de inicio |

### `04-matriculas.csv`

Encabezado: `codigoAlumno,nombre,correo,movilidadReducida,codigoCurso,codigoSeccion,periodo,crearCuentaAcceso`

| Columna | Qué es |
|---|---|
| `movilidadReducida` | `sí` / `no`. Marca al alumno para que el motor priorice las aulas del **Piso 1** |
| `crearCuentaAcceso` | `sí` / `no`. Con `sí` se crea la cuenta de acceso del alumno (clave inicial = su código) |

> El alumno también puede declarar su condición de accesibilidad desde su perfil
> (`Mi perfil → Ficha médica`): el sistema propaga el dato a sus matrículas sin volver a subir
> este archivo.

### `05-docentes.csv`

Encabezado: `codigoDocente,nombre,correoInstitucional,departamento`

El importador de docentes **no** dispara la asignación de aulas, aunque todas sus filas sean
válidas.

### Orden de carga

```
1. 02-cursos-secciones.csv   (las secciones existen primero)
2. 03-horarios.csv
3. 04-matriculas.csv
4. 05-docentes.csv            (opcional)
```

Los cuatro archivos son independientes y se pueden volver a subir: los datos **se actualizan**
en vez de duplicarse. Subir un periodo nuevo agrega secciones y deja intacto el semestre
anterior.

---

## 3. Los archivos de diagnóstico

Estos **no se suben**: se abren, se revisan y sirven para saber qué corregir.

### `06-asignaciones.csv`

Una fila por asignación vigente o escalada del periodo.

| Columna | Qué es |
|---|---|
| `estado` | `VIGENTE` (tiene aula) o `ESCALADA` (el motor no pudo asignarle aula) |
| `aulas` | Códigos de los espacios asignados, separados por ` \| ` |
| `alumnosMatriculados` | Alumnos de la sección |
| `fechaAsignacion` | Cuándo se decidió |
| `corridaId` | Corrida del motor que la produjo (vacío si fue manual) |
| `motivoEscalamiento` | Solo en las escaladas: `[CÓDIGO] descripción` |

### `fallos-01-asignacion.csv` — *secciones que esperan revisión*

Es el archivo que responde «¿por qué hay secciones sin aula?».

| Columna | Qué es |
|---|---|
| `motivoCodigo` | El código del motor: `SIN_HORARIOS_DEFINIDOS`, `SOFTWARE_FALTANTE`, `CAPACIDAD_INSUFICIENTE`, `HORARIO_BLOQUEADO`, `CONTIGUEDAD_NO_ALCANZADA`, `SIN_ESPACIOS_DISPONIBLES` |
| `motivo` | La descripción en lenguaje llano |
| `softwareRequerido` | Lo que el laboratorio tendría que tener instalado |

Qué hacer según el motivo:

| Motivo | Qué revisar |
|---|---|
| `SIN_HORARIOS_DEFINIDOS` | La sección no tiene bloques de horario: sube `03-horarios.csv` |
| `SOFTWARE_FALTANTE` | Ningún laboratorio tiene el software: revisa `fallos-02-software.csv` o agrega el software a la sección desde `Secciones` |
| `CAPACIDAD_INSUFICIENTE` | Ningún aula tiene aforo suficiente: revisa `fallos-03-capacidad.csv` |
| `HORARIO_BLOQUEADO` | El bloque choca con otra asignación: mira `06-asignaciones.csv` |
| `CONTIGUEDAD_NO_ALCANZADA` | No hay un bloque contiguo del tamaño necesario: revisa la contigüidad en `Espacios` |
| `SIN_ESPACIOS_DISPONIBLES` | No hay espacios del tipo pedido o están todos deshabilitados |

### `fallos-02-software.csv` — *laboratorios sin el software que exigen las secciones*

Una fila por cada laboratorio asignado a una sección que le falta software.

| Columna | Qué es |
|---|---|
| `laboratorio` | Código del laboratorio asignado |
| `softwareFaltante` | Lo que no tiene instalado, separado por ` \| ` |

### `fallos-03-capacidad.csv` — *bloques con capacidad insuficiente*

Una fila por asignación cuya capacidad real no alcanza para los alumnos matriculados. La
capacidad real de un laboratorio es `aforoNominal - pcsMalogradas`.

| Columna | Qué es |
|---|---|
| `capacidadReal` | Suma de la capacidad real de todos los espacios del bloque |
| `alumnosMatriculados` | Alumnos de la sección |
| `faltan` | Cuántos lugares faltan |

### `fallos-04-auditoria.csv` — *la bitácora del motor*

Los últimos 5000 asientos de `RegistroAuditoria`: qué asignó el motor, qué escaló, qué alerta
se resolvió y qué dijo el verificador.

| Columna | Qué es |
|---|---|
| `tipoEvento` | `ASIGNACION`, `ESCALAMIENTO`, `ALERTA` o `VERIFICACION` |
| `detalle` | La descripción del evento |
| `asignacionId`, `alertaId` | A qué asignación o alerta se refiere (vacío si no aplica) |

---

## 4. Del CSV a la corrección

El ciclo completo es:

```
1. npm run prisma:export
2. abrir fallos-01-asignacion.csv  →  ver qué falta
3. corregir (subir el CSV que falte, o editar la sección en «Secciones»)
4. volver a asignar: en «Inicio» → «Asignar aulas del periodo»
5. npm run prisma:export otra vez  →  comprobar que el archivo de fallos quedó vacío
```

La asignación es **idempotente**: repetirla no duplica aulas, conserva las que siguen siendo
válidas y solo recalcula lo que hace falta. Si una sección no cambia, no se escribe nada y no
se manda ningún aviso.

---

## 5. Errores frecuentes de carga

| Mensaje | Causa | Qué hacer |
|---|---|---|
| «No existe la sección … para el curso … en el periodo …» | Se cargaron horarios o matrículas antes que las secciones | Sube primero `02-cursos-secciones.csv` |
| «El software no está registrado» | El nombre del software no existe en el catálogo | Agrega el software al catálogo o corrige el nombre |
| «La hora de inicio debe ser menor a la hora de fin» | Bloque con las horas invertidas | Corrige `horaInicio` y `horaFin` |
| «Correo electrónico inválido» | Correo mal escrito o con espacios | Corrige la columna `correo` |
| «Fila N: …» | Esa fila no se guarda; el resto del archivo sí | Corrige la fila y vuelve a subir (no duplica nada) |

Cuando un archivo tiene filas con problemas, **las demás sí se guardan**, pero la asignación
de aulas del periodo **no** se dispara: primero hay que dejar el archivo limpio.
