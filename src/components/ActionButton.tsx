'use client'

import type { ReactNode } from 'react'

type ActionButtonProps = {
  onClick: () => void
  disabled: boolean
  className: string
  children: ReactNode
}

export function ActionButton({ onClick, disabled, className, children }: ActionButtonProps) {
  return (
    <button onClick={onClick} disabled={disabled} className={className}>
      {children}
    </button>
  )
}