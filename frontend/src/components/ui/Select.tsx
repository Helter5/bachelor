import { useState, useRef, useEffect } from "react"
import { useTranslation } from "react-i18next"
import { OptionDropdown } from "./OptionDropdown"

export interface SelectOption<T extends string | number = string> {
  value: T
  label: string
}

interface SelectProps<T extends string | number = string> {
  value: T
  onChange: (value: T) => void
  options: SelectOption<T>[]
  isDarkMode: boolean
  placeholder?: string
  className?: string
}

export function Select<T extends string | number = string>({
  value,
  onChange,
  options,
  isDarkMode,
  placeholder,
  className = "",
}: SelectProps<T>) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const selected = options.find((o) => o.value === value)

  return (
    <div ref={ref} className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={`w-full h-10 flex items-center justify-between gap-2 px-3 rounded-xl text-sm border transition-colors ${
          isDarkMode
            ? "bg-[#0f172a]/85 text-white border-white/10 hover:border-sky-400/35"
            : "bg-white text-gray-900 border-gray-300 hover:border-sky-300"
        } ${open ? (isDarkMode ? "border-sky-400/50" : "border-sky-400") : ""}`}
      >
        <span className="truncate max-w-[160px]">
          {selected ? selected.label : placeholder ?? "—"}
        </span>
        <svg
          className={`w-3.5 h-3.5 flex-shrink-0 transition-transform ${open ? "rotate-180" : ""} ${
            isDarkMode ? "text-gray-400" : "text-gray-500"
          }`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <OptionDropdown
          options={options.map((option) => ({ value: option.value, label: option.label }))}
          selectedValue={value}
          onSelect={(selectedValue) => {
            onChange(selectedValue)
            setOpen(false)
          }}
          isDarkMode={isDarkMode}
          emptyText={placeholder ?? "No options"}
          maxHeightClass="max-h-60"
          className="absolute z-20 mt-2 min-w-full"
          headerTitle={t("common.select")}
          headerSubtitle={t("common.chooseOneOption")}
          rightHeader={
            <span
              className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                isDarkMode ? "bg-white/10 text-gray-200" : "bg-gray-100 text-gray-600"
              }`}
            >
              {options.length}
            </span>
          }
        />
      )}
    </div>
  )
}
