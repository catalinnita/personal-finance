import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import React from 'react'
import { CloseButton } from './CloseButton'

describe('CloseButton', () => {
  const defaultProps = {
    onClick: vi.fn(),
    className: 'p-1 rounded-lg',
    xClassName: 'w-5 h-5 text-gray-500',
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders a button element', () => {
    render(<CloseButton {...defaultProps} />)
    expect(screen.getByRole('button')).toBeInTheDocument()
  })

  it('calls onClick when clicked', () => {
    render(<CloseButton {...defaultProps} />)
    fireEvent.click(screen.getByRole('button'))
    expect(defaultProps.onClick).toHaveBeenCalledOnce()
  })

  it('applies className to the button', () => {
    render(<CloseButton {...defaultProps} />)
    expect(screen.getByRole('button').className).toContain('p-1')
    expect(screen.getByRole('button').className).toContain('rounded-lg')
  })

  it('renders an X icon inside the button', () => {
    render(<CloseButton {...defaultProps} />)
    const svg = screen.getByRole('button').querySelector('svg')
    expect(svg).toBeInTheDocument()
  })

  it('applies xClassName to the icon', () => {
    render(<CloseButton {...defaultProps} />)
    const svg = screen.getByRole('button').querySelector('svg')
    expect(svg?.className.baseVal ?? svg?.getAttribute('class')).toMatch(/w-5/)
  })

  it('does not call onClick when not interacted with', () => {
    render(<CloseButton {...defaultProps} />)
    expect(defaultProps.onClick).not.toHaveBeenCalled()
  })
})
