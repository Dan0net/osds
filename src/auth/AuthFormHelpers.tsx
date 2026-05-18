import type { ChangeEvent, InputHTMLAttributes, ReactNode } from 'react'
import { Link } from 'react-router-dom'

export function AuthShell({ title, subtitle, children }: { title?: string; subtitle?: string; children: ReactNode }) {
  return (
    <div className="max-w-md mx-auto px-4 py-12 sm:py-16">
      {(title || subtitle) && (
        <div className="text-center mb-8">
          {title && (
            <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-2">{title}</h1>
          )}
          {subtitle && <p className="text-gray-500">{subtitle}</p>}
        </div>
      )}
      {children}
    </div>
  )
}

export function SubmitButton({ disabled, children }: { disabled?: boolean; children: ReactNode }) {
  return (
    <button
      type="submit"
      disabled={disabled}
      className="cursor-pointer w-full bg-indigo-600 text-white font-semibold py-3 rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
    >
      {children}
    </button>
  )
}

export function AuthFooter({ prefix, to, linkText }: { prefix?: string; to: string; linkText: string }) {
  return (
    <div className="mt-8 pt-6 border-t border-gray-200 text-center">
      <p className="text-gray-600">
        {prefix && <>{prefix}{' '}</>}
        <Link to={to} className="font-semibold text-indigo-600 hover:text-indigo-700 hover:underline">
          {linkText}
        </Link>
      </p>
    </div>
  )
}

interface TextFieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
  label: string
  value: string
  onChange: (e: ChangeEvent<HTMLInputElement>) => void
  type?: string
}

export function TextField({ label, value, onChange, type = 'text', ...rest }: TextFieldProps) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <input
        type={type}
        value={value}
        onChange={onChange}
        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
        {...rest}
      />
    </div>
  )
}

export function ErrorBanner({ children }: { children?: ReactNode }) {
  if (!children) return null
  return (
    <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3 mb-4">
      {children}
    </div>
  )
}
