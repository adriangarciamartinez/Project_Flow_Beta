import { ReactNode, ButtonHTMLAttributes } from 'react'
import { motion } from 'framer-motion'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
  size?: 'sm' | 'md' | 'lg'
  icon?: ReactNode
  iconPosition?: 'left' | 'right'
  children?: ReactNode
}

const styleMap = {
  primary: {
    background: 'var(--bg-elevated)',
    border: '1px solid var(--border-emphasis)',
    color: 'var(--fg-primary)',
  },
  secondary: {
    background: 'transparent',
    border: '1px solid var(--border-default)',
    color: 'var(--fg-secondary)',
  },
  ghost: {
    background: 'transparent',
    border: '1px solid transparent',
    color: 'var(--fg-muted)',
  },
  danger: {
    background: 'transparent',
    border: '1px solid var(--border-default)',
    color: 'var(--fg-muted)',
  },
}

const sizeMap = {
  sm: { height: 28, padding: '0 12px', fontSize: 12, gap: 6 },
  md: { height: 36, padding: '0 16px', fontSize: 13, gap: 8 },
  lg: { height: 44, padding: '0 20px', fontSize: 15, gap: 8 },
}

export default function Button({
  variant = 'secondary',
  size = 'md',
  icon,
  iconPosition = 'left',
  children,
  style: propStyle,
  ...props
}: ButtonProps) {
  const s = styleMap[variant]
  const sz = sizeMap[size]

  return (
    <motion.button
      whileHover={{ scale: 1.01 }}
      whileTap={{ scale: 0.98 }}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: sz.gap,
        height: sz.height,
        padding: sz.padding,
        fontSize: sz.fontSize,
        borderRadius: 4,
        fontFamily: 'DM Sans, sans-serif',
        cursor: 'pointer',
        transition: 'all 0.15s ease',
        ...s,
        ...propStyle,
      }}
      {...(props as any)}
    >
      {icon && iconPosition === 'left' && <span style={{ flexShrink: 0 }}>{icon}</span>}
      {children}
      {icon && iconPosition === 'right' && <span style={{ flexShrink: 0 }}>{icon}</span>}
    </motion.button>
  )
}
