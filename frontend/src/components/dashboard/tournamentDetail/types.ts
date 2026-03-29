export type TabType = "weight-categories" | "teams" | "athletes" | "results" | "statistics" | "draw" | "export"

export interface EventStatistics {
  event_id: number
  event_name: string
  total_fights: number
  victory_type_distribution: Record<string, number>
  avg_duration: number
  avg_tp: number
  avg_cp: number
  top_performers: {
    name: string
    wins: number
    total_fights: number
    win_rate: number
    person_id: number | null
    team_name: string | null
    country: string | null
  }[]
  team_performance: {
    name: string
    country: string | null
    wins: number
    losses: number
    total_fights: number
    win_rate: number
  }[]
}

export interface Team {
  id: number
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
  team_id: number | null
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
  technicalPoints: Record<string, unknown>[]
  endTime: number
  fighter1RankingPoint: number
  fighter2RankingPoint: number
  roundScores: Record<string, unknown>[]
}

export const CHART_COLORS = ["#8b5cf6", "#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#ec4899", "#06b6d4", "#84cc16"]

export const ITEMS_PER_PAGE = 10
