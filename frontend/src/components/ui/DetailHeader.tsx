import type { ReactNode } from "react"

interface DetailHeaderProps {
  isDarkMode: boolean
  onBack: () => void
  title: string
  subtitle?: string
  leading?: ReactNode
  className?: string
}

export function DetailHeader({ isDarkMode, onBack, title, subtitle, leading, className }: DetailHeaderProps) {
  return (
    <div className={`flex items-center gap-4 mb-6 ${className ?? ''}`}>
      <button
        onClick={onBack}
        className={`p-2 rounded-lg transition-all shrink-0 ${
          isDarkMode
            ? 'hover:bg-white/5 text-gray-300 hover:text-white'
            : 'hover:bg-gray-100 text-gray-600 hover:text-gray-900'
        }`}
      >
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
        </svg>
      </button>
      {leading}
      <div>
        <h3 className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
          {title}
        </h3>
        {subtitle && (
          <p className={`text-sm mt-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            {subtitle}
          </p>
        )}
      </div>
    </div>
  )
}
