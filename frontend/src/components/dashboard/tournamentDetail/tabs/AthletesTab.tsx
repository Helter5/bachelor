import { useState, useMemo } from "react"
import { useTranslation } from "react-i18next"
import { Pagination } from "../Pagination"
import type { Team, Athlete, WeightCategory } from "../types"
import { ITEMS_PER_PAGE } from "../types"
import { CountryFlag } from "../../CountryFlag"
import { MultiSelect } from "../../../ui/MultiSelect"
import { StatusBadge } from "../../../ui/StatusBadge"
import { EmptyState } from "../../../ui/EmptyState"
import { LoadingSpinner } from "../../../ui/LoadingSpinner"
import { ErrorAlert } from "../../../ui/ErrorAlert"

interface AthletesTabProps {
  isDarkMode: boolean
  athletes: Athlete[]
  athletesLoading: boolean
  athletesError: string | null
  teams: Team[]
  weightCategories: WeightCategory[]
  athletesPage: number
  setAthletesPage: (page: number) => void
}

const GlobeIcon = (
  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 004 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
)

export function AthletesTab({
  isDarkMode,
  athletes,
  athletesLoading,
  athletesError,
  teams,
  weightCategories,
  athletesPage,
  setAthletesPage,
}: AthletesTabProps) {
  const { t } = useTranslation()
  const [filterQuery, setFilterQuery] = useState("")
  const [selectedCountries, setSelectedCountries] = useState<Set<string>>(new Set())

  const countryOptions = useMemo(() => {
    const seen = new Set<string>()
    return teams
      .filter(t => t.country_iso_code && !seen.has(t.country_iso_code) && !!seen.add(t.country_iso_code))
      .map(t => ({
        value: t.country_iso_code,
        label: t.name,
        icon: <CountryFlag code={t.country_iso_code} flagOnly />,
      }))
      .sort((a, b) => a.label.localeCompare(b.label))
  }, [teams])

  const toggleCountry = (code: string) => {
    setSelectedCountries(prev => {
      const next = new Set(prev)
      if (next.has(code)) next.delete(code)
      else next.add(code)
      return next
    })
    setAthletesPage(1)
  }

  const filtered = athletes.filter(a => {
    if (filterQuery.trim() && !a.person_full_name?.toLowerCase().includes(filterQuery.toLowerCase())) return false
    if (selectedCountries.size > 0) {
      const team = teams.find(t => t.id === a.team_id)
      if (!team || !selectedCountries.has(team.country_iso_code)) return false
    }
    return true
  })

  const hasActiveFilter = filterQuery.trim() || selectedCountries.size > 0

  return (
    <div>
      <h3 className={`text-xl font-semibold mb-4 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
        {t('tournamentDetail.athletesTitle')}
      </h3>

      {/* Filter row */}
      <div className="flex items-center gap-2 mb-4 flex-wrap">
        <input
          type="text"
          value={filterQuery}
          onChange={e => { setFilterQuery(e.target.value); setAthletesPage(1) }}
          placeholder={t('tournamentDetail.namePlaceholder')}
          className={`flex-1 min-w-[140px] px-3 py-2 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
            isDarkMode
              ? 'bg-[#1e293b] border-gray-600 text-white placeholder-gray-500'
              : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400'
          }`}
        />
        <MultiSelect
          options={countryOptions}
          selected={selectedCountries}
          onToggle={toggleCountry}
          onClear={() => { setSelectedCountries(new Set()); setAthletesPage(1) }}
          placeholder={t('athletes.countryPlaceholder')}
          isDarkMode={isDarkMode}
          buttonIcon={GlobeIcon}
        />
      </div>

      {athletesError && (
        <ErrorAlert message={athletesError} isDarkMode={isDarkMode} className="mb-4" />
      )}

      {athletesLoading && athletes.length === 0 ? (
        <LoadingSpinner text={t('tournamentDetail.errors.loadingAthletes')} isDarkMode={isDarkMode} />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon="person"
          title={hasActiveFilter ? t('tournaments.notFound') : t('tournamentDetail.errors.noAthletes')}
          description={hasActiveFilter ? t('tournamentDetail.tryChangingFilter') : t('tournamentDetail.errors.syncFirst')}
          isDarkMode={isDarkMode}
        />
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {filtered
              .slice((athletesPage - 1) * ITEMS_PER_PAGE, athletesPage * ITEMS_PER_PAGE)
              .map((athlete) => {
              const athleteTeam = teams.find(t => t.id === athlete.team_id)
              const athleteWeightCategory = weightCategories.find(wc => wc.id === athlete.weight_category_id)
              return (
                <div
                  key={athlete.id}
                  className={`rounded-lg p-3 transition-all ${
                    isDarkMode
                      ? 'bg-[#0f172a]/50 hover:bg-[#1e293b] shadow-md hover:shadow-xl backdrop-blur-sm'
                      : 'bg-gray-50 hover:bg-gray-100 border border-gray-200'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <h4 className={`font-semibold text-sm truncate ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                        {athlete.person_full_name}
                      </h4>
                      <div className="flex items-center gap-2 mt-1 text-xs flex-wrap">
                        <div className="flex items-center gap-1">
                          <CountryFlag code={athleteTeam?.country_iso_code} flagOnly />
                          <span className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>
                            {athleteTeam?.name || t('tournamentDetail.noTeam')}
                          </span>
                        </div>
                        <span className={isDarkMode ? 'text-gray-600' : 'text-gray-300'}>•</span>
                        <span className={`px-1.5 py-0.5 rounded text-xs ${isDarkMode ? 'bg-white/5 text-gray-300' : 'bg-gray-200 text-gray-600'}`}>
                          {athleteWeightCategory?.name || t('tournamentDetail.noCategory')}
                        </span>
                      </div>
                    </div>
                    <StatusBadge variant={athlete.is_competing ? 'success' : 'neutral'} isDarkMode={isDarkMode}>
                      {athlete.is_competing ? t('fighters.competing') : t('fighters.notCompeting')}
                    </StatusBadge>
                  </div>
                </div>
              )
            })}
          </div>
          <Pagination
            isDarkMode={isDarkMode}
            currentPage={athletesPage}
            totalItems={filtered.length}
            itemsPerPage={ITEMS_PER_PAGE}
            onPageChange={setAthletesPage}
          />
        </>
      )}
    </div>
  )
}
