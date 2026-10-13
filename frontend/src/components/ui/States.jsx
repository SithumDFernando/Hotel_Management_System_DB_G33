import Icon from './Icon';
import Button from './Button';

// Every data view designs loading, empty, error and populated (spec 11 §6).

export function Skeleton({ className = 'h-4 w-full' }) {
  return <div className={`skeleton ${className}`} aria-hidden="true" />;
}

// No icon circle: say what is empty and what to do next (pass `action` or a `message`).
// `icon` is still accepted from older callers and ignored; the page tasks drop it.
export function EmptyState({ title, message, action }) {
  return (
    <div className="rounded-lg border border-dashed border-ink-100 bg-paper-50 px-6 py-10 text-center">
      <h3 className="text-base font-semibold text-ink-900">{title}</h3>
      {message && <p className="mx-auto mt-1 max-w-sm text-sm text-ink-600">{message}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function ErrorState({ message, onRetry }) {
  return (
    <div role="alert" className="rounded-lg border border-signal-700/20 bg-signal-100 px-6 py-8 text-center text-ink-900">
      <p className="text-sm font-medium text-signal-700">{message || "Couldn't load this list."}</p>
      {onRetry && (
        <Button variant="secondary" size="sm" className="mt-4" onClick={onRetry}>
          <Icon name="refresh" className="h-3.5 w-3.5" /> Retry
        </Button>
      )}
    </div>
  );
}

// tone: 'error' (signal, problems) | 'info' (neutral note). Spec 11 has no warn/success tones.
export function InlineAlert({ tone = 'error', children }) {
  const error = tone === 'error';
  return (
    <div
      role={error ? 'alert' : 'status'}
      className={`flex items-start gap-2 rounded-md border px-4 py-3 text-sm ${
        error ? 'border-signal-700/20 bg-signal-100 text-signal-700' : 'border-ink-100 bg-paper-200 text-ink-900'
      }`}
    >
      <Icon name={error ? 'alert' : 'info'} className={`mt-0.5 h-4 w-4 shrink-0 ${error ? '' : 'text-ink-600'}`} />
      <div>{children}</div>
    </div>
  );
}
