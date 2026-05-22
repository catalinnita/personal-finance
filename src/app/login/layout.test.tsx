import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import React from 'react'
import LoginLayout from './layout'

describe('LoginLayout', () => {
  it('renders children directly', () => {
    render(
      <LoginLayout>
        <div data-testid="child">Login content</div>
      </LoginLayout>
    )
    expect(screen.getByTestId('child')).toBeInTheDocument()
  })

  it('does not add any extra wrapper elements', () => {
    const { container } = render(
      <LoginLayout>
        <p>text</p>
      </LoginLayout>
    )
    expect(container.querySelector('p')).toBeInTheDocument()
  })
})
