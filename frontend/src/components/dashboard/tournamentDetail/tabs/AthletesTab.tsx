import { useState } from "react"
import { Pagination } from "../Pagination"
import type { Team, Athlete, WeightCategory } from "../types"
import { ITEMS_PER_PAGE } from "../types"
import { MergeAthletesModal } from "./MergeAthletesModal"
import { CountryFlag } from "../../CountryFlag"

interface AthletesTabProps {
  isDarkMode: boolean
  athletes: Athlete[]
  athletesLoading: boolean
  athletesError: string | null
  teams: Team[]
  weightCategories: WeightCategory[]
  athletesPage: number
  setAthletesPage: (page: number) => void
  onSelectPerson?: (person: { id: number; name: string }) => void
  handleNameClick: (name: string) => void
}

export function AthletesTab({
  isDarkMode,
  athletes,
  athletesLoading,
  athletesError,
  teams,
  weightCategories,
  athletesPage,
  setAthletesPage,
  onSelectPerson,
  handleNameClick,
}: AthletesTabProps) {
  const [filterQuery, setFilterQuery] = useState("")
  const [showMergeModal, setShowMergeModal] = useState(false)

  const filtered = filterQuery.trim()
    ? athletes.filter(a => a.person_full_name?.toLowerCase().includes(filterQuery.toLowerCase()))
    : athletes

  return (
    <div>
      <h3 className={`text-xl font-semibold mb-4 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
        Atléti
      </h3>

      {/* Filter + Merge button row */}
      <div className="flex items-center gap-3 mb-4">
        <div className="w-4/5">
          <input
            type="text"
            value={filterQuery}
            onChange={e => { setFilterQuery(e.target.value); setAthletesPage(1) }}
            placeholder="Filtrovať podľa mena..."
            className={`w-full px-3 py-2 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              isDarkMode
                ? 'bg-[#1e293b] border-gray-600 text-white placeholder-gray-500'
                : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400'
            }`}
          />
        </div>
        <button
          onClick={() => setShowMergeModal(true)}
          className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
            isDarkMode
              ? 'bg-[#1e293b] border border-gray-600 text-gray-300 hover:text-white hover:border-gray-400'
              : 'bg-white border border-gray-300 text-gray-600 hover:text-gray-900 hover:border-gray-400'
          }`}
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
          Duplicitní atléti
        </button>
      </div>

      {athletesError && (
        <div className={`p-4 rounded-lg mb-4 ${isDarkMode ? 'bg-red-900/20 text-red-400' : 'bg-red-50 text-red-600'}`}>
          {athletesError}
        </div>
      )}

      {athletesLoading && athletes.length === 0 ? (
        <div className={`text-center py-12 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p>Načítavam atlétov...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className={`text-center py-12 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
          <svg className={`mx-auto h-12 w-12 mb-4 ${isDarkMode ? 'text-gray-600' : 'text-gray-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
          <p className="text-lg font-medium">{filterQuery ? 'Žiadne výsledky' : 'Žiadni atléti'}</p>
          <p className="text-sm mt-2">{filterQuery ? 'Skúste iný výraz' : 'Použite synchronizáciu na hlavnej stránke'}</p>
        </div>
      ) : (
        <>
          <div className="space-y-2">
            {filtered
              .slice((athletesPage - 1) * ITEMS_PER_PAGE, athletesPage * ITEMS_PER_PAGE)
              .map((athlete) => {
              const athleteTeam = teams.find(t => t.id === athlete.team_id)
              const athleteWeightCategory = weightCategories.find(wc => wc.id === athlete.weight_category_id)
              return (
                <div
                  key={athlete.id}
                  className={`rounded-lg p-3 transition-all ${
                    isDarkMode
                      ? 'bg-[#0f172a]/50 hover:bg-[#1e293b] shadow-md hover:shadow-xl backdrop-blur-sm'
                      : 'bg-gray-50 hover:bg-gray-100 border border-gray-200'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <h4 className={`font-semibold text-base ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                        {onSelectPerson ? (
                          <button onClick={() => handleNameClick(athlete.person_full_name)} className={`hover:underline text-left ${isDarkMode ? 'text-blue-400 hover:text-blue-300' : 'text-blue-600 hover:text-blue-700'}`}>
                            {athlete.person_full_name}
                          </button>
                        ) : athlete.person_full_name}
                      </h4>
                      <div className="flex items-center gap-3 mt-1 text-xs">
                        <div className="flex items-center gap-1">
                          <CountryFlag code={athleteTeam?.country_iso_code} flagOnly />
                          <span className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>
                            {athleteTeam?.name || 'Bez tímu'}
                          </span>
                        </div>
                        <span className={isDarkMode ? 'text-gray-500' : 'text-gray-400'}>•</span>
                        <span className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>
                          {athleteWeightCategory?.name || 'Bez kategórie'}
                        </span>
                      </div>
                    </div>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                      athlete.is_competing
                        ? isDarkMode ? 'bg-green-900/30 text-green-400' : 'bg-green-100 text-green-800'
                        : isDarkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-700'
                    }`}>
                      {athlete.is_competing ? 'Súťaží' : 'Nesúťaží'}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
          <Pagination
            isDarkMode={isDarkMode}
            currentPage={athletesPage}
            totalItems={filtered.length}
            itemsPerPage={ITEMS_PER_PAGE}
            onPageChange={setAthletesPage}
          />
        </>
      )}

      {showMergeModal && (
        <MergeAthletesModal
          isDarkMode={isDarkMode}
          athletes={athletes}
          teams={teams}
          onClose={() => setShowMergeModal(false)}
        />
      )}
    </div>
  )
}
