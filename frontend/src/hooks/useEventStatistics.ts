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

function isAbortError(err: unknown): boolean {
  return err instanceof DOMException && err.name === "AbortError"
}

export function useEventStatistics(eventId: number | null) {
  const [stats, setStats] = useState<EventStatistics | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!eventId) {
      setStats(null)
      return
    }
    const controller = new AbortController()
    setLoading(true)
    apiClient
      .get<EventStatistics>(API_ENDPOINTS.EVENT_STATISTICS(eventId), { signal: controller.signal })
      .then(data => setStats(data))
      .catch(err => {
        if (!isAbortError(err)) setStats(null)
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false)
      })
    return () => controller.abort()
  }, [eventId])

  return { stats, loading }
}
