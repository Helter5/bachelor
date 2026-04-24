import { useState, useEffect, useCallback } from "react"
import { useTranslation } from "react-i18next"
import { apiClient } from "@/services/apiClient"
import { API_ENDPOINTS } from "@/config/api"
import { useTournamentData } from "@/hooks/useTournamentData"

import type { TabType, Athlete } from "./tournamentDetail/types"
import { TeamsTab } from "./tournamentDetail/tabs/TeamsTab"
import { AthletesTab } from "./tournamentDetail/tabs/AthletesTab"
import { RefereesTab } from "./tournamentDetail/tabs/RefereesTab"
import { ResultsTab } from "./tournamentDetail/tabs/ResultsTab"
import { StatisticsTab } from "./tournamentDetail/tabs/StatisticsTab"
import { ExportTab } from "./tournamentDetail/tabs/ExportTab"
import { DrawTab } from "./tournamentDetail/tabs/DrawTab"
import { TournamentDetailHeader, TournamentTabs } from "./tournamentDetail/TournamentDetailChrome"

const TABS_ORDER: TabType[] = ["teams", "athletes", "referees", "results", "statistics", "draw", "export"]

interface TournamentDetailProps {
  isDarkMode: boolean
  tournamentId: number
  tournamentUuid: string
  tournamentName: string
  tournamentStartDate: string
  tournamentEndDate?: string
  onBack: () => void
  onSelectPerson?: (id: number, name: string) => void
}

export function TournamentDetail({
  isDarkMode,
  tournamentId,
  tournamentUuid,
  tournamentName,
  tournamentStartDate,
  tournamentEndDate,
  onBack,
  onSelectPerson,
}: TournamentDetailProps) {
  const { t } = useTranslation()

  // --- URL helpers ---

  const getLocalePrefix = useCallback(() => {
    const first = window.location.pathname.split("/").filter(Boolean)[0]?.toLowerCase()
    return first === "en" || first === "sk" ? `/${first}` : "/sk"
  }, [])

  const isTabType = useCallback((value: string | null): value is TabType => {
    return !!value && TABS_ORDER.includes(value as TabType)
  }, [])

  const getTournamentBasePath = useCallback(
    () => `${getLocalePrefix()}/dashboard/tournaments/${tournamentId}`,
    [getLocalePrefix, tournamentId],
  )

  const pushPathWithCurrentQuery = useCallback((path: string) => {
    const params = new URLSearchParams(window.location.search)
    const query = params.toString()
    window.history.pushState({}, "", query ? `${path}?${query}` : path)
  }, [])

  const pushCurrentPathWithQuery = useCallback((params: URLSearchParams) => {
    const query = params.toString()
    window.history.pushState(
      {},
      "",
      query ? `${window.location.pathname}?${query}` : window.location.pathname,
    )
  }, [])

  const getTabPath = useCallback(
    (tab: TabType) => {
      const basePath = getTournamentBasePath()
      return tab === "teams" ? basePath : `${basePath}/${tab}`
    },
    [getTournamentBasePath],
  )

  const getTabFromUrl = useCallback(() => {
    const segments = window.location.pathname.split("/").filter(Boolean)
    const tournamentsIdx = segments.indexOf("tournaments")
    if (tournamentsIdx >= 0) {
      const maybeTab = segments[tournamentsIdx + 2] || null
      if (isTabType(maybeTab)) return maybeTab
    }
    const urlTab = new URLSearchParams(window.location.search).get("tab")
    return isTabType(urlTab) ? urlTab : "teams"
  }, [isTabType])

  // --- Tab state ---

  const [activeTab, setActiveTab] = useState<TabType>(getTabFromUrl)

  const handleTabChange = useCallback(
    (tab: TabType) => {
      setActiveTab(tab)
      pushPathWithCurrentQuery(getTabPath(tab))
    },
    [getTabPath, pushPathWithCurrentQuery],
  )

  // --- Data (extracted to hook) ---

  const {
    teams,
    teamsLoading,
    teamsError,
    athletes,
    athletesLoading,
    athletesError,
    referees,
    refereesLoading,
    refereesError,
    results,
    resultsLoading,
    resultsError,
    eventStats,
    statsLoading,
    statsError,
    weightCategories,
    weightCategoriesLoading,
  } = useTournamentData(tournamentId, tournamentUuid, activeTab)

  // --- Pagination ---

  const [teamsPage, setTeamsPage] = useState(1)
  const [athletesPage, setAthletesPage] = useState(1)
  const [refereesPage, setRefereesPage] = useState(1)
  const [teamAthletesPage, setTeamAthletesPage] = useState(1)

  useEffect(() => {
    setTeamsPage(1)
    setAthletesPage(1)
  }, [activeTab])

  // --- Team detail ---

  const [selectedTeam, setSelectedTeam] = useState<{ id: string; name: string } | null>(null)
  const [teamAthletes, setTeamAthletes] = useState<Athlete[]>([])
  const [loadingTeamAthletes, setLoadingTeamAthletes] = useState(false)

  useEffect(() => { setTeamAthletesPage(1) }, [selectedTeam])

  const openTeamDetailWithoutHistory = useCallback(
    async (team: { id: string; name: string }) => {
      setSelectedTeam(team)
      setLoadingTeamAthletes(true)
      try {
        const data = await apiClient.get<Athlete[]>(
          API_ENDPOINTS.ATHLETE_DATABASE_BY_TEAM(tournamentId, Number(team.id)),
        )
        const list = Array.isArray(data) ? data : (data as { athletes?: Athlete[] }).athletes || []
        const seen = new Set<number>()
        setTeamAthletes(
          list.filter((a) => {
            if (!a.person_id || seen.has(a.person_id)) return false
            seen.add(a.person_id)
            return true
          }),
        )
      } catch (error) {
        console.error("Error loading team athletes:", error)
      } finally {
        setLoadingTeamAthletes(false)
      }
    },
    [tournamentId],
  )

  const openTeamDetail = useCallback(
    async (team: { id: string; name: string }) => {
      const params = new URLSearchParams(window.location.search)
      params.set("team", team.id)
      pushCurrentPathWithQuery(params)
      await openTeamDetailWithoutHistory(team)
    },
    [openTeamDetailWithoutHistory, pushCurrentPathWithQuery],
  )

  const closeTeamDetail = useCallback(() => {
    const params = new URLSearchParams(window.location.search)
    params.delete("team")
    pushCurrentPathWithQuery(params)
    setSelectedTeam(null)
    setTeamAthletes([])
  }, [pushCurrentPathWithQuery])

  // --- Results weight category detail ---

  const [
    selectedWeightCategoryForResults,
    setSelectedWeightCategoryForResults,
  ] = useState<{ id: number; name: string; sport_name: string; audience_name: string } | null>(null)

  const openWeightCategoryResultsDetail = useCallback(
    (wc: { id: number; name: string; sport_name: string; audience_name: string }) => {
      const params = new URLSearchParams(window.location.search)
      params.set("results_wc", wc.id.toString())
      pushCurrentPathWithQuery(params)
      setSelectedWeightCategoryForResults(wc)
    },
    [pushCurrentPathWithQuery],
  )

  const closeWeightCategoryResultsDetail = useCallback(() => {
    const params = new URLSearchParams(window.location.search)
    params.delete("results_wc")
    pushCurrentPathWithQuery(params)
    setSelectedWeightCategoryForResults(null)
  }, [pushCurrentPathWithQuery])

  // --- Weight category status ---

  const getWeightCategoryStatus = useCallback(
    (wc: { is_completed?: boolean; is_started?: boolean }): "completed" | "ongoing" | "waiting" => {
      if (wc.is_completed) return "completed"
      if (wc.is_started) return "ongoing"
      const now = new Date()
      const startDate = new Date(tournamentStartDate)
      const endDate = tournamentEndDate ? new Date(tournamentEndDate) : null
      if (endDate && endDate < now) return "completed"
      if (startDate <= now && (!endDate || endDate >= now)) return "ongoing"
      return "waiting"
    },
    [tournamentStartDate, tournamentEndDate],
  )

  // --- URL / history effects ---

  useEffect(() => {
    const handlePopState = () => {
      const params = new URLSearchParams(window.location.search)
      const teamId = params.get("team")
      const tab = getTabFromUrl()
      setActiveTab(tab)
      if (teamId && teams.length > 0) {
        const team = teams.find((t) => t.id === parseInt(teamId))
        if (team) openTeamDetailWithoutHistory({ id: team.id.toString(), name: team.name })
      } else {
        setSelectedTeam(null)
        setTeamAthletes([])
      }
    }
    window.addEventListener("popstate", handlePopState)
    return () => window.removeEventListener("popstate", handlePopState)
  }, [teams, openTeamDetailWithoutHistory, getTabFromUrl])

  useEffect(() => {
    const tab = getTabFromUrl()
    setActiveTab(tab)
    if (window.location.pathname !== getTabPath(tab)) {
      window.history.replaceState({}, "", getTabPath(tab))
    }
  }, [tournamentId, getTabFromUrl, getTabPath])

  // --- Render ---

  const tabs = TABS_ORDER.map((id) => ({ id, label: t(`tournamentDetail.tabs.${id}`) }))

  return (
    <div className="space-y-6">
      <TournamentDetailHeader isDarkMode={isDarkMode} tournamentName={tournamentName} onBack={onBack} />

      <TournamentTabs
        isDarkMode={isDarkMode}
        tabs={tabs}
        activeTab={activeTab}
        onTabChange={handleTabChange}
      />

      <div className={`rounded-lg p-6 ${isDarkMode ? "bg-[#1e293b] shadow-lg" : "bg-white border border-gray-200"}`}>
        {activeTab === "teams" && (
          <TeamsTab
            isDarkMode={isDarkMode}
            teams={teams}
            teamsLoading={teamsLoading}
            teamsError={teamsError}
            selectedTeam={selectedTeam}
            teamAthletes={teamAthletes}
            loadingTeamAthletes={loadingTeamAthletes}
            weightCategories={weightCategories}
            teamsPage={teamsPage}
            setTeamsPage={setTeamsPage}
            teamAthletesPage={teamAthletesPage}
            setTeamAthletesPage={setTeamAthletesPage}
            openTeamDetail={openTeamDetail}
            closeTeamDetail={closeTeamDetail}
            onSelectPerson={onSelectPerson}
          />
        )}

        {activeTab === "athletes" && (
          <AthletesTab
            isDarkMode={isDarkMode}
            athletes={athletes}
            athletesLoading={athletesLoading}
            athletesError={athletesError}
            teams={teams}
            weightCategories={weightCategories}
            athletesPage={athletesPage}
            setAthletesPage={setAthletesPage}
            onSelectPerson={onSelectPerson}
          />
        )}

        {activeTab === "referees" && (
          <RefereesTab
            isDarkMode={isDarkMode}
            referees={referees}
            loading={refereesLoading}
            error={refereesError}
            refereesPage={refereesPage}
            setRefereesPage={setRefereesPage}
          />
        )}

        {activeTab === "results" && (
          <ResultsTab
            isDarkMode={isDarkMode}
            results={results}
            resultsLoading={resultsLoading}
            resultsError={resultsError}
            teams={teams}
            weightCategories={weightCategories}
            weightCategoriesLoading={weightCategoriesLoading}
            selectedWeightCategoryForResults={selectedWeightCategoryForResults}
            openWeightCategoryResultsDetail={openWeightCategoryResultsDetail}
            closeWeightCategoryResultsDetail={closeWeightCategoryResultsDetail}
            getWeightCategoryStatus={getWeightCategoryStatus}
          />
        )}

        {activeTab === "statistics" && (
          <StatisticsTab
            isDarkMode={isDarkMode}
            eventStats={eventStats}
            statsLoading={statsLoading}
            statsError={statsError}
            onSelectPerson={onSelectPerson}
          />
        )}

        {activeTab === "draw" && (
          <DrawTab
            isDarkMode={isDarkMode}
            eventId={tournamentId}
            teams={teams}
            weightCategories={weightCategories}
            weightCategoriesLoading={weightCategoriesLoading}
            athletesCount={athletes.length}
            athletesLoading={athletesLoading}
          />
        )}

        {activeTab === "export" && (
          <ExportTab
            isDarkMode={isDarkMode}
            teams={teams}
            athletes={athletes}
            tournamentUuid={tournamentUuid}
          />
        )}
      </div>
    </div>
  )
}
