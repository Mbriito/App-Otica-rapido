import React, { useEffect, useState } from 'react';
import { Glasses } from 'lucide-react';

interface OpticalImageProps {
  src?: string;
  alt: string;
  className?: string;
  fallbackClassName?: string;
  fallbackLabel?: string;
  fallbackSublabel?: string;
  variant?: 'card' | 'banner' | 'thumb' | 'modal';
  loading?: 'lazy' | 'eager';
}

export default function OpticalImage({
  src,
  alt,
  className = '',
  fallbackClassName = '',
  fallbackLabel,
  fallbackSublabel,
  variant = 'card',
  loading = 'lazy',
}: OpticalImageProps) {
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    setHasError(false);
  }, [src]);

  const trimmedSrc = src?.trim() || '';

  if (!trimmedSrc || hasError) {
    if (variant === 'banner') {
      return (
        <div
          role="img"
          aria-label={alt}
          className={`bg-gradient-to-br from-sapphire-950 via-sapphire-900 to-slate-900 flex items-center justify-end pr-12 ${fallbackClassName || className}`}
        >
          <Glasses className="h-24 w-24 text-gold-400/20" />
        </div>
      );
    }

    if (variant === 'thumb') {
      return (
        <div
          role="img"
          aria-label={alt}
          className={`bg-gradient-to-br from-slate-100 via-slate-50 to-amber-50/50 border border-slate-200 flex flex-col items-center justify-center text-slate-400 p-1.5 text-center ${fallbackClassName || className}`}
        >
          <Glasses className="h-5 w-5 text-gold-600/70" />
          <span className="text-[9px] font-mono uppercase tracking-wider text-slate-500 mt-0.5 leading-none">
            Ótica
          </span>
        </div>
      );
    }

    return (
      <div
        role="img"
        aria-label={alt}
        className={`w-full h-full bg-gradient-to-br from-slate-100 via-slate-50 to-amber-50/40 flex flex-col items-center justify-center p-6 text-center select-none ${fallbackClassName || className}`}
      >
        <div className="w-14 h-14 rounded-2xl bg-white/90 border border-slate-200/80 shadow-xs flex items-center justify-center mb-3">
          <Glasses className="h-7 w-7 text-gold-600" />
        </div>
        <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-slate-500">
          {fallbackLabel || 'Ótica Rapido'}
        </span>
        {fallbackSublabel && (
          <span className="font-sans text-xs font-semibold text-slate-700 mt-1 line-clamp-2 max-w-[220px]">
            {fallbackSublabel}
          </span>
        )}
      </div>
    );
  }

  return (
    <img
      src={trimmedSrc}
      alt={alt}
      loading={loading}
      decoding="async"
      referrerPolicy="no-referrer"
      onError={() => setHasError(true)}
      className={className}
    />
  );
}
