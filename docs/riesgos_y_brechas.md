# Riesgos y brechas funcionales — SAIE

> **Fecha de la revisión:** 24/11/2026 · **Rama revisada:** `develop` en `cce4b32`
> **Alcance:** motor de asignación, accesibilidad, roles y permisos, espacios y alertas, secciones y presentación, seguridad y privacidad, importaciones, calidad de los datos, gestión de periodos, operación y dependencias. El Anexo A detalla qué ángulos se revisaron y cuáles no.
> **Cómo se comprobó cada hallazgo:**
> - **Simulación:** se ejecutó el motor (funciones puras, sin tocar la base) con un caso armado para reproducir el problema.
> - **Código:** se leyó el código y se siguió el flujo completo.
> - **Base:** se consultó la base de datos real (solo lectura).
> - **`npm audit`** y **Reproducido:** se ejecutó la herramienta o el paso indicado.
>
> Este documento **no** modifica código ni datos. Es el insumo para registrar los issues y priorizar el trabajo antes de la entrega.
>
> **Cómo leer cada riesgo:** *Qué pasa* (el problema, con ejemplo), *Dónde está* (enlace al código, cuando aplica), *Decisión* (si el equipo ya decidió algo), *Propuesta* (cómo solucionarlo) y *Criterios de aceptación* (cómo comprobar que quedó resuelto).
>
> **Documentos relacionados:** [`guia_pruebas_por_rol.md`](./guia_pruebas_por_rol.md) (guía de pruebas manuales, que remite a este documento en sus hallazgos conocidos).

---

## Resumen

| Gravedad | Significado | Cantidad |
|---|---|---|
| 🔴 Crítica | Rompe una garantía básica del sistema, deja a una persona sin atender o permite tomar una cuenta ajena | 7 |
| 🟠 Alta | Un flujo importante no funciona, se puede abusar o deja datos incorrectos | 15 |
| 🟡 Media | Falta una función esperable o la información confunde | 20 |
| ⚪ Baja | Detalle, caso borde o riesgo a futuro | 10 |
| | **Total** | **52** |

### Tabla general

> **Seguimiento en GitHub:** los riesgos a solucionar tienen su issue en el milestone *Sprint 6 — Correcciones de la auditoría* (etiqueta `auditoria-final`). Los aceptados para la demo no llevan issue: su registro es la tabla de decisiones.

| # | Área | Riesgo | Grav. | Comprobado | Issue |
|---|---|---|---|---|---|
| 1 | Motor | La corrida completa puede asignar dos secciones a la misma aula a la misma hora | 🔴 | Simulación | [#409](https://github.com/andremelzc/saie/issues/409) |
| 2 | Motor | Las secciones pequeñas ocupan aulas grandes | 🟠 | Simulación | [#410](https://github.com/andremelzc/saie/issues/410) |
| 3 | Motor | El motor no detecta que un aula dejó de servir; las alertas no tienen salida | 🔴 | Código | [#411](https://github.com/andremelzc/saie/issues/411) |
| 4 | Motor | No existe asignación manual de secciones escaladas | 🟠 | Código | [#412](https://github.com/andremelzc/saie/issues/412) |
| 5 | Motor | «Reintentar» considera aulas ocupadas de otros periodos | 🟡 | Código | [#427](https://github.com/andremelzc/saie/issues/427) |
| 6 | Motor | Si ningún laboratorio tiene el software, la sección escala en lugar de asignarse con aviso | 🟡 | Código | [#413](https://github.com/andremelzc/saie/issues/413) |
| 7 | Motor | Las secciones sin horarios cuentan como escaladas | ⚪ | Base | [#414](https://github.com/andremelzc/saie/issues/414) |
| 8 | Motor | Una sección se reparte en varias aulas a la vez sin confirmación | ⚪ | Base | [#439](https://github.com/andremelzc/saie/issues/439) |
| 9 | Motor | No se puede reorganizar dando prioridad a las escaladas al inicio del ciclo | ⚪ | Código | [#415](https://github.com/andremelzc/saie/issues/415) |
| 10 | Accesibilidad | Si no hay lugar en el piso 1, se asigna otro piso sin avisar a nadie | 🔴 | Código + Base | [#416](https://github.com/andremelzc/saie/issues/416) |
| 11 | Accesibilidad | Reimportar las matrículas borra la declaración del alumno | 🔴 | Código | [#416](https://github.com/andremelzc/saie/issues/416) |
| 12 | Accesibilidad | Cualquier alumno puede declararse con movilidad reducida sin verificación | 🟠 | Código | [#417](https://github.com/andremelzc/saie/issues/417) |
| 13 | Accesibilidad | Declarar la condición no reasigna ni avisa a nadie | 🟠 | Código | [#417](https://github.com/andremelzc/saie/issues/417) |
| 14 | Accesibilidad | Coordinación no tiene una vista de quién necesita accesibilidad | 🟡 | Código | [#417](https://github.com/andremelzc/saie/issues/417) |
| 15 | Accesibilidad | Los docentes no pueden declarar movilidad reducida | 🟡 | Código | [#418](https://github.com/andremelzc/saie/issues/418) |
| 16 | Accesibilidad | La condición es un solo sí/no y no vence | ⚪ | Código | [#418](https://github.com/andremelzc/saie/issues/418) |
| 17 | Roles | Jefatura no tiene laboratorios a cargo | 🔴 | Base | [#422](https://github.com/andremelzc/saie/issues/422) |
| 18 | Espacios | Deshabilitar un espacio con clases no genera alerta | 🟠 | Código | [#411](https://github.com/andremelzc/saie/issues/411) |
| 19 | Alertas | Las alertas e incidencias no notifican a nadie | 🟡 | Código | [#423](https://github.com/andremelzc/saie/issues/423) |
| 20 | Roles | Nadie puede restablecer la clave de Coordinación ni de Jefatura | 🟡 | Código | [#424](https://github.com/andremelzc/saie/issues/424) |
| 21 | Secciones | El horario de una sección no se puede editar en pantalla | 🟡 | Código | [#425](https://github.com/andremelzc/saie/issues/425) |
| 22 | Secciones | Pasar una sección de teoría a laboratorio la duplica; el docente no puede pedirlo | 🟡 | Base + Código | [#435](https://github.com/andremelzc/saie/issues/435) |
| 23 | Presentación | Teoría y laboratorio se muestran como cursos distintos | 🟡 | Código | [#419](https://github.com/andremelzc/saie/issues/419) |
| 24 | Avisos | Los docentes no reciben aviso de cambio de aula | 🟡 | Código | [#436](https://github.com/andremelzc/saie/issues/436) |
| 25 | Periodos | El cambio de periodo depende de la configuración del servidor | 🟡 | Código | [#427](https://github.com/andremelzc/saie/issues/427) |
| 26 | Carga de datos | La «última carga» se guarda en el navegador | ⚪ | Código | [#346](https://github.com/andremelzc/saie/issues/346) |
| 27 | Operación | Tras un `git pull` el backend no compila sin `prisma generate` | ⚪ | Reproducido | [#434](https://github.com/andremelzc/saie/issues/434) |
| 28 | Operación | El bloqueo de corridas vive en memoria | ⚪ | Código | [#440](https://github.com/andremelzc/saie/issues/440) |
| 29 | Motor / UI | «Reintentar» no sirve si nada cambió y la pantalla no lo explica | 🟠 | Código | [#412](https://github.com/andremelzc/saie/issues/412) |
| 30 | Seguridad | Cualquiera que conozca un código puede tomar una cuenta no activada | 🔴 | Código + Base | Aceptado (demo) |
| 31 | Privacidad | La consulta pública revela dónde estará cualquier alumno, sin iniciar sesión | 🟠 | Código | Aceptado (demo) |
| 32 | Seguridad | Restablecer o cambiar la clave no cierra las sesiones abiertas | 🟡 | Código | [#424](https://github.com/andremelzc/saie/issues/424) |
| 33 | Seguridad | Telegram se vincula con la clave inicial y los límites de intentos se reinician | 🟡 | Código | Aceptado (demo) |
| 34 | Importación | Un CSV con errores deja la base a medias | 🟠 | Código | [#428](https://github.com/andremelzc/saie/issues/428) |
| 35 | Importación | Las importaciones nunca borran: retiros y horarios cambiados quedan duplicados | 🟠 | Código | [#429](https://github.com/andremelzc/saie/issues/429) |
| 36 | Importación | No se advierten los choques de horario de docentes y alumnos al importar | 🟡 | Código + Base | [#428](https://github.com/andremelzc/saie/issues/428) |
| 37 | Privacidad | La consulta pública carga la ficha médica y no filtra por periodo | ⚪ | Código | [#420](https://github.com/andremelzc/saie/issues/420) |
| 38 | Importación | Un CSV guardado desde Excel rompe las tildes y la ñ | 🟠 | Código | [#430](https://github.com/andremelzc/saie/issues/430) |
| 39 | Importación | Las importaciones grandes superan el tiempo de espera y siguen corriendo | 🟠 | Código + Base | [#431](https://github.com/andremelzc/saie/issues/431) |
| 40 | Operación | El primer acceso tras un rato sin uso falla por tiempo de espera | 🟡 | Código | Aceptado |
| 41 | Datos | La regla de software nunca se ha probado: no hay software cargado | 🟠 | Base | [#438](https://github.com/andremelzc/saie/issues/438) |
| 42 | Accesibilidad | 30 espacios sobre el piso 1 no tienen distancia al ascensor | 🟡 | Base | [#416](https://github.com/andremelzc/saie/issues/416) |
| 43 | Auditoría | Varias acciones importantes no dejan registro de quién las hizo | 🟡 | Código | [#426](https://github.com/andremelzc/saie/issues/426) |
| 44 | Dependencias | Librerías con vulnerabilidades conocidas | 🟡 | `npm audit` | [#433](https://github.com/andremelzc/saie/issues/433) |
| 45 | Incidencias | La evidencia es solo un enlace; no se puede adjuntar una foto | ⚪ | Código | [#437](https://github.com/andremelzc/saie/issues/437) |
| 46 | Telegram | Los mensajes repetidos por Telegram se procesan dos veces | ⚪ | Código | [#421](https://github.com/andremelzc/saie/issues/421) |
| 47 | Datos | El nombre de un curso está corrupto y falta otro curso (`202SW0303`) | 🟠 | Base | [#432](https://github.com/andremelzc/saie/issues/432) |
| 48 | Datos | Cursos generales (Química, Redacción, Realidad Nacional…) tienen secciones de laboratorio de cómputo | 🟡 | Base | [#439](https://github.com/andremelzc/saie/issues/439) |
| 49 | Periodos | Un error al escribir el periodo (por ejemplo «2026-I») cambia el periodo de todo el sistema | 🔴 | Base + Código | [#427](https://github.com/andremelzc/saie/issues/427) |
| 50 | Periodos | Se puede registrar y modificar información de periodos que ya terminaron | 🟠 | Código | [#427](https://github.com/andremelzc/saie/issues/427) |
| 51 | Periodos | El sistema cambia de periodo en cuanto se carga el siguiente, aunque el actual no haya terminado | 🟠 | Código | [#427](https://github.com/andremelzc/saie/issues/427) |
| 52 | Periodos | Varias pantallas y reglas mezclan datos de distintos periodos | 🟡 | Código | [#427](https://github.com/andremelzc/saie/issues/427) |

### Estado de las correcciones (PR #441)

| Estado | Riesgos |
|---|---|
| **Resueltos** | R1 (doble reserva), R2 (aulas de menor a mayor), R3 y R18 (espacios que dejan de servir, alerta al deshabilitar y «Reubicar secciones»), R7 (secciones sin horarios como datos incompletos), R10 (alerta de accesibilidad), R11 (la importación conserva la movilidad declarada), R17 (Jefatura a cargo de los laboratorios, aplicado en Supabase), R27 (indicación en README y AGENTS.md), R34 y R36 (importación todo o nada y avisos de choques), R46 (Telegram sin respuestas repetidas), R49 (normalización y validación del periodo), R37 (consulta pública sin ficha médica y solo con el periodo vigente), R38 (CSV de Excel con tildes y ñ), R39 (importaciones en segundo plano con avance y una sola carga por tipo), R25, R50, R51 y R52 (periodos gestionados por Coordinación: registrar, activar y cerrar, escrituras bloqueadas en periodos cerrados, filtro por el vigente) |
| **En parte** | R35 (matrículas y horarios ya reflejan retiros y cambios de hora; faltan la vista previa antes de confirmar y marcar como inactivas las secciones que dejan de aparecer) |
| **Pendientes** | El resto de los issues del milestone *Sprint 6 — Correcciones de la auditoría* |

La migración `20261125000000_alerta_accesibilidad` (valor `ACCESIBILIDAD` en `TipoAlerta`) ya está aplicada en Supabase.

La migración `20261126000000_periodos` (tabla `periodos`, valor `CAMBIO_PERIODO` y registro del periodo actual como vigente) ya está aplicada en Supabase: `2026-2` quedó como vigente.

### Decisiones tomadas

| # | Decisión | Fecha |
|---|---|---|
| #17 | **A solucionar.** Llenar `EspacioResponsable` con todos los laboratorios para la Jefatura (seed + laboratorios nuevos). No se elimina la tabla: la base ya está modelada así | 24/11/2026 |
| #2 | **A solucionar.** Ocupar las aulas de menor a mayor; la cercanía queda como desempate | 24/11/2026 |
| #12 | **A solucionar.** La declaración de accesibilidad del alumno debe confirmarla Coordinación antes de aplicarse | 24/11/2026 |
| #30, #31 | **Riesgo aceptado (demo).** Se acepta porque el sistema no está en producción. **Debe resolverse antes de usarlo con usuarios reales** | 24/11/2026 |
| #33 | **Riesgo aceptado (demo),** por ser una variante de #30. Se resuelve junto con él | 24/11/2026 |
| #34 | **A solucionar.** Importación «todo o nada»: un CSV con al menos un error no guarda ninguna fila | 24/11/2026 |
| #35 | **A solucionar.** Las importaciones deben reflejar retiros y cambios de horario | 24/11/2026 |
| #37 | **A solucionar.** La consulta pública no debe leer la ficha médica y debe filtrar por periodo | 24/11/2026 |
| #40 | **Riesgo conocido y aceptado.** Ya estaba documentado en `docs/arquitectura.md` (plan gratuito de Render). Mitigación para la demo: abrir el sistema unos minutos antes | 24/11/2026 |
| #44 | **A solucionar como proceso,** no como cambio puntual: es normal que aparezcan vulnerabilidades nuevas en las librerías, así que se revisan de forma periódica | 24/11/2026 |
| #38, #39, #41, #42, #43, #45, #46, #47, #48 | **A solucionar** | 24/11/2026 |
| #25, #49, #50, #51, #52 | **A solucionar.** El cambio de periodo debe hacerse desde Coordinación, y no debe permitirse registrar información en periodos que ya terminaron (ver sección 9) | 24/11/2026 |
| #41 | **Primero proponer, después cargar.** El catálogo de software del Anexo B lo revisa y aprueba **el propio equipo**; solo entonces se carga | 24/11/2026 |
| #1, #3–#11, #13–#16, #18–#24, #26–#29, #32, #36 | **Sin decisión explícita todavía.** El documento propone solucionarlos; falta que el equipo los priorice. Las preguntas abiertas están en el Anexo C | — |

> Los riesgos **#3, #4 y #29** son en el fondo un mismo problema: **cuando el motor no puede resolver algo, el sistema no le da a Coordinación ninguna salida.** Conviene diseñarlos juntos.

### Prioridad sugerida para la entrega

1. **#1** — Doble reserva: es la garantía más básica del sistema.
2. **#49** — Un error al escribir el periodo en un CSV deja todo el sistema en un periodo que no existe.
3. **#10 y #11** — Un alumno en silla de ruedas puede terminar en el piso 3 sin que nadie lo sepa.
4. **#17** — Desbloquea todo el rol de Jefatura y las pruebas de la guía.
5. **#3, #4 y #29** — Dan salida a las alertas y a las secciones escaladas.
6. **#34 y #35** — Las recargas de datos dejan información incorrecta.
7. **#2, #12 y #31** — Uso eficiente de las aulas, abuso de la accesibilidad y privacidad de la consulta pública.
8. El resto, según el tiempo disponible.

---

## 1. Motor de asignación

### #1 🔴 La corrida completa puede asignar dos secciones a la misma aula a la misma hora

**Qué pasa.** En la corrida completa del periodo, el motor recorre las secciones en un orden fijo: primero las que tienen alumnos con movilidad reducida, luego de mayor a menor número de alumnos. Las secciones cuyos datos no cambiaron **conservan su aula** (idempotencia), pero esa aula solo se marca como ocupada **cuando el recorrido llega a esa sección**. Si antes pasa una sección que sí cambió, ve el aula libre y la toma.

**Ejemplo reproducido (simulación).**

| Sección | Alumnos | Situación previa | ¿Cambió? |
|---|---|---|---|
| S1 | 45 | Aula B (40 asientos), lunes 8–10 | Sí: subió de 35 a 45 alumnos |
| S2 | 30 | Aula A (50 asientos), lunes 8–10 | No |

Resultado de la corrida:

```
S1 VIGENTE [ 'A' ]
S2 VIGENTE [ 'A' ] (conservada)
```

**Las dos secciones quedan en el aula A el lunes de 8 a 10.**

**Cuándo ocurre en la vida real.** Cada vez que se recarga el CSV de matrículas, de horarios o de cursos y luego se vuelve a correr la asignación (la carga de datos la dispara sola). Basta con que una sección grande cambie y otra más pequeña no.

**Dónde está.**
- [corridaBatch.ts:90](../backend/src/rules/corridaBatch.ts) — antes del recorrido solo se marcan como ocupadas las asignaciones de secciones que **no** están en el lote; en una corrida completa todas están en el lote, así que no se marca ninguna.
- [corridaBatch.ts:178](../backend/src/rules/corridaBatch.ts) — la ocupación de una sección conservada se registra recién al llegar a ella.

**Por qué no lo atrapan las pruebas.** Las pruebas cubren la idempotencia y la ausencia de choques por separado, pero no la combinación: una sección que cambió procesada antes que una conservada que comparte franja.

**Propuesta.**
1. Antes del recorrido, marcar como ocupadas **todas** las asignaciones vigentes cuya huella no cambió (las que se van a conservar).
2. Procesar después solo las secciones que cambiaron o están escaladas.
3. Mantener el verificador de corrida (Issue 2.17) como red de seguridad y hacer que una doble reserva **bloquee** la persistencia en lugar de solo informarla.

**Criterios de aceptación.**
- Con el caso de la tabla, S1 no puede quedar en el aula A.
- Ninguna corrida completa produce dos asignaciones vigentes en el mismo espacio y franja.

---

### #2 🟠 Las secciones pequeñas ocupan aulas grandes

> **Decisión: a solucionar.** Ocupar las aulas de menor a mayor.

**Qué pasa.** Al elegir entre varios espacios posibles, el motor ordena así ([orquestadorAsignacion.ts:224](../backend/src/rules/orquestadorAsignacion.ts)):

1. Piso 1 (solo si hay movilidad reducida).
2. **Cercanía con las otras secciones del mismo curso.**
3. Menor número de espacios.
4. **Menor desperdicio de asientos.**
5. Menor piso.

Como la cercanía va antes que el desperdicio, una sección pequeña prefiere un aula enorme en el mismo piso que su sección hermana antes que un aula justa en otro piso.

**Ejemplo reproducido (simulación).** Sección de 20 alumnos; otra sección del curso está en el piso 1. Opciones: auditorio de 200 asientos en el piso 1 y aula de 25 en el piso 2.

```
20 alumnos -> [ 'AUDITORIO-200' ]
```

**Consecuencia.** Más adelante, una sección grande que solo cabía en ese auditorio no encuentra lugar y escala. El problema no se ve en la sección pequeña, sino en otra.

**Propuesta.** Ocupar los salones de menor a mayor:
1. Menor desperdicio de asientos (el aula más pequeña en la que la sección quepa).
2. Cercanía con las secciones del curso, solo como desempate entre aulas de tamaño parecido (por ejemplo, desperdicio dentro de un margen de 10 asientos).
3. El resto de criterios igual.

**Criterios de aceptación.**
- En el ejemplo, la sección de 20 queda en el aula de 25.
- Con aulas de tamaño similar, sigue ganando la más cercana a las otras secciones del curso.

---

### #3 🔴 El motor no detecta que un aula dejó de servir; las alertas no tienen salida

**Qué pasa.** Para decidir si conserva una asignación, el motor calcula una huella con los datos **de la sección**: curso, código, periodo, tipo de espacio, número de alumnos, movilidad reducida, horarios y software requerido ([orquestadorAsignacion.ts:32](../backend/src/rules/orquestadorAsignacion.ts)). **El estado del aula no forma parte de la huella.** Por lo tanto, si el aula cambia, la sección se conserva tal cual.

**Casos concretos.**

| Qué cambia en el aula | ¿Se genera alerta? | ¿Reasignar la mueve? |
|---|---|---|
| Jefatura registra PCs malogradas y la capacidad ya no alcanza | Sí, de capacidad | **No** |
| Coordinación baja el aforo | Sí, de capacidad | **No** |
| Se desinstala software que la sección necesita | Sí, de software | **No** |
| Se deshabilita el espacio | **No** (ver #18) | **No** |

Además, en la pantalla de alertas la única acción es **«marcar como resuelta»**: no hay botón para reubicar la sección afectada.

**Ejemplo con datos reales.** `202SW0805 2-LAB` tiene 61 alumnos en los laboratorios 01, 02 y 03 del Nuevo Pabellón (21 puestos cada uno, 63 en total). Si Jefatura marca 3 PCs malogradas en el laboratorio 01, la capacidad baja a 60 y se genera la alerta. Al reasignar, la sección **se queda en los mismos laboratorios** con un alumno sin puesto.

**Propuesta.**
1. Antes de conservar una asignación, comprobar que sus espacios **siguen sirviendo**: habilitados, con capacidad real suficiente y con el software requerido. Si alguno falla, reevaluar la sección.
2. En cada alerta, agregar la acción **«Reubicar sección»**, que reasigna las secciones afectadas y muestra el resultado (nueva aula o escalada).
3. Cerrar la alerta automáticamente cuando todas sus secciones quedan resueltas.

**Criterios de aceptación.**
- Tras bajar la capacidad por debajo del número de alumnos, reasignar mueve la sección o la escala con el motivo correcto.
- Desde la alerta se puede reubicar sin salir de la pantalla.

---

### #4 🟠 No existe asignación manual de secciones escaladas

**Qué pasa.** Una sección escalada solo sale de ese estado si cambian sus datos. Cuando escala porque **todas las aulas están ocupadas a su hora** o porque **no hay un bloque contiguo libre**, no hay ningún dato que corregir: el problema es que otras secciones ocupan las aulas. Como el motor conserva las asignaciones vigentes, ningún reintento las mueve.

**Motivos de escalamiento y su salida actual.**

| Motivo | ¿Tiene salida hoy? |
|---|---|
| Sin horarios definidos | Sí: cargar el CSV de horarios |
| Capacidad insuficiente en todo el campus | No realista en la práctica (protección ante datos mal cargados) |
| Todos los espacios ocupados en la franja | **No** |
| Software faltante en todos los laboratorios | Sí: que Jefatura lo instale (ver también #6) |
| Capacidad fragmentada (no hay bloque contiguo) | **No** |

**Propuesta: asignación manual por Coordinación.**
1. Desde la sección escalada, **«Asignar a mano»**: Coordinación elige uno o más espacios.
2. El sistema **bloquea** los choques de horario (son imposibles) y **advierte** lo demás: faltan asientos, falta software, no está en el piso 1 habiendo movilidad reducida. Coordinación puede confirmar con las advertencias a la vista.
3. La asignación queda marcada como **manual / fijada**. Las corridas siguientes la tratan como una ocupación más y **nunca la mueven**.
4. Motivo obligatorio y registro en auditoría: quién, cuándo, qué espacio, por qué.
5. **«Liberar»**: quita la marca para que el motor vuelva a decidir cuando la causa se resuelva.

**Cambios necesarios.** Campo nuevo en `Asignacion` (origen automático/manual) con su migración, endpoint para Coordinación, respeto de las fijadas en el motor (corrida completa y por sección), acción en el inicio de administración y actualización de la spec 02.

**Criterios de aceptación.**
- Coordinación puede asignar a mano una sección escalada a uno o más espacios.
- Un choque de horario se bloquea; la falta de asientos, de software o de piso 1 se advierte y se puede confirmar.
- Las corridas siguientes no mueven una asignación manual.
- La asignación manual queda en la auditoría con su motivo.
- «Liberar» devuelve la sección al motor.

---

### #5 🟡 «Reintentar» considera aulas ocupadas de otros periodos

**Qué pasa.** La corrida completa solo considera las asignaciones de su periodo, pero la corrida de una sola sección (la que usa «Reintentar») carga **todas** las asignaciones vigentes de la base, de cualquier periodo ([motor.service.ts:123](../backend/src/services/motor.service.ts)).

**Consecuencia.** Cuando se cargue el ciclo 2027-1, las aulas que tenían clases en 2026-2 aparecerán ocupadas al reintentar una sección de 2027-1, y la sección escalará por «horario bloqueado» sin motivo real. Además, ambas corridas dan resultados distintos para la misma sección.

**Hoy no se nota** porque solo existe el periodo 2026-2.

**Propuesta.** Filtrar por el periodo de la sección, igual que la corrida completa. Opcionalmente, pasar a histórico las asignaciones vigentes de un periodo al cerrarlo (ver #25).

**Criterios de aceptación.**
- Con dos periodos cargados, reintentar una sección solo considera ocupadas las aulas de su propio periodo.
- Reintentar una sección y la corrida completa dan el mismo resultado para esa sección.

---

### #6 🟡 Si ningún laboratorio tiene el software, la sección escala en lugar de asignarse con aviso

**Qué pasa.** Si la sección pide un software que ningún laboratorio disponible tiene, el motor la escala y la deja sin aula.

**Lo realista.** Primero se asigna el laboratorio y luego se instala el programa.

**Propuesta.**
1. Si el único impedimento es el software, asignar el laboratorio que mejor encaja en capacidad y ubicación.
2. Marcar la asignación como **«pendiente de instalar software»**.
3. Generar automáticamente una **alerta de software para Jefatura** (el tipo de alerta ya existe), indicando qué programa, en qué laboratorio y para qué sección.
4. Al registrar Jefatura la instalación, cerrar la alerta y quitar la marca.

**Criterios de aceptación.**
- Si el único impedimento es el software, la sección queda asignada y marcada «pendiente de instalar software».
- Se genera una alerta de software para Jefatura con el programa, el laboratorio y la sección.
- Al registrar Jefatura la instalación, la alerta se cierra y la marca desaparece.

---

### #7 ⚪ Las secciones sin horarios cuentan como escaladas

**Qué pasa.** Una sección sin horarios entra al motor, falla de inmediato y aparece entre las escaladas, mezclada con los problemas que requieren una decisión. Hoy es el caso de `DEMO001 DEMO`.

**Propuesta.** No procesarla en el motor y mostrarla aparte como **«Datos incompletos: falta cargar horarios»**, con enlace a la carga de datos o, cuando exista, a la edición de horario (#21).

**Criterios de aceptación.**
- Una sección sin horarios no aparece entre las escaladas.
- Aparece en una lista «Datos incompletos» con un enlace para cargar o editar su horario.

---

### #8 ⚪ Una sección se reparte en varias aulas a la vez sin confirmación

**Qué pasa.** Si ningún espacio individual alcanza, el motor junta hasta 4 espacios contiguos. Ejemplo real: `202SW0805 2-LAB` (61 alumnos) está en tres laboratorios de 21 puestos, con un solo docente en tres salas al mismo tiempo.

**Decisión pendiente del equipo.** ¿Se acepta en la práctica? Si los laboratorios están conectados (puertas internas, un mismo ambiente dividido), sí; si son salas cerradas, no.

**Propuesta.** Permitir el reparto solo entre espacios marcados como «conectables», o pedir confirmación de Coordinación cuando una sección quede repartida.

**Criterios de aceptación.**
- Queda registrada la decisión del equipo.
- Si se restringe, una sección solo se reparte entre espacios marcados como conectables, o requiere la confirmación de Coordinación.

---

### #9 ⚪ No se puede reorganizar dando prioridad a las escaladas al inicio del ciclo

**Qué pasa.** Dar prioridad a una sección escalada implicaría mover a otras que ya tienen aula. Con las clases en curso no conviene, porque cambia el aula de alumnos y docentes que no tenían ningún problema. Pero en las **primeras semanas** los ajustes son normales.

**Límites de la idea.**
- Solo ayuda cuando el motivo es «todas las aulas ocupadas» o «no hay bloque contiguo».
- Si a una hora hay más secciones que aulas, la prioridad solo cambia **quién** se queda fuera.

**Propuesta.** Una acción **«Reorganizar con prioridad»**, disponible solo durante un periodo configurable al inicio del ciclo, que procese primero las escaladas y avise por Telegram a todos los afectados. Fuera de ese periodo, la salida es la asignación manual (#4).

**Criterios de aceptación.**
- La acción solo está disponible durante el periodo configurado al inicio del ciclo.
- Antes de confirmar, muestra cuántas secciones cambiarían de aula.
- Procesa primero las escaladas y avisa por Telegram a todos los afectados.

---

### #29 🟠 «Reintentar» no sirve si nada cambió y la pantalla no lo explica

**Qué pasa.** El motor es determinista: con los mismos datos da el mismo resultado. Si nada cambió desde el último intento, «Reintentar» devuelve exactamente lo mismo. La pantalla muestra **«Esta sección sigue en revisión.»** ([InicioAdmin.tsx:134](../frontend/src/pages/admin/InicioAdmin.tsx)), pero no explica que **nada cambió** ni qué hacer.

**Consecuencia.** Parece que el botón no funciona y Coordinación lo pulsa una y otra vez.

**Propuesta.**
1. Si los datos de la sección no cambiaron desde el último intento, desactivar el botón con el texto «No hay cambios desde el último intento».
2. Mostrar qué puede hacer según el motivo: cargar horarios, pedir instalación de software, o **«Asignar a mano»** (#4).

**Criterios de aceptación.**
- Si los datos de la sección no cambiaron desde el último intento, el botón está desactivado y explica por qué.
- La pantalla muestra la acción sugerida según el motivo, incluida «Asignar a mano».

---

## 2. Accesibilidad

### Cómo funciona hoy

1. **El alumno** declara en su perfil, en la ficha médica: *«¿Tienes alguna condición física que te impide subir a pisos superiores?»*. El texto de ayuda promete: *«Si la marcas, el sistema te prioriza las aulas del primer piso»*.
2. Al guardarlo, el sistema marca **todas** sus matrículas con movilidad reducida ([alumno.service.ts:296](../backend/src/services/alumno.service.ts)).
3. **Coordinación** también puede marcarla con la columna `movilidadReducida` del CSV de matrículas.
4. Si **al menos un alumno** de una sección tiene la marca, el motor prioriza bloques del piso 1 para **toda** la sección.
5. La ruta de referencia del alumno indica «ruta accesible por ascensor».

**Estado de la base hoy:** ningún alumno tiene la condición declarada y ninguna matrícula está marcada. **El flujo nunca se ha probado con datos reales.**

**Espacios habilitados por piso:**

| Piso | Aulas teóricas | Laboratorios |
|---|---|---|
| 1 | 17 | **2** |
| 2 | 15 | 4 |
| 3 | 0 | **11** |

---

### #10 🔴 Si no hay lugar en el piso 1, se asigna otro piso sin avisar a nadie

**Qué pasa.** Si no hay ningún bloque disponible en el piso 1, el motor aplica un plan B: el piso superior más cercano al ascensor ([accesibilidad.ts:93](../backend/src/rules/accesibilidad.ts)). Genera internamente un indicador (`fallbackPiso1Aplicado`) y un motivo, pero ese indicador **no se guarda en la base, no genera alerta, no queda en auditoría y no aparece en ninguna pantalla**.

**Por qué es muy probable.** Solo hay **2 laboratorios habilitados en el piso 1**. Un alumno en silla de ruedas matriculado en `202SW0805 2-LAB` (61 alumnos, necesita 3 laboratorios) quedará casi seguro en el piso 2 o 3.

**Consecuencia.** El alumno llega y no puede entrar al aula. Coordinación no lo sabía.

**Propuesta.**
1. Guardar el plan B en la asignación y mostrarlo.
2. Generar una **alerta de accesibilidad** para Coordinación: «La sección X tiene alumnos con movilidad reducida y quedó en el piso 3».
3. Opcionalmente, escalar la sección en lugar de asignarla fuera del piso 1, para que Coordinación decida (asignación manual, #4).

**Criterios de aceptación.**
- Si una sección con alumnos con movilidad reducida queda fuera del piso 1, se genera una alerta visible para Coordinación.
- La asignación guarda que se aplicó el plan B y se muestra en la sección.
- Si se decide escalar en lugar de usar el plan B, la sección queda escalada con motivo de accesibilidad.

---

### #11 🔴 Reimportar las matrículas borra la declaración del alumno

**Qué pasa.** Al importar el CSV de matrículas, cada matrícula se actualiza con el valor de movilidad reducida **del CSV**, que por defecto es «no» ([matriculas.importer.ts:159](../backend/src/importers/matriculas.importer.ts)).

**Consecuencia.**
- Un alumno que declaró su condición la pierde en la siguiente carga de matrículas.
- Su perfil **sigue mostrando la casilla marcada**, así que cree que está protegido.
- Las matrículas nuevas que llegan después de la declaración tampoco reciben la marca.

**Propuesta.** Al importar, la movilidad reducida de una matrícula debe ser «sí» si el CSV lo indica **o** si el alumno tiene la condición declarada y aprobada (#12). Una importación nunca debe borrar una declaración.

**Criterios de aceptación.**
- Reimportar las matrículas no quita la movilidad reducida de un alumno que la declaró y fue aprobada.
- Una matrícula nueva de ese alumno nace con la marca.

---

### #12 🟠 Cualquier alumno puede declararse con movilidad reducida sin verificación

> **Decisión: a solucionar.** Coordinación confirma la declaración antes de aplicarla.

**Qué pasa.** La declaración del alumno se aplica de inmediato y sin revisión.

**Riesgo.** Un alumno puede marcarla para conseguir aulas en el primer piso. Además, como basta **un** alumno para mover **toda** la sección, el abuso afecta a sus compañeros y quita espacios del piso 1 a quien sí los necesita.

**Propuesta.**
1. La casilla genera una **solicitud** con estado *pendiente*.
2. Coordinación (o el área de Bienestar) la **aprueba o rechaza**, con la misma mecánica que las solicitudes de software.
3. Solo al aprobarla se marca la movilidad reducida en las matrículas.
4. El alumno ve el estado en su perfil: pendiente, aprobada o rechazada con motivo.
5. Por privacidad, no pedir diagnósticos: basta con el requisito de acceso, como ya dice el texto de ayuda.

**Criterios de aceptación.**
- Marcar la casilla crea una solicitud pendiente y no cambia ninguna matrícula.
- Coordinación la aprueba o la rechaza con motivo.
- Solo al aprobarla se marca la movilidad reducida en las matrículas.
- El alumno ve el estado de su declaración en el perfil.

---

### #13 🟠 Declarar la condición no reasigna ni avisa a nadie

**Qué pasa.** Al marcar la casilla solo se actualizan las matrículas. No se reasignan sus secciones, no se avisa a Coordinación y el alumno no recibe confirmación. El cambio recién se aplica cuando alguien vuelve a correr la asignación.

**Consecuencia.** El alumno lee *«el sistema te prioriza las aulas del primer piso»* y puede pasar semanas subiendo escaleras creyendo que ya está resuelto.

**Propuesta.** Al aprobarse la declaración (#12): reasignar las secciones del alumno, informar el resultado (piso 1 conseguido, o alerta si no, ver #10) y avisarle por Telegram y en el portal.

**Criterios de aceptación.**
- Al aprobarse la declaración, las secciones del alumno se reasignan automáticamente.
- El alumno recibe la confirmación del resultado: piso 1 conseguido, o aviso de que no fue posible.

---

### #14 🟡 Coordinación no tiene una vista de quién necesita accesibilidad

**Qué pasa.** No existe ninguna pantalla con los alumnos que declararon movilidad reducida, sus secciones y si quedaron o no en el piso 1.

**Propuesta.** Vista «Accesibilidad» en administración: solicitudes pendientes, alumnos aprobados, secciones afectadas y su piso actual, resaltando las que quedaron fuera del piso 1.

**Criterios de aceptación.**
- Existe una vista con las solicitudes pendientes, los alumnos aprobados y las secciones afectadas con su piso actual.
- Se resaltan las secciones que quedaron fuera del piso 1.

---

### #15 🟡 Los docentes no pueden declarar movilidad reducida

**Qué pasa.** Solo existe para alumnos (`Matricula.movilidadReducida` y la ficha médica del alumno). Un docente en silla de ruedas no tiene cómo indicarlo y el motor no lo considera.

**Propuesta.** Agregar la declaración al portal docente, con la misma aprobación (#12), y que el motor priorice el piso 1 en las secciones de ese docente.

**Criterios de aceptación.**
- Un docente puede declarar la condición, sujeta a la misma aprobación que los alumnos.
- El motor prioriza el piso 1 en las secciones de ese docente.

---

### #16 ⚪ La condición es un solo sí/no y no vence

**Qué pasa.** No distingue una condición permanente (silla de ruedas) de una temporal (una pierna enyesada por un mes). Una condición temporal queda marcada para siempre, salvo que el alumno recuerde desmarcarla.

**Propuesta.** Agregar una **fecha de fin** opcional. Al vencer, se quita la marca y se reasigna. Si se quiere más detalle, un tipo de requisito (no un diagnóstico): «no puede usar escaleras», «necesita espacio para silla de ruedas».

**Criterios de aceptación.**
- Se puede indicar una fecha de fin opcional.
- Al vencer, se quita la marca y se reasignan las secciones afectadas.

---

## 3. Roles, espacios y alertas

### #17 🔴 Jefatura no tiene laboratorios a cargo

> **Decisión: a solucionar.** Llenar la tabla; no se elimina.

**Qué pasa.** Jefatura solo puede ver y editar los laboratorios que figuran en la tabla `EspacioResponsable` ([acceso.service.ts:9](../backend/src/services/acceso.service.ts)). La tabla está **vacía** y **ninguna pantalla, seed ni script la llena**.

**Consecuencia.** La cuenta `jefatura` ve vacíos los espacios, las alertas y las incidencias, y recibe *«No tienes asignado este laboratorio»* en cualquier laboratorio. Si un docente reporta una incidencia, **nadie de Jefatura la ve**.

**Contexto.** En la facultad hay una sola Jefatura, responsable de todos los laboratorios. La tabla se mantiene porque la base ya está modelada así y permite repartir laboratorios si algún día hiciera falta.

**Propuesta (acordada).**
1. Agregar al seed un paso que vincule toda cuenta de Jefatura con todos los laboratorios.
2. Ejecutar solo ese paso en la base actual (no el seed completo, que recarga el Excel).
3. Al crear un laboratorio nuevo, vincularlo automáticamente a Jefatura.

**Criterios de aceptación.**
- La cuenta de Jefatura ve todos los laboratorios, con sus alertas e incidencias.
- Abrir o editar cualquier laboratorio ya no devuelve 403.
- Un laboratorio creado después queda a cargo de Jefatura automáticamente.
- Las aulas teóricas siguen fuera del alcance de Jefatura.

---

### #18 🟠 Deshabilitar un espacio con clases no genera alerta

**Qué pasa.** Al editar un espacio, solo un cambio de **aforo** evalúa capacidad y genera alerta ([espacioAdmin.service.ts:445](../backend/src/services/espacioAdmin.service.ts)). Deshabilitar un espacio que tiene secciones asignadas no avisa a nadie, y por #3 esas secciones siguen asignadas a un espacio deshabilitado.

**Propuesta.** Al deshabilitar un espacio con asignaciones vigentes: advertir antes de confirmar («Este espacio tiene N secciones asignadas»), generar la alerta y ofrecer «Reubicar secciones».

**Criterios de aceptación.**
- Al deshabilitar un espacio con asignaciones vigentes, se advierte antes de confirmar.
- Se genera una alerta con las secciones afectadas.
- Desde la alerta se pueden reubicar esas secciones.

---

### #19 🟡 Las alertas e incidencias no notifican a nadie

**Qué pasa.** Jefatura y Coordinación tienen que entrar a revisar. Una incidencia de prioridad alta («no funciona ningún proyector») puede esperar horas sin que nadie la vea.

**Propuesta.** Aviso inmediato a Jefatura por Telegram para incidencias de prioridad alta, y un contador visible en el inicio de administración.

**Criterios de aceptación.**
- Una incidencia de prioridad alta genera un aviso inmediato a Jefatura.
- El inicio de administración muestra cuántas alertas e incidencias hay pendientes.

---

### #20 🟡 Nadie puede restablecer la clave de Coordinación ni de Jefatura

**Qué pasa.** Coordinación restablece las claves de alumnos y docentes, pero las cuentas de Coordinación y Jefatura solo se crean en el seed. Si se olvida su clave, solo se arregla tocando la base.

**Propuesta.** Como mínimo, un procedimiento documentado (script de restablecimiento). Idealmente, que Coordinación pueda restablecer la de Jefatura, y un procedimiento de soporte para la de Coordinación.

**Criterios de aceptación.**
- Existe un procedimiento documentado y probado para restablecer la clave de Coordinación y de Jefatura.
- Si se implementa en pantalla, el restablecimiento queda en la auditoría.

---

## 4. Secciones, datos y presentación

### #21 🟡 El horario de una sección no se puede editar en pantalla

**Qué pasa.** En la edición de secciones solo se puede cambiar el tipo de espacio, el docente y el software requerido ([seccionAdmin.service.ts:144](../backend/src/services/seccionAdmin.service.ts)). Para corregir el horario de **una** sección hay que volver a cargar el CSV de horarios completo.

**Propuesta.** Editar los horarios de una sección desde la pantalla de Secciones, validando el formato y los choques del docente, y reasignar la sección al guardar.

**Criterios de aceptación.**
- Coordinación puede agregar, cambiar y quitar franjas de una sección desde Secciones.
- Se rechaza un inicio igual o posterior al fin, y se advierte el choque con otra sección del mismo docente.
- Al guardar, la sección se reasigna.

---

### #22 🟡 Pasar una sección de teoría a laboratorio la duplica; el docente no puede pedirlo

**Cómo se modela hoy.** Cada grupo de un curso son **dos secciones**, cada una con su horario y tipo de espacio. De los 50 cursos, 48 tienen teoría y laboratorio. Ejemplo:

| Sección | Tipo | Docente | Horario |
|---|---|---|---|
| `2` | Aula teórica | 0A0690 | Jueves 18:00–20:00 |
| `2-LAB` | Laboratorio | 0A0690 | Jueves 20:00–22:00 |

**Qué pasa.** Algunos docentes dictan todas las horas en laboratorio. Hoy Coordinación puede cambiar el tipo de la sección `2` a laboratorio, pero quedan **dos secciones de laboratorio** del mismo grupo, que el motor trata por separado y que pueden caer en **laboratorios distintos** a mitad de la clase. Además, el docente no tiene forma de pedir el cambio.

**Propuesta.**
1. **Fusión:** los horarios de la sección `2` pasan a `2-LAB` (jueves 18:00–22:00), la sección de teoría se retira conservando su historial y se libera su aula. Como el motor busca un espacio libre en **todas** las franjas de una sección, le asigna el mismo laboratorio las 4 horas.
2. **Solicitud docente:** desde el portal docente, «Dictar todo en laboratorio» con justificación. Coordinación la aprueba o rechaza; al aprobar se ejecuta la fusión y se reasigna.

**Criterios de aceptación.**
- El docente puede solicitar «dictar todo en laboratorio» para su sección de teoría.
- Al aprobarse, queda una sola sección de laboratorio con todas las franjas y se libera el aula teórica.
- La sección fusionada recibe el mismo laboratorio en todas sus franjas.

---

### #23 🟡 Teoría y laboratorio se muestran como cursos distintos

**Qué pasa.** Algunas vistas agrupan las secciones por curso y otras no:

| Vista | ¿Agrupa teoría y laboratorio? |
|---|---|
| «Mis cursos» del alumno | ✅ Sí |
| Consulta pública por código de alumno | ✅ Sí |
| Telegram (`/hoy`, `/ahora`, horario semanal, resumen diario) | ❌ No |
| Horario del alumno (cuadrícula y vista por día) | ❌ No |
| Portal docente (inicio y horario) | ❌ No |

En las que fallan:
- No dice si la clase es teoría o laboratorio: muestra el código crudo «Sec. 2-LAB».
- El horario semanal de Telegram no muestra la sección ([consultasBot.service.ts:189](../backend/src/telegram/consultasBot.service.ts)): aparecen dos líneas idénticas «202SW0805 – Nombre del curso» con aulas distintas.

**Propuesta.** Una función compartida que agrupe por curso y grupo y rotule el tipo:

```
202SW0805 · Nombre del curso (Grupo 2)
  Teoría       18:00–20:00  Aula 105
  Laboratorio  20:00–22:00  Laboratorio 01
```

Usarla en Telegram, en el horario del alumno y en el portal docente.

**Criterios de aceptación.**
- Telegram, el horario del alumno y el portal docente agrupan teoría y laboratorio bajo el mismo curso y grupo.
- Cada clase indica «Teoría» o «Laboratorio» en lugar del código de sección crudo.

---

### #24 🟡 Los docentes no reciben aviso de cambio de aula

**Qué pasa.** Cuando una sección cambia de aula, el aviso por Telegram solo llega a los alumnos vinculados. El docente no tiene vinculación con Telegram ni recibe otro aviso.

**Propuesta.** Vinculación de Telegram para docentes (o aviso en el portal) y envío del cambio de aula también al docente de la sección.

**Criterios de aceptación.**
- Cuando una sección cambia de aula, su docente recibe el aviso, además de los alumnos.

---

### #25 🟡 El cambio de periodo depende de la configuración del servidor

> **Decisión: a solucionar.** El cambio de periodo debe hacerse desde Coordinación.

**Qué pasa.** El periodo vigente sale de la variable `PERIODO_VIGENTE` o, si no existe, del periodo más reciente con secciones ([periodo.service.ts](../backend/src/services/periodo.service.ts)). No existe una acción de «cerrar ciclo» o «abrir ciclo» desde Coordinación, ni nada que pase a histórico las asignaciones del ciclo anterior (relacionado con #5).

**Propuesta.** Ver la **sección 9 — Gestión de periodos**, que agrupa este riesgo con #49 a #52 y detalla cómo se hace hoy el cambio y cómo debería hacerse.

**Criterios de aceptación.**
- Coordinación ve y cambia el periodo vigente desde el panel, sin tocar el servidor (detalle en la sección 9.2).

---

### #26 ⚪ La «última carga» se guarda en el navegador

**Qué pasa.** En Carga de datos, la fecha y el resultado de la última carga se guardan en el navegador. Otro equipo u otra persona de Coordinación no los ve. El backend ya expone la última carga real (`GET /admin/importaciones/ultima`), pero la pantalla no la usa.

**Propuesta.** Que la pantalla lea la fecha, el usuario y el resultado de la última carga desde `GET /admin/importaciones/ultima`, y que use el navegador solo si el servidor no responde, rotulándolo «en este navegador».

**Seguimiento.** Ya está registrado en el issue #346.

**Criterios de aceptación.**
- Dos navegadores distintos muestran la misma última carga.
- Nunca coexisten «Sin cargar» y una fecha de última carga.

---

## 5. Operación

### #27 ⚪ Tras un `git pull` el backend no compila sin `prisma generate`

**Qué pasa.** Si el pull trae cambios en `schema.prisma`, el cliente de Prisma queda desactualizado: el backend no compila y fallan 20 suites de pruebas. Se reprodujo el 24/11/2026 y se resolvió con `npx prisma generate`.

**Propuesta.** Indicarlo en el README o ejecutarlo automáticamente en `postinstall`.

**Criterios de aceptación.**
- Tras un pull con cambios en `schema.prisma`, `npm install` deja el cliente de Prisma generado, o el README indica el paso.

---

### #28 ⚪ El bloqueo de corridas vive en memoria

**Qué pasa.** Para evitar dos corridas simultáneas se usa una variable en memoria ([asignacionDemanda.service.ts:16](../backend/src/services/asignacionDemanda.service.ts)). Funciona porque el backend corre en **una sola instancia** de Render. Con más de una instancia, dos corridas podrían cruzarse y producir dobles reservas.

**Propuesta.** Solo si se escala: usar un bloqueo en la base (por ejemplo, un *advisory lock* de PostgreSQL).

**Criterios de aceptación.**
- Solo si se escala a varias instancias: dos corridas lanzadas a la vez desde instancias distintas no se ejecutan en paralelo.

---

## 6. Seguridad y privacidad

### #30 🔴 Cualquiera que conozca un código puede tomar una cuenta no activada

> **Decisión: riesgo aceptado (demo).** El sistema es una demostración y no está en producción. Debe resolverse antes de usarlo con usuarios reales.

**Qué pasa.** Las cuentas del seed y de las altas manuales usan el **código como usuario y como clave inicial**. Quien inicia sesión con esa clave debe cambiarla, pero el sistema no puede distinguir al dueño real de cualquier otra persona que conozca el código.

**Datos reales.** **67 de 68 docentes** y **3 de 5 alumnos** con cuenta todavía tienen la clave inicial.

**Escenario.**
1. Un alumno conoce el código de un docente (los códigos siguen un patrón, como `0A0690`) o el de un compañero.
2. Entra con código y clave iguales al código, y el sistema le pide definir una nueva.
3. Define la suya: ahora la cuenta es de él y **el dueño real queda fuera**.
4. Con una cuenta de docente puede reportar incidencias o pedir software en su nombre; con una de alumno, ver su perfil y su ficha médica.

**Propuesta.**
1. Clave inicial **aleatoria**, como ya hace la importación de docentes, entregada por un canal del dueño (correo institucional o en persona).
2. Que la clave inicial **venza** (por ejemplo, a los 7 días) y requiera un restablecimiento.
3. Para la base actual: regenerar las claves de las cuentas no activadas y repartirlas.

**Criterios de aceptación.**
- Una cuenta nueva no se puede activar conociendo solo el código.
- La clave inicial vence pasado el plazo definido.

---

### #31 🟠 La consulta pública revela dónde estará cualquier alumno, sin iniciar sesión

> **Decisión: riesgo aceptado (demo).** Debe resolverse antes de usarlo con usuarios reales.

**Qué pasa.** `GET /consulta/alumno/:codigo` no exige sesión y devuelve el nombre de pila, los cursos, los horarios, las aulas y el nombre del docente de cualquier alumno.

**Riesgo.**
- Basta el código de alguien para saber **dónde estará y a qué hora** durante todo el ciclo. Es un riesgo de acoso.
- Los códigos son secuenciales (`23200107`, `23200263`…) y el límite es de 120 consultas por minuto por IP, así que se puede recorrer a toda la población en poco tiempo.

**Propuesta.** Que la consulta por código de **alumno** exija iniciar sesión (y que cada alumno solo vea la suya), dejando pública solo la consulta por código de **curso**, que no identifica a personas.

**Criterios de aceptación.**
- La consulta por código de alumno exige sesión y cada alumno solo ve la suya.
- La consulta por código de curso sigue siendo pública.

---

### #32 🟡 Restablecer o cambiar la clave no cierra las sesiones abiertas

**Qué pasa.** Las sesiones son tokens JWT válidos por 8 horas y no hay forma de revocarlos ([auth.service.ts:30](../backend/src/services/auth.service.ts)). Si alguien robó una sesión, ni el cambio de clave ni el restablecimiento por Coordinación la cierran.

**Propuesta.** Guardar en la cuenta una «versión de credenciales» que cambie con cada cambio o restablecimiento de clave, incluirla en el token y rechazar los tokens con una versión anterior.

**Criterios de aceptación.**
- Tras cambiar o restablecer la clave, las sesiones abiertas anteriores reciben 401.

---

### #33 🟡 Telegram se vincula con la clave inicial y los límites de intentos se reinician

> **Decisión: riesgo aceptado (demo),** por ser una variante de #30. Se resuelve junto con él.

**Cómo funciona la vinculación.** Para recibir su horario por Telegram, el alumno escribe al bot su código y su clave. El bot compara la clave con la **clave actual** de la cuenta:

| Situación de la cuenta | ¿Qué clave acepta el bot? | ¿Hay riesgo? |
|---|---|---|
| El alumno ya cambió su clave inicial en el portal | Solo la **nueva** clave | No |
| El alumno **nunca** entró al portal | La clave inicial, que es **el mismo código** | **Sí** |

**Qué pasa.** El problema está solo en el segundo caso. El portal obliga a cambiar la clave inicial antes de usarlo, pero **el bot no exige ese cambio**.

**Ejemplo.** Juan conoce el código de Ana, y Ana nunca entró al portal. Juan escribe al bot «código-de-Ana código-de-Ana», el bot vincula **su** Telegram a la cuenta de Ana y Juan recibe cada mañana el horario de Ana. Ana no se entera.

**Problema adicional.** Los límites de intentos (login y Telegram) viven en memoria. Render suspende el servicio tras 15 minutos sin tráfico y, al despertar, los contadores empiezan de cero.

**Propuesta.**
1. El bot rechaza la vinculación de cuentas con la clave inicial pendiente y responde: «Primero activa tu cuenta en el portal y cambia tu clave; luego vuelve a escribirme con tu nueva clave».
2. Cuando la cuenta ya cambió su clave, nada cambia: el bot sigue aceptando solo la clave actual.
3. Guardar los contadores de intentos en la base para que no se reinicien al despertar el servidor.

**Criterios de aceptación.**
- Una cuenta con clave inicial pendiente no se puede vincular, aunque la clave sea correcta.
- Una cuenta activada se vincula solo con su clave actual.

---

### #37 ⚪ La consulta pública carga la ficha médica y no filtra por periodo

> **Decisión: a solucionar.**

**Qué pasa.**
1. Cuando alguien busca un código de alumno en la consulta pública, el sistema trae de la base **todo** el registro del alumno, **incluida su ficha médica** (tipo de sangre, alergias, condición de accesibilidad), aunque después **no la muestra** ([consulta.service.ts:102](../backend/src/services/consulta.service.ts)).
2. Además, muestra las matrículas de **todos** los periodos, no solo del vigente.

**Riesgo.**
- Hoy no se filtra ningún dato, porque la respuesta solo incluye cursos, aulas y el nombre de pila. Pero los datos de salud ya están en memoria en una página **pública**: basta un cambio descuidado en la respuesta (por ejemplo, devolver «el alumno completo» para depurar) para exponerlos. La regla segura es no leer lo que no se va a mostrar.
- Cuando haya varios ciclos cargados, la consulta mostrará también cursos y aulas de ciclos pasados, mezclados con los actuales.

**Propuesta.**
1. Quitar `fichaMedica` de la consulta pública. Leer solo los campos que se muestran: código, nombre y las matrículas con su sección, curso, docente, horarios y aula.
2. Filtrar las matrículas por el **periodo vigente**, igual que el resto del sistema.
3. Revisar el resto de consultas que llegan a respuestas públicas o de otros roles con el mismo criterio: la ficha médica solo la lee el propio alumno en su perfil.

**Criterios de aceptación.**
- La consulta pública no lee la ficha médica de la base.
- Con dos periodos cargados, la consulta muestra solo el vigente.

---

## 7. Integridad de las importaciones

### #34 🟠 Un CSV con errores deja la base a medias

> **Decisión: a solucionar.** Si el CSV tiene al menos un error, no se importa nada.

**Qué pasa.** Las cuatro importaciones procesan el CSV **fila por fila**, cada una por separado y sin transacción. Si una fila falla, se registra el error y se sigue con la siguiente: las filas buenas **quedan guardadas**.

**Lo que sí funciona.** Volver a subir el archivo corregido **no duplica nada**: cada fila se actualiza si ya existe y se crea si no. Es decir, el «análisis de duplicados» al reimportar ya existe. El problema no es la segunda carga, sino **lo que pasa entre la primera y la segunda**.

**Ejemplo.**
1. Se sube un CSV de matrículas con un error en la fila 500.
2. Se guardan las 499 filas buenas.
3. La corrida automática **no** se ejecuta, porque la carga tuvo errores. Pero la base ya quedó con el 99 % de las matrículas nuevas mezcladas con las anteriores.
4. Si en ese intervalo alguien ejecuta la asignación a mano (o la corrida programada), las aulas se calculan con datos incompletos.
5. Coordinación corrige y vuelve a subir el archivo; con la corrida siguiente algunas secciones pueden cambiar de aula y se envían avisos que no hacían falta.

> *Corrección (24/11/2026):* una versión anterior de este documento decía que la corrida automática se ejecutaba tras una carga con errores. No es así: `ejecutarImportacion` solo encadena la asignación cuando la carga no tiene errores. El problema real es la base a medias.

**Estado: resuelto en el issue 1.16 (#428).** Antes de escribir, `validarImportacion` revisa el archivo completo: formato, periodo, filas repetidas, secciones y software referidos (en consultas agrupadas) y, en horarios, que el inicio sea anterior al fin. Si encuentra al menos un error, no se guarda ninguna fila y la respuesta indica `guardadas: false`. La pantalla de Carga de datos muestra «0 guardadas» y pide corregir todas las filas. Limitación: el guardado posterior a una validación exitosa sigue siendo fila por fila (sin transacción única); solo una falla de la base a mitad del guardado podría dejarla a medias.

**Propuesta: importación «todo o nada».**
1. **Leer y validar el archivo completo** antes de escribir en la base: formato de cada fila, que existan los cursos, secciones y alumnos referidos, que no haya filas repetidas dentro del mismo archivo y las reglas de #36.
2. **Si hay al menos un error, no se guarda nada.** La pantalla muestra la lista completa de errores (fila, columna y motivo) para corregirlos todos de una vez, no uno por uno.
3. **Si no hay errores, se guarda todo en una sola transacción.** Si algo falla durante el guardado (por ejemplo, se cae la conexión), la base vuelve al estado anterior.
4. **Solo después de guardar con éxito** se ejecuta el motor de asignación.
5. El registro de importaciones guarda el intento rechazado con su número de errores, para que quede constancia.

El seed del proyecto ([seed.ts](../backend/prisma/seed.ts)) ya valida todo el archivo antes de tocar la base, así que hay un modelo a seguir dentro del mismo código.

**Criterios de aceptación.**
- Un CSV con un error en una sola fila no cambia ningún registro de la base.
- La pantalla lista todos los errores del archivo, no solo el primero.
- El motor no se ejecuta tras una importación rechazada.
- Subir dos veces el mismo archivo válido deja la base igual que subirlo una vez.

---

### #35 🟠 Las importaciones nunca borran: retiros y horarios cambiados quedan duplicados

**Qué pasa.** Las importaciones solo **crean o actualizan**; nunca eliminan lo que ya no está en el CSV.

| Caso real | Qué queda en la base |
|---|---|
| Un alumno se retira de un curso y se recarga el CSV de matrículas | **Sigue matriculado**: cuenta para el aforo y sigue viendo la clase |
| Una sección cambia su inicio de 18:00 a 19:00 y se recarga el CSV de horarios | **Quedan las dos franjas**: la de 18:00 (vieja) y la de 19:00 (nueva), porque la clave del horario es sección + día + hora de inicio ([horarios.importer.ts:86](../backend/src/importers/horarios.importer.ts)) |
| Se cierra una sección | Sigue existiendo y ocupando aula |

**Ejemplo paso a paso: un alumno que se retira.**
1. Se carga el CSV de matrículas: Pedro está matriculado en Cálculo.
2. Pedro se retira y Coordinación carga el CSV actualizado, que ya no lo incluye.
3. La importación solo crea o actualiza lo que viene en el archivo. Como Pedro no viene, **no lo toca**.
4. Pedro sigue matriculado: cuenta para el tamaño de la sección y sigue viendo Cálculo en su horario.

**Ejemplo paso a paso: un horario que cambia.**
1. Cálculo era el lunes de 18:00 a 20:00.
2. Se cambia al lunes de 19:00 a 21:00 y se carga el CSV actualizado.
3. Cada horario se identifica por sección, día y **hora de inicio**. Como la hora de inicio cambió, el sistema cree que es **otro** horario: agrega el de 19:00 y deja el de 18:00.
4. La sección queda con dos franjas que se pisan (18:00–20:00 y 19:00–21:00) y el motor le busca aula para las dos, o la escala.

**Consecuencia.** Aulas reservadas para clases que ya no existen, aforos inflados y secciones que escalan porque piden dos franjas.

> **Decisión: a solucionar.**

**Propuesta: cada archivo es la verdad para lo que incluye.**
1. **Matrículas:** para cada sección que aparece en el archivo, las matrículas de esa sección pasan a ser **exactamente** las del archivo. Las que ya no figuran se eliminan (retiros). Las secciones que no aparecen en el archivo no se tocan, para que se pueda cargar por partes.
2. **Horarios:** igual. Para cada sección del archivo, sus horarios pasan a ser exactamente los del archivo. Un cambio de hora reemplaza la franja vieja en lugar de sumarse a ella.
3. **Cursos y secciones:** una sección que deja de aparecer no se borra (tiene historial), pero se marca como **inactiva**: no entra al motor y libera su aula.
4. **Vista previa antes de confirmar:** «Se agregarán 12 matrículas, se quitarán 3 (retiros) y se reemplazarán 2 horarios». Coordinación confirma o cancela.
5. Todo dentro de la misma transacción «todo o nada» de #34.
6. Tras guardar, el motor reasigna las secciones afectadas y se avisa a quienes cambian de aula.

**Criterios de aceptación.**
- Un alumno que no figura en el nuevo CSV de su sección deja de estar matriculado y deja de contar para el aforo.
- Cambiar la hora de inicio de una sección en el CSV deja una sola franja, la nueva.
- Las secciones que no aparecen en el archivo no se modifican.
- La vista previa coincide con lo que finalmente se guarda.

---

### #36 🟡 No se advierten los choques de horario de docentes y alumnos al importar

**Qué pasa.** No se valida que un docente no tenga dos secciones a la misma hora, ni que un alumno no esté matriculado en dos clases simultáneas.

> *Corrección (24/11/2026):* una versión anterior decía que tampoco se validaba que el inicio fuera anterior al fin. Sí se validaba: el importador de horarios ya rechaza esas filas («La hora de inicio debe ser menor a la hora de fin»); la comprobación está en el importador, no en el esquema, y por eso no se vio al principio.

**Estado: resuelto en el issue 1.16 (#428).** La validación previa advierte, sin impedir el guardado, cuando un docente quedaría con dos clases a la vez (cruzando el archivo con las secciones que ya están en la base) y cuando un alumno quedaría matriculado en dos clases simultáneas. Las advertencias se muestran en el resultado de la carga.

**Datos reales hoy:** 0 horarios invertidos, 0 choques de docentes y 0 choques entre los 2237 alumnos. **Los datos actuales están limpios, pero nada impide que la próxima carga no lo esté.**

**Propuesta.** Rechazar en la importación los horarios con inicio ≥ fin y advertir los choques de docentes y alumnos.

**Criterios de aceptación.**
- Un horario con inicio igual o posterior al fin se rechaza en la importación.
- Se advierte cuando un docente o un alumno quedaría con dos clases a la vez.

---

## 8. Datos reales, operación y dependencias

### #38 🟠 Un CSV guardado desde Excel rompe las tildes y la ñ

**Qué pasa.** La pantalla de Carga de datos lee el archivo siempre como UTF-8 ([CargaDatos.tsx:116](../frontend/src/pages/admin/CargaDatos.tsx)). Excel en Windows en español, con la opción habitual «CSV (delimitado por comas)», guarda el archivo en otra codificación (Windows-1252). Al leerlo como UTF-8, cada letra con tilde o ñ se convierte en el carácter de reemplazo `�`.

**Ejemplo.** «Cálculo» se guarda como «C�lculo» y «Muñoz» como «Mu�oz», **sin ningún error ni aviso**: la importación sale «exitosa» con los nombres dañados.

**Lo que sí funciona.** El separador `;` que usa Excel en español y la marca BOM inicial ya se detectan correctamente ([archivoImportacion.ts](../backend/src/lib/archivoImportacion.ts)).

**Estado de la base hoy.** Se revisaron los nombres de cursos, docentes, alumnos y espacios: **no hay ningún carácter dañado**. Los datos actuales se cargaron con el seed desde Excel (`.xlsx`), que no tiene este problema. El riesgo aparece con la **próxima** carga por CSV.

**¿Se pueden reparar los caracteres después?** **No, una vez guardados.** Al leer el archivo con la codificación equivocada, **todas** las letras especiales (á, é, í, ó, ú, ñ) se convierten en el **mismo** símbolo `�`. Desde «C�lculo» no se puede saber si la letra perdida era «á», «é» o «ñ»: la información se pierde en el momento de leer el archivo.

Por eso la reparación tiene que hacerse **al leer el archivo**, antes de que se pierda nada. Leído correctamente, el texto queda bien desde el principio.

> El caso contrario sí es reparable: si un archivo UTF-8 se lee como Windows-1252, «Cálculo» aparece como «CÃ¡lculo», y esa secuencia se puede revertir. Pero no es lo que ocurre aquí.

**Propuesta: detectar la codificación al leer.**
1. En la pantalla de Carga de datos, leer el archivo como **bytes** y no directamente como texto.
2. Intentar decodificarlo como UTF-8 en modo estricto. Si el archivo no es UTF-8 válido, decodificarlo como **Windows-1252**, que es lo que guarda Excel en español. Ambas cosas las hace el navegador sin librerías adicionales (`TextDecoder`).
3. Mostrar en la vista previa algunos nombres del archivo («Cálculo II», «Muñoz») para que Coordinación confirme que se leen bien antes de importar.
4. Como red de seguridad en el backend: rechazar cualquier fila que todavía contenga `�`, con el mensaje «El archivo tiene caracteres dañados: guárdalo como CSV UTF-8 en Excel».
5. Indicar en las plantillas y en `docs/guia-csv.md` que se recomienda «CSV UTF-8 (delimitado por comas)».

**Criterios de aceptación.**
- Un CSV guardado con «CSV (delimitado por comas)» desde Excel en español importa «Cálculo» y «Muñoz» correctamente.
- Un CSV en UTF-8 sigue funcionando igual.
- Ninguna fila con `�` llega a la base.

---

### #39 🟠 Las importaciones grandes superan el tiempo de espera y siguen corriendo

**Qué pasa.** Cada fila de matrículas hace entre 5 y 7 consultas a la base, **una detrás de otra** ([matriculas.importer.ts](../backend/src/importers/matriculas.importer.ts)). La base actual tiene **4470 matrículas**, lo que supone unas 25 000 consultas. El frontend espera como máximo **120 segundos** a la importación. Aun con 10 ms por consulta, serían unos 4 minutos.

**Consecuencia.**
1. A los 120 s la pantalla muestra un error de tiempo agotado.
2. El backend **sigue importando** en segundo plano y termina guardando los datos (y ejecutando el motor).
3. Coordinación cree que falló y vuelve a subir el archivo: ahora hay **dos importaciones a la vez** sobre los mismos datos.

**Cómo se comprobó.** Es una **estimación**: no se ejecutó una importación real para no modificar la base. El número de consultas por fila y el volumen de datos sí se verificaron.

**Propuesta.**
1. Cargar de una vez los cursos, secciones y alumnos existentes y escribir en lotes, en lugar de consultar fila por fila.
2. Procesar la importación **en segundo plano** y que la pantalla consulte su estado («procesando 2300 de 4470»).
3. Rechazar una importación nueva mientras otra del mismo tipo esté en curso.

**Criterios de aceptación.**
- Importar las 4470 matrículas actuales termina sin error de tiempo de espera en la pantalla.
- La pantalla muestra el avance de la importación.
- No se puede iniciar otra importación del mismo tipo mientras una está en curso.

---

### #40 🟡 El primer acceso tras un rato sin uso falla por tiempo de espera

**Qué pasa.** El servidor gratuito de Render se suspende tras 15 minutos sin tráfico y tarda entre **45 y 60 segundos** en despertar (dato de `docs/arquitectura.md`). El frontend corta las peticiones a los **30 segundos** ([api.ts](../frontend/src/services/api.ts)).

**Consecuencia.** El primer usuario de la mañana (o el evaluador al empezar la demo) intenta iniciar sesión y recibe un error de tiempo agotado. Al reintentar, funciona.

> **Decisión: riesgo conocido y aceptado.** Ya estaba documentado como riesgo operativo del plan gratuito de Render. Las mejoras siguientes son opcionales.

**Propuesta.**
1. Al abrir la página de inicio o de login, hacer una petición a `/health` para despertar el servidor mientras el usuario escribe.
2. Si una petición falla por tiempo agotado, reintentarla una vez con el mensaje «Estamos despertando el servidor, un momento…».
3. **Antes de la sustentación:** abrir el sistema unos minutos antes para que el servidor esté despierto.

**Criterios de aceptación.**
- Tras 15 minutos sin uso, el primer inicio de sesión funciona, aunque tarde, o muestra el mensaje de espera y reintenta solo.

---

### #41 🟠 La regla de software nunca se ha probado: no hay software cargado

**Qué pasa.** En la base hay **0 programas en el catálogo, 0 instalados en laboratorios y 0 requisitos de software en secciones**. Los 17 laboratorios habilitados aparecen sin software.

**Consecuencia.**
- La matriz de software, que es lo que distingue a los laboratorios de las aulas teóricas, **nunca se ha ejercitado con datos reales**. Todas las secciones de laboratorio se asignaron sin revisar software.
- En la demo no se puede mostrar el escalamiento por software, la alerta de software ni la solicitud de un docente con efecto real (flujo F-03 de la guía).

**Por qué está vacío.** Nunca se cargó software, pero **el sistema sí tiene por dónde cargarlo**:

| Vía | Qué carga | Estado |
|---|---|---|
| **Excel del seed** (`backend/prisma/data/seed-plantilla.xlsx`) | Hoja *Espacios*, columna `software_instalado`: lo que tiene cada laboratorio. Hoja *Cursos_Secciones*, columna `software_requerido`: lo que pide cada sección. El seed crea el catálogo automáticamente con esos nombres | **Las dos columnas existen, pero están vacías** (0 celdas con datos) |
| **CSV de cursos y secciones** | Columna `stackSoftwareRequerido`: lo que pide cada sección | Solo acepta programas que **ya existen** en el catálogo; si no, la fila falla con `SOFTWARE_NO_REGISTRADO` |
| **Pantallas** | Coordinación da de alta el catálogo (`/admin/software`); Jefatura registra lo instalado en cada laboratorio (`/admin/laboratorio`); Coordinación edita lo que pide cada sección (`/admin/secciones`) | Funciona, pero es lento: 17 laboratorios × ~15 programas, uno por uno |

**No existe un CSV para el catálogo ni para lo instalado en cada laboratorio.** Solo se pueden cargar de forma masiva con el Excel del seed.

> **Decisión: primero proponer, después cargar.** El catálogo **no se carga directamente** en la base. Primero se presenta como propuesta, **el propio equipo** la revisa y la aprueba (no requiere validación externa); solo entonces se carga.

**Propuesta: cómo solucionarlo, en este orden.**
1. **Proponer.** Presentar el **Anexo B** (catálogo, imagen base, laboratorios especializados y software por curso) como **propuesta** al equipo. El Anexo B sale de los nombres de los cursos y de lo habitual en la carrera.
2. **Revisar y ajustar en el equipo.** Revisar el software de cada curso, qué laboratorios son especializados y qué lleva la imagen base. Conviene resolver también las dudas de #47 y #48 (cursos corruptos y cursos generales con laboratorio).
3. **Aprobar.** Dejar la versión final aprobada por escrito (por ejemplo, actualizando el Anexo B con la fecha y quién la aprobó).
4. **Cargar.** Solo con la versión aprobada:
   - **Para la demo (lo más rápido):** completar en el Excel del seed las columnas `software_instalado` (hoja *Espacios*) y `software_requerido` (hoja *Cursos_Secciones*) y volver a correr el seed. El seed es idempotente: actualiza sin duplicar. Antes, validar con `SEED_SOLO_VALIDAR=1`, que revisa el Excel sin tocar la base.
   - **A mediano plazo:** agregar dos tipos de importación por CSV en Carga de datos: **catálogo de software** (nombre, versión, categoría, licencia) y **software instalado por laboratorio** (laboratorio, programa). Así Coordinación y Jefatura no dependen del seed.
5. **Verificar.** Volver a correr la asignación y revisar qué secciones escalan por software. Algunas lo harán, y es lo esperado: muestra que la regla funciona.

**Cómo repartir el software entre laboratorios (propuesta).** En una facultad lo habitual es una **imagen base** igual en todos los laboratorios y algunos **laboratorios especializados**:

| Laboratorios | Software |
|---|---|
| Todos | Imagen base del Anexo B |
| 2 o 3 laboratorios de bases de datos | Imagen base + SQL Server, MongoDB, Power BI Desktop |
| 2 laboratorios de redes | Imagen base + Cisco Packet Tracer, GNS3, Wireshark |
| 2 laboratorios de hardware y sistemas | Imagen base + Logisim Evolution, Arduino IDE, MS-MPI / OpenMPI, VirtualBox |
| 2 laboratorios de ciencia de datos e IA | Imagen base + Anaconda, R + RStudio, Weka, KNIME, Power BI Desktop |

Así la regla de software tiene efecto real: un curso de redes solo cabe en los laboratorios de redes, y si están ocupados, la sección escala.

**Criterios de aceptación.**
- El catálogo aprobado está cargado: cada laboratorio tiene su software y cada sección de laboratorio sus requisitos.
- Tras correr la asignación, ninguna sección de laboratorio queda en un laboratorio sin el software que pide.
- En la demo se puede mostrar una sección escalada por software y su alerta.

---

### #42 🟡 30 espacios sobre el piso 1 no tienen distancia al ascensor

**Qué pasa.** Cuando no hay lugar en el piso 1 para una sección con movilidad reducida, el plan B elige el espacio **más cercano al ascensor** (ver #10). Pero **30 espacios habilitados de los pisos 2 y 3 no tienen registrada esa distancia**, así que el plan B no tiene datos y queda librado al orden por defecto.

**Propuesta.**
1. Completar la columna `distancia_ascensor` de la hoja *Espacios* del Excel del seed (ya existe) para todos los espacios fuera del piso 1. Se puede medir sobre los planos SVG con el conversor de planos (`tools/planos`).
2. No aplicar el plan B sobre espacios sin ese dato: si ninguno lo tiene, escalar la sección para que decida Coordinación (ver #10).

**Criterios de aceptación.**
- Todos los espacios habilitados fuera del piso 1 tienen registrada la distancia al ascensor.
- El plan B no elige espacios sin ese dato.

---

### #43 🟡 Varias acciones importantes no dejan registro de quién las hizo

**Qué pasa.** La auditoría de acciones de personas solo cubre la edición de espacios, de laboratorios y de secciones. Estas acciones **no dejan registro** de quién las hizo ni cuándo:

| Acción | Por qué importa |
|---|---|
| Restablecer la clave de un usuario | Es una acción de seguridad: si una cuenta se usa mal, hay que saber quién la restableció |
| Altas de alumnos y docentes | Crea cuentas con acceso al sistema |
| Aprobar o rechazar solicitudes de software | Cambia el catálogo y los requisitos de las secciones |
| Cerrar o descartar incidencias | Queda quién la cerró, pero no en la auditoría general |
| Cambios en el catálogo de software | Afecta a la asignación de laboratorios |

**Propuesta.** Registrar estas acciones con el mismo mecanismo de auditoría que ya usan espacios y secciones, y mostrarlas en `/admin/auditoria`.

**Criterios de aceptación.**
- Las acciones de la tabla aparecen en `/admin/auditoria` con quién, cuándo y qué cambió.

---

### #44 🟡 Librerías con vulnerabilidades conocidas

> **Decisión: a solucionar como proceso.** Es normal que aparezcan vulnerabilidades: se descubren continuamente en librerías muy usadas, así que ningún proyecto queda «limpio» para siempre. Lo que se espera de un proyecto bien mantenido no es cero vulnerabilidades, sino **revisarlas de forma periódica y no tener ninguna alta o crítica sin evaluar**.

**Qué pasa.** `npm audit` sobre las dependencias de producción, ejecutado el 24/11/2026:

| Proyecto | Altas | Moderadas | Paquetes afectados |
|---|---|---|---|
| Backend | 6 | 2 | `prisma`, `@prisma/config`, `zod`, `effect`, `deepmerge-ts`, `source-map-js`, `exceljs`, `uuid` |
| Frontend | 2 | 0 | `follow-redirects` (usado por axios), `source-map-js` |

La mayoría son ataques de denegación de servicio (consumo de memoria o CPU con entradas manipuladas). Ninguna está catalogada como crítica.

**Propuesta.**
1. **Ahora:** ejecutar `npm audit fix` (sin `--force`) en backend y frontend. Solo aplica actualizaciones compatibles; después, comprobar que compilan y pasan las pruebas.
2. **Las que requieran un cambio de versión mayor** (por ejemplo, Prisma): evaluarlas por separado, porque pueden romper código. Si no se actualizan, dejar constancia de por qué.
3. **De forma continua:** activar **Dependabot** en GitHub, que abre automáticamente un pull request cada vez que una librería publica una corrección de seguridad.
4. **En integración continua:** agregar `npm audit --omit=dev --audit-level=high` al pipeline para que avise cuando aparezca una vulnerabilidad alta nueva.

**Criterios de aceptación.**
- `npm audit --omit=dev` no muestra vulnerabilidades altas o críticas sin evaluar.
- Dependabot está activo en el repositorio.
- El pipeline avisa cuando aparece una vulnerabilidad alta nueva.

---

### #45 ⚪ La evidencia de una incidencia es solo un enlace; no se puede adjuntar una foto

**Qué pasa.** El campo «evidencia» es un texto de hasta 500 caracteres. Jefatura lo ve como enlace si empieza por `http`. El docente no puede adjuntar una foto del equipo dañado: tiene que subirla a otro sitio y pegar el enlace.

**Riesgos menores.** El enlace puede apuntar a cualquier sitio web, y Jefatura lo abre confiando en que viene de un docente.

**Propuesta.** Permitir adjuntar una imagen a la incidencia (con límite de tamaño y tipo) y mostrarla en la ficha que ve Jefatura.

**Criterios de aceptación.**
- El docente puede adjuntar una imagen a la incidencia.
- Se rechazan archivos que no sean imagen o que superen el tamaño máximo.
- Jefatura ve la imagen en la ficha de la incidencia.

---

### #46 ⚪ Los mensajes repetidos por Telegram se procesan dos veces

**Qué pasa.** Si el servidor tarda en responder (por ejemplo, mientras Render despierta, ver #40), Telegram reenvía el mismo mensaje. El bot no recuerda qué mensajes ya procesó (no usa el identificador `update_id`), así que puede responder dos veces el mismo comando.

**Impacto.** Bajo: respuestas duplicadas, sin daño en los datos.

**Propuesta.** Guardar el último `update_id` procesado y descartar los repetidos.

**Criterios de aceptación.**
- Un mismo mensaje entregado dos veces por Telegram genera una sola respuesta.

---

### #47 🟠 El nombre de un curso está corrupto y falta otro curso (`202SW0303`)

**Qué pasa.** El curso `202SW0302` tiene como nombre:

```
ESTADÍSTICA Y PROBABILIDADES 4.0 1 -- 30 7 -- VIERNES 08:00 - 11:00 -- VIERNES 11:00 - 13:00 202SW0303 - FISICA ELÉCTRÓNICA
```

Es decir, al armar los datos se **pegaron dos cursos en uno**: el nombre de `202SW0302` arrastra créditos, vacantes y horarios, y además el código y nombre de **`202SW0303 – Física Electrónica`**, que **no existe en la base** como curso propio. Probablemente es un error al extraer los datos del PDF del horario.

**Consecuencia.**
- El nombre corrupto aparece tal cual en el portal del alumno, en Telegram y en los reportes.
- Física Electrónica no tiene secciones, horarios ni aulas: sus alumnos no la ven en su horario.

**Propuesta.**
1. Corregir el nombre de `202SW0302` a «ESTADÍSTICA Y PROBABILIDADES».
2. Agregar `202SW0303 – FÍSICA ELECTRÓNICA` (corrigiendo además la tilde extra de «ELÉCTRÓNICA») con sus secciones, horarios y matrículas.
3. Al importar, rechazar nombres de curso que contengan códigos de otro curso, horas (`08:00`) o separadores como `--`, para detectar este tipo de errores a tiempo.

**Criterios de aceptación.**
- `202SW0302` se llama «ESTADÍSTICA Y PROBABILIDADES».
- `202SW0303` existe con sus secciones, horarios y matrículas.
- Un nombre de curso con horas o con el código de otro curso se rechaza al importar.

---

### #48 🟡 Cursos generales tienen secciones de laboratorio de cómputo

**Qué pasa.** Varios cursos que normalmente no usan computadoras tienen **6 o 7 secciones de laboratorio**:

| Curso | Secciones de laboratorio |
|---|---|
| Redacción y Técnicas de Comunicación Efectiva II | 6 |
| Investigación Formativa | 7 |
| Realidad Nacional y Mundial | 6 |
| Química General | 6 |
| Física I | 6 |
| Emprendimiento e Innovación | 6 |
| Metodología de la Investigación | 5 |

**Duda.** En SAIE «laboratorio» significa **laboratorio de cómputo**. Química General y Física I suelen tener laboratorios **de química o de física**, que no son de cómputo. Y Redacción o Realidad Nacional rara vez usan laboratorio.

**Consecuencia.** Si los datos no son correctos, estas secciones ocupan laboratorios de cómputo que necesitan los cursos de la carrera, y provocan escalamientos innecesarios.

**Propuesta.**
1. Decidir en el equipo qué secciones usan realmente laboratorio de cómputo.
2. Las que usan laboratorios de otro tipo (química, física) deberían excluirse del motor o modelarse como otro tipo de espacio.
3. Las que no usan laboratorio, pasarlas a aula teórica.

**Criterios de aceptación.**
- Queda definida por el equipo la lista de secciones que usan laboratorio de cómputo.
- Las demás pasan a aula teórica o se excluyen del motor.

---

## 9. Gestión de periodos (semestres)

### 9.1 Cómo se cambia de periodo hoy

No hay ninguna acción para cambiar de semestre. El sistema decide el periodo vigente así ([periodo.service.ts](../backend/src/services/periodo.service.ts)):

1. Si en el servidor (Render) está definida la variable `PERIODO_VIGENTE`, usa ese valor.
2. Si no, usa **el periodo más reciente que tenga secciones cargadas**. Hoy no está definida, así que el vigente es `2026-2` por ser el único cargado.

**Pasos actuales para pasar al siguiente semestre:**
1. Preparar los CSV del nuevo periodo (cursos y secciones, horarios, matrículas y, si hay, docentes nuevos) con la columna `periodo` = `2027-1`.
2. Cargarlos en Carga de datos, en ese orden.
3. Al tener secciones, horarios y matrículas, el motor asigna las aulas solo.
4. Como `2027-1` es ahora el más reciente, el sistema entero pasa a mostrarlo.

Las cuentas, los espacios y el catálogo de software se mantienen entre periodos.

**Cómo evitar el cambio adelantado hoy, sin cambiar código** (ver #51):
1. **Antes** de cargar el nuevo periodo, definir en Render `PERIODO_VIGENTE=2026-2`.
2. Cargar y revisar `2027-1`. Mientras tanto, la corrida automática sigue usando `2026-2`.
3. El día que empieza el semestre, cambiar la variable a `PERIODO_VIGENTE=2027-1`, reiniciar el servicio y correr la asignación.

Depende de alguien con acceso a Render, no de Coordinación.

---

### #49 🔴 Un error al escribir el periodo cambia el periodo de todo el sistema

**Qué pasa.** Las importaciones solo exigen que la columna `periodo` no esté vacía: aceptan cualquier texto ([horarios.importer.ts:7](../backend/src/importers/horarios.importer.ts), y lo mismo en cursos y matrículas). Y el «periodo más reciente» se calcula **ordenando el texto**, no la fecha.

**Comprobado en la base.** Así ordena la base distintos valores, de mayor a menor:

```
"2027-1" > "2026-II" > "2026-I" > "2026-2 " > "2026-2" > "2026-10"
```

**Consecuencia.** En Perú es común escribir los semestres en romanos («2026-I», «2026-II»). Si alguien sube un CSV con `2026-I`:
1. Se crea un periodo nuevo, «2026-I», distinto de «2026-2».
2. Como «2026-I» queda **por encima** de «2026-2» al ordenar, **pasa a ser el periodo vigente de todo el sistema**.
3. Los alumnos dejan de ver su horario, el panel muestra un periodo casi vacío y la corrida automática se ejecuta sobre el periodo equivocado.

Basta un error de una sola letra en un archivo para dejar el sistema en un periodo que no existe.

**Propuesta.**
1. **Aceptar las dos formas habituales y guardarlas siempre igual:** «2026-I» se convierte en «2026-1» y «2026-II» en «2026-2» (también sin importar mayúsculas ni espacios). Así nunca se crean dos periodos para el mismo semestre.
2. Validar el formato ya normalizado en todas las importaciones: exactamente `AAAA-1` o `AAAA-2` (y `AAAA-0` si hay ciclo de verano). Cualquier otro valor es un error de fila, con el mensaje «El periodo debe tener el formato 2026-1 (o 2026-I)».
3. Aceptar solo periodos **registrados** por Coordinación (ver 9.2): un periodo que no existe en la lista se rechaza.
4. Nunca decidir el periodo vigente ordenando texto: lo fija Coordinación (ver 9.2).

**Criterios de aceptación.**
- «2026-I» y «2026-II» se guardan como «2026-1» y «2026-2».
- Un periodo con formato inválido o no registrado se rechaza sin cambiar nada en la base.
- Cargar datos nunca cambia, por sí solo, el periodo vigente.

---

### #50 🟠 Se puede registrar y modificar información de periodos que ya terminaron

**Qué pasa.** Ninguna operación de escritura comprueba si el periodo ya terminó:

| Operación | ¿Comprueba el periodo? |
|---|---|
| Importar cursos, horarios o matrículas | No: acepta cualquier periodo, incluso uno pasado |
| Editar una sección (`/admin/secciones`) | No |
| «Reintentar» la asignación de una sección | No: reasigna aunque sea de un periodo pasado, y ocupa aulas |
| Reportar una incidencia (docente) | No: basta que la asignación figure como vigente, y las de periodos pasados nunca se archivan |
| Solicitar software para una sección | No |

**Consecuencia.** Como planteó el equipo: si ya estamos en 2027-1, registrar algo en 2026-1 no tiene sentido. Además puede tener efectos reales: reasignar una sección de un periodo pasado le da aulas **vigentes** que bloquean las de 2027-1 en los reintentos (#5).

**Propuesta.** Reglas por estado del periodo (ver 9.2):

| Estado del periodo | ¿Qué se permite? |
|---|---|
| **En preparación** (futuro) | Cargar y corregir datos, correr la asignación de prueba. Alumnos y docentes **no** lo ven todavía |
| **Vigente** | Todo lo normal: cargas, ediciones, reasignaciones, incidencias, solicitudes |
| **Cerrado** (pasado) | **Solo consulta.** Ninguna importación, edición, reasignación, incidencia ni solicitud. Rechazo con «El periodo 2026-1 está cerrado» |

**Criterios de aceptación.**
- Con un periodo cerrado, importar, editar secciones, reintentar, reportar incidencias o solicitar software sobre él se rechaza con «El periodo … está cerrado».
- Los datos del periodo cerrado se pueden seguir consultando.

---

### #51 🟠 El sistema cambia de periodo en cuanto se carga el siguiente

**Qué pasa.** Con la regla del «más reciente», el periodo cambia en el momento en que se carga la primera sección del siguiente, no cuando termina el semestre.

**Consecuencia.** Si Coordinación prepara 2027-1 en diciembre, con las clases de 2026-2 en curso:
- los alumnos dejan de ver su horario actual en el portal y en Telegram;
- el resumen diario de Telegram manda el horario del ciclo siguiente;
- el panel de Coordinación muestra un periodo que todavía no empieza;
- la corrida automática se ejecuta sobre el periodo nuevo.

**Propuesta.** Separar «cargar un periodo» de «activarlo»: cargar 2027-1 lo deja **en preparación**, y solo pasa a vigente cuando Coordinación lo activa (ver 9.2).

**Criterios de aceptación.**
- Cargar 2027-1 mientras 2026-2 está vigente no cambia lo que ven alumnos y docentes.
- Solo la acción «Activar periodo» cambia el periodo vigente.

---

### #52 🟡 Varias pantallas y reglas mezclan datos de distintos periodos

**Qué pasa.** Algunas consultas filtran por periodo y otras no. Las que no filtran:

| Dónde | Qué mezcla |
|---|---|
| «Reintentar» una sección | Aulas ocupadas por asignaciones de cualquier periodo (#5) |
| Consulta pública por alumno | Cursos de todos los periodos (#37) |
| Detección de alertas de capacidad y software | Todas las asignaciones vigentes del espacio, de cualquier periodo |
| Mapa de ocupación | Ocupación de cualquier asignación vigente |

**Hoy no se nota** porque solo hay un periodo cargado. Con el segundo, aparecerán aulas «ocupadas» por clases del semestre anterior y alertas sobre secciones que ya terminaron.

**Propuesta.**
1. Al cerrar un periodo, pasar todas sus asignaciones a **históricas** (ver 9.2). Así ninguna consulta de «vigentes» las vuelve a ver.
2. Además, filtrar explícitamente por el periodo vigente en todas las consultas de la tabla.

**Criterios de aceptación.**
- Con dos periodos cargados, el reintento, la consulta pública, las alertas y el mapa solo consideran el periodo vigente.

---

### 9.2 Propuesta: gestión de periodos desde Coordinación

Una pantalla **«Periodos»** en el panel de Coordinación que reemplace la variable `PERIODO_VIGENTE` y la regla del «más reciente».

**Por qué.** El cambio de semestre es una decisión **académica**, no técnica: le corresponde a Coordinación. Hoy depende de una variable de entorno del servidor, es decir, de que alguien con acceso a Render la cambie y reinicie el servicio. Coordinación no puede ver cuál es el periodo vigente ni cambiarlo, y el cambio no queda registrado en la auditoría.

**Datos.** Una tabla `Periodo` nueva (con su migración): código (`2027-1`), fecha de inicio, fecha de fin y estado (`EN_PREPARACION`, `VIGENTE`, `CERRADO`). Solo puede haber **un** periodo vigente a la vez.

**Ciclo de vida de un periodo:**

```
Registrar ──► EN PREPARACIÓN ──► Activar ──► VIGENTE ──► Cerrar ──► CERRADO
```

**Acciones de Coordinación:**

| Acción | Qué hace | Validaciones |
|---|---|---|
| **Registrar periodo** | Crea `2027-1` en preparación, con sus fechas | Formato `AAAA-N`; no puede repetirse; las fechas no pueden solaparse con otro periodo |
| **Cargar datos** | Las importaciones indican el periodo de destino y solo aceptan periodos **en preparación o vigentes** | Rechaza periodos cerrados o no registrados (#49, #50) |
| **Asignación de prueba** | Corre el motor sobre un periodo en preparación para revisar escaladas antes de publicar | Alumnos y docentes no ven el resultado todavía |
| **Activar periodo** | Pasa `2027-1` a vigente y cierra el anterior **en el mismo paso** | Pide confirmación: «Se cerrará 2026-2 y alumnos y docentes verán 2027-1 desde ahora». Requiere que el nuevo tenga secciones, horarios y matrículas |
| **Cerrar periodo** | Pasa el periodo a cerrado y sus asignaciones a históricas | Solo consulta desde ese momento |

**Efectos de activar un periodo:**
1. El anterior queda **cerrado** y sus asignaciones pasan a **históricas** (resuelve #52 y el problema de «Reintentar» de #5).
2. El portal del alumno, el portal docente, Telegram y el panel pasan a mostrar el nuevo periodo.
3. Queda registrado en la auditoría quién lo activó y cuándo.
4. Opcional: aviso por Telegram a los alumnos («Ya están disponibles tus aulas de 2027-1»).

**Qué ve cada rol:**
- **Alumnos y docentes:** solo el periodo vigente. Nunca uno en preparación.
- **Coordinación y Jefatura:** el vigente por defecto, con un selector para consultar periodos cerrados (solo lectura) o preparar uno nuevo.

**Transición desde lo actual.** Al desplegarlo, registrar `2026-2` como vigente con sus fechas. La variable `PERIODO_VIGENTE` deja de usarse.

**Criterios de aceptación.**
- Cargar un CSV con periodo `2026-I` o con un periodo no registrado no cambia nada y muestra el error.
- Con 2027-1 en preparación, alumnos y docentes siguen viendo 2026-2.
- Tras activar 2027-1, 2026-2 queda cerrado y ninguna operación de escritura lo acepta.
- Ninguna consulta de aulas ocupadas, alertas o mapa incluye asignaciones de periodos cerrados.

---

## Anexo A — Ángulos revisados y no revisados

| Ángulo | Estado |
|---|---|
| Reglas del motor de asignación | Revisado |
| Accesibilidad de punta a punta | Revisado |
| Roles y permisos por pantalla y endpoint | Revisado |
| Autenticación, sesiones y Telegram | Revisado |
| Privacidad de la consulta pública y de la ficha médica | Revisado |
| Integridad de las importaciones | Revisado |
| Zona horaria (Lima) en resúmenes y «clase actual» | Revisado: correcta |
| Lectura de CSV reales (codificación, separador, BOM) | Revisado |
| Frontend ante tiempos de espera y arranque lento del servidor | Revisado |
| Coherencia de los datos de espacios, software y contigüidad | Revisado (las 74 contigüidades son del mismo piso, pabellón y tipo) |
| Cobertura de la auditoría | Revisado |
| Manejo de periodos (validación, cambio de semestre, escritura en periodos pasados) | Revisado |
| Dependencias con vulnerabilidades conocidas | Revisado (`npm audit`) |
| Rendimiento y carga (k6) | **No revisado**; solo la estimación de #39 |
| Accesibilidad web (lectores de pantalla, contraste) | **No revisado** a fondo; hay pruebas automáticas en el frontend |
| Respaldo y recuperación de la base | **No revisado**; existe `docs/runbook_rollback.md` |

---

## Anexo B — Propuesta de software por laboratorio y por curso (riesgo #41)

> **Estado: PROPUESTA, pendiente de revisión y aprobación por el equipo. No cargar en la base hasta que se apruebe** (ver el orden de pasos en #41).
>
> Es una propuesta razonable hecha a partir de los nombres de los cursos y de lo habitual en una carrera de Ingeniería de Software. La revisa y la aprueba el propio equipo. Los nombres van sin versión, así que el motor acepta cualquier versión instalada (comparación `CUALQUIERA`).

### B.1 Catálogo propuesto

| Categoría | Programas |
|---|---|
| Sistema operativo | Windows 11, Ubuntu (máquina virtual) |
| Ofimática | Microsoft Office (Word, Excel, PowerPoint), Microsoft Project |
| IDE | Visual Studio Code, IntelliJ IDEA Community, Eclipse IDE, Apache NetBeans, Code::Blocks |
| Lenguajes | Python, Java JDK, GCC / G++ (MinGW), Node.js |
| Bases de datos | PostgreSQL + pgAdmin, MySQL + MySQL Workbench, SQL Server Express + SSMS, MongoDB Community |
| Redes | Cisco Packet Tracer, GNS3, Wireshark |
| Simulación y matemática | GeoGebra, GNU Octave, R + RStudio, Logisim Evolution, Arduino IDE |
| Modelado y diseño | StarUML, Bizagi Modeler, draw.io, Figma (navegador) |
| Datos e IA | Anaconda (Jupyter, scikit-learn, TensorFlow), Weka, KNIME, Power BI Desktop |
| Desarrollo y calidad | Git, Docker Desktop, VirtualBox, Postman, Apache JMeter, Selenium IDE |
| Compiladores y paralelismo | ANTLR, WinFlexBison (Flex/Bison), MS-MPI / OpenMPI |
| Automatización | UiPath Studio Community |
| Otros | Google Chrome, GanttProject, Blender |

**Imagen base** (instalada en **todos** los laboratorios): Windows 11, Microsoft Office, Google Chrome, Visual Studio Code, Python, Java JDK, GCC / G++, Git, GeoGebra, draw.io, PostgreSQL + pgAdmin, MySQL + MySQL Workbench.

### B.2 Software requerido por curso (solo secciones de laboratorio)

| Curso | Software requerido |
|---|---|
| 202SW0104 Cálculo I | GeoGebra, GNU Octave |
| 202SW0106 Álgebra y Geometría Analítica I | GeoGebra, GNU Octave |
| 202SW0201 Redacción y Técnicas de Comunicación Efectiva II | Microsoft Office *(confirmar si usa laboratorio, #48)* |
| 202SW0202 Investigación Formativa | Microsoft Office *(confirmar, #48)* |
| 202SW0203 Realidad Nacional y Mundial | Microsoft Office *(confirmar, #48)* |
| 202SW0204 Cálculo II | GeoGebra, GNU Octave |
| 202SW0205 Física I | GeoGebra *(confirmar si es laboratorio de física, #48)* |
| 202SW0206 Química General | — *(probablemente laboratorio de química, #48)* |
| 202SW0207 Introducción a las Ciencias e Ingeniería | Microsoft Office, Python |
| 202SW0302 Estadística y Probabilidades | R + RStudio, Microsoft Office |
| 202SW0303 Física Electrónica *(falta en la base, #47)* | Logisim Evolution, Arduino IDE |
| 202SW0304 Ingeniería Económica | Microsoft Office |
| 202SW0306 Matemática Básica | GeoGebra |
| 202SW0401 Algorítmica II | Code::Blocks, GCC / G++, Java JDK |
| 202SW0402 Contabilidad para la Gestión | Microsoft Office |
| 202SW0403 Organización y Administración | Microsoft Office, Bizagi Modeler |
| 202SW0404 Matemática Discreta | Python, GeoGebra |
| 202SW0405 Estructura de Datos | Code::Blocks, GCC / G++, Java JDK, IntelliJ IDEA Community |
| 202SW0406 Procesos de Software | Bizagi Modeler, StarUML |
| 202SW0407 Sistemas Digitales | Logisim Evolution |
| 202SW0501 Análisis y Diseño de Algoritmos | GCC / G++, Python, Java JDK |
| 202SW0502 Arquitectura de Computadoras | Logisim Evolution, VirtualBox |
| 202SW0503 Base de Datos I | PostgreSQL + pgAdmin, MySQL + MySQL Workbench |
| 202SW0504 Computación Visual | Python, Blender |
| 202SW0505 Economía para la Gestión | Microsoft Office |
| 202SW0506 Ingeniería de Requisitos | StarUML, Bizagi Modeler, Figma |
| 202SW0507 Lenguajes y Compiladores | ANTLR, WinFlexBison, GCC / G++ |
| 202SW0601 Base de Datos II | SQL Server Express + SSMS, MongoDB Community, PostgreSQL + pgAdmin |
| 202SW0602 Calidad de Software | Selenium IDE, Apache JMeter, Postman |
| 202SW0603 Diseño de Software | StarUML, IntelliJ IDEA Community |
| 202SW0605 Gestión de Proyecto de Software | Microsoft Project, GanttProject |
| 202SW0606 Interacción Hombre Computador | Figma |
| 202SW0607 Sistemas Operativos | VirtualBox, Ubuntu |
| 202SW0701 Arquitectura de Software | Docker Desktop, StarUML, IntelliJ IDEA Community |
| 202SW0702 Experiencia de Usuario y Usabilidad | Figma |
| 202SW0703 Gestión de la Configuración y Mantenimiento del Software | Git, Docker Desktop |
| 202SW0704 Formación de Empresas de Software | Microsoft Office |
| 202SW0705 Inteligencia Artificial | Anaconda |
| 202SW0706 Pruebas de Software | Selenium IDE, Apache JMeter, Postman |
| 202SW0707 Redes y Transmisión de Datos | Cisco Packet Tracer, Wireshark, GNS3 |
| 202SW0801 Automatización y Control de Software | UiPath Studio Community, Arduino IDE |
| 202SW0802 Inteligencia de Negocios | Power BI Desktop, SQL Server Express + SSMS |
| 202SW0803 Metodología de la Investigación | Microsoft Office *(confirmar, #48)* |
| 202SW0804 Minería de Datos | Weka, KNIME, Anaconda |
| 202SW0805 Programación Concurrente y Paralela | MS-MPI / OpenMPI, Java JDK, GCC / G++ |
| 202SW0806 Taller de Construcción de Software Web | Node.js, Docker Desktop, Postman |
| 202SW0807 Aseguramiento de la Calidad del Software | Apache JMeter, Selenium IDE |
| 202SW0E01 Programación y Computación | Python, Visual Studio Code |
| 202SW0E02 Emprendimiento e Innovación | Microsoft Office, Figma *(confirmar, #48)* |

*202SW0604 Ética Profesional y Legislación Informática no tiene secciones de laboratorio.*

### B.3 Efecto esperado al cargarlo

- Los cursos que solo piden software de la imagen base (Matemática, Base de Datos I, Algorítmica, etc.) caben en **cualquier** laboratorio, como hoy.
- Los cursos especializados (Redes, Minería de Datos, Inteligencia de Negocios, Programación Concurrente, Sistemas Digitales) solo caben en los laboratorios especializados. **Si esos laboratorios están ocupados a su hora, la sección escalará por software.** Eso permite mostrar en la demo la regla de software, la alerta y el flujo de solicitud del docente.

---

## Anexo C — Decisiones abiertas del equipo

| Tema | Pregunta | Relacionado |
|---|---|---|
| Reparto en varias aulas | ¿Se acepta que una sección use varias salas a la vez con un solo docente? | #8 |
| Reorganización al inicio del ciclo | ¿Cuántas semanas se permiten cambios de aula masivos? | #9 |
| Verificación de accesibilidad | ¿Quién aprueba las declaraciones: Coordinación o Bienestar? | #12 |
| Plan B de accesibilidad | Sin piso 1 disponible, ¿asignar el piso más accesible con alerta o escalar siempre? | #10 |
| Teoría como laboratorio | ¿Lo decide el docente con aprobación, o solo Coordinación? | #22 |
| Catálogo de software | ¿Quién aprueba el catálogo y el software de cada curso propuestos en el Anexo B? | #41 |
| Laboratorios especializados | ¿Qué laboratorios son de bases de datos, redes, hardware o datos e IA? | #41 |
| Cursos generales con laboratorio | ¿Qué secciones de Química, Física, Redacción, etc. usan realmente laboratorio de cómputo? | #48 |
| Origen de los datos | ¿De qué fuente se corrigen `202SW0302` y `202SW0303`? | #47 |
| Periodos | ¿Hay ciclo de verano (`AAAA-0`)? ¿Cuáles son las fechas de inicio y fin de cada semestre? | #49, 9.2 |
