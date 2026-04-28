import { useState, useCallback, useRef, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { ApiError, apiClient } from '@/services/apiClient'
import { API_ENDPOINTS, LOCAL_SYNC_AGENT_URL } from '@/config/api'
import type { DatabaseEventSummary, SyncLogSummary, SyncResult } from './syncFlow'
import {
  formatSyncTimestamp,
  isSyncLogEffectivelyActive,
  retryWithBackoff,
  runSyncStage,
  stepToProgress,
} from './syncFlow'

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

function shouldUseLocalAgentSync() {
  return import.meta.env.VITE_SYNC_MODE === 'local-agent' || import.meta.env.PROD || window.location.protocol === 'https:'
}

export function useSync(currentUserName?: string) {
  const { t } = useTranslation()
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
  }, [])

  const getSyncErrorMessage = useCallback((error: unknown) => {
    if (error instanceof ApiError) {
      if (error.status === 409) {
        return t('dashboard.syncErrors.alreadyRunning')
      }

      if (error.message?.trim()) {
        return error.message
      }
    }

    if (error instanceof TypeError) {
      return t('dashboard.syncErrors.network')
    }

    if (error instanceof Error && error.message?.trim()) {
      return error.message
    }

    return t('dashboard.syncErrors.generic')
  }, [t])

  const triggerSync = useCallback(async () => {
    let currentSyncLogId: number | null = null

    setSyncState(prev => ({
      ...prev,
      isSyncing: true,
      showError: false,
      errorMessage: '',
      progressPercent: 0,
      currentStep: 'events',
      initiatedBy: currentUserName?.trim() || prev.initiatedBy,
    }))

    try {
      if (shouldUseLocalAgentSync()) {
        const localSync = await apiClient.post<LocalSyncStartResponse>(API_ENDPOINTS.LOCAL_SYNC_START, {})
        currentSyncLogId = localSync.sync_log_id

        setSyncState(prev => ({
          ...prev,
          activeSyncLogId: localSync.sync_log_id,
          currentStep: 'agent',
          progressPercent: 1,
        }))
        startProgressPolling(localSync.sync_log_id)

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

        const formattedDate = formatSyncTimestamp()
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
        return
      }

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

      const syncLogId = eventsSyncResult.sync_log_id
      currentSyncLogId = syncLogId ?? null

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
        () => apiClient.get<{ items: DatabaseEventSummary[]; total: number }>(
          API_ENDPOINTS.SPORT_EVENT_DATABASE
        ),
        'Fetching events from database'
      )
      const dbEvents = dbEventsData.items || []
      const syncHeaders = syncLogId ? { headers: { 'X-Sync-Log-Id': String(syncLogId) } } : undefined

      let teamsCreated = 0, teamsUpdated = 0
      let categoriesCreated = 0, categoriesUpdated = 0
      let athletesCreated = 0, athletesUpdated = 0
      let refereesCreated = 0, refereesUpdated = 0
      let fightsCreated = 0, fightsUpdated = 0

      const teamsStage = await runSyncStage({
        dbEvents,
        endpointForEvent: API_ENDPOINTS.TEAM_SYNC,
        contextLabel: (eventName) => `Syncing teams for event ${eventName}`,
        syncLogId,
        syncHeaders,
        completedSteps,
        totalSteps,
        currentStep: 'teams',
      })
      completedSteps = teamsStage.completedSteps
      teamsCreated = teamsStage.created
      teamsUpdated = teamsStage.updated

      const categoriesStage = await runSyncStage({
        dbEvents,
        endpointForEvent: API_ENDPOINTS.WEIGHT_CATEGORY_SYNC,
        contextLabel: (eventName) => `Syncing weight categories for event ${eventName}`,
        syncLogId,
        syncHeaders,
        completedSteps,
        totalSteps,
        currentStep: 'categories',
      })
      completedSteps = categoriesStage.completedSteps
      categoriesCreated = categoriesStage.created
      categoriesUpdated = categoriesStage.updated

      const athletesStage = await runSyncStage({
        dbEvents,
        endpointForEvent: API_ENDPOINTS.ATHLETE_SYNC,
        contextLabel: (eventName) => `Syncing athletes for event ${eventName}`,
        syncLogId,
        syncHeaders,
        completedSteps,
        totalSteps,
        currentStep: 'athletes',
      })
      completedSteps = athletesStage.completedSteps
      athletesCreated = athletesStage.created
      athletesUpdated = athletesStage.updated

      const refereesStage = await runSyncStage({
        dbEvents,
        endpointForEvent: API_ENDPOINTS.REFEREE_SYNC,
        contextLabel: (eventName) => `Syncing referees for event ${eventName}`,
        syncLogId,
        syncHeaders,
        completedSteps,
        totalSteps,
        currentStep: 'referees',
      })
      completedSteps = refereesStage.completedSteps
      refereesCreated = refereesStage.created
      refereesUpdated = refereesStage.updated

      const fightsStage = await runSyncStage({
        dbEvents,
        endpointForEvent: API_ENDPOINTS.FIGHT_SYNC,
        contextLabel: (eventName) => `Syncing fights for event ${eventName}`,
        syncLogId,
        syncHeaders,
        completedSteps,
        totalSteps,
        currentStep: 'fights',
      })
      completedSteps = fightsStage.completedSteps
      fightsCreated = fightsStage.created
      fightsUpdated = fightsStage.updated

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

      const formattedDate = formatSyncTimestamp()

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
      const errorMessage = getSyncErrorMessage(error)

      clearTimers()

      const logId = currentSyncLogId
      if (logId) {
        try {
          await apiClient.patch(API_ENDPOINTS.SYNC_LOG_UPDATE_STATS(logId), {
            status: 'failed',
            error_message: errorMessage,
            details: {
              progress_percent: 100,
              current_step: 'failed',
            },
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
        progressPercent: 0,
        initiatedBy: '',
      }))
    }
  }, [clearTimers, currentUserName, getSyncErrorMessage, startProgressPolling])

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
  }, [startProgressPolling])

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
