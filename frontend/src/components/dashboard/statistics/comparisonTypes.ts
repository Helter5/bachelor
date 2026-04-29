export interface ComparisonPerson {
  id: number
  name: string
  country: string | null
}

export interface ComparisonFight {
  fight_id: number
  sport_event_name: string | null
  weight_category: string | null
  person1_name: string
  person2_name: string
  person1_tp: number | null
  person2_tp: number | null
  person1_cp: number | null
  person2_cp: number | null
  victory_type: string | null
  duration: number | null
  winner: "person1" | "person2" | null
  winner_name: string | null
}

export interface OpponentSummary {
  wins?: number
  losses?: number
  avg_tp?: number
  avg_cp?: number
}

export interface CommonOpponent {
  opponent: ComparisonPerson
  person1_summary: OpponentSummary
  person2_summary: OpponentSummary
}

export interface ComparisonResult {
  person1: ComparisonPerson
  person2: ComparisonPerson
  total_fights: number
  person1_wins: number
  person2_wins: number
  fights: ComparisonFight[]
  common_opponents?: CommonOpponent[]
  error?: string
}
