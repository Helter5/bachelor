import { useTranslation } from "react-i18next"
import { CountryFlag } from "../../CountryFlag"
import { StatusBadge } from "../../../ui/StatusBadge"

interface AthleteCardProps {
  isDarkMode: boolean
  name: string
  isCompeting: boolean
  teamName?: string
  countryCode?: string
  weightCategoryName?: string
}

export function AthleteCard({ isDarkMode, name, isCompeting, teamName, countryCode, weightCategoryName }: AthleteCardProps) {
  const { t } = useTranslation()
  const hasTeam = teamName !== undefined
  const hasWeightCategory = weightCategoryName !== undefined

  return (
    <div
      className={`rounded-lg p-3 transition-all ${
        isDarkMode
          ? 'bg-[#0f172a]/50 hover:bg-[#1e293b] shadow-md hover:shadow-xl backdrop-blur-sm'
          : 'bg-gray-50 hover:bg-gray-100 border border-gray-200'
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <h4 className={`font-semibold text-sm truncate ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
            {name}
          </h4>
          {(hasTeam || hasWeightCategory) && (
            <div className="flex items-center gap-1 text-xs mt-0.5 flex-wrap">
              {hasTeam && (
                <div className="flex items-center gap-1">
                  <CountryFlag code={countryCode} flagOnly />
                  <span className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>
                    {teamName || t('tournamentDetail.noTeam')}
                  </span>
                </div>
              )}
              {hasTeam && hasWeightCategory && (
                <span className={isDarkMode ? 'text-gray-600' : 'text-gray-300'}>•</span>
              )}
              {hasWeightCategory && (
                <span className={`px-1.5 py-0.5 rounded text-xs ${isDarkMode ? 'bg-white/5 text-gray-300' : 'bg-gray-200 text-gray-600'}`}>
                  {weightCategoryName || t('tournamentDetail.noCategory')}
                </span>
              )}
            </div>
          )}
        </div>
        <StatusBadge variant={isCompeting ? 'success' : 'neutral'} isDarkMode={isDarkMode}>
          {isCompeting ? t('fighters.competing') : t('fighters.notCompeting')}
        </StatusBadge>
      </div>
    </div>
  )
}
