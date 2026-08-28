import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import { ChevronDown, Check } from 'lucide-react'
import { useWorkspace } from '@/context/WorkspaceContext'
import { cn } from '@/lib/utils'

export function WorkspaceSelector() {
  const { workspaces, activeWorkspace, setActiveWorkspace } = useWorkspace()

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button
          className={cn(
            'flex items-center gap-2 px-3 py-1.5 rounded-lg border border-base-border',
            'bg-base-elevated text-sm font-medium text-content-primary',
            'hover:border-brand-600/50 hover:bg-base-hover',
            'transition-all duration-150 outline-none focus-visible:ring-1 focus-visible:ring-brand-600',
          )}
        >
          {activeWorkspace.emoji && <span className="text-base leading-none">{activeWorkspace.emoji}</span>}
          <span className="hidden sm:block max-w-[120px] truncate">{activeWorkspace.name || '…'}</span>
          <ChevronDown className="w-3.5 h-3.5 text-content-muted flex-shrink-0" />
        </button>
      </DropdownMenu.Trigger>

      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="end"
          sideOffset={6}
          className={cn(
            'z-50 min-w-[180px] rounded-xl border border-base-border bg-base-surface p-1.5',
            'shadow-glow animate-fade-in',
          )}
        >
          <p className="px-2 py-1 text-[10px] font-semibold uppercase tracking-widest text-content-disabled select-none">
            Workspace
          </p>
          {workspaces.map((ws) => (
            <DropdownMenu.Item
              key={ws.id}
              onSelect={() => setActiveWorkspace(ws)}
              className={cn(
                'flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm cursor-pointer',
                'outline-none transition-colors duration-100',
                activeWorkspace.id === ws.id
                  ? 'bg-brand-600/15 text-brand-400'
                  : 'text-content-secondary hover:text-content-primary hover:bg-base-hover',
              )}
            >
              {ws.emoji && <span className="text-base leading-none">{ws.emoji}</span>}
              <span className="flex-1">{ws.name}</span>
              {activeWorkspace.id === ws.id && (
                <Check className="w-3.5 h-3.5 text-brand-400 flex-shrink-0" />
              )}
            </DropdownMenu.Item>
          ))}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  )
}
