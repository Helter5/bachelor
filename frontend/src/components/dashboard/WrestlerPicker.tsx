import { useTranslation } from "react-i18next"

export interface Person {
  id: number
  full_name: string
  country_iso_code: string | null
  created_at: string
}

export type PickerMode = "idle" | "browse" | "search"

interface WrestlerPickerProps {
  isDarkMode: boolean
  wrestler: 1 | 2
  selected: Person | null
  mode: PickerMode
  onModeChange: (m: PickerMode) => void
  search: string
  onSearchChange: (s: string) => void
  onSelect: (p: Person | null) => void
  filteredPersons: Person[]
  allPersons: Person[]
  searchInputRef: React.RefObject<HTMLInputElement | null>
  containerRef: React.RefObject<HTMLDivElement | null>
}

export function WrestlerPicker({
  isDarkMode,
  wrestler,
  selected,
  mode,
  onModeChange,
  search,
  onSearchChange,
  onSelect,
  filteredPersons,
  allPersons,
  searchInputRef,
  containerRef,
}: WrestlerPickerProps) {
  const { t } = useTranslation()
  const label = t("comparison.wrestler", { number: wrestler })

  return (
    <div className="relative" ref={containerRef}>
      <div className={`block text-sm font-medium mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
        {label}
      </div>

      {/* Selected */}
      {selected && (
        <div className={`flex items-center justify-between w-full px-4 py-2.5 rounded-lg text-sm ${
          isDarkMode
            ? 'bg-purple-900/30 text-white border border-purple-500/30'
            : 'bg-purple-50 text-gray-900 border border-purple-200'
        }`}>
          <span>
            <span className="font-medium">{selected.full_name}</span>
            {selected.country_iso_code && (
              <span className={`ml-2 text-xs ${isDarkMode ? 'text-purple-300' : 'text-purple-600'}`}>
                ({selected.country_iso_code})
              </span>
            )}
          </span>
          <button
            onClick={() => { onSelect(null); onSearchChange(""); onModeChange("idle") }}
            className={`p-0.5 rounded hover:bg-purple-500/20 transition-colors ${isDarkMode ? 'text-gray-400 hover:text-white' : 'text-gray-400 hover:text-gray-700'}`}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      {/* Search mode */}
      {!selected && mode === "search" && (
        <div className="relative">
          <div className="relative flex items-center">
            <svg className={`absolute left-3 w-4 h-4 ${isDarkMode ? 'text-blue-400' : 'text-blue-500'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              ref={searchInputRef}
              type="text"
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder={t("comparison.searchPlaceholder")}
              className={`w-full pl-10 pr-10 py-2.5 rounded-lg text-sm transition-all ${
                isDarkMode
                  ? 'bg-blue-950/40 text-white placeholder-blue-300/40 border-2 border-blue-500/40 focus:border-blue-400 shadow-lg shadow-blue-500/10'
                  : 'bg-blue-50 text-gray-900 placeholder-blue-400/60 border-2 border-blue-300 focus:border-blue-500 shadow-lg shadow-blue-500/10'
              } focus:outline-none`}
            />
            <button
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => { onSearchChange(""); onModeChange("idle") }}
              className={`absolute right-3 p-0.5 rounded transition-colors ${isDarkMode ? 'text-gray-400 hover:text-white' : 'text-gray-400 hover:text-gray-700'}`}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          {filteredPersons.length > 0 && (
            <div className={`absolute z-20 w-full mt-1 rounded-lg shadow-xl max-h-48 overflow-y-auto ${
              isDarkMode ? 'bg-[#1e293b] border border-blue-500/20' : 'bg-white border border-blue-200'
            }`}>
              {filteredPersons.slice(0, 15).map(p => (
                <button
                  key={p.id}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => { onSelect(p); onSearchChange(""); onModeChange("idle") }}
                  className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${
                    isDarkMode ? 'text-gray-200 hover:bg-blue-500/20' : 'text-gray-900 hover:bg-blue-50'
                  }`}
                >
                  <span className="font-medium">{p.full_name}</span>
                  {p.country_iso_code && (
                    <span className={`ml-2 text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                      ({p.country_iso_code})
                    </span>
                  )}
                </button>
              ))}
            </div>
          )}
          {search.trim() && filteredPersons.length === 0 && (
            <div className={`absolute z-20 w-full mt-1 rounded-lg shadow-xl px-4 py-3 text-sm ${
              isDarkMode ? 'bg-[#1e293b] border border-white/10 text-gray-400' : 'bg-white border border-gray-200 text-gray-500'
            }`}>
              {t("comparison.noWrestlerFound")}
            </div>
          )}
        </div>
      )}

      {/* Browse dropdown */}
      {!selected && mode === "browse" && (
        <div>
          <div className={`w-full px-4 py-2.5 rounded-lg text-sm flex items-center justify-between ${
            isDarkMode
              ? 'bg-[#0f172a]/50 text-gray-400 border border-white/10'
              : 'bg-gray-50 text-gray-500 border border-gray-200'
          }`}>
            <span>{t("comparison.selectFromList")}</span>
            <button
              onClick={(e) => { e.stopPropagation(); onModeChange("search") }}
              className={`p-1 rounded transition-colors ${
                isDarkMode ? 'hover:bg-blue-500/20 text-gray-500 hover:text-blue-400' : 'hover:bg-blue-50 text-gray-400 hover:text-blue-500'
              }`}
              title={t("comparison.searchTitle")}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </button>
          </div>
          <div className={`absolute z-20 w-full mt-1 rounded-lg shadow-xl max-h-60 overflow-y-auto ${
            isDarkMode ? 'bg-[#1e293b] border border-white/10' : 'bg-white border border-gray-200'
          }`}>
            {allPersons.length === 0 ? (
              <div className={`px-4 py-3 text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                {t("comparison.noWrestlers")}
              </div>
            ) : (
              allPersons.map(p => (
                <button
                  key={p.id}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => { onSelect(p); onSearchChange(""); onModeChange("idle") }}
                  className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${
                    isDarkMode ? 'text-gray-200 hover:bg-[#334155]' : 'text-gray-900 hover:bg-gray-100'
                  }`}
                >
                  <span className="font-medium">{p.full_name}</span>
                  {p.country_iso_code && (
                    <span className={`ml-2 text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                      ({p.country_iso_code})
                    </span>
                  )}
                </button>
              ))
            )}
          </div>
        </div>
      )}

      {/* Idle */}
      {!selected && mode === "idle" && (
        <div
          className={`w-full px-4 py-2.5 rounded-lg text-sm cursor-pointer transition-all flex items-center justify-between ${
            isDarkMode
              ? 'bg-[#0f172a]/50 text-gray-500 border border-white/10 hover:border-purple-500/30 hover:text-gray-400'
              : 'bg-gray-50 text-gray-400 border border-gray-200 hover:border-purple-300 hover:text-gray-500'
          }`}
          onClick={() => onModeChange("browse")}
        >
          <span>{t("comparison.clickToSelect")}</span>
          <button
            onClick={(e) => { e.stopPropagation(); onModeChange("search") }}
            className={`p-1 rounded transition-colors ${
              isDarkMode ? 'hover:bg-blue-500/20 text-gray-500 hover:text-blue-400' : 'hover:bg-blue-50 text-gray-400 hover:text-blue-500'
            }`}
            title={t("comparison.searchTitle")}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </button>
        </div>
      )}
    </div>
  )
}
