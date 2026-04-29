import { useTranslation } from "react-i18next"
import { Pagination } from "../../shared/Pagination"
import type { Team, Athlete, WeightCategory } from "../types"
import { ITEMS_PER_PAGE } from "../types"
import { CountryFlag, buildArenaFlagUrl } from "../../shared/CountryFlag"
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

function AthleteCountPill({ count, isDarkMode, label }: { count: number; isDarkMode: boolean; label: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs ${isDarkMode ? 'bg-white/5 text-gray-300' : 'bg-gray-200 text-gray-600'}`}
      title={`${count} ${label}`}
      aria-label={`${count} ${label}`}
    >
      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.5 20.25a8.25 8.25 0 0115 0" />
      </svg>
      {count}
    </span>
  )
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
  const selectedTeamData = selectedTeam ? teams.find(t => t.id === parseInt(selectedTeam.id)) : undefined

  if (selectedTeam) {
    return (
      <div>
        <DetailHeader
          isDarkMode={isDarkMode}
          onBack={closeTeamDetail}
          title={selectedTeam.name}
          subtitle={t('tournamentDetail.teamAthletes')}
          leading={
            <CountryFlag
              code={selectedTeamData?.country_iso_code}
              imageUrl={buildArenaFlagUrl(selectedTeamData?.alternate_name ?? selectedTeamData?.country_iso_code)}
              className="h-12 w-auto"
              flagOnly
            />
          }
        />

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
                  <AthleteCountPill
                    count={team.athlete_count}
                    isDarkMode={isDarkMode}
                    label={t('tournamentDetail.athletesTitle').toLowerCase()}
                  />
                ) : undefined

                return (
                  <Card
                    key={team.id}
                    isDarkMode={isDarkMode}
                    name={team.name}
                    countryCode={team.country_iso_code || undefined}
                    countryFlagUrl={buildArenaFlagUrl(team.alternate_name ?? team.country_iso_code) ?? undefined}
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
