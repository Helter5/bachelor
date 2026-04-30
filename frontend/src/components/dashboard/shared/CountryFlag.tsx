import type { CSSProperties } from "react"
import { normalizeArenaAssetUrl, normalizeCountryCodeToAlpha2 } from "./countryFlagUtils"

interface CountryFlagProps {
  code: string | null | undefined
  className?: string
  style?: CSSProperties
  imageUrl?: string | null
  /** If true, only renders for valid 2-letter ISO codes — no badge for non-standard codes */
  flagOnly?: boolean
}

/** Renders a flag for ISO2/ISO3 country codes. Non-standard codes (e.g. "UWW") show as text badge unless flagOnly=true. */
export function CountryFlag({ code, className = "", style, imageUrl, flagOnly = false }: CountryFlagProps) {
  if (!code) return null

  const alpha2Code = normalizeCountryCodeToAlpha2(code)

  if (alpha2Code) {
    return (
      <span
        className={`fi fi-${alpha2Code} inline-block ${className}`}
        style={style}
        title={code}
      />
    )
  }

  if (imageUrl) {
    return (
      <img
        src={normalizeArenaAssetUrl(imageUrl)}
        alt={code}
        className={`inline-block h-[0.9rem] w-auto rounded-sm object-cover align-[-0.125em] ${className}`}
        style={style}
        title={code}
      />
    )
  }

  if (flagOnly) return null

  return (
    <span
      className={`inline-flex items-center justify-center text-xs font-medium text-gray-600 dark:text-gray-300 ${className}`}
      title={code}
    >
      {code.trim()}
    </span>
  )
}
