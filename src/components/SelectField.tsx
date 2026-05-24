'use client'

import type { ReactNode, ChangeEventHandler } from 'react'

type SelectFieldProps = {
  value: string | number
  onChange: ChangeEventHandler<HTMLSelectElement>
  className: string
  children: ReactNode
}

export function SelectField({ value, onChange, className, children }: SelectFieldProps) {
  return (
    <select value={value} onChange={onChange} className={className}>
      {children}
    </select>
  )
}