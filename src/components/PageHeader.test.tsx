import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import React from 'react'
import { PageHeader } from './PageHeader'

describe('PageHeader', () => {
  it('renders the label in an h1', () => {
    render(<PageHeader label="Income Timeline">Track your earnings</PageHeader>)
    const h1 = screen.getByRole('heading', { level: 1 })
    expect(h1).toHaveTextContent('Income Timeline')
  })

  it('renders the children text in a paragraph', () => {
    render(<PageHeader label="Mappings">Drag to reassign</PageHeader>)
    const p = screen.getByText('Drag to reassign')
    expect(p.tagName).toBe('P')
  })

  it('renders different labels correctly', () => {
    const { rerender } = render(<PageHeader label="First">desc</PageHeader>)
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('First')

    rerender(<PageHeader label="Second">desc</PageHeader>)
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Second')
  })

  it('renders both label and description together', () => {
    render(<PageHeader label="Timeline">Shows your financial timeline</PageHeader>)
    expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument()
    expect(screen.getByText('Shows your financial timeline')).toBeInTheDocument()
  })
})
