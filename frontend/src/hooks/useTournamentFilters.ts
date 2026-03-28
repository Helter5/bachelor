import { useState, useMemo } from "react"
import type { Event } from "./useTournaments"

export function useTournamentFilters(events: Event[]) {
  const [searchQuery, setSearchQuery] = useState("")
  const [locationFilter, setLocationFilter] = useState("")
  const [sortBy, setSortBy] = useState<"name" | "date">("name")
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc")

  // Get unique locations for filter dropdown
  const uniqueLocations = useMemo(() => {
    const locations = events
      .map(event => event.address_locality || event.continent)
      .filter((location): location is string => Boolean(location))
    return Array.from(new Set(locations)).sort()
  }, [events])

  // Filter and sort events
  const filteredAndSortedEvents = useMemo(() => {
    const filtered = events.filter(event => {
      const matchesSearch = event.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           event.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           event.address_locality?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           event.continent?.toLowerCase().includes(searchQuery.toLowerCase())
      const matchesLocation = !locationFilter || 
                             event.address_locality === locationFilter || 
                             event.continent === locationFilter
      return matchesSearch && matchesLocation
    })

    // Sort events
    filtered.sort((a, b) => {
      let comparison = 0
      if (sortBy === "name") {
        comparison = a.name.localeCompare(b.name)
      } else if (sortBy === "date") {
        comparison = new Date(a.start_date).getTime() - new Date(b.start_date).getTime()
      }
      return sortOrder === "asc" ? comparison : -comparison
    })

    return filtered
  }, [events, searchQuery, locationFilter, sortBy, sortOrder])

  const handleFilterChange = (newSearch: string, newLocation: string) => {
    setSearchQuery(newSearch)
    setLocationFilter(newLocation)
  }

  const handleSort = (newSortBy: "name" | "date") => {
    if (sortBy === newSortBy) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc")
    } else {
      setSortBy(newSortBy)
      setSortOrder("asc")
    }
  }

  const clearFilters = () => {
    setSearchQuery("")
    setLocationFilter("")
    setSortBy("name")
    setSortOrder("asc")
  }

  const hasActiveFilters = searchQuery || locationFilter || sortBy !== "name" || sortOrder !== "asc"

  return {
    searchQuery,
    locationFilter,
    sortBy,
    sortOrder,
    uniqueLocations,
    filteredAndSortedEvents,
    handleFilterChange,
    handleSort,
    clearFilters,
    hasActiveFilters
  }
}
