import { useState, useMemo, useEffect, useRef, useCallback } from "react"
import { useTranslation } from "react-i18next"
import { apiClient } from "@/services/apiClient"
import { API_ENDPOINTS } from "@/config/api"
import { Pagination } from "./Pagination"
import { SearchInput } from "./SearchInput"
import { useTournamentFilters } from "@/hooks/useTournamentFilters"
import type { Event } from "@/hooks/useTournaments"
import { StatusBadge } from "../ui/StatusBadge"
import { EmptyState } from "../ui/EmptyState"
import { LoadingSpinner } from "../ui/LoadingSpinner"
import { Select } from "../ui/Select"
import { formatDate } from "@/utils/dateFormatter"

interface PersonSuggestion {
  id: number
  full_name: string
  country_iso_code?: string | null
}

interface TournamentsListProps {
  isDarkMode: boolean
  onSelectTournament: (tournament: { id: number; name: string; start_date: string; end_date?: string }) => void
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
  const [personSearchQuery, setPersonSearchQuery] = useState("")
  const [personSuggestions, setPersonSuggestions] = useState<PersonSuggestion[]>([])
  const [loadingPersons, setLoadingPersons] = useState(false)
  const [showPersonDropdown, setShowPersonDropdown] = useState(false)
  const personSearchRef = useRef<HTMLDivElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

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

  // Debounced person search
  useEffect(() => {
    if (!personSearchQuery || personSearchQuery.length < 2) {
      setPersonSuggestions([])
      setShowPersonDropdown(false)
      return
    }

    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(async () => {
      try {
        setLoadingPersons(true)
        const data = await apiClient.get<PersonSuggestion[]>(
          `${API_ENDPOINTS.PERSONS}?name=${encodeURIComponent(personSearchQuery)}&limit=10`
        )
        setPersonSuggestions(data)
        setShowPersonDropdown(true)
      } catch {
        setPersonSuggestions([])
      } finally {
        setLoadingPersons(false)
      }
    }, 300)

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [personSearchQuery])

  // Close dropdown on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (personSearchRef.current && !personSearchRef.current.contains(e.target as Node)) {
        setShowPersonDropdown(false)
      }
    }
    document.addEventListener("mousedown", handleClick)
    return () => document.removeEventListener("mousedown", handleClick)
  }, [])

  // Fetch event IDs when a person is selected
  const handleSelectPerson = useCallback(async (person: PersonSuggestion) => {
    setSelectedPerson({ id: person.id, name: person.full_name })
    setPersonSearchQuery("")
    setShowPersonDropdown(false)
    setPersonSuggestions([])
    setCurrentPage(1)

    try {
      const data = await apiClient.get<{ events: { event_id: number }[] }>(
        API_ENDPOINTS.PERSON_DETAIL(person.id)
      )
      setPersonEventIds(new Set(data.events.map(e => e.event_id)))
    } catch {
      setPersonEventIds(new Set())
    }
  }, [])

  const handleClearPerson = useCallback(() => {
    setSelectedPerson(null)
    setPersonEventIds(new Set())
    setPersonSearchQuery("")
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

  const locationOptions = useMemo(() => [
    { value: "", label: t("tournaments.allLocalities") },
    ...uniqueLocations.map((loc) => ({ value: loc, label: loc })),
  ], [uniqueLocations, t])

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
        <div className={`p-6 rounded-lg ${isDarkMode ? 'bg-red-500/10' : 'bg-red-50'}`}>
          <div className="flex items-center gap-3">
            <svg className="w-6 h-6 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <p className={`font-semibold ${isDarkMode ? 'text-red-400' : 'text-red-700'}`}>{t("tournaments.loadError")}</p>
              <p className={`text-sm ${isDarkMode ? 'text-red-300' : 'text-red-600'}`}>{error}</p>
            </div>
          </div>
        </div>
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

      {/* Filters and Search - Only show if there are events */}
      {!loading && !error && events.length > 0 && (
        <div className={`rounded-lg overflow-hidden ${
          isDarkMode ? 'bg-[#1e293b] shadow-lg' : 'bg-white border border-gray-200'
        }`}>
          {/* Filter Header */}
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
                  ({displayedEvents.length}/{events.length})
                </span>
              </div>

              {/* Clear Filters Button */}
              {(hasActiveFilters || !!selectedPerson) && (
                <button
                  onClick={() => {
                    clearFilters()
                    handleClearPerson()
                    setCurrentPage(1)
                  }}
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

          {/* Filter Controls */}
          <div className="p-4">
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-3">
              {/* Search */}
              <div className="lg:col-span-2">
                <SearchInput
                  isDarkMode={isDarkMode}
                  value={searchQuery}
                  onChange={(v) => handleFilterChange(v, locationFilter)}
                  placeholder={t("tournaments.searchPlaceholder")}
                />
              </div>

              {/* Athlete Filter */}
              <div ref={personSearchRef} className="relative">
                {selectedPerson ? (
                  <div className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm ${
                    isDarkMode
                      ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                      : 'bg-blue-50 text-blue-700 border border-blue-200'
                  }`}>
                    <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    <span className="truncate font-medium">{selectedPerson.name}</span>
                    <button
                      onClick={handleClearPerson}
                      className={`ml-auto flex-shrink-0 p-0.5 rounded transition-colors ${
                        isDarkMode ? 'hover:bg-white/10' : 'hover:bg-blue-100'
                      }`}
                    >
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="relative">
                      <input
                        type="text"
                        value={personSearchQuery}
                        onChange={(e) => setPersonSearchQuery(e.target.value)}
                        onFocus={() => { if (personSuggestions.length > 0) setShowPersonDropdown(true) }}
                        placeholder={t("tournaments.athleteSearchPlaceholder")}
                        className={`w-full px-3 py-2 pl-9 rounded-lg text-sm transition-all ${
                          isDarkMode
                            ? 'bg-[#0f172a]/50 text-white focus:bg-[#0f172a] placeholder-gray-500 shadow-inner focus:ring-2 focus:ring-blue-500/30'
                            : 'bg-gray-50 text-gray-900 border border-gray-200 focus:border-blue-500 placeholder-gray-400 focus:ring-2 focus:ring-blue-500/20'
                        } focus:outline-none`}
                      />
                      {loadingPersons ? (
                        <div className="absolute left-3 top-1/2 -translate-y-1/2">
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
                        </div>
                      ) : (
                        <svg
                          className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                      )}
                      {personSearchQuery && (
                        <button
                          onClick={() => { setPersonSearchQuery(""); setPersonSuggestions([]); setShowPersonDropdown(false) }}
                          className={`absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-md transition-colors ${
                            isDarkMode ? 'hover:bg-white/10 text-gray-400' : 'hover:bg-gray-200 text-gray-500'
                          }`}
                        >
                          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      )}
                    </div>

                    {/* Person suggestions dropdown */}
                    {showPersonDropdown && personSuggestions.length > 0 && (
                      <div className={`absolute z-50 mt-1 w-full rounded-lg shadow-lg overflow-hidden ${
                        isDarkMode
                          ? 'bg-[#1e293b] border border-white/10'
                          : 'bg-white border border-gray-200'
                      }`}>
                        {personSuggestions.map((person) => (
                          <button
                            key={person.id}
                            onClick={() => handleSelectPerson(person)}
                            className={`w-full text-left px-3 py-2 text-sm flex items-center gap-2 transition-colors ${
                              isDarkMode
                                ? 'hover:bg-white/5 text-gray-200'
                                : 'hover:bg-gray-50 text-gray-800'
                            }`}
                          >
                            {person.country_iso_code && (
                              <span
                                className={`fi fi-${person.country_iso_code.toLowerCase()} fis rounded-sm`}
                                style={{ fontSize: '1rem' }}
                              ></span>
                            )}
                            <span className="truncate">{person.full_name}</span>
                          </button>
                        ))}
                      </div>
                    )}

                    {/* No results message */}
                    {showPersonDropdown && personSuggestions.length === 0 && personSearchQuery.length >= 2 && !loadingPersons && (
                      <div className={`absolute z-50 mt-1 w-full rounded-lg shadow-lg overflow-hidden ${
                        isDarkMode
                          ? 'bg-[#1e293b] border border-white/10'
                          : 'bg-white border border-gray-200'
                      }`}>
                        <div className={`px-3 py-2 text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                          {t("tournaments.noAthletesFound")}
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* Location Filter */}
              <div>
                <Select
                  value={locationFilter}
                  onChange={(v) => handleFilterChange(searchQuery, v)}
                  options={locationOptions}
                  isDarkMode={isDarkMode}
                  className="w-full"
                />
              </div>
            </div>

            {/* Sort Options */}
            <div className="mt-3 flex gap-2">
              <button
                onClick={() => handleSort("name")}
                className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                  sortBy === "name"
                    ? isDarkMode
                      ? "bg-blue-500 text-white"
                      : "bg-blue-600 text-white"
                    : isDarkMode
                      ? "bg-[#0f172a]/50 text-gray-300 hover:bg-white/5 shadow-inner"
                      : "bg-gray-50 text-gray-700 hover:bg-gray-100 border border-gray-200"
                }`}
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14" />
                </svg>
                {t("tournaments.sortByName")}
                {sortBy === "name" && (
                  <span>{sortOrder === "asc" ? "↑" : "↓"}</span>
                )}
              </button>
              <button
                onClick={() => handleSort("date")}
                className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                  sortBy === "date"
                    ? isDarkMode
                      ? "bg-blue-500 text-white"
                      : "bg-blue-600 text-white"
                    : isDarkMode
                      ? "bg-[#0f172a]/50 text-gray-300 hover:bg-white/5 shadow-inner"
                      : "bg-gray-50 text-gray-700 hover:bg-gray-100 border border-gray-200"
                }`}
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                {t("tournaments.sortByDate")}
                {sortBy === "date" && (
                  <span>{sortOrder === "asc" ? "↑" : "↓"}</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Events Grid - Card Layout */}
      {!loading && !error && events.length > 0 && (
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {currentEvents.length > 0 ? (
          currentEvents.map((event) => (
            <div
              key={event.id}
              onClick={() => onSelectTournament({
                id: event.id,
                name: event.full_name || event.name,
                start_date: event.start_date,
                end_date: event.end_date
              })}
              className={`rounded-lg transition-all hover:scale-[1.02] cursor-pointer overflow-hidden ${
                isDarkMode
                  ? 'bg-[#1e293b] hover:bg-[#334155] shadow-lg hover:shadow-2xl'
                  : 'bg-white hover:shadow-xl border border-gray-200 shadow-lg'
              }`}
            >
              {/* Card Content */}
              <div className="flex h-full">
                {/* Left Side - Country Flag */}
                <div className={`w-32 flex-shrink-0 flex items-center justify-center p-4 ${
                  isDarkMode ? 'bg-white/5' : 'bg-gray-50'
                }`}>
                  {event.country_iso_code ? (
                    <span 
                      className={`fi fi-${event.country_iso_code.toLowerCase()} fis rounded-md`}
                      style={{ fontSize: '5rem' }}
                      title={event.country_iso_code}
                    ></span>
                  ) : (
                    <svg
                      className={`w-20 h-20 ${isDarkMode ? 'text-gray-600' : 'text-gray-300'}`}
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.5}
                        d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                  )}
                </div>

                {/* Right Side - Info */}
                <div className="flex-1 p-4 flex flex-col justify-between">
                  {/* Tournament Name */}
                  <div>
                    <h3 className={`text-lg font-bold mb-3 line-clamp-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                      {event.name}
                    </h3>

                    {/* Info Items */}
                    <div className="space-y-2 text-sm">
                      {/* Date */}
                      <div className={`flex items-start gap-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                        <svg className="w-4 h-4 mt-0.5 flex-shrink-0 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        <div>
                          <span className="font-medium">{formatDate(event.start_date)}</span>
                          {event.end_date && event.end_date !== event.start_date && (
                            <>
                              <br />
                              <span className={isDarkMode ? 'text-gray-400' : 'text-gray-500'}>
                                → {formatDate(event.end_date)}
                              </span>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Location */}
                      {event.address_locality && (
                        <div className={`flex items-center gap-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                          <svg className="w-4 h-4 flex-shrink-0 text-orange-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                          <span className="truncate">{event.address_locality}</span>
                        </div>
                      )}

                      {/* Continent */}
                      {event.continent && (
                        <div className={`flex items-center gap-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                          <svg className="w-4 h-4 flex-shrink-0 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <span>{event.continent}</span>
                        </div>
                      )}

                      {/* Tournament Type Badge */}
                      {event.tournament_type && (
                        <div className="pt-1">
                          <StatusBadge variant="purple" isDarkMode={isDarkMode} size="md">
                            {event.tournament_type}
                          </StatusBadge>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className={`col-span-full text-center py-12 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            {t("tournaments.notFound")}
          </div>
        )}
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
