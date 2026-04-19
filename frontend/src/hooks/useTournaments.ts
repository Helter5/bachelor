import { useState, useEffect } from "react"
import { apiClient } from "@/services/apiClient"
import { API_ENDPOINTS } from "@/config/api"

export interface Event {
  id: number
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

export function useTournaments() {
  const [events, setEvents] = useState<Event[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        setLoading(true)
        const pageSize = 500
        const firstPage = await apiClient.get<{ items: Event[]; total?: number; skip?: number; limit?: number }>(
          `${API_ENDPOINTS.SPORT_EVENT_DATABASE}?skip=0&limit=${pageSize}`
        )

        const allEvents = [...(firstPage.items || [])]
        const total = firstPage.total ?? allEvents.length

        for (let skip = allEvents.length; skip < total; skip += pageSize) {
          const nextPage = await apiClient.get<{ items: Event[] }>(
            `${API_ENDPOINTS.SPORT_EVENT_DATABASE}?skip=${skip}&limit=${pageSize}`
          )
          allEvents.push(...(nextPage.items || []))
        }

        setEvents(allEvents)
        setError(null)
      } catch (err) {
        console.error('Error fetching events:', err)
        setError(err instanceof Error ? err.message : 'Failed to load tournaments')
        setEvents([])
      } finally {
        setLoading(false)
      }
    }

    fetchEvents()
  }, [])

  return { events, loading, error }
}
