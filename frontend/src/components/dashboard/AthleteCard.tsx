import { useTranslation } from "react-i18next"

interface AthleteCardProps {
  fullName: string
  countryCode: string | null
  fightCount: number
  isDarkMode: boolean
  onClick: () => void
}

export function AthleteCard({
  fullName,
  countryCode,
  fightCount,
  isDarkMode,
  onClick,
}: AthleteCardProps) {
  const { t } = useTranslation()

  return (
    <div
      onClick={onClick}
      className={`rounded-lg transition-all hover:scale-[1.02] cursor-pointer overflow-hidden ${
        isDarkMode
          ? 'bg-[#0f172a] hover:bg-[#1e3a5f] shadow-lg hover:shadow-2xl'
          : 'bg-white hover:shadow-xl border border-gray-200 shadow-sm'
      }`}
    >
      {/* Flag area */}
      <div className={`flex items-center justify-center py-5 ${isDarkMode ? 'bg-white/5' : 'bg-gray-50'}`}>
        {countryCode?.trim().length === 2 ? (
          <span
            className={`fi fi-${countryCode.toLowerCase()} fis rounded`}
            style={{ fontSize: '3rem' }}
            title={countryCode}
          />
        ) : (
          <svg className={`w-12 h-12 ${isDarkMode ? 'text-gray-600' : 'text-gray-300'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 016 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
        )}
      </div>
      {/* Info */}
      <div className="px-3 py-2">
        <p className={`text-sm font-semibold leading-tight line-clamp-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
          {fullName}
        </p>
        <p className={`mt-1 text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
          {fightCount} {fightCount === 1 ? t('athletes.fightCount_one') : fightCount >= 2 && fightCount <= 4 ? t('athletes.fightCount_few') : t('athletes.fightCount_many')}
        </p>
      </div>
    </div>
  )
}
