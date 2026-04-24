import { apiClient, ApiError } from '@/services/apiClient'
import { API_ENDPOINTS } from '@/config/api'

export interface SyncResult {
  count: number
  created: number
  updated: number
  message?: string
  sync_log_id?: number
}

export interface SyncLogSummary {
  id: number
  status: string
  started_at: string
  finished_at?: string | null
  details?: { progress_percent?: number; current_step?: string; initiated_by?: string }
  user_full_name?: string | null
}

export interface DatabaseEventSummary {
  id: number
  uuid: string
  name: string
}

export const MAX_RETRY_ATTEMPTS = 5
export const RETRY_DELAY_MS = 1000

export function stepToProgress(step: number, totalSteps: number) {
  if (totalSteps <= 0) return 0
  return Math.round((step / totalSteps) * 100)
}

export function isSyncLogEffectivelyActive(log: SyncLogSummary) {
  if (log.status !== 'in_progress') return false

  const progress = Number(log.details?.progress_percent ?? 0)
  const step = (log.details?.current_step ?? '').trim().toLowerCase()

  if (progress >= 100 || step === 'completed' || step === 'failed') {
    return false
  }

  const startedAtMs = Date.parse(log.started_at)
  if (!Number.isNaN(startedAtMs)) {
    const twelveHoursMs = 12 * 60 * 60 * 1000
    if (Date.now() - startedAtMs > twelveHoursMs) {
      return false
    }
  }

  return true
}

export function formatSyncTimestamp(now = new Date()) {
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`
}

export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  context: string,
  maxAttempts = MAX_RETRY_ATTEMPTS
): Promise<T> {
  let lastError: unknown

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn()
    } catch (error) {
      lastError = error

      if (error instanceof ApiError && error.status === 409) {
        throw error
      }

      if (attempt === maxAttempts) {
        console.error(`${context} failed after ${maxAttempts} attempts:`, error)
        throw error
      }

      console.warn(`${context} failed (attempt ${attempt}/${maxAttempts}), retrying...`)
      await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_MS * attempt))
    }
  }

  throw lastError
}

interface RunSyncStageOptions {
  dbEvents: DatabaseEventSummary[]
  endpointForEvent: (eventId: number) => string
  contextLabel: (eventName: string) => string
  syncLogId?: number | null
  syncHeaders?: { headers: Record<string, string> }
  completedSteps: number
  totalSteps: number
  currentStep: string
}

export async function runSyncStage({
  dbEvents,
  endpointForEvent,
  contextLabel,
  syncLogId,
  syncHeaders,
  completedSteps,
  totalSteps,
  currentStep,
}: RunSyncStageOptions) {
  const results = await Promise.all(
    dbEvents.map((event) =>
      retryWithBackoff(
        () => apiClient.post<SyncResult>(endpointForEvent(event.id), undefined, syncHeaders),
        contextLabel(event.name)
      )
    )
  )

  const nextCompletedSteps = completedSteps + 1

  if (syncLogId) {
    await apiClient.patch(API_ENDPOINTS.SYNC_LOG_UPDATE_STATS(syncLogId), {
      status: 'in_progress',
      details: {
        progress_percent: stepToProgress(nextCompletedSteps, totalSteps),
        current_step: currentStep,
      },
    })
  }

  return {
    results,
    completedSteps: nextCompletedSteps,
    created: results.reduce((sum, result) => sum + (result.created || 0), 0),
    updated: results.reduce((sum, result) => sum + (result.updated || 0), 0),
  }
}
