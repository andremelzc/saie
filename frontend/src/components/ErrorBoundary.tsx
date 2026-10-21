import React from 'react';
import { Boton } from './ui/Boton';

interface EstadoErrorBoundary {
  huboError: boolean;
}

/**
 * Red de seguridad de toda la app: si una pantalla lanza una excepción al dibujarse (por ejemplo,
 * un dato inesperado del backend), React desmontaría el árbol y la página quedaría en blanco.
 * Aquí se muestra un mensaje con salidas claras y el detalle queda en la consola.
 *
 * Es un componente de clase porque React no ofrece todavía un equivalente con hooks.
 */
export class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  EstadoErrorBoundary
> {
  state: EstadoErrorBoundary = { huboError: false };

  static getDerivedStateFromError(): EstadoErrorBoundary {
    return { huboError: true };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo): void {
    console.error('Error al dibujar la pantalla:', error, info.componentStack);
  }

  render(): React.ReactNode {
    if (!this.state.huboError) return this.props.children;

    return (
      <main
        id="contenido"
        className="flex min-h-screen flex-col items-center justify-center bg-saie-canvas px-4 py-8 text-saie-text"
      >
        <div className="flex w-full max-w-md flex-col gap-4 rounded-2xl border border-saie-divider bg-white p-6 text-center shadow-saie-card sm:p-8">
          <h1 className="m-0 text-2xl font-bold tracking-tight">Algo salió mal</h1>
          <p role="alert" className="m-0 text-base">
            No pudimos mostrar esta pantalla. Tus datos no se perdieron.
          </p>
          <p className="m-0 text-sm text-saie-muted">
            Recarga la página para intentarlo de nuevo. Si el problema continúa, avisa a
            Coordinación Académica.
          </p>
          <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
            <Boton onClick={() => window.location.reload()}>Recargar la página</Boton>
            <Boton variante="secundario" onClick={() => window.location.assign('/')}>
              Ir al inicio
            </Boton>
          </div>
        </div>
      </main>
    );
  }
}

export default ErrorBoundary;
