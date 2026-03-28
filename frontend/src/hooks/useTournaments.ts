import { useState, useEffect } from "react"
import { apiClient } from "@/services/apiClient"
import { API_ENDPOINTS } from "@/config/api"

export interface Event {
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

export function useTournaments() {
  const [events, setEvents] = useState<Event[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        setLoading(true)
        const data = await apiClient.get<{ items: Event[] }>(API_ENDPOINTS.SPORT_EVENT_DATABASE)
        console.log('🔍 useTournaments - Raw API response:', data)
        console.log('🔍 useTournaments - Items array:', data.items)
        console.log('🔍 useTournaments - Items length:', data.items?.length)
        setEvents(data.items || [])
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
