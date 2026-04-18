// Shared type definitions for Athlete entity

export interface Athlete {
  id: number
  person_full_name: string
  team_id?: number | null
  sport_event_id?: number
  weight_category_id?: number | null
  is_competing?: boolean
  country_iso_code?: string
  weight_category?: string
  sync_timestamp?: string
}
export interface AthleteWithDetails extends Athlete {
  team_name?: string
  weight_category_name?: string
  country_name?: string
}

export interface AthletesResponse {
  athletes: Athlete[]
  count?: number
  success?: boolean
}
