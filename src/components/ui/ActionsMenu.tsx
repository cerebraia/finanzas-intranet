import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import { MoreVertical } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { ReactNode } from 'react'

export interface ActionItem {
  label:    string
  icon?:    React.ElementType
  onClick:  () => void
  danger?:  boolean
  disabled?: boolean
  separator?: boolean
}

interface Props {
  items:      ActionItem[]
  className?: string
  align?:     'start' | 'end' | 'center'
  trigger?:   ReactNode
}

export function ActionsMenu({ items, className, align = 'end', trigger }: Props) {
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        {trigger ? (
          <span>{trigger}</span>
        ) : (
          <button
            className={cn(
              'p-1.5 rounded-lg text-content-disabled hover:text-content-primary',
              'hover:bg-base-hover border border-transparent hover:border-base-border',
              'transition-all focus:outline-none',
              className
            )}
            onClick={e => e.stopPropagation()}
          >
            <MoreVertical className="w-4 h-4" />
          </button>
        )}
      </DropdownMenu.Trigger>

      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align={align}
          sideOffset={4}
          className={cn(
            'z-50 min-w-[160px] rounded-xl border border-base-border',
            'bg-base-surface shadow-xl p-1',
            'animate-in fade-in-0 zoom-in-95'
          )}
          onClick={e => e.stopPropagation()}
        >
          {items.map((item, i) => (
            <span key={i}>
              {item.separator && i > 0 && (
                <DropdownMenu.Separator className="my-1 h-px bg-base-border" />
              )}
              <DropdownMenu.Item
                disabled={item.disabled}
                onSelect={item.onClick}
                className={cn(
                  'flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-medium',
                  'cursor-pointer outline-none select-none transition-colors',
                  item.danger
                    ? 'text-red-400 hover:bg-red-500/10 focus:bg-red-500/10'
                    : 'text-content-muted hover:text-content-primary hover:bg-base-hover focus:bg-base-hover',
                  item.disabled && 'opacity-40 cursor-not-allowed'
                )}
              >
                {item.icon && <item.icon className="w-3.5 h-3.5 flex-shrink-0" />}
                {item.label}
              </DropdownMenu.Item>
            </span>
          ))}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  )
}
