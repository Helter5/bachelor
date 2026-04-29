import { useTranslation } from "react-i18next"
import type { ReactNode } from "react"
import type { TeamPerformance } from "@/hooks/useEventStatistics"

interface TeamComparisonResultsProps {
  isDarkMode: boolean
  team1: TeamPerformance
  team2: TeamPerformance
}

interface StatRowProps {
  label: string
  v1: ReactNode
  v2: ReactNode
  isDarkMode: boolean
  higherIsBetter?: boolean
  suffix?: string
}

function StatRow({ label, v1, v2, isDarkMode, higherIsBetter = true, suffix = "" }: StatRowProps) {
  const n1 = typeof v1 === "number" || typeof v1 === "string" ? parseFloat(String(v1)) : NaN
  const n2 = typeof v2 === "number" || typeof v2 === "string" ? parseFloat(String(v2)) : NaN
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

function TeamNameBlock({
  isDarkMode,
  team,
  align,
}: {
  isDarkMode: boolean
  team: TeamPerformance
  align: "left" | "right"
}) {
  return (
    <div className={`flex-1 py-4 px-6 font-bold text-lg ${align === "right" ? "text-right" : "text-left"} ${isDarkMode ? "text-white" : "text-gray-900"}`}>
      {team.country && (
        <span className={`fi fi-${team.country.toLowerCase()} rounded-sm mr-2`} style={{ fontSize: "1rem" }} />
      )}
      {team.name}
    </div>
  )
}

function TeamValue({ value, highlight, isDarkMode, align }: { value: number | string; highlight: boolean; isDarkMode: boolean; align: "left" | "right" }) {
  return (
    <span className={`flex-1 text-sm font-semibold ${align === "right" ? "text-right" : "text-left"} ${highlight ? "text-green-500" : isDarkMode ? "text-gray-200" : "text-gray-800"}`}>
      {value}
    </span>
  )
}

function FinishBreakdown({
  title,
  team1Map,
  team2Map,
  isDarkMode,
}: {
  title: string
  team1Map: Record<string, number>
  team2Map: Record<string, number>
  isDarkMode: boolean
}) {
  const { t } = useTranslation()
  const types = Array.from(new Set([...Object.keys(team1Map), ...Object.keys(team2Map)])).sort()

  return (
    <div className={`rounded-xl overflow-hidden ${isDarkMode ? "bg-[#0f172a]/80 border border-white/5" : "bg-gray-50 border border-gray-200"}`}>
      <div className={`px-6 py-4 border-b ${isDarkMode ? "border-white/5" : "border-gray-200"}`}>
        <h3 className={`text-sm font-bold ${isDarkMode ? "text-white" : "text-gray-900"}`}>{title}</h3>
      </div>
      {types.length === 0 ? (
        <div className={`px-6 py-5 text-sm ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}>
          {t("teamComparison.noFinishData")}
        </div>
      ) : (
        types.map((type) => {
          const v1 = team1Map[type] ?? 0
          const v2 = team2Map[type] ?? 0
          return (
            <div key={type} className={`flex items-center py-3 px-6 border-b last:border-b-0 ${isDarkMode ? "border-white/5" : "border-gray-100"}`}>
              <TeamValue value={v1} highlight={v1 > v2} isDarkMode={isDarkMode} align="right" />
              <span className={`w-40 text-center text-xs font-semibold uppercase tracking-wider ${isDarkMode ? "text-gray-500" : "text-gray-400"}`}>
                {type}
              </span>
              <TeamValue value={v2} highlight={v2 > v1} isDarkMode={isDarkMode} align="left" />
            </div>
          )
        })
      )}
    </div>
  )
}

function TopPerformerLabel({ team }: { team: TeamPerformance }) {
  if (!team.top_performer) return <>-</>
  return (
    <>
      {team.top_performer.name} · {team.top_performer.wins}/{team.top_performer.total_fights}
    </>
  )
}

export function TeamComparisonResults({ isDarkMode, team1, team2 }: TeamComparisonResultsProps) {
  const { t } = useTranslation()

  return (
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
        <StatRow label={t("teamComparison.avgTpFor")} v1={team1.avg_tp_for.toFixed(1)} v2={team2.avg_tp_for.toFixed(1)} isDarkMode={isDarkMode} />
        <StatRow label={t("teamComparison.avgTpAgainst")} v1={team1.avg_tp_against.toFixed(1)} v2={team2.avg_tp_against.toFixed(1)} isDarkMode={isDarkMode} higherIsBetter={false} />
        <StatRow label={t("teamComparison.avgCpFor")} v1={team1.avg_cp_for.toFixed(1)} v2={team2.avg_cp_for.toFixed(1)} isDarkMode={isDarkMode} />
        <StatRow label={t("teamComparison.avgCpAgainst")} v1={team1.avg_cp_against.toFixed(1)} v2={team2.avg_cp_against.toFixed(1)} isDarkMode={isDarkMode} higherIsBetter={false} />
        <StatRow label={t("teamComparison.topFinish")} v1={team1.dominant_victory_type ?? "-"} v2={team2.dominant_victory_type ?? "-"} isDarkMode={isDarkMode} />
        <StatRow label={t("teamComparison.topPerformer")} v1={<TopPerformerLabel team={team1} />} v2={<TopPerformerLabel team={team2} />} isDarkMode={isDarkMode} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
        <FinishBreakdown
          title={t("teamComparison.winsByType")}
          team1Map={team1.wins_by_type}
          team2Map={team2.wins_by_type}
          isDarkMode={isDarkMode}
        />
        <FinishBreakdown
          title={t("teamComparison.lossesByType")}
          team1Map={team1.losses_by_type}
          team2Map={team2.losses_by_type}
          isDarkMode={isDarkMode}
        />
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
  )
}
