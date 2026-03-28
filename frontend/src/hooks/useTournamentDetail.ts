import { useState } from "react"
import { useApi } from "./useApi"
import { API_ENDPOINTS } from "@/config/api"

export type TabType = "weight-categories" | "teams" | "athletes" | "results" | "export"

export interface Team {
  id: string  // UUID from Arena API
  name: string
  country_iso_code: string | null
  athlete_count: number | null
}

export interface WeightCategory {
  id: number
  sport_event_id: number
  name: string
  sport_name: string
  audience_name: string
  max_weight: number
  count_fighters: number
  is_started: boolean
  is_completed: boolean
}

export interface Athlete {
  id: number
  person_full_name: string
  team_id: string | null  // UUID reference to Team
  sport_event_id: number
  weight_category_id: number | null
  is_competing: boolean
}

export interface FightResult {
  id: string
  weightCategoryName: string
  weightCategoryAlternateName: string
  sportName: string
  audienceName: string
  fighter1Id: string
  fighter1FullName: string
  fighter1DisplayName: string
  fighter2Id: string
  fighter2FullName: string
  fighter2DisplayName: string
  team1FullName: string
  team2FullName: string
  resultText: string
  resultTextSmall: string
  roundFriendlyName: string
  victoryType: string
  victoryTypeName: string
  winnerFighter: string | null
  status: number
  weightCategoryCompleted: boolean
  fightNumber: number
  technicalPoints: any[]
  endTime: number
  fighter1RankingPoint: number
  fighter2RankingPoint: number
  roundScores: any[]
}

interface UseTournamentDetailProps {
  tournamentId: number
  activeTab: TabType
}

export function useTournamentDetail({ tournamentId, activeTab }: UseTournamentDetailProps) {
  const [selectedTeam, setSelectedTeam] = useState<{ id: string; name: string } | null>(null)
  const [selectedWeightCategory, setSelectedWeightCategory] = useState<{ 
    id: string
    name: string
    sport_name: string
    audience_name: string 
  } | null>(null)

  // Fetch teams (only when teams tab is active)
  const { data: teams = [], loading: teamsLoading, error: teamsError } = useApi<Team[]>({
    endpoint: API_ENDPOINTS.TEAM_DATABASE(tournamentId),
    immediate: activeTab === "teams",
    transform: (response) => response.teams || []
  })

  // Fetch weight categories (always load for weight-categories tab)
  const { data: weightCategories = [], loading: weightCategoriesLoading, error: weightCategoriesError } = useApi<WeightCategory[]>({
    endpoint: API_ENDPOINTS.WEIGHT_CATEGORY_DATABASE(tournamentId),
    immediate: activeTab === "weight-categories",
    transform: (response) => response.weightCategories || []
  })

  // Fetch all athletes (for athletes tab)
  const { data: athletes = [], loading: athletesLoading, error: athletesError } = useApi<Athlete[]>({
    endpoint: API_ENDPOINTS.ATHLETE_DATABASE(tournamentId),
    immediate: activeTab === "athletes",
    transform: (response) => response.athletes || []
  })

  // Fetch team athletes (when a team is selected)
  const { data: teamAthletes = [], loading: loadingTeamAthletes } = useApi<Athlete[]>({
    endpoint: selectedTeam ? API_ENDPOINTS.ATHLETE_DATABASE_BY_TEAM(tournamentId, selectedTeam.id) : "",
    immediate: !!selectedTeam,
    transform: (response) => response.athletes || []
  })

  // Fetch weight category athletes (when a weight category is selected)
  const { data: weightCategoryAthletes = [], loading: loadingWeightCategoryAthletes } = useApi<Athlete[]>({
    endpoint: selectedWeightCategory 
      ? API_ENDPOINTS.ATHLETE_DATABASE_BY_WEIGHT_CATEGORY(tournamentId, selectedWeightCategory.id)
      : "",
    immediate: !!selectedWeightCategory,
    transform: (response) => response.athletes || []
  })

  // Fetch fight results (for results tab)
  const { data: results = [], loading: resultsLoading, error: resultsError } = useApi<FightResult[]>({
    endpoint: API_ENDPOINTS.RESULTS_DATABASE(tournamentId),
    immediate: activeTab === "results",
    transform: (response) => response.results || []
  })

  return {
    // Data
    teams,
    weightCategories,
    athletes,
    teamAthletes,
    weightCategoryAthletes,
    results,
    
    // Loading states
    teamsLoading,
    weightCategoriesLoading,
    athletesLoading,
    loadingTeamAthletes,
    loadingWeightCategoryAthletes,
    resultsLoading,
    
    // Error states
    teamsError,
    weightCategoriesError,
    athletesError,
    resultsError,
    
    // Selection state
    selectedTeam,
    setSelectedTeam,
    selectedWeightCategory,
    setSelectedWeightCategory
  }
}
