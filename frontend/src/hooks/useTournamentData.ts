import { useState, useCallback, useEffect, type Dispatch, type SetStateAction } from "react"
import { useTranslation } from "react-i18next"
import { apiClient } from "@/services/apiClient"
import { API_ENDPOINTS } from "@/config/api"
import type {
  TabType,
  Team,
  WeightCategory,
  Athlete,
  FightResult,
  EventStatistics,
  Referee,
} from "@/components/dashboard/tournamentDetail/types"

export interface TournamentDataResult {
  teams: Team[]
  teamsLoading: boolean
  teamsError: string | null

  athletes: Athlete[]
  athletesLoading: boolean
  athletesError: string | null

  referees: Referee[]
  refereesLoading: boolean
  refereesError: string | null

  results: FightResult[]
  resultsLoading: boolean
  resultsError: string | null

  eventStats: EventStatistics | null
  statsLoading: boolean
  statsError: string | null

  weightCategories: WeightCategory[]
  weightCategoriesLoading: boolean
}

export function useTournamentData(
  tournamentId: number,
  tournamentUuid: string,
  activeTab: TabType,
): TournamentDataResult {
  const { t } = useTranslation()

  const [teams, setTeams] = useState<Team[]>([])
  const [teamsLoading, setTeamsLoading] = useState(false)
  const [teamsError, setTeamsError] = useState<string | null>(null)

  const [weightCategories, setWeightCategories] = useState<WeightCategory[]>([])
  const [weightCategoriesLoading, setWeightCategoriesLoading] = useState(false)
  const [, setWeightCategoriesError] = useState<string | null>(null)

  const [athletes, setAthletes] = useState<Athlete[]>([])
  const [athletesLoading, setAthletesLoading] = useState(false)
  const [athletesError, setAthletesError] = useState<string | null>(null)

  const [referees, setReferees] = useState<Referee[]>([])
  const [refereesLoading, setRefereesLoading] = useState(false)
  const [refereesError, setRefereesError] = useState<string | null>(null)

  const [results, setResults] = useState<FightResult[]>([])
  const [resultsLoading, setResultsLoading] = useState(false)
  const [resultsError, setResultsError] = useState<string | null>(null)

  const [eventStats, setEventStats] = useState<EventStatistics | null>(null)
  const [statsLoading, setStatsLoading] = useState(false)
  const [statsError, setStatsError] = useState<string | null>(null)

  const runLoader = useCallback(
    async <T,>({
      context,
      request,
      setLoading,
      setError,
      errorKey,
      onSuccess,
      onError,
    }: {
      context: string
      request: () => Promise<T>
      setLoading: Dispatch<SetStateAction<boolean>>
      setError?: Dispatch<SetStateAction<string | null>>
      errorKey?: string
      onSuccess: (data: T) => void
      onError?: () => void
    }) => {
      setLoading(true)
      setError?.(null)
      try {
        const data = await request()
        onSuccess(data)
      } catch (error) {
        console.error(`Error ${context}:`, error)
        if (setError && errorKey) setError(t(errorKey))
        onError?.()
      } finally {
        setLoading(false)
      }
    },
    [t],
  )

  const loadTeams = useCallback(async () => {
    await runLoader<Team[]>({
      context: "loading teams",
      request: () => apiClient.get<Team[]>(API_ENDPOINTS.TEAM_DATABASE(tournamentId)),
      setLoading: setTeamsLoading,
      setError: setTeamsError,
      errorKey: "tournamentDetail.errors.loadTeams",
      onSuccess: (data) => setTeams(data || []),
      onError: () => setTeams([]),
    })
  }, [runLoader, tournamentId])

  const loadWeightCategories = useCallback(async () => {
    await runLoader<WeightCategory[]>({
      context: "loading weight categories",
      request: () => apiClient.get<WeightCategory[]>(API_ENDPOINTS.WEIGHT_CATEGORY_DATABASE(tournamentId)),
      setLoading: setWeightCategoriesLoading,
      setError: setWeightCategoriesError,
      errorKey: "tournamentDetail.errors.loadWeightCategories",
      onSuccess: (data) => setWeightCategories(data || []),
      onError: () => setWeightCategories([]),
    })
  }, [runLoader, tournamentId])

  const loadAthletes = useCallback(async () => {
    await runLoader<Athlete[]>({
      context: "loading athletes",
      request: () => apiClient.get<Athlete[]>(API_ENDPOINTS.ATHLETE_DATABASE(tournamentId)),
      setLoading: setAthletesLoading,
      setError: setAthletesError,
      errorKey: "tournamentDetail.errors.loadAthletes",
      onSuccess: (data) => setAthletes(data || []),
      onError: () => setAthletes([]),
    })
  }, [runLoader, tournamentId])

  const loadReferees = useCallback(async () => {
    await runLoader<Referee[]>({
      context: "loading referees",
      request: () => apiClient.get<Referee[]>(API_ENDPOINTS.REFEREES(tournamentId)),
      setLoading: setRefereesLoading,
      setError: setRefereesError,
      errorKey: "tournamentDetail.errors.loadReferees",
      onSuccess: (data) => setReferees(data || []),
      onError: () => setReferees([]),
    })
  }, [runLoader, tournamentId])

  const loadResults = useCallback(async () => {
    await runLoader<FightResult[]>({
      context: "loading results",
      request: () => apiClient.get<FightResult[]>(API_ENDPOINTS.RESULTS(tournamentUuid)),
      setLoading: setResultsLoading,
      setError: setResultsError,
      errorKey: "tournamentDetail.errors.loadResults",
      onSuccess: (data) => setResults(data || []),
      onError: () => setResults([]),
    })
  }, [runLoader, tournamentUuid])

  const loadStatistics = useCallback(async () => {
    await runLoader<EventStatistics>({
      context: "loading statistics",
      request: () => apiClient.get<EventStatistics>(API_ENDPOINTS.EVENT_STATISTICS(tournamentId)),
      setLoading: setStatsLoading,
      setError: setStatsError,
      errorKey: "tournamentDetail.errors.loadStatistics",
      onSuccess: (data) => setEventStats(data),
      onError: () => setEventStats(null),
    })
  }, [runLoader, tournamentId])

  useEffect(() => {
    if (activeTab === "teams") {
      loadTeams()
    } else if (activeTab === "athletes") {
      loadAthletes()
      if (teams.length === 0) loadTeams()
      if (weightCategories.length === 0) loadWeightCategories()
    } else if (activeTab === "referees") {
      loadReferees()
    } else if (activeTab === "results") {
      loadResults()
      if (weightCategories.length === 0) loadWeightCategories()
    } else if (activeTab === "statistics") {
      loadStatistics()
    } else if (activeTab === "draw") {
      if (weightCategories.length === 0) loadWeightCategories()
    } else if (activeTab === "export") {
      if (teams.length === 0) loadTeams()
      if (athletes.length === 0) loadAthletes()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, tournamentId, loadTeams, loadWeightCategories, loadAthletes, loadResults, loadStatistics, loadReferees])

  return {
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
  }
}
