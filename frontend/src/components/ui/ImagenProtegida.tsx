import React, { useEffect, useState } from 'react';

export interface ImagenProtegidaProps {
  /** Pide la imagen con el token de la sesión (por eso no basta un `src`). */
  cargar: () => Promise<Blob>;
  alt: string;
  className?: string;
}

/**
 * Issue 7.19: muestra una imagen que el backend solo entrega con autenticación. La descarga como
 * `Blob`, la muestra con una URL local y la libera al desmontarse.
 */
export const ImagenProtegida: React.FC<ImagenProtegidaProps> = ({
  cargar,
  alt,
  className = '',
}) => {
  const [url, setUrl] = useState<string | null>(null);
  const [fallo, setFallo] = useState(false);

  useEffect(() => {
    let activa = true;
    let creada: string | null = null;
    cargar()
      .then((blob) => {
        if (!activa) return;
        creada = URL.createObjectURL(blob);
        setUrl(creada);
      })
      .catch(() => {
        if (activa) setFallo(true);
      });
    return () => {
      activa = false;
      if (creada) URL.revokeObjectURL(creada);
    };
  }, [cargar]);

  if (fallo) return <p className="m-0 text-sm text-saie-muted">No se pudo cargar la foto.</p>;
  if (!url) {
    return <div aria-hidden="true" className="saie-esqueleto h-40 w-full rounded-lg" />;
  }
  return (
    <a href={url} target="_blank" rel="noopener noreferrer" className="block">
      <img
        src={url}
        alt={alt}
        className={`max-h-80 w-full rounded-lg border border-saie-divider object-contain ${className}`}
      />
    </a>
  );
};

export default ImagenProtegida;
