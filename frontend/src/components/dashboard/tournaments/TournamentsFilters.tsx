interface TournamentsFiltersProps {
  isDarkMode: boolean
  searchQuery: string
  locationFilter: string
  sortBy: "name" | "date"
  sortOrder: "asc" | "desc"
  uniqueLocations: string[]
  hasActiveFilters: boolean
  totalEvents: number
  filteredCount: number
  onFilterChange: (search: string, location: string) => void
  onSort: (sortBy: "name" | "date") => void
  onClearFilters: () => void
}

export function TournamentsFilters({
  isDarkMode,
  searchQuery,
  locationFilter,
  sortBy,
  sortOrder,
  uniqueLocations,
  hasActiveFilters,
  totalEvents,
  filteredCount,
  onFilterChange,
  onSort,
  onClearFilters
}: TournamentsFiltersProps) {
  return (
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
              Filtre a vyhľadávanie
            </h3>
            <span className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
              ({filteredCount}/{totalEvents})
            </span>
          </div>

          {/* Clear Filters Button */}
          {hasActiveFilters && (
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
              Zrušiť
            </button>
          )}
        </div>
      </div>

      {/* Filter Controls */}
      <div className="p-4">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
          {/* Search */}
          <div className="lg:col-span-2">
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => onFilterChange(e.target.value, locationFilter)}
                placeholder="Hľadať podľa názvu, miesta, kontinentu..."
                className={`w-full px-3 py-2 pl-9 rounded-lg text-sm transition-all ${
                  isDarkMode
                    ? 'bg-[#0f172a]/50 text-white focus:bg-[#0f172a] placeholder-gray-500 shadow-inner focus:ring-2 focus:ring-blue-500/30'
                    : 'bg-gray-50 text-gray-900 border border-gray-200 focus:border-blue-500 placeholder-gray-400 focus:ring-2 focus:ring-blue-500/20'
                } focus:outline-none`}
              />
              <svg
                className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              {searchQuery && (
                <button
                  onClick={() => onFilterChange("", locationFilter)}
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
          </div>

          {/* Location Filter */}
          <div>
            <div className="relative">
              <select
                value={locationFilter}
                onChange={(e) => onFilterChange(searchQuery, e.target.value)}
                className={`w-full px-3 py-2 pr-8 rounded-lg text-sm transition-all appearance-none cursor-pointer ${
                  isDarkMode
                    ? 'bg-[#0f172a]/50 text-white focus:bg-[#0f172a] shadow-inner focus:ring-2 focus:ring-blue-500/30'
                    : 'bg-gray-50 text-gray-900 border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20'
                } focus:outline-none`}
              >
                <option value="">Všetky lokality</option>
                {uniqueLocations.map(location => (
                  <option key={location} value={location}>{location}</option>
                ))}
              </select>
              <svg
                className={`absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none ${
                  isDarkMode ? 'text-gray-500' : 'text-gray-400'
                }`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>
        </div>

        {/* Sort Options */}
        <div className="mt-3 flex gap-2">
          <button
            onClick={() => onSort("name")}
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
            Názov
            {sortBy === "name" && (
              <span>{sortOrder === "asc" ? "↑" : "↓"}</span>
            )}
          </button>
          <button
            onClick={() => onSort("date")}
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
            Dátum
            {sortBy === "date" && (
              <span>{sortOrder === "asc" ? "↑" : "↓"}</span>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
