import { forwardRef, useId } from 'react';

// Label + control + hint/error, wired with aria attributes.
export function Field({ label, error, hint, required, children, className = '' }) {
  return (
    <div className={className}>
      {label && (
        <span className="label">
          {label}
          {required && <span className="text-red-500"> *</span>}
        </span>
      )}
      {children}
      {error ? (
        <p role="alert" className="mt-1 text-xs text-red-600">{error}</p>
      ) : (
        hint && <p className="mt-1 text-xs text-navy-400">{hint}</p>
      )}
    </div>
  );
}

export const Input = forwardRef(function Input({ label, error, hint, required, className = '', ...rest }, ref) {
  const id = useId();
  return (
    <div className={className}>
      {label && (
        <label htmlFor={id} className="label">
          {label}
          {required && <span className="text-red-500"> *</span>}
        </label>
      )}
      <input
        id={id}
        ref={ref}
        required={required}
        aria-invalid={Boolean(error)}
        className={`input ${error ? '!border-red-400' : ''}`}
        {...rest}
      />
      {error ? (
        <p role="alert" className="mt-1 text-xs text-red-600">{error}</p>
      ) : (
        hint && <p className="mt-1 text-xs text-navy-400">{hint}</p>
      )}
    </div>
  );
});

export const Select = forwardRef(function Select({ label, error, required, className = '', children, ...rest }, ref) {
  const id = useId();
  return (
    <div className={className}>
      {label && (
        <label htmlFor={id} className="label">
          {label}
          {required && <span className="text-red-500"> *</span>}
        </label>
      )}
      <select id={id} ref={ref} className={`input appearance-none pr-8 ${error ? '!border-red-400' : ''}`} {...rest}>
        {children}
      </select>
      {error && <p role="alert" className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
});
