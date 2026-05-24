import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import React from 'react'
import { SelectField } from './SelectField'

describe('SelectField', () => {
  const defaultProps = {
    value: 'expense',
    onChange: vi.fn(),
    className: 'w-full px-4 py-2.5 rounded-lg border',
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders a select element', () => {
    render(
      <SelectField {...defaultProps}>
        <option value="expense">Expense</option>
        <option value="income">Income</option>
      </SelectField>
    )
    expect(screen.getByRole('combobox')).toBeInTheDocument()
  })

  it('reflects the current value', () => {
    render(
      <SelectField {...defaultProps} value="income">
        <option value="expense">Expense</option>
        <option value="income">Income</option>
      </SelectField>
    )
    expect((screen.getByRole('combobox') as HTMLSelectElement).value).toBe('income')
  })

  it('calls onChange when selection changes', () => {
    render(
      <SelectField {...defaultProps}>
        <option value="expense">Expense</option>
        <option value="income">Income</option>
      </SelectField>
    )
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'income' } })
    expect(defaultProps.onChange).toHaveBeenCalledOnce()
  })

  it('applies className to the select element', () => {
    render(
      <SelectField {...defaultProps}>
        <option value="expense">Expense</option>
      </SelectField>
    )
    expect(screen.getByRole('combobox').className).toContain('rounded-lg')
  })

  it('renders all option children', () => {
    render(
      <SelectField {...defaultProps}>
        <option value="a">Alpha</option>
        <option value="b">Beta</option>
        <option value="c">Gamma</option>
      </SelectField>
    )
    expect(screen.getByRole('option', { name: 'Alpha' })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: 'Beta' })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: 'Gamma' })).toBeInTheDocument()
  })
})
