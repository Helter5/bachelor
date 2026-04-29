import type { ReactNode } from "react"
import { CountryFlag, normalizeCountryCodeToAlpha2 } from "../shared/CountryFlag"
import { StatusBadge } from "../../ui/StatusBadge"

export interface Badge {
  label: string
  variant?: 'success' | 'neutral' | 'warning' | 'info' | 'danger' | 'error'
}

interface CardProps {
  isDarkMode: boolean
  name: string
  countryCode?: string
  countryFlagUrl?: string
  showCountryText?: boolean
  badges?: Badge[]
  metadata?: ReactNode
  statusBadge?: {
    label: string
    variant?: 'success' | 'neutral' | 'warning' | 'info' | 'danger' | 'error'
  }
  onClick?: () => void
}

function normalizeBadgeVariant(variant?: 'success' | 'neutral' | 'warning' | 'info' | 'danger' | 'error') {
  return variant === 'error' ? 'danger' : (variant ?? 'neutral')
}

export function Card({
  isDarkMode,
  name,
  countryCode,
  countryFlagUrl,
  showCountryText = true,
  badges,
  metadata,
  statusBadge,
  onClick,
}: CardProps) {
  const isClickable = !!onClick
  const displayCountryCode = normalizeCountryCodeToAlpha2(countryCode)?.toUpperCase() ?? countryCode

  return (
    <div
      onClick={onClick}
      className={`rounded-lg p-3 transition-all ${isClickable ? 'cursor-pointer' : ''} ${
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

          {(countryCode || metadata) && (
            <div className="flex items-center gap-1 text-xs mt-0.5 flex-wrap">
              {countryCode && (
                <div className="flex items-center gap-1">
                  <CountryFlag code={countryCode} imageUrl={countryFlagUrl} flagOnly />
                  {showCountryText && (
                    <span className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>
                      {displayCountryCode}
                    </span>
                  )}
                </div>
              )}
              {metadata && metadata}
            </div>
          )}

          {badges && badges.length > 0 && (
            <div className="flex items-center gap-1.5 mt-2 flex-wrap">
              {badges.map((badge, idx) => (
                <StatusBadge
                  key={idx}
                  variant={normalizeBadgeVariant(badge.variant)}
                  isDarkMode={isDarkMode}
                >
                  {badge.label}
                </StatusBadge>
              ))}
            </div>
          )}
        </div>

        {statusBadge && (
          <StatusBadge variant={normalizeBadgeVariant(statusBadge.variant)} isDarkMode={isDarkMode}>
            {statusBadge.label}
          </StatusBadge>
        )}
      </div>
    </div>
  )
}
