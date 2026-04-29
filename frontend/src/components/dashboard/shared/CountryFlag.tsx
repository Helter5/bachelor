import type { CSSProperties } from "react"
import { alpha3ToAlpha2, isValid } from "i18n-iso-countries"

interface CountryFlagProps {
  code: string | null | undefined
  className?: string
  style?: CSSProperties
  imageUrl?: string | null
  /** If true, only renders for valid 2-letter ISO codes — no badge for non-standard codes */
  flagOnly?: boolean
}

function normalizeArenaAssetUrl(url: string): string {
  return url.replace("http://host.docker.internal:8080", "http://localhost:8080")
}

export function buildArenaFlagUrl(code: string | null | undefined): string | null {
  const trimmed = code?.trim().toLowerCase()
  if (!trimmed) return null
  if (trimmed.length !== 3) return null
  return `http://localhost:8080/build/images/flags/4x3/${trimmed}.svg`
}

export function normalizeCountryCodeToAlpha2(code: string | null | undefined): string | null {
  const trimmed = code?.trim().toUpperCase()
  if (!trimmed) return null

  if (trimmed.length === 2 && isValid(trimmed)) {
    return trimmed.toLowerCase()
  }

  if (trimmed.length === 3) {
    return alpha3ToAlpha2(trimmed)?.toLowerCase() ?? null
  }

  return null
}

/** Renders a flag for ISO2/ISO3 country codes. Non-standard codes (e.g. "UWW") show as text badge unless flagOnly=true. */
export function CountryFlag({ code, className = "", style, imageUrl, flagOnly = false }: CountryFlagProps) {
  if (!code) return null

  const alpha2Code = normalizeCountryCodeToAlpha2(code)

  if (alpha2Code) {
    return (
      <span
        className={`fi fi-${alpha2Code} fis rounded-sm ${className}`}
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
