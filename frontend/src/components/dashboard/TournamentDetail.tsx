import { useState, useEffect, useCallback } from "react"
import { useTranslation } from "react-i18next"
import { apiClient } from "@/services/apiClient"
import { API_ENDPOINTS } from "@/config/api"

import type { TabType, Team, WeightCategory, Athlete, FightResult, EventStatistics } from "./tournamentDetail/types"
import { CategoriesTab } from "./tournamentDetail/tabs/CategoriesTab"
import { TeamsTab } from "./tournamentDetail/tabs/TeamsTab"
import { AthletesTab } from "./tournamentDetail/tabs/AthletesTab"
import { ResultsTab } from "./tournamentDetail/tabs/ResultsTab"
import { StatisticsTab } from "./tournamentDetail/tabs/StatisticsTab"
import { ExportTab } from "./tournamentDetail/tabs/ExportTab"
import { DrawTab } from "./tournamentDetail/tabs/DrawTab"

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
  const getLocalePrefix = useCallback(() => {
    const first = window.location.pathname.split('/').filter(Boolean)[0]?.toLowerCase()
    return first === 'en' || first === 'sk' ? `/${first}` : '/sk'
  }, [])

  const tabsOrder: TabType[] = ["teams", "athletes", "results", "statistics", "draw", "export"]
  const isTabType = (value: string | null): value is TabType => {
    return !!value && tabsOrder.includes(value as TabType)
  }

  const getTournamentBasePath = useCallback(() => `${getLocalePrefix()}/dashboard/tournaments/${tournamentId}`, [getLocalePrefix, tournamentId])

  const pushPathWithCurrentQuery = useCallback((path: string) => {
    const params = new URLSearchParams(window.location.search)
    const query = params.toString()
    window.history.pushState({}, '', query ? `${path}?${query}` : path)
  }, [])

  const pushCurrentPathWithQuery = useCallback((params: URLSearchParams) => {
    const query = params.toString()
    window.history.pushState({}, '', query ? `${window.location.pathname}?${query}` : window.location.pathname)
  }, [])

  const getTabPath = useCallback((tab: TabType) => {
    const basePath = getTournamentBasePath()
    return tab === 'teams' ? basePath : `${basePath}/${tab}`
  }, [getTournamentBasePath])

  const getTabFromUrl = () => {
    const segments = window.location.pathname.split('/').filter(Boolean)
    const tournamentsIdx = segments.indexOf('tournaments')
    if (tournamentsIdx >= 0) {
      const maybeTab = segments[tournamentsIdx + 2] || null
      if (isTabType(maybeTab)) {
        return maybeTab
      }
    }

    // Backward compatibility for older query links
    const urlTab = new URLSearchParams(window.location.search).get('tab')
    return isTabType(urlTab) ? urlTab : 'teams'
  }

  const [activeTab, setActiveTab] = useState<TabType>(getTabFromUrl)

  const [teams, setTeams] = useState<Team[]>([])
  const [teamsLoading, setTeamsLoading] = useState(false)
  const [teamsError, setTeamsError] = useState<string | null>(null)

  const [weightCategories, setWeightCategories] = useState<WeightCategory[]>([])
  const [weightCategoriesLoading, setWeightCategoriesLoading] = useState(false)
  const [weightCategoriesError, setWeightCategoriesError] = useState<string | null>(null)

  const [athletes, setAthletes] = useState<Athlete[]>([])
  const [athletesLoading, setAthletesLoading] = useState(false)
  const [athletesError, setAthletesError] = useState<string | null>(null)

  const [selectedTeam, setSelectedTeam] = useState<{ id: string; name: string } | null>(null)
  const [teamAthletes, setTeamAthletes] = useState<Athlete[]>([])
  const [loadingTeamAthletes, setLoadingTeamAthletes] = useState(false)

  const [selectedWeightCategory, setSelectedWeightCategory] = useState<{ id: number; name: string; sport_name: string; audience_name: string } | null>(null)
  const [weightCategoryAthletes, setWeightCategoryAthletes] = useState<Athlete[]>([])
  const [loadingWeightCategoryAthletes, setLoadingWeightCategoryAthletes] = useState(false)

  const [results, setResults] = useState<FightResult[]>([])
  const [resultsLoading, setResultsLoading] = useState(false)
  const [resultsError, setResultsError] = useState<string | null>(null)
  const [selectedWeightCategoryForResults, setSelectedWeightCategoryForResults] = useState<{ id: number; name: string; sport_name: string; audience_name: string } | null>(null)

  const [eventStats, setEventStats] = useState<EventStatistics | null>(null)
  const [statsLoading, setStatsLoading] = useState(false)
  const [statsError, setStatsError] = useState<string | null>(null)

  const [weightCategoriesPage, setWeightCategoriesPage] = useState(1)
  const [teamsPage, setTeamsPage] = useState(1)
  const [athletesPage, setAthletesPage] = useState(1)
  const [teamAthletesPage, setTeamAthletesPage] = useState(1)
  const [weightCategoryAthletesPage, setWeightCategoryAthletesPage] = useState(1)

  const getWeightCategoryStatus = useCallback((wc: WeightCategory): 'completed' | 'ongoing' | 'waiting' => {
    if (wc.is_completed) return 'completed'
    if (wc.is_started) return 'ongoing'
    const now = new Date()
    const startDate = new Date(tournamentStartDate)
    const endDate = tournamentEndDate ? new Date(tournamentEndDate) : null
    if (endDate && endDate < now) return 'completed'
    if (startDate <= now && (!endDate || endDate >= now)) return 'ongoing'
    return 'waiting'
  }, [tournamentStartDate, tournamentEndDate])


  // --- Data loaders ---

  const loadTeams = useCallback(async () => {
    setTeamsLoading(true)
    setTeamsError(null)
    try {
      const data = await apiClient.get<Team[]>(API_ENDPOINTS.TEAM_DATABASE(tournamentId))
      setTeams(data || [])
    } catch (error) {
      console.error('Error loading teams:', error)
      setTeamsError(t("tournamentDetail.errors.loadTeams"))
    } finally {
      setTeamsLoading(false)
    }
  }, [tournamentId])

  const loadWeightCategories = useCallback(async () => {
    setWeightCategoriesLoading(true)
    setWeightCategoriesError(null)
    try {
      const data = await apiClient.get<WeightCategory[]>(API_ENDPOINTS.WEIGHT_CATEGORY_DATABASE(tournamentId))
      setWeightCategories(data || [])
    } catch (error) {
      console.error('Error loading weight categories:', error)
      setWeightCategoriesError(t("tournamentDetail.errors.loadWeightCategories"))
    } finally {
      setWeightCategoriesLoading(false)
    }
  }, [tournamentId])

  const loadAthletes = useCallback(async () => {
    setAthletesLoading(true)
    setAthletesError(null)
    try {
      const data = await apiClient.get<Athlete[]>(API_ENDPOINTS.ATHLETE_DATABASE(tournamentId))
      setAthletes(data || [])
    } catch (error) {
      console.error('Error loading athletes:', error)
      setAthletesError(t("tournamentDetail.errors.loadAthletes"))
    } finally {
      setAthletesLoading(false)
    }
  }, [tournamentId])

  const loadResults = useCallback(async () => {
    setResultsLoading(true)
    setResultsError(null)
    try {
      const data = await apiClient.get<FightResult[]>(API_ENDPOINTS.RESULTS(tournamentUuid))
      setResults(data || [])
    } catch (error) {
      console.error('Error loading results:', error)
      setResultsError(t("tournamentDetail.errors.loadResults"))
    } finally {
      setResultsLoading(false)
    }
  }, [tournamentUuid])

  const loadStatistics = useCallback(async () => {
    setStatsLoading(true)
    setStatsError(null)
    try {
      const data = await apiClient.get<EventStatistics>(API_ENDPOINTS.EVENT_STATISTICS(tournamentId))
      setEventStats(data)
    } catch (error) {
      console.error('Error loading statistics:', error)
      setStatsError(t("tournamentDetail.errors.loadStatistics"))
    } finally {
      setStatsLoading(false)
    }
  }, [tournamentId])

  // --- Team detail ---

  const openTeamDetailWithoutHistory = useCallback(async (team: { id: string; name: string }) => {
    setSelectedTeam(team)
    setLoadingTeamAthletes(true)
    try {
      const data = await apiClient.get<Athlete[]>(
        API_ENDPOINTS.ATHLETE_DATABASE_BY_TEAM(tournamentId, Number(team.id))
      )
      const teamAthleteList = Array.isArray(data) ? data : (data as { athletes?: Athlete[] }).athletes || []
      const seen = new Set<number>()
      const unique = teamAthleteList.filter(a => {
        if (!a.person_id || seen.has(a.person_id)) return false
        seen.add(a.person_id)
        return true
      })
      setTeamAthletes(unique)
    } catch (error) {
      console.error('Error loading team athletes:', error)
    } finally {
      setLoadingTeamAthletes(false)
    }
  }, [tournamentId])

  const openTeamDetail = useCallback(async (team: { id: string; name: string }) => {
    const params = new URLSearchParams(window.location.search)
    params.set('team', team.id)
    pushCurrentPathWithQuery(params)
    await openTeamDetailWithoutHistory(team)
  }, [openTeamDetailWithoutHistory, pushCurrentPathWithQuery])

  const closeTeamDetail = useCallback(() => {
    const params = new URLSearchParams(window.location.search)
    params.delete('team')
    pushCurrentPathWithQuery(params)
    setSelectedTeam(null)
    setTeamAthletes([])
  }, [pushCurrentPathWithQuery])

  // --- Weight category detail ---

  const openWeightCategoryDetailWithoutHistory = useCallback(async (wc: { id: number; name: string; sport_name: string; audience_name: string }) => {
    setSelectedWeightCategory(wc)
    setLoadingWeightCategoryAthletes(true)
    try {
      if (teams.length === 0) await loadTeams()
      const data = await apiClient.get<Athlete[]>(API_ENDPOINTS.ATHLETE_DATABASE(tournamentId))
      const filtered = (data || []).filter((a: Athlete) => a.weight_category_id === wc.id)
      setWeightCategoryAthletes(filtered)
    } catch (error) {
      console.error('Error loading weight category athletes:', error)
    } finally {
      setLoadingWeightCategoryAthletes(false)
    }
  }, [teams, tournamentId, loadTeams])

  const openWeightCategoryDetail = useCallback(async (wc: { id: number; name: string; sport_name: string; audience_name: string }) => {
    const params = new URLSearchParams(window.location.search)
    params.set('wc', wc.id.toString())
    pushCurrentPathWithQuery(params)
    await openWeightCategoryDetailWithoutHistory(wc)
  }, [openWeightCategoryDetailWithoutHistory, pushCurrentPathWithQuery])

  const closeWeightCategoryDetail = useCallback(() => {
    const params = new URLSearchParams(window.location.search)
    params.delete('wc')
    pushCurrentPathWithQuery(params)
    setSelectedWeightCategory(null)
    setWeightCategoryAthletes([])
  }, [pushCurrentPathWithQuery])

  // --- Results weight category detail ---

  const openWeightCategoryResultsDetail = useCallback((wc: { id: number; name: string; sport_name: string; audience_name: string }) => {
    const params = new URLSearchParams(window.location.search)
    params.set('results_wc', wc.id.toString())
    pushCurrentPathWithQuery(params)
    setSelectedWeightCategoryForResults(wc)
  }, [pushCurrentPathWithQuery])

  const closeWeightCategoryResultsDetail = useCallback(() => {
    const params = new URLSearchParams(window.location.search)
    params.delete('results_wc')
    pushCurrentPathWithQuery(params)
    setSelectedWeightCategoryForResults(null)
  }, [pushCurrentPathWithQuery])

  const handleTabChange = useCallback((tab: TabType) => {
    setActiveTab(tab)
    pushPathWithCurrentQuery(getTabPath(tab))
  }, [getTabPath, pushPathWithCurrentQuery])

  // --- Effects ---

  useEffect(() => {
    const handlePopState = () => {
      const params = new URLSearchParams(window.location.search)
      const teamId = params.get('team')
      const wcId = params.get('wc')
      const tab = getTabFromUrl()

      setActiveTab(tab)

      if (teamId && teams.length > 0) {
        const team = teams.find(t => t.id === parseInt(teamId))
        if (team) openTeamDetailWithoutHistory({ id: team.id.toString(), name: team.name })
      } else if (wcId && weightCategories.length > 0) {
        const wc = weightCategories.find(w => w.id === parseInt(wcId))
        if (wc) openWeightCategoryDetailWithoutHistory({ id: wc.id, name: wc.name, sport_name: wc.sport_name, audience_name: wc.audience_name })
      } else {
        setSelectedTeam(null)
        setSelectedWeightCategory(null)
        setTeamAthletes([])
        setWeightCategoryAthletes([])
      }
    }
    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [teams, weightCategories, openTeamDetailWithoutHistory, openWeightCategoryDetailWithoutHistory])

  useEffect(() => {
    const tab = getTabFromUrl()
    setActiveTab(tab)
    if (window.location.pathname !== getTabPath(tab)) {
      window.history.replaceState({}, '', getTabPath(tab))
    }
  }, [tournamentId])

  useEffect(() => {
    if (activeTab === "teams") loadTeams()
    else if (activeTab === "athletes") {
      loadAthletes()
      if (teams.length === 0) loadTeams()
      if (weightCategories.length === 0) loadWeightCategories()
    }
    else if (activeTab === "results") loadResults()
    else if (activeTab === "statistics") loadStatistics()
    else if (activeTab === "draw") {
      if (weightCategories.length === 0) loadWeightCategories()
    }
    else if (activeTab === "export") {
      if (teams.length === 0) loadTeams()
      if (athletes.length === 0) loadAthletes()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, tournamentId, loadTeams, loadWeightCategories, loadAthletes, loadResults, loadStatistics])

  useEffect(() => {
    setWeightCategoriesPage(1)
    setTeamsPage(1)
    setAthletesPage(1)
  }, [activeTab])

  useEffect(() => { setTeamAthletesPage(1) }, [selectedTeam])
  useEffect(() => { setWeightCategoryAthletesPage(1) }, [selectedWeightCategory])

  // --- Render ---

  const tabs: { id: TabType; label: string }[] = [
    { id: "teams", label: t("tournamentDetail.tabs.teams") },
    { id: "athletes", label: t("tournamentDetail.tabs.athletes") },
    { id: "results", label: t("tournamentDetail.tabs.results") },
    { id: "statistics", label: t("tournamentDetail.tabs.statistics") },
    { id: "draw", label: t("tournamentDetail.tabs.draw") },
    { id: "export", label: t("tournamentDetail.tabs.export") },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={onBack}
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
          <h2 className={`text-3xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
            {tournamentName}
          </h2>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div>
        <nav className={`flex gap-8 border-b ${isDarkMode ? 'border-white/5' : 'border-gray-200'}`}>
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => handleTabChange(tab.id)}
              className={`pb-4 px-1 font-medium transition-all ${
                activeTab === tab.id
                  ? isDarkMode ? 'text-blue-400' : 'text-blue-600'
                  : isDarkMode ? 'text-gray-400 hover:text-gray-300' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div className={`rounded-lg p-6 ${isDarkMode ? 'bg-[#1e293b] shadow-lg' : 'bg-white border border-gray-200'}`}>
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

        {activeTab === "results" && (
          <ResultsTab
            isDarkMode={isDarkMode}
            results={results}
            resultsLoading={resultsLoading}
            resultsError={resultsError}
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
            weightCategories={weightCategories}
            weightCategoriesLoading={weightCategoriesLoading}
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
