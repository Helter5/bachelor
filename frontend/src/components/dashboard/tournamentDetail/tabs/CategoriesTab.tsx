import { useTranslation } from "react-i18next"
import { Pagination } from "../Pagination"
import type { WeightCategory, Team, Athlete } from "../types"
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
