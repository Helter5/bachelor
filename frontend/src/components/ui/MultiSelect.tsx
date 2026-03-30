import { useState, useRef, useEffect, type ReactNode } from "react"
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

  const buttonLabel = () => {
    if (!isActive) return placeholder
    if (selected.size === 1) {
      const val = Array.from(selected)[0]
      return options.find(o => o.value === val)?.label ?? val
    }
    return `${selected.size} vybrané`
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(o => !o)}
        className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm whitespace-nowrap transition-colors ${
          isActive
            ? isDarkMode
              ? 'bg-blue-900/30 border-blue-500 text-blue-300'
              : 'bg-blue-50 border-blue-400 text-blue-700'
            : isDarkMode
              ? 'bg-[#1e293b] border-gray-600 text-gray-300 hover:border-gray-400'
              : 'bg-white border-gray-300 text-gray-600 hover:border-gray-400'
        }`}
      >
        {buttonIcon && <span className="shrink-0 flex items-center">{buttonIcon}</span>}
        <span>{buttonLabel()}</span>
        {isActive ? (
          <span
            onClick={e => { e.stopPropagation(); onClear() }}
            className="ml-0.5 hover:opacity-70"
            title="Zrušiť filter"
          >
            ×
          </span>
        ) : (
          <svg className={`w-3.5 h-3.5 transition-transform ${open ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        )}
      </button>

      {open && options.length > 0 && (
        <div className={`absolute z-20 top-full mt-1 left-0 min-w-[200px] max-h-64 overflow-y-auto rounded-lg shadow-xl border ${
          isDarkMode ? 'bg-[#1e293b] border-gray-600' : 'bg-white border-gray-200'
        }`}>
          {options.map(option => (
            <div
              key={option.value}
              onClick={() => onToggle(option.value)}
              className={`flex items-center gap-2.5 px-3 py-2 cursor-pointer text-sm transition-colors ${
                isDarkMode ? 'hover:bg-white/5 text-gray-200' : 'hover:bg-gray-50 text-gray-700'
              }`}
            >
              <CheckboxIndicator checked={selected.has(option.value)} isDarkMode={isDarkMode} />
              {option.icon}
              <span>{option.label}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
