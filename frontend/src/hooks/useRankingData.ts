import { useState, useEffect } from "react"
import { apiClient } from "@/services/apiClient"
import { API_ENDPOINTS } from "@/config/api"

export interface RankingBreakdown {
  event_name: string
  start_date: string | null
  wins: number
  total_fights: number
  performance_points: number
  victory_bonus: number
  tournament_score: number
  recency_weight: number
  weighted_score: number
}

export interface RankingEntry {
  rank: number
  person_id: number
  full_name: string
  country_iso_code: string | null
  total_score: number
  tournaments_counted: number
  total_wins: number
  total_fights: number
  breakdown: RankingBreakdown[]
}

export function useRankingCategories() {
  const [categories, setCategories] = useState<string[]>([])

  useEffect(() => {
    apiClient.get<string[]>(API_ENDPOINTS.RANKING_CATEGORIES)
      .then(data => setCategories(data || []))
      .catch(() => setCategories([]))
  }, [])

  return categories
}

export function useRankingData(category: string, lastN: number, dateFrom?: string) {
  const [data, setData] = useState<RankingEntry[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!category) return
    setLoading(true)
    apiClient.get<RankingEntry[]>(API_ENDPOINTS.RANKINGS(category, lastN, dateFrom || undefined))
      .then(d => setData(d || []))
      .catch(() => setData([]))
      .finally(() => setLoading(false))
  }, [category, lastN, dateFrom])

  return { data, loading }
}
