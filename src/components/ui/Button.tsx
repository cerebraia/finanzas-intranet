import type { ButtonHTMLAttributes, ReactNode } from 'react'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'ghost' | 'outline' | 'danger' | 'secondary'
  size?: 'sm' | 'md' | 'lg'
  children: ReactNode
}

const variants = {
  primary:   'bg-brand-600 hover:bg-brand-500 text-white shadow-glow-sm',
  secondary: 'bg-base-elevated hover:bg-base-hover border border-base-border text-content-primary',
  ghost:     'text-content-secondary hover:text-content-primary hover:bg-base-hover',
  outline:   'border border-base-border text-content-secondary hover:border-brand-600 hover:text-brand-400',
  danger:    'bg-red-500 hover:bg-red-400 text-white',
}

const sizes = {
  sm: 'px-3 py-1.5 text-sm',
  md: 'px-4 py-2 text-sm',
  lg: 'px-5 py-2.5 text-base',
}

export function Button({ variant = 'primary', size = 'md', className = '', children, ...props }: ButtonProps) {
  return (
    <button
      className={`
        inline-flex items-center gap-2 font-medium rounded-lg
        transition-all duration-150 cursor-pointer
        disabled:opacity-40 disabled:cursor-not-allowed
        ${variants[variant]} ${sizes[size]} ${className}
      `}
      {...props}
    >
      {children}
    </button>
  )
}
