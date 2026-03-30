// variant "center" — spinner above text, centered (used in tabs)
// variant "inline" — spinner and text side by side (used in list views)

interface LoadingSpinnerProps {
  isDarkMode: boolean
  text?: string
  variant?: 'center' | 'inline'
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

const spinnerSize = { sm: 'h-6 w-6', md: 'h-8 w-8', lg: 'h-12 w-12' }

export function LoadingSpinner({ isDarkMode, text, variant = 'center', size = 'lg', className }: LoadingSpinnerProps) {
  if (variant === 'inline') {
    return (
      <div className={`p-8 rounded-lg text-center ${isDarkMode ? 'bg-[#1e293b]' : 'bg-white'} ${className ?? ''}`}>
        <div className="flex items-center justify-center gap-3">
          <div className={`animate-spin rounded-full border-b-2 border-blue-500 ${spinnerSize[size] ?? spinnerSize.md}`} />
          {text && <span className={isDarkMode ? 'text-gray-300' : 'text-gray-600'}>{text}</span>}
        </div>
      </div>
    )
  }

  return (
    <div className={`text-center py-12 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'} ${className ?? ''}`}>
      <div className={`animate-spin rounded-full border-b-2 border-blue-500 mx-auto mb-4 ${spinnerSize[size] ?? spinnerSize.lg}`} />
      {text && <p>{text}</p>}
    </div>
  )
}
