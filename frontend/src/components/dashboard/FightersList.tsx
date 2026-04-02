import { useState, useMemo, useEffect } from "react"
import { useTranslation } from "react-i18next"
import { apiClient } from "@/services/apiClient"
import { API_ENDPOINTS } from "@/config/api"
import { Pagination } from "./Pagination"
import { SearchInput } from "./SearchInput"
import { Select } from "../ui/Select"

interface Athlete {
  id: string
  personFullName: string
  teamId: string | null
  sportEventId: number
  weightCategoryId: string | null
  isCompeting: boolean
  personPhoto: string
  accreditationStatus: string | null
}

interface SportEvent {
  id: number
  uuid: string
  name: string
}

interface Team {
  id: string
  name: string
}

interface WeightCategory {
  id: string
  name: string
  maxWeight: number
}

interface FightersListProps {
  isDarkMode: boolean
}

export function FightersList({ isDarkMode }: FightersListProps) {
  const { t } = useTranslation()
  const [athletes, setAthletes] = useState<Athlete[]>([])
  const [sportEvents, setSportEvents] = useState<SportEvent[]>([])
  const [teams, setTeams] = useState<Team[]>([])
  const [weightCategories, setWeightCategories] = useState<WeightCategory[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [searchQuery, setSearchQuery] = useState("")
  const [competingFilter, setCompetingFilter] = useState("")
  const [accreditationFilter, setAccreditationFilter] = useState("")
  const [sortBy, setSortBy] = useState<"name" | "competing">("name")
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc")

  const COMPETING_OPTIONS = [
    { value: "", label: t('fighters.competingOptions.all') },
    { value: "yes", label: t('fighters.competingOptions.yes') },
    { value: "no", label: t('fighters.competingOptions.no') },
  ]

  const itemsPerPage = 20

  // Load all data on mount
  useEffect(() => {
    loadAllData()
  }, [])

  const loadAllData = async () => {
    try {
      setLoading(true)
      setError(null)

      // Load all data in parallel
      const [athletesData, eventsData, teamsData] = await Promise.all([
        apiClient.get<{ athletes: Athlete[] }>(API_ENDPOINTS.ATHLETE_DATABASE_ALL),
        apiClient.get<{ events: SportEvent[] }>(API_ENDPOINTS.SPORT_EVENT_DATABASE),
        // We need to get all teams from all events
        (async () => {
          const eventsData = await apiClient.get<{ events: SportEvent[] }>(API_ENDPOINTS.SPORT_EVENT_DATABASE)
          const allTeams: Team[] = []

          // For each event, fetch teams
          for (const event of eventsData.events || []) {
            try {
              const teamsData = await apiClient.get<{ teams: Team[] }>(API_ENDPOINTS.TEAM_DATABASE(event.id))
              allTeams.push(...(teamsData.teams || []))
            } catch (err) {
              console.error(`Failed to load teams for event ${event.id}`, err)
            }
          }
          return { teams: allTeams }
        })()
      ])

      setAthletes(athletesData.athletes || [])
      setSportEvents(eventsData.events || [])
      setTeams(teamsData.teams || [])

      // Load weight categories for all events
      const allWeightCategories: WeightCategory[] = []
      for (const event of eventsData.events || []) {
        try {
          const wcData = await apiClient.get<{ weightCategories: WeightCategory[] }>(API_ENDPOINTS.WEIGHT_CATEGORY_DATABASE(event.id))
          allWeightCategories.push(...(wcData.weightCategories || []))
        } catch (err) {
          console.error(`Failed to load weight categories for event ${event.id}`, err)
        }
      }
      setWeightCategories(allWeightCategories)

    } catch (err) {
      console.error('Error loading data:', err)
      setError(t('fighters.loadError'))
    } finally {
      setLoading(false)
    }
  }

  const getSportEventUuid = (sportEventId: number) => {
    const event = sportEvents.find(e => e.id === sportEventId)
    return event ? String(event.id) : 'N/A'
  }

  const getTeamName = (teamId: string | null) => {
    if (!teamId) return 'N/A'
    const team = teams.find(t => t.id === teamId)
    return team?.name || 'N/A'
  }

  const getWeightCategoryWeight = (weightCategoryId: string | null) => {
    if (!weightCategoryId) return null
    const category = weightCategories.find(wc => wc.id === weightCategoryId)
    return category ? category.name : null
  }

  // Get unique values for filters
  const uniqueAccreditationStatuses = useMemo(() => {
    return Array.from(new Set(athletes.map(a => a.accreditationStatus).filter((s): s is string => Boolean(s)))).sort()
  }, [athletes])

  const accreditationOptions = useMemo(() => [
    { value: "", label: t('fighters.allStatuses') },
    ...uniqueAccreditationStatuses.map((s) => ({ value: s, label: s })),
  ], [uniqueAccreditationStatuses, t])

  // Filter and sort athletes
  const filteredAndSortedAthletes = useMemo(() => {
    let filtered = athletes.filter(athlete => {
      const matchesSearch = athlete.personFullName?.toLowerCase().includes(searchQuery.toLowerCase())
      const matchesCompeting = !competingFilter ||
        (competingFilter === "yes" && athlete.isCompeting) ||
        (competingFilter === "no" && !athlete.isCompeting)
      const matchesAccreditation = !accreditationFilter || athlete.accreditationStatus === accreditationFilter
      return matchesSearch && matchesCompeting && matchesAccreditation
    })

    filtered.sort((a, b) => {
      let comparison = 0
      if (sortBy === "name") {
        comparison = (a.personFullName || "").localeCompare(b.personFullName || "")
      } else if (sortBy === "competing") {
        comparison = (a.isCompeting ? 1 : 0) - (b.isCompeting ? 1 : 0)
      }
      return sortOrder === "asc" ? comparison : -comparison
    })

    return filtered
  }, [athletes, searchQuery, competingFilter, accreditationFilter, sortBy, sortOrder])

  // Pagination
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const currentAthletes = filteredAndSortedAthletes.slice(startIndex, endIndex)

  const handleFilterChange = (newSearch: string, newCompeting: string, newAccreditation: string) => {
    setSearchQuery(newSearch)
    setCompetingFilter(newCompeting)
    setAccreditationFilter(newAccreditation)
    setCurrentPage(1)
  }

  const handleSort = (newSortBy: "name" | "competing") => {
    if (sortBy === newSortBy) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc")
    } else {
      setSortBy(newSortBy)
      setSortOrder("asc")
    }
    setCurrentPage(1)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className={`text-lg ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
          {t('fighters.loading')}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className={`text-lg ${isDarkMode ? 'text-red-400' : 'text-red-600'}`}>
          {error}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className={`text-3xl font-bold mb-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
          {t('fighters.title')}
        </h2>
        <p className={isDarkMode ? 'text-gray-300' : 'text-gray-600'}>
          {t('fighters.subtitle')}
        </p>
      </div>

      {/* Filters and Search */}
      <div className={`p-4 rounded-lg ${isDarkMode ? 'bg-[#1e293b]' : 'bg-white'}`}>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Search */}
          <div className="md:col-span-2">
            <label className={`block text-sm font-medium mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
              {t('fighters.searchLabel')}
            </label>
            <SearchInput
              isDarkMode={isDarkMode}
              value={searchQuery}
              onChange={(v) => handleFilterChange(v, competingFilter, accreditationFilter)}
              placeholder={t('fighters.searchPlaceholder')}
            />
          </div>

          {/* Competing Filter */}
          <div>
            <label className={`block text-sm font-medium mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
              {t('fighters.competingLabel')}
            </label>
            <Select
              value={competingFilter}
              onChange={(v) => handleFilterChange(searchQuery, v, accreditationFilter)}
              options={COMPETING_OPTIONS}
              isDarkMode={isDarkMode}
              className="w-full"
            />
          </div>

          {/* Accreditation Filter */}
          <div>
            <label className={`block text-sm font-medium mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
              {t('fighters.accreditationLabel')}
            </label>
            <Select
              value={accreditationFilter}
              onChange={(v) => handleFilterChange(searchQuery, competingFilter, v)}
              options={accreditationOptions}
              isDarkMode={isDarkMode}
              className="w-full"
            />
          </div>
        </div>

        {/* Sort Options */}
        <div className="mt-4">
          <label className={`block text-sm font-medium mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
            {t('fighters.sortLabel')}
          </label>
          <div className="flex gap-2">
            <button
              onClick={() => handleSort("name")}
              className={`flex-1 px-4 py-2 rounded-lg font-medium transition-all ${
                sortBy === "name"
                  ? isDarkMode ? "bg-blue-500 text-white" : "bg-blue-600 text-white"
                  : isDarkMode ? "bg-[#0f172a] text-gray-300 hover:bg-white/5" : "bg-gray-50 text-gray-700 hover:bg-gray-100"
              }`}
            >
              {t('fighters.sortName')} {sortBy === "name" && (sortOrder === "asc" ? "↑" : "↓")}
            </button>
            <button
              onClick={() => handleSort("competing")}
              className={`flex-1 px-4 py-2 rounded-lg font-medium transition-all ${
                sortBy === "competing"
                  ? isDarkMode ? "bg-blue-500 text-white" : "bg-blue-600 text-white"
                  : isDarkMode ? "bg-[#0f172a] text-gray-300 hover:bg-white/5" : "bg-gray-50 text-gray-700 hover:bg-gray-100"
              }`}
            >
              {t('fighters.sortCompeting')} {sortBy === "competing" && (sortOrder === "asc" ? "↑" : "↓")}
            </button>
          </div>
        </div>

        {/* Results count */}
        <div className={`mt-4 text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
          {t('fighters.foundCount', { count: filteredAndSortedAthletes.length })}
        </div>
      </div>

      {/* Athletes Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {currentAthletes.length > 0 ? (
          currentAthletes.map((athlete) => {
            const eventUuid = getSportEventUuid(athlete.sportEventId)
            const teamName = getTeamName(athlete.teamId)
            const weightCategory = getWeightCategoryWeight(athlete.weightCategoryId)

            return (
              <div
                key={athlete.id}
                className={`p-4 rounded-lg transition-all hover:scale-[1.01] cursor-pointer ${
                  isDarkMode
                    ? 'bg-[#1e293b] hover:bg-[#334155]'
                    : 'bg-white hover:bg-gray-50'
                }`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <h3 className={`text-lg font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                      {athlete.personFullName || 'N/A'}
                    </h3>
                    <p className={`text-xs mt-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                      ID: {athlete.id.substring(0, 8)}...
                    </p>
                  </div>
                  <div className={`px-3 py-1 rounded-full text-xs font-semibold ${
                    athlete.isCompeting
                      ? isDarkMode ? 'bg-green-500/20 text-green-400' : 'bg-green-100 text-green-700'
                      : isDarkMode ? 'bg-gray-500/20 text-gray-400' : 'bg-gray-100 text-gray-700'
                  }`}>
                    {athlete.isCompeting ? t('fighters.competing') : t('fighters.notCompeting')}
                  </div>
                </div>

                {athlete.personPhoto && (
                  <div className="mb-3">
                    <img
                      src={athlete.personPhoto}
                      alt={athlete.personFullName || 'Athlete'}
                      className="w-20 h-20 rounded-lg object-cover"
                    />
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4 mb-3">
                  <div>
                    <p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>{t('fighters.accreditationField')}</p>
                    <p className={`text-sm font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                      {athlete.accreditationStatus || 'N/A'}
                    </p>
                  </div>
                  <div>
                    <p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>{t('fighters.tournamentUuid')}</p>
                    <p className={`text-sm font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                      {eventUuid.substring(0, 8)}...
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-gray-700/30">
                  <div className="flex items-center gap-4 text-sm flex-wrap">
                    {weightCategory && (
                      <div className={`flex items-center gap-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" />
                        </svg>
                        <span className="text-xs">{t('fighters.weight', { weight: weightCategory })}</span>
                      </div>
                    )}
                    {athlete.teamId && (
                      <div className={`flex items-center gap-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                        </svg>
                        <span className="text-xs">{t('fighters.team', { team: teamName })}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )
          })
        ) : (
          <div className={`col-span-2 text-center py-12 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            {t('fighters.notFound')}
          </div>
        )}
      </div>

      <Pagination
        isDarkMode={isDarkMode}
        currentPage={currentPage}
        totalItems={filteredAndSortedAthletes.length}
        itemsPerPage={itemsPerPage}
        onPageChange={setCurrentPage}
      />
    </div>
  )
}
