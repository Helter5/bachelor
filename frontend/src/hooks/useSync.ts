import { useState, useCallback, useRef, useEffect } from 'react'
import { apiClient } from '@/services/apiClient'
import { API_ENDPOINTS } from '@/config/api'

interface SyncState {
  isSyncing: boolean
  showSuccess: boolean
  showConfirm: boolean
  showError: boolean
  errorMessage: string
  lastSyncDate: string
  activeSyncLogId: number | null
  progressPercent: number
  currentStep: string
  initiatedBy: string
}

interface SyncResult {
  count: number
  created: number
  updated: number
  message?: string
  sync_log_id?: number
}

interface SyncLogSummary {
  id: number
  status: string
  started_at: string
  finished_at?: string | null
  details?: { progress_percent?: number; current_step?: string; initiated_by?: string }
  user_full_name?: string | null
}

const MAX_RETRY_ATTEMPTS = 5
const RETRY_DELAY_MS = 1000

export function useSync() {
  const [syncState, setSyncState] = useState<SyncState>(() => {
    const savedSyncDate = localStorage.getItem('lastSyncDate')
    return {
      isSyncing: false,
      showSuccess: false,
      showConfirm: false,
      showError: false,
      errorMessage: '',
      lastSyncDate: savedSyncDate || "",
      activeSyncLogId: null,
      progressPercent: 0,
      currentStep: '',
      initiatedBy: '',
    }
  })

  const syncTimeoutRef = useRef<number | undefined>(undefined)
  const successTimeoutRef = useRef<number | undefined>(undefined)
  const progressIntervalRef = useRef<number | undefined>(undefined)

  const clearTimers = useCallback(() => {
    if (syncTimeoutRef.current !== undefined) {
      clearTimeout(syncTimeoutRef.current)
      syncTimeoutRef.current = undefined
    }
    if (successTimeoutRef.current !== undefined) {
      clearTimeout(successTimeoutRef.current)
      successTimeoutRef.current = undefined
    }
    if (progressIntervalRef.current !== undefined) {
      clearInterval(progressIntervalRef.current)
      progressIntervalRef.current = undefined
    }
  }, [])

  useEffect(() => {
    return clearTimers
  }, [clearTimers])

  const handleSyncClick = useCallback(() => {
    setSyncState(prev => ({ ...prev, showConfirm: true }))
  }, [])

  const cancelSync = useCallback(() => {
    setSyncState(prev => ({ ...prev, showConfirm: false }))
  }, [])

  const dismissError = useCallback(() => {
    setSyncState(prev => ({ ...prev, showError: false, errorMessage: '' }))
  }, [])

  const stepToProgress = (step: number, totalSteps: number) => {
    if (totalSteps <= 0) return 0
    return Math.round((step / totalSteps) * 100)
  }

  const isSyncLogEffectivelyActive = useCallback((log: SyncLogSummary) => {
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
  }, [])

  const startProgressPolling = useCallback((logId: number) => {
    if (progressIntervalRef.current !== undefined) {
      clearInterval(progressIntervalRef.current)
      progressIntervalRef.current = undefined
    }

    progressIntervalRef.current = window.setInterval(async () => {
      try {
        const log = await apiClient.get<SyncLogSummary>(API_ENDPOINTS.SYNC_LOG_DETAIL(logId))

        const progress = Number(log.details?.progress_percent ?? 0)
        const step = log.details?.current_step ?? ''
        const initiator = (log.details?.initiated_by ?? log.user_full_name ?? '').trim()
        const isActive = isSyncLogEffectivelyActive(log)

        setSyncState(prev => ({
          ...prev,
          activeSyncLogId: isActive ? log.id : null,
          isSyncing: isActive,
          progressPercent: isActive ? progress : 0,
          currentStep: isActive ? step : '',
          initiatedBy: isActive ? initiator : '',
        }))

        if (!isActive && progressIntervalRef.current !== undefined) {
          clearInterval(progressIntervalRef.current)
          progressIntervalRef.current = undefined
        }
      } catch {
        // Keep UI state as-is; next poll will retry.
      }
    }, 2500)
  }, [isSyncLogEffectivelyActive])

  const retryWithBackoff = async <T,>(
    fn: () => Promise<T>,
    context: string,
    maxAttempts = MAX_RETRY_ATTEMPTS
  ): Promise<T> => {
    let lastError: unknown

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        return await fn()
      } catch (error) {
        lastError = error

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

  const triggerSync = useCallback(async () => {
    setSyncState(prev => ({
      ...prev,
      isSyncing: true,
      showError: false,
      errorMessage: '',
      progressPercent: 0,
      currentStep: 'events',
      initiatedBy: prev.initiatedBy,
    }))

    try {
      const totalSteps = 6
      let completedSteps = 0

      const eventsSyncResult = await retryWithBackoff(
        () => apiClient.post<SyncResult>(API_ENDPOINTS.SPORT_EVENT_SYNC),
        'Syncing sport events'
      )

      const syncLogId = eventsSyncResult.sync_log_id

      if (syncLogId) {
        setSyncState(prev => ({ ...prev, activeSyncLogId: syncLogId }))
        startProgressPolling(syncLogId)

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
        () => apiClient.get<{ items: Array<{ id: number; uuid: string; name: string }>; total: number }>(
          API_ENDPOINTS.SPORT_EVENT_DATABASE
        ),
        'Fetching events from database'
      )
      const dbEvents = dbEventsData.items || []

      let teamsCreated = 0, teamsUpdated = 0
      let categoriesCreated = 0, categoriesUpdated = 0
      let athletesCreated = 0, athletesUpdated = 0
      let refereesCreated = 0, refereesUpdated = 0
      let fightsCreated = 0, fightsUpdated = 0

      const teamResults = await Promise.all(
        dbEvents.map((event: { id: number; uuid: string; name: string }) =>
          retryWithBackoff(
            () => apiClient.post<SyncResult>(API_ENDPOINTS.TEAM_SYNC(event.id)),
            `Syncing teams for event ${event.name}`
          )
        )
      )
      completedSteps += 1
      if (syncLogId) {
        await apiClient.patch(API_ENDPOINTS.SYNC_LOG_UPDATE_STATS(syncLogId), {
          status: 'in_progress',
          details: {
            progress_percent: stepToProgress(completedSteps, totalSteps),
            current_step: 'teams',
          },
        })
      }
      for (const r of teamResults) {
        teamsCreated += r.created || 0
        teamsUpdated += r.updated || 0
      }

      const wcResults = await Promise.all(
        dbEvents.map((event: { id: number; uuid: string; name: string }) =>
          retryWithBackoff(
            () => apiClient.post<SyncResult>(API_ENDPOINTS.WEIGHT_CATEGORY_SYNC(event.id)),
            `Syncing weight categories for event ${event.name}`
          )
        )
      )
      completedSteps += 1
      if (syncLogId) {
        await apiClient.patch(API_ENDPOINTS.SYNC_LOG_UPDATE_STATS(syncLogId), {
          status: 'in_progress',
          details: {
            progress_percent: stepToProgress(completedSteps, totalSteps),
            current_step: 'categories',
          },
        })
      }
      for (const r of wcResults) {
        categoriesCreated += r.created || 0
        categoriesUpdated += r.updated || 0
      }

      const athleteResults = await Promise.all(
        dbEvents.map((event: { id: number; uuid: string; name: string }) =>
          retryWithBackoff(
            () => apiClient.post<SyncResult>(API_ENDPOINTS.ATHLETE_SYNC(event.id)),
            `Syncing athletes for event ${event.name}`
          )
        )
      )
      completedSteps += 1
      if (syncLogId) {
        await apiClient.patch(API_ENDPOINTS.SYNC_LOG_UPDATE_STATS(syncLogId), {
          status: 'in_progress',
          details: {
            progress_percent: stepToProgress(completedSteps, totalSteps),
            current_step: 'athletes',
          },
        })
      }
      for (const r of athleteResults) {
        athletesCreated += r.created || 0
        athletesUpdated += r.updated || 0
      }

      const refereeResults = await Promise.all(
        dbEvents.map((event: { id: number; uuid: string; name: string }) =>
          retryWithBackoff(
            () => apiClient.post<SyncResult>(API_ENDPOINTS.REFEREE_SYNC(event.id)),
            `Syncing referees for event ${event.name}`
          )
        )
      )
      completedSteps += 1
      if (syncLogId) {
        await apiClient.patch(API_ENDPOINTS.SYNC_LOG_UPDATE_STATS(syncLogId), {
          status: 'in_progress',
          details: {
            progress_percent: stepToProgress(completedSteps, totalSteps),
            current_step: 'referees',
          },
        })
      }
      for (const r of refereeResults) {
        refereesCreated += r.created || 0
        refereesUpdated += r.updated || 0
      }

      const fightResults = await Promise.all(
        dbEvents.map((event: { id: number; uuid: string; name: string }) =>
          retryWithBackoff(
            () => apiClient.post<SyncResult>(API_ENDPOINTS.FIGHT_SYNC(event.id)),
            `Syncing fights for event ${event.name}`
          )
        )
      )
      completedSteps += 1
      if (syncLogId) {
        await apiClient.patch(API_ENDPOINTS.SYNC_LOG_UPDATE_STATS(syncLogId), {
          status: 'in_progress',
          details: {
            progress_percent: stepToProgress(completedSteps, totalSteps),
            current_step: 'fights',
          },
        })
      }
      for (const r of fightResults) {
        fightsCreated += r.created || 0
        fightsUpdated += r.updated || 0
      }

      if (syncLogId) {
        try {
          await apiClient.patch(
            API_ENDPOINTS.SYNC_LOG_UPDATE_STATS(syncLogId),
            {
              teams_created: teamsCreated,
              teams_updated: teamsUpdated,
              athletes_created: athletesCreated,
              athletes_updated: athletesUpdated,
              weight_categories_created: categoriesCreated,
              weight_categories_updated: categoriesUpdated,
              referees_created: refereesCreated,
              referees_updated: refereesUpdated,
              fights_created: fightsCreated,
              fights_updated: fightsUpdated,
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

      const now = new Date()
      const formattedDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`

      localStorage.setItem('lastSyncDate', formattedDate)

      setSyncState(prev => ({
        ...prev,
        isSyncing: false,
        showSuccess: true,
        lastSyncDate: formattedDate,
        progressPercent: 100,
        currentStep: 'completed',
        activeSyncLogId: null,
      }))

      successTimeoutRef.current = setTimeout(() => {
        setSyncState(prev => ({ ...prev, showSuccess: false }))
      }, 3000)
    } catch (error) {
      console.error('Sync error:', error)
      const errorMessage = error instanceof Error ? error.message : 'Synchronizácia zlyhala po 5 pokusoch'

      const logId = syncState.activeSyncLogId
      if (logId) {
        try {
          await apiClient.patch(API_ENDPOINTS.SYNC_LOG_UPDATE_STATS(logId), {
            status: 'failed',
            error_message: errorMessage,
          })
        } catch {
          // Best effort only
        }
      }

      setSyncState(prev => ({
        ...prev,
        isSyncing: false,
        showError: true,
        errorMessage: errorMessage,
        currentStep: 'failed',
        activeSyncLogId: null,
      }))
    }
  }, [retryWithBackoff, startProgressPolling, syncState.activeSyncLogId])

  const confirmSync = useCallback(() => {
    setSyncState(prev => ({ ...prev, showConfirm: false }))
    void triggerSync()
  }, [triggerSync])

  const loadActiveSyncFromLogs = useCallback(async () => {
    try {
      const logs = await apiClient.get<SyncLogSummary[]>(`${API_ENDPOINTS.SYNC_LOGS}?limit=20`)

      const active = logs.find(isSyncLogEffectivelyActive)
      if (!active) {
        setSyncState(prev => ({
          ...prev,
          isSyncing: false,
          activeSyncLogId: null,
          progressPercent: 0,
          currentStep: '',
          initiatedBy: '',
        }))
        return
      }

      const progress = Number(active.details?.progress_percent ?? 0)
      const step = active.details?.current_step ?? ''
      const initiator = (active.details?.initiated_by ?? active.user_full_name ?? '').trim()

      setSyncState(prev => ({
        ...prev,
        isSyncing: true,
        activeSyncLogId: active.id,
        progressPercent: progress,
        currentStep: step,
        initiatedBy: initiator,
      }))

      startProgressPolling(active.id)
    } catch {
      // Ignore on initial load
    }
  }, [isSyncLogEffectivelyActive, startProgressPolling])

  useEffect(() => {
    void loadActiveSyncFromLogs()
  }, [loadActiveSyncFromLogs])

  return {
    syncState,
    handleSyncClick,
    confirmSync,
    cancelSync,
    dismissError,
  }
}
