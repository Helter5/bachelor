import { useTranslation } from "react-i18next"
import { Pagination } from "../Pagination"
import type { Team, Athlete, WeightCategory } from "../types"
import { ITEMS_PER_PAGE } from "../types"
import { CountryFlag } from "../../CountryFlag"
import { Card } from "../Card"
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
  onSelectPerson?: (id: number, name: string) => void
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
}: TeamsTabProps) {
  const { t } = useTranslation()

  if (selectedTeam) {
    return (
      <div>
        {/* Detail View Header */}
        <DetailHeader
          isDarkMode={isDarkMode}
          onBack={closeTeamDetail}
          title={selectedTeam.name}
          subtitle={t('tournamentDetail.teamAthletes')}
          leading={<CountryFlag code={teams.find(t => t.id === parseInt(selectedTeam.id))?.country_iso_code} style={{ fontSize: '3rem' }} flagOnly />}
        />

        {/* Athletes in Team */}
        {loadingTeamAthletes ? (
          <LoadingSpinner text={t('tournamentDetail.errors.loadingAthletes')} isDarkMode={isDarkMode} />
        ) : teamAthletes.length > 0 ? (
          <>
            <div className="space-y-2">
              {teamAthletes
                .slice((teamAthletesPage - 1) * ITEMS_PER_PAGE, teamAthletesPage * ITEMS_PER_PAGE)
                .map((athlete) => {
                const athleteWeightCategory = weightCategories.find(wc => wc.id === athlete.weight_category_id)
                const metadata = athleteWeightCategory?.name ? (
                  <span className={`px-2.5 py-1 rounded-full text-xs ${isDarkMode ? 'bg-white/5 text-gray-300' : 'bg-gray-200 text-gray-600'}`}>
                    {athleteWeightCategory.name}
                  </span>
                ) : undefined

                return (
                  <Card
                    key={athlete.id}
                    isDarkMode={isDarkMode}
                    name={athlete.person_full_name}
                    metadata={metadata}
                    statusBadge={{
                      label: athlete.is_competing ? t('fighters.competing') : t('fighters.notCompeting'),
                      variant: athlete.is_competing ? 'success' : 'neutral',
                    }}
                    onClick={onSelectPerson && athlete.person_id ? () => onSelectPerson(athlete.person_id!, athlete.person_full_name) : undefined}
                  />
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
          <EmptyState icon="person" title={t('tournamentDetail.errors.noAthletes')} description={t('tournamentDetail.errors.noAthletesInTeam')} isDarkMode={isDarkMode} />
        )}
      </div>
    )
  }

  return (
    <div>
      <h3 className={`text-xl font-semibold mb-6 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
        {t('tournamentDetail.teamsTitle')}
      </h3>

      {teamsError && (
        <ErrorAlert message={teamsError} isDarkMode={isDarkMode} className="mb-4" />
      )}

      {teamsLoading && teams.length === 0 ? (
        <LoadingSpinner text={t('tournamentDetail.errors.loadingTeams')} isDarkMode={isDarkMode} />
      ) : teams.length === 0 ? (
        <EmptyState icon="team" title={t('tournamentDetail.errors.noTeams')} description={t('tournamentDetail.errors.syncFirst')} isDarkMode={isDarkMode} />
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {teams
              .slice((teamsPage - 1) * ITEMS_PER_PAGE, teamsPage * ITEMS_PER_PAGE)
              .map((team) => {
                const metadata = team.athlete_count !== null ? (
                  <span className={`px-2.5 py-1 rounded-full text-xs ${isDarkMode ? 'bg-white/5 text-gray-300' : 'bg-gray-200 text-gray-600'}`}>
                    {t('tournamentDetail.athleteCount', { count: team.athlete_count })}
                  </span>
                ) : undefined

                return (
                  <Card
                    key={team.id}
                    isDarkMode={isDarkMode}
                    name={team.name}
                    countryCode={team.country_iso_code || undefined}
                    metadata={metadata}
                    onClick={() => openTeamDetail({ id: team.id.toString(), name: team.name })}
                  />
                )
              })}
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
