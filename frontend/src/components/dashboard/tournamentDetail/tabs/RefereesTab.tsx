import { useState, useMemo } from "react"
import { useTranslation } from "react-i18next"
import { Pagination } from "../../shared/Pagination"
import type { Referee } from "../types"
import { ITEMS_PER_PAGE } from "../types"
import { CountryFlag, buildArenaFlagUrl } from "../../shared/CountryFlag"
import { MultiSelect } from "../../../ui/MultiSelect"
import { EmptyState } from "../../../ui/EmptyState"
import { LoadingSpinner } from "../../../ui/LoadingSpinner"
import { ErrorAlert } from "../../../ui/ErrorAlert"
import { Card, type Badge } from "../Card"

interface RefereesTabProps {
  isDarkMode: boolean
  referees: Referee[]
  loading: boolean
  error: string | null
  refereesPage?: number
  setRefereesPage?: (page: number) => void
}

const GlobeIcon = (
  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 004 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
)

export function RefereesTab({
  isDarkMode,
  referees,
  loading,
  error,
  refereesPage = 1,
  setRefereesPage = () => {},
}: RefereesTabProps) {
  const { t } = useTranslation()
  const [filterQuery, setFilterQuery] = useState("")
  const [selectedCountries, setSelectedCountries] = useState<Set<string>>(new Set())

  const activeReferees = useMemo(() => {
    return referees.filter(r => !r.deactivated)
  }, [referees])

  const countryOptions = useMemo(() => {
    const seen = new Set<string>()
    return activeReferees
      .filter(r => r.country_iso_code && !seen.has(r.country_iso_code) && !!seen.add(r.country_iso_code))
      .map(r => ({
        value: r.country_iso_code!,
        label: r.country_iso_code!,
        icon: <CountryFlag code={r.country_iso_code!} imageUrl={buildArenaFlagUrl(r.country_iso_code)} flagOnly />,
      }))
      .sort((a, b) => a.label.localeCompare(b.label))
  }, [activeReferees])

  const toggleCountry = (code: string) => {
    setSelectedCountries(prev => {
      const next = new Set(prev)
      if (next.has(code)) next.delete(code)
      else next.add(code)
      return next
    })
    setRefereesPage(1)
  }

  const filtered = activeReferees.filter(r => {
    if (filterQuery.trim() && !r.person_full_name?.toLowerCase().includes(filterQuery.toLowerCase())) return false
    if (selectedCountries.size > 0 && !selectedCountries.has(r.country_iso_code || '')) return false
    return true
  })

  const hasActiveFilter = filterQuery.trim() || selectedCountries.size > 0

  return (
    <div>
      <h3 className={`text-xl font-semibold mb-4 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
        {t('tournamentDetail.tabs.referees')}
      </h3>

      <div className="flex items-center gap-2 mb-4 flex-wrap">
        <input
          type="text"
          value={filterQuery}
          onChange={e => { setFilterQuery(e.target.value); setRefereesPage(1) }}
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
          onClear={() => { setSelectedCountries(new Set()); setRefereesPage(1) }}
          placeholder={t('athletes.countryPlaceholder')}
          isDarkMode={isDarkMode}
          buttonIcon={GlobeIcon}
        />
      </div>

      {error && (
        <ErrorAlert message={error} isDarkMode={isDarkMode} className="mb-4" />
      )}

      {loading && referees.length === 0 ? (
        <LoadingSpinner isDarkMode={isDarkMode} />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon="person"
          title={hasActiveFilter ? t('tournaments.notFound') : t('tournamentDetail.errors.noReferees')}
          description={hasActiveFilter ? t('tournamentDetail.tryChangingFilter') : t('tournamentDetail.errors.syncFirst')}
          isDarkMode={isDarkMode}
        />
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {filtered
              .slice((refereesPage - 1) * ITEMS_PER_PAGE, refereesPage * ITEMS_PER_PAGE)
              .map((referee) => {
                const badges: Badge[] = []

                if (referee.referee_level) {
                  badges.push({
                    label: referee.referee_level,
                    variant: 'info',
                  })
                }

                if (referee.number) {
                  badges.push({
                    label: `#${referee.number}`,
                    variant: 'neutral',
                  })
                }

                if (referee.delegate) {
                  badges.push({
                    label: t('common.delegate'),
                    variant: 'warning',
                  })
                }

                if (referee.matchairman) {
                  badges.push({
                    label: t('common.matchChairman'),
                    variant: 'success',
                  })
                }

                if (referee.is_referee) {
                  badges.push({
                    label: t('common.referee'),
                    variant: 'info',
                  })
                }

                const metadata = (
                  <>
                    {referee.mat_name && (
                      <span className={`px-2.5 py-1 rounded-full text-xs ${isDarkMode ? 'bg-white/5 text-gray-300' : 'bg-gray-200 text-gray-600'}`}>
                        Mat: {referee.mat_name}
                      </span>
                    )}
                  </>
                )

                return (
                  <Card
                    key={referee.id}
                    isDarkMode={isDarkMode}
                    name={referee.person_full_name || '—'}
                    countryCode={referee.team_alternate_name ?? referee.country_iso_code ?? undefined}
                    countryFlagUrl={buildArenaFlagUrl(referee.team_alternate_name ?? referee.country_iso_code) ?? undefined}
                    badges={badges.length > 0 ? badges : undefined}
                    metadata={referee.mat_name ? metadata : undefined}
                  />
                )
              })}
          </div>
          <Pagination
            isDarkMode={isDarkMode}
            currentPage={refereesPage}
            totalItems={filtered.length}
            itemsPerPage={ITEMS_PER_PAGE}
            onPageChange={setRefereesPage}
          />
        </>
      )}
    </div>
  )
}
