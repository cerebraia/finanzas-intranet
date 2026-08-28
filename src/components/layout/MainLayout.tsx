import type { ReactNode } from 'react'
import { Sidebar }        from './Sidebar'
import { Header }         from './Header'
import { BottomNav }      from './BottomNav'
import { CommandPalette } from '@/components/ui/CommandPalette'
import { FabMenu }        from '@/components/ui/FabMenu'
import { ErrorBoundary }  from '@/components/ui/ErrorBoundary'
import { useSidebar }     from '@/hooks/useSidebar'

interface MainLayoutProps {
  children: ReactNode
}

export function MainLayout({ children }: MainLayoutProps) {
  const { collapsed, toggle, mobileOpen, openMobile, closeMobile, toggleSection, isSectionOpen } = useSidebar()

  return (
    <div className="flex h-dvh overflow-hidden bg-base">
      <Sidebar
        collapsed={collapsed}
        onToggle={toggle}
        mobileOpen={mobileOpen}
        onCloseMobile={closeMobile}
        toggleSection={toggleSection}
        isSectionOpen={isSectionOpen}
      />
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <Header onOpenMobile={openMobile} />
        <main className="flex-1 overflow-y-auto p-4 md:p-6 pb-24 md:pb-6 animate-fade-in">
          <ErrorBoundary>
            {children}
          </ErrorBoundary>
        </main>
      </div>

      {/* Global UI */}
      <CommandPalette />
      <FabMenu />
      <BottomNav />
    </div>
  )
}
