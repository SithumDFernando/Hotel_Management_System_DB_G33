import { forwardRef } from 'react';
import { Link } from 'react-router-dom';
import Spinner from './Spinner';

const VARIANTS = {
  primary: 'bg-gold-700 text-white hover:bg-gold-800 shadow-sm',
  dark: 'bg-navy-900 text-white hover:bg-navy-700 shadow-sm',
  gold: 'bg-gold-300 text-navy-900 hover:bg-gold-400',
  outline: 'border border-navy-200 bg-white text-navy-900 hover:bg-navy-50',
  ghost: 'text-navy-700 hover:bg-navy-100',
  danger: 'bg-red-600 text-white hover:bg-red-700',
  dangerOutline: 'border border-red-200 bg-white text-red-700 hover:bg-red-50',
};
const SIZES = {
  sm: 'px-3 py-1.5 text-xs gap-1.5',
  md: 'px-4 py-2.5 text-sm gap-2',
  lg: 'px-6 py-3 text-sm gap-2',
};

// Renders <Link> when `to` is given, otherwise <button>.
const Button = forwardRef(function Button(
  { variant = 'primary', size = 'md', loading = false, to, className = '', children, disabled, type = 'button', ...rest },
  ref,
) {
  const cls = `inline-flex items-center justify-center rounded-xl font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 ${VARIANTS[variant]} ${SIZES[size]} ${className}`;
  if (to) {
    return (
      <Link ref={ref} to={to} className={cls} {...rest}>
        {children}
      </Link>
    );
  }
  return (
    <button ref={ref} type={type} className={cls} disabled={disabled || loading} {...rest}>
      {loading && <Spinner className="h-4 w-4 text-current" />}
      {children}
    </button>
  );
});

export default Button;
