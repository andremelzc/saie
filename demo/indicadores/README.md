# Datos de demostración para las reglas de software, accesibilidad y capacidad real

Con los datos del periodo `2026-2` (exportación del 2026-11-25) tres reglas se cumplen sin ponerse a prueba:

- ninguna matrícula tiene **movilidad reducida** (R-07, Piso 1);
- ninguna sección de laboratorio pide **software** (R-06);
- ningún laboratorio tiene **PCs malogradas** (R-03, capacidad real).

Esta guía carga unos pocos casos **desde la propia aplicación** (sin tocar la base a mano), para que esas reglas se vean en la demo y den números en los indicadores. Cada paso es una acción normal de Coordinación o de Jefatura y queda en la auditoría.

> Los alumnos que se marcan con movilidad reducida son **anónimos** (`X-…`), generados para completar vacantes. No se atribuye ninguna condición a un alumno real.

## Archivos

| Archivo | Dónde está | Qué cambia |
|---|---|---|
| `cursos-secciones-mysql.csv` | esta carpeta | `202SW0503` Base de Datos I: sus dos laboratorios (`1-LAB` y `2-LAB`) piden **MySQL**. Incluye las cuatro secciones del curso para que ninguna quede inactiva. |
| `matriculas-movilidad-reducida.csv` | `backend/prisma/export/demo-indicadores/` (fuera de git: tiene datos de alumnos reales) | Las matrículas completas de 6 secciones (170 filas). Un alumno anónimo por curso pasa a movilidad reducida, en teoría y en laboratorio. El resto queda igual. |
| `calcular_indicadores.py` | esta carpeta | Recalcula los indicadores TO-BE a partir de la exportación. |

## Preparación (antes de la sustentación, en este orden)

### 1. Software requerido (R-06): error de asignación y su solución

Este caso se muestra **en vivo**: la sección se escala por falta de software y se resuelve instalándolo.

**Preparación (una vez):** **Coordinación → Software → Nuevo:** registrar **MySQL sin versión**, y **no** instalarlo en ningún laboratorio. El CSV dice «MySQL» sin versión y el catálogo busca nombre y versión exactos.

**En vivo:**

1. **Coordinación → Carga de datos → Cursos y secciones:** subir `cursos-secciones-mysql.csv`. Se guardan 4 filas y se dispara la asignación.
2. **Inicio de Coordinación:** `202SW0503 1-LAB` y `2-LAB` aparecen en «Esperan revisión»: ningún laboratorio tiene MySQL.
3. **Jefatura → Cambio de laboratorio:** instalar MySQL en **Antiguo Pabellón · Aula 306 - Laboratorio 03**. Está libre en los dos horarios (viernes de 10:00 a 13:00 y lunes de 17:00 a 19:00) y cada sección tiene 7 alumnos.
4. **Inicio de Coordinación:** pulsar **«Reintentar»** en cada una de las dos secciones. Ambas quedan asignadas al Laboratorio 03.

**Para repetirlo después de un ensayo:** Jefatura desinstala MySQL del Laboratorio 03 y Coordinación vuelve a subir el CSV, para que las dos secciones queden escaladas otra vez.

### 2. Movilidad reducida (R-07)

1. **Coordinación → Carga de datos → Matrículas:** subir `backend/prisma/export/demo-indicadores/matriculas-movilidad-reducida.csv`.
   - Súbelo **sin editar las listas** y poco después de exportar: la carga deja cada sección exactamente como el archivo. Si se agregan o retiran matrículas de esas secciones en la base, vuelve a exportar antes.

**Resultado esperado:** 170 filas, **0 retiradas**, y la asignación se vuelve a ejecutar.

| Curso y sección | Hoy | Debería quedar |
|---|---|---|
| `202SW0203` sección 2 y 2-LAB (14 alumnos) | Piso 2 y Piso 3 | **Piso 1**: hay aulas y el Laboratorio 08 libres a esa hora |
| `202SW0605` sección 2 y 2-LAB (10 alumnos) | Piso 2 | **Piso 1**: hay aulas y el Laboratorio 11 libres a esa hora |
| `202SW0805` sección 2 y 2-LAB (61 alumnos) | Piso 2 | Se queda arriba: ningún bloque del Piso 1 cubre 61 alumnos. Debe aparecer una **alerta de ACCESIBILIDAD** |

El tercer caso es intencional: muestra que el sistema no oculta el problema cuando no puede cumplir la regla.

## Demo B en vivo: PCs malogradas (R-03)

Esto se hace **durante la sustentación**:

1. **Jefatura → Cambio de laboratorio → Antiguo Pabellón · Aula 110 - Laboratorio 11:** registrar **2 PCs inoperativas** (capacidad real 21 → 19).
2. **Detección:** se crean alertas de **CAPACIDAD** para las dos secciones llenas de ese laboratorio:
   - `202SW0502 1-LAB` Arquitectura de Computadoras (21 alumnos, miércoles 16:00 a 18:00);
   - `202SW0607 2-LAB` Sistemas Operativos (21 alumnos, viernes 10:00 a 12:00).

   Si está configurado `TELEGRAM_CHAT_JEFATURA`, Jefatura recibe el aviso.
3. **Acción correctiva:** **Coordinación → Alertas → Reubicar secciones.** Hay laboratorios libres a esas horas (Laboratorios 03, 04 y 06 del Antiguo Pabellón).
4. **Registro:** la reubicación queda en el **Historial** y el alumno ve su nuevo laboratorio.

Las otras secciones de ese laboratorio (17 y 15 alumnos) siguen cabiendo con 19 puestos y no generan alerta. Eso también sirve para explicar que la regla compara la capacidad real con cada sección.

## Después

```
cd backend
npm run prisma:export
cd ..
python demo/indicadores/calcular_indicadores.py
```

Con eso salen los porcentajes de «secciones con software requerido que lo tienen» y de «secciones con movilidad reducida en el Piso 1», que hoy dicen «sin datos».

## Cómo deshacerlo

- **PCs malogradas:** volver a 0 en Cambio de laboratorio. Las secciones reubicadas se quedan donde están hasta la siguiente corrida.
- **Software:** subir de nuevo `202SW0503` con `stackSoftwareRequerido` vacío.
- **Movilidad reducida:** subir de nuevo el `04-matriculas.csv` de la exportación anterior, filtrado a esas 6 secciones.
