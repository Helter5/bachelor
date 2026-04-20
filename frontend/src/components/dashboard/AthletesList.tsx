import { useState, useMemo, useEffect, useCallback } from "react"
import { useTranslation } from "react-i18next"
import { apiClient } from "@/services/apiClient"
import { API_ENDPOINTS } from "@/config/api"
import { Pagination } from "./Pagination"
import { SearchInput } from "./SearchInput"
import { CountryFlag } from "./CountryFlag"
import { LoadingSpinner } from "../ui/LoadingSpinner"
import { MultiSelect } from "../ui/MultiSelect"
import { NumberInput } from "../ui/NumberInput"
import { AthleteCard } from "./AthleteCard"

const PERSONS_LIMIT = 5000

interface Person {
  id: number
  full_name: string
  country_iso_code: string | null
  fight_count: number
}

interface AthletesListProps {
  isDarkMode: boolean
  onSelectPerson: (person: { id: number; name: string }) => void
}

export function AthletesList({ isDarkMode, onSelectPerson }: AthletesListProps) {
  const { t } = useTranslation()
  const [persons, setPersons] = useState<Person[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedCountries, setSelectedCountries] = useState<Set<string>>(new Set())
  const [minFights, setMinFights] = useState("")
  const [currentPage, setCurrentPage] = useState(1)
  const [showAll, setShowAll] = useState(false)
  const itemsPerPage = 30

  const fetchPersons = useCallback(async () => {
    try {
      setLoading(true)
      const data = await apiClient.get<Person[]>(`${API_ENDPOINTS.PERSONS}?limit=${PERSONS_LIMIT}`)
      setPersons(data)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load athletes")
      setPersons([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchPersons() }, [fetchPersons])

  const countryOptions = useMemo(() => {
    const seen = new Set<string>()
    return persons
      .filter(p => p.country_iso_code && !seen.has(p.country_iso_code) && !!seen.add(p.country_iso_code))
      .map(p => ({
        value: p.country_iso_code!,
        label: p.country_iso_code!,
        icon: <CountryFlag code={p.country_iso_code} flagOnly />,
      }))
      .sort((a, b) => a.value.localeCompare(b.value))
  }, [persons])

  const filtered = useMemo(() => {
    const minFightsValue = Number.parseInt(minFights, 10)
    return persons.filter(p => {
      if (searchQuery && !p.full_name.toLowerCase().includes(searchQuery.toLowerCase())) return false
      if (selectedCountries.size > 0 && (!p.country_iso_code || !selectedCountries.has(p.country_iso_code))) return false
      if (!Number.isNaN(minFightsValue) && p.fight_count < minFightsValue) return false
      return true
    })
  }, [persons, searchQuery, selectedCountries, minFights])

  const currentPersons = showAll
    ? filtered
    : filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)

  return (
    <div className="space-y-6">

      {/* Header */}
      <div>
        <h2 className={`text-3xl font-bold mb-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
          {t("athletes.title")}
        </h2>
        <p className={isDarkMode ? 'text-gray-300' : 'text-gray-600'}>
          {t("athletes.subtitle")}
        </p>
      </div>

      {loading && (
        <LoadingSpinner text={t("athletes.loading")} isDarkMode={isDarkMode} variant="inline" size="md" />
      )}

      {error && !loading && (
        <div className={`p-6 rounded-lg ${isDarkMode ? 'bg-red-500/10' : 'bg-red-50'}`}>
          <p className={`font-semibold ${isDarkMode ? 'text-red-400' : 'text-red-700'}`}>{t("athletes.loadError")}</p>
          <p className={`text-sm ${isDarkMode ? 'text-red-300' : 'text-red-600'}`}>{error}</p>
        </div>
      )}

      {!loading && !error && persons.length === 0 && (
        <div className={`rounded-xl p-12 text-center ${isDarkMode ? 'bg-[#1e293b]' : 'bg-white border border-gray-200'}`}>
          <svg className={`mx-auto h-12 w-12 mb-4 ${isDarkMode ? 'text-gray-600' : 'text-gray-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          <p className={`text-lg font-semibold ${isDarkMode ? 'text-gray-200' : 'text-gray-900'}`}>{t("athletes.empty")}</p>
          <p className={`mt-2 text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
            {t("athletes.emptyDesc")}
          </p>
        </div>
      )}

      {!loading && !error && persons.length > 0 && (
        <>
          {/* Search + Filters */}
          <div className={`rounded-lg overflow-hidden ${isDarkMode ? 'bg-[#1e293b] shadow-lg' : 'bg-white border border-gray-200'}`}>
            <div className="p-4">
              <div className="flex items-end gap-3 flex-wrap">
                <div>
                  <label className={`block text-xs font-medium mb-1.5 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                    Meno
                  </label>
                  <div className="w-48">
                    <SearchInput
                      isDarkMode={isDarkMode}
                      value={searchQuery}
                      onChange={(value) => { setSearchQuery(value); setCurrentPage(1) }}
                      placeholder={t("athletes.searchPlaceholder")}
                    />
                  </div>
                </div>
                <div>
                  <label className={`block text-xs font-medium mb-1.5 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                    Krajina
                  </label>
                  <MultiSelect
                    options={countryOptions}
                    selected={selectedCountries}
                    onToggle={(val) => {
                      setSelectedCountries(prev => {
                        const next = new Set(prev)
                        if (next.has(val)) next.delete(val)
                        else next.add(val)
                        return next
                      })
                      setCurrentPage(1)
                    }}
                    onClear={() => { setSelectedCountries(new Set()); setCurrentPage(1) }}
                    placeholder={t("athletes.countryPlaceholder")}
                    isDarkMode={isDarkMode}
                    buttonIcon={
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6H11l-1-1H5a2 2 0 00-2 2zm9-13.5V9" />
                      </svg>
                    }
                  />
                </div>
                <NumberInput
                  value={minFights}
                  onChange={(value) => { setMinFights(value); setCurrentPage(1) }}
                  label="Min. zápasov"
                  isDarkMode={isDarkMode}
                />
              </div>
              <div className={`mt-2 text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                {t("athletes.countOf", { count: filtered.length, total: persons.length })}
              </div>
            </div>

            {/* Grid */}
            <div className="p-4">
              {currentPersons.length === 0 ? (
                <p className={`text-center py-8 text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                  {t("athletes.notFound")}
                </p>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                  {currentPersons.map((person) => (
                    <AthleteCard
                      key={person.id}
                      fullName={person.full_name}
                      countryCode={person.country_iso_code}
                      fightCount={person.fight_count}
                      isDarkMode={isDarkMode}
                      onClick={() => onSelectPerson({ id: person.id, name: person.full_name })}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>

          {showAll ? (
            <div className="flex justify-center pt-2">
              <button
                onClick={() => { setShowAll(false); setCurrentPage(1) }}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isDarkMode
                    ? 'bg-[#1e293b] text-gray-300 hover:text-white border border-gray-600'
                    : 'bg-white text-gray-600 hover:text-gray-900 border border-gray-300'
                }`}
              >
                {t("athletes.showPaged")}
              </button>
            </div>
          ) : (
            <Pagination
              isDarkMode={isDarkMode}
              currentPage={currentPage}
              totalItems={filtered.length}
              itemsPerPage={itemsPerPage}
              onPageChange={setCurrentPage}
              onShowAll={() => setShowAll(true)}
            />
          )}
        </>
      )}
    </div>
  )
}
