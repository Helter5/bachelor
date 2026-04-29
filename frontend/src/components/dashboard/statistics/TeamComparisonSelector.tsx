import { useMemo } from "react"
import { useTranslation } from "react-i18next"
import type { TeamPerformance } from "@/hooks/useEventStatistics"
import { Select } from "../../ui/Select"

interface TeamSelectorProps {
  isDarkMode: boolean
  label: string
  value: string
  onChange: (value: string) => void
  teams: TeamPerformance[]
  excludeName: string
}

export function TeamSelector({
  isDarkMode,
  label,
  value,
  onChange,
  teams,
  excludeName,
}: TeamSelectorProps) {
  const { t } = useTranslation()
  const teamOptions = useMemo(() => [
    { value: "", label: t("teamComparison.selectTeam") },
    ...teams
      .filter((team) => team.name !== excludeName)
      .map((team) => ({ value: team.name, label: team.country ? `${team.country} — ${team.name}` : team.name })),
  ], [teams, excludeName, t])

  return (
    <div className={`rounded-xl p-5 ${isDarkMode ? "bg-[#0f172a]/60 border border-white/5" : "bg-gray-50 border border-gray-200"}`}>
      <p className={`text-xs font-semibold uppercase tracking-wider mb-3 ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}>
        {label}
      </p>
      <Select
        value={value}
        onChange={onChange}
        options={teamOptions}
        isDarkMode={isDarkMode}
        className="w-full"
      />
      {value && (
        <div className={`mt-3 text-sm font-bold ${isDarkMode ? "text-white" : "text-gray-900"}`}>
          {value}
        </div>
      )}
    </div>
  )
}
