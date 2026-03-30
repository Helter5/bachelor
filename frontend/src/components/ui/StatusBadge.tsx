import type { ReactNode } from "react"

type BadgeVariant = 'success' | 'info' | 'neutral' | 'warning' | 'danger' | 'purple'
type BadgeSize = 'sm' | 'md'

interface StatusBadgeProps {
  variant: BadgeVariant
  isDarkMode: boolean
  size?: BadgeSize
  children: ReactNode
  className?: string
}

const variantClasses: Record<BadgeVariant, { dark: string; light: string }> = {
  success: { dark: 'bg-green-900/30 text-green-400', light: 'bg-green-100 text-green-800' },
  info:    { dark: 'bg-blue-900/30 text-blue-400',   light: 'bg-blue-100 text-blue-800'   },
  neutral: { dark: 'bg-gray-700 text-gray-300',      light: 'bg-gray-100 text-gray-700'   },
  warning: { dark: 'bg-yellow-900/30 text-yellow-400', light: 'bg-yellow-100 text-yellow-800' },
  danger:  { dark: 'bg-red-900/30 text-red-400',     light: 'bg-red-100 text-red-800'     },
  purple:  { dark: 'bg-purple-500/20 text-purple-300', light: 'bg-purple-100 text-purple-700' },
}

const sizeClasses: Record<BadgeSize, string> = {
  sm: 'px-2 py-0.5',
  md: 'px-2.5 py-1',
}

export function StatusBadge({ variant, isDarkMode, size = 'sm', children, className }: StatusBadgeProps) {
  const colors = variantClasses[variant]
  return (
    <span className={`inline-flex items-center rounded-full text-xs font-medium ${sizeClasses[size]} ${isDarkMode ? colors.dark : colors.light} ${className ?? ''}`}>
      {children}
    </span>
  )
}
