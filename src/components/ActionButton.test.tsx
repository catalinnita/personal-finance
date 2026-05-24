import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import React from 'react'
import { ActionButton } from './ActionButton'

describe('ActionButton', () => {
  const defaultProps = {
    onClick: vi.fn(),
    disabled: false,
    className: 'px-4 py-2 rounded-lg bg-brand-500 text-white',
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders a button with children', () => {
    render(<ActionButton {...defaultProps}>Apply</ActionButton>)
    expect(screen.getByRole('button', { name: 'Apply' })).toBeInTheDocument()
  })

  it('calls onClick when clicked', () => {
    render(<ActionButton {...defaultProps}>Apply</ActionButton>)
    fireEvent.click(screen.getByRole('button'))
    expect(defaultProps.onClick).toHaveBeenCalledOnce()
  })

  it('is disabled when disabled prop is true', () => {
    render(<ActionButton {...defaultProps} disabled={true}>Apply</ActionButton>)
    expect(screen.getByRole('button')).toBeDisabled()
  })

  it('is enabled when disabled prop is false', () => {
    render(<ActionButton {...defaultProps} disabled={false}>Apply</ActionButton>)
    expect(screen.getByRole('button')).not.toBeDisabled()
  })

  it('does not call onClick when disabled', () => {
    render(<ActionButton {...defaultProps} disabled={true}>Apply</ActionButton>)
    fireEvent.click(screen.getByRole('button'))
    expect(defaultProps.onClick).not.toHaveBeenCalled()
  })

  it('applies className to the button', () => {
    render(<ActionButton {...defaultProps}>Apply</ActionButton>)
    expect(screen.getByRole('button').className).toContain('bg-brand-500')
  })

  it('renders complex children', () => {
    render(
      <ActionButton {...defaultProps}>
        <span>Icon</span>
        Save
      </ActionButton>
    )
    expect(screen.getByText('Save')).toBeInTheDocument()
    expect(screen.getByText('Icon')).toBeInTheDocument()
  })
})
