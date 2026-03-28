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
const RETRY_DELAY_MS = 1000 // 1 second delay between retries

export function useSync() {
  const [syncState, setSyncState] = useState<SyncState>(() => {
    // Load last sync date from localStorage on initialization
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

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      if (syncTimeoutRef.current) clearTimeout(syncTimeoutRef.current)
      if (successTimeoutRef.current) clearTimeout(successTimeoutRef.current)
    }
  }, [])

  const handleSyncClick = useCallback(() => {
    setSyncState(prev => ({ ...prev, showConfirm: true }))
  }, [])

  const cancelSync = useCallback(() => {
    setSyncState(prev => ({ ...prev, showConfirm: false }))
  }, [])

  const dismissError = useCallback(() => {
    setSyncState(prev => ({ ...prev, showError: false, errorMessage: '' }))
  }, [])

  /**
   * Retry wrapper function with exponential backoff
   */
  const retryWithBackoff = async <T,>(
    fn: () => Promise<T>,
    context: string,
    maxAttempts = MAX_RETRY_ATTEMPTS
  ): Promise<T> => {
    let lastError: any

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
      // Step 1: Sync all events from Arena API
      console.log('Step 1: Syncing events from Arena API...')
      const eventsSyncResult = await retryWithBackoff(
        () => apiClient.post<SyncResult>(
          API_ENDPOINTS.SPORT_EVENT_SYNC
        ),
        'Syncing sport events'
      )
      console.log(`✓ ${eventsSyncResult.message}`)

      const syncLogId = eventsSyncResult.sync_log_id

      // Step 2: Fetch all events from database to get their integer IDs
      console.log('Step 2: Fetching events from database...')
      const dbEventsData = await retryWithBackoff(
        () => apiClient.get<{ items: Array<{ id: number; uuid: string; name: string }>; total: number }>(
          API_ENDPOINTS.SPORT_EVENT_DATABASE
        ),
        'Fetching events from database'
      )
      const dbEvents = dbEventsData.items || []
      console.log(`✓ Found ${dbEvents.length} events in database`)

      // Accumulated stats
      let teamsCreated = 0, teamsUpdated = 0
      let categoriesCreated = 0, categoriesUpdated = 0
      let athletesCreated = 0, athletesUpdated = 0
      let fightsCreated = 0, fightsUpdated = 0

      // Step 3: Sync teams for all events
      console.log('Step 3: Syncing teams for all events...')
      const teamResults = await Promise.all(
        dbEvents.map(async (event: { id: number; uuid: string; name: string }) => {
          const result = await retryWithBackoff(
            () => apiClient.post<SyncResult>(
              API_ENDPOINTS.TEAM_SYNC(event.id)
            ),
            `Syncing teams for event ${event.name}`
          )
          if (result.created || result.updated) {
            console.log(`  +${result.created} ~${result.updated} teams for ${event.name}`)
          }
          return result
        })
      )
      for (const r of teamResults) {
        teamsCreated += r.created || 0
        teamsUpdated += r.updated || 0
      }
      if (teamsCreated || teamsUpdated) {
        console.log(`✓ Teams: +${teamsCreated} new, ~${teamsUpdated} updated`)
      } else {
        console.log('✓ Teams: no changes')
      }

      // Step 4: Sync weight categories for all events
      console.log('Step 4: Syncing weight categories for all events...')
      const wcResults = await Promise.all(
        dbEvents.map(async (event: { id: number; uuid: string; name: string }) => {
          const result = await retryWithBackoff(
            () => apiClient.post<SyncResult>(
              API_ENDPOINTS.WEIGHT_CATEGORY_SYNC(event.id)
            ),
            `Syncing weight categories for event ${event.name}`
          )
          if (result.created || result.updated) {
            console.log(`  +${result.created} ~${result.updated} categories for ${event.name}`)
          }
          return result
        })
      )
      for (const r of wcResults) {
        categoriesCreated += r.created || 0
        categoriesUpdated += r.updated || 0
      }
      if (categoriesCreated || categoriesUpdated) {
        console.log(`✓ Categories: +${categoriesCreated} new, ~${categoriesUpdated} updated`)
      } else {
        console.log('✓ Categories: no changes')
      }

      // Step 5: Sync athletes for all events
      console.log('Step 5: Syncing athletes for all events...')
      const athleteResults = await Promise.all(
        dbEvents.map(async (event: { id: number; uuid: string; name: string }) => {
          const result = await retryWithBackoff(
            () => apiClient.post<SyncResult>(
              API_ENDPOINTS.ATHLETE_SYNC(event.id)
            ),
            `Syncing athletes for event ${event.name}`
          )
          if (result.created || result.updated) {
            console.log(`  +${result.created} ~${result.updated} athletes for ${event.name}`)
          }
          return result
        })
      )
      for (const r of athleteResults) {
        athletesCreated += r.created || 0
        athletesUpdated += r.updated || 0
      }
      if (athletesCreated || athletesUpdated) {
        console.log(`✓ Athletes: +${athletesCreated} new, ~${athletesUpdated} updated`)
      } else {
        console.log('✓ Athletes: no changes')
      }

      // Step 6: Sync fights for all events
      console.log('Step 6: Syncing fights for all events...')
      const fightResults = await Promise.all(
        dbEvents.map(async (event: { id: number; uuid: string; name: string }) => {
          const result = await retryWithBackoff(
            () => apiClient.post<SyncResult>(
              API_ENDPOINTS.FIGHT_SYNC(event.id)
            ),
            `Syncing fights for event ${event.name}`
          )
          if (result.created || result.updated) {
            console.log(`  +${result.created} ~${result.updated} fights for ${event.name}`)
          }
          return result
        })
      )
      for (const r of fightResults) {
        fightsCreated += r.created || 0
        fightsUpdated += r.updated || 0
      }
      if (fightsCreated || fightsUpdated) {
        console.log(`✓ Fights: +${fightsCreated} new, ~${fightsUpdated} updated`)
      } else {
        console.log('✓ Fights: no changes')
      }

      // Step 7: Update sync log with accumulated stats
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
              fights_created: fightsCreated,
              fights_updated: fightsUpdated,
            }
          )
          console.log('✓ Sync log updated with final stats')
        } catch (error) {
          console.warn('Could not update sync log stats:', error)
        }
      }

      const now = new Date()
      const formattedDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`

      // Save to localStorage
      localStorage.setItem('lastSyncDate', formattedDate)

      setSyncState(prev => ({
        ...prev,
        isSyncing: false,
        showSuccess: true,
        lastSyncDate: formattedDate
      }))

      // Hide success message after 3 seconds
      successTimeoutRef.current = setTimeout(() => {
        setSyncState(prev => ({ ...prev, showSuccess: false }))
      }, 3000)

      console.log("✓✓✓ Synchronization completed successfully! ✓✓✓")
    } catch (error) {
      console.error('✗✗✗ Sync error:', error)
      const errorMessage = error instanceof Error ? error.message : 'Synchronizácia zlyhala po 5 pokusoch'
      setSyncState(prev => ({
        ...prev,
        isSyncing: false,
        showError: true,
        errorMessage: errorMessage
      }))
      return
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
  }
}
