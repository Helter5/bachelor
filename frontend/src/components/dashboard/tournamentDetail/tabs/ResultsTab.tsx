import { useTranslation } from "react-i18next"
import type { FightResult, WeightCategory } from "../types"
import { StatusBadge } from "../../../ui/StatusBadge"
import { EmptyState } from "../../../ui/EmptyState"
import { LoadingSpinner } from "../../../ui/LoadingSpinner"
import { ErrorAlert } from "../../../ui/ErrorAlert"
import { DetailHeader } from "../../../ui/DetailHeader"
import { WeightCategoryGrid } from "../WeightCategoryGrid"

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
            <div className="space-y-2">
              {sortedRounds.map(([roundName, fights]) => (
                <div key={roundName} className="space-y-2">
                  {fights.sort((a, b) => a.fightNumber - b.fightNumber).map((fight) => {
                      const isFighter1Winner = fight.winnerFighter === fight.fighter1Id
                      const isFighter2Winner = fight.winnerFighter === fight.fighter2Id
                      const tp1 = fight.technicalPoints?.find((tp: Record<string, unknown>) => tp.fighterId === fight.fighter1Id)
                      const tp2 = fight.technicalPoints?.find((tp: Record<string, unknown>) => tp.fighterId === fight.fighter2Id)
                      const timeStr = fight.endTime > 0
                        ? `${Math.floor(fight.endTime / 60)}:${String(fight.endTime % 60).padStart(2, '0')}`
                        : '—'

                      const cp1 = fight.fighter1RankingPoint
                      const cp2 = fight.fighter2RankingPoint
                      const tp1Val = tp1 ? Number(tp1.points) : 0
                      const tp2Val = tp2 ? Number(tp2.points) : 0

                      const badgeBase = `text-xs font-medium px-2 py-0.5 rounded tabular-nums`
                      const badgeNormal = isDarkMode ? 'bg-white/5 text-gray-400' : 'bg-gray-100 text-gray-500'
                      const badgeHigher = 'bg-green-500/15 text-green-400'

                      return (
                        <div
                          key={fight.id}
                          className={`rounded-lg overflow-hidden ${
                            isDarkMode ? 'bg-[#0f172a]/50' : 'bg-gray-50'
                          }`}
                        >
                          <div className="flex px-3 py-2.5 gap-3">
                            {/* Left: victory type vertically centered */}
                            <div className="flex items-center justify-end w-24 shrink-0">
                              <span
                                className={`text-xs font-medium text-right leading-tight ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}
                                title={fight.victoryTypeName}
                              >
                                {fight.victoryTypeName}
                              </span>
                            </div>

                            {/* Vertical separator */}
                            <div className={`w-px self-stretch ${isDarkMode ? 'bg-white/[0.08]' : 'bg-gray-300'}`} />

                            {/* Right: both fighters */}
                            <div className="flex-1 min-w-0 flex flex-col gap-1.5">
                              <div className="flex items-center">
                                <span className={`flex-1 text-sm font-medium min-w-0 truncate ${
                                  isFighter1Winner ? 'text-green-400'
                                    : isFighter2Winner ? isDarkMode ? 'text-red-400' : 'text-red-500'
                                    : isDarkMode ? 'text-gray-300' : 'text-gray-700'
                                }`}>{fight.fighter1FullName}</span>
                                <div className="flex items-center gap-1 ml-3 shrink-0">
                                  <span className={`${badgeBase} ${cp1 > cp2 ? badgeHigher : badgeNormal}`}>CP {cp1}</span>
                                  <span className={`${badgeBase} ${tp1Val > tp2Val ? badgeHigher : badgeNormal}`}>TP {tp1Val}</span>
                                </div>
                              </div>
                              <div className="flex items-center">
                                <span className={`flex-1 text-sm font-medium min-w-0 truncate ${
                                  isFighter2Winner ? 'text-green-400'
                                    : isFighter1Winner ? isDarkMode ? 'text-red-400' : 'text-red-500'
                                    : isDarkMode ? 'text-gray-300' : 'text-gray-700'
                                }`}>{fight.fighter2FullName}</span>
                                <div className="flex items-center gap-1 ml-3 shrink-0">
                                  <span className={`${badgeBase} ${cp2 > cp1 ? badgeHigher : badgeNormal}`}>CP {cp2}</span>
                                  <span className={`${badgeBase} ${tp2Val > tp1Val ? badgeHigher : badgeNormal}`}>TP {tp2Val}</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      )
                    })}
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
        <WeightCategoryGrid
          isDarkMode={isDarkMode}
          categories={weightCategories}
          getWeightCategoryStatus={getWeightCategoryStatus}
          onSelect={openWeightCategoryResultsDetail}
        />
      )}
    </div>
  )
}
