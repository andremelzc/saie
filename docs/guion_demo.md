# Guion de demostración y lista previa — SAIE

> **Issues:** 6.9 (#197, material de demo) y 6.11 (#223, lista previa a la demo)
> **Para quién es:** el equipo que presenta la sustentación.
> **Duración sugerida:** 15 minutos de demo en vivo.

---

## 1. Lista previa a la demo

Recórrala completa **el día anterior** y repita los puntos marcados con ⏱ **30 minutos antes** de presentar.

| # | Paso | Cómo comprobarlo | Hecho |
|---|---|---|---|
| 1 | Reactivar Supabase si está pausado | *Supabase Dashboard → Restore project*; luego `GET /api/health` responde con la base `ok` | ☐ |
| 2 | ⏱ Calentar el backend de Render | Abrir <https://saie-backend.onrender.com/api/health> y esperar la respuesta (45–60 s si estaba dormido) | ☐ |
| 3 | ⏱ Abrir el frontend | <https://saie-plum.vercel.app/> carga la página de inicio | ☐ |
| 4 | Confirmar el último despliegue | En GitHub → *Actions*, el último `CD` de `develop` está en verde | ☐ |
| 5 | Periodo vigente correcto | En `/admin/periodos`, `2026-2` aparece como **Vigente** | ☐ |
| 6 | Datos del escenario | La consulta pública con `202SW0805` muestra secciones con espacio asignado; si la base se reconstruyó, correr el seed (Manual técnico §6.2) | ☐ |
| 7 | Cuentas de demostración | Entrar con cada cuenta de §2 y dejarlas con una clave conocida por el equipo (no la inicial, para no caer en el cambio obligatorio en vivo) | ☐ |
| 8 | Mapa con estados | `/admin/mapa` muestra espacios ocupados, libres y deshabilitados | ☐ |
| 9 | Asignación sin violaciones | Correr la asignación desde el inicio de Coordinación: el verificador sale sin dobles reservas | ☐ |
| 10 | Limpiar restos de ensayos | Ninguna PC malograda de prueba, ninguna alerta pendiente que no forme parte del guion (ver Guía de pruebas §8) | ☐ |
| 11 | Telegram (opcional) | El celular de la demo tiene el bot vinculado y recibe un mensaje de prueba | ☐ |
| 12 | Plan de respaldo | Video del recorrido completo y capturas de cada paso descargados **en local**, fuera de la nube | ☐ |
| 13 | ⏱ Pantalla y red | Navegador en ventana de incógnito, zoom 100 %, notificaciones silenciadas, red cableada o datos móviles de respaldo | ☐ |

---

## 2. Cuentas de la demo

| Rol | Usuario | Uso en el guion |
|---|---|---|
| Coordinación Académica | `coordinacion` | Corrida, alertas, reubicación, accesibilidad |
| Jefatura de Laboratorios | `jefatura` | PCs malogradas, incidencias |
| Docente | `0A0690` | Dicta `202SW0805 2-LAB` en los laboratorios 01–03 |
| Alumno | `23200107` | Horario, mapa y ruta |

Las claves no se escriben en este documento: el equipo las acuerda en el paso 7 de la lista previa.

---

## 3. Guion

Cada bloque dice **quién presenta**, **qué se muestra** y **qué mensaje** debe quedar. Asignen el presentador de cada bloque en el ensayo.

### Bloque 1 — El problema (1 min, sin sistema)

Asignar 229 secciones a 54 espacios a mano, con laboratorios que pierden PCs, software que falta y alumnos con movilidad reducida, produce errores y aulas que nadie encuentra.

### Bloque 2 — El alumno encuentra su aula (3 min)

1. Sin sesión, **Consultar** con el código `23200107`: sus cursos y aulas, sin datos personales.
2. Entrar como alumno: **Inicio** (próxima clase) → **Horario** → **Mapa** (plano 2D y maqueta 3D) → **Ruta** desde la entrada principal.
3. Mostrar la vista de celular (herramientas del navegador, 390 px).

**Mensaje:** el alumno encuentra su aula sin preguntar a nadie.

### Bloque 3 — Coordinación asigna sin trabajo manual (4 min)

1. Entrar como `coordinacion`. **Inicio:** métricas, secciones en revisión con su motivo y «Datos incompletos».
2. **Correr la asignación:** confirmar y mostrar el desglose (aula nueva, conservan, en revisión) y el veredicto del verificador.
3. **Carga:** mostrar la guía y la vista previa de un CSV de `demo/pruebas/` con errores: todo o nada, con todos los errores listados.
4. **Historial:** la corrida quedó registrada.

**Mensaje:** el motor respeta capacidad real, contigüidad, software y accesibilidad, y lo que no puede resolver lo escala con un motivo.

### Bloque 4 — Un laboratorio pierde PCs (4 min)

1. Entrar como `jefatura`. **Cambio de laboratorio:** Laboratorio 01, PCs malogradas de 0 a 3. Guardar.
2. El sistema genera una **alerta de capacidad** (63 → 60 puestos para 61 alumnos de `202SW0805 2-LAB`).
3. Volver como `coordinacion`. **Alertas → Reubicar secciones:** la sección pasa a otro bloque o queda en revisión con motivo.
4. Entrar como docente `0A0690`: el horario muestra el nuevo espacio. Si Telegram está vinculado, mostrar el aviso de cambio de aula.

**Mensaje:** un cambio en un laboratorio llega a tiempo a quien debe actuar.

### Bloque 5 — Accesibilidad (2 min)

1. Como alumno: **Perfil → ficha médica**, declarar movilidad reducida.
2. Como Coordinación: **Accesibilidad**, aprobar. El sistema reasigna sus secciones con prioridad al piso 1 y muestra el resultado.
3. Si no hubo piso 1 libre, mostrar la **alerta de accesibilidad**.

**Mensaje:** la accesibilidad es una regla del motor, no un pedido manual.

### Bloque 6 — Calidad (1 min, diapositiva)

- 1391 pruebas de backend y 931 de frontend en verde; cobertura de backend 90,3 %.
- CI con `tsc`, ESLint, Prettier, pruebas, E2E con Playwright y axe, `npm audit` y SonarCloud.
- Despliegue continuo con verificación de salud y runbook de rollback.

---

## 4. Después de la demo

- Revertir lo que cambió en vivo: PCs malogradas del Laboratorio 01 a 0, declaración de movilidad reducida de la cuenta de demo y la corrida (volver a correr la asignación).
- Anotar en el issue 6.11 lo que falló durante el ensayo o la demo y abrir un issue por cada problema.

## 5. Si algo falla en vivo

| Falla | Respuesta |
|---|---|
| El backend no responde | Esperar 60 s (arranque en frío); si sigue, pasar al video de respaldo. |
| La base está pausada | No se reactiva en menos de unos minutos: usar el video de respaldo. |
| Una pantalla muestra un error | Mostrar el mensaje (el sistema dice qué pasó) y seguir con el siguiente bloque. |
| Telegram no llega | Saltar ese paso; no es necesario para el mensaje del bloque. |
