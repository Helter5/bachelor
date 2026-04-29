import { useState, useMemo } from "react"
import { useTranslation } from "react-i18next"
import { useEvents } from "@/hooks/useEvents"
import { useEventStatistics } from "@/hooks/useEventStatistics"
import { Select } from "../../ui/Select"
import { DashboardStatsShell } from "./DashboardStatsShell"
import { TeamSelector } from "./TeamComparisonSelector"
import { TeamComparisonResults } from "./TeamComparisonResults"

interface TeamComparisonViewProps {
  isDarkMode: boolean
  onBack: () => void
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
          <TeamComparisonResults isDarkMode={isDarkMode} team1={team1} team2={team2} />
        )}
    </DashboardStatsShell>
  )
}
