import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import React from 'react'
import { PageHeading } from './PageHeading'

describe('PageHeading', () => {
  const defaultProps = {
    className: 'flex items-center justify-between mb-6',
    label: 'Balance',
  }

  it('renders the label in an h1', () => {
    render(<PageHeading {...defaultProps}><button>action</button></PageHeading>)
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Balance')
  })

  it('renders children alongside the heading', () => {
    render(<PageHeading {...defaultProps}><button>Export</button></PageHeading>)
    expect(screen.getByRole('button', { name: 'Export' })).toBeInTheDocument()
  })

  it('applies className to the outer wrapper', () => {
    const { container } = render(<PageHeading {...defaultProps}><span /></PageHeading>)
    expect((container.firstChild as HTMLElement).className).toContain('justify-between')
  })

  it('renders different labels correctly', () => {
    const { rerender } = render(<PageHeading {...defaultProps} label="Income"><span /></PageHeading>)
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Income')
    rerender(<PageHeading {...defaultProps} label="Transactions"><span /></PageHeading>)
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Transactions')
  })
})
