import { useEffect, useMemo, useState } from "react"
import { useTranslation } from "react-i18next"
import { apiClient } from "@/services/apiClient"
import { API_ENDPOINTS } from "@/config/api"

interface FighterAthlete {
  id: string
  personFullName: string
  teamId: string | null
  sportEventId: number
  weightCategoryId: string | null
  isCompeting: boolean
  personPhoto: string
  accreditationStatus: string | null
}

interface FighterSportEvent {
  id: number
  uuid: string
  name: string
}

interface FighterTeam {
  id: string
  name: string
}

interface FighterWeightCategory {
  id: string
  name: string
  maxWeight: number
}

interface FightersDataState {
  athletes: FighterAthlete[]
  sportEventsById: Map<number, FighterSportEvent>
  teamsById: Map<string, FighterTeam>
  weightCategoriesById: Map<string, FighterWeightCategory>
  loading: boolean
  error: string | null
}

function uniqueById<T extends { id: string | number }>(items: T[]): T[] {
  return Array.from(new Map(items.map((item) => [item.id, item])).values())
}

function toMapById<T extends { id: string | number }>(items: T[]): Map<T["id"], T> {
  return new Map(items.map((item) => [item.id, item]))
}

function normalizeEventsPayload(payload: unknown): FighterSportEvent[] {
  const data = payload as { events?: FighterSportEvent[]; items?: FighterSportEvent[] }
  return data.events ?? data.items ?? []
}

export function useFightersData(): FightersDataState {
  const { t } = useTranslation()
  const [athletes, setAthletes] = useState<FighterAthlete[]>([])
  const [sportEvents, setSportEvents] = useState<FighterSportEvent[]>([])
  const [teams, setTeams] = useState<FighterTeam[]>([])
  const [weightCategories, setWeightCategories] = useState<FighterWeightCategory[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let isMounted = true

    const loadData = async () => {
      try {
        setLoading(true)
        setError(null)

        const [athletesData, eventsPayload] = await Promise.all([
          apiClient.get<{ athletes?: FighterAthlete[] }>(API_ENDPOINTS.ATHLETE_DATABASE_ALL),
          apiClient.get<unknown>(API_ENDPOINTS.SPORT_EVENT_DATABASE),
        ])

        const eventsData = normalizeEventsPayload(eventsPayload)

        const teamsResults = await Promise.allSettled(
          eventsData.map((event) => apiClient.get<{ teams?: FighterTeam[] }>(API_ENDPOINTS.TEAM_DATABASE(event.id)))
        )
        const allTeams = teamsResults.flatMap((result) =>
          result.status === "fulfilled" ? result.value.teams ?? [] : []
        )

        const categoriesResults = await Promise.allSettled(
          eventsData.map((event) =>
            apiClient.get<{ weightCategories?: FighterWeightCategory[] }>(API_ENDPOINTS.WEIGHT_CATEGORY_DATABASE(event.id))
          )
        )
        const allWeightCategories = categoriesResults.flatMap((result) =>
          result.status === "fulfilled" ? result.value.weightCategories ?? [] : []
        )

        if (!isMounted) return

        setAthletes(athletesData.athletes ?? [])
        setSportEvents(uniqueById(eventsData))
        setTeams(uniqueById(allTeams))
        setWeightCategories(uniqueById(allWeightCategories))
      } catch {
        if (!isMounted) return
        setAthletes([])
        setSportEvents([])
        setTeams([])
        setWeightCategories([])
        setError(t("fighters.loadError"))
      } finally {
        if (isMounted) {
          setLoading(false)
        }
      }
    }

    void loadData()

    return () => {
      isMounted = false
    }
  }, [t])

  const sportEventsById = useMemo(() => toMapById(sportEvents), [sportEvents])

  const teamsById = useMemo(() => toMapById(teams), [teams])

  const weightCategoriesById = useMemo(() => toMapById(weightCategories), [weightCategories])

  return {
    athletes,
    sportEventsById,
    teamsById,
    weightCategoriesById,
    loading,
    error,
  }
}
