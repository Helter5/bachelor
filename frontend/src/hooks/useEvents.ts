import { useState, useEffect } from "react"
import { apiClient } from "@/services/apiClient"
import { API_ENDPOINTS } from "@/config/api"

export interface SportEvent {
  id: number
  uuid: string
  name: string
}

export function useEvents() {
  const [events, setEvents] = useState<SportEvent[]>([])
  useEffect(() => {
    apiClient.get<{ items: SportEvent[] }>(API_ENDPOINTS.SPORT_EVENT_DATABASE)
      .then(data => setEvents(data?.items || []))
      .catch(() => setEvents([]))
  }, [])
  return events
}
