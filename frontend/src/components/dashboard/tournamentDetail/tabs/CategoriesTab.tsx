import { Pagination } from "../Pagination"
import type { WeightCategory, Team, Athlete } from "../types"
import { ITEMS_PER_PAGE } from "../types"
import { CountryFlag } from "../../CountryFlag"

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
  if (selectedWeightCategory) {
    return (
      <div>
        {/* Detail View Header */}
        <div className="flex items-center gap-4 mb-6">
          <button
            onClick={closeWeightCategoryDetail}
            className={`p-2 rounded-lg transition-all ${
              isDarkMode
                ? 'hover:bg-white/5 text-gray-300 hover:text-white'
                : 'hover:bg-gray-100 text-gray-600 hover:text-gray-900'
            }`}
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </button>
          <div>
            <h3 className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
              {selectedWeightCategory.name}
            </h3>
            <p className={`text-sm mt-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              {selectedWeightCategory.sport_name} • {selectedWeightCategory.audience_name}
            </p>
          </div>
        </div>

        {/* Athletes in Weight Category */}
        {loadingWeightCategoryAthletes ? (
          <div className={`text-center py-12 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
            <p>Načítavam atlétov...</p>
          </div>
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
                            {athleteTeam?.name || 'Bez tímu'}
                          </span>
                        </div>
                      </div>
                      {athlete.is_competing ? (
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${isDarkMode ? 'bg-green-900/30 text-green-400' : 'bg-green-100 text-green-800'}`}>
                          Súťaží
                        </span>
                      ) : (
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${isDarkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-700'}`}>
                          Nesúťaží
                        </span>
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
          <div className={`text-center py-12 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            <svg className={`mx-auto h-12 w-12 mb-4 ${isDarkMode ? 'text-gray-600' : 'text-gray-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            <p className="text-lg font-medium">Žiadni atléti</p>
            <p className="text-sm mt-2">V tejto váhovej kategórií nie sú žiadni atléti</p>
          </div>
        )}
      </div>
    )
  }

  return (
    <div>
      <h3 className={`text-xl font-semibold mb-6 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
        Váhové kategórie
      </h3>

      {weightCategoriesError && (
        <div className={`p-4 rounded-lg mb-4 ${isDarkMode ? 'bg-red-900/20 text-red-400' : 'bg-red-50 text-red-600'}`}>
          {weightCategoriesError}
        </div>
      )}

      {weightCategoriesLoading && weightCategories.length === 0 ? (
        <div className={`text-center py-12 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p>Načítavam váhové kategórie...</p>
        </div>
      ) : weightCategories.length === 0 ? (
        <div className={`text-center py-12 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
          <svg className={`mx-auto h-12 w-12 mb-4 ${isDarkMode ? 'text-gray-600' : 'text-gray-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" />
          </svg>
          <p className="text-lg font-medium">Žiadne váhové kategórie</p>
          <p className="text-sm mt-2">Použite synchronizáciu na hlavnej stránke</p>
        </div>
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

                  <div className="space-y-2">
                    {paginatedCategories.map((wc) => (
                      <div
                        key={wc.id}
                        onClick={() => openWeightCategoryDetail({ id: wc.id, name: wc.name, sport_name: wc.sport_name, audience_name: wc.audience_name })}
                        className={`rounded-lg p-3 transition-all cursor-pointer ${
                          isDarkMode
                            ? 'bg-[#0f172a]/50 hover:bg-[#1e293b] shadow-md hover:shadow-xl backdrop-blur-sm'
                            : 'bg-gray-50 hover:bg-gray-100 border border-gray-200'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <h5 className={`font-semibold text-base ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                              {wc.name}
                            </h5>
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="flex items-center gap-1.5 text-xs">
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
                                return (
                                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${isDarkMode ? 'bg-green-900/30 text-green-400' : 'bg-green-100 text-green-800'}`}>
                                    Dokončené
                                  </span>
                                )
                              } else if (status === 'ongoing') {
                                return (
                                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${isDarkMode ? 'bg-blue-900/30 text-blue-400' : 'bg-blue-100 text-blue-800'}`}>
                                    Prebieha
                                  </span>
                                )
                              } else {
                                return (
                                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${isDarkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-700'}`}>
                                    Čaká
                                  </span>
                                )
                              }
                            })()}
                          </div>
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
