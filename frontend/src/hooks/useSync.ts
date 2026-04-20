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
}

interface SyncResult {
  count: number
  created: number
  updated: number
  message?: string
  sync_log_id?: number
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
      lastSyncDate: savedSyncDate || ""
    }
  })

  const syncTimeoutRef = useRef<number | undefined>(undefined)
  const successTimeoutRef = useRef<number | undefined>(undefined)

  const clearTimers = useCallback(() => {
    if (syncTimeoutRef.current !== undefined) {
      clearTimeout(syncTimeoutRef.current)
      syncTimeoutRef.current = undefined
    }
    if (successTimeoutRef.current !== undefined) {
      clearTimeout(successTimeoutRef.current)
      successTimeoutRef.current = undefined
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
    setSyncState(prev => ({ ...prev, isSyncing: true, showError: false, errorMessage: '' }))

    try {
      const eventsSyncResult = await retryWithBackoff(
        () => apiClient.post<SyncResult>(API_ENDPOINTS.SPORT_EVENT_SYNC),
        'Syncing sport events'
      )

      const syncLogId = eventsSyncResult.sync_log_id

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
        lastSyncDate: formattedDate
      }))

      successTimeoutRef.current = setTimeout(() => {
        setSyncState(prev => ({ ...prev, showSuccess: false }))
      }, 3000)
    } catch (error) {
      console.error('Sync error:', error)
      const errorMessage = error instanceof Error ? error.message : 'Synchronizácia zlyhala po 5 pokusoch'
      setSyncState(prev => ({
        ...prev,
        isSyncing: false,
        showError: true,
        errorMessage: errorMessage
      }))
    }
  }, [])

  const confirmSync = useCallback(() => {
    setSyncState(prev => ({ ...prev, showConfirm: false }))
    triggerSync()
  }, [triggerSync])

  return {
    syncState,
    handleSyncClick,
    confirmSync,
    cancelSync,
    dismissError,
  }
}
