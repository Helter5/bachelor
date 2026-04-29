import { useState, useMemo } from "react"
import { useTranslation } from "react-i18next"
import { useEvents } from "@/hooks/useEvents"
import { useEventStatistics } from "@/hooks/useEventStatistics"
import type { TeamPerformance } from "@/hooks/useEventStatistics"
import { Select } from "../../ui/Select"
import { DashboardStatsShell } from "./DashboardStatsShell"

interface TeamComparisonViewProps {
  isDarkMode: boolean
  onBack: () => void
}

interface StatRowProps {
  label: string
  v1: number | string
  v2: number | string
  isDarkMode: boolean
  higherIsBetter?: boolean
  suffix?: string
}

function StatRow({ label, v1, v2, isDarkMode, higherIsBetter = true, suffix = "" }: StatRowProps) {
  const n1 = typeof v1 === "number" ? v1 : parseFloat(String(v1))
  const n2 = typeof v2 === "number" ? v2 : parseFloat(String(v2))
  const valid = !isNaN(n1) && !isNaN(n2) && n1 !== n2
  const p1better = valid && (higherIsBetter ? n1 > n2 : n1 < n2)
  const p2better = valid && (higherIsBetter ? n2 > n1 : n2 < n1)

  return (
    <div className={`flex items-center py-3 px-6 border-b last:border-b-0 ${isDarkMode ? "border-white/5" : "border-gray-100"}`}>
      <span className={`flex-1 text-right text-sm font-semibold ${p1better ? "text-green-500" : isDarkMode ? "text-gray-200" : "text-gray-800"}`}>
        {v1}{suffix}
      </span>
      <span className={`w-40 text-center text-xs font-medium uppercase tracking-wider ${isDarkMode ? "text-gray-500" : "text-gray-400"}`}>
        {label}
      </span>
      <span className={`flex-1 text-left text-sm font-semibold ${p2better ? "text-green-500" : isDarkMode ? "text-gray-200" : "text-gray-800"}`}>
        {v2}{suffix}
      </span>
    </div>
  )
}

function TeamSelector({
  isDarkMode,
  label,
  value,
  onChange,
  teams,
  excludeName,
}: {
  isDarkMode: boolean
  label: string
  value: string
  onChange: (v: string) => void
  teams: TeamPerformance[]
  excludeName: string
}) {
  const { t } = useTranslation()
  const teamOptions = useMemo(() => [
    { value: "", label: t("teamComparison.selectTeam") },
    ...teams
      .filter((t) => t.name !== excludeName)
      .map((t) => ({ value: t.name, label: t.country ? `${t.country} — ${t.name}` : t.name })),
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

function TeamNameBlock({
  isDarkMode,
  team,
  align,
}: {
  isDarkMode: boolean
  team: TeamPerformance
  align: 'left' | 'right'
}) {
  return (
    <div className={`flex-1 py-4 px-6 font-bold text-lg ${align === 'right' ? 'text-right' : 'text-left'} ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
      {team.country && (
        <span className={`fi fi-${team.country.toLowerCase()} rounded-sm mr-2`} style={{ fontSize: '1rem' }} />
      )}
      {team.name}
    </div>
  )
}

export function TeamComparisonView({ isDarkMode, onBack }: TeamComparisonViewProps) {
  const { t } = useTranslation()
  const events = useEvents()
  const [selectedEventId, setSelectedEventId] = useState<number | null>(null)
  const [team1Name, setTeam1Name] = useState("")
  const [team2Name, setTeam2Name] = useState("")
  const [showResults, setShowResults] = useState(false)

  const { stats, loading } = useEventStatistics(selectedEventId)
  const teams = stats?.team_performance ?? []

  const team1 = teams.find((t) => t.name === team1Name) ?? null
  const team2 = teams.find((t) => t.name === team2Name) ?? null
  const canCompare = !!team1 && !!team2 && team1Name !== team2Name

  const eventOptions = useMemo(() => [
    { value: 0, label: t("common.selectTournament") },
    ...events.map((e) => ({ value: e.id, label: e.name })),
  ], [events, t])

  const handleEventChange = (id: number) => {
    setSelectedEventId(id === 0 ? null : id)
    setTeam1Name("")
    setTeam2Name("")
    setShowResults(false)
  }

  const handleCompare = () => {
    if (canCompare) setShowResults(true)
  }

  const handleReset = () => {
    setTeam1Name("")
    setTeam2Name("")
    setShowResults(false)
  }

  const handleTeam1Change = (value: string) => {
    setTeam1Name(value)
    setShowResults(false)
  }

  const handleTeam2Change = (value: string) => {
    setTeam2Name(value)
    setShowResults(false)
  }

  return (
    <DashboardStatsShell
      isDarkMode={isDarkMode}
      onBack={onBack}
      backLabel={t("teamComparison.backToCategories")}
      title={t("teamComparison.title")}
      subtitle={t("teamComparison.subtitle")}
    >
        <div className="mb-6">
          <label className={`block text-sm font-medium mb-2 ${isDarkMode ? "text-gray-300" : "text-gray-700"}`}>
            {t("teamComparison.tournament")}
          </label>
          <Select
            value={selectedEventId ?? 0}
            onChange={handleEventChange}
            options={eventOptions}
            isDarkMode={isDarkMode}
            className="w-full max-w-md"
          />
        </div>

        {loading && (
          <div className={`text-sm ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}>
            {t("teamComparison.loadingTeams")}
          </div>
        )}

        {!loading && selectedEventId && teams.length === 0 && (
          <div className={`text-sm ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}>
            {t("teamComparison.noTeams")}
          </div>
        )}

        {!loading && teams.length >= 2 && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <TeamSelector
                isDarkMode={isDarkMode}
                label={t("teamComparison.team1")}
                value={team1Name}
                onChange={handleTeam1Change}
                teams={teams}
                excludeName={team2Name}
              />
              <TeamSelector
                isDarkMode={isDarkMode}
                label={t("teamComparison.team2")}
                value={team2Name}
                onChange={handleTeam2Change}
                teams={teams}
                excludeName={team1Name}
              />
            </div>

            <div className="flex items-center gap-3">
              <button
                disabled={!canCompare}
                onClick={handleCompare}
                className={`px-6 py-2.5 rounded-lg font-medium transition-all ${
                  canCompare
                    ? "bg-blue-600 text-white hover:bg-blue-700 active:scale-95"
                    : isDarkMode
                      ? "bg-gray-700 text-gray-500 cursor-not-allowed"
                      : "bg-gray-200 text-gray-400 cursor-not-allowed"
                }`}
              >
                {t("teamComparison.compareButton")}
              </button>
              {showResults && (
                <button
                  onClick={handleReset}
                  className={`px-6 py-2.5 rounded-lg font-medium transition-all ${
                    isDarkMode
                      ? "bg-[#0f172a]/50 text-gray-300 hover:bg-[#0f172a] border border-white/10"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-200"
                  }`}
                >
                  {t("teamComparison.cancelButton")}
                </button>
              )}
            </div>
          </>
        )}

        {showResults && team1 && team2 && (
          <div className="mt-8">
            <div className={`rounded-xl overflow-hidden ${isDarkMode ? "bg-[#0f172a]/80 border border-white/5" : "bg-gray-50 border border-gray-200"}`}>
              <div className="flex items-center">
                <TeamNameBlock isDarkMode={isDarkMode} team={team1} align="right" />
                <div className={`w-40 text-center py-4 font-black text-sm ${isDarkMode ? "text-gray-500" : "text-gray-400"} uppercase tracking-widest`}>
                  vs
                </div>
                <TeamNameBlock isDarkMode={isDarkMode} team={team2} align="left" />
              </div>

              <div className={`h-px ${isDarkMode ? "bg-white/5" : "bg-gray-200"}`} />

              <StatRow label={t("teamComparison.statFights")} v1={team1.total_fights} v2={team2.total_fights} isDarkMode={isDarkMode} />
              <StatRow label={t("teamComparison.statWins")} v1={team1.wins} v2={team2.wins} isDarkMode={isDarkMode} />
              <StatRow label={t("teamComparison.statLosses")} v1={team1.losses} v2={team2.losses} isDarkMode={isDarkMode} higherIsBetter={false} />
              <StatRow label={t("teamComparison.statWinRate")} v1={team1.win_rate.toFixed(1)} v2={team2.win_rate.toFixed(1)} isDarkMode={isDarkMode} suffix="%" />
            </div>

            {team1.win_rate !== team2.win_rate && (
              <div className={`mt-4 text-center text-sm ${isDarkMode ? "text-gray-400" : "text-gray-600"}`}>
                {team1.win_rate > team2.win_rate
                  ? t("teamComparison.betterWinRate", { name: team1.name, diff: (team1.win_rate - team2.win_rate).toFixed(1) })
                  : t("teamComparison.betterWinRate", { name: team2.name, diff: (team2.win_rate - team1.win_rate).toFixed(1) })
                }
              </div>
            )}
          </div>
        )}
    </DashboardStatsShell>
  )
}
