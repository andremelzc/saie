# Definición de Cada Tema y Cómo se Aplica en SAIE — Semanas 9 a 16

> **Curso:** Automatización y Control de Software (202W0801) — UNMSM, Ingeniería de Software, 2026-2.
> **Qué es este documento:** para cada tema de las Unidades 3 y 4 del sílabo, su definición, cómo se aplicó en SAIE, dónde se puede comprobar y **qué se podría mejorar**. Es la base de la presentación final.
> **Registro asociado:** [`registro-cobertura-semanas-9-16.md`](registro-cobertura-semanas-9-16.md).
> **Semanas 1 a 8:** [`definiciones-e-implementacion.md`](definiciones-e-implementacion.md).
> **Fecha:** 2026-10-08 · **Rama revisada:** `develop` más la rama `feature/1.6-endpoint-importacion`

## Estados

| Estado | Significado |
| :---: | :--- |
| **Aplicado** | El tema está en el proyecto (código, documento o artefacto). |
| **Parcial** | Existe, pero incompleto. La mejora indica qué falta. |
| **Planificado** | Tiene un issue creado; no está construido. |
| **Propuesto** | Hay una idea de aplicación, sin decisión del equipo ni issue. |
| **Justificado** | Se analizó y no aplica a SAIE; se explica por qué. |

> **Advertencia.** Los estados *Propuesto* y *Justificado* son una propuesta del autor del documento. El equipo y la profesora deben aceptarlos o rechazarlos.

---

## 1. Semanas 9–10: Sistemas embebidos e Internet de las Cosas (11 temas)

### 1.0. Análisis previo: ¿SAIE necesita IoT?

IoT se justifica cuando una solución necesita **medir o actuar sobre el mundo físico**, de forma distribuida, con datos que no se pueden obtener de otra manera. Aplicando los criterios a SAIE:

| Criterio | ¿Se cumple en SAIE? | Comentario |
| :--- | :---: | :--- |
| El problema exige leer magnitudes físicas (presencia, temperatura, estado de un equipo) | Parcial | Interesa el estado de las PCs y la ocupación real de las aulas |
| Ese dato no puede obtenerse por software o por registro humano | **No** | El estado de las PCs y del software lo registra Jefatura a mano; la ocupación se deduce de la asignación |
| Se necesita actuar sobre dispositivos (cerraduras, luces, climatización) | **No** | SAIE decide dónde se dicta cada clase; no controla el edificio |
| El volumen de dispositivos o la latencia justifican infraestructura propia | **No** | Son 15 espacios |
| El costo de hardware, instalación y mantenimiento es proporcional al beneficio | **No** | Un MVP universitario sin presupuesto de equipos |

**Conclusión:** SAIE **no requiere IoT**. Los once temas se definen y se muestra por qué no aplican.

**Si se quisiera aplicar**, el candidato con mejor encaje sería un **agente en cada PC de laboratorio** que publique por MQTT su estado y el software instalado. Reemplazaría la captura manual de Jefatura y alimentaría directamente los procesos de alerta por software y por capacidad (BPMN 3 y 4). Cerraría el lazo de control con datos reales en lugar de registros manuales. Está fuera del alcance y no tiene issue.

### 1.1. Concepto de sistema embebido — Justificado

**Definición.** Sistema informático dedicado a una función específica, integrado dentro de un dispositivo o equipo mayor (un electrodoméstico, un automóvil, un medidor). Suele tener recursos limitados de memoria, energía y cómputo, y a menudo requisitos de tiempo real.

**Cómo se aplicó.** No se aplicó: SAIE es una aplicación web que corre en servidores de propósito general.

**Qué se podría mejorar.** Nada dentro del alcance. La única pieza que se acercaría es el agente de las PCs descrito en el §1.0.

### 1.2. Software embebido — Justificado

**Definición.** Software que se ejecuta dentro de un sistema embebido (*firmware*). Está estrechamente ligado al hardware, se escribe para recursos escasos y es difícil de actualizar una vez desplegado.

**Cómo se aplicó.** No se aplicó. SAIE no tiene firmware.

**Qué se podría mejorar.** Nada dentro del alcance.

### 1.3. Diferencias entre aplicación tradicional y software embebido — Justificado

**Definición.** Una aplicación tradicional corre en hardware de propósito general, con recursos abundantes, y se actualiza con facilidad. El software embebido es dedicado, con recursos limitados, interactúa directamente con sensores y actuadores y es costoso de actualizar.

| Aspecto | Aplicación tradicional | Software embebido | SAIE |
| :--- | :--- | :--- | :---: |
| Hardware | General | Dedicado | General |
| Recursos | Abundantes | Limitados | Abundantes |
| Actualización | Frecuente y sencilla | Rara y costosa | Continua (CD) |
| Interacción física | Casi nula | Directa | Ninguna |
| Tiempo real | No suele exigirse | A menudo estricto | No |

**Cómo se aplicó.** SAIE es una aplicación tradicional y se despliega de forma continua con CI/CD, algo que un sistema embebido no suele permitir.

**Qué se podría mejorar.** Nada dentro del alcance.

### 1.4. Introducción a IoT — Justificado

**Definición.** El Internet de las Cosas es la red de objetos físicos que incorporan sensores, software y conectividad para recolectar e intercambiar datos y, a veces, actuar sobre su entorno.

**Cómo se aplicó.** No se aplicó. SAIE solo maneja datos que las personas registran.

**Qué se podría mejorar.** Ver el §1.0: automatizar con IoT la entrada del estado de PCs y software.

### 1.5. Dispositivos conectados — Justificado

**Definición.** Equipos con capacidad de comunicación (Wi-Fi, Bluetooth, LoRa, Ethernet) que pueden identificarse en una red e intercambiar datos con otros sistemas.

**Cómo se aplicó.** Las PCs de los laboratorios existen pero **no se conectan** a SAIE; su estado llega por registro manual de Jefatura.

**Qué se podría mejorar.** Un agente en cada PC (ver §1.0).

### 1.6. Sensores y actuadores como componentes de sistemas automatizados — Justificado

**Definición.** Los **sensores** miden una magnitud física (temperatura, presencia, humedad, CO₂) y la convierten en dato. Los **actuadores** ejecutan una acción física (relé, motor, cerradura) a partir de una orden.

**Cómo se aplicó.** En la analogía del lazo de control (semanas 2 y 3) los "sensores" de SAIE son los registros de Jefatura y su "actuador" es la alerta. No hay sensores ni actuadores físicos.

**Qué se podría mejorar.** Sensores de presencia por aula permitirían comparar la ocupación real con la asignada; queda fuera del alcance.

### 1.7. Comunicación entre dispositivos y software — Justificado

**Definición.** Forma en que los dispositivos envían datos y reciben órdenes: HTTP/REST, MQTT, CoAP, Bluetooth, entre otros. La elección depende del consumo de energía, el tamaño de los mensajes y la fiabilidad de la red.

**Cómo se aplicó.** La comunicación de SAIE es HTTP/REST entre el frontend y el backend, y por la Bot API de Telegram cuando se construya (issues #250 a #254). No hay dispositivos.

**Qué se podría mejorar.** Nada dentro del alcance.

### 1.8. Introducción a MQTT — Justificado

**Definición.** Protocolo ligero de mensajería de **publicación/suscripción** sobre TCP. Los dispositivos publican mensajes en *topics* y un *broker* los distribuye a los suscriptores. Ofrece tres niveles de calidad de servicio (0, 1 y 2), mensajes retenidos y un mensaje de última voluntad ante desconexiones.

**Cómo se aplicó.** No se usa. El patrón de publicación y suscripción sí aparece en el bus de eventos planificado (issue #249), pero en memoria y sin MQTT.

**Qué se podría mejorar.** Si se aplicara el agente de PCs del §1.0, MQTT sería el protocolo natural.

### 1.9. Edge y Cloud Computing — Justificado

**Definición.** *Cloud*: el procesamiento y el almacenamiento están en centros de datos remotos, con escala y mantenimiento centralizados. *Edge*: parte del procesamiento ocurre cerca del dispositivo para reducir latencia y consumo de ancho de banda.

**Cómo se aplicó.** SAIE es 100 % *cloud*: frontend en Vercel, backend en Render y base de datos en Supabase.

**Qué se podría mejorar.** Con el agente de PCs, el filtrado de lecturas en el equipo (*edge*) evitaría enviar datos sin cambios.

### 1.10. Casos de aplicación — Justificado

**Definición.** Usos típicos de IoT: edificios inteligentes (ocupación y consumo), agricultura de precisión, logística, salud y domótica.

**Cómo se aplicó.** El caso más cercano a SAIE es el de **edificios inteligentes**: sensores de presencia por aula, control de climatización según ocupación y estado remoto de equipos. SAIE resuelve el lado de la decisión (qué clase va a qué aula) pero no el del mundo físico.

**Qué se podría mejorar.** Nada dentro del alcance.

### 1.11. Criterios para determinar cuándo una solución requiere IoT — Justificado

**Definición.** Un problema requiere IoT cuando necesita datos del mundo físico que no se pueden obtener de otra forma, o necesita actuar sobre él, y el beneficio compensa el costo de hardware, conectividad y mantenimiento.

**Cómo se aplicó.** Es el análisis del §1.0, que concluye que SAIE no requiere IoT.

**Qué se podría mejorar.** Reevaluarlo si el sistema se extendiera a más edificios, donde el registro manual del estado de las PCs dejaría de ser viable.

---

## 2. Semanas 11–12: Monitoreo, logs, trazabilidad y alertas (13 temas)

### 2.1. Importancia del monitoreo — Parcial

**Definición.** Monitorear es observar de forma continua el estado de un sistema para detectar fallas antes de que las note el usuario, medir su desempeño y sustentar decisiones. Sin monitoreo, los problemas se descubren por reclamos.

**Cómo se aplicó.** Existe el endpoint de salud `GET /api/health`, que devuelve estado, hora, servicio y entorno, y que usa la prueba de carga de k6.

**Qué se podría mejorar.** Un servicio externo de monitoreo de disponibilidad que consulte `/api/health`; comprobar también la conexión a la base de datos (hoy el health no la verifica); y alertar a alguien cuando el sistema cae. Es especialmente útil con Render gratuito, que se suspende sin tráfico.

### 2.2. Logs de aplicaciones — Parcial

**Definición.** Registros con marca de tiempo de lo que hace la aplicación, con niveles de severidad (error, advertencia, información, depuración), que permiten reconstruir lo ocurrido.

**Cómo se aplicó.** Solo `console.error` en los errores no controlados (`backend/src/lib/http.ts`, `app.ts`). Se registra únicamente el tipo de error, a propósito, para no filtrar datos sensibles (RNF-09).

**Qué se podría mejorar.**
- Un registrador estructurado (por ejemplo, `pino`) con niveles y salida en JSON.
- Un identificador por solicitud para correlacionar los registros.
- Registrar cada solicitud (método, ruta, estado y duración) sin cuerpos ni credenciales.
- Registrar el inicio, el fin y el resultado de cada corrida de asignación.

### 2.3. Registro de eventos — Parcial

**Definición.** Dejar constancia persistente de los hechos relevantes del sistema, con su tipo, momento y contexto.

**Cómo se aplicó.** La tabla `RegistroAuditoria` guarda eventos de tipo `ASIGNACION` y `ESCALAMIENTO` con fecha, hora y detalle (`motor.service.ts`). `HistorialEspacio` guarda cada cambio de software o de PCs con valor anterior, nuevo, fecha y cuenta.

**Qué se podría mejorar.** El tipo `ALERTA` existe en el esquema pero **no se registra**; se resolvería con el manejador del evento `alerta.creada` (issues #249 y 5.11). Registrar también las importaciones y los avisos enviados.

### 2.4. Auditoría — Parcial

**Definición.** Registro verificable de **quién** hizo **qué** y **cuándo**, pensado para revisión posterior y rendición de cuentas.

**Cómo se aplicó.** Cada asignación o escalamiento deja una fila con fecha, hora y detalle. Los cambios de laboratorio guardan la cuenta que los hizo.

**Qué se podría mejorar.**
- `RegistroAuditoria` **no guarda la cuenta** que disparó la acción; falta el "quién" (hallazgo H7).
- RF-23 pide que sea inmutable; no se verificó una restricción en la base (por ejemplo, impedir `UPDATE` y `DELETE` sobre esa tabla).
- El detalle es texto libre; un formato estructurado facilitaría consultarlo.

### 2.5. Trazabilidad — Aplicado

**Definición.** Capacidad de seguir un resultado hasta su origen: qué datos, qué reglas y qué ejecución lo produjeron.

**Cómo se aplicó.** Cada asignación guarda:
- `corridaId`: la ejecución que la produjo;
- `huellaEntrada`: un hash SHA-256 de los datos de la sección, que prueba que la entrada no cambió;
- `motivoEscalamiento`: la regla que impidió asignar;
- su estado (`VIGENTE`, `ESCALADA`, `HISTORICA`), de modo que las asignaciones anteriores se conservan.

Las incidencias llevan un `identificadorSeguimiento` único, y las alertas enlazan las asignaciones afectadas.

**Qué se podría mejorar.** Agregar a la auditoría la cuenta que disparó la corrida (ver 2.4) y una consulta que reconstruya la historia de una sección de punta a punta.

### 2.6. Métricas — Parcial

**Definición.** Mediciones numéricas del sistema en el tiempo: latencia, tasa de error, volumen de solicitudes, y también de negocio (porcentaje de secciones asignadas).

**Cómo se aplicó.** Cada corrida devuelve un resumen con total de secciones, asignadas, mantenidas y escaladas (`asignacionDemanda.service.ts`). No hay métricas del sistema.

**Qué se podría mejorar.** Persistir el resumen de cada corrida para ver su evolución; medir latencia y errores por ruta; y automatizar la verificación de las métricas de éxito del proyecto (0 doble reserva, 0 capacidad insuficiente, 100 % de software cumplido).

### 2.7. Estado de los procesos — Parcial

**Definición.** Información visible sobre en qué punto está cada proceso (pendiente, en curso, terminado, con error).

**Cómo se aplicó.** Estados explícitos en el modelo: `EstadoAsignacion` (vigente, escalada, histórica), `EstadoAlerta` (pendiente, resuelta) y `EstadoIncidencia`. Una corrida en curso se detecta con un candado en memoria (`hayCorridaEnCurso`) y una segunda solicitud responde 409.

**Qué se podría mejorar.** Una tabla de corridas con inicio, fin, estado y resumen, para consultar su progreso. El candado en memoria no funciona con más de una instancia del backend; convendría uno en la base de datos.

### 2.8. Dashboards — Planificado

**Definición.** Paneles que resumen el estado del sistema con indicadores y gráficos, para tomar decisiones de un vistazo.

**Cómo se aplicó.** No está construido. Existen los issues de la lista de alertas (4.9 y 4.10), el mapa de ocupación por piso (4.11 a 4.14) y la escena 3D (4.23 y 4.24).

**Qué se podría mejorar.** Cuando existan, incluir un panel del estado de las corridas y de las métricas del §2.6, no solo la ocupación.

### 2.9. Alertas automáticas — Parcial

**Definición.** Avisos que el sistema genera por sí solo cuando se cumple una condición que requiere atención.

**Cómo se aplicó.** Al registrar un cambio de software o de PCs, el sistema evalúa las asignaciones vigentes y persiste una alerta `SOFTWARE` o `CAPACIDAD`, que nombra los cursos afectados. Si ya existe una pendiente idéntica, la actualiza en lugar de duplicarla (`alerta.service.ts`).

**Qué se podría mejorar.** Las alertas se guardan pero **no se pueden listar ni resolver** todavía (issues 4.6 y 4.7). Tampoco se detectan cambios hechos fuera del endpoint; una revisión periódica (temporizador) lo cubriría.

### 2.10. Notificaciones — Planificado

**Definición.** Mensajes que el sistema envía a una persona por un canal (correo, mensajería, notificación móvil) para informarle de un hecho.

**Cómo se aplicó.** No está construido. Los avisos por Telegram están planificados en los issues #250 a #254, sujetos a la aprobación del cambio de alcance (#247).

**Qué se podría mejorar.** Notificar también a Jefatura cuando se crea una alerta, no solo al estudiante.

### 2.11. Detección de errores — Parcial

**Definición.** Identificar que algo falló, qué falló y dónde, preferiblemente antes de que el usuario lo reporte.

**Cómo se aplicó.** Validación de entradas con Zod, un formato uniforme de error `{ success: false, message }` y códigos HTTP precisos (400, 401, 403, 404, 409, 413). La importación reporta cada fila rechazada con su motivo.

**Qué se podría mejorar.** Nadie se entera de un error 500 salvo que mire los registros. Se puede enviar los errores a un servicio de seguimiento (por ejemplo, Sentry) y alertar si la tasa de error sube.

### 2.12. Observabilidad básica — Parcial

**Definición.** Capacidad de entender el estado interno de un sistema a partir de lo que emite: **logs, métricas y trazas**.

**Cómo se aplicó.** Solo el health check y los errores por consola. Faltan los tres pilares.

**Qué se podría mejorar.** Empezar por lo mínimo: logs estructurados con identificador de solicitud (2.2), métricas de latencia y errores (2.6), y un monitoreo de disponibilidad (2.1).

### 2.13. Seguimiento de ejecuciones automatizadas — Parcial

**Definición.** Poder consultar qué ejecuciones automáticas ocurrieron, cuándo, con qué resultado y qué las disparó.

**Cómo se aplicó.** Las corridas de asignación se agrupan por `corridaId`. Los pipelines de CI/CD dejan su historial en GitHub Actions.

**Qué se podría mejorar.** La tabla de corridas del §2.7 y, con el resumen diario planificado, comprobar que corrió y alertar si no lo hizo.

---

## 3. Semanas 11–12: Automatización inteligente mediante IA (13 temas)

### 3.0. Contexto

SAIE decide con **reglas deterministas**, no con IA. Es una decisión consciente: el motor debe ser explicable (RNF-08), reproducible (D-05) y auditable. Los trece temas se tratan con ese punto de partida.

**Aplicación natural de IA, si el equipo la adopta (propuesta, sin decisión ni issue):** las **incidencias que reportan los docentes**. Hoy el docente elige el tipo (`EQUIPO_NO_OPERATIVO`, `SOFTWARE_FALTANTE`, `OTRO`) y la prioridad (`BAJA`, `MEDIA`, `ALTA`). Un modelo de lenguaje podría **sugerir** el tipo y la prioridad a partir de la descripción en texto libre, con **Jefatura confirmando o corrigiendo** (*human-in-the-loop*). Conserva la decisión humana y deja trazada la sugerencia.

### 3.1. Automatización tradicional versus automatización inteligente — Aplicado

**Definición.** La **tradicional** ejecuta reglas fijas definidas por personas. La **inteligente** incorpora IA para tareas que las reglas no resuelven bien: interpretar texto, reconocer patrones o decidir con datos ambiguos.

| Aspecto | Tradicional (reglas) | Inteligente (IA) |
| :--- | :--- | :--- |
| Decisión | Determinista | Probabilística |
| Explicabilidad | Total | Limitada |
| Datos requeridos | Estructurados | Pueden ser no estructurados |
| Mantenimiento | Cambiar reglas | Reentrenar o reajustar |
| Riesgo | Reglas incompletas | Errores no previstos |

**Cómo se aplicó.** SAIE es de automatización tradicional. El motor aplica 11 reglas (R-01 a R-11) y escala a revisión manual lo que no puede resolver.

**Qué se podría mejorar.** Incorporar IA solo donde hay texto libre: las incidencias (ver el §3.0).

### 3.2. Inteligencia Artificial aplicada a procesos — Propuesto

**Definición.** Usar modelos de IA dentro de un proceso para clasificar, extraer, priorizar, resumir o recomendar, normalmente asistiendo a una persona.

**Cómo se aplicó.** No se aplicó. La propuesta es la clasificación de incidencias del §3.0.

**Qué se podría mejorar.** Definir el alcance y crear los issues si el equipo decide adoptarla; medir la tasa de acuerdo entre la sugerencia del modelo y la decisión final de Jefatura.

### 3.3. Clasificación automática — Propuesto

**Definición.** Asignar un elemento a una categoría de forma automática, a partir de su contenido.

**Cómo se aplicó.** No se aplicó. La candidata es la clasificación del tipo de incidencia desde su descripción.

**Qué se podría mejorar.** Si se construye, guardar la categoría sugerida y la elegida por la persona en campos distintos, para poder medir los aciertos.

### 3.4. Priorización automática — Aplicado (por reglas)

**Definición.** Ordenar elementos por importancia o urgencia sin intervención humana.

**Cómo se aplicó.** Por reglas, no por IA:
- La corrida batch procesa primero las secciones con movilidad reducida, luego las de laboratorio con software requerido y luego las de mayor matrícula (`docs/03_alcance_y_reglas.md` §2.4).
- Entre los bloques candidatos se ordena por Piso 1 (si hay movilidad reducida), cercanía a secciones paralelas, menos espacios, menor desperdicio, menor piso e identificador (`orquestadorAsignacion.ts`).

**Qué se podría mejorar.** El orden del código tiene criterios (menos espacios, menor piso) que no aparecen igual en `docs/03_alcance_y_reglas.md` §2.3; conviene alinear ambos. La prioridad de las incidencias hoy la elige el docente.

### 3.5. Extracción y procesamiento de información — Parcial

**Definición.** Obtener datos estructurados a partir de fuentes diversas (documentos, correos, imágenes) y prepararlos para un proceso.

**Cómo se aplicó.** Sin IA: los importadores leen CSV y JSON, normalizan y validan cada fila con Zod (`archivoImportacion.ts`, `importers/`).

**Qué se podría mejorar.** Extraer los horarios desde los documentos que hoy circulan (por ejemplo, PDF de la facultad) con un modelo de lenguaje, siempre con revisión humana antes de importar.

### 3.6. IA generativa aplicada a automatización — Propuesto

**Definición.** Modelos que generan contenido (texto, código, resúmenes) y pueden integrarse en un proceso automatizado.

**Cómo se aplicó.** No se aplicó. Candidata: **explicar en lenguaje natural** por qué una sección quedó escalada y qué datos habría que corregir. Hoy el motivo es un texto técnico como `[SOFTWARE_FALTANTE] Ningún laboratorio disponible en la franja horaria cuenta con el stack…`.

**Qué se podría mejorar.** El texto generado debe basarse solo en el motivo y los datos de la corrida, mostrarse junto al motivo original, y no sustituirlo.

### 3.7. Automatización de decisiones — Aplicado

**Definición.** Delegar en el sistema decisiones que antes tomaba una persona, con criterios definidos.

**Cómo se aplicó.** Es el núcleo de SAIE: el motor decide a qué espacio va cada sección, o la escala si no hay un bloque válido (`orquestarAsignacionSeccion`; algoritmo en `diagramas/actividad-orquestacion-asignacion.puml`). Con la corrida batch decide sobre todo el periodo.

**Qué se podría mejorar.** Medir su calidad con indicadores (porcentaje asignado sin escalar) y permitir comparar corridas.

### 3.8. Sistemas basados en reglas versus sistemas basados en IA — Aplicado

**Definición.** Los sistemas de reglas aplican lógica explícita; los de IA aprenden patrones de datos. La elección depende de la explicabilidad, el costo del error, la disponibilidad de datos y la estabilidad del problema.

**Cómo se aplicó.** Se eligieron reglas porque:
- el problema tiene restricciones duras y verificables (capacidad, contigüidad, no solapamiento);
- cada decisión debe poder explicarse (RNF-08) y reproducirse (D-05, RNF-06);
- no hay datos históricos suficientes para entrenar un modelo;
- un error (un aula equivocada) tiene un costo alto y visible.

**Qué se podría mejorar.** Documentar estos criterios en `docs/arquitectura.md` como decisión de arquitectura, junto con los casos en que sí se justificaría IA.

### 3.9. Human-in-the-loop — Parcial

**Definición.** Diseño en el que una persona interviene en puntos clave de un proceso automatizado, para validar, corregir o decidir.

**Cómo se aplicó.** El motor **escala a revisión manual** lo que no puede resolver; Jefatura debe atender las alertas y resolver las incidencias. Son puntos donde el sistema se detiene y pide a una persona.

**Qué se podría mejorar.** Las pantallas y endpoints que cierran esos puntos faltan: listar secciones escaladas (4.22), listar y resolver alertas (4.6 y 4.7) y revisar incidencias (7.6 y 7.11). Sin ellos, el ciclo con la persona está solo en el diseño.

### 3.10. Supervisión humana — Parcial

**Definición.** Capacidad de una persona de vigilar, auditar y, si hace falta, anular lo que decide el sistema.

**Cómo se aplicó.** Coordinación dispara y revisa cada corrida; el resumen muestra cuántas secciones se asignaron, se conservaron y se escalaron; Jefatura atiende alertas.

**Qué se podría mejorar.** Una vista de la última corrida con sus escaladas, y la posibilidad de revisar una decisión concreta (por qué esta sección quedó en este aula).

### 3.11. Validación de resultados — Aplicado

**Definición.** Comprobar que el resultado de un proceso automatizado es correcto antes o después de usarlo.

**Cómo se aplicó.**
- Las reglas duras verifican cada bloque antes de asignarlo.
- Las pruebas parametrizadas cubren los bordes de cada regla para aulas y laboratorios.
- La huella de entrada garantiza que repetir la corrida con los mismos datos da el mismo resultado.
- La detección de alertas revalida las asignaciones vigentes cuando cambia el entorno.

**Qué se podría mejorar.** Una verificación automática, después de cada corrida, de las invariantes del proyecto (ningún espacio doblemente asignado, ninguna capacidad insuficiente) que alerte si alguna falla.

### 3.12. Riesgos de decisiones automatizadas — Aplicado

**Definición.** Peligros de delegar decisiones a un sistema: errores a gran escala, sesgos, falta de explicación, dependencia de datos desactualizados y daños a las personas afectadas.

| Riesgo | Cómo se presenta en SAIE | Mitigación existente |
| :--- | :--- | :--- |
| Asignar mal a gran escala | Un error de regla afecta a todo el periodo | Pruebas parametrizadas y escalamiento ante la duda |
| Datos desactualizados | El software o las PCs de un laboratorio cambian | Alertas al registrar el cambio |
| Falta de explicación | El alumno no sabe por qué quedó en un aula | Motivo de escalamiento explícito (R-10) y asignación determinista |
| Trato desigual | El orden de procesamiento favorece a unas secciones | Orden documentado y determinista (§2.4 del alcance) |
| Daño a personas vulnerables | Un alumno con movilidad reducida en un piso alto | Regla de accesibilidad con prioridad en Piso 1 |
| Privacidad | Datos de salud expuestos | Aislamiento en `FichaMedica` y nunca en consultas públicas (RNF-09) |
| Fallo del canal | Un aviso no llega | Planificado: reintentos y desvinculación ante bloqueo (issue #252) |

**Cómo se aplicó.** Es el análisis de esta tabla.

**Qué se podría mejorar.** Un mecanismo para que un alumno reporte que su aula es inaccesible, y revisar de forma periódica que el orden de procesamiento no perjudique siempre a las mismas secciones.

### 3.13. Trazabilidad de decisiones asistidas por IA — Parcial

**Definición.** Registrar qué decidió una IA o qué sugirió, con qué entrada, con qué modelo y versión, y qué hizo la persona después.

**Cómo se aplicó.** SAIE no tiene decisiones asistidas por IA, pero sí trazabilidad de sus decisiones automáticas (ver §2.5): ejecución, huella de entrada, motivo y estado.

**Qué se podría mejorar.** Si se adoptara la IA para incidencias, registrar el texto de entrada, el modelo y su versión, la sugerencia, la decisión final y quién la tomó.

---

## 4. Semanas 13–14: Pruebas automatizadas de software (12 temas)

### 4.1. Calidad en sistemas automatizados — Parcial

**Definición.** En un sistema que decide solo, un defecto se repite sin que nadie lo vea; por eso la calidad debe verificarse de forma automática y continua, con criterios de aceptación medibles (*quality gates*).

**Cómo se aplicó.** El Plan Maestro de Pruebas (`docs/plan_maestro_pruebas.md`) define los quality gates: cobertura ≥ 85 % y 0 bugs críticos en SonarCloud. El Plan de Ambiente Controlado (`docs/plan_ambiente_controlado.md`) define los entornos y los datos de prueba.

**Qué se podría mejorar.** **Los gates no se hacen cumplir** (hallazgo H3): no existe `sonar-project.properties`, Jest no tiene `coverageThreshold` y el CI no mide cobertura. Es el issue 5.10b y el 5.18, abiertos.

### 4.2. Automatización de pruebas — Aplicado

**Definición.** Ejecutar las pruebas con una herramienta, sin intervención manual, de forma repetible.

**Cómo se aplicó.** Las pruebas se ejecutan con `npm run test` y corren en cada pull request mediante `ci.yml`. Son 338 pruebas en 27 archivos en `develop`, y 393 en 29 archivos con el PR #246.

**Qué se podría mejorar.** Agregar la medición de cobertura al mismo comando y publicar el resultado como evidencia.

### 4.3. Pruebas unitarias — Aplicado

**Definición.** Verifican una unidad (función o módulo) de forma aislada, sin dependencias externas.

**Cómo se aplicó.** 25 archivos en `backend/tests/unit/`: 8 de reglas del motor, 13 de servicios y 4 de importadores. Usan `test.each` para cubrir los bordes de cada regla, repitiendo el caso para aulas y laboratorios.

**Qué se podría mejorar.** Los servicios con base de datos se prueban con Prisma simulado; no detectan errores de consultas reales (ver 4.5).

### 4.4. Pruebas funcionales — Parcial

**Definición.** Verifican que el sistema cumple una funcionalidad completa desde la perspectiva del usuario.

**Cómo se aplicó.** Las rutas se prueban con Supertest. Para este documento además se hizo una prueba manual contra una base real temporal: se importaron tres CSV y se encadenó la asignación.

**Qué se podría mejorar.** La única prueba E2E (`tests/e2e/home.spec.ts`) comprueba una plantilla de otro proyecto (hallazgo H1: "Sistema de Apoyo a la Integración Escolar" y portales de Familias y Profesional, que no existen en SAIE). Hay que reemplazarla por los flujos reales: consulta del alumno y panel de alertas (issue 5.9). Ese E2E tampoco está en el CI.

### 4.5. Pruebas de integración — Parcial

**Definición.** Verifican que varios módulos funcionan juntos, idealmente con dependencias reales (base de datos).

**Cómo se aplicó.** Cuatro archivos prueban rutas completas con Supertest: asignación a demanda, importación, rutas protegidas y health.

**Qué se podría mejorar.** Todas simulan Prisma; **ninguna prueba usa una base de datos real** (hallazgo H5), aunque el job de pruebas del CI levanta PostgreSQL. El Plan Maestro (§1.2) y el issue 5.7 piden pruebas contra PostgreSQL real del flujo completo.

### 4.6. Pruebas de APIs — Aplicado

**Definición.** Verifican contratos HTTP: rutas, métodos, autenticación, códigos de estado y formato de respuesta.

**Cómo se aplicó.** Comprueban que los endpoints protegidos exijan token (401), rechacen roles no permitidos (403), validen parámetros (400, 404) y respondan con el formato `{ success, data }` o `{ success: false, message }`. El PR #246 agrega 12 pruebas del endpoint de importación.

**Qué se podría mejorar.** No hay un contrato formal (OpenAPI) contra el cual validar; las pruebas del camino exitoso de los endpoints de estudiante y docente son más escasas que las de error.

### 4.7. Pruebas de reglas de negocio — Aplicado

**Definición.** Verifican que cada regla de negocio se cumple en sus casos normales y en sus bordes.

**Cómo se aplicó.** Es la suite más completa: capacidad real, contigüidad, disponibilidad, búsqueda de bloque, validación de software, accesibilidad, cercanía entre paralelas, escalamiento, orquestación y corrida batch, con casos para aulas y laboratorios (`backend/tests/unit/rules/`).

**Qué se podría mejorar.** Hay una discrepancia entre R-07 (cercanía al ascensor) y el código, que no la implementa (hallazgo H6); una prueba que fije el comportamiento esperado forzaría a resolverla.

### 4.8. Pruebas de eventos — Parcial

**Definición.** Verifican que un evento produce la reacción esperada y que los manejadores se comportan bien, incluso cuando fallan.

**Cómo se aplicó.** Se prueba la cadena de detección de alertas (`deteccionAlertas.test.ts`, `alerta.test.ts`, `laboratorio.test.ts`): un cambio de software o de PCs genera, o no, una alerta.

**Qué se podría mejorar.** Cuando exista el bus de eventos, probar la emisión, el aislamiento de errores de los manejadores y la emisión posterior a la confirmación de la transacción (issue 5.20).

### 4.9. Pruebas de excepciones — Aplicado

**Definición.** Verifican el comportamiento ante entradas inválidas, fallos y condiciones límite.

**Cómo se aplicó.** Cubren filas inválidas en importaciones, archivos vacíos o mal formados, tipos desconocidos, cuerpos demasiado grandes, conflicto por corrida en curso (409), falta de bloque (escalamiento), PCs malogradas mayores al aforo y que un error interno no filtre su detalle.

**Qué se podría mejorar.** Probar la caída de la base de datos y los tiempos de espera, que hoy solo se simulan con un error genérico.

### 4.10. Casos y datos de prueba — Parcial

**Definición.** Los casos describen qué se prueba; los datos son las entradas, que deben ser representativas, reproducibles y no personales.

**Cómo se aplicó.** Fixtures en memoria dentro de las pruebas, y un script de semilla (`backend/prisma/seed.ts`) que carga los 15 espacios del edificio y sus 18 relaciones de contigüidad.

**Qué se podría mejorar.** Falta el dataset de demostración con alumnos, docentes, secciones y matrículas (issue 5.17), y el volumen para las pruebas de carga.

### 4.11. Evidencias de ejecución — Parcial

**Definición.** Pruebas guardadas de que las pruebas se ejecutaron y su resultado (reportes, registros, capturas).

**Cómo se aplicó.** El historial de GitHub Actions conserva cada ejecución del CI.

**Qué se podría mejorar.** Archivar los reportes de cobertura, los de k6 y los de Playwright como artefactos del pipeline, y producir el Informe de Resumen de Pruebas (issue 5.14).

### 4.12. Introducción a frameworks de testing automatizado — Aplicado

**Definición.** Herramientas que estructuran, ejecutan y reportan pruebas.

| Herramienta | Uso en SAIE |
| :--- | :--- |
| **Jest + ts-jest** | Pruebas unitarias y parametrizadas en TypeScript |
| **Supertest** | Pruebas de rutas HTTP sin levantar un servidor |
| **Playwright** | Pruebas end-to-end (hoy solo una, de plantilla) |
| **k6** | Pruebas de carga (hoy solo un humo sobre `/health`) |

**Qué se podría mejorar.** La prueba de k6 no corresponde al requisito (hallazgo H4): RNF-01 pide 300 usuarios concurrentes sobre la consulta del estudiante, con p95 < 2 s; el script actual usa 10 usuarios durante 10 segundos sobre `/api/health`, con un umbral de 500 ms.

---

## 5. Semana 15: CI/CD y automatización del ciclo de vida del software (11 temas)

### 5.1. Automatización del desarrollo de software — Aplicado

**Definición.** Automatizar las tareas repetitivas del desarrollo: compilar, verificar estilo, probar, empaquetar y desplegar.

**Cómo se aplicó.** Scripts de npm para lint, formato, pruebas, compilación, generación del cliente de Prisma, migraciones y semilla; workflows de GitHub Actions que los ejecutan; plantilla de pull request con una lista de verificación.

**Qué se podría mejorar.** Agregar la verificación de dependencias vulnerables y actualizaciones automáticas (por ejemplo, Dependabot).

### 5.2. Control de versiones — Aplicado

**Definición.** Registrar la historia de los cambios del código para colaborar, revertir y auditar.

**Cómo se aplicó.** Git y GitHub con ramas por tarea (`feature/*`, `docs/*`, `bugfix/*`, `chore/*`), `develop` como rama de integración y `main` como rama estable; cambios integrados por pull request con revisión.

**Qué se podría mejorar.** Las líneas base del proyecto nunca se etiquetaron: no existe ningún tag `lb-*` (ver la solicitud de cambio, #247).

### 5.3. Git — Aplicado

**Definición.** Sistema de control de versiones distribuido.

**Cómo se aplicó.** Convención de ramas y de commits semánticos (`feat`, `fix`, `docs`, `test`, `chore`) en `docs/git-workflow.md`, seguida a lo largo de la historia del repositorio.

**Qué se podría mejorar.** Verificar el formato de los commits en el CI (RNF-10 lo menciona, pero no hay una verificación automática).

### 5.4. Integración continua (CI) — Aplicado

**Definición.** Integrar los cambios con frecuencia y verificar cada integración con un proceso automático de compilación y pruebas, para detectar errores pronto (Humble y Farley, 2010).

**Cómo se aplicó.** `ci.yml` se ejecuta en cada pull request hacia `develop` y `main` y en cada push a `main`. Tiene dos jobs: *Lint y formato* y *Pruebas unitarias y parametrizadas*, este último con un servicio de PostgreSQL 16.

**Qué se podría mejorar.** Agregar la compilación (H2), la medición de cobertura y SonarCloud (H3), y las pruebas E2E. Usar realmente la base de PostgreSQL que el job ya levanta (H5).

### 5.5. Entrega y despliegue continuo (CD) — Aplicado

**Definición.** *Entrega continua*: el software queda siempre en estado desplegable. *Despliegue continuo*: cada cambio que pasa las verificaciones se despliega automáticamente.

**Cómo se aplicó.** `cd.yml` se ejecuta al fusionar en `develop`: primero reutiliza el CI como puerta y solo si pasa despliega. Hay despliegue continuo a un entorno de demostración.

**Qué se podría mejorar.** Un entorno de *staging* separado de producción y una aprobación manual antes de producción.

### 5.6. Pipelines — Aplicado

**Definición.** Secuencia automatizada de etapas (verificar, probar, desplegar) por la que pasa cada cambio.

**Cómo se aplicó.** Dos workflows y tres jobs: *Lint y formato* y *Pruebas* (en paralelo) y *Despliegue*, que depende del CI (`needs: ci`). Un control de concurrencia evita dos despliegues y dos migraciones a la vez.

**Qué se podría mejorar.** Agregar etapas de compilación, cobertura, análisis estático y pruebas de humo posteriores al despliegue.

### 5.7. Automatización del build — Parcial

**Definición.** Compilar y empaquetar el software de forma automática y reproducible.

**Cómo se aplicó.** `npm run build` compila el backend (`tsc`) y construye el frontend. Render y Vercel compilan al desplegar.

**Qué se podría mejorar.** **El CI no ejecuta `npm run build`** (H2), aunque la plantilla de pull request lo exige. Un error de compilación que ts-jest no detecte llegaría hasta el despliegue. Debe agregarse un paso de compilación del backend y del frontend.

### 5.8. Ejecución automática de pruebas — Aplicado

**Definición.** Que cada cambio dispare las pruebas sin que nadie las lance.

**Cómo se aplicó.** El job de pruebas ejecuta `npm run test` en cada pull request y bloquea el despliegue si falla.

**Qué se podría mejorar.** Las pruebas E2E y de carga no se ejecutan en el CI. Las de carga podrían correr programadas o a demanda, no en cada pull request.

### 5.9. Despliegue automatizado — Aplicado

**Definición.** Llevar una versión a un entorno sin pasos manuales.

**Cómo se aplicó.** Al fusionar en `develop`: aplicar las migraciones de Prisma en Supabase por conexión directa, disparar el despliegue del backend en Render con un *deploy hook* y construir y desplegar el frontend en Vercel con la CLI, autenticada con secretos.

**Qué se podría mejorar.**
- Se usa `vercel@latest` sin fijar la versión (H9), lo que vuelve el despliegue no reproducible.
- No se verifica que el despliegue funcione: el *hook* de Render solo lo dispara. Falta una prueba de humo posterior sobre `/api/health`, que debe tolerar el arranque en frío de 45 a 60 segundos.
- No hay estrategia de reversión.
- Las migraciones corren antes que el nuevo backend; deben ser compatibles con la versión anterior.

### 5.10. Introducción a DevOps — Parcial

**Definición.** Conjunto de prácticas que unen desarrollo y operación mediante automatización, colaboración y retroalimentación, para entregar software con rapidez y fiabilidad.

**Cómo se aplicó.** Están las prácticas de entrega: control de versiones, CI/CD, infraestructura gestionada (Vercel, Render, Supabase) y secretos fuera del repositorio.

**Qué se podría mejorar.** Falta la mitad de la operación: monitoreo, alertas y métricas posteriores al despliegue (ver §2). El ciclo DevOps se cierra cuando lo que se observa en producción alimenta el desarrollo.

### 5.11. GitHub Actions u otras herramientas equivalentes — Aplicado

**Definición.** Plataforma de automatización integrada en GitHub, que ejecuta flujos de trabajo definidos en archivos YAML ante eventos del repositorio.

**Cómo se aplicó.** `.github/workflows/ci.yml` y `cd.yml`, con servicio de PostgreSQL, caché de dependencias, `workflow_call` para reutilizar el CI, control de concurrencia y secretos del repositorio. Está planificada una tarea programada con `schedule` para el resumen diario (issue #253).

**Qué se podría mejorar.** Fijar las versiones de las acciones por commit y limitar los permisos de cada job; hoy ya se declara `contents: read` a nivel de workflow.

---

## 6. Semana 16: Examen final — Solución funcional, pruebas y demostración

La evaluación pide una **solución funcional de Automatización y Control de Software**, con pruebas y demostración.

| Entregable | Estado | Qué se tiene | Qué falta (issues) |
| :--- | :---: | :--- | :--- |
| Solución funcional, backend | Aplicado | Motor, alertas, autenticación por rol, consulta, endpoints de alumno, docente e importación | Fusionar el PR #246; listar y resolver alertas (4.6 y 4.7); resolver incidencias (7.6); secciones escaladas (4.22) |
| Solución funcional, frontend | Pendiente | `Home.tsx`, que es una plantilla de otro proyecto | Las pantallas de los tres portales (épicas de estudiante, docente y panel) |
| Automatización con eventos y notificaciones | Planificado | Diseño y issues #249 a #255 | Construcción, sujeta a la aprobación de #247 |
| Pruebas | Parcial | 393 pruebas con el PR #246 y CI | Integración con base real (5.7), E2E (5.9), carga (5.8), SonarCloud (5.10b y 5.18), validación manual (5.15) |
| Datos de demostración | Pendiente | Semilla de 15 espacios | Dataset (5.17) |
| Informe de pruebas | Pendiente | — | Issue 5.14 |
| Demostración | Pendiente | — | Ensayo y lista previa (6.11), entrega final (6.12) y documentación final (6.9) |

**Orden sugerido de prioridades** (de mayor a menor impacto en la nota):
1. El frontend de las pantallas con backend ya listo.
2. Las correcciones de calidad más baratas: compilación en el CI (H2) y reemplazo de la plantilla de E2E y de la página de inicio (H1).
3. La prueba de carga del requisito real (H4) y SonarCloud con cobertura (H3).
4. El bus de eventos con la auditoría de alertas, y los avisos por Telegram.
5. Si se adopta, la clasificación de incidencias con IA.
