import { useState, useEffect } from "react"
import { apiClient } from "@/services/apiClient"
import { API_ENDPOINTS } from "@/config/api"

interface SportEvent {
  id: number
  uuid: string
  name: string
}

function isAbortError(err: unknown): boolean {
  return err instanceof DOMException && err.name === "AbortError"
}

export function useEvents() {
  const [events, setEvents] = useState<SportEvent[]>([])
  useEffect(() => {
    const controller = new AbortController()
    apiClient
      .get<{ items: SportEvent[] }>(API_ENDPOINTS.SPORT_EVENT_DATABASE, {
        signal: controller.signal,
      })
      .then(data => setEvents(data?.items || []))
      .catch(err => {
        if (!isAbortError(err)) setEvents([])
      })
    return () => controller.abort()
  }, [])
  return events
}
