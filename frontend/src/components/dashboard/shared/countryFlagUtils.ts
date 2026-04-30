import { alpha3ToAlpha2, isValid } from "i18n-iso-countries"

export function normalizeArenaAssetUrl(url: string): string {
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

