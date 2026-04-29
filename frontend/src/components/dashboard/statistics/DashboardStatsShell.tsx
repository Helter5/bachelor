import type { ReactNode } from "react"
import { DashboardBackButton } from "../layout/DashboardBackButton"
import { DashboardPanel } from "../layout/DashboardPanel"

interface DashboardStatsShellProps {
  isDarkMode: boolean
  backLabel: string
  onBack: () => void
  title: string
  subtitle: string
  headerAction?: ReactNode
  children: ReactNode
}

export function DashboardStatsShell({
  isDarkMode,
  backLabel,
  onBack,
  title,
  subtitle,
  headerAction,
  children,
}: DashboardStatsShellProps) {
  return (
    <div className="space-y-6">
      <DashboardBackButton isDarkMode={isDarkMode} onClick={onBack} label={backLabel} />

      <DashboardPanel isDarkMode={isDarkMode}>
        <div className="flex items-start justify-between mb-6 gap-4">
          <div>
            <h2 className={`text-2xl font-bold mb-2 ${isDarkMode ? "text-white" : "text-gray-900"}`}>
              {title}
            </h2>
            <p className={`text-sm ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}>
              {subtitle}
            </p>
          </div>
          {headerAction}
        </div>

        {children}
      </DashboardPanel>
    </div>
  )
}
