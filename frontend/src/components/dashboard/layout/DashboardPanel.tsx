import type { ReactNode } from "react"

interface DashboardPanelProps {
  isDarkMode: boolean
  children: ReactNode
  className?: string
  padding?: "p-6" | "p-8"
}

export function DashboardPanel({
  isDarkMode,
  children,
  className = "",
  padding = "p-8",
}: DashboardPanelProps) {
  return (
    <div className={`rounded-xl ${padding} ${isDarkMode ? "bg-dark-surface" : "bg-white border border-gray-200"} shadow-lg ${className}`}>
      {children}
    </div>
  )
}
