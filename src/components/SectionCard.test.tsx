import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import React from 'react'
import { SectionCard } from './SectionCard'

describe('SectionCard', () => {
  const defaultProps = {
    className: 'bg-white rounded-xl p-6',
    hClassName: 'text-lg font-semibold',
    label: 'Budget Rule',
  }

  it('renders the label in an h2', () => {
    render(<SectionCard {...defaultProps}><p>content</p></SectionCard>)
    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('Budget Rule')
  })

  it('renders children inside the card', () => {
    render(<SectionCard {...defaultProps}><p>Inner content</p></SectionCard>)
    expect(screen.getByText('Inner content')).toBeInTheDocument()
  })

  it('applies className to the outer wrapper', () => {
    const { container } = render(<SectionCard {...defaultProps}><span /></SectionCard>)
    expect((container.firstChild as HTMLElement).className).toContain('rounded-xl')
  })

  it('applies hClassName to the h2', () => {
    render(<SectionCard {...defaultProps}><span /></SectionCard>)
    expect(screen.getByRole('heading', { level: 2 }).className).toContain('font-semibold')
  })

  it('renders different labels correctly', () => {
    const { rerender } = render(<SectionCard {...defaultProps} label="First"><span /></SectionCard>)
    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('First')
    rerender(<SectionCard {...defaultProps} label="Second"><span /></SectionCard>)
    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('Second')
  })
})
