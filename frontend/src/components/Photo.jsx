import { useState } from 'react';
import { FALLBACK_GRADIENT } from '@/lib/media';

// <img> with a gradient fallback so a blocked/missing photo never looks broken.
export default function Photo({ src, alt = '', className = '', children }) {
  const [failed, setFailed] = useState(false);
  return (
    <div className={`relative overflow-hidden ${className}`} style={failed ? { background: FALLBACK_GRADIENT } : undefined}>
      {!failed && (
        <img
          src={src}
          alt={alt}
          loading="lazy"
          onError={() => setFailed(true)}
          className="absolute inset-0 h-full w-full object-cover"
        />
      )}
      {children}
    </div>
  );
}
