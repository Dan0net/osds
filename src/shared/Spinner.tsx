export function Spinner({ size = 'md', className = '' }) {
  const sizes = {
    sm: 'w-4 h-4 border-2',
    md: 'w-8 h-8 border-4',
    lg: 'w-12 h-12 border-4',
  }
  return (
    <div
      role="status"
      aria-label="Loading"
      className={`inline-block ${sizes[size]} border-indigo-600 border-t-transparent rounded-full animate-spin ${className}`}
    />
  )
}

export function PageSpinner() {
  return (
    <div className="flex items-center justify-center py-16">
      <Spinner size="lg" />
    </div>
  )
}
