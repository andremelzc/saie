import React, { useEffect, useState, useCallback } from 'react';
import api from '../services/api';

interface HealthData {
  status: string;
  service: string;
  timestamp: string;
  environment: string;
}

export const Home: React.FC = () => {
  const [health, setHealth] = useState<HealthData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchHealth = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.get<HealthData>('/health');
      setHealth(response.data);
    } catch {
      setError('No se pudo conectar con el servidor backend (puerto 3000).');
      setHealth(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let isMounted = true;

    api
      .get<HealthData>('/health')
      .then((res) => {
        if (isMounted) {
          setHealth(res.data);
          setError(null);
        }
      })
      .catch(() => {
        if (isMounted) {
          setError('No se pudo conectar con el servidor backend (puerto 3000).');
          setHealth(null);
        }
      })
      .finally(() => {
        if (isMounted) {
          setLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const roles = [
    {
      title: 'Portal Directivo / Admin',
      description: 'Gestión integral de usuarios, matrículas, auditoría y configuración general.',
      badge: 'ADMIN',
      badgeColor: 'bg-purple-100 text-purple-800 border-purple-200',
    },
    {
      title: 'Portal Docente',
      description: 'Seguimiento de alumnos, registro de observaciones y adecuaciones curriculares.',
      badge: 'DOCENTE',
      badgeColor: 'bg-blue-100 text-blue-800 border-blue-200',
    },
    {
      title: 'Portal Profesional',
      description:
        'Planes de apoyo individualizados (PAI), informes fonoaudiológicos y psicopedagógicos.',
      badge: 'PROFESIONAL',
      badgeColor: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    },
    {
      title: 'Portal Familias',
      description: 'Canal de comunicación, avances del estudiante y firmas de consentimientos.',
      badge: 'FAMILIA',
      badgeColor: 'bg-amber-100 text-amber-800 border-amber-200',
    },
  ];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-6 py-4 shadow-xs sticky top-0 z-10">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-blue-500 flex items-center justify-center text-white font-bold text-lg shadow-sm">
              S
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900 tracking-tight">SAIE</h1>
              <p className="text-xs text-slate-500">Sistema de Apoyo a la Integración Escolar</p>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-50 text-indigo-700 border border-indigo-200">
              Sprint 0 • Base Stack
            </span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-6 py-8 space-y-8">
        {/* Hero Section */}
        <section className="bg-gradient-to-br from-indigo-900 via-indigo-800 to-blue-900 rounded-2xl text-white p-8 md:p-10 shadow-lg relative overflow-hidden">
          <div className="relative z-10 max-w-2xl space-y-4">
            <h2 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
              Plataforma de Integración y Acompañamiento Escolar
            </h2>
            <p className="text-indigo-100 text-base leading-relaxed">
              Entorno de desarrollo unificado configurado con React, Express, Prisma ORM,
              PostgreSQL, TailwindCSS y suites de pruebas automatizadas.
            </p>
          </div>
        </section>

        {/* Backend Connectivity Status Widget */}
        <section className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h3 className="text-base font-semibold text-slate-900 flex items-center gap-2">
                <span>Estado de Conectividad con la API</span>
                {loading ? (
                  <span className="inline-block h-3 w-3 animate-ping rounded-full bg-blue-400" />
                ) : health ? (
                  <span className="inline-block h-3 w-3 rounded-full bg-emerald-500" />
                ) : (
                  <span className="inline-block h-3 w-3 rounded-full bg-rose-500" />
                )}
              </h3>
              <p className="text-sm text-slate-500 mt-1">
                Verificación del endpoint HTTP{' '}
                <code className="bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded text-xs">
                  GET /api/health
                </code>
              </p>
            </div>
            <button
              onClick={fetchHealth}
              disabled={loading}
              className="inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-hidden disabled:opacity-50 transition-colors shadow-xs"
            >
              {loading ? 'Consultando...' : 'Reverificar Conexión'}
            </button>
          </div>

          <div className="mt-4 pt-4 border-t border-slate-100">
            {health ? (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <span className="text-slate-400 text-xs uppercase block">Estado</span>
                  <span className="font-semibold text-emerald-600 uppercase">{health.status}</span>
                </div>
                <div>
                  <span className="text-slate-400 text-xs uppercase block">Servicio</span>
                  <span className="font-medium text-slate-700">{health.service}</span>
                </div>
                <div>
                  <span className="text-slate-400 text-xs uppercase block">Entorno</span>
                  <span className="font-medium text-slate-700">{health.environment}</span>
                </div>
                <div>
                  <span className="text-slate-400 text-xs uppercase block">Timestamp</span>
                  <span className="font-mono text-xs text-slate-600 truncate block">
                    {new Date(health.timestamp).toLocaleTimeString()}
                  </span>
                </div>
              </div>
            ) : error ? (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-sm text-rose-700">
                {error} Para iniciar el backend, ejecuta:{' '}
                <code className="font-mono bg-rose-100 px-1 py-0.5 rounded text-xs">
                  npm run dev:backend
                </code>
              </div>
            ) : (
              <p className="text-sm text-slate-400 italic">Consultando estado...</p>
            )}
          </div>
        </section>

        {/* Portales / Roles Cards */}
        <section className="space-y-4">
          <h3 className="text-lg font-bold text-slate-900">Portales del Sistema</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {roles.map((r, i) => (
              <div
                key={i}
                className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs hover:shadow-md transition-shadow flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${r.badgeColor}`}
                    >
                      {r.badge}
                    </span>
                  </div>
                  <h4 className="font-semibold text-slate-900 text-base mb-1">{r.title}</h4>
                  <p className="text-xs text-slate-500 leading-relaxed">{r.description}</p>
                </div>
                <div className="mt-4 pt-3 border-t border-slate-100 text-xs text-indigo-600 font-medium flex items-center justify-between">
                  <span>Próximamente</span>
                  <span>&rarr;</span>
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 px-6 py-4 mt-auto">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between text-xs text-slate-400 gap-2">
          <span>SAIE &copy; {new Date().getFullYear()} - Arquitectura Base Monorepo</span>
          <span>Node.js v24 • React 19 • Express • Prisma • TailwindCSS</span>
        </div>
      </footer>
    </div>
  );
};

export default Home;
