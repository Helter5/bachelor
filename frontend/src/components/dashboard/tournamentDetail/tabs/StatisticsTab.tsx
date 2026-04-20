import { useMemo } from "react"
import { useTranslation } from "react-i18next"
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from "recharts"
import type { EventStatistics } from "../types"
import { CHART_COLORS } from "../types"
import { ErrorAlert } from "../../../ui/ErrorAlert"
import { LoadingSpinner } from "../../../ui/LoadingSpinner"
import { EmptyState } from "../../../ui/EmptyState"

interface StatisticsTabProps {
  isDarkMode: boolean
  eventStats: EventStatistics | null
  statsLoading: boolean
  statsError: string | null
  onSelectPerson?: (id: number, name: string) => void
}

export function StatisticsTab({
  isDarkMode,
  eventStats,
  statsLoading,
  statsError,
  onSelectPerson,
}: StatisticsTabProps) {
  const { t } = useTranslation()
  const tooltipStyle = useMemo(() => ({
    backgroundColor: isDarkMode ? "#1e293b" : "#fff",
    border: `1px solid ${isDarkMode ? "rgba(255,255,255,0.1)" : "#e5e7eb"}`,
    borderRadius: "8px",
    color: isDarkMode ? "#e2e8f0" : "#1f2937",
  }), [isDarkMode])

  return (
    <div>
      <h3 className={`text-xl font-semibold mb-6 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
        {t('statistics.tournamentTitle')}
      </h3>

      {statsError && (
        <ErrorAlert message={statsError} isDarkMode={isDarkMode} className="mb-4" />
      )}

      {statsLoading ? (
        <LoadingSpinner text={t('statistics.loadingStats')} isDarkMode={isDarkMode} />
      ) : eventStats ? (
        <div className="space-y-8">
          {/* Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: t('statistics.totalFights'), value: eventStats.total_fights, color: "text-blue-500" },
              { label: t('statistics.avgDuration'), value: eventStats.avg_duration > 0 ? `${Math.floor(eventStats.avg_duration / 60)}:${String(eventStats.avg_duration % 60).padStart(2, '0')}` : "-", color: "text-green-500" },
              { label: t('statistics.avgTp'), value: eventStats.avg_tp, color: "text-purple-500" },
              { label: t('statistics.avgCp'), value: eventStats.avg_cp, color: "text-yellow-500" },
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
              <h4 className={`text-lg font-bold mb-4 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{t('statistics.victoryTypes')}</h4>
              <ResponsiveContainer width="100%" height={320}>
                <PieChart>
                  <Pie
                    data={Object.entries(eventStats.victory_type_distribution).map(([name, value]) => ({ name, value }))}
                    cx="50%"
                    cy="45%"
                    outerRadius={90}
                    dataKey="value"
                    label={({ percent }) => (percent ?? 0) > 0.04 ? `${(((percent ?? 0) * 100)).toFixed(0)}%` : ''}
                    labelLine={false}
                  >
                    {Object.keys(eventStats.victory_type_distribution).map((_, i) => (
                      <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={tooltipStyle}
                    formatter={(value: number | string | undefined, name: string | undefined) => [value ?? 0, name ?? '']}
                  />
                  <Legend
                    formatter={(value, entry) => {
                      const payloadValue = (entry as { payload?: { value?: number | string } }).payload?.value
                      return `${String(value)}: ${payloadValue ?? ''}`
                    }}
                    wrapperStyle={{ fontSize: '12px', color: isDarkMode ? '#cbd5e1' : '#374151' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Top Performers */}
          {eventStats.top_performers.length > 0 && (
            <div>
              <h4 className={`text-lg font-bold mb-4 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{t('statistics.topPerformers')}</h4>
              <div className={`rounded-lg overflow-hidden ${isDarkMode ? 'shadow-lg' : 'border border-gray-200'}`}>
                <table className="w-full">
                  <thead>
                    <tr className={`border-b ${isDarkMode ? 'border-white/5 bg-white/5' : 'border-gray-200 bg-gray-50'}`}>
                      <th className={`text-center py-3 px-3 text-sm font-semibold w-12 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>{t('statistics.tableHash')}</th>
                      <th className={`text-left py-3 px-4 text-sm font-semibold ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>{t('statistics.tableName')}</th>
                      <th className={`text-left py-3 px-4 text-sm font-semibold ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>{t('statistics.tableTeam')}</th>
                      <th className={`text-center py-3 px-4 text-sm font-semibold ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>{t('statistics.tableWins')}</th>
                      <th className={`text-center py-3 px-4 text-sm font-semibold ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>{t('statistics.tableFights')}</th>
                      <th className={`text-center py-3 px-4 text-sm font-semibold ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>{t('statistics.tableWinRate')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {eventStats.top_performers.map((p, idx) => (
                      <tr
                        key={p.name}
                        onClick={onSelectPerson && p.person_id ? () => onSelectPerson(p.person_id!, p.name) : undefined}
                        className={`border-b last:border-b-0 ${onSelectPerson && p.person_id ? 'cursor-pointer' : ''} ${isDarkMode ? 'border-white/5 hover:bg-white/5' : 'border-gray-100 hover:bg-gray-50'}`}
                      >
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
                          {p.name}
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
              <h4 className={`text-lg font-bold mb-4 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{t('statistics.teamPerformance')}</h4>
              <div className={`rounded-lg overflow-hidden ${isDarkMode ? 'shadow-lg' : 'border border-gray-200'}`}>
                <table className="w-full">
                  <thead>
                    <tr className={`border-b ${isDarkMode ? 'border-white/5 bg-white/5' : 'border-gray-200 bg-gray-50'}`}>
                      <th className={`text-left py-3 px-4 text-sm font-semibold ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>{t('statistics.tableTeam')}</th>
                      <th className={`text-center py-3 px-3 text-sm font-semibold ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>{t('statistics.tableCountry')}</th>
                      <th className={`text-center py-3 px-4 text-sm font-semibold ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>{t('statistics.tableWins')}</th>
                      <th className={`text-center py-3 px-4 text-sm font-semibold ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>{t('statistics.tableLosses')}</th>
                      <th className={`text-left py-3 px-4 text-sm font-semibold ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>{t('statistics.tableWinRate')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {eventStats.team_performance.map((t) => (
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
            <EmptyState
              icon="chart"
              title={t('tournamentDetail.errors.noStatsData')}
              description={t('tournamentDetail.errors.noFightsForEvent')}
              isDarkMode={isDarkMode}
            />
          )}
        </div>
      ) : null}
    </div>
  )
}
