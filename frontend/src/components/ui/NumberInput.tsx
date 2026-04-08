interface NumberInputProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  label?: string
  min?: number
  max?: number
  isDarkMode: boolean
}

export function NumberInput({
  value,
  onChange,
  placeholder = "0",
  label,
  min = 0,
  max,
  isDarkMode,
}: NumberInputProps) {
  const numValue = value ? parseInt(value) : 0

  const increment = () => {
    const newValue = numValue + 1
    if (!max || newValue <= max) {
      onChange(newValue.toString())
    }
  }

  const decrement = () => {
    const newValue = Math.max(numValue - 1, min || 0)
    onChange(newValue.toString())
  }

  return (
    <div>
      {label && (
        <label className={`block text-xs font-medium mb-1.5 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
          {label}
        </label>
      )}
      <div className={`relative inline-flex items-center w-32 rounded-lg border ${
        isDarkMode
          ? 'bg-[#0f172a] border-gray-600'
          : 'bg-white border-gray-300'
      }`}>
        <input
          type="number"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          min={min}
          max={max}
          className={`w-full px-2 py-2 text-center text-sm bg-transparent focus:outline-none ${
            isDarkMode ? 'text-white placeholder-gray-500' : 'text-gray-900 placeholder-gray-400'
          } [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none [-moz-appearance:textfield]`}
        />
        <div className="flex items-center gap-0.5 pr-1">
          <button
            onClick={decrement}
            disabled={numValue <= (min || 0)}
            className={`p-0.5 rounded transition-colors ${
              numValue <= (min || 0)
                ? isDarkMode ? 'text-gray-700 cursor-not-allowed' : 'text-gray-200 cursor-not-allowed'
                : isDarkMode ? 'text-gray-400 hover:bg-white/10' : 'text-gray-400 hover:bg-gray-100'
            }`}
          >
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M20 12H4" />
            </svg>
          </button>
          <button
            onClick={increment}
            disabled={max !== undefined && numValue >= max}
            className={`p-0.5 rounded transition-colors ${
              max !== undefined && numValue >= max
                ? isDarkMode ? 'text-gray-700 cursor-not-allowed' : 'text-gray-200 cursor-not-allowed'
                : isDarkMode ? 'text-gray-400 hover:bg-white/10' : 'text-gray-400 hover:bg-gray-100'
            }`}
          >
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  )
}

