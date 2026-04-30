import { useEffect, useRef, useState } from "react"
import { useTranslation } from "react-i18next"
import { apiClient } from "@/services/apiClient"
import { API_ENDPOINTS } from "@/config/api"
import { CountryFlag } from "../shared/CountryFlag"

interface PersonSuggestion {
  id: number
  full_name: string
  country_iso_code?: string | null
}

interface SelectedPerson {
  id: number
  name: string
}

interface PersonAutocompleteProps {
  isDarkMode: boolean
  selectedPerson: SelectedPerson | null
  onSelectPerson: (personId: number, fullName: string) => void
  onClearPerson: () => void
}

export function PersonAutocomplete({
  isDarkMode,
  selectedPerson,
  onSelectPerson,
  onClearPerson,
}: PersonAutocompleteProps) {
  const { t } = useTranslation()
  const [query, setQuery] = useState("")
  const [suggestions, setSuggestions] = useState<PersonSuggestion[]>([])
  const [loading, setLoading] = useState(false)
  const [showDropdown, setShowDropdown] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (!query || query.length < 2) {
      setSuggestions([])
      setShowDropdown(false)
      return
    }

    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(async () => {
      try {
        setLoading(true)
        const data = await apiClient.get<PersonSuggestion[]>(
          `${API_ENDPOINTS.PERSONS}?name=${encodeURIComponent(query)}&limit=10`
        )
        setSuggestions(data)
        setShowDropdown(true)
      } catch {
        setSuggestions([])
      } finally {
        setLoading(false)
      }
    }, 300)

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [query])

  useEffect(() => {
    const handleClick = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setShowDropdown(false)
      }
    }
    document.addEventListener("mousedown", handleClick)
    return () => document.removeEventListener("mousedown", handleClick)
  }, [])

  const clearQuery = () => {
    setQuery("")
    setSuggestions([])
    setShowDropdown(false)
  }

  return (
    <div ref={containerRef} className="relative">
      {selectedPerson ? (
        <div className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm ${
          isDarkMode
            ? "bg-blue-500/20 text-blue-300 border border-blue-500/30"
            : "bg-blue-50 text-blue-700 border border-blue-200"
        }`}>
          <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
          <span className="truncate font-medium">{selectedPerson.name}</span>
          <button
            onClick={onClearPerson}
            className={`ml-auto flex-shrink-0 p-0.5 rounded transition-colors ${
              isDarkMode ? "hover:bg-white/10" : "hover:bg-blue-100"
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
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onFocus={() => {
                if (suggestions.length > 0) setShowDropdown(true)
              }}
              placeholder={t("tournaments.athleteSearchPlaceholder")}
              className={`w-full px-3 py-2 pl-9 rounded-lg text-sm transition-all ${
                isDarkMode
                  ? "bg-[#0f172a]/50 text-white focus:bg-[#0f172a] placeholder-gray-500 shadow-inner focus:ring-2 focus:ring-blue-500/30"
                  : "bg-gray-50 text-gray-900 border border-gray-200 focus:border-blue-500 placeholder-gray-400 focus:ring-2 focus:ring-blue-500/20"
              } focus:outline-none`}
            />
            {loading ? (
              <div className="absolute left-3 top-1/2 -translate-y-1/2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500" />
              </div>
            ) : (
              <svg
                className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${isDarkMode ? "text-gray-500" : "text-gray-400"}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            )}
            {query && (
              <button
                onClick={clearQuery}
                className={`absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-md transition-colors ${
                  isDarkMode ? "hover:bg-white/10 text-gray-400" : "hover:bg-gray-200 text-gray-500"
                }`}
              >
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>

          {showDropdown && suggestions.length > 0 && (
            <div className={`absolute z-50 mt-1 w-full rounded-lg shadow-lg overflow-hidden ${
              isDarkMode
                ? "bg-[#1e293b] border border-white/10"
                : "bg-white border border-gray-200"
            }`}>
              {suggestions.map((person) => (
                <button
                  key={person.id}
                  onClick={() => {
                    onSelectPerson(person.id, person.full_name)
                    clearQuery()
                  }}
                  className={`w-full text-left px-3 py-2 text-sm flex items-center gap-2 transition-colors ${
                    isDarkMode
                      ? "hover:bg-white/5 text-gray-200"
                      : "hover:bg-gray-50 text-gray-800"
                  }`}
                >
                  {person.country_iso_code && (
                    <CountryFlag code={person.country_iso_code} style={{ fontSize: "1rem" }} flagOnly />
                  )}
                  <span className="truncate">{person.full_name}</span>
                </button>
              ))}
            </div>
          )}

          {showDropdown && suggestions.length === 0 && query.length >= 2 && !loading && (
            <div className={`absolute z-50 mt-1 w-full rounded-lg shadow-lg overflow-hidden ${
              isDarkMode
                ? "bg-[#1e293b] border border-white/10"
                : "bg-white border border-gray-200"
            }`}>
              <div className={`px-3 py-2 text-sm ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}>
                {t("tournaments.noAthletesFound")}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
