import type { ReactNode } from 'react'

type PageHeadingProps = {
  className: string
  label: string
  children: ReactNode
}

export function PageHeading({ className, label, children }: PageHeadingProps) {
  return (
    <div className={className}>
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
        {label}
      </h1>
      {children}
    </div>
  )
}