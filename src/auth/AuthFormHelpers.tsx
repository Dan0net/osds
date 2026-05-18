import type { ChangeEvent, InputHTMLAttributes, ReactNode } from 'react'
import { Link } from 'react-router-dom'
import Button from '@/shared/form/Button'
import { TextInput, Field } from '@/shared/form/Input'

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
    <Button type="submit" disabled={disabled} className="w-full" size="lg">
      {children}
    </Button>
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
    <Field label={label}>
      <TextInput type={type} value={value} onChange={onChange} {...rest} />
    </Field>
  )
}
