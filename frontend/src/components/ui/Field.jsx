import { cloneElement, forwardRef, isValidElement, useId } from 'react';

// Label above (sentence case), error below in signal-700 (spec 11 §6). The error is
// announced (role="alert") and linked to the control with aria-describedby.
function Message({ id, error, hint }) {
  if (error) return <p id={id} role="alert" className="mt-1 text-[13px] text-signal-700">{error}</p>;
  if (hint) return <p id={id} className="mt-1 text-2xs text-ink-600">{hint}</p>;
  return null;
}

const Required = () => <span className="text-ink-600" aria-hidden="true"> *</span>;

// Wraps a custom control. A single child element gets the id and aria wiring.
export function Field({ label, error, hint, required, children, className = '' }) {
  const id = useId();
  const msgId = `${id}-msg`;
  const described = error || hint ? msgId : undefined;
  // Only a bare DOM control (input/select/textarea) can take the label's id; a wrapper
  // (e.g. input + buttons in a div) keeps its own aria-label and gets a plain caption.
  const wire = isValidElement(children) && ['input', 'select', 'textarea'].includes(children.type);
  const child =
    wire
      ? cloneElement(children, {
          id: children.props.id || id,
          'aria-invalid': error ? true : children.props['aria-invalid'],
          'aria-describedby': described || children.props['aria-describedby'],
        })
      : children;
  return (
    <div className={className}>
      {label &&
        (wire ? (
          <label htmlFor={child.props.id} className="label">
            {label}
            {required && <Required />}
          </label>
        ) : (
          <span className="label">
            {label}
            {required && <Required />}
          </span>
        ))}
      {child}
      <Message id={msgId} error={error} hint={hint} />
    </div>
  );
}

export const Input = forwardRef(function Input({ label, error, hint, required, className = '', ...rest }, ref) {
  const id = useId();
  const msgId = `${id}-msg`;
  return (
    <div className={className}>
      {label && (
        <label htmlFor={id} className="label">
          {label}
          {required && <Required />}
        </label>
      )}
      <input
        id={id}
        ref={ref}
        required={required}
        aria-invalid={Boolean(error)}
        aria-describedby={error || hint ? msgId : undefined}
        className={`input ${error ? '!border-signal-700' : ''}`}
        {...rest}
      />
      <Message id={msgId} error={error} hint={hint} />
    </div>
  );
});

export const Select = forwardRef(function Select({ label, error, hint, required, className = '', children, ...rest }, ref) {
  const id = useId();
  const msgId = `${id}-msg`;
  return (
    <div className={className}>
      {label && (
        <label htmlFor={id} className="label">
          {label}
          {required && <Required />}
        </label>
      )}
      <select
        id={id}
        ref={ref}
        required={required}
        aria-invalid={Boolean(error)}
        aria-describedby={error || hint ? msgId : undefined}
        className={`input appearance-none pr-8 ${error ? '!border-signal-700' : ''}`}
        {...rest}
      >
        {children}
      </select>
      <Message id={msgId} error={error} hint={hint} />
    </div>
  );
});
