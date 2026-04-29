import { useTranslation } from "react-i18next"
import type { CommonOpponent } from "./comparisonTypes"

interface CommonOpponentCardProps {
  isDarkMode: boolean
  opp: CommonOpponent
  person1Name: string
  person2Name: string
}

export function CommonOpponentCard({ isDarkMode, opp, person1Name, person2Name }: CommonOpponentCardProps) {
  const { t } = useTranslation()

  return (
    <div className={`rounded-lg p-5 ${isDarkMode ? "bg-[#0f172a]/60 border border-white/5" : "bg-gray-50 border border-gray-200"}`}>
      <div className={`text-sm font-bold mb-4 flex items-center gap-1.5 ${isDarkMode ? "text-white" : "text-gray-900"}`}>
        vs
        {opp.opponent.country && (
          <span className={`fi fi-${opp.opponent.country.toLowerCase()} rounded-sm`} style={{ fontSize: "0.9rem" }} />
        )}
        {opp.opponent.name}
      </div>
      <div className="grid grid-cols-2 gap-4">
        {[
          { name: person1Name, summary: opp.person1_summary },
          { name: person2Name, summary: opp.person2_summary },
        ].map(({ name, summary }) => (
          <div key={name} className={`rounded-lg p-3 ${isDarkMode ? "bg-white/5" : "bg-white border border-gray-100"}`}>
            <div className={`text-xs font-medium mb-2 ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}>{name}</div>
            {summary && summary.wins !== undefined ? (
              <div className="flex items-center gap-3">
                <span className="text-green-500 font-bold text-lg">{summary.wins}V</span>
                <span className={`font-bold text-lg ${isDarkMode ? "text-red-400" : "text-red-500"}`}>{summary.losses}P</span>
                {(summary.avg_cp ?? 0) > 0 && (
                  <span className={`text-xs ${isDarkMode ? "text-gray-500" : "text-gray-400"}`}>Ø CP: {summary.avg_cp}</span>
                )}
                {(summary.avg_tp ?? 0) > 0 && (
                  <span className={`text-xs ${isDarkMode ? "text-gray-500" : "text-gray-400"}`}>Ø TP: {summary.avg_tp}</span>
                )}
              </div>
            ) : (
              <span className={`text-xs ${isDarkMode ? "text-gray-500" : "text-gray-400"}`}>{t("comparison.noFights")}</span>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
