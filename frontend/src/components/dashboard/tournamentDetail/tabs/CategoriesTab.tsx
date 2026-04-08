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
                          {athlete.person_full_name}
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
