import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import React from 'react'
import RootLayout from './layout'

// next/font/google returns a classname, mock it
vi.mock('next/font/google', () => ({
  Outfit: () => ({ className: 'outfit-font' }),
}))

// We can't render the full html/body in jsdom, so we test the providers are rendered
describe('RootLayout', () => {
  it('renders children inside providers', () => {
    render(
      <RootLayout>
        <div data-testid="child">Content</div>
      </RootLayout>
    )
    expect(screen.getByTestId('child')).toBeInTheDocument()
    expect(screen.getByText('Content')).toBeInTheDocument()
  })

  it('renders a body element', () => {
    render(
      <RootLayout>
        <div>child</div>
      </RootLayout>
    )
    expect(document.querySelector('body')).toBeInTheDocument()
  })
})
