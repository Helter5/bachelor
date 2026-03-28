import { useState, useEffect } from "react"
import type { Athlete, Team } from "../types"

interface MergeAthletesModalProps {
  isDarkMode: boolean
  athletes: Athlete[]
  teams: Team[]
  onClose: () => void
}

interface DuplicateGroup {
  name: string
  athletes: Athlete[]
}

export function MergeAthletesModal({ isDarkMode, athletes, teams, onClose }: MergeAthletesModalProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [duplicateGroups, setDuplicateGroups] = useState<DuplicateGroup[]>([])
  const [autoDetected, setAutoDetected] = useState(false)

  const bg = isDarkMode ? "bg-[#0f172a]" : "bg-white"
  const border = isDarkMode ? "border-gray-700" : "border-gray-200"
  const text = isDarkMode ? "text-white" : "text-gray-900"
  const subtext = isDarkMode ? "text-gray-400" : "text-gray-500"
  const inputBg = isDarkMode ? "bg-[#1e293b] border-gray-600 text-white placeholder-gray-500" : "bg-white border-gray-300 text-gray-900 placeholder-gray-400"
  const rowBg = isDarkMode ? "bg-[#1e293b]/60" : "bg-gray-50"

  // Auto-detect: find athletes with same name (case-insensitive)
  const autoDetect = () => {
    const grouped: Record<string, Athlete[]> = {}
    for (const athlete of athletes) {
      if (!athlete.person_full_name) continue
      const key = athlete.person_full_name.trim().toLowerCase()
      if (!grouped[key]) grouped[key] = []
      grouped[key].push(athlete)
    }
    const duplicates = Object.entries(grouped)
      .filter(([, group]) => group.length > 1)
      .map(([, group]) => ({ name: group[0].person_full_name!, athletes: group }))
    setDuplicateGroups(duplicates)
    setAutoDetected(true)
    setSearchQuery("")
  }

  // Manual search
  const searchResults: DuplicateGroup[] = searchQuery.trim().length >= 2
    ? (() => {
        const q = searchQuery.trim().toLowerCase()
        const matched = athletes.filter(a => a.person_full_name?.toLowerCase().includes(q))
        const grouped: Record<string, Athlete[]> = {}
        for (const a of matched) {
          const key = (a.person_full_name || "").trim().toLowerCase()
          if (!grouped[key]) grouped[key] = []
          grouped[key].push(a)
        }
        return Object.values(grouped).map(group => ({ name: group[0].person_full_name!, athletes: group }))
      })()
    : []

  const displayed = searchQuery.trim().length >= 2 ? searchResults : (autoDetected ? duplicateGroups : [])

  const getTeamName = (teamId: number | null | undefined) =>
    teams.find(t => t.id === teamId)?.name || "Bez tímu"

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className={`relative w-full max-w-2xl max-h-[80vh] flex flex-col rounded-2xl border ${bg} ${border} shadow-2xl`}>
        {/* Header */}
        <div className={`flex items-center justify-between px-6 py-4 border-b ${border}`}>
          <div>
            <h2 className={`text-lg font-bold ${text}`}>Duplicitní atléti</h2>
            <p className={`text-xs mt-0.5 ${subtext}`}>Nájdite a zlúčte atlétov s rovnakým menom</p>
          </div>
          <button
            onClick={onClose}
            className={`p-2 rounded-lg transition-colors ${isDarkMode ? "hover:bg-white/10 text-gray-400 hover:text-white" : "hover:bg-gray-100 text-gray-500 hover:text-gray-700"}`}
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Controls */}
        <div className={`px-6 py-4 border-b ${border} flex gap-3`}>
          <input
            type="text"
            value={searchQuery}
            onChange={e => { setSearchQuery(e.target.value); setAutoDetected(false) }}
            placeholder="Vyhľadať podľa mena..."
            className={`flex-1 px-3 py-2 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${inputBg}`}
          />
          <button
            onClick={autoDetect}
            className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
              isDarkMode
                ? "bg-blue-600 hover:bg-blue-500 text-white"
                : "bg-blue-600 hover:bg-blue-700 text-white"
            }`}
          >
            Automaticky nájsť
          </button>
        </div>

        {/* Results */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          {!autoDetected && searchQuery.trim().length < 2 ? (
            <div className={`text-center py-10 ${subtext}`}>
              <svg className="w-10 h-10 mx-auto mb-3 opacity-40" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <p className="text-sm">Zadajte meno alebo kliknite na <strong>Automaticky nájsť</strong></p>
            </div>
          ) : displayed.length === 0 ? (
            <div className={`text-center py-10 ${subtext}`}>
              <svg className="w-10 h-10 mx-auto mb-3 opacity-40" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-sm">{autoDetected ? "Žiadni duplicitní atléti nenájdení" : "Žiadne výsledky"}</p>
            </div>
          ) : (
            displayed.map((group, i) => (
              <div key={i} className={`rounded-xl border ${border} overflow-hidden`}>
                <div className={`px-4 py-2.5 flex items-center justify-between ${isDarkMode ? "bg-blue-900/20" : "bg-blue-50"}`}>
                  <span className={`font-semibold text-sm ${isDarkMode ? "text-blue-300" : "text-blue-700"}`}>
                    {group.name}
                  </span>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${isDarkMode ? "bg-blue-800/40 text-blue-300" : "bg-blue-100 text-blue-600"}`}>
                    {group.athletes.length}× výskyt
                  </span>
                </div>
                <div className="divide-y divide-gray-700/30">
                  {group.athletes.map(a => (
                    <div key={a.id} className={`px-4 py-2.5 flex items-center justify-between text-sm ${rowBg}`}>
                      <span className={subtext}>{getTeamName(a.team_id)}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        a.is_competing
                          ? isDarkMode ? "bg-green-900/30 text-green-400" : "bg-green-100 text-green-700"
                          : isDarkMode ? "bg-gray-700 text-gray-400" : "bg-gray-100 text-gray-500"
                      }`}>
                        {a.is_competing ? "Súťaží" : "Nesúťaží"}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        {displayed.length > 0 && (
          <div className={`px-6 py-3 border-t ${border} flex justify-between items-center`}>
            <span className={`text-xs ${subtext}`}>
              {autoDetected
                ? `${duplicateGroups.length} skupín duplicít`
                : `${displayed.length} ${displayed.length === 1 ? "výsledok" : "výsledky"}`}
            </span>
            <button
              onClick={onClose}
              className={`px-4 py-1.5 rounded-lg text-sm ${isDarkMode ? "text-gray-400 hover:text-white" : "text-gray-500 hover:text-gray-700"}`}
            >
              Zavrieť
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
