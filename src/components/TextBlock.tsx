type TextBlockProps = {
  children: string
}

export function TextBlock({ children }: TextBlockProps) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl p-8 text-center border border-gray-200 dark:border-gray-700 shadow-theme-sm">
      <p className="text-gray-500 dark:text-gray-400">
        {children}
      </p>
    </div>
  )
}
