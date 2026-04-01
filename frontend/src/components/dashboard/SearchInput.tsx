import { useTranslation } from "react-i18next"

interface SearchInputProps {
  isDarkMode: boolean
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
}

export function SearchInput({ isDarkMode, value, onChange, placeholder, className = "" }: SearchInputProps) {
  const { t } = useTranslation()
  const resolvedPlaceholder = placeholder ?? t("searchInput.defaultPlaceholder")
  return (
    <div className={`relative ${className}`}>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={resolvedPlaceholder}
        className={`w-full px-3 py-2 pl-9 rounded-lg text-sm transition-all ${
          isDarkMode
            ? 'bg-[#0f172a]/50 text-white focus:bg-[#0f172a] placeholder-gray-500 shadow-inner focus:ring-2 focus:ring-blue-500/30'
            : 'bg-gray-50 text-gray-900 border border-gray-200 focus:border-blue-500 placeholder-gray-400 focus:ring-2 focus:ring-blue-500/20'
        } focus:outline-none`}
      />
      <svg
        className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
      </svg>
      {value && (
        <button
          onClick={() => onChange("")}
          className={`absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-md transition-colors ${
            isDarkMode ? 'hover:bg-white/10 text-gray-400' : 'hover:bg-gray-200 text-gray-500'
          }`}
        >
          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}
    </div>
  )
}
