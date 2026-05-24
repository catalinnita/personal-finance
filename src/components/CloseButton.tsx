'use client'

import { X } from 'lucide-react'

type CloseButtonProps = {
  onClick: () => void
  className: string
  xClassName: string
}

export function CloseButton({ onClick, className, xClassName }: CloseButtonProps) {
  return (
    <button onClick={onClick} className={className}>
      <X className={xClassName} />
    </button>
  )
}
