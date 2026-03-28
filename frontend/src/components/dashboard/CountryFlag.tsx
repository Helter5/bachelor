interface CountryFlagProps {
  code: string | null | undefined
  className?: string
  style?: React.CSSProperties
  /** If true, only renders for valid 2-letter ISO codes — no badge for non-standard codes */
  flagOnly?: boolean
}

/** Renders a flag for valid 2-letter ISO codes. Non-standard codes (e.g. "UWW") show as text badge unless flagOnly=true. */
export function CountryFlag({ code, className = "", style, flagOnly = false }: CountryFlagProps) {
  if (!code) return null

  if (code.trim().length === 2) {
    return (
      <span
        className={`fi fi-${code.trim().toLowerCase()} fis rounded-sm ${className}`}
        style={style}
        title={code}
      />
    )
  }

  if (flagOnly) return null

  return (
    <span
      className={`inline-flex items-center justify-center rounded px-1 text-xs font-semibold bg-gray-200 text-gray-600 dark:bg-gray-700 dark:text-gray-300 ${className}`}
      title={code}
    >
      {code.trim()}
    </span>
  )
}
