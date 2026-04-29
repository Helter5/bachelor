import { useState, useEffect } from "react"
import { apiClient } from "@/services/apiClient"
import { API_ENDPOINTS } from "@/config/api"

export interface TeamPerformance {
  name: string
  country: string | null
  wins: number
  losses: number
  total_fights: number
  win_rate: number
  wins_by_type: Record<string, number>
  losses_by_type: Record<string, number>
  dominant_victory_type: string | null
  avg_tp_for: number
  avg_tp_against: number
  avg_cp_for: number
  avg_cp_against: number
  top_performer: {
    name: string
    wins: number
    total_fights: number
    win_rate: number
    person_id: number | null
  } | null
}

export interface EventStatistics {
  team_performance: TeamPerformance[]
}

export function useEventStatistics(eventId: number | null) {
  const [stats, setStats] = useState<EventStatistics | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!eventId) {
      setStats(null)
      return
    }
    setLoading(true)
    apiClient.get<EventStatistics>(API_ENDPOINTS.EVENT_STATISTICS(eventId))
      .then(data => setStats(data))
      .catch(() => setStats(null))
      .finally(() => setLoading(false))
  }, [eventId])

  return { stats, loading }
}
