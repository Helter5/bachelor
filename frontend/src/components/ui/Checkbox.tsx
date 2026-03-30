import type { ReactNode } from "react"

interface CheckboxIndicatorProps {
  checked: boolean
  isDarkMode: boolean
}

export function CheckboxIndicator({ checked, isDarkMode }: CheckboxIndicatorProps) {
  return (
    <span className={`shrink-0 w-4 h-4 rounded flex items-center justify-center transition-colors ${
      checked
        ? 'bg-blue-500'
        : isDarkMode ? 'bg-white/10 border border-gray-500' : 'bg-white border border-gray-300'
    }`}>
      {checked && (
        <svg className="w-2.5 h-2.5 text-white" viewBox="0 0 12 12" fill="none" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M2 6l3 3 5-5" />
        </svg>
      )}
    </span>
  )
}

interface CheckboxProps {
  checked: boolean
  onChange: (checked: boolean) => void
  isDarkMode: boolean
  label?: ReactNode
  className?: string
}

export function Checkbox({ checked, onChange, isDarkMode, label, className }: CheckboxProps) {
  return (
    <label className={`flex items-center gap-2 cursor-pointer select-none ${className ?? ''}`}>
      <input
        type="checkbox"
        checked={checked}
        onChange={e => onChange(e.target.checked)}
        className="sr-only"
      />
      <CheckboxIndicator checked={checked} isDarkMode={isDarkMode} />
      {label != null && <span>{label}</span>}
    </label>
  )
}
