import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, act, fireEvent } from '@testing-library/react'
import React from 'react'
import { SidebarProvider, useSidebar } from './SidebarContext'
import { MOBILE_BREAKPOINT } from '@/config/constants'

// ─── Test component to read context values ────────────────────────────────────
function TestConsumer() {
  const { isExpanded, isMobileOpen, isHovered, toggleSidebar, toggleMobileSidebar, setIsHovered } = useSidebar()
  return (
    <div>
      <span data-testid="isExpanded">{String(isExpanded)}</span>
      <span data-testid="isMobileOpen">{String(isMobileOpen)}</span>
      <span data-testid="isHovered">{String(isHovered)}</span>
      <button data-testid="toggleSidebar" onClick={toggleSidebar}>Toggle Sidebar</button>
      <button data-testid="toggleMobile" onClick={toggleMobileSidebar}>Toggle Mobile</button>
      <button data-testid="setHovered" onClick={() => setIsHovered(true)}>Set Hovered</button>
      <button data-testid="clearHovered" onClick={() => setIsHovered(false)}>Clear Hovered</button>
    </div>
  )
}

describe('SidebarContext', () => {
  beforeEach(() => {
    // Default: desktop viewport (wider than mobile breakpoint)
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: MOBILE_BREAKPOINT + 100,
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('useSidebar hook', () => {
    it('throws when used outside of SidebarProvider', () => {
      // Suppress the error boundary output in test logs
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      expect(() => render(<TestConsumer />)).toThrow('useSidebar must be used within a SidebarProvider')
      consoleSpy.mockRestore()
    })
  })

  describe('SidebarProvider initial state', () => {
    it('starts with isExpanded=true on desktop', () => {
      render(
        <SidebarProvider>
          <TestConsumer />
        </SidebarProvider>
      )
      expect(screen.getByTestId('isExpanded').textContent).toBe('true')
    })

    it('starts with isMobileOpen=false', () => {
      render(
        <SidebarProvider>
          <TestConsumer />
        </SidebarProvider>
      )
      expect(screen.getByTestId('isMobileOpen').textContent).toBe('false')
    })

    it('starts with isHovered=false', () => {
      render(
        <SidebarProvider>
          <TestConsumer />
        </SidebarProvider>
      )
      expect(screen.getByTestId('isHovered').textContent).toBe('false')
    })

    it('returns isExpanded=false on mobile (width < MOBILE_BREAKPOINT)', () => {
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: MOBILE_BREAKPOINT - 1,
      })

      render(
        <SidebarProvider>
          <TestConsumer />
        </SidebarProvider>
      )
      // On mobile, isExpanded is always false regardless of internal state
      expect(screen.getByTestId('isExpanded').textContent).toBe('false')
    })
  })

  describe('toggleSidebar', () => {
    it('toggles isExpanded from true to false on desktop', () => {
      render(
        <SidebarProvider>
          <TestConsumer />
        </SidebarProvider>
      )
      expect(screen.getByTestId('isExpanded').textContent).toBe('true')

      act(() => {
        screen.getByTestId('toggleSidebar').click()
      })

      expect(screen.getByTestId('isExpanded').textContent).toBe('false')
    })

    it('toggles isExpanded back to true after two clicks', () => {
      render(
        <SidebarProvider>
          <TestConsumer />
        </SidebarProvider>
      )

      act(() => {
        screen.getByTestId('toggleSidebar').click()
      })
      act(() => {
        screen.getByTestId('toggleSidebar').click()
      })

      expect(screen.getByTestId('isExpanded').textContent).toBe('true')
    })
  })

  describe('toggleMobileSidebar', () => {
    it('toggles isMobileOpen from false to true', () => {
      render(
        <SidebarProvider>
          <TestConsumer />
        </SidebarProvider>
      )
      expect(screen.getByTestId('isMobileOpen').textContent).toBe('false')

      act(() => {
        screen.getByTestId('toggleMobile').click()
      })

      expect(screen.getByTestId('isMobileOpen').textContent).toBe('true')
    })

    it('toggles isMobileOpen back to false on second click', () => {
      render(
        <SidebarProvider>
          <TestConsumer />
        </SidebarProvider>
      )

      act(() => {
        screen.getByTestId('toggleMobile').click()
      })
      act(() => {
        screen.getByTestId('toggleMobile').click()
      })

      expect(screen.getByTestId('isMobileOpen').textContent).toBe('false')
    })
  })

  describe('setIsHovered', () => {
    it('sets isHovered to true', () => {
      render(
        <SidebarProvider>
          <TestConsumer />
        </SidebarProvider>
      )
      act(() => {
        screen.getByTestId('setHovered').click()
      })
      expect(screen.getByTestId('isHovered').textContent).toBe('true')
    })

    it('sets isHovered back to false', () => {
      render(
        <SidebarProvider>
          <TestConsumer />
        </SidebarProvider>
      )
      act(() => {
        screen.getByTestId('setHovered').click()
      })
      act(() => {
        screen.getByTestId('clearHovered').click()
      })
      expect(screen.getByTestId('isHovered').textContent).toBe('false')
    })
  })

  describe('resize handling', () => {
    it('sets isMobileOpen to false when resizing to desktop', () => {
      // Start on mobile
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: MOBILE_BREAKPOINT - 1,
      })

      render(
        <SidebarProvider>
          <TestConsumer />
        </SidebarProvider>
      )

      // Open mobile sidebar
      act(() => {
        screen.getByTestId('toggleMobile').click()
      })
      expect(screen.getByTestId('isMobileOpen').textContent).toBe('true')

      // Resize to desktop
      act(() => {
        Object.defineProperty(window, 'innerWidth', {
          writable: true,
          configurable: true,
          value: MOBILE_BREAKPOINT + 100,
        })
        fireEvent(window, new Event('resize'))
      })

      expect(screen.getByTestId('isMobileOpen').textContent).toBe('false')
    })

    it('updates isMobile state when resizing to mobile width', () => {
      render(
        <SidebarProvider>
          <TestConsumer />
        </SidebarProvider>
      )

      // Initially desktop → isExpanded is true
      expect(screen.getByTestId('isExpanded').textContent).toBe('true')

      // Resize to mobile
      act(() => {
        Object.defineProperty(window, 'innerWidth', {
          writable: true,
          configurable: true,
          value: MOBILE_BREAKPOINT - 1,
        })
        fireEvent(window, new Event('resize'))
      })

      // On mobile, isExpanded returns false
      expect(screen.getByTestId('isExpanded').textContent).toBe('false')
    })

    it('removes resize event listener on unmount', () => {
      const removeEventListenerSpy = vi.spyOn(window, 'removeEventListener')

      const { unmount } = render(
        <SidebarProvider>
          <TestConsumer />
        </SidebarProvider>
      )

      unmount()

      expect(removeEventListenerSpy).toHaveBeenCalledWith('resize', expect.any(Function))
    })
  })
})
