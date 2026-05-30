import type { TFunction } from 'i18next'
import { ApiError } from './apiClient'

/**
 * Resolve a human-readable error message from any thrown value.
 *
 * Lookup order:
 *   1. ApiError with `code` → i18n key `apiErrors.<code>` (if present)
 *   2. ApiError.message (server-provided fallback message)
 *   3. TypeError → network error key
 *   4. Generic Error.message
 *   5. `fallbackKey` or generic key
 */
export function translateApiError(
  err: unknown,
  t: TFunction,
  fallbackKey: string = 'apiErrors.generic',
): string {
  if (err instanceof ApiError) {
    if (err.code) {
      const key = `apiErrors.${err.code}`
      const translated = t(key)
      if (translated !== key) return translated
    }
    if (err.message?.trim()) return err.message
  }
  if (err instanceof TypeError) return t('apiErrors.network')
  if (err instanceof Error && err.message?.trim()) return err.message
  return t(fallbackKey)
}
