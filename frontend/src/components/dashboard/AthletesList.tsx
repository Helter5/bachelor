import { useState, useMemo, useEffect, useCallback } from "react"
import { apiClient } from "@/services/apiClient"
import { API_ENDPOINTS } from "@/config/api"
import { DuplicateAthletesModal } from "./DuplicateAthletesModal"

const PERSONS_LIMIT = 5000
import { Pagination } from "./Pagination"
import { SearchInput } from "./SearchInput"
import { CountryFlag } from "./CountryFlag"

interface Person {
  id: number
  full_name: string
  country_iso_code: string | null
  fight_count: number
}

interface AthletesListProps {
  isDarkMode: boolean
  onSelectPerson: (person: { id: number; name: string }) => void
  isAdmin?: boolean
}

export function AthletesList({ isDarkMode, onSelectPerson, isAdmin }: AthletesListProps) {
  const [persons, setPersons] = useState<Person[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [currentPage, setCurrentPage] = useState(1)
  const [showAll, setShowAll] = useState(false)
  const [showDuplicateModal, setShowDuplicateModal] = useState(false)
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

  const filtered = useMemo(() => {
    if (!searchQuery) return persons
    const q = searchQuery.toLowerCase()
    return persons.filter(p => p.full_name.toLowerCase().includes(q))
  }, [persons, searchQuery])

  const currentPersons = showAll
    ? filtered
    : filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)

  return (
    <div className="space-y-6">
      <DuplicateAthletesModal
        isOpen={showDuplicateModal}
        isDarkMode={isDarkMode}
        persons={persons}
        onClose={() => setShowDuplicateModal(false)}
        onMerged={fetchPersons}
      />

      {/* Header */}
      <div>
        <h2 className={`text-3xl font-bold mb-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
          Atléti
        </h2>
        <p className={isDarkMode ? 'text-gray-300' : 'text-gray-600'}>
          Prehľad všetkých registrovaných atlétov
        </p>
      </div>

      {loading && (
        <div className={`p-8 rounded-lg text-center ${isDarkMode ? 'bg-[#1e293b]' : 'bg-white'}`}>
          <div className="flex items-center justify-center gap-3">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            <span className={isDarkMode ? 'text-gray-300' : 'text-gray-600'}>Načítavam atlétov...</span>
          </div>
        </div>
      )}

      {error && !loading && (
        <div className={`p-6 rounded-lg ${isDarkMode ? 'bg-red-500/10' : 'bg-red-50'}`}>
          <p className={`font-semibold ${isDarkMode ? 'text-red-400' : 'text-red-700'}`}>Chyba pri načítaní atlétov</p>
          <p className={`text-sm ${isDarkMode ? 'text-red-300' : 'text-red-600'}`}>{error}</p>
        </div>
      )}

      {!loading && !error && persons.length === 0 && (
        <div className={`p-8 rounded-lg text-center ${isDarkMode ? 'bg-[#1e293b]' : 'bg-white'}`}>
          <p className={`text-lg font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-900'}`}>Žiadni atléti</p>
          <p className={`mt-1 text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
            Zatiaľ neboli synchronizovaní žiadni atléti.
          </p>
        </div>
      )}

      {!loading && !error && persons.length > 0 && (
        <>
          {/* Search + Duplicate button */}
          <div className={`rounded-lg overflow-hidden ${isDarkMode ? 'bg-[#1e293b] shadow-lg' : 'bg-white border border-gray-200'}`}>
            <div className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-4/5">
                  <SearchInput
                    isDarkMode={isDarkMode}
                    value={searchQuery}
                    onChange={(value) => { setSearchQuery(value); setCurrentPage(1) }}
                    placeholder="Hľadať podľa mena..."
                  />
                </div>
                <button
                  onClick={() => setShowDuplicateModal(true)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors border ${
                    isDarkMode
                      ? 'bg-[#0f172a] border-gray-600 text-gray-300 hover:text-white hover:border-gray-400'
                      : 'bg-gray-50 border-gray-300 text-gray-600 hover:text-gray-900 hover:border-gray-400'
                  }`}
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                  Duplicitní atléti
                </button>
              </div>
              <div className={`mt-2 text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                {filtered.length} z {persons.length} atlétov
              </div>
            </div>

            {/* List */}
            <div className="px-4 pb-4 space-y-1">
              {currentPersons.length === 0 ? (
                <p className={`text-center py-8 text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                  Žiadni atléti neboli nájdení
                </p>
              ) : currentPersons.map((person) => (
                <div
                  key={person.id}
                  onClick={() => onSelectPerson({ id: person.id, name: person.full_name })}
                  className={`flex items-center justify-between px-4 py-3 rounded-lg cursor-pointer transition-colors ${
                    isDarkMode
                      ? 'hover:bg-white/5'
                      : 'hover:bg-gray-50'
                  }`}
                >
                  <span className={`text-base font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                    {person.full_name}
                  </span>
                  <div className="flex items-center gap-5">
                    <CountryFlag code={person.country_iso_code} style={{ fontSize: '1.2rem' }} />
                    <span className={`text-sm tabular-nums w-6 text-right ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                      {person.fight_count}
                    </span>
                  </div>
                </div>
              ))}
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
                Zobraziť po stránkach
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
