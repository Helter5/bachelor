import { useTranslation } from "react-i18next"
import { Pagination } from "../Pagination"
import type { WeightCategory, Team, Athlete } from "../types"
import { ITEMS_PER_PAGE } from "../types"
import { CountryFlag } from "../../CountryFlag"
import { StatusBadge } from "../../../ui/StatusBadge"
import { EmptyState } from "../../../ui/EmptyState"
import { LoadingSpinner } from "../../../ui/LoadingSpinner"
import { ErrorAlert } from "../../../ui/ErrorAlert"
import { DetailHeader } from "../../../ui/DetailHeader"

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
  onSelectPerson?: (person: { id: number; name: string }) => void
  handleNameClick: (name: string) => void
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
  onSelectPerson,
  handleNameClick,
}: CategoriesTabProps) {
  const { t } = useTranslation()
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

        {/* Athletes in Weight Category */}
        {loadingWeightCategoryAthletes ? (
          <LoadingSpinner text={t('tournamentDetail.errors.loadingAthletes')} isDarkMode={isDarkMode} />
        ) : weightCategoryAthletes.length > 0 ? (
          <>
            <div className="space-y-2">
              {weightCategoryAthletes
                .slice((weightCategoryAthletesPage - 1) * ITEMS_PER_PAGE, weightCategoryAthletesPage * ITEMS_PER_PAGE)
                .map((athlete) => {
                const athleteTeam = teams.find(t => t.id === athlete.team_id)
                return (
                  <div
                    key={athlete.id}
                    className={`rounded-lg p-3 transition-all ${
                      isDarkMode
                        ? 'bg-[#0f172a]/50 hover:bg-[#1e293b] shadow-md hover:shadow-xl backdrop-blur-sm'
                        : 'bg-gray-50 hover:bg-gray-100 border border-gray-200'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <h4 className={`font-semibold text-base ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                          {onSelectPerson ? (
                            <button onClick={() => handleNameClick(athlete.person_full_name)} className={`hover:underline text-left ${isDarkMode ? 'text-blue-400 hover:text-blue-300' : 'text-blue-600 hover:text-blue-700'}`}>
                              {athlete.person_full_name}
                            </button>
                          ) : athlete.person_full_name}
                        </h4>
                        <div className="flex items-center gap-1 text-xs mt-0.5">
                          <CountryFlag code={athleteTeam?.country_iso_code} />
                          <span className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>
                            {athleteTeam?.name || t('tournamentDetail.noTeam')}
                          </span>
                        </div>
                      </div>
                      {athlete.is_competing ? (
                        <StatusBadge variant="success" isDarkMode={isDarkMode}>{t('fighters.competing')}</StatusBadge>
                      ) : (
                        <StatusBadge variant="neutral" isDarkMode={isDarkMode}>{t('fighters.notCompeting')}</StatusBadge>
                      )}
                    </div>
                  </div>
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
        <div className="space-y-8">
          {(() => {
            const grouped = weightCategories.reduce((acc, wc) => {
              const key = `${wc.sport_name} - ${wc.audience_name}`
              if (!acc[key]) {
                acc[key] = []
              }
              acc[key].push(wc)
              return acc
            }, {} as Record<string, WeightCategory[]>)

            return Object.entries(grouped).map(([type, categories]) => {
              const paginatedCategories = categories.slice(
                (weightCategoriesPage - 1) * ITEMS_PER_PAGE,
                weightCategoriesPage * ITEMS_PER_PAGE
              )

              return (
                <div key={type}>
                  <h4 className={`text-lg font-bold mb-4 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                    {type}
                  </h4>

                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                    {paginatedCategories.map((wc) => (
                      <div
                        key={wc.id}
                        onClick={() => openWeightCategoryDetail({ id: wc.id, name: wc.name, sport_name: wc.sport_name, audience_name: wc.audience_name })}
                        className={`rounded-lg p-4 transition-all cursor-pointer flex flex-col ${
                          isDarkMode
                            ? 'bg-[#0f172a]/50 hover:bg-[#1e293b] shadow-md hover:shadow-xl backdrop-blur-sm'
                            : 'bg-gray-50 hover:bg-gray-100 border border-gray-200'
                        }`}
                      >
                        <h5 className={`font-bold text-xl mb-3 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                          {wc.name}
                        </h5>
                        <div className="flex items-center justify-between mt-auto">
                          <div className="flex items-center gap-1 text-xs">
                            <svg className={`w-3.5 h-3.5 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                            </svg>
                            <span className={isDarkMode ? 'text-gray-300' : 'text-gray-700'}>
                              {wc.count_fighters}
                            </span>
                          </div>
                          {(() => {
                            const status = getWeightCategoryStatus(wc)
                            if (status === 'completed') {
                              return <StatusBadge variant="success" isDarkMode={isDarkMode}>{t('tournamentDetail.statusCompleted')}</StatusBadge>
                            } else if (status === 'ongoing') {
                              return <StatusBadge variant="info" isDarkMode={isDarkMode}>{t('tournamentDetail.statusOngoing')}</StatusBadge>
                            } else {
                              return <StatusBadge variant="neutral" isDarkMode={isDarkMode}>{t('tournamentDetail.statusWaiting')}</StatusBadge>
                            }
                          })()}
                        </div>
                      </div>
                    ))}
                  </div>

                  <Pagination
                    isDarkMode={isDarkMode}
                    currentPage={weightCategoriesPage}
                    totalItems={categories.length}
                    itemsPerPage={ITEMS_PER_PAGE}
                    onPageChange={setWeightCategoriesPage}
                  />
                </div>
              )
            })
          })()}
        </div>
      )}
    </div>
  )
}
