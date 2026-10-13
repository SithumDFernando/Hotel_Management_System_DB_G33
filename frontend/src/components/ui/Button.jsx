import { forwardRef } from 'react';
import { Link } from 'react-router-dom';
import Spinner from './Spinner';

// Spec 11 §6: label the button with the verb that happens. `danger` only inside a confirm dialog.
const VARIANTS = {
  primary: 'bg-tea-700 text-white hover:bg-tea-900',
  secondary: 'border border-ink-100 bg-paper-50 text-ink-900 hover:bg-paper-200',
  ghost: 'text-tea-700 hover:bg-tea-100',
  danger: 'bg-signal-700 text-white hover:brightness-95',
};
const SIZES = {
  sm: 'h-8 px-3 text-[13px] gap-1.5',
  md: 'h-9 px-4 text-sm gap-2',
  lg: 'h-11 px-5 text-[15px] gap-2',
};

// Renders <Link> when `to` is given, otherwise <button>.
const Button = forwardRef(function Button(
  { variant = 'primary', size = 'md', loading = false, to, className = '', children, disabled, type = 'button', ...rest },
  ref,
) {
  const cls = `inline-flex items-center justify-center whitespace-nowrap rounded-md font-medium transition-colors duration-150 disabled:cursor-not-allowed disabled:opacity-50 ${VARIANTS[variant] || VARIANTS.primary} ${SIZES[size]} ${className}`;
  if (to) {
    return (
      <Link ref={ref} to={to} className={cls} {...rest}>
        {children}
      </Link>
    );
  }
  return (
    <button ref={ref} type={type} className={cls} disabled={disabled || loading} aria-busy={loading || undefined} {...rest}>
      {loading && <Spinner className="h-4 w-4 text-current" />}
      {children}
    </button>
  );
});

export default Button;
