import i18n from '@/i18n'

const DATE_FORMAT_OPTIONS: Intl.DateTimeFormatOptions = {
  year: 'numeric',
  month: 'long',
  day: 'numeric'
}

function resolveLocale(language?: string): string {
  const lang = language || i18n.resolvedLanguage || i18n.language || 'sk'
  if (lang.startsWith('en')) return 'en-US'
  if (lang.startsWith('sk')) return 'sk-SK'
  return lang
}

export function formatDate(dateString: string, language?: string): string {
  const date = new Date(dateString)
  if (Number.isNaN(date.getTime())) return dateString
  return date.toLocaleDateString(resolveLocale(language), DATE_FORMAT_OPTIONS)
}
