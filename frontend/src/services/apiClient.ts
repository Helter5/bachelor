import { API_BASE_URL, API_ENDPOINTS } from '@/config/api'
import { clearAuthSessionHint } from '@/services/authSession'

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

  private getCsrfToken(): string | null {
    const cookieToken = document.cookie
      .split('; ')
      .find((row) => row.startsWith('csrf_token='))
      ?.split('=')[1]

    if (cookieToken) {
      const decodedToken = decodeURIComponent(cookieToken)
      sessionStorage.setItem('csrf_token', decodedToken)
      return decodedToken
    }

    return sessionStorage.getItem('csrf_token')
  }

  private buildHeaders(options: RequestOptions = {}): HeadersInit {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...options.headers,
    }

    if (options.requireAuth !== false) {
      const csrfToken = this.getCsrfToken()
      if (csrfToken) {
        headers['X-CSRF-Token'] = csrfToken
      }
    }

    return headers
  }

  private buildFormHeaders(options: RequestOptions = {}): HeadersInit {
    const headers: Record<string, string> = {
      ...options.headers,
    }

    if (options.requireAuth !== false) {
      const csrfToken = this.getCsrfToken()
      if (csrfToken) {
        headers['X-CSRF-Token'] = csrfToken
      }
    }

    return headers
  }

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

  private async tryRefreshToken(): Promise<boolean> {
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
        },
        credentials: 'include',
      })

      if (response.ok) {
        const data = await response.json()
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

  private async request<T>(
    method: string,
    endpoint: string,
    data?: unknown,
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
      if (response.status === 401 && !isRetry && this.getCsrfToken()) {
        const refreshed = await this.tryRefreshToken()
        if (refreshed) {
          return this.request<T>(method, endpoint, data, options, true)
        }
        sessionStorage.removeItem('csrf_token')
        clearAuthSessionHint()
        window.location.href = '/'

      }

      const errorText = await response.text().catch(() => 'Unknown error')
      let errorMessage = errorText || `HTTP ${response.status}: ${response.statusText}`
      try {
        const parsed = JSON.parse(errorText)
        if (typeof parsed?.detail === 'string') errorMessage = parsed.detail
      } catch { /* not JSON */ }
      throw new ApiError(response.status, response.statusText, errorMessage)
    }

    const contentType = response.headers.get('content-type')
    if (!contentType || !contentType.includes('application/json')) {
      return {} as T
    }

    return response.json()
  }

  async get<T = unknown>(endpoint: string, options: RequestOptions = {}): Promise<T> {
    return this.request<T>('GET', endpoint, undefined, options)
  }

  async post<T = unknown>(
    endpoint: string,
    data?: unknown,
    options: RequestOptions = {}
  ): Promise<T> {
    return this.request<T>('POST', endpoint, data, options)
  }

  async put<T = unknown>(
    endpoint: string,
    data?: unknown,
    options: RequestOptions = {}
  ): Promise<T> {
    return this.request<T>('PUT', endpoint, data, options)
  }

  async delete<T = unknown>(endpoint: string, options: RequestOptions = {}): Promise<T> {
    return this.request<T>('DELETE', endpoint, undefined, options)
  }

  async patch<T = unknown>(
    endpoint: string,
    data?: unknown,
    options: RequestOptions = {}
  ): Promise<T> {
    return this.request<T>('PATCH', endpoint, data, options)
  }

  async getBlob(endpoint: string, options: RequestOptions = {}): Promise<Blob> {
    const url = this.buildUrl(endpoint, options.params)
    const headers = this.buildHeaders(options)

    const response = await fetch(url, {
      method: 'GET',
      headers,
      credentials: 'include',
    })

    if (!response.ok) {
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
        clearAuthSessionHint()
        window.location.href = '/'
      }

      const errorText = await response.text().catch(() => 'Unknown error')
      let errorMessage = errorText || `HTTP ${response.status}: ${response.statusText}`
      try {
        const parsed = JSON.parse(errorText)
        if (typeof parsed?.detail === 'string') errorMessage = parsed.detail
      } catch { /* not JSON */ }
      throw new ApiError(response.status, response.statusText, errorMessage)
    }

    return response.blob()
  }

  async postForm<T = unknown>(endpoint: string, formData: FormData, options: RequestOptions = {}): Promise<T> {
    const url = this.buildUrl(endpoint, options.params)
    const headers = this.buildFormHeaders(options)

    const makeRequest = async (retryHeaders: HeadersInit) => {
      return fetch(url, {
        method: 'POST',
        headers: retryHeaders,
        body: formData,
        credentials: 'include',
      })
    }

    let response = await makeRequest(headers)

    if (!response.ok) {
      if (response.status === 401 && this.getCsrfToken()) {
        const refreshed = await this.tryRefreshToken()
        if (refreshed) {
          response = await makeRequest(this.buildFormHeaders(options))
        } else {
          sessionStorage.removeItem('csrf_token')
          clearAuthSessionHint()
          window.location.href = '/'
        }
      }

      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Unknown error')
        throw new ApiError(
          response.status,
          response.statusText,
          errorText || `HTTP ${response.status}: ${response.statusText}`
        )
      }
    }

    const contentType = response.headers.get('content-type')
    if (!contentType || !contentType.includes('application/json')) {
      return {} as T
    }

    return response.json()
  }
}

export const apiClient = new ApiClient(API_BASE_URL)

export const { get, post, put, patch, delete: del } = {
  get: <T = unknown>(endpoint: string, options?: RequestOptions) =>
    apiClient.get<T>(endpoint, options),
  post: <T = unknown>(endpoint: string, data?: unknown, options?: RequestOptions) =>
    apiClient.post<T>(endpoint, data, options),
  put: <T = unknown>(endpoint: string, data?: unknown, options?: RequestOptions) =>
    apiClient.put<T>(endpoint, data, options),
  patch: <T = unknown>(endpoint: string, data?: unknown, options?: RequestOptions) =>
    apiClient.patch<T>(endpoint, data, options),
  delete: <T = unknown>(endpoint: string, options?: RequestOptions) =>
    apiClient.delete<T>(endpoint, options),
}
