import { describe, it, expect, vi } from 'vitest'
import { render } from '@testing-library/react'
import React from 'react'
import Home from './page'

const { redirect } = await import('next/navigation')

describe('Home page', () => {
  it('redirects to /upload', () => {
    render(<Home />)
    expect(redirect).toHaveBeenCalledWith('/upload')
  })
})
