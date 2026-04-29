import { useState, useEffect, useRef, useMemo } from "react"
import { useTranslation } from "react-i18next"
import { useRankingCategories, useRankingData } from "@/hooks/useRankingData"
import type { RankingEntry } from "@/hooks/useRankingData"
import { LoadingSpinner } from "../../ui/LoadingSpinner"
import { EmptyState } from "../../ui/EmptyState"
import { Select } from "../../ui/Select"
import { DashboardStatsShell } from "./DashboardStatsShell"

interface RankingTableRowProps {
  isDarkMode: boolean
  entry: RankingEntry
  onSelectPerson?: (person: { id: number; name: string }) => void
}

function RankingTableRow({ isDarkMode, entry, onSelectPerson }: RankingTableRowProps) {
  const { t } = useTranslation()
  const [expanded, setExpanded] = useState(false)

  return (
    <>
      <tr
        className={`border-b last:border-b-0 cursor-pointer transition-colors ${
          isDarkMode ? 'border-white/5 hover:bg-white/5' : 'border-gray-100 hover:bg-gray-50'
        } ${expanded ? (isDarkMode ? 'bg-white/5' : 'bg-gray-50') : ''}`}
        onClick={() => setExpanded(!expanded)}
      >
        <td className="py-3 px-3 text-center">
          <span className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold ${
            entry.rank === 1 ? 'bg-yellow-500/20 text-yellow-500' :
            entry.rank === 2 ? 'bg-gray-300/20 text-gray-400' :
            entry.rank === 3 ? 'bg-orange-500/20 text-orange-500' :
            isDarkMode ? 'text-gray-400' : 'text-gray-500'
          }`}>
            {entry.rank}
          </span>
        </td>
        <td className={`py-3 px-4 text-sm font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
          {onSelectPerson ? (
            <button
              onClick={(e) => { e.stopPropagation(); onSelectPerson({ id: entry.person_id, name: entry.full_name }) }}
              className={`hover:underline text-left ${isDarkMode ? 'text-blue-400 hover:text-blue-300' : 'text-blue-600 hover:text-blue-700'}`}
            >
              {entry.full_name}
            </button>
          ) : (
            entry.full_name
          )}
        </td>
        <td className="py-3 px-3 text-center">
          {entry.country_iso_code ? (
            <span className={`fi fi-${entry.country_iso_code.toLowerCase()} rounded-sm`} style={{ fontSize: '1.1rem' }} />
          ) : (
            <span className={`text-xs ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>-</span>
          )}
        </td>
        <td className={`py-3 px-4 text-center text-sm font-bold ${isDarkMode ? 'text-purple-400' : 'text-purple-600'}`}>
          {entry.total_score}
        </td>
        <td className={`py-3 px-3 text-center text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
          {entry.tournaments_counted}
        </td>
        <td className={`py-3 px-4 text-center text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
          <span className="text-green-500 font-medium">{entry.total_wins}</span>
          <span className={isDarkMode ? 'text-gray-500' : 'text-gray-400'}>/</span>
          <span className={`font-medium ${isDarkMode ? 'text-red-400' : 'text-red-500'}`}>{entry.total_fights - entry.total_wins}</span>
        </td>
        <td className="py-3 px-3 text-center">
          <svg className={`w-4 h-4 inline-block transition-transform ${expanded ? 'rotate-180' : ''} ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </td>
      </tr>
      {expanded && (
        <tr>
          <td colSpan={7} className={`px-4 pb-4 ${isDarkMode ? 'bg-[#0f172a]/50' : 'bg-gray-50'}`}>
            <div className="pt-2">
              <h4 className={`text-xs font-semibold uppercase tracking-wider mb-3 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                {t("ranking.breakdown")}
              </h4>
              <div className="space-y-2">
                {entry.breakdown.map((b) => (
                  <RankingBreakdownItem key={b.event_name} isDarkMode={isDarkMode} breakdown={b} />
                ))}
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  )
}

function RankingBreakdownItem({
  isDarkMode,
  breakdown,
}: {
  isDarkMode: boolean
  breakdown: RankingEntry["breakdown"][number]
}) {
  return (
    <div className={`flex items-center justify-between rounded-lg px-4 py-2.5 text-sm ${isDarkMode ? 'bg-white/5' : 'bg-white border border-gray-100'}`}>
      <div className="flex-1">
        <span className={`font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{breakdown.event_name}</span>
        {breakdown.start_date && (
          <span className={`ml-2 text-xs ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>{breakdown.start_date}</span>
        )}
      </div>
      <div className="flex items-center gap-4 text-xs">
        <span className={isDarkMode ? 'text-gray-400' : 'text-gray-500'}>{breakdown.wins}/{breakdown.total_fights} V</span>
        <span className={isDarkMode ? 'text-gray-400' : 'text-gray-500'}>Perf: {breakdown.performance_points}</span>
        <span className={isDarkMode ? 'text-gray-400' : 'text-gray-500'}>Bonus: {breakdown.victory_bonus}</span>
        <span className={isDarkMode ? 'text-gray-400' : 'text-gray-500'}>x{breakdown.recency_weight}</span>
        <span className={`font-bold ${isDarkMode ? 'text-purple-400' : 'text-purple-600'}`}>{breakdown.weighted_score}b</span>
      </div>
    </div>
  )
}

function RankingMethodologyModal({ isDarkMode, t, onClose }: { isDarkMode: boolean; t: (key: string) => string; onClose: () => void }) {
  const scoreSteps = [
    { code: 'VFA / VFA1', label: 'Tušírovanie (pád)', points: '+5b' },
    { code: 'VSU / VSU1', label: 'Technická prevaha', points: '+3b' },
    { code: 'VPO / VPO1', label: 'Na body', points: '+1b' },
    { code: 'VIN, VFO, VCA, ...', label: 'Ostatné výhry', points: '+2b' },
    { code: 'DSQ, 2DSQ, ...', label: 'Diskvalifikácie', points: '+0b' },
  ]

  const recencyWeights = [
    { label: t("ranking.methodology.newestLabel"), weight: "x1.0" },
    { label: "2.", weight: "x0.7" },
    { label: "3.", weight: "x0.4" },
    { label: "4.", weight: "x0.2" },
    { label: "5.", weight: "x0.1" },
  ]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      <div className={`relative max-w-lg w-full rounded-2xl p-6 shadow-2xl max-h-[80vh] overflow-y-auto ${isDarkMode ? 'bg-[#1e293b] border border-white/10' : 'bg-white'}`} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className={`text-lg font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
            {t("ranking.methodology.title")}
          </h3>
          <button
            onClick={onClose}
            className={`p-1 rounded-lg transition-colors ${isDarkMode ? 'hover:bg-white/10 text-gray-400' : 'hover:bg-gray-100 text-gray-500'}`}
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className={`space-y-4 text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
          <div>
            <h4 className={`font-semibold mb-1 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{t("ranking.methodology.step1Title")}</h4>
            <p>{t("ranking.methodology.step1Desc")}</p>
            <div className={`mt-2 rounded-lg p-3 font-mono text-xs ${isDarkMode ? 'bg-black/30' : 'bg-gray-50'}`}>
              {t("ranking.methodology.step1Formula")}
            </div>
          </div>
          <div>
            <h4 className={`font-semibold mb-1 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{t("ranking.methodology.step2Title")}</h4>
            <div className={`rounded-lg p-3 font-mono text-xs ${isDarkMode ? 'bg-black/30' : 'bg-gray-50'}`}>
              {t("ranking.methodology.step2Formula")}
            </div>
            <p className="mt-1">{t("ranking.methodology.step2Note")}</p>
          </div>
          <div>
            <h4 className={`font-semibold mb-1 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{t("ranking.methodology.step3Title")}</h4>
            <p className="mb-2">{t("ranking.methodology.step3Desc")}</p>
            <div className={`rounded-lg overflow-hidden ${isDarkMode ? 'border border-white/10' : 'border border-gray-200'}`}>
              <table className="w-full text-xs">
                <tbody>
                  {scoreSteps.map((row, index) => (
                    <tr key={row.code} className={index < scoreSteps.length - 1 ? `border-b ${isDarkMode ? 'border-white/5' : 'border-gray-100'}` : ''}>
                      <td className={`px-3 py-1.5 font-medium ${isDarkMode ? 'text-purple-400' : 'text-purple-600'}`}>{row.code}</td>
                      <td className="px-3 py-1.5">{row.label}</td>
                      <td className={`px-3 py-1.5 text-right font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{row.points}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          <div>
            <h4 className={`font-semibold mb-1 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{t("ranking.methodology.step4Title")}</h4>
            <p>{t("ranking.methodology.step4Desc")}</p>
            <div className="flex gap-2 mt-2">
              {recencyWeights.map((weight) => (
                <div key={weight.label} className={`flex-1 text-center rounded-lg py-1.5 ${isDarkMode ? 'bg-black/30' : 'bg-gray-50'}`}>
                  <div className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>{weight.label}</div>
                  <div className={`font-bold text-xs ${isDarkMode ? 'text-purple-400' : 'text-purple-600'}`}>{weight.weight}</div>
                </div>
              ))}
            </div>
          </div>
          <div>
            <h4 className={`font-semibold mb-1 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{t("ranking.methodology.step5Title")}</h4>
            <div className={`rounded-lg p-3 font-mono text-xs ${isDarkMode ? 'bg-black/30' : 'bg-gray-50'}`}>
              {t("ranking.methodology.step5Formula")}
            </div>
          </div>
        </div>

        <button onClick={onClose} className="mt-6 w-full py-2.5 rounded-lg font-medium text-sm bg-purple-600 hover:bg-purple-700 text-white transition-all">
          {t("ranking.methodology.confirmButton")}
        </button>
      </div>
    </div>
  )
}

interface RankingViewProps {
  isDarkMode: boolean
  onSelectPerson?: (person: { id: number; name: string }) => void
  onBack: () => void
}

export function RankingView({ isDarkMode, onSelectPerson, onBack }: RankingViewProps) {
  const { t } = useTranslation()
  const categories = useRankingCategories()
  const [selectedRankingCategory, setSelectedRankingCategory] = useState("")
  const [lastN, setLastN] = useState(3)
  const [dateFrom, setDateFrom] = useState("")
  const [showRankingExplanation, setShowRankingExplanation] = useState(false)
  const dateInputRef = useRef<HTMLInputElement>(null)

  const { data: rankingData, loading: rankingLoading } = useRankingData(selectedRankingCategory, lastN, dateFrom || undefined)

  const categoryOptions = useMemo(
    () => categories.map((cat) => ({ value: cat, label: cat })),
    [categories]
  )

  const lastNOptions = useMemo(
    () => [1, 2, 3, 4, 5].map((n) => ({ value: n, label: String(n) })),
    []
  )

  useEffect(() => {
    if (categories.length > 0 && !selectedRankingCategory) {
      setSelectedRankingCategory(categories[0])
    }
  }, [categories, selectedRankingCategory])

  return (
    <DashboardStatsShell
      isDarkMode={isDarkMode}
      onBack={onBack}
      backLabel={t("ranking.backToCategories")}
      title={t("ranking.title")}
      subtitle={t("ranking.subtitle")}
      headerAction={(
        <button
          onClick={() => setShowRankingExplanation(true)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
            isDarkMode
              ? 'bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white border border-white/10'
              : 'bg-gray-100 hover:bg-gray-200 text-gray-600 hover:text-gray-900 border border-gray-200'
          }`}
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          {t("ranking.explainButton")}
        </button>
      )}
    >

        {showRankingExplanation && (
          <RankingMethodologyModal
            isDarkMode={isDarkMode}
            t={t}
            onClose={() => setShowRankingExplanation(false)}
          />
        )}

        <div className="flex flex-wrap items-start gap-4 mb-6">
          <div className="flex flex-col">
            <label className={`block text-sm font-medium mb-1.5 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
              {t("ranking.weightCategory")}
            </label>
            <Select
              value={selectedRankingCategory}
              onChange={setSelectedRankingCategory}
              options={categoryOptions}
              isDarkMode={isDarkMode}
            />
          </div>
          <div className="flex flex-col">
            <label className={`block text-sm font-medium mb-1.5 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
              {t("ranking.tournamentCount")}
            </label>
            <Select
              value={lastN}
              onChange={setLastN}
              options={lastNOptions}
              isDarkMode={isDarkMode}
            />
          </div>
          <div className="flex flex-col">
            <label className={`block text-sm font-medium mb-1.5 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
              {t("ranking.dateFrom")}
            </label>
            <div className="relative">
              <input
                ref={dateInputRef}
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                onClick={() => dateInputRef.current?.showPicker()}
                style={{ colorScheme: isDarkMode ? 'dark' : 'light' }}
                className={`h-9 px-3 rounded-lg text-sm border cursor-pointer ${
                  'date-input-calendar '
                }${
                  isDarkMode ? 'date-input-calendar--dark ' : ''
                }${
                  'pr-8 '
                } ${
                  isDarkMode
                    ? 'bg-[#0f172a] text-white border-white/10 focus:border-purple-500'
                    : 'bg-white text-gray-900 border-gray-300 focus:border-purple-500'
                } focus:outline-none`}
              />
              {!dateFrom && (
                <svg
                  className={`absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none ${
                    isDarkMode ? 'text-white' : 'text-gray-500'
                  }`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10m-12 9h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v11a2 2 0 002 2z" />
                </svg>
              )}
              {dateFrom && (
                <button
                  onClick={() => setDateFrom("")}
                  title={t("ranking.clearFilter")}
                  className={`absolute right-2 top-1/2 -translate-y-1/2 rounded transition-colors ${
                    isDarkMode ? 'text-gray-400 hover:text-white' : 'text-gray-400 hover:text-gray-700'
                  }`}
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
          </div>
        </div>

        {rankingLoading && (
          <LoadingSpinner variant="center" size="sm" text={t("ranking.loading")} isDarkMode={isDarkMode} />
        )}

        {!rankingLoading && rankingData.length === 0 && selectedRankingCategory && (
          <EmptyState icon="document" title={t("ranking.noData")} isDarkMode={isDarkMode} />
        )}

        {!rankingLoading && rankingData.length > 0 && (
          <div className={`rounded-lg overflow-hidden ${isDarkMode ? 'shadow-lg' : 'border border-gray-200'}`}>
            <table className="w-full">
              <thead>
                <tr className={`border-b ${isDarkMode ? 'border-white/5 bg-white/5' : 'border-gray-200 bg-gray-50'}`}>
                  <th className={`text-center py-3 px-3 text-sm font-semibold w-12 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>#</th>
                  <th className={`text-left py-3 px-4 text-sm font-semibold ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>{t("ranking.tableHeaders.name")}</th>
                  <th className={`text-center py-3 px-3 text-sm font-semibold ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>{t("ranking.tableHeaders.country")}</th>
                  <th className={`text-center py-3 px-4 text-sm font-semibold ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>{t("ranking.tableHeaders.score")}</th>
                  <th className={`text-center py-3 px-3 text-sm font-semibold ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>{t("ranking.tableHeaders.tournaments")}</th>
                  <th className={`text-center py-3 px-4 text-sm font-semibold ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>{t("ranking.tableHeaders.wl")}</th>
                  <th className={`text-center py-3 px-3 text-sm font-semibold w-12 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}></th>
                </tr>
              </thead>
              <tbody>
                {rankingData.map((entry) => (
                  <RankingTableRow
                    key={entry.person_id}
                    isDarkMode={isDarkMode}
                    entry={entry}
                    onSelectPerson={onSelectPerson}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
    </DashboardStatsShell>
  )
}
