import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import React from 'react'
import DashboardLayout from './layout'
import { SidebarProvider } from '@/context/SidebarContext'
import { ThemeProvider } from '@/context/ThemeContext'

const mockSignOut = vi.fn().mockResolvedValue({})

// Mock supabase client
vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    auth: {
      signOut: mockSignOut,
      getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
    },
  }),
}))

// Mock next/image
vi.mock('next/image', () => ({
  default: ({ src, alt }: { src: string; alt: string }) => <img src={src} alt={alt} />,
}))

// Mock next/link
vi.mock('next/link', () => ({
  default: ({ href, children, ...props }: { href: string; children: React.ReactNode; [key: string]: unknown }) => (
    <a href={href} {...props}>{children}</a>
  ),
}))

function Wrapper({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <SidebarProvider>{children}</SidebarProvider>
    </ThemeProvider>
  )
}

describe('DashboardLayout', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('renders children content', () => {
    render(
      <DashboardLayout>
        <div data-testid="page-content">Page</div>
      </DashboardLayout>,
      { wrapper: Wrapper }
    )
    expect(screen.getByTestId('page-content')).toBeInTheDocument()
  })

  it('renders the settings link', () => {
    render(
      <DashboardLayout>
        <div />
      </DashboardLayout>,
      { wrapper: Wrapper }
    )
    expect(screen.getByRole('link', { name: /settings/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /settings/i })).toHaveAttribute('href', '/settings')
  })

  it('renders the theme toggle button', () => {
    render(
      <DashboardLayout>
        <div />
      </DashboardLayout>,
      { wrapper: Wrapper }
    )
    expect(screen.getByRole('button', { name: /switch to dark mode/i })).toBeInTheDocument()
  })

  it('renders the logout button', () => {
    render(
      <DashboardLayout>
        <div />
      </DashboardLayout>,
      { wrapper: Wrapper }
    )
    expect(screen.getByRole('button', { name: /log out/i })).toBeInTheDocument()
  })

  it('calls signOut on logout button click', async () => {
    render(
      <DashboardLayout>
        <div />
      </DashboardLayout>,
      { wrapper: Wrapper }
    )

    fireEvent.click(screen.getByRole('button', { name: /log out/i }))

    await waitFor(() => {
      expect(mockSignOut).toHaveBeenCalled()
    })
  })

  it('toggles theme label on theme button click', async () => {
    render(
      <DashboardLayout>
        <div />
      </DashboardLayout>,
      { wrapper: Wrapper }
    )

    const themeBtn = screen.getByRole('button', { name: /switch to dark mode/i })
    fireEvent.click(themeBtn)
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /switch to light mode/i })).toBeInTheDocument()
    })
  })
})
