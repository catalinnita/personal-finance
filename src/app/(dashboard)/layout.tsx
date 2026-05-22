'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Settings, Sun, Moon, LogOut } from 'lucide-react'
import Sidebar, { MobileMenuButton } from '@/components/Sidebar'
import { useSidebar } from '@/context/SidebarContext'
import { useTheme } from '@/context/ThemeContext'
import { createClient } from '@/lib/supabase/client'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { isExpanded, isHovered, isMobileOpen } = useSidebar()
  const { theme, toggleTheme } = useTheme()
  const router = useRouter()
  const supabase = createClient()
  
  const showFull = isExpanded || isHovered || isMobileOpen
  const mainMargin = isMobileOpen ? 'ml-0' : showFull ? 'lg:ml-[280px]' : 'lg:ml-[80px]'

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Sidebar />
      
      {/* Header */}
      <header className={`sticky top-0 z-40 flex items-center justify-between h-16 px-4 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 transition-all duration-300 ${mainMargin}`}>
        <MobileMenuButton />
        <div className="flex-1" />
        
        {/* Right side actions */}
        <div className="flex items-center gap-2">
          <Link
            href="/settings"
            aria-label="Settings"
            className="p-2 text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
          >
            <Settings aria-hidden="true" className="w-5 h-5" />
          </Link>
          <button
            onClick={toggleTheme}
            aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            className="p-2 text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
          >
            {theme === 'dark' ? <Sun aria-hidden="true" className="w-5 h-5" /> : <Moon aria-hidden="true" className="w-5 h-5" />}
          </button>
          <button
            onClick={handleLogout}
            aria-label="Log out"
            className="p-2 text-gray-500 hover:text-error-500 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
          >
            <LogOut aria-hidden="true" className="w-5 h-5" />
          </button>
        </div>
      </header>
      
      {/* Main content */}
      <main className={`p-4 md:p-6 transition-all duration-300 ${mainMargin}`} style={{ isolation: 'isolate' }}>
        <div className="max-w-7xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  )
}
