import { useState, useEffect, useCallback } from 'react'
import { apiClient } from '@/services/apiClient'

interface UseApiOptions<T> {
  endpoint: string
  immediate?: boolean
  transform?: (data: unknown) => T
  onSuccess?: (data: T) => void
  onError?: (error: Error) => void
}

interface UseApiReturn<T> {
  data: T | null
  loading: boolean
  error: string | null
  refetch: () => Promise<void>
}

/**
 * Generic hook for API calls with loading and error states
 * @example
 * const { data, loading, error, refetch } = useApi({
 *   endpoint: '/athletes',
 *   transform: (response) => response.athletes
 * })
 */
export function useApi<T>({
  endpoint,
  immediate = true,
  transform,
  onSuccess,
  onError
}: UseApiOptions<T>): UseApiReturn<T> {
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(immediate)
  const [error, setError] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      
      const response = await apiClient.get(endpoint)
      const transformedData = transform ? transform(response) : response as T
      
      setData(transformedData)
      onSuccess?.(transformedData)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch data'
      setError(errorMessage)
      onError?.(err instanceof Error ? err : new Error(errorMessage))
      setData(null)
    } finally {
      setLoading(false)
    }
  }, [endpoint, transform, onSuccess, onError])

  useEffect(() => {
    if (immediate) {
      fetchData()
    }
  }, [immediate, fetchData])

  return {
    data,
    loading,
    error,
    refetch: fetchData
  }
}
