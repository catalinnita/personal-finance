'use client'

import Sidebar, { MobileMenuButton } from '@/components/Sidebar'
import { useSidebar } from '@/context/SidebarContext'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { isExpanded, isHovered, isMobileOpen } = useSidebar()
  
  const showFull = isExpanded || isHovered || isMobileOpen
  const mainMargin = isMobileOpen ? 'ml-0' : showFull ? 'lg:ml-[280px]' : 'lg:ml-[80px]'

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Sidebar />
      
      {/* Header */}
      <header className={`sticky top-0 z-40 flex items-center justify-between h-16 px-4 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 transition-all duration-300 ${mainMargin}`}>
        <MobileMenuButton />
        <div className="flex-1" />
      </header>
      
      {/* Main content */}
      <main className={`p-4 md:p-6 transition-all duration-300 ${mainMargin}`}>
        <div className="max-w-7xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  )
}
