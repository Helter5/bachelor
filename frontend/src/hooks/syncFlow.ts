import { apiClient, ApiError } from '@/services/apiClient'
import { API_ENDPOINTS, LOCAL_SYNC_AGENT_URL } from '@/config/api'

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

interface LocalSyncStartResponse {
  sync_log_id: number
  upload_token: string
  arena_source: {
    host: string
    port: number
    client_id: string
    client_secret: string
    api_key: string
  }
}

interface RunSyncOptions {
  onStarted?: (syncLogId: number) => void
}

export const MAX_RETRY_ATTEMPTS = 5
export const RETRY_DELAY_MS = 1000

export function shouldUseLocalAgentSync() {
  return (
    import.meta.env.VITE_SYNC_MODE === 'local-agent' ||
    import.meta.env.PROD ||
    window.location.protocol === 'https:'
  )
}

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

export async function runLocalAgentSync({ onStarted }: RunSyncOptions = {}) {
  const localSync = await apiClient.post<LocalSyncStartResponse>(API_ENDPOINTS.LOCAL_SYNC_START, {})
  onStarted?.(localSync.sync_log_id)

  const response = await fetch(`${LOCAL_SYNC_AGENT_URL}/sync`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      server_url: window.location.origin,
      upload_token: localSync.upload_token,
      arena_source: localSync.arena_source,
    }),
    targetAddressSpace: 'loopback',
  } as RequestInit & { targetAddressSpace?: 'loopback' })

  if (!response.ok) {
    const text = await response.text().catch(() => '')
    throw new Error(text || `Local sync agent failed: ${response.status} ${response.statusText}`)
  }

  return { syncLogId: localSync.sync_log_id }
}

export async function runBrowserSync({ onStarted }: RunSyncOptions = {}) {
  const totalSteps = 6
  let completedSteps = 0

  const eventsSyncResult = await retryWithBackoff(
    () => apiClient.post<SyncResult>(
      API_ENDPOINTS.SPORT_EVENT_SYNC,
      undefined,
      { headers: { 'X-Sync-Orchestrated': 'true' } }
    ),
    'Syncing sport events'
  )

  const syncLogId = eventsSyncResult.sync_log_id ?? null
  if (syncLogId) {
    onStarted?.(syncLogId)

    completedSteps += 1
    await apiClient.patch(API_ENDPOINTS.SYNC_LOG_UPDATE_STATS(syncLogId), {
      status: 'in_progress',
      details: {
        progress_percent: stepToProgress(completedSteps, totalSteps),
        current_step: 'events',
      },
    })
  }

  const dbEventsData = await retryWithBackoff(
    () => apiClient.get<{ items: DatabaseEventSummary[]; total: number }>(
      API_ENDPOINTS.SPORT_EVENT_DATABASE
    ),
    'Fetching events from database'
  )
  const dbEvents = dbEventsData.items || []
  const syncHeaders = syncLogId ? { headers: { 'X-Sync-Log-Id': String(syncLogId) } } : undefined

  const stages = [
    {
      counterPrefix: 'teams',
      endpointForEvent: API_ENDPOINTS.TEAM_SYNC,
      contextLabel: (eventName: string) => `Syncing teams for event ${eventName}`,
      currentStep: 'teams',
    },
    {
      counterPrefix: 'weight_categories',
      endpointForEvent: API_ENDPOINTS.WEIGHT_CATEGORY_SYNC,
      contextLabel: (eventName: string) => `Syncing weight categories for event ${eventName}`,
      currentStep: 'categories',
    },
    {
      counterPrefix: 'athletes',
      endpointForEvent: API_ENDPOINTS.ATHLETE_SYNC,
      contextLabel: (eventName: string) => `Syncing athletes for event ${eventName}`,
      currentStep: 'athletes',
    },
    {
      counterPrefix: 'referees',
      endpointForEvent: API_ENDPOINTS.REFEREE_SYNC,
      contextLabel: (eventName: string) => `Syncing referees for event ${eventName}`,
      currentStep: 'referees',
    },
    {
      counterPrefix: 'fights',
      endpointForEvent: API_ENDPOINTS.FIGHT_SYNC,
      contextLabel: (eventName: string) => `Syncing fights for event ${eventName}`,
      currentStep: 'fights',
    },
  ] as const

  const totals: Record<string, number> = {}

  for (const stage of stages) {
    const result = await runSyncStage({
      dbEvents,
      endpointForEvent: stage.endpointForEvent,
      contextLabel: stage.contextLabel,
      syncLogId,
      syncHeaders,
      completedSteps,
      totalSteps,
      currentStep: stage.currentStep,
    })
    completedSteps = result.completedSteps
    totals[`${stage.counterPrefix}_created`] = result.created
    totals[`${stage.counterPrefix}_updated`] = result.updated
  }

  if (syncLogId) {
    try {
      await apiClient.patch(
        API_ENDPOINTS.SYNC_LOG_UPDATE_STATS(syncLogId),
        {
          ...totals,
          status: 'success',
          details: {
            progress_percent: 100,
            current_step: 'completed',
          },
        }
      )
    } catch (error) {
      console.warn('Could not update sync log stats:', error)
    }
  }

  return { syncLogId }
}
