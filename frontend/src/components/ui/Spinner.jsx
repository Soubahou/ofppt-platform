export default function Spinner({ size = 'md', className = '' }) {
  const sizes = { sm: 'w-4 h-4', md: 'w-6 h-6', lg: 'w-10 h-10' }
  return (
    <div
      className={`inline-block rounded-full border-2 border-slate-300 border-t-brand-blue animate-spin ${sizes[size]} ${className}`}
      role="status"
      aria-label="Chargement..."
    />
  )
}
