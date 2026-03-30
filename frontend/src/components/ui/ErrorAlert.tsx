interface ErrorAlertProps {
  message: string
  isDarkMode: boolean
  className?: string
}

export function ErrorAlert({ message, isDarkMode, className }: ErrorAlertProps) {
  return (
    <div className={`p-4 rounded-lg ${isDarkMode ? 'bg-red-900/20 text-red-400' : 'bg-red-50 text-red-600'} ${className ?? ''}`}>
      {message}
    </div>
  )
}
