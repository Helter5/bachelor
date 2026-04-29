import { useTranslation } from "react-i18next"
import { OptionDropdown } from "@/components/ui/OptionDropdown"

export interface Person {
  id: number
  full_name: string
  country_iso_code: string | null
  created_at?: string
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

  const panelClass = isDarkMode
    ? "bg-[#0f172a]/95 border-white/10 shadow-[0_24px_70px_rgba(15,23,42,0.45)]"
    : "bg-white/95 border-gray-200 shadow-[0_24px_70px_rgba(15,23,42,0.08)]"

  const filteredOptions = filteredPersons.slice(0, 15).map((person) => ({
    value: person.id,
    label: person.full_name,
    description: person.country_iso_code,
    badge: person.id,
  }))

  const allOptions = allPersons.map((person) => ({
    value: person.id,
    label: person.full_name,
    description: person.country_iso_code,
    badge: person.id,
  }))

  return (
    <div className="relative" ref={containerRef}>
      <div className={`mb-2 flex items-center justify-between text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
        <span>{label}</span>
        <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] ${isDarkMode ? 'bg-white/5 text-gray-400' : 'bg-gray-100 text-gray-500'}`}>
          {selected ? t("common.selected") : t("comparison.selectFromList")}
        </span>
      </div>

      {selected && (
        <div className={`relative overflow-hidden rounded-2xl border px-4 py-3 text-sm ${panelClass}`}>
          <div className={`absolute inset-x-0 top-0 h-1 ${isDarkMode ? 'bg-gradient-to-r from-purple-500 via-fuchsia-500 to-blue-500' : 'bg-gradient-to-r from-purple-400 via-fuchsia-400 to-blue-400'}`} />
          <div className="relative flex items-center justify-between gap-4">
            <div className="min-w-0">
              <div className={`truncate font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                {selected.full_name}
              </div>
              {selected.country_iso_code && (
                <div className={`mt-0.5 text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                  {selected.country_iso_code}
                </div>
              )}
            </div>
            <button
              onClick={() => { onSelect(null); onSearchChange(""); onModeChange("idle") }}
              className={`shrink-0 inline-flex h-8 w-8 items-center justify-center rounded-full transition-colors ${
                isDarkMode ? 'bg-white/5 text-gray-300 hover:bg-white/10 hover:text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200 hover:text-gray-700'
              }`}
              title="Vymazať výber"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {!selected && mode === "search" && (
        <div className="relative">
          <div className="relative flex items-center">
            <svg className={`absolute left-3 w-4 h-4 ${isDarkMode ? 'text-purple-300' : 'text-purple-500'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              ref={searchInputRef}
              type="text"
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder={t("comparison.searchPlaceholder")}
              className={`w-full rounded-2xl border py-3 pl-10 pr-10 text-sm outline-none transition-all ${
                isDarkMode
                  ? 'border-white/10 bg-[#0f172a] text-white placeholder-gray-500 shadow-[0_18px_50px_rgba(15,23,42,0.35)] focus:border-purple-400'
                  : 'border-gray-200 bg-white text-gray-900 placeholder-gray-400 shadow-[0_18px_50px_rgba(15,23,42,0.08)] focus:border-purple-300'
              }`}
            />
            <button
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => { onSearchChange(""); onModeChange("idle") }}
              className={`absolute right-3 p-1.5 rounded-full transition-colors ${isDarkMode ? 'text-gray-400 hover:bg-white/10 hover:text-white' : 'text-gray-400 hover:bg-gray-100 hover:text-gray-700'}`}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <OptionDropdown
            options={filteredOptions}
            selectedValue={null}
            onSelect={(personId) => {
              const person = filteredPersons.find((item) => item.id === personId)
              if (!person) return
              onSelect(person)
              onSearchChange("")
              onModeChange("idle")
            }}
            isDarkMode={isDarkMode}
            emptyText={t("comparison.noWrestlerFound")}
            className="absolute z-20 w-full mt-2"
            panelClassName={panelClass}
            headerTitle={t("comparison.selectFromList")}
            headerSubtitle={search.trim() ? t("comparison.searchTitle") : t("comparison.clickToSelect")}
            rightHeader={
              <span className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold ${isDarkMode ? 'bg-white/10 text-gray-200' : 'bg-gray-100 text-gray-600'}`}>
                {filteredPersons.length}
              </span>
            }
          />
        </div>
      )}

      {!selected && mode === "browse" && (
        <div>
          <div className={`flex items-center justify-between rounded-2xl border px-4 py-3 text-sm ${isDarkMode ? 'border-white/10 bg-[#0f172a]/70 text-gray-300 shadow-[0_18px_50px_rgba(15,23,42,0.25)]' : 'border-gray-200 bg-white text-gray-600 shadow-[0_18px_50px_rgba(15,23,42,0.08)]'}`}>
            <span className="truncate">{t("comparison.selectFromList")}</span>
            <button
              onClick={(e) => { e.stopPropagation(); onModeChange("search") }}
              className={`p-1.5 rounded-full transition-colors ${isDarkMode ? 'text-gray-400 hover:bg-purple-500/20 hover:text-purple-300' : 'text-gray-400 hover:bg-purple-50 hover:text-purple-500'}`}
              title={t("comparison.searchTitle")}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </button>
          </div>

          <OptionDropdown
            options={allOptions}
            selectedValue={null}
            onSelect={(personId) => {
              const person = allPersons.find((item) => item.id === personId)
              if (!person) return
              onSelect(person)
              onSearchChange("")
              onModeChange("idle")
            }}
            isDarkMode={isDarkMode}
            emptyText={t("comparison.noWrestlers")}
            className="absolute z-20 w-full mt-2"
            panelClassName={panelClass}
            headerTitle={t("comparison.selectFromList")}
            headerSubtitle={t("comparison.clickToSelect")}
            rightHeader={
              <span className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold ${isDarkMode ? 'bg-white/10 text-gray-200' : 'bg-gray-100 text-gray-600'}`}>
                {allPersons.length}
              </span>
            }
          />
        </div>
      )}

      {!selected && mode === "idle" && (
        <div
          className={`flex w-full cursor-pointer items-center justify-between rounded-2xl border px-4 py-3 text-sm transition-all ${
            isDarkMode
              ? 'border-white/10 bg-[#0f172a]/70 text-gray-400 shadow-[0_18px_50px_rgba(15,23,42,0.25)] hover:border-purple-400/30 hover:text-gray-200'
              : 'border-gray-200 bg-white text-gray-400 shadow-[0_18px_50px_rgba(15,23,42,0.06)] hover:border-purple-300 hover:text-gray-600'
          }`}
          onClick={() => onModeChange("browse")}
        >
          <span className="truncate">{t("comparison.clickToSelect")}</span>
          <button
            onClick={(e) => { e.stopPropagation(); onModeChange("search") }}
            className={`p-1.5 rounded-full transition-colors ${isDarkMode ? 'text-gray-500 hover:bg-purple-500/20 hover:text-purple-300' : 'text-gray-400 hover:bg-purple-50 hover:text-purple-500'}`}
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
