import { forwardRef } from 'react'

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string
  error?: string
  suffix?: React.ReactNode
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, id, suffix, className, ...props }, ref) => {
    const inputId = id ?? label.toLowerCase().replace(/\s+/g, '-')
    return (
      <div className="space-y-1.5">
        <label htmlFor={inputId} className="block text-sm font-medium">
          {label}
        </label>
        <div className="relative">
          <input
            ref={ref}
            id={inputId}
            aria-describedby={error ? `${inputId}-error` : undefined}
            aria-invalid={!!error}
            className={`w-full px-3 py-2 border rounded-lg bg-transparent focus:outline-none focus:ring-2 focus:ring-foreground disabled:opacity-40 ${suffix ? 'pr-16' : ''} ${className ?? ''}`}
            {...props}
          />
          {suffix && (
            <div className="absolute inset-y-0 right-0 flex items-center pr-3">
              {suffix}
            </div>
          )}
        </div>
        {error && (
          <p id={`${inputId}-error`} role="alert" className="text-sm text-red-500">
            {error}
          </p>
        )}
      </div>
    )
  }
)
Input.displayName = 'Input'

export { Input }
