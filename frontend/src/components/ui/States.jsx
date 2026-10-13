import Icon from './Icon';
import Button from './Button';

export function Skeleton({ className = 'h-4 w-full' }) {
  return <div className={`skeleton ${className}`} aria-hidden="true" />;
}

export function EmptyState({ icon = 'search', title, message, action }) {
  return (
    <div className="flex flex-col items-center rounded-2xl border border-dashed border-navy-200 bg-white px-6 py-14 text-center">
      <span className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-navy-50 text-navy-400">
        <Icon name={icon} className="h-6 w-6" />
      </span>
      <h3 className="font-serif text-lg font-semibold">{title}</h3>
      {message && <p className="mt-1 max-w-sm text-sm text-navy-500">{message}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function ErrorState({ message, onRetry }) {
  return (
    <div role="alert" className="flex flex-col items-center rounded-2xl border border-red-200 bg-red-50 px-6 py-10 text-center">
      <Icon name="alert" className="mb-2 h-6 w-6 text-red-600" />
      <p className="text-sm font-medium text-red-800">{message || 'Failed to load data.'}</p>
      {onRetry && (
        <Button variant="dangerOutline" size="sm" className="mt-4" onClick={onRetry}>
          <Icon name="refresh" className="h-3.5 w-3.5" /> Try again
        </Button>
      )}
    </div>
  );
}

export function InlineAlert({ tone = 'error', children }) {
  const style =
    tone === 'error'
      ? 'border-red-200 bg-red-50 text-red-800'
      : tone === 'warn'
        ? 'border-gold-200 bg-gold-50 text-gold-800'
        : 'border-emerald-200 bg-emerald-50 text-emerald-800';
  return (
    <div role={tone === 'error' ? 'alert' : 'status'} className={`flex items-start gap-2 rounded-xl border px-4 py-3 text-sm ${style}`}>
      <Icon name={tone === 'success' ? 'check' : 'alert'} className="mt-0.5 h-4 w-4 shrink-0" />
      <div>{children}</div>
    </div>
  );
}
