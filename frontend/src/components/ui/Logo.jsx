import mark from '@/assets/skynest-mark.svg';

// One-colour mark (same paths as src/assets/skynest-mark-mono.svg), inlined so it can use currentColor.
function MonoMark({ className }) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden="true" focusable="false">
      <defs>
        <clipPath id="skynest-mono-clip"><circle cx="32" cy="32" r="31" /></clipPath>
      </defs>
      <g fill="currentColor">
        <path d="M12.5 20.6C19 16.6 26.5 16.2 33.6 21C40.5 16.8 47.5 15.4 54.8 16.7C47 18.4 40.2 21.8 34 26.8C28.4 21.3 20.8 19.4 12.5 20.6Z" />
        <path d="M12 48.4C21.5 46.2 33.5 48.8 45 53.6C33.5 57.8 20.5 55.6 12 48.4Z" />
      </g>
      <g fill="none" stroke="currentColor" strokeWidth="3.1" clipPath="url(#skynest-mono-clip)">
        <path d="M2 38.5C12 33 23.5 32.6 33 36.6C42 40.4 50.5 42.4 62 39.6" />
        <path d="M24 34.2C28 34.7 31.2 35 35 33.6C41.5 31.2 50 29.6 63 33.4" />
        <path strokeLinecap="round" d="M2 44.8C13 39.6 24.5 41 34 45C42.5 48.6 50.5 48.6 58.5 44.4" />
      </g>
    </svg>
  );
}

const SIZES = { sm: 'h-7 w-7', md: 'h-8 w-8', lg: 'h-12 w-12' };

// variant: 'mark' (emblem only) | 'full' (emblem + wordmark)
// tone: 'default' (ink on paper) | 'inverse' (paper on ink, footer)
// size: 'sm' 28px (footer) | 'md' 32px (navbar) | 'lg' 48px (sign-in pages)
export default function Logo({ variant = 'full', tone = 'default', size = 'md', className = '' }) {
  const full = variant === 'full';
  const box = SIZES[size] || SIZES.md;
  const inverse = tone === 'inverse';

  const emblem = inverse ? (
    <MonoMark className={`${box} shrink-0 text-paper-100`} />
  ) : (
    <img src={mark} alt={full ? '' : 'SkyNest'} className={`${box} shrink-0`} />
  );

  if (!full) {
    return inverse ? (
      <span role="img" aria-label="SkyNest" className={`inline-flex ${className}`}>{emblem}</span>
    ) : (
      <span className={`inline-flex ${className}`}>{emblem}</span>
    );
  }

  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      {emblem}
      <span
        className={`font-display font-semibold leading-none ${size === 'lg' ? 'text-[28px]' : 'text-xl'} ${
          inverse ? 'text-paper-100' : 'text-ink-900'
        }`}
      >
        SkyNest
      </span>
    </span>
  );
}
