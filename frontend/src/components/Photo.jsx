import { useState } from 'react';
import { FALLBACK_GRADIENT } from '@/lib/media';

const ASPECTS = { '4/3': 'aspect-[4/3]', '3/2': 'aspect-[3/2]', '16/9': 'aspect-video' };

// <img> with a flat fallback so a blocked/missing photo never looks broken.
// aspect: '4/3' | '3/2' | '16/9' (or size it with className). eager: skip lazy-loading
// for the one above-the-fold photo. No overlays or text on top (spec 11 §7.1).
export default function Photo({ src, alt = '', aspect, eager = false, className = '', children }) {
  const [failed, setFailed] = useState(false);
  return (
    <div
      className={`relative overflow-hidden bg-paper-200 ${ASPECTS[aspect] || ''} ${className}`}
      style={failed ? { background: FALLBACK_GRADIENT } : undefined}
    >
      {!failed && (
        <img
          src={src}
          alt={alt}
          loading={eager ? 'eager' : 'lazy'}
          decoding="async"
          onError={() => setFailed(true)}
          className="absolute inset-0 h-full w-full object-cover"
        />
      )}
      {children}
    </div>
  );
}
