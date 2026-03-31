import { useState, useRef, useEffect } from "react"

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
        className={`w-full h-9 flex items-center gap-2 px-3 rounded-lg text-sm border transition-colors ${
          isDarkMode
            ? "bg-[#0f172a] text-white border-white/10 hover:border-white/20"
            : "bg-white text-gray-900 border-gray-300 hover:border-gray-400"
        } ${open ? (isDarkMode ? "border-purple-500" : "border-purple-500") : ""}`}
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
        <div
          className={`absolute z-20 mt-1 min-w-full rounded-lg shadow-lg border overflow-y-auto max-h-60 ${
            isDarkMode
              ? "bg-[#1e293b] border-white/10"
              : "bg-white border-gray-200"
          }`}
        >
          {options.map((option) => {
            const isSelected = option.value === value
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => {
                  onChange(option.value)
                  setOpen(false)
                }}
                className={`w-full text-left px-3 py-2 text-sm transition-colors ${
                  isSelected
                    ? isDarkMode
                      ? "bg-purple-600/20 text-purple-300"
                      : "bg-purple-50 text-purple-700 font-medium"
                    : isDarkMode
                    ? "text-gray-200 hover:bg-white/5"
                    : "text-gray-800 hover:bg-gray-50"
                }`}
              >
                {option.label}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
