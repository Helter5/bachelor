export interface Team {
  id: number
  name: string
  alternate_name: string | null
  country_iso_code: string | null
  athlete_count: number | null
}

export interface TeamResponse {
  teams: Team[]
  count?: number
}
