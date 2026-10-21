// ============================================================================
// SAIE — Sistema de Asignación Inteligente de Espacios
// Prueba de Carga k6: Simulación del Pico de Tráfico del Primer Día de Clases
// Issue #180 (5.8) | Requisito No Funcional RNF-01 | Spec 06 (§2.3)
// ============================================================================

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Trend, Rate } from 'k6/metrics';

// Métricas personalizadas según el Plan Maestro de Pruebas (§2.1 y §2.2)
const latenciaConsulta = new Trend('latencia_consulta_p95');
const tasaError = new Rate('tasa_error');

// Configuración de ejecución y calibración de volumen
// IMPORTANTE: Por mandato del Issue 5.8 y RNF-01, esta prueba se ejecuta contra
// un entorno local o de CI, NUNCA contra la instancia gratuita desplegada (Render/Supabase)
// para evitar distorsiones por cold-start o suspensiones por inactividad.
const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';
const TARGET_VUS = Number(__ENV.TARGET_VUS) || 300;
const ES_RAPIDO = __ENV.FAST_TEST === '1';

export const options = {
  scenarios: {
    pico_primer_dia: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: ES_RAPIDO
        ? [
            { duration: '5s', target: Math.min(TARGET_VUS, 20) }, // subida rápida
            { duration: '10s', target: Math.min(TARGET_VUS, 20) }, // sostenido
            { duration: '5s', target: 0 },                         // bajada rápida
          ]
        : [
            { duration: '1m', target: Math.floor(TARGET_VUS * 0.33) }, // rampa de subida (100 VUs)
            { duration: '3m', target: TARGET_VUS },                    // pico sostenido (300 VUs)
            { duration: '1m', target: 0 },                             // rampa de bajada
          ],
      gracefulRampDown: '30s',
    },
  },
  thresholds: {
    // Latencia p95 < 2000 ms a 300 VUs concurrentes (RNF-01 y DoD Spec 06 §2.3)
    'http_req_duration{scenario:pico_primer_dia}': ['p(95)<2000'],
    latencia_consulta_p95: ['p(95)<2000'],
    // Tasa de error < 1% (excluyendo 404 controlados de código no existente)
    tasa_error: ['rate<0.01'],
    http_req_failed: ['rate<0.01'],
  },
};

// Dataset de consulta derivado del seed (Issue 5.17) y casos controlados
const CODIGOS_ALUMNOS = [
  '20200001',
  '20200002',
  '20200003',
  '20210001',
  '20210002',
  '20220001',
  '20230001',
  '20240001',
  '99999999', // Caso controlado: Alumno inexistente (debe retornar 404)
];

const CODIGOS_CURSOS = [
  'CC-101',
  'CC-102',
  'CC-201',
  'MAT-101',
  'FIS-101',
  'SI-101',
  'NO-EXISTE', // Caso controlado: Curso inexistente (debe retornar 404)
];

export default function () {
  // Ponderación de tráfico: 75% consulta por alumno, 25% consulta por curso
  const esConsultaAlumno = Math.random() < 0.75;

  let url;
  let tipoEtiqueta;

  if (esConsultaAlumno) {
    const codigo = CODIGOS_ALUMNOS[Math.floor(Math.random() * CODIGOS_ALUMNOS.length)];
    url = `${BASE_URL}/api/v1/consulta/alumno/${encodeURIComponent(codigo)}`;
    tipoEtiqueta = 'consulta_alumno';
  } else {
    const codigo = CODIGOS_CURSOS[Math.floor(Math.random() * CODIGOS_CURSOS.length)];
    url = `${BASE_URL}/api/v1/consulta/curso/${encodeURIComponent(codigo)}`;
    tipoEtiqueta = 'consulta_curso';
  }

  const res = http.get(url, {
    tags: { name: tipoEtiqueta },
    headers: {
      Accept: 'application/json',
      'User-Agent': 'k6-load-test-saie/1.0',
    },
  });

  // Validaciones de aceptación:
  // - 200 (OK con asignaciones o lista)
  // - 404 controlado (código inexistente según RF-10, no se considera caída de servicio)
  const esRespuestaValida = check(res, {
    'código HTTP es 200 o 404 controlado': (r) => r.status === 200 || r.status === 404,
    'contenido de respuesta no está vacío': (r) => r.body && r.body.length > 0,
    'cabecera Content-Type es JSON': (r) =>
      r.headers['Content-Type'] && r.headers['Content-Type'].includes('application/json'),
    'tiempo de respuesta es menor a 2000 ms': (r) => r.timings.duration < 2000,
  });

  // Si ocurre un error 5xx o una caída de conexión, se registra en tasaError
  const huboFalloServidor = !esRespuestaValida || res.status >= 500;
  tasaError.add(huboFalloServidor);
  latenciaConsulta.add(res.timings.duration);

  // Intervalo de pensamiento aleatorio entre 1 y 2 segundos para simular comportamiento humano
  sleep(Math.random() * 1 + 1);
}
