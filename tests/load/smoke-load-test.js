// Script de prueba de carga con k6 para SAIE API
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  vus: 10,
  duration: '10s',
  thresholds: {
    http_req_duration: ['p(95)<500'], // El 95% de las peticiones debe responder en < 500ms
    http_req_failed: ['rate<0.01'],    // Tasa de fallos menor al 1%
  },
};

export default function () {
  const url = __ENV.API_URL || 'http://localhost:3000/api/health';
  const res = http.get(url);

  check(res, {
    'código de respuesta es 200': (r) => r.status === 200,
    'estado retornado es ok': (r) => {
      try {
        return JSON.parse(r.body).status === 'ok';
      } catch (e) {
        return false;
      }
    },
  });

  sleep(1);
}
