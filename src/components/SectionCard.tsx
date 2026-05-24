import type { ReactNode } from 'react'

type SectionCardProps = {
  className: string
  hClassName: string
  label: string
  children: ReactNode
}

export function SectionCard({ className, hClassName, label, children }: SectionCardProps) {
  return (
    <div className={className}>
      <h2 className={hClassName}>
        {label}
      </h2>
      {children}
    </div>
  )
}