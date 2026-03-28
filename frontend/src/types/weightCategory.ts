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

export interface WeightCategoryResponse {
  weightCategories: WeightCategory[]
  count?: number
}
