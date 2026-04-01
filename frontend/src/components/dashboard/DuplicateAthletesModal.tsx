import { useState, useMemo } from "react"
import { useTranslation } from "react-i18next"
import { PersonMergeModal } from "./PersonMergeModal"

interface Person {
  id: number
  full_name: string
  country_iso_code: string | null
  fight_count: number
}

interface DuplicateAthletesModalProps {
  isOpen: boolean
  isDarkMode: boolean
  persons: Person[]
  onClose: () => void
  onMerged: () => void
}

interface DuplicateGroup {
  name: string
  persons: Person[]
}

export function DuplicateAthletesModal({
  isOpen,
  isDarkMode,
  persons,
  onClose,
  onMerged,
}: DuplicateAthletesModalProps) {
  const { t } = useTranslation()
  const [searchQuery, setSearchQuery] = useState("")
  const [mergeGroup, setMergeGroup] = useState<Person[] | null>(null)

  const bg = isDarkMode ? "bg-[#0f172a]" : "bg-white"
  const border = isDarkMode ? "border-gray-700" : "border-gray-200"
  const text = isDarkMode ? "text-white" : "text-gray-900"
  const subtext = isDarkMode ? "text-gray-400" : "text-gray-500"
  const inputBg = isDarkMode
    ? "bg-[#1e293b] border-gray-600 text-white placeholder-gray-500"
    : "bg-white border-gray-300 text-gray-900 placeholder-gray-400"
  const rowBg = isDarkMode ? "bg-[#1e293b]/60" : "bg-gray-50"

  // Auto-detect: group by same full_name
  const allDuplicates: DuplicateGroup[] = useMemo(() => {
    const grouped: Record<string, Person[]> = {}
    for (const p of persons) {
      const key = p.full_name.trim().toLowerCase()
      if (!grouped[key]) grouped[key] = []
      grouped[key].push(p)
    }
    return Object.values(grouped)
      .filter(g => g.length > 1)
      .map(g => ({ name: g[0].full_name, persons: g }))
      .sort((a, b) => a.name.localeCompare(b.name))
  }, [persons])

  const displayed: DuplicateGroup[] = useMemo(() => {
    if (!searchQuery.trim()) return allDuplicates
    const q = searchQuery.toLowerCase()
    return allDuplicates.filter(g => g.name.toLowerCase().includes(q))
  }, [allDuplicates, searchQuery])

  if (!isOpen) return null

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

        <div className={`relative w-full max-w-2xl max-h-[80vh] flex flex-col rounded-2xl border ${bg} ${border} shadow-2xl`}>
          {/* Header */}
          <div className={`flex items-center justify-between px-6 py-4 border-b ${border}`}>
            <div>
              <h2 className={`text-lg font-bold ${text}`}>{t("duplicateAthletes.title")}</h2>
              <p className={`text-xs mt-0.5 ${subtext}`}>
                {allDuplicates.length > 0
                  ? t("duplicateAthletes.foundGroups", { count: allDuplicates.length })
                  : t("duplicateAthletes.noDuplicates")}
              </p>
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

          {/* Search */}
          {allDuplicates.length > 0 && (
            <div className={`px-6 py-3 border-b ${border}`}>
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder={t("duplicateAthletes.searchPlaceholder")}
                className={`w-full px-3 py-2 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${inputBg}`}
              />
            </div>
          )}

          {/* Groups */}
          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3">
            {displayed.length === 0 ? (
              <div className={`text-center py-10 ${subtext}`}>
                <svg className="w-10 h-10 mx-auto mb-3 opacity-40" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-sm font-medium">
                  {searchQuery ? t("duplicateAthletes.noResults") : t("duplicateAthletes.noDuplicates")}
                </p>
                {!searchQuery && (
                  <p className="text-xs mt-1">{t("duplicateAthletes.uniqueNames")}</p>
                )}
              </div>
            ) : (
              displayed.map((group) => (
                <div key={group.name} className={`rounded-xl border ${border} overflow-hidden`}>
                  <div className={`px-4 py-2.5 flex items-center justify-between ${isDarkMode ? "bg-amber-900/20" : "bg-amber-50"}`}>
                    <span className={`font-semibold text-sm ${isDarkMode ? "text-amber-300" : "text-amber-700"}`}>
                      {group.name}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${isDarkMode ? "bg-amber-800/40 text-amber-300" : "bg-amber-100 text-amber-600"}`}>
                        {t("duplicateAthletes.occurrences", { count: group.persons.length })}
                      </span>
                      <button
                        onClick={() => setMergeGroup(group.persons)}
                        className="text-xs px-3 py-1 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-medium transition-colors"
                      >
                        {t("duplicateAthletes.mergeButton")}
                      </button>
                    </div>
                  </div>
                  <div className="divide-y divide-gray-700/20">
                    {group.persons.map(p => (
                      <div key={p.id} className={`px-4 py-2 flex items-center justify-between text-sm ${rowBg}`}>
                        <span className={subtext}>
                          {p.country_iso_code || "—"}
                        </span>
                        <span className={`text-xs ${isDarkMode ? "text-gray-500" : "text-gray-400"}`}>
                          {p.fight_count} {p.fight_count === 1 ? t("duplicateAthletes.fightCountOne") : t("duplicateAthletes.fightCountMany")}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Merge modal */}
      <PersonMergeModal
        isOpen={mergeGroup !== null}
        onClose={() => setMergeGroup(null)}
        onMerged={() => { setMergeGroup(null); onMerged() }}
        persons={mergeGroup ?? []}
        isDarkMode={isDarkMode}
      />
    </>
  )
}
