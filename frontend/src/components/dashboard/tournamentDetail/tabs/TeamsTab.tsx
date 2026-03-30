import { Pagination } from "../Pagination"
import type { Team, Athlete, WeightCategory } from "../types"
import { ITEMS_PER_PAGE } from "../types"
import { CountryFlag } from "../../CountryFlag"
import { StatusBadge } from "../../../ui/StatusBadge"
import { EmptyState } from "../../../ui/EmptyState"
import { LoadingSpinner } from "../../../ui/LoadingSpinner"
import { ErrorAlert } from "../../../ui/ErrorAlert"
import { DetailHeader } from "../../../ui/DetailHeader"

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
        <DetailHeader
          isDarkMode={isDarkMode}
          onBack={closeTeamDetail}
          title={selectedTeam.name}
          subtitle="Atléti tímu"
          leading={<CountryFlag code={teams.find(t => t.id === parseInt(selectedTeam.id))?.country_iso_code} style={{ fontSize: '3rem' }} flagOnly />}
        />

        {/* Athletes in Team */}
        {loadingTeamAthletes ? (
          <LoadingSpinner text="Načítavam atlétov..." isDarkMode={isDarkMode} />
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
                        <StatusBadge variant="success" isDarkMode={isDarkMode}>Súťaží</StatusBadge>
                      ) : (
                        <StatusBadge variant="neutral" isDarkMode={isDarkMode}>Nesúťaží</StatusBadge>
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
          <EmptyState icon="person" title="Žiadni atléti" description="V tomto tíme nie sú žiadni atléti" isDarkMode={isDarkMode} />
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
        <ErrorAlert message={teamsError} isDarkMode={isDarkMode} className="mb-4" />
      )}

      {teamsLoading && teams.length === 0 ? (
        <LoadingSpinner text="Načítavam tímy..." isDarkMode={isDarkMode} />
      ) : teams.length === 0 ? (
        <EmptyState icon="team" title="Žiadne tímy" description="Použite synchronizáciu na hlavnej stránke" isDarkMode={isDarkMode} />
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {teams
              .slice((teamsPage - 1) * ITEMS_PER_PAGE, teamsPage * ITEMS_PER_PAGE)
              .map((team) => (
              <div
                key={team.id}
                onClick={() => openTeamDetail({ id: team.id.toString(), name: team.name })}
                className={`rounded-lg p-4 transition-all cursor-pointer flex flex-col ${
                  isDarkMode
                    ? 'bg-[#0f172a]/50 hover:bg-[#1e293b] shadow-md hover:shadow-xl backdrop-blur-sm'
                    : 'bg-gray-50 hover:bg-gray-100 border border-gray-200'
                }`}
              >
                <CountryFlag code={team.country_iso_code} style={{ fontSize: '2.5rem' }} flagOnly />
                <h4 className={`font-semibold text-base mt-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                  {team.name}
                </h4>
                <div className="flex items-center gap-1.5 text-xs mt-1">
                  <svg className={`w-3.5 h-3.5 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                  <span className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>
                    {team.athlete_count || 0} atlétov
                  </span>
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
