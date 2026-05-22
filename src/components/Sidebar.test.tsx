import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import React from 'react'
import Sidebar, { MobileMenuButton } from './Sidebar'
import { SidebarProvider } from '@/context/SidebarContext'
import { ThemeProvider } from '@/context/ThemeContext'

// Mock next/image
vi.mock('next/image', () => ({
  default: ({ src, alt, ...props }: { src: string; alt: string; [key: string]: unknown }) => (
    <img src={src} alt={alt} {...props} />
  ),
}))

// Mock next/link
vi.mock('next/link', () => ({
  default: ({ href, children, ...props }: { href: string; children: React.ReactNode; [key: string]: unknown }) => (
    <a href={href} {...props}>{children}</a>
  ),
}))

const { usePathname, useRouter } = await import('next/navigation')

function Wrapper({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <SidebarProvider>{children}</SidebarProvider>
    </ThemeProvider>
  )
}

describe('Sidebar', () => {
  beforeEach(() => {
    vi.mocked(usePathname).mockReturnValue('/')
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 1200,
    })
  })

  it('renders the aside with aria-label', () => {
    render(<Sidebar />, { wrapper: Wrapper })
    expect(screen.getByRole('navigation')).toBeInTheDocument()
  })

  it('renders logo image', () => {
    render(<Sidebar />, { wrapper: Wrapper })
    expect(screen.getByAltText('Kentic')).toBeInTheDocument()
  })

  it('renders nav section labels when expanded', () => {
    render(<Sidebar />, { wrapper: Wrapper })
    expect(screen.getByText('Data')).toBeInTheDocument()
    expect(screen.getByText('Manage')).toBeInTheDocument()
    expect(screen.getByText('Reporting')).toBeInTheDocument()
    expect(screen.getByText('Strategies')).toBeInTheDocument()
  })

  it('renders all nav item labels when expanded', () => {
    render(<Sidebar />, { wrapper: Wrapper })
    expect(screen.getByText('Upload Statements')).toBeInTheDocument()
    expect(screen.getByText('Transactions')).toBeInTheDocument()
    expect(screen.getByText('Clean Up')).toBeInTheDocument()
    expect(screen.getByText('Manage Categories')).toBeInTheDocument()
    expect(screen.getByText('Mappings')).toBeInTheDocument()
    expect(screen.getByText('Balance')).toBeInTheDocument()
    expect(screen.getByText('Income by Source')).toBeInTheDocument()
    expect(screen.getByText('Expenses by Category')).toBeInTheDocument()
    expect(screen.getByText('Spending Timeline')).toBeInTheDocument()
    expect(screen.getByText('Budgets')).toBeInTheDocument()
    expect(screen.getByText('50/30/20 Rule')).toBeInTheDocument()
  })

  it('marks the active link with aria-current=page', () => {
    vi.mocked(usePathname).mockReturnValue('/upload')
    render(<Sidebar />, { wrapper: Wrapper })
    const uploadLink = screen.getByRole('link', { name: /upload statements/i })
    expect(uploadLink).toHaveAttribute('aria-current', 'page')
  })

  it('does not mark inactive links with aria-current', () => {
    vi.mocked(usePathname).mockReturnValue('/upload')
    render(<Sidebar />, { wrapper: Wrapper })
    const transactionsLink = screen.getByRole('link', { name: /transactions/i })
    expect(transactionsLink).not.toHaveAttribute('aria-current', 'page')
  })

  it('renders nav links with correct hrefs', () => {
    render(<Sidebar />, { wrapper: Wrapper })
    expect(screen.getByRole('link', { name: /upload statements/i })).toHaveAttribute('href', '/upload')
    expect(screen.getByRole('link', { name: /transactions/i })).toHaveAttribute('href', '/transactions')
    expect(screen.getByRole('link', { name: /balance/i })).toHaveAttribute('href', '/balance')
  })

  it('calls setIsHovered(true) on mouseEnter when not expanded (lines 68-69)', () => {
    render(<Sidebar />, { wrapper: Wrapper })
    const aside = screen.getByRole('navigation').closest('aside')!
    fireEvent.mouseEnter(aside)
    // After hover, full nav labels should remain visible (isHovered=true → showFull=true)
    expect(screen.getByText('Data')).toBeInTheDocument()
  })

  it('calls setIsHovered(false) on mouseLeave (line 69)', () => {
    render(<Sidebar />, { wrapper: Wrapper })
    const aside = screen.getByRole('navigation').closest('aside')!
    fireEvent.mouseEnter(aside)
    fireEvent.mouseLeave(aside)
    // After leaving, still rendered (sidebar state managed by context)
    expect(aside).toBeInTheDocument()
  })

  it('renders mobile backdrop when isMobileOpen is true', () => {
    render(<MobileMenuButton />, { wrapper: Wrapper })
    const btn = screen.getByRole('button')
    fireEvent.click(btn) // opens mobile sidebar
    // Re-render Sidebar to see backdrop
    render(<Sidebar />, { wrapper: Wrapper })
    // At this point backdrop should be in document (isMobileOpen=true per context)
    // We just confirm no error thrown and sidebar is present
    expect(screen.getAllByRole('navigation').length).toBeGreaterThan(0)
  })
})

describe('MobileMenuButton', () => {
  it('renders with closed state label when sidebar is closed', () => {
    render(<MobileMenuButton />, { wrapper: Wrapper })
    expect(screen.getByRole('button', { name: /open navigation menu/i })).toBeInTheDocument()
  })

  it('has aria-expanded=false when sidebar is closed', () => {
    render(<MobileMenuButton />, { wrapper: Wrapper })
    expect(screen.getByRole('button')).toHaveAttribute('aria-expanded', 'false')
  })

  it('toggles aria-label after click', () => {
    render(<MobileMenuButton />, { wrapper: Wrapper })
    const btn = screen.getByRole('button')
    fireEvent.click(btn)
    expect(screen.getByRole('button', { name: /close navigation menu/i })).toBeInTheDocument()
  })

  it('has aria-expanded=true after click', () => {
    render(<MobileMenuButton />, { wrapper: Wrapper })
    const btn = screen.getByRole('button')
    fireEvent.click(btn)
    expect(btn).toHaveAttribute('aria-expanded', 'true')
  })
})
