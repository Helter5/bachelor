import { useState, useEffect, useRef } from "react"
import { useRankingCategories, useRankingData } from "@/hooks/useRankingData"
import type { RankingEntry } from "@/hooks/useRankingData"

interface RankingTableRowProps {
  isDarkMode: boolean
  entry: RankingEntry
  onSelectPerson?: (person: { id: number; name: string }) => void
}

function RankingTableRow({ isDarkMode, entry, onSelectPerson }: RankingTableRowProps) {
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
                Rozpis po turnajoch (detail)
              </h4>
              <div className="space-y-2">
                {entry.breakdown.map((b, idx) => (
                  <div
                    key={idx}
                    className={`flex items-center justify-between rounded-lg px-4 py-2.5 text-sm ${
                      isDarkMode ? 'bg-white/5' : 'bg-white border border-gray-100'
                    }`}
                  >
                    <div className="flex-1">
                      <span className={`font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{b.event_name}</span>
                      {b.start_date && (
                        <span className={`ml-2 text-xs ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>{b.start_date}</span>
                      )}
                    </div>
                    <div className="flex items-center gap-4 text-xs">
                      <span className={isDarkMode ? 'text-gray-400' : 'text-gray-500'}>{b.wins}/{b.total_fights} V</span>
                      <span className={isDarkMode ? 'text-gray-400' : 'text-gray-500'}>Perf: {b.performance_points}</span>
                      <span className={isDarkMode ? 'text-gray-400' : 'text-gray-500'}>Bonus: {b.victory_bonus}</span>
                      <span className={isDarkMode ? 'text-gray-400' : 'text-gray-500'}>x{b.recency_weight}</span>
                      <span className={`font-bold ${isDarkMode ? 'text-purple-400' : 'text-purple-600'}`}>{b.weighted_score}b</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  )
}

interface RankingViewProps {
  isDarkMode: boolean
  onSelectPerson?: (person: { id: number; name: string }) => void
  onBack: () => void
}

export function RankingView({ isDarkMode, onSelectPerson, onBack }: RankingViewProps) {
  const categories = useRankingCategories()
  const [selectedRankingCategory, setSelectedRankingCategory] = useState("")
  const [lastN, setLastN] = useState(3)
  const [dateFrom, setDateFrom] = useState("")
  const [showRankingExplanation, setShowRankingExplanation] = useState(false)
  const dateInputRef = useRef<HTMLInputElement>(null)

  const { data: rankingData, loading: rankingLoading } = useRankingData(selectedRankingCategory, lastN, dateFrom || undefined)

  useEffect(() => {
    if (categories.length > 0 && !selectedRankingCategory) {
      setSelectedRankingCategory(categories[0])
    }
  }, [categories])

  return (
    <div className="space-y-6">
      <button
        onClick={onBack}
        className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
          isDarkMode
            ? 'bg-[#1e293b] hover:bg-[#334155] text-gray-300 hover:text-white'
            : 'bg-gray-100 hover:bg-gray-200 text-gray-700 hover:text-gray-900'
        }`}
      >
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Späť na kategórie
      </button>

      <div className={`rounded-xl p-8 ${isDarkMode ? 'bg-[#1e293b]' : 'bg-white border border-gray-200'} shadow-lg`}>
        <div className="flex items-start justify-between mb-6">
          <div>
            <h2 className={`text-2xl font-bold mb-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
              Výkonnostný rebríček
            </h2>
            <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
              Ranking zápasníkov podľa váhovej kategórie za posledné turnaje
            </p>
          </div>
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
            Vysvetlenie metodiky
          </button>
        </div>

        {/* Explanation modal */}
        {showRankingExplanation && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setShowRankingExplanation(false)}>
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
            <div
              className={`relative max-w-lg w-full rounded-2xl p-6 shadow-2xl max-h-[80vh] overflow-y-auto ${
                isDarkMode ? 'bg-[#1e293b] border border-white/10' : 'bg-white'
              }`}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className={`text-lg font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                  Ako sa počíta ranking?
                </h3>
                <button
                  onClick={() => setShowRankingExplanation(false)}
                  className={`p-1 rounded-lg transition-colors ${isDarkMode ? 'hover:bg-white/10 text-gray-400' : 'hover:bg-gray-100 text-gray-500'}`}
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className={`space-y-4 text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                <div>
                  <h4 className={`font-semibold mb-1 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>1. Skóre za turnaj</h4>
                  <p>Pre každý turnaj sa vypočíta skóre ako súčet dvoch zložiek:</p>
                  <div className={`mt-2 rounded-lg p-3 font-mono text-xs ${isDarkMode ? 'bg-black/30' : 'bg-gray-50'}`}>
                    turnajové_skóre = výkonnostné_body + bonus_za_výhry
                  </div>
                </div>
                <div>
                  <h4 className={`font-semibold mb-1 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>2. Výkonnostné body (max 20)</h4>
                  <div className={`rounded-lg p-3 font-mono text-xs ${isDarkMode ? 'bg-black/30' : 'bg-gray-50'}`}>
                    (počet_výhier / počet_zápasov) x 20
                  </div>
                  <p className="mt-1">Neporazený zápasník na turnaji dostane plných 20 bodov.</p>
                </div>
                <div>
                  <h4 className={`font-semibold mb-1 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>3. Bonus za štýl výhier</h4>
                  <p className="mb-2">Každá výhra dostane bonus podľa spôsobu víťazstva:</p>
                  <div className={`rounded-lg overflow-hidden ${isDarkMode ? 'border border-white/10' : 'border border-gray-200'}`}>
                    <table className="w-full text-xs">
                      <tbody>
                        {[
                          { code: 'VFA / VFA1', label: 'Tušírovanie (pád)', points: '+5b' },
                          { code: 'VSU / VSU1', label: 'Technická prevaha', points: '+3b' },
                          { code: 'VPO / VPO1', label: 'Na body', points: '+1b' },
                          { code: 'VIN, VFO, VCA, ...', label: 'Ostatné výhry', points: '+2b' },
                          { code: 'DSQ, 2DSQ, ...', label: 'Diskvalifikácie', points: '+0b' },
                        ].map((row, i, arr) => (
                          <tr key={row.code} className={i < arr.length - 1 ? `border-b ${isDarkMode ? 'border-white/5' : 'border-gray-100'}` : ''}>
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
                  <h4 className={`font-semibold mb-1 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>4. Váha podľa novosti turnaja</h4>
                  <p>Novší turnaj má väčšiu váhu. Berú sa posledné turnaje v danej kategórii:</p>
                  <div className="flex gap-2 mt-2">
                    {[
                      { label: "Najnovší", weight: "x1.0" },
                      { label: "2.", weight: "x0.7" },
                      { label: "3.", weight: "x0.4" },
                      { label: "4.", weight: "x0.2" },
                      { label: "5.", weight: "x0.1" },
                    ].map(w => (
                      <div key={w.label} className={`flex-1 text-center rounded-lg py-1.5 ${isDarkMode ? 'bg-black/30' : 'bg-gray-50'}`}>
                        <div className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>{w.label}</div>
                        <div className={`font-bold text-xs ${isDarkMode ? 'text-purple-400' : 'text-purple-600'}`}>{w.weight}</div>
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <h4 className={`font-semibold mb-1 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>5. Celkové skóre</h4>
                  <div className={`rounded-lg p-3 font-mono text-xs ${isDarkMode ? 'bg-black/30' : 'bg-gray-50'}`}>
                    celkové_skóre = &Sigma; (turnajové_skóre x váha_novosti)
                  </div>
                </div>
              </div>

              <button
                onClick={() => setShowRankingExplanation(false)}
                className="mt-6 w-full py-2.5 rounded-lg font-medium text-sm bg-purple-600 hover:bg-purple-700 text-white transition-all"
              >
                Rozumiem!
              </button>
            </div>
          </div>
        )}

        {/* Controls */}
        <div className="flex flex-wrap items-start gap-4 mb-6">
          <div className="flex flex-col">
            <label className={`block text-sm font-medium mb-1.5 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
              Váhová kategória
            </label>
            <select
              value={selectedRankingCategory}
              onChange={(e) => setSelectedRankingCategory(e.target.value)}
              className={`h-9 px-3 rounded-lg text-sm border ${
                isDarkMode
                  ? 'bg-[#0f172a] text-white border-white/10 focus:border-purple-500'
                  : 'bg-white text-gray-900 border-gray-300 focus:border-purple-500'
              } focus:outline-none`}
            >
              {categories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>
          <div className="flex flex-col">
            <label className={`block text-sm font-medium mb-1.5 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
              Počet turnajov
            </label>
            <select
              value={lastN}
              onChange={(e) => setLastN(Number(e.target.value))}
              className={`h-9 px-3 rounded-lg text-sm border ${
                isDarkMode
                  ? 'bg-[#0f172a] text-white border-white/10 focus:border-purple-500'
                  : 'bg-white text-gray-900 border-gray-300 focus:border-purple-500'
              } focus:outline-none`}
            >
              {[1, 2, 3, 4, 5].map(n => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
          </div>
          <div className="flex flex-col">
            <label className={`block text-sm font-medium mb-1.5 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
              Dátum od
            </label>
            <div className="relative">
              <input
                ref={dateInputRef}
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                onClick={() => dateInputRef.current?.showPicker()}
                className={`h-9 px-3 rounded-lg text-sm border cursor-pointer ${
                  dateFrom ? 'pr-8' : ''
                } ${
                  isDarkMode
                    ? 'bg-[#0f172a] text-white border-white/10 focus:border-purple-500'
                    : 'bg-white text-gray-900 border-gray-300 focus:border-purple-500'
                } focus:outline-none`}
              />
              {dateFrom && (
                <button
                  onClick={() => setDateFrom("")}
                  title="Zrušiť filter"
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
          <div className={`text-center py-12 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
            <div className="inline-block w-8 h-8 border-4 border-current border-t-transparent rounded-full animate-spin mb-3" />
            <p className="text-sm">Načítavam ranking...</p>
          </div>
        )}

        {!rankingLoading && rankingData.length === 0 && selectedRankingCategory && (
          <div className={`text-center py-12 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
            <svg className={`mx-auto h-12 w-12 mb-3 ${isDarkMode ? 'text-gray-600' : 'text-gray-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <p className="text-lg font-medium">Žiadne dáta pre túto kategóriu</p>
          </div>
        )}

        {!rankingLoading && rankingData.length > 0 && (
          <div className={`rounded-lg overflow-hidden ${isDarkMode ? 'shadow-lg' : 'border border-gray-200'}`}>
            <table className="w-full">
              <thead>
                <tr className={`border-b ${isDarkMode ? 'border-white/5 bg-white/5' : 'border-gray-200 bg-gray-50'}`}>
                  <th className={`text-center py-3 px-3 text-sm font-semibold w-12 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>#</th>
                  <th className={`text-left py-3 px-4 text-sm font-semibold ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>Meno</th>
                  <th className={`text-center py-3 px-3 text-sm font-semibold ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>Krajina</th>
                  <th className={`text-center py-3 px-4 text-sm font-semibold ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>Skóre</th>
                  <th className={`text-center py-3 px-3 text-sm font-semibold ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>Turnaje</th>
                  <th className={`text-center py-3 px-4 text-sm font-semibold ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>W/L</th>
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
      </div>
    </div>
  )
}
