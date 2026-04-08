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
