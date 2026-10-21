# Plantillas de importación (CSV)

Encabezados oficiales para las cargas masivas en `POST /api/v1/import/:tipo`.
Cada archivo trae el encabezado y **una fila de ejemplo**: reemplázala por los datos reales.

## Orden de carga

1. `cursos-secciones.csv`
2. `horarios.csv`
3. `matriculas.csv`
4. `docentes.csv` (opcional)

Horarios y matrículas buscan la sección por `(curso, codigoSeccion, periodo)`, así que las
secciones deben existir antes.

## Reglas de formato

- Separador `,` o `;` (Excel en español usa `;`), con BOM opcional.
- `tipoEspacioRequerido`: `AULA_TEORICA` o `LABORATORIO`.
- `diaSemana`: `LUNES` … `DOMINGO` (acepta minúsculas y tilde).
- `horaInicio` / `horaFin`: `HH:mm` en 24 h.
- `stackSoftwareRequerido`: nombres del catálogo separados con `|` (o `;`).
- Booleanos: `true/false`, `1/0`, `si/no`.
- Máximo **20 000 filas** y **10 MB** por envío.

## Ejemplo de laboratorio con software

```csv
2020101,CURSO DE EJEMPLO,1-LAB,2027-1,LABORATORIO,Python 3.12|VS Code
```

Cada nombre debe existir en el catálogo de software. Si no, la fila se rechaza con
`SOFTWARE_NO_REGISTRADO` y no se guarda la sección.

## Ojo

- El Excel `backend/prisma/data/seed-plantilla.xlsx` **no** es una plantilla de importación:
  es el formato interno del seed.
- Reimportar el mismo periodo actualiza; un periodo nuevo inserta secciones nuevas.
