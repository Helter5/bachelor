import { useEffect, useMemo, useState } from "react"
import { useTranslation } from "react-i18next"
import { apiClient } from "@/services/apiClient"
import { API_ENDPOINTS } from "@/config/api"

interface ApiAthleteDto {
  id: string | number
  person_full_name?: string | null
  personFullName?: string | null
  team_id?: string | number | null
  teamId?: string | number | null
  sport_event_id?: number | null
  sportEventId?: number | null
  weight_category_id?: string | number | null
  weightCategoryId?: string | number | null
  is_competing?: boolean | null
  isCompeting?: boolean | null
  person_photo?: string | null
  personPhoto?: string | null
  accreditation_status?: string | null
  accreditationStatus?: string | null
}

interface ApiSportEventDto {
  id: number | string
  uuid?: string | null
  name?: string | null
}

interface ApiTeamDto {
  id: string | number
  name?: string | null
}

interface ApiWeightCategoryDto {
  id: string | number
  name?: string | null
  max_weight?: number | null
  maxWeight?: number | null
}

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
  const data = payload as { events?: ApiSportEventDto[]; items?: ApiSportEventDto[] }
  return (data.events ?? data.items ?? []).map(mapSportEventDto)
}

function toStringId(value: string | number): string {
  return String(value)
}

function toNullableStringId(value: string | number | null | undefined): string | null {
  return value === null || value === undefined ? null : String(value)
}

function mapAthleteDto(dto: ApiAthleteDto): FighterAthlete {
  return {
    id: toStringId(dto.id),
    personFullName: dto.personFullName ?? dto.person_full_name ?? "",
    teamId: toNullableStringId(dto.teamId ?? dto.team_id),
    sportEventId: Number(dto.sportEventId ?? dto.sport_event_id ?? 0),
    weightCategoryId: toNullableStringId(dto.weightCategoryId ?? dto.weight_category_id),
    isCompeting: Boolean(dto.isCompeting ?? dto.is_competing),
    personPhoto: dto.personPhoto ?? dto.person_photo ?? "",
    accreditationStatus: dto.accreditationStatus ?? dto.accreditation_status ?? null,
  }
}

function mapSportEventDto(dto: ApiSportEventDto): FighterSportEvent {
  return {
    id: Number(dto.id),
    uuid: dto.uuid ?? "",
    name: dto.name ?? "",
  }
}

function mapTeamDto(dto: ApiTeamDto): FighterTeam {
  return {
    id: toStringId(dto.id),
    name: dto.name ?? "",
  }
}

function mapWeightCategoryDto(dto: ApiWeightCategoryDto): FighterWeightCategory {
  return {
    id: toStringId(dto.id),
    name: dto.name ?? "",
    maxWeight: Number(dto.maxWeight ?? dto.max_weight ?? 0),
  }
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
          apiClient.get<{ athletes?: ApiAthleteDto[] }>(API_ENDPOINTS.ATHLETE_DATABASE_ALL),
          apiClient.get<unknown>(API_ENDPOINTS.SPORT_EVENT_DATABASE),
        ])

        const eventsData = normalizeEventsPayload(eventsPayload)

        const teamsResults = await Promise.allSettled(
          eventsData.map((event) => apiClient.get<{ teams?: ApiTeamDto[] }>(API_ENDPOINTS.TEAM_DATABASE(event.id)))
        )
        const allTeams = teamsResults.flatMap((result) =>
          result.status === "fulfilled" ? (result.value.teams ?? []).map(mapTeamDto) : []
        )

        const categoriesResults = await Promise.allSettled(
          eventsData.map((event) =>
            apiClient.get<{ weightCategories?: ApiWeightCategoryDto[] }>(API_ENDPOINTS.WEIGHT_CATEGORY_DATABASE(event.id))
          )
        )
        const allWeightCategories = categoriesResults.flatMap((result) =>
          result.status === "fulfilled"
            ? (result.value.weightCategories ?? []).map(mapWeightCategoryDto)
            : []
        )

        if (!isMounted) return

        setAthletes((athletesData.athletes ?? []).map(mapAthleteDto))
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
