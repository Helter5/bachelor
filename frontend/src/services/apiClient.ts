/**
 * API Client Service
 * Centralized HTTP client for all API requests with automatic authentication
 * and token refresh on 401 responses
 */

import { API_BASE_URL, API_ENDPOINTS } from '@/config/api'
import { getDeviceId } from '@/utils/deviceId'

export class ApiError extends Error {
  status: number
  statusText: string

  constructor(
    status: number,
    statusText: string,
    message: string
  ) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.statusText = statusText
  }
}

interface RequestOptions {
  headers?: Record<string, string>
  params?: Record<string, string | number>
  requireAuth?: boolean
}

class ApiClient {
  private baseUrl: string
  private refreshPromise: Promise<boolean> | null = null

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl
  }

  /**
   * Get CSRF token from sessionStorage (stored after login)
   */
  private getCsrfToken(): string | null {
    return sessionStorage.getItem('csrf_token')
  }

  /**
   * Build headers with CSRF token and Device ID for cookie-based auth
   */
  private buildHeaders(options: RequestOptions = {}): HeadersInit {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...options.headers,
    }

    // Add CSRF token header for state-changing requests
    if (options.requireAuth !== false) {
      const csrfToken = this.getCsrfToken()
      if (csrfToken) {
        headers['X-CSRF-Token'] = csrfToken
      }
    }

    // Add Device ID header for device tracking
    headers['X-Device-ID'] = getDeviceId()

    return headers
  }

  /**
   * Build URL with query parameters
   */
  private buildUrl(endpoint: string, params?: Record<string, string | number>): string {
    const url = `${this.baseUrl}${endpoint}`

    if (!params || Object.keys(params).length === 0) {
      return url
    }

    const searchParams = new URLSearchParams()
    Object.entries(params).forEach(([key, value]) => {
      searchParams.append(key, String(value))
    })

    const separator = url.includes('?') ? '&' : '?'
    return `${url}${separator}${searchParams.toString()}`
  }

  /**
   * Try to refresh the access token using the refresh token.
   * Returns true if refresh was successful, false otherwise.
   * Uses a shared promise to prevent concurrent refresh calls.
   */
  private async tryRefreshToken(): Promise<boolean> {
    // If a refresh is already in progress, wait for it
    if (this.refreshPromise) {
      return this.refreshPromise
    }

    this.refreshPromise = this.doRefresh()
    const result = await this.refreshPromise
    this.refreshPromise = null
    return result
  }

  private async doRefresh(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}${API_ENDPOINTS.AUTH_REFRESH}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': this.getCsrfToken() || '',
          'X-Device-ID': getDeviceId(),
        },
        credentials: 'include',
      })

      if (response.ok) {
        const data = await response.json()
        // Update CSRF token with the new one from refresh response
        if (data.csrf_token) {
          sessionStorage.setItem('csrf_token', data.csrf_token)
        }
        return true
      }
      return false
    } catch {
      return false
    }
  }

  /**
   * Core request method with automatic 401 → refresh → retry logic
   */
  private async request<T>(
    method: string,
    endpoint: string,
    data?: any,
    options: RequestOptions = {},
    isRetry: boolean = false
  ): Promise<T> {
    const url = this.buildUrl(endpoint, options.params)
    const headers = this.buildHeaders(options)

    const response = await fetch(url, {
      method,
      headers,
      body: data ? JSON.stringify(data) : undefined,
      credentials: 'include',
    })

    if (!response.ok) {
      // On 401, try to refresh the token (only once, and only if user was authenticated)
      if (response.status === 401 && !isRetry && this.getCsrfToken()) {
        const refreshed = await this.tryRefreshToken()
        if (refreshed) {
          // Retry the original request with refreshed tokens
          return this.request<T>(method, endpoint, data, options, true)
        }
        // Refresh failed → session is invalid (revoked or expired), force logout
        sessionStorage.removeItem('csrf_token')
        window.location.href = '/'

      }

      const errorText = await response.text().catch(() => 'Unknown error')
      throw new ApiError(
        response.status,
        response.statusText,
        errorText || `HTTP ${response.status}: ${response.statusText}`
      )
    }

    // Handle empty responses (204 No Content, etc.)
    const contentType = response.headers.get('content-type')
    if (!contentType || !contentType.includes('application/json')) {
      return {} as T
    }

    return response.json()
  }

  /**
   * GET request
   */
  async get<T = any>(endpoint: string, options: RequestOptions = {}): Promise<T> {
    return this.request<T>('GET', endpoint, undefined, options)
  }

  /**
   * POST request
   */
  async post<T = any>(
    endpoint: string,
    data?: any,
    options: RequestOptions = {}
  ): Promise<T> {
    return this.request<T>('POST', endpoint, data, options)
  }

  /**
   * PUT request
   */
  async put<T = any>(
    endpoint: string,
    data?: any,
    options: RequestOptions = {}
  ): Promise<T> {
    return this.request<T>('PUT', endpoint, data, options)
  }

  /**
   * DELETE request
   */
  async delete<T = any>(endpoint: string, options: RequestOptions = {}): Promise<T> {
    return this.request<T>('DELETE', endpoint, undefined, options)
  }

  /**
   * PATCH request
   */
  async patch<T = any>(
    endpoint: string,
    data?: any,
    options: RequestOptions = {}
  ): Promise<T> {
    return this.request<T>('PATCH', endpoint, data, options)
  }

  /**
   * GET request that returns a Blob (for file downloads)
   */
  async getBlob(endpoint: string, options: RequestOptions = {}): Promise<Blob> {
    const url = this.buildUrl(endpoint, options.params)
    const headers = this.buildHeaders(options)

    const response = await fetch(url, {
      method: 'GET',
      headers,
      credentials: 'include',
    })

    if (!response.ok) {
      // Try refresh on 401 for blob requests too
      if (response.status === 401 && this.getCsrfToken()) {
        const refreshed = await this.tryRefreshToken()
        if (refreshed) {
          const retryResponse = await fetch(url, {
            method: 'GET',
            headers: this.buildHeaders(options),
            credentials: 'include',
          })
          if (retryResponse.ok) {
            return retryResponse.blob()
          }
        }
        sessionStorage.removeItem('csrf_token')
        window.location.href = '/'
      }

      const errorText = await response.text().catch(() => 'Unknown error')
      throw new ApiError(
        response.status,
        response.statusText,
        errorText || `HTTP ${response.status}: ${response.statusText}`
      )
    }

    return response.blob()
  }
}

// Export singleton instance
export const apiClient = new ApiClient(API_BASE_URL)

// Export convenience methods for direct import
export const { get, post, put, patch, delete: del } = {
  get: <T = any>(endpoint: string, options?: RequestOptions) =>
    apiClient.get<T>(endpoint, options),
  post: <T = any>(endpoint: string, data?: any, options?: RequestOptions) =>
    apiClient.post<T>(endpoint, data, options),
  put: <T = any>(endpoint: string, data?: any, options?: RequestOptions) =>
    apiClient.put<T>(endpoint, data, options),
  patch: <T = any>(endpoint: string, data?: any, options?: RequestOptions) =>
    apiClient.patch<T>(endpoint, data, options),
  delete: <T = any>(endpoint: string, options?: RequestOptions) =>
    apiClient.delete<T>(endpoint, options),
}
