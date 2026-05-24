type PageHeaderProps = {
  label: string
  children: string
}

export function PageHeader({ label, children }: PageHeaderProps) {
  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
        {label}
      </h1>
      <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
        {children}
      </p>
    </div>
  )
}
