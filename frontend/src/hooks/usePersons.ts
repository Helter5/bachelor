import { useState, useEffect } from "react"
import { apiClient } from "@/services/apiClient"
import { API_ENDPOINTS } from "@/config/api"
import type { Person } from "@/components/dashboard/WrestlerPicker"

const PERSONS_LIMIT = 1000

export function usePersons() {
  const [persons, setPersons] = useState<Person[]>([])

  useEffect(() => {
    apiClient.get<Person[]>(`${API_ENDPOINTS.PERSONS}?limit=${PERSONS_LIMIT}`)
      .then(data => setPersons(data || []))
      .catch(() => setPersons([]))
  }, [])

  return persons
}
