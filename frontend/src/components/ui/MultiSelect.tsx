import { useState, useRef, useEffect, type ReactNode } from "react"
import { useTranslation } from "react-i18next"
import { CheckboxIndicator } from "./Checkbox"

export interface MultiSelectOption {
  value: string
  label: string
  icon?: ReactNode
}

interface MultiSelectProps {
  options: MultiSelectOption[]
  selected: Set<string>
  onToggle: (value: string) => void
  onClear: () => void
  placeholder: string
  isDarkMode: boolean
  buttonIcon?: ReactNode
}

export function MultiSelect({
  options,
  selected,
  onToggle,
  onClear,
  placeholder,
  isDarkMode,
  buttonIcon,
}: MultiSelectProps) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    if (open) document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [open])

  const isActive = selected.size > 0
  const selectedCount = selected.size

  const buttonLabel = () => {
    if (!isActive) return placeholder
    if (selected.size === 1) {
      const val = Array.from(selected)[0]
      return options.find(o => o.value === val)?.label ?? val
    }
    return `${selected.size} ${t("common.selected").toLowerCase()}`
  }

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className={`group flex items-center gap-2 px-3 py-2 rounded-xl border text-sm whitespace-nowrap transition-all duration-200 shadow-sm ${
          isActive
            ? isDarkMode
              ? 'bg-blue-900/35 border-blue-500/70 text-blue-200 shadow-blue-950/20'
              : 'bg-blue-50 border-blue-400 text-blue-700 shadow-blue-100/70'
            : isDarkMode
              ? 'bg-[#0f172a] border-white/10 text-gray-300 hover:border-white/20 hover:bg-white/5'
              : 'bg-white border-gray-300 text-gray-600 hover:border-gray-400 hover:shadow-md'
        }`}
      >
        {buttonIcon && <span className="shrink-0 flex items-center">{buttonIcon}</span>}
        <span className="min-w-0 truncate max-w-[220px]">{buttonLabel()}</span>
        {selectedCount > 1 && (
          <span className={`ml-0.5 inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold ${
            isDarkMode ? 'bg-white/10 text-blue-200' : 'bg-blue-100 text-blue-700'
          }`}>
            {selectedCount}
          </span>
        )}
        {isActive ? (
          <span
            onClick={e => { e.stopPropagation(); onClear() }}
            className={`ml-0.5 inline-flex h-5 w-5 items-center justify-center rounded-full text-base leading-none transition-opacity hover:opacity-80 ${
              isDarkMode ? 'bg-white/5 text-gray-200' : 'bg-white text-gray-500 shadow-sm'
            }`}
            title="Zrušiť filter"
          >
            ×
          </span>
        ) : (
          <svg className={`w-3.5 h-3.5 shrink-0 transition-transform duration-200 ${open ? 'rotate-180' : 'group-hover:translate-y-px'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        )}
      </button>

      {open && options.length > 0 && (
        <div className={`absolute z-30 top-full mt-2 left-0 min-w-[260px] overflow-hidden rounded-2xl border shadow-2xl backdrop-blur-md ${
          isDarkMode ? 'bg-[#0f172a]/95 border-white/10' : 'bg-white/95 border-gray-200'
        }`}>
          <div className={`flex items-center justify-between gap-3 px-3 py-2 border-b ${
            isDarkMode ? 'border-white/10 bg-white/5' : 'border-gray-100 bg-gradient-to-r from-gray-50 to-white'
          }`}>
            <div className="min-w-0">
              <div className={`text-[11px] font-semibold uppercase tracking-[0.18em] ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                Výber
              </div>
              <div className={`text-xs mt-0.5 ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                {selectedCount > 0 ? `${selectedCount} zvolených` : 'Klikni a vyber viac možností'}
              </div>
            </div>
            <span className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold ${
              isDarkMode ? 'bg-white/10 text-gray-200' : 'bg-gray-100 text-gray-600'
            }`}>
              {options.length} položiek
            </span>
          </div>

          <div
            className="max-h-72 overflow-y-auto p-2"
            style={{
              scrollbarWidth: 'thin',
              scrollbarColor: isDarkMode ? 'rgba(148, 163, 184, 0.5) transparent' : 'rgba(100, 116, 139, 0.45) transparent',
            }}
          >
            <div className="space-y-1">
              {options.map(option => {
                const isSelected = selected.has(option.value)

                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => onToggle(option.value)}
                    className={`flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-left text-sm transition-all duration-150 ${
                      isSelected
                        ? isDarkMode
                          ? 'bg-blue-500/15 text-blue-100 ring-1 ring-inset ring-blue-400/20'
                          : 'bg-blue-50 text-blue-800 ring-1 ring-inset ring-blue-200'
                        : isDarkMode
                          ? 'text-gray-200 hover:bg-white/5 hover:translate-x-0.5'
                          : 'text-gray-700 hover:bg-gray-50 hover:translate-x-0.5'
                    }`}
                  >
                    <span className="flex min-w-0 items-center gap-2.5">
                      <CheckboxIndicator checked={isSelected} isDarkMode={isDarkMode} />
                      {option.icon}
                      <span className="truncate">{option.label}</span>
                    </span>

                    {isSelected && (
                      <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                        isDarkMode ? 'bg-blue-400/15 text-blue-200' : 'bg-blue-100 text-blue-700'
                      }`}>
                        {t("common.selected")}
                      </span>
                    )}
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
