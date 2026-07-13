import Spinner from './Spinner'

export default function Button({
  children, variant = 'primary', size = 'md',
  loading = false, disabled = false, className = '', ...props
}) {
  const variants = {
    primary:   'btn-primary',
    secondary: 'btn-secondary',
    danger:    'btn-danger',
    ghost:     'text-slate-600 hover:bg-slate-100 px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2',
    orange:    'bg-brand-orange text-white hover:bg-brand-orange-hover px-4 py-2 rounded-lg font-semibold text-sm transition-all flex items-center gap-2',
  }
  const sizes = { sm: 'text-xs px-3 py-1.5', md: '', lg: 'text-base px-5 py-2.5' }

  return (
    <button
      disabled={disabled || loading}
      className={`${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      {loading && <Spinner size="sm" />}
      {children}
    </button>
  )
}
