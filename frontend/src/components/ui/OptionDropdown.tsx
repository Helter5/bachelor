import type { ReactNode } from "react"
import { useTranslation } from "react-i18next"

export interface DropdownOption<T extends string | number = string> {
  value: T
  label: string
  description?: string | null
  badge?: string | number
}

interface OptionDropdownProps<T extends string | number = string> {
  options: DropdownOption<T>[]
  selectedValue?: T | null
  onSelect: (value: T) => void
  isDarkMode: boolean
  emptyText: string
  maxHeightClass?: string
  className?: string
  panelClassName?: string
  headerTitle?: string
  headerSubtitle?: string
  rightHeader?: ReactNode
}

export function OptionDropdown<T extends string | number = string>({
  options,
  selectedValue,
  onSelect,
  isDarkMode,
  emptyText,
  maxHeightClass = "max-h-64",
  className = "",
  panelClassName = "",
  headerTitle,
  headerSubtitle,
  rightHeader,
}: OptionDropdownProps<T>) {
  const { t } = useTranslation()

  return (
    <div className={className}>
      <div
        className={`overflow-hidden rounded-2xl border backdrop-blur-md shadow-[0_24px_60px_rgba(15,23,42,0.22)] ${
          isDarkMode ? "bg-[#0f172a]/95 border-white/10" : "bg-white/95 border-gray-200"
        } ${panelClassName}`}
      >
        {(headerTitle || headerSubtitle || rightHeader) && (
          <div
            className={`flex items-center justify-between gap-3 border-b px-4 py-3 ${
              isDarkMode ? "border-white/10 bg-white/5" : "border-gray-100 bg-gradient-to-r from-slate-50 to-white"
            }`}
          >
            <div className="min-w-0">
              {headerTitle && (
                <div
                  className={`text-[11px] font-semibold uppercase tracking-[0.18em] ${
                    isDarkMode ? "text-gray-400" : "text-gray-500"
                  }`}
                >
                  {headerTitle}
                </div>
              )}
              {headerSubtitle && (
                <div className={`mt-0.5 text-xs ${isDarkMode ? "text-gray-300" : "text-gray-600"}`}>
                  {headerSubtitle}
                </div>
              )}
            </div>
            {rightHeader}
          </div>
        )}

        <div
          className={`${maxHeightClass} overflow-y-auto p-2`}
          style={{
            scrollbarWidth: "thin",
            scrollbarColor: isDarkMode
              ? "rgba(148, 163, 184, 0.55) transparent"
              : "rgba(100, 116, 139, 0.45) transparent",
          }}
        >
          {options.length === 0 ? (
            <div className={`px-3 py-6 text-center text-sm ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}>
              {emptyText}
            </div>
          ) : (
            <div className="space-y-1">
              {options.map((option) => {
                const isSelected = selectedValue === option.value

                return (
                  <button
                    key={option.value}
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => onSelect(option.value)}
                    className={`flex w-full items-center justify-between gap-3 rounded-xl px-3 py-3 text-left text-sm transition-all duration-150 ${
                      isSelected
                        ? isDarkMode
                          ? "bg-sky-500/15 text-sky-100 ring-1 ring-inset ring-sky-400/20"
                          : "bg-sky-50 text-sky-800 ring-1 ring-inset ring-sky-200"
                        : isDarkMode
                          ? "text-gray-200 hover:bg-white/5"
                          : "text-gray-800 hover:bg-gray-50"
                    }`}
                  >
                    <span className="min-w-0">
                      <span className="block truncate font-medium">{option.label}</span>
                      {option.description && (
                        <span className={`mt-0.5 block text-xs ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}>
                          {option.description}
                        </span>
                      )}
                    </span>
                    {(option.badge !== undefined || isSelected) && (
                      <span
                        className={`shrink-0 rounded-full px-2 py-1 text-[11px] font-semibold ${
                          isSelected
                            ? isDarkMode
                              ? "bg-sky-400/15 text-sky-200"
                              : "bg-sky-100 text-sky-700"
                            : isDarkMode
                              ? "bg-white/5 text-gray-300"
                              : "bg-gray-100 text-gray-500"
                        }`}
                      >
                        {option.badge ?? t("common.selected")}
                      </span>
                    )}
                  </button>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
