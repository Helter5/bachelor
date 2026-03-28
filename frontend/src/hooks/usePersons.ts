import { useState, useEffect } from "react"
import { apiClient } from "@/services/apiClient"
import { API_ENDPOINTS } from "@/config/api"
import type { Person } from "@/components/dashboard/WrestlerPicker"

export function usePersons() {
  const [persons, setPersons] = useState<Person[]>([])

  useEffect(() => {
    apiClient.get<Person[]>(API_ENDPOINTS.PERSONS + "?limit=1000")
      .then(data => setPersons(data || []))
      .catch(() => setPersons([]))
  }, [])

  return persons
}
