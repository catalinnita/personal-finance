'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Upload, List, BarChart3, PieChart, Tags, ArrowRightLeft, Menu, X, TrendingUp, Trash2 } from 'lucide-react'
import { useSidebar } from '@/context/SidebarContext'

const navSections = [
  {
    title: 'Data',
    items: [
      { href: '/upload', label: 'Upload Statements', icon: Upload },
      { href: '/transactions', label: 'Transactions', icon: List },
      { href: '/cleanup', label: 'Clean Up', icon: Trash2 },
    ]
  },
  {
    title: 'Manage',
    items: [
      { href: '/manage-categories', label: 'Manage Categories', icon: Tags },
      { href: '/mappings', label: 'Mappings', icon: ArrowRightLeft },
    ]
  },
  {
    title: 'Reporting',
    items: [
      { href: '/balance', label: 'Balance', icon: BarChart3 },
      { href: '/categories', label: 'Categories', icon: PieChart },
      { href: '/timeline', label: 'Timeline', icon: TrendingUp },
    ]
  },
]

export default function Sidebar() {
  const pathname = usePathname()
  const { isExpanded, isMobileOpen, isHovered, setIsHovered, toggleMobileSidebar } = useSidebar()

  const showFull = isExpanded || isHovered || isMobileOpen

  return (
    <>
      {/* Mobile backdrop */}
      {isMobileOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={toggleMobileSidebar}
        />
      )}
      
      <aside 
        className={`fixed top-0 left-0 h-screen bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 transition-all duration-300 ease-in-out z-50 flex flex-col
          ${showFull ? 'w-[280px]' : 'w-[80px]'}
          ${isMobileOpen ? 'translate-x-0' : '-translate-x-full'}
          lg:translate-x-0
        `}
        onMouseEnter={() => !isExpanded && setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {/* Logo */}
        <div className={`py-6 px-5 flex items-center ${!showFull ? 'justify-center' : ''}`}>
          {showFull ? (
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">Personal Finance</h1>
          ) : (
            <span className="text-xl font-bold text-brand-500">PF</span>
          )}
        </div>
        
        {/* Navigation */}
        <nav className="flex-1 px-4 overflow-y-auto no-scrollbar">
          <div className="flex flex-col gap-4">
            {navSections.map((section) => (
              <div key={section.title}>
                {showFull && (
                  <h3 className="px-3 mb-2 text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
                    {section.title}
                  </h3>
                )}
                <div className="flex flex-col gap-1">
                  {section.items.map((item) => {
                    const isActive = pathname === item.href
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        className={`menu-item ${isActive ? 'menu-item-active' : 'menu-item-inactive'} ${!showFull ? 'justify-center' : ''}`}
                      >
                        <item.icon className={`w-5 h-5 flex-shrink-0 ${isActive ? 'text-brand-500 dark:text-brand-400' : 'text-gray-500 dark:text-gray-400'}`} />
                        {showFull && <span>{item.label}</span>}
                      </Link>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        </nav>
      </aside>
    </>
  )
}

export function MobileMenuButton() {
  const { isMobileOpen, toggleMobileSidebar } = useSidebar()
  
  return (
    <button
      onClick={toggleMobileSidebar}
      className="lg:hidden p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg"
    >
      {isMobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
    </button>
  )
}
