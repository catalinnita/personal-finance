import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import React from 'react'
import { TextBlock } from './TextBlock'

describe('TextBlock', () => {
  it('renders the children text', () => {
    render(<TextBlock>No data yet</TextBlock>)
    expect(screen.getByText('No data yet')).toBeInTheDocument()
  })

  it('renders text inside a paragraph', () => {
    render(<TextBlock>Hello</TextBlock>)
    const p = screen.getByText('Hello').closest('p')
    expect(p).toBeInTheDocument()
  })

  it('wraps content in a styled card container', () => {
    const { container } = render(<TextBlock>Content</TextBlock>)
    const wrapper = container.firstChild as HTMLElement
    expect(wrapper.className).toContain('rounded-xl')
    expect(wrapper.className).toContain('text-center')
  })

  it('renders different children correctly', () => {
    const { rerender } = render(<TextBlock>First message</TextBlock>)
    expect(screen.getByText('First message')).toBeInTheDocument()

    rerender(<TextBlock>Second message</TextBlock>)
    expect(screen.getByText('Second message')).toBeInTheDocument()
    expect(screen.queryByText('First message')).not.toBeInTheDocument()
  })
})
