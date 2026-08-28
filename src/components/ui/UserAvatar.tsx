import { cn } from '@/lib/utils'

interface UserAvatarProps {
  firstName:  string
  lastName:   string
  avatarUrl?: string | null
  size?:      'xs' | 'sm' | 'md' | 'lg'
  className?: string
  onClick?:   () => void
}

const SIZE = {
  xs: 'w-6 h-6 text-[10px]',
  sm: 'w-7 h-7 text-xs',
  md: 'w-10 h-10 text-sm',
  lg: 'w-16 h-16 text-2xl',
}

export function UserAvatar({ firstName, lastName, avatarUrl, size = 'sm', className, onClick }: UserAvatarProps) {
  const initials = `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase()

  const base = cn(
    SIZE[size],
    'rounded-full flex-shrink-0 overflow-hidden flex items-center justify-center',
    onClick && 'cursor-pointer',
    className,
  )

  if (avatarUrl) {
    return (
      <div className={base} onClick={onClick}>
        <img
          src={avatarUrl}
          alt={`${firstName} ${lastName}`}
          className="w-full h-full object-cover"
          onError={e => {
            // Si la imagen falla, mostrar iniciales
            const target = e.currentTarget
            target.style.display = 'none'
            target.parentElement!.classList.add('bg-brand-600', 'text-white', 'font-bold')
            target.insertAdjacentHTML('afterend', `<span>${initials}</span>`)
          }}
        />
      </div>
    )
  }

  return (
    <div
      className={cn(base, 'bg-brand-600 text-white font-bold')}
      onClick={onClick}
    >
      {initials}
    </div>
  )
}
