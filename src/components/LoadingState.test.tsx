import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import React from 'react'
import { LoadingState } from './LoadingState'

describe('LoadingState', () => {
  it('renders a spinner icon', () => {
    render(<LoadingState />)
    const svg = document.querySelector('svg')
    expect(svg).toBeInTheDocument()
  })

  it('renders within a centred container', () => {
    const { container } = render(<LoadingState />)
    const wrapper = container.firstChild as HTMLElement
    expect(wrapper.className).toContain('flex')
    expect(wrapper.className).toContain('items-center')
    expect(wrapper.className).toContain('justify-center')
  })

  it('applies animate-spin to the icon', () => {
    const { container } = render(<LoadingState />)
    const svg = container.querySelector('svg')
    expect(svg?.getAttribute('class')).toMatch(/animate-spin/)
  })
})
