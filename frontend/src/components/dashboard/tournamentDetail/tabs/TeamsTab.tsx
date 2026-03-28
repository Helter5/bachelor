import { Pagination } from "../Pagination"
import type { Team, Athlete, WeightCategory } from "../types"
import { ITEMS_PER_PAGE } from "../types"
import { CountryFlag } from "../../CountryFlag"

interface TeamsTabProps {
  isDarkMode: boolean
  teams: Team[]
  teamsLoading: boolean
  teamsError: string | null
  selectedTeam: { id: string; name: string } | null
  teamAthletes: Athlete[]
  loadingTeamAthletes: boolean
  weightCategories: WeightCategory[]
  teamsPage: number
  setTeamsPage: (page: number) => void
  teamAthletesPage: number
  setTeamAthletesPage: (page: number) => void
  openTeamDetail: (team: { id: string; name: string }) => void
  closeTeamDetail: () => void
  onSelectPerson?: (person: { id: number; name: string }) => void
  handleNameClick: (name: string) => void
}

export function TeamsTab({
  isDarkMode,
  teams,
  teamsLoading,
  teamsError,
  selectedTeam,
  teamAthletes,
  loadingTeamAthletes,
  weightCategories,
  teamsPage,
  setTeamsPage,
  teamAthletesPage,
  setTeamAthletesPage,
  openTeamDetail,
  closeTeamDetail,
  onSelectPerson,
  handleNameClick,
}: TeamsTabProps) {
  if (selectedTeam) {
    return (
      <div>
        {/* Detail View Header */}
        <div className="flex items-center gap-4 mb-6">
          <button
            onClick={closeTeamDetail}
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
          {(() => {
            const fullTeam = teams.find(t => t.id === parseInt(selectedTeam.id))
            return (
              <div className="flex items-center gap-3">
                <CountryFlag code={fullTeam?.country_iso_code} style={{ fontSize: '3rem' }} flagOnly />
                <div>
                  <h3 className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                    {selectedTeam.name}
                  </h3>
                  <p className={`text-sm mt-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                    Atléti tímu
                  </p>
                </div>
              </div>
            )
          })()}
        </div>

        {/* Athletes in Team */}
        {loadingTeamAthletes ? (
          <div className={`text-center py-12 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
            <p>Načítavam atlétov...</p>
          </div>
        ) : teamAthletes.length > 0 ? (
          <>
            <div className="space-y-2">
              {teamAthletes
                .slice((teamAthletesPage - 1) * ITEMS_PER_PAGE, teamAthletesPage * ITEMS_PER_PAGE)
                .map((athlete) => {
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
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <h4 className={`font-semibold text-base ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                          {onSelectPerson ? (
                            <button onClick={() => handleNameClick(athlete.person_full_name)} className={`hover:underline text-left ${isDarkMode ? 'text-blue-400 hover:text-blue-300' : 'text-blue-600 hover:text-blue-700'}`}>
                              {athlete.person_full_name}
                            </button>
                          ) : athlete.person_full_name}
                        </h4>
                        <div className={`text-xs mt-0.5 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                          {athleteWeightCategory?.name || 'Bez kategórie'}
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
              currentPage={teamAthletesPage}
              totalItems={teamAthletes.length}
              itemsPerPage={ITEMS_PER_PAGE}
              onPageChange={setTeamAthletesPage}
            />
          </>
        ) : (
          <div className={`text-center py-12 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            <svg className={`mx-auto h-12 w-12 mb-4 ${isDarkMode ? 'text-gray-600' : 'text-gray-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            <p className="text-lg font-medium">Žiadni atléti</p>
            <p className="text-sm mt-2">V tomto tíme nie sú žiadni atléti</p>
          </div>
        )}
      </div>
    )
  }

  return (
    <div>
      <h3 className={`text-xl font-semibold mb-6 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
        Tímy
      </h3>

      {teamsError && (
        <div className={`p-4 rounded-lg mb-4 ${isDarkMode ? 'bg-red-900/20 text-red-400' : 'bg-red-50 text-red-600'}`}>
          {teamsError}
        </div>
      )}

      {teamsLoading && teams.length === 0 ? (
        <div className={`text-center py-12 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p>Načítavam tímy...</p>
        </div>
      ) : teams.length === 0 ? (
        <div className={`text-center py-12 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
          <svg className={`mx-auto h-12 w-12 mb-4 ${isDarkMode ? 'text-gray-600' : 'text-gray-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
          <p className="text-lg font-medium">Žiadne tímy</p>
          <p className="text-sm mt-2">Použite synchronizáciu na hlavnej stránke</p>
        </div>
      ) : (
        <>
          <div className="space-y-2">
            {teams
              .slice((teamsPage - 1) * ITEMS_PER_PAGE, teamsPage * ITEMS_PER_PAGE)
              .map((team) => (
              <div
                key={team.id}
                onClick={() => openTeamDetail({ id: team.id.toString(), name: team.name })}
                className={`rounded-lg p-3 transition-all cursor-pointer ${
                  isDarkMode
                    ? 'bg-[#0f172a]/50 hover:bg-[#1e293b] shadow-md hover:shadow-xl backdrop-blur-sm'
                    : 'bg-gray-50 hover:bg-gray-100 border border-gray-200'
                }`}
              >
                <div className="flex items-center gap-3">
                  <CountryFlag code={team.country_iso_code} style={{ fontSize: '1.5rem' }} flagOnly />
                  <div className="flex-1">
                    <h4 className={`font-semibold text-base ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                      {team.name}
                    </h4>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs">
                    <svg className={`w-3.5 h-3.5 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                    <span className={isDarkMode ? 'text-gray-300' : 'text-gray-700'}>
                      {team.athlete_count || 0}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <Pagination
            isDarkMode={isDarkMode}
            currentPage={teamsPage}
            totalItems={teams.length}
            itemsPerPage={ITEMS_PER_PAGE}
            onPageChange={setTeamsPage}
          />
        </>
      )}
    </div>
  )
}
