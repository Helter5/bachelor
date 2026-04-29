import { useState, useCallback, useRef, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { ApiError, apiClient } from '@/services/apiClient'
import { API_ENDPOINTS } from '@/config/api'
import type { SyncLogSummary } from './syncFlow'
import {
  formatSyncTimestamp,
  isSyncLogEffectivelyActive,
  runBrowserSync,
  runLocalAgentSync,
  shouldUseLocalAgentSync,
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

  const successTimeoutRef = useRef<number | undefined>(undefined)
  const completionTimeoutRef = useRef<number | undefined>(undefined)
  const progressIntervalRef = useRef<number | undefined>(undefined)

  const clearTimers = useCallback(() => {
    if (successTimeoutRef.current !== undefined) {
      clearTimeout(successTimeoutRef.current)
      successTimeoutRef.current = undefined
    }
    if (completionTimeoutRef.current !== undefined) {
      clearTimeout(completionTimeoutRef.current)
      completionTimeoutRef.current = undefined
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
    }, 1000)
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

  const completeSync = useCallback((formattedDate: string) => {
    localStorage.setItem('lastSyncDate', formattedDate)

    setSyncState(prev => ({
      ...prev,
      isSyncing: true,
      showSuccess: true,
      lastSyncDate: formattedDate,
      progressPercent: 100,
      currentStep: 'completed',
      activeSyncLogId: null,
    }))

    completionTimeoutRef.current = window.setTimeout(() => {
      setSyncState(prev => ({ ...prev, isSyncing: false }))
      completionTimeoutRef.current = undefined
    }, 1200)

    successTimeoutRef.current = window.setTimeout(() => {
      setSyncState(prev => ({ ...prev, showSuccess: false }))
      successTimeoutRef.current = undefined
    }, 3000)
  }, [])

  const triggerSync = useCallback(async () => {
    let currentSyncLogId: number | null = null
    const handleSyncStarted = (syncLogId: number) => {
      currentSyncLogId = syncLogId
      setSyncState(prev => ({
        ...prev,
        activeSyncLogId: syncLogId,
        currentStep: shouldUseLocalAgentSync() ? 'agent' : prev.currentStep,
        progressPercent: shouldUseLocalAgentSync() ? 1 : prev.progressPercent,
      }))
      startProgressPolling(syncLogId)
    }

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
        await runLocalAgentSync({ onStarted: handleSyncStarted })
      } else {
        await runBrowserSync({ onStarted: handleSyncStarted })
      }

      const formattedDate = formatSyncTimestamp()
      completeSync(formattedDate)
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
  }, [clearTimers, completeSync, currentUserName, getSyncErrorMessage, startProgressPolling])

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
