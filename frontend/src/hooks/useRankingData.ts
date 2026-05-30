import { useState, useEffect } from "react"
import { apiClient } from "@/services/apiClient"
import { API_ENDPOINTS } from "@/config/api"

interface RankingBreakdown {
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

function isAbortError(err: unknown): boolean {
  return err instanceof DOMException && err.name === "AbortError"
}

export function useRankingCategories() {
  const [categories, setCategories] = useState<string[]>([])

  useEffect(() => {
    const controller = new AbortController()
    apiClient
      .get<string[]>(API_ENDPOINTS.RANKING_CATEGORIES, { signal: controller.signal })
      .then(data => setCategories(data || []))
      .catch(err => {
        if (!isAbortError(err)) setCategories([])
      })
    return () => controller.abort()
  }, [])

  return categories
}

export function useRankingData(category: string, lastN: number, dateFrom?: string) {
  const [data, setData] = useState<RankingEntry[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!category) return
    const controller = new AbortController()
    setLoading(true)
    apiClient
      .get<RankingEntry[]>(API_ENDPOINTS.RANKINGS(category, lastN, dateFrom || undefined), {
        signal: controller.signal,
      })
      .then(d => setData(d || []))
      .catch(err => {
        if (!isAbortError(err)) setData([])
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false)
      })
    return () => controller.abort()
  }, [category, lastN, dateFrom])

  return { data, loading }
}
