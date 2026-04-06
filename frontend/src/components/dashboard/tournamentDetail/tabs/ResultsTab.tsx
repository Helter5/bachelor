import { useTranslation } from "react-i18next"
import type { FightResult, WeightCategory } from "../types"
import { StatusBadge } from "../../../ui/StatusBadge"
import { EmptyState } from "../../../ui/EmptyState"
import { LoadingSpinner } from "../../../ui/LoadingSpinner"
import { ErrorAlert } from "../../../ui/ErrorAlert"
import { DetailHeader } from "../../../ui/DetailHeader"

interface ResultsTabProps {
  isDarkMode: boolean
  results: FightResult[]
  resultsLoading: boolean
  resultsError: string | null
  weightCategories: WeightCategory[]
  weightCategoriesLoading: boolean
  selectedWeightCategoryForResults: { id: number; name: string; sport_name: string; audience_name: string } | null
  openWeightCategoryResultsDetail: (wc: { id: number; name: string; sport_name: string; audience_name: string }) => void
  closeWeightCategoryResultsDetail: () => void
  getWeightCategoryStatus: (wc: WeightCategory) => 'completed' | 'ongoing' | 'waiting'
}

export function ResultsTab({
  isDarkMode,
  results,
  resultsLoading,
  resultsError,
  weightCategories,
  weightCategoriesLoading,
  selectedWeightCategoryForResults,
  openWeightCategoryResultsDetail,
  closeWeightCategoryResultsDetail,
  getWeightCategoryStatus,
}: ResultsTabProps) {
  const { t } = useTranslation()

  if (selectedWeightCategoryForResults) {
    return (
      <div>
        {/* Detail View Header */}
        <DetailHeader
          isDarkMode={isDarkMode}
          onBack={closeWeightCategoryResultsDetail}
          title={selectedWeightCategoryForResults.name}
          subtitle={`${selectedWeightCategoryForResults.sport_name} • ${selectedWeightCategoryForResults.audience_name}`}
        />

        {/* Results in spider/bracket layout */}
        {(() => {
          const categoryFights = results.filter(r => r.weightCategoryName === selectedWeightCategoryForResults.name)

          if (categoryFights.length === 0) {
            const weightCategory = weightCategories.find(wc => wc.id === selectedWeightCategoryForResults.id)
            const hasFighters = weightCategory && weightCategory.count_fighters > 0

            return (
              <EmptyState
                icon="document"
                title={hasFighters ? t('tournamentDetail.errors.noFightsYet') : t('tournamentDetail.errors.noResults')}
                description={hasFighters ? undefined : undefined}
                isDarkMode={isDarkMode}
              />
            )
          }

          const validFights = categoryFights.filter(fight =>
            fight.fighter1FullName && fight.fighter1FullName.trim() !== '' &&
            fight.fighter2FullName && fight.fighter2FullName.trim() !== ''
          )

          const roundGroups = validFights.reduce((acc, fight) => {
            const roundName = fight.roundFriendlyName
            if (!acc[roundName]) {
              acc[roundName] = []
            }
            acc[roundName].push(fight)
            return acc
          }, {} as Record<string, FightResult[]>)

          const sortedRounds = Object.entries(roundGroups).sort((a, b) => {
            const [nameA] = a
            const [nameB] = b

            const getPriority = (name: string) => {
              const lower = name.toLowerCase()

              if (lower.includes('qualif')) return 1

              const groupMatch = lower.match(/([a-z])\s*\|\s*round\s+(\d+)/)
              if (groupMatch) {
                const roundNum = parseInt(groupMatch[2])
                return 2 + (roundNum - 1) * 0.1 + (groupMatch[1].charCodeAt(0) - 97) * 0.01
              }

              if (lower.includes('1/4') || lower.includes('quarter')) return 10
              if (lower.includes('1/2') || lower.includes('semi')) return 11
              if (lower.includes('repechage') || lower.includes('repêchage')) return 12
              if (lower.includes('final 3-5') || lower.includes('final3-5')) return 13
              if (lower.includes('final 3-4') || lower.includes('final3-4')) return 14
              if (lower.includes('final 1-2') || lower.includes('final1-2')) return 15
              if (lower.includes('final 1-3') || lower.includes('final1-3')) return 16
              if (lower.includes('final')) return 17

              return 20
            }

            const priorityDiff = getPriority(nameA) - getPriority(nameB)
            if (priorityDiff !== 0) return priorityDiff

            return nameA.localeCompare(nameB)
          })

          return (
            <div className="space-y-8">
              {sortedRounds.map(([roundName, fights]) => (
                <div key={roundName}>
                  <h2 className={`text-lg font-bold mb-3 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                    {roundName}
                  </h2>

                  <div className="space-y-2">
                    {fights.sort((a, b) => a.fightNumber - b.fightNumber).map((fight) => {
                      const isFighter1Winner = fight.winnerFighter === fight.fighter1Id
                      const isFighter2Winner = fight.winnerFighter === fight.fighter2Id
                      const tp1 = fight.technicalPoints?.find((tp: Record<string, unknown>) => tp.fighterId === fight.fighter1Id)
                      const tp2 = fight.technicalPoints?.find((tp: Record<string, unknown>) => tp.fighterId === fight.fighter2Id)
                      const timeStr = fight.endTime > 0
                        ? `${Math.floor(fight.endTime / 60)}:${String(fight.endTime % 60).padStart(2, '0')}`
                        : '—'

                      return (
                        <div
                          key={fight.id}
                          className={`rounded-lg p-3 ${
                            isDarkMode
                              ? 'bg-[#0f172a]/50 shadow-md backdrop-blur-sm'
                              : 'bg-gray-50 border border-gray-200'
                          }`}
                        >
                          <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
                            {/* Fighter 1 */}
                            <div>
                              <div className={`font-semibold text-sm ${
                                isFighter1Winner
                                  ? isDarkMode ? 'text-red-400' : 'text-red-700'
                                  : isDarkMode ? 'text-gray-300' : 'text-gray-700'
                              }`}>
                                {fight.fighter1FullName}
                              </div>
                              <div className={`text-xs mt-0.5 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                                <span className={isFighter1Winner ? isDarkMode ? 'text-red-400 font-semibold' : 'text-red-600 font-semibold' : ''}>
                                  CP {fight.fighter1RankingPoint}
                                </span>
                                {' · '}
                                <span>TP {tp1 ? String(tp1.points) : '—'}</span>
                              </div>
                            </div>

                            {/* Center */}
                            <div className="flex flex-col items-center gap-1">
                              <StatusBadge variant="info" isDarkMode={isDarkMode}>
                                {fight.victoryTypeName}
                              </StatusBadge>
                              <span className={`text-xs ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                                {timeStr}
                              </span>
                            </div>

                            {/* Fighter 2 */}
                            <div className="text-right">
                              <div className={`font-semibold text-sm ${
                                isFighter2Winner
                                  ? isDarkMode ? 'text-red-400' : 'text-red-700'
                                  : isDarkMode ? 'text-gray-300' : 'text-gray-700'
                              }`}>
                                {fight.fighter2FullName}
                              </div>
                              <div className={`text-xs mt-0.5 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                                <span>TP {tp2 ? String(tp2.points) : '—'}</span>
                                {' · '}
                                <span className={isFighter2Winner ? isDarkMode ? 'text-red-400 font-semibold' : 'text-red-600 font-semibold' : ''}>
                                  CP {fight.fighter2RankingPoint}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
          )
        })()}
      </div>
    )
  }

  return (
    <div>
      <h3 className={`text-xl font-semibold mb-6 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
        {t('tournamentDetail.resultsTitle')}
      </h3>

      {resultsError && (
        <ErrorAlert message={resultsError} isDarkMode={isDarkMode} className="mb-4" />
      )}

      {resultsLoading || weightCategoriesLoading ? (
        <LoadingSpinner text={t('tournamentDetail.errors.loadingWeightCategories')} isDarkMode={isDarkMode} />
      ) : weightCategories.length === 0 ? (
        <EmptyState icon="document" title={t('tournamentDetail.errors.noWeightCategories')} description={t('tournamentDetail.errors.syncFirst')} isDarkMode={isDarkMode} />
      ) : (
        <div className="space-y-12">
          {(() => {
            const grouped = weightCategories.reduce((acc, wc) => {
              const key = `${wc.sport_name} - ${wc.audience_name}`
              if (!acc[key]) {
                acc[key] = []
              }
              acc[key].push(wc)
              return acc
            }, {} as Record<string, WeightCategory[]>)

            return Object.entries(grouped).map(([type, categories]) => (
              <div key={type}>
                <h1 className={`text-4xl font-bold mb-8 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                  {type}
                </h1>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {categories.map((wc) => (
                    <div
                      key={wc.id}
                      onClick={() => openWeightCategoryResultsDetail({ id: wc.id, name: wc.name, sport_name: wc.sport_name, audience_name: wc.audience_name })}
                      className={`rounded-lg p-4 transition-all cursor-pointer ${
                        isDarkMode
                          ? 'bg-[#0f172a]/50 hover:bg-[#1e293b] shadow-md hover:shadow-xl backdrop-blur-sm'
                          : 'bg-gray-50 hover:bg-gray-100 border border-gray-200'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-3">
                        <h4 className={`font-bold text-lg ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                          {wc.name}
                        </h4>
                        <div>
                          {(() => {
                            const status = getWeightCategoryStatus(wc)
                            if (status === 'completed') {
                              return <StatusBadge variant="success" isDarkMode={isDarkMode} size="md">{t('tournamentDetail.statusCompleted')}</StatusBadge>
                            } else if (status === 'ongoing') {
                              return <StatusBadge variant="info" isDarkMode={isDarkMode} size="md">{t('tournamentDetail.statusOngoing')}</StatusBadge>
                            } else {
                              return <StatusBadge variant="neutral" isDarkMode={isDarkMode} size="md">{t('tournamentDetail.statusWaiting')}</StatusBadge>
                            }
                          })()}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 text-sm">
                        <svg className={`w-4 h-4 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                        </svg>
                        <span className={`font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                          {wc.count_fighters} {t('tournamentDetail.fighters')}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))
          })()}
        </div>
      )}
    </div>
  )
}
