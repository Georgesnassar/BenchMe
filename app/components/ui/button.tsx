interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  loading?: boolean
}

export function Button({ loading, children, disabled, className, ...props }: ButtonProps) {
  return (
    <button
      disabled={disabled || loading}
      {...props}
      className={`w-full py-2 px-4 bg-foreground text-background font-medium rounded-lg hover:opacity-80 disabled:opacity-40 transition-opacity ${className ?? ''}`}
    >
      {loading ? 'Please wait…' : children}
    </button>
  )
}
