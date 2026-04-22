import { InputHTMLAttributes, TextareaHTMLAttributes, forwardRef } from 'react'

const inputBase: React.CSSProperties = {
  background: 'var(--bg-surface)',
  border: '1px solid var(--border-default)',
  color: 'var(--fg-primary)',
  borderRadius: 4,
  fontFamily: 'DM Sans, sans-serif',
  outline: 'none',
  transition: 'border-color 0.15s ease',
}

const labelStyle: React.CSSProperties = {
  fontSize: 11,
  color: 'var(--fg-muted)',
  fontFamily: 'DM Mono, monospace',
  letterSpacing: '0.12em',
  textTransform: 'uppercase',
  display: 'block',
  marginBottom: 6,
}

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  hint?: string
  error?: string
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, hint, error, style, ...props }, ref) => (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      {label && <label style={labelStyle}>{label}</label>}
      <input
        ref={ref}
        style={{
          ...inputBase,
          height: 36,
          padding: '0 12px',
          fontSize: 13,
          borderColor: error ? '#9a4040' : 'var(--border-default)',
          ...style,
        }}
        onFocus={e => { (e.target as HTMLInputElement).style.borderColor = 'var(--border-emphasis)' }}
        onBlur={e => { (e.target as HTMLInputElement).style.borderColor = error ? '#9a4040' : 'var(--border-default)' }}
        {...props}
      />
      {hint && !error && <span style={{ fontSize: 11, color: 'var(--fg-muted)', marginTop: 4 }}>{hint}</span>}
      {error && <span style={{ fontSize: 11, color: '#d07070', marginTop: 4 }}>{error}</span>}
    </div>
  )
)
Input.displayName = 'Input'

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
  hint?: string
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, hint, style, ...props }, ref) => (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      {label && <label style={labelStyle}>{label}</label>}
      <textarea
        ref={ref}
        style={{
          ...inputBase,
          padding: '10px 12px',
          fontSize: 13,
          resize: 'none',
          ...style,
        }}
        onFocus={e => { (e.target as HTMLTextAreaElement).style.borderColor = 'var(--border-emphasis)' }}
        onBlur={e => { (e.target as HTMLTextAreaElement).style.borderColor = 'var(--border-default)' }}
        {...props}
      />
      {hint && <span style={{ fontSize: 11, color: 'var(--fg-muted)', marginTop: 4 }}>{hint}</span>}
    </div>
  )
)
Textarea.displayName = 'Textarea'

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string
  options: { value: string; label: string }[]
}

export function Select({ label, options, style, ...props }: SelectProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      {label && <label style={labelStyle}>{label}</label>}
      <select
        style={{
          ...inputBase,
          height: 36,
          padding: '0 12px',
          fontSize: 13,
          cursor: 'pointer',
          ...style,
        }}
        {...props}
      >
        {options.map(opt => (
          <option key={opt.value} value={opt.value}
            style={{ background: 'var(--bg-elevated)', color: 'var(--fg-primary)' }}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  )
}
