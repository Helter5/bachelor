import { useTranslation } from "react-i18next"

interface AthleteCardProps {
  fullName: string
  countryCode: string | null
  fightCount: number
  tournamentCount: number
  isDarkMode: boolean
  onClick: () => void
}

function pluralLabel(count: number, one: string, few: string, many: string) {
  if (count === 1) return one
  if (count >= 2 && count <= 4) return few
  return many
}

export function AthleteCard({
  fullName,
  countryCode,
  fightCount,
  tournamentCount,
  isDarkMode,
  onClick,
}: AthleteCardProps) {
  const { t } = useTranslation()
  const fightLabel = pluralLabel(
    fightCount,
    t('athletes.fightCount_one'),
    t('athletes.fightCount_few'),
    t('athletes.fightCount_many'),
  )
  const tournamentLabel = pluralLabel(
    tournamentCount,
    t('athletes.tournamentCount_one'),
    t('athletes.tournamentCount_few'),
    t('athletes.tournamentCount_many'),
  )

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
        <div className={`mt-2 flex items-center gap-3 text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
          <span title={`${tournamentCount} ${tournamentLabel}`} aria-label={`${tournamentCount} ${tournamentLabel}`}>
            <span className={`font-semibold ${isDarkMode ? 'text-gray-200' : 'text-gray-700'}`}>{tournamentCount}</span> {tournamentLabel}
          </span>
          <span title={`${fightCount} ${fightLabel}`} aria-label={`${fightCount} ${fightLabel}`}>
            <span className={`font-semibold ${isDarkMode ? 'text-gray-200' : 'text-gray-700'}`}>{fightCount}</span> {fightLabel}
          </span>
        </div>
      </div>
    </div>
  )
}
