import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, act } from '@testing-library/react'
import React from 'react'
import { ThemeProvider, useTheme } from './ThemeContext'

function TestConsumer() {
  const { theme, toggleTheme } = useTheme()
  return (
    <div>
      <span data-testid="theme">{theme}</span>
      <button data-testid="toggle" onClick={toggleTheme}>Toggle</button>
    </div>
  )
}

describe('ThemeContext', () => {
  beforeEach(() => {
    localStorage.clear()
    document.documentElement.classList.remove('dark')
  })

  describe('useTheme hook', () => {
    it('throws when used outside of ThemeProvider', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      expect(() => render(<TestConsumer />)).toThrow('useTheme must be used within a ThemeProvider')
      consoleSpy.mockRestore()
    })
  })

  describe('ThemeProvider initial state', () => {
    it('defaults to light theme when no saved theme', async () => {
      render(
        <ThemeProvider>
          <TestConsumer />
        </ThemeProvider>
      )
      // Wait for effect to run
      await act(async () => {})
      expect(screen.getByTestId('theme').textContent).toBe('light')
    })

    it('reads saved dark theme from localStorage', async () => {
      localStorage.setItem('theme', 'dark')
      render(
        <ThemeProvider>
          <TestConsumer />
        </ThemeProvider>
      )
      await act(async () => {})
      expect(screen.getByTestId('theme').textContent).toBe('dark')
    })

    it('reads saved light theme from localStorage', async () => {
      localStorage.setItem('theme', 'light')
      render(
        <ThemeProvider>
          <TestConsumer />
        </ThemeProvider>
      )
      await act(async () => {})
      expect(screen.getByTestId('theme').textContent).toBe('light')
    })
  })

  describe('toggleTheme', () => {
    it('toggles from light to dark', async () => {
      render(
        <ThemeProvider>
          <TestConsumer />
        </ThemeProvider>
      )
      await act(async () => {})
      expect(screen.getByTestId('theme').textContent).toBe('light')

      act(() => {
        screen.getByTestId('toggle').click()
      })

      expect(screen.getByTestId('theme').textContent).toBe('dark')
    })

    it('toggles from dark back to light', async () => {
      localStorage.setItem('theme', 'dark')
      render(
        <ThemeProvider>
          <TestConsumer />
        </ThemeProvider>
      )
      await act(async () => {})

      act(() => {
        screen.getByTestId('toggle').click()
      })

      expect(screen.getByTestId('theme').textContent).toBe('light')
    })

    it('persists theme to localStorage on toggle', async () => {
      render(
        <ThemeProvider>
          <TestConsumer />
        </ThemeProvider>
      )
      await act(async () => {})

      act(() => {
        screen.getByTestId('toggle').click()
      })

      expect(localStorage.getItem('theme')).toBe('dark')
    })

    it('adds dark class to document when theme is dark', async () => {
      render(
        <ThemeProvider>
          <TestConsumer />
        </ThemeProvider>
      )
      await act(async () => {})

      act(() => {
        screen.getByTestId('toggle').click()
      })

      expect(document.documentElement.classList.contains('dark')).toBe(true)
    })

    it('removes dark class from document when theme is light', async () => {
      localStorage.setItem('theme', 'dark')
      render(
        <ThemeProvider>
          <TestConsumer />
        </ThemeProvider>
      )
      await act(async () => {})
      // Should have dark class
      expect(document.documentElement.classList.contains('dark')).toBe(true)

      act(() => {
        screen.getByTestId('toggle').click()
      })

      expect(document.documentElement.classList.contains('dark')).toBe(false)
    })
  })
})
