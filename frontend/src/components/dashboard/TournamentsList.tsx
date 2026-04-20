import { useState, useMemo, useEffect, useCallback } from "react"
import { useTranslation } from "react-i18next"
import { apiClient } from "@/services/apiClient"
import { API_ENDPOINTS } from "@/config/api"
import { Pagination } from "./Pagination"
import { SearchInput } from "./SearchInput"
import { useTournamentFilters } from "@/hooks/useTournamentFilters"
import type { Event } from "@/hooks/useTournaments"
import { EmptyState } from "../ui/EmptyState"
import { LoadingSpinner } from "../ui/LoadingSpinner"
import { Select } from "../ui/Select"
import { ErrorAlert } from "../ui/ErrorAlert"
import { TournamentCard } from "./tournaments/TournamentCard"
import { PersonAutocomplete } from "./tournaments/PersonAutocomplete"

interface TournamentsListProps {
  isDarkMode: boolean
  onSelectTournament: (tournament: { id: number; name: string; start_date: string; end_date?: string }) => void
}

type SortKey = "name" | "date"

interface TournamentsToolbarProps {
  isDarkMode: boolean
  t: (key: string) => string
  searchQuery: string
  locationFilter: string
  sortBy: SortKey
  sortOrder: "asc" | "desc"
  uniqueLocations: string[]
  selectedPerson: { id: number; name: string } | null
  displayedCount: number
  totalCount: number
  hasActiveFilters: boolean
  onSearchChange: (value: string) => void
  onLocationChange: (value: string) => void
  onSortChange: (value: SortKey) => void
  onClearFilters: () => void
  onSelectPerson: (personId: number, fullName: string) => Promise<void>
  onClearPerson: () => void
}

function SortToggleButton({
  isDarkMode,
  active,
  label,
  icon,
  sortOrder,
  onClick,
}: {
  isDarkMode: boolean
  active: boolean
  label: string
  icon: string
  sortOrder: "asc" | "desc"
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      title={label}
      className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium transition-colors ${
        active
          ? isDarkMode ? 'bg-blue-500 text-white' : 'bg-blue-600 text-white'
          : isDarkMode ? 'bg-[#0f172a]/50 text-gray-400 hover:text-gray-200' : 'bg-white text-gray-600 hover:bg-gray-50'
      }`}
    >
      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={icon} />
      </svg>
      {label}
      {active && (
        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2.5}
            d={sortOrder === "asc" ? "M5 15l7-7 7 7" : "M19 9l-7 7-7-7"}
          />
        </svg>
      )}
    </button>
  )
}

function TournamentsToolbar({
  isDarkMode,
  t,
  searchQuery,
  locationFilter,
  sortBy,
  sortOrder,
  uniqueLocations,
  selectedPerson,
  displayedCount,
  totalCount,
  hasActiveFilters,
  onSearchChange,
  onLocationChange,
  onSortChange,
  onClearFilters,
  onSelectPerson,
  onClearPerson,
}: TournamentsToolbarProps) {
  const locationOptions = [
    { value: "", label: t("tournaments.allLocalities") },
    ...uniqueLocations.map((loc) => ({ value: loc, label: loc })),
  ]

  return (
    <div className={`rounded-lg overflow-hidden ${isDarkMode ? 'bg-[#1e293b] shadow-lg' : 'bg-white border border-gray-200'}`}>
      <div className={`px-4 py-3 border-b ${isDarkMode ? 'border-white/5' : 'border-gray-200'}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <svg className={`w-4 h-4 ${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
            </svg>
            <h3 className={`text-sm font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
              {t("tournaments.filtersTitle")}
            </h3>
            <span className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
              ({displayedCount}/{totalCount})
            </span>
          </div>

          {(hasActiveFilters || !!selectedPerson) && (
            <button
              onClick={onClearFilters}
              className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition-all ${
                isDarkMode
                  ? 'bg-white/5 text-gray-300 hover:bg-white/10'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
              {t("tournaments.clearFilters")}
            </button>
          )}
        </div>
      </div>

      <div className="p-4">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-3">
          <div className="lg:col-span-2">
            <SearchInput
              isDarkMode={isDarkMode}
              value={searchQuery}
              onChange={onSearchChange}
              placeholder={t("tournaments.searchPlaceholder")}
            />
          </div>

          <PersonAutocomplete
            isDarkMode={isDarkMode}
            selectedPerson={selectedPerson}
            onSelectPerson={onSelectPerson}
            onClearPerson={onClearPerson}
          />

          <div>
            <Select
              value={locationFilter}
              onChange={onLocationChange}
              options={locationOptions}
              isDarkMode={isDarkMode}
              className="w-full"
            />
          </div>
        </div>

        <div className={`mt-3 flex items-center gap-2 text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
          <span className="text-xs">{t("tournaments.sortLabel")}</span>
          <div className={`flex rounded-lg overflow-hidden border ${isDarkMode ? 'border-white/10' : 'border-gray-200'}`}>
            {([
              { key: "name", label: t("tournaments.sortByName"), icon: "M7 20l4-16m2 16l4-16M6 9h14M4 15h14" },
              { key: "date", label: t("tournaments.sortByDate"), icon: "M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" },
            ] as const).map(({ key, label, icon }) => (
              <SortToggleButton
                key={key}
                isDarkMode={isDarkMode}
                active={sortBy === key}
                label={label}
                icon={icon}
                sortOrder={sortOrder}
                onClick={() => onSortChange(key)}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

function TournamentsGrid({
  isDarkMode,
  t,
  events,
  onSelectTournament,
}: {
  isDarkMode: boolean
  t: (key: string) => string
  events: Event[]
  onSelectTournament: (tournament: { id: number; name: string; start_date: string; end_date?: string }) => void
}) {
  if (events.length === 0) {
    return (
      <div className={`col-span-full text-center py-12 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
        {t("tournaments.notFound")}
      </div>
    )
  }

  return (
    <>
      {events.map((event) => (
        <TournamentCard key={event.id} event={event} isDarkMode={isDarkMode} onSelect={onSelectTournament} />
      ))}
    </>
  )
}
export function TournamentsList({ isDarkMode, onSelectTournament }: TournamentsListProps) {
  const { t } = useTranslation()
  const [currentPage, setCurrentPage] = useState(1)
  const [events, setEvents] = useState<Event[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Athlete filter state
  const [selectedPerson, setSelectedPerson] = useState<{ id: number; name: string } | null>(null)
  const [personEventIds, setPersonEventIds] = useState<Set<number>>(new Set())

  const itemsPerPage = 20

  // Fetch events from database on mount
  useEffect(() => {
    const fetchEvents = async () => {
      try {
        setLoading(true)
        const data = await apiClient.get<{ items: Event[] }>(API_ENDPOINTS.SPORT_EVENT_DATABASE)
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

  // Fetch event IDs when a person is selected
  const handleSelectPerson = useCallback(async (personId: number, fullName: string) => {
    setSelectedPerson({ id: personId, name: fullName })
    setCurrentPage(1)

    try {
      const data = await apiClient.get<{ events: { event_id: number }[] }>(
        API_ENDPOINTS.PERSON_DETAIL(personId)
      )
      setPersonEventIds(new Set(data.events.map(e => e.event_id)))
    } catch {
      setPersonEventIds(new Set())
    }
  }, [])

  const handleClearPerson = useCallback(() => {
    setSelectedPerson(null)
    setPersonEventIds(new Set())
    setCurrentPage(1)
  }, [])

  const {
    searchQuery,
    locationFilter,
    sortBy,
    sortOrder,
    uniqueLocations,
    filteredAndSortedEvents,
    handleFilterChange,
    handleSort,
    clearFilters,
    hasActiveFilters,
  } = useTournamentFilters(events)

  // Apply person filter on top of base filters
  const displayedEvents = useMemo(
    () => selectedPerson ? filteredAndSortedEvents.filter(e => personEventIds.has(e.id)) : filteredAndSortedEvents,
    [filteredAndSortedEvents, selectedPerson, personEventIds]
  )

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [searchQuery, locationFilter, sortBy, sortOrder, selectedPerson])

  // Pagination
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const currentEvents = displayedEvents.slice(startIndex, endIndex)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className={`text-3xl font-bold mb-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
          {t("tournaments.title")}
        </h2>
        <p className={isDarkMode ? 'text-gray-300' : 'text-gray-600'}>
          {t("tournaments.subtitle")}
        </p>
      </div>

      {/* Loading State */}
      {loading && (
        <LoadingSpinner text={t("tournaments.loading")} isDarkMode={isDarkMode} variant="inline" size="md" />
      )}

      {/* Error State */}
      {error && !loading && (
        <ErrorAlert
          message={`${t("tournaments.loadError")}: ${error}`}
          isDarkMode={isDarkMode}
        />
      )}

      {/* Empty State */}
      {!loading && !error && events.length === 0 && (
        <EmptyState
          icon="calendar"
          title={t("tournaments.empty")}
          description={t("tournaments.emptyDesc")}
          isDarkMode={isDarkMode}
        />
      )}

      {!loading && !error && events.length > 0 && (
        <TournamentsToolbar
          isDarkMode={isDarkMode}
          t={t}
          searchQuery={searchQuery}
          locationFilter={locationFilter}
          sortBy={sortBy}
          sortOrder={sortOrder}
          uniqueLocations={uniqueLocations}
          selectedPerson={selectedPerson}
          displayedCount={displayedEvents.length}
          totalCount={events.length}
          hasActiveFilters={hasActiveFilters}
          onSearchChange={(v) => handleFilterChange(v, locationFilter)}
          onLocationChange={(v) => handleFilterChange(searchQuery, v)}
          onSortChange={handleSort}
          onClearFilters={() => {
            clearFilters()
            handleClearPerson()
          }}
          onSelectPerson={handleSelectPerson}
          onClearPerson={handleClearPerson}
        />
      )}

      {!loading && !error && events.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          <TournamentsGrid
            isDarkMode={isDarkMode}
            t={t}
            events={currentEvents}
            onSelectTournament={onSelectTournament}
          />
        </div>
      )}

      {!loading && !error && events.length > 0 && (
        <Pagination
          isDarkMode={isDarkMode}
          currentPage={currentPage}
          totalItems={displayedEvents.length}
          itemsPerPage={itemsPerPage}
          onPageChange={setCurrentPage}
        />
      )}
    </div>
  )
}
