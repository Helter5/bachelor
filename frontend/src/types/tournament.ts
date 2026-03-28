// Shared type definitions for Tournament/Event entity

export interface Tournament {
  id: number
  uuid: string
  name: string
  full_name?: string
  start_date: string
  end_date?: string
  address_locality?: string
  continent?: string
  country_iso_code?: string
  tournament_type?: string
  event_type?: string
  logo?: string
}

export interface TournamentResponse {
  events: Tournament[]
  count?: number
  success?: boolean
}

export interface TournamentDetail extends Tournament {
  teams_count?: number
  athletes_count?: number
  weight_categories_count?: number
}
