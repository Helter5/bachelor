import { useState } from "react"
import { useTranslation } from "react-i18next"
import { Pagination } from "../Pagination"
import type { WeightCategory, Team, Athlete, FightResult } from "../types"
import { ITEMS_PER_PAGE } from "../types"
import { AthleteCard } from "../AthleteCard"
import { EmptyState } from "../../../ui/EmptyState"
import { LoadingSpinner } from "../../../ui/LoadingSpinner"
import { ErrorAlert } from "../../../ui/ErrorAlert"
import { DetailHeader } from "../../../ui/DetailHeader"
import { WeightCategoryGrid } from "../WeightCategoryGrid"

interface CategoriesTabProps {
  isDarkMode: boolean
  weightCategories: WeightCategory[]
  weightCategoriesLoading: boolean
  weightCategoriesError: string | null
  selectedWeightCategory: { id: number; name: string; sport_name: string; audience_name: string } | null
  weightCategoryAthletes: Athlete[]
  loadingWeightCategoryAthletes: boolean
  teams: Team[]
  weightCategoriesPage: number
  setWeightCategoriesPage: (page: number) => void
  weightCategoryAthletesPage: number
  setWeightCategoryAthletesPage: (page: number) => void
  openWeightCategoryDetail: (wc: { id: number; name: string; sport_name: string; audience_name: string }) => void
  closeWeightCategoryDetail: () => void
  getWeightCategoryStatus: (wc: WeightCategory) => 'completed' | 'ongoing' | 'waiting'
  results: FightResult[]
  resultsLoading: boolean
  resultsError: string | null
}

export function CategoriesTab({
  isDarkMode,
  weightCategories,
  weightCategoriesLoading,
  weightCategoriesError,
  selectedWeightCategory,
  weightCategoryAthletes,
  loadingWeightCategoryAthletes,
  teams,
  weightCategoriesPage,
  setWeightCategoriesPage,
  weightCategoryAthletesPage,
  setWeightCategoryAthletesPage,
  openWeightCategoryDetail,
  closeWeightCategoryDetail,
  getWeightCategoryStatus,
  results,
  resultsLoading,
  resultsError,
}: CategoriesTabProps) {
  const { t } = useTranslation()
  const [detailTab, setDetailTab] = useState<'athletes' | 'results'>('athletes')
  if (selectedWeightCategory) {
    return (
      <div>
        {/* Detail View Header */}
        <DetailHeader
          isDarkMode={isDarkMode}
          onBack={closeWeightCategoryDetail}
          title={selectedWeightCategory.name}
          subtitle={`${selectedWeightCategory.sport_name} • ${selectedWeightCategory.audience_name}`}
        />

        {/* Detail Tabs */}
        <div className={`flex gap-4 mb-6 border-b ${isDarkMode ? 'border-white/[0.08]' : 'border-gray-200'}`}>
          <button
            onClick={() => setDetailTab('athletes')}
            className={`pb-3 px-1 font-medium transition-all ${
              detailTab === 'athletes'
                ? isDarkMode ? 'text-blue-400 border-b-2 border-blue-400' : 'text-blue-600 border-b-2 border-blue-600'
                : isDarkMode ? 'text-gray-400 hover:text-gray-300' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {t('tournamentDetail.athletesTitle')}
          </button>
          <button
            onClick={() => setDetailTab('results')}
            className={`pb-3 px-1 font-medium transition-all ${
              detailTab === 'results'
                ? isDarkMode ? 'text-blue-400 border-b-2 border-blue-400' : 'text-blue-600 border-b-2 border-blue-600'
                : isDarkMode ? 'text-gray-400 hover:text-gray-300' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {t('tournamentDetail.resultsTitle')}
          </button>
        </div>

        {/* Athletes Tab Content */}
        {detailTab === 'athletes' && (
          loadingWeightCategoryAthletes ? (
            <LoadingSpinner text={t('tournamentDetail.errors.loadingAthletes')} isDarkMode={isDarkMode} />
          ) : weightCategoryAthletes.length > 0 ? (
            <>
              <div className="space-y-2 mb-8">
                {weightCategoryAthletes
                  .slice((weightCategoryAthletesPage - 1) * ITEMS_PER_PAGE, weightCategoryAthletesPage * ITEMS_PER_PAGE)
                  .map((athlete) => {
                  const athleteTeam = teams.find(t => t.id === athlete.team_id)
                  return (
                    <AthleteCard
                      key={athlete.id}
                      isDarkMode={isDarkMode}
                      name={athlete.person_full_name}
                      isCompeting={athlete.is_competing}
                      teamName={athleteTeam?.name}
                      countryCode={athleteTeam?.country_iso_code}
                    />
                  )
                })}
              </div>
              <Pagination
                isDarkMode={isDarkMode}
                currentPage={weightCategoryAthletesPage}
                totalItems={weightCategoryAthletes.length}
                itemsPerPage={ITEMS_PER_PAGE}
                onPageChange={setWeightCategoryAthletesPage}
              />
            </>
          ) : (
            <EmptyState icon="person" title={t('tournamentDetail.errors.noAthletes')} description={t('tournamentDetail.errors.noAthletesInCategory')} isDarkMode={isDarkMode} />
          )
        )}

        {/* Results Tab Content */}
        {detailTab === 'results' && (
          resultsError ? (
            <ErrorAlert message={resultsError} isDarkMode={isDarkMode} className="mb-4" />
          ) : resultsLoading ? (
            <LoadingSpinner text={t('tournamentDetail.errors.loadingResults')} isDarkMode={isDarkMode} />
          ) : (() => {
            const categoryFights = results.filter(r => r.weightCategoryName === selectedWeightCategory.name)

            if (categoryFights.length === 0) {
              const weightCategory = weightCategories.find(wc => wc.id === selectedWeightCategory.id)
              const hasFighters = weightCategory && weightCategory.count_fighters > 0

              return (
                <EmptyState
                  icon="document"
                  title={hasFighters ? t('tournamentDetail.errors.noFightsYet') : t('tournamentDetail.errors.noResults')}
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
          })()
        )}
      </div>
    )
  }

  return (
    <div>
      <h3 className={`text-xl font-semibold mb-6 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
        {t('tournamentDetail.weightCategoriesTitle')}
      </h3>

      {weightCategoriesError && (
        <ErrorAlert message={weightCategoriesError} isDarkMode={isDarkMode} className="mb-4" />
      )}

      {weightCategoriesLoading && weightCategories.length === 0 ? (
        <LoadingSpinner text={t('tournamentDetail.errors.loadingWeightCategories')} isDarkMode={isDarkMode} />
      ) : weightCategories.length === 0 ? (
        <EmptyState icon="weight" title={t('tournamentDetail.errors.noWeightCategories')} description={t('tournamentDetail.errors.syncFirst')} isDarkMode={isDarkMode} />
      ) : (
        <WeightCategoryGrid
          isDarkMode={isDarkMode}
          categories={weightCategories}
          getWeightCategoryStatus={getWeightCategoryStatus}
          onSelect={openWeightCategoryDetail}
          page={weightCategoriesPage}
          onPageChange={setWeightCategoriesPage}
        />
      )}
    </div>
  )
}
