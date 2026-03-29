import { useMemo } from "react"
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts"
import type { EventStatistics } from "../types"
import { CHART_COLORS } from "../types"

interface StatisticsTabProps {
  isDarkMode: boolean
  eventStats: EventStatistics | null
  statsLoading: boolean
  statsError: string | null
  onSelectPerson?: (person: { id: number; name: string }) => void
}

export function StatisticsTab({
  isDarkMode,
  eventStats,
  statsLoading,
  statsError,
  onSelectPerson,
}: StatisticsTabProps) {
  const tooltipStyle = useMemo(() => ({
    backgroundColor: isDarkMode ? "#1e293b" : "#fff",
    border: `1px solid ${isDarkMode ? "rgba(255,255,255,0.1)" : "#e5e7eb"}`,
    borderRadius: "8px",
    color: isDarkMode ? "#e2e8f0" : "#1f2937",
  }), [isDarkMode])

  return (
    <div>
      <h3 className={`text-xl font-semibold mb-6 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
        Štatistiky turnaja
      </h3>

      {statsError && (
        <div className={`p-4 rounded-lg mb-4 ${isDarkMode ? 'bg-red-900/20 text-red-400' : 'bg-red-50 text-red-600'}`}>
          {statsError}
        </div>
      )}

      {statsLoading ? (
        <div className={`text-center py-12 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p>Načítavam štatistiky...</p>
        </div>
      ) : eventStats ? (
        <div className="space-y-8">
          {/* Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: "Celkom zápasov", value: eventStats.total_fights, color: "text-blue-500" },
              { label: "Priem. dĺžka", value: eventStats.avg_duration > 0 ? `${Math.floor(eventStats.avg_duration / 60)}:${String(eventStats.avg_duration % 60).padStart(2, '0')}` : "-", color: "text-green-500" },
              { label: "Priem. TP", value: eventStats.avg_tp, color: "text-purple-500" },
              { label: "Priem. CP", value: eventStats.avg_cp, color: "text-yellow-500" },
            ].map((card) => (
              <div key={card.label} className={`rounded-xl p-4 text-center ${isDarkMode ? 'bg-[#0f172a]/50' : 'bg-gray-50 border border-gray-200'}`}>
                <p className={`text-xs font-medium mb-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>{card.label}</p>
                <p className={`text-2xl font-bold ${card.color}`}>{card.value}</p>
              </div>
            ))}
          </div>

          {/* Victory Type Pie Chart */}
          {Object.keys(eventStats.victory_type_distribution).length > 0 && (
            <div className={`rounded-xl p-6 ${isDarkMode ? 'bg-[#0f172a]/50' : 'bg-gray-50 border border-gray-200'}`}>
              <h4 className={`text-lg font-bold mb-4 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Rozloženie typov víťazstiev</h4>
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie
                    data={Object.entries(eventStats.victory_type_distribution).map(([name, value]) => ({ name, value }))}
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    dataKey="value"
                    label={({ name, value }) => `${name}: ${value}`}
                  >
                    {Object.keys(eventStats.victory_type_distribution).map((_, i) => (
                      <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={tooltipStyle} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Top Performers */}
          {eventStats.top_performers.length > 0 && (
            <div>
              <h4 className={`text-lg font-bold mb-4 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Najlepší zápasníci</h4>
              <div className={`rounded-lg overflow-hidden ${isDarkMode ? 'shadow-lg' : 'border border-gray-200'}`}>
                <table className="w-full">
                  <thead>
                    <tr className={`border-b ${isDarkMode ? 'border-white/5 bg-white/5' : 'border-gray-200 bg-gray-50'}`}>
                      <th className={`text-center py-3 px-3 text-sm font-semibold w-12 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>#</th>
                      <th className={`text-left py-3 px-4 text-sm font-semibold ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>Meno</th>
                      <th className={`text-left py-3 px-4 text-sm font-semibold ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>Tím</th>
                      <th className={`text-center py-3 px-4 text-sm font-semibold ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>Výhry</th>
                      <th className={`text-center py-3 px-4 text-sm font-semibold ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>Zápasy</th>
                      <th className={`text-center py-3 px-4 text-sm font-semibold ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>Win rate</th>
                    </tr>
                  </thead>
                  <tbody>
                    {eventStats.top_performers.map((p, idx) => (
                      <tr key={p.name} className={`border-b last:border-b-0 ${isDarkMode ? 'border-white/5 hover:bg-white/5' : 'border-gray-100 hover:bg-gray-50'}`}>
                        <td className="py-3 px-3 text-center">
                          <span className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold ${
                            idx === 0 ? 'bg-yellow-500/20 text-yellow-500' :
                            idx === 1 ? 'bg-gray-300/20 text-gray-400' :
                            idx === 2 ? 'bg-orange-500/20 text-orange-500' :
                            isDarkMode ? 'text-gray-400' : 'text-gray-500'
                          }`}>
                            {idx + 1}
                          </span>
                        </td>
                        <td className={`py-3 px-4 text-sm font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                          {p.person_id && onSelectPerson ? (
                            <button
                              onClick={() => onSelectPerson({ id: p.person_id!, name: p.name })}
                              className={`hover:underline text-left ${isDarkMode ? 'text-blue-400 hover:text-blue-300' : 'text-blue-600 hover:text-blue-700'}`}
                            >
                              {p.name}
                            </button>
                          ) : p.name}
                        </td>
                        <td className={`py-3 px-4 text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                          {p.country && <span className={`fi fi-${p.country.toLowerCase()} rounded-sm mr-1.5`} style={{ fontSize: '0.9rem' }} />}
                          {p.team_name || '-'}
                        </td>
                        <td className={`py-3 px-4 text-center text-sm font-medium text-green-500`}>{p.wins}</td>
                        <td className={`py-3 px-4 text-center text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>{p.total_fights}</td>
                        <td className={`py-3 px-4 text-center text-sm font-medium ${isDarkMode ? 'text-purple-400' : 'text-purple-600'}`}>{p.win_rate}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Team Performance */}
          {eventStats.team_performance.length > 0 && (
            <div>
              <h4 className={`text-lg font-bold mb-4 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Výkon tímov</h4>
              <div className={`rounded-lg overflow-hidden ${isDarkMode ? 'shadow-lg' : 'border border-gray-200'}`}>
                <table className="w-full">
                  <thead>
                    <tr className={`border-b ${isDarkMode ? 'border-white/5 bg-white/5' : 'border-gray-200 bg-gray-50'}`}>
                      <th className={`text-left py-3 px-4 text-sm font-semibold ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>Tím</th>
                      <th className={`text-center py-3 px-3 text-sm font-semibold ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>Krajina</th>
                      <th className={`text-center py-3 px-4 text-sm font-semibold ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>Výhry</th>
                      <th className={`text-center py-3 px-4 text-sm font-semibold ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>Prehry</th>
                      <th className={`text-left py-3 px-4 text-sm font-semibold ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>Win rate</th>
                    </tr>
                  </thead>
                  <tbody>
                    {eventStats.team_performance.map((t, idx) => (
                      <tr key={t.name} className={`border-b last:border-b-0 ${isDarkMode ? 'border-white/5 hover:bg-white/5' : 'border-gray-100 hover:bg-gray-50'}`}>
                        <td className={`py-3 px-4 text-sm font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{t.name}</td>
                        <td className="py-3 px-3 text-center">
                          {t.country ? (
                            <span className={`fi fi-${t.country.toLowerCase()} rounded-sm`} style={{ fontSize: '1.1rem' }} />
                          ) : (
                            <span className={`text-xs ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>-</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-center text-sm font-medium text-green-500">{t.wins}</td>
                        <td className={`py-3 px-4 text-center text-sm font-medium ${isDarkMode ? 'text-red-400' : 'text-red-500'}`}>{t.losses}</td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <div className={`flex-1 h-2 rounded-full overflow-hidden ${isDarkMode ? 'bg-white/10' : 'bg-gray-200'}`}>
                              <div
                                className="h-full rounded-full bg-purple-500 transition-all"
                                style={{ width: `${t.win_rate}%` }}
                              />
                            </div>
                            <span className={`text-sm font-medium min-w-[3rem] text-right ${isDarkMode ? 'text-purple-400' : 'text-purple-600'}`}>
                              {t.win_rate}%
                            </span>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {eventStats.total_fights === 0 && (
            <div className={`text-center py-12 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              <svg className={`mx-auto h-12 w-12 mb-4 ${isDarkMode ? 'text-gray-600' : 'text-gray-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              <p className="text-lg font-medium">Žiadne dáta</p>
              <p className="text-sm mt-2">Pre tento turnaj nie sú k dispozícii žiadne zápasy</p>
            </div>
          )}
        </div>
      ) : null}
    </div>
  )
}
