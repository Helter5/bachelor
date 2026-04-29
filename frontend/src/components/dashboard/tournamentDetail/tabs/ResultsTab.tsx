import { useState, useEffect } from "react"
import { useTranslation } from "react-i18next"
import type { FightResult, Team, WeightCategory } from "../types"
import { EmptyState } from "../../../ui/EmptyState"
import { LoadingSpinner } from "../../../ui/LoadingSpinner"
import { ErrorAlert } from "../../../ui/ErrorAlert"
import { DetailHeader } from "../../../ui/DetailHeader"
import { WeightCategoryGrid } from "../WeightCategoryGrid"
import { Pagination } from "../../shared/Pagination"
import { ResultsView } from "../ResultsView"
import { Card } from "../Card"

interface ResultsTabProps {
  isDarkMode: boolean
  results: FightResult[]
  resultsLoading: boolean
  resultsError: string | null
  teams: Team[]
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
  teams,
  weightCategories,
  weightCategoriesLoading,
  selectedWeightCategoryForResults,
  openWeightCategoryResultsDetail,
  closeWeightCategoryResultsDetail,
  getWeightCategoryStatus,
}: ResultsTabProps) {
  const { t } = useTranslation()
  const [selectedSportType, setSelectedSportType] = useState<string | null>(null)
  const [sportTypePage, setSportTypePage] = useState(1)
  const [wcPage, setWcPage] = useState(1)

  const normalizeTeamName = (name: string) =>
    name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/\s+/g, ' ')
      .trim()

  const teamCountryByName = teams.reduce((acc, team) => {
    if (!team.name) return acc
    acc[normalizeTeamName(team.name)] = team.country_iso_code
    return acc
  }, {} as Record<string, string | null>)

  useEffect(() => { setWcPage(1) }, [selectedSportType])

  if (selectedWeightCategoryForResults) {
    const categoryFights = results.filter(r => r.weightCategoryName === selectedWeightCategoryForResults.name)
    const validFights = categoryFights.filter(f =>
      f.fighter1FullName?.trim() && f.fighter2FullName?.trim()
    )

    const getPriority = (name: string) => {
      const l = name.toLowerCase()
      if (l.includes('qualif')) return 1
      const g = l.match(/([a-z])\s*\|\s*round\s+(\d+)/)
      if (g) return 2 + (parseInt(g[2]) - 1) * 0.1 + (g[1].charCodeAt(0) - 97) * 0.01
      if (l.includes('1/16') || l.includes('round of 16')) return 8
      if (l.includes('1/8') || l.includes('round of 8')) return 9
      if (l.includes('1/4') || l.includes('quarter')) return 10
      if (l.includes('1/2') || l.includes('semi')) return 11
      if (l.includes('repechage') || l.includes('repêchage')) return 12
      if (l.includes('final 3-5') || l.includes('final3-5')) return 13
      if (l.includes('final 3-4') || l.includes('final3-4')) return 14
      if (l.includes('final 1-2') || l.includes('final1-2')) return 15
      if (l.includes('final 1-3') || l.includes('final1-3')) return 16
      if (l.includes('final')) return 17
      return 20
    }

    const roundGroups = validFights.reduce((acc, fight) => {
      if (!acc[fight.roundFriendlyName]) acc[fight.roundFriendlyName] = []
      acc[fight.roundFriendlyName].push(fight)
      return acc
    }, {} as Record<string, FightResult[]>)

    const sortedRounds = Object.entries(roundGroups).sort(([a], [b]) => {
      const d = getPriority(a) - getPriority(b)
      return d !== 0 ? d : a.localeCompare(b)
    })

    const wc = weightCategories.find(w => w.id === selectedWeightCategoryForResults.id)

    return (
      <div>
        <DetailHeader
          isDarkMode={isDarkMode}
          onBack={() => {
            setSelectedSportType(`${selectedWeightCategoryForResults.sport_name} • ${selectedWeightCategoryForResults.audience_name}`)
            closeWeightCategoryResultsDetail()
          }}
          title={selectedWeightCategoryForResults.name}
          subtitle={`${selectedWeightCategoryForResults.sport_name} • ${selectedWeightCategoryForResults.audience_name}`}
        />

        {categoryFights.length === 0 ? (
          <EmptyState
            icon="document"
            title={wc?.count_fighters ? t('tournamentDetail.errors.noFightsYet') : t('tournamentDetail.errors.noResults')}
            isDarkMode={isDarkMode}
          />
        ) : (
          <ResultsView
            isDarkMode={isDarkMode}
            sortedRounds={sortedRounds}
            teamCountryByName={teamCountryByName}
          />
        )}
      </div>
    )
  }

  if (selectedSportType) {
    const filtered = weightCategories.filter(
      wc => `${wc.sport_name} • ${wc.audience_name}` === selectedSportType
    )
    return (
      <div>
        <DetailHeader
          isDarkMode={isDarkMode}
          onBack={() => setSelectedSportType(null)}
          title={selectedSportType}
        />
        <WeightCategoryGrid
          isDarkMode={isDarkMode}
          categories={filtered}
          getWeightCategoryStatus={getWeightCategoryStatus}
          onSelect={openWeightCategoryResultsDetail}
          page={wcPage}
          onPageChange={setWcPage}
          itemsPerPage={8}
        />
      </div>
    )
  }

  const SPORT_TYPES_PER_PAGE = 12
  const sportTypes = weightCategories.reduce((acc, wc) => {
    const key = `${wc.sport_name} • ${wc.audience_name}`
    if (!acc[key]) acc[key] = { sport_name: wc.sport_name, audience_name: wc.audience_name, total: 0, completed: 0 }
    acc[key].total++
    if (getWeightCategoryStatus(wc) === 'completed') acc[key].completed++
    return acc
  }, {} as Record<string, { sport_name: string; audience_name: string; total: number; completed: number }>)

  const allSportTypes = Object.entries(sportTypes)
  const pagedSportTypes = allSportTypes.slice(
    (sportTypePage - 1) * SPORT_TYPES_PER_PAGE,
    sportTypePage * SPORT_TYPES_PER_PAGE
  )

  return (
    <div>
      <h3 className={`text-xl font-semibold mb-6 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
        {t('tournamentDetail.resultsTitle')}
      </h3>

      {resultsError && <ErrorAlert message={resultsError} isDarkMode={isDarkMode} className="mb-4" />}

      {resultsLoading || weightCategoriesLoading ? (
        <LoadingSpinner text={t('tournamentDetail.errors.loadingWeightCategories')} isDarkMode={isDarkMode} />
      ) : weightCategories.length === 0 ? (
        <EmptyState
          icon="document"
          title={t('tournamentDetail.errors.noWeightCategories')}
          description={t('tournamentDetail.errors.syncFirst')}
          isDarkMode={isDarkMode}
        />
      ) : (
        <>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {pagedSportTypes.map(([key, info]) => {
            const allDone = info.completed === info.total
            const anyDone = info.completed > 0

            const metadata = (
              <span
                className={`inline-flex px-2.5 py-1 rounded-full text-xs ${isDarkMode ? 'bg-white/5 text-gray-300' : 'bg-gray-200 text-gray-600'}`}
                title={`${info.total} ${t('tournamentDetail.weightCategories')}`}
                aria-label={`${info.total} ${t('tournamentDetail.weightCategories')}`}
              >
                {info.total} {t('tournamentDetail.weightCategories')}
              </span>
            )

            return (
              <Card
                key={key}
                isDarkMode={isDarkMode}
                name={`${info.sport_name} • ${info.audience_name}`}
                metadata={metadata}
                statusBadge={{
                  label: allDone
                    ? t('tournamentDetail.statusCompleted')
                    : anyDone
                      ? t('tournamentDetail.statusOngoing')
                      : t('tournamentDetail.statusWaiting'),
                  variant: allDone ? 'success' : anyDone ? 'info' : 'neutral',
                }}
                onClick={() => setSelectedSportType(key)}
              />
            )
          })}
        </div>
        <Pagination
          isDarkMode={isDarkMode}
          currentPage={sportTypePage}
          totalItems={allSportTypes.length}
          itemsPerPage={SPORT_TYPES_PER_PAGE}
          onPageChange={setSportTypePage}
        />
        </>
      )}
    </div>
  )
}
