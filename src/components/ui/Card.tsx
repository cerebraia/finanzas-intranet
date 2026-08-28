import type { HTMLAttributes } from 'react'

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'elevated'
  glow?: boolean
}

export function Card({ variant = 'default', glow = false, className = '', children, ...props }: CardProps) {
  const base = 'rounded-xl border'
  const variants = {
    default: 'bg-base-surface border-base-border',
    elevated: 'bg-base-elevated border-base-border',
  }
  const glowClass = glow ? 'shadow-glow' : ''

  return (
    <div className={`${base} ${variants[variant]} ${glowClass} ${className}`} {...props}>
      {children}
    </div>
  )
}
