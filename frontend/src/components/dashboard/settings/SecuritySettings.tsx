import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { apiClient } from '@/services/apiClient'
import { API_ENDPOINTS } from '@/config/api'

interface ActiveSession {
  id: number
  created_at: string
  last_used_at: string
  ip_address: string | null
  user_agent: string | null
  mac_address: string | null
  is_current: boolean
}

interface LoginHistoryEntry {
  id: number
  login_at: string
  ip_address: string | null
  user_agent: string | null
  mac_address: string | null
  success: boolean
  failure_reason: string | null
  login_method: string | null
}

interface SecuritySettingsProps {
  isDarkMode: boolean
}

export function SecuritySettings({ isDarkMode }: SecuritySettingsProps) {
  const { t } = useTranslation()
  const [sessions, setSessions] = useState<ActiveSession[]>([])
  const [loginHistory, setLoginHistory] = useState<LoginHistoryEntry[]>([])
  const [loadingSessions, setLoadingSessions] = useState(true)
  const [loadingHistory, setLoadingHistory] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  useEffect(() => {
    loadSessions()
    loadLoginHistory()
  }, [])

  const loadSessions = async () => {
    try {
      setLoadingSessions(true)
      setError(null)
      const data = await apiClient.get<ActiveSession[]>(API_ENDPOINTS.PROFILE_SESSIONS)
      setSessions(data)
    } catch (err) {
      console.error('Error loading sessions:', err)
      setError(t('security.loadError'))
    } finally {
      setLoadingSessions(false)
    }
  }

  const loadLoginHistory = async () => {
    try {
      setLoadingHistory(true)
      const data = await apiClient.get<LoginHistoryEntry[]>(
        `${API_ENDPOINTS.PROFILE_LOGIN_HISTORY}?limit=20`
      )
      setLoginHistory(data)
    } catch (err) {
      console.error('Error loading login history:', err)
    } finally {
      setLoadingHistory(false)
    }
  }

  const handleRevokeSession = async (sessionId: number) => {
    if (!confirm(t('security.confirmRevoke'))) return

    try {
      setError(null)
      setSuccess(null)
      await apiClient.delete(API_ENDPOINTS.PROFILE_REVOKE_SESSION(sessionId))
      setSuccess(t('security.revokeSuccess'))
      await loadSessions()
    } catch {
      setError(t('security.revokeError'))
    }
  }

  const handleRevokeAllSessions = async () => {
    if (!confirm(t('security.confirmRevokeAll'))) return

    try {
      setError(null)
      setSuccess(null)
      // First revoke all sessions in database
      await apiClient.post(API_ENDPOINTS.PROFILE_REVOKE_ALL_SESSIONS, {})
      // Then logout to clear cookies and redirect
      await apiClient.post(API_ENDPOINTS.AUTH_LOGOUT, {})
      // Redirect to login immediately
      window.location.href = '/'
    } catch {
      setError(t('security.revokeAllError'))
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('sk-SK')
  }

  const getBrowserInfo = (userAgent: string | null) => {
    if (!userAgent) return t('security.unknownBrowser')
    if (userAgent.includes('Chrome')) return 'Chrome'
    if (userAgent.includes('Firefox')) return 'Firefox'
    if (userAgent.includes('Safari')) return 'Safari'
    if (userAgent.includes('Edge')) return 'Edge'
    return t('security.unknownUser')
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}
      {success && (
        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded">
          {success}
        </div>
      )}

      {/* Active Sessions */}
      <div className={`rounded-lg p-6 ${isDarkMode ? 'bg-gray-800' : 'bg-white shadow'}`}>
        <div className="flex justify-between items-center mb-4">
          <h3 className={`text-xl font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
            {t('security.activeSessions')}
          </h3>
          {sessions.length > 1 && (
            <button
              onClick={handleRevokeAllSessions}
              className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
            >
              {t('security.revokeAll')}
            </button>
          )}
        </div>

        <p className={`text-sm mb-4 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
          {t('security.activeSessionsDesc')}
        </p>

        {loadingSessions ? (
          <div className="text-center py-8">
            <div className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>{t('security.loading')}</div>
          </div>
        ) : sessions.length === 0 ? (
          <div className="text-center py-8">
            <div className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>{t('security.noSessions')}</div>
          </div>
        ) : (
          <div className="space-y-3">
            {sessions.map((session) => (
              <div
                key={session.id}
                className={`p-4 rounded border ${
                  session.is_current
                    ? isDarkMode
                      ? 'bg-blue-900 border-blue-700'
                      : 'bg-blue-50 border-blue-300'
                    : isDarkMode
                    ? 'bg-gray-700 border-gray-600'
                    : 'bg-white border-gray-200'
                }`}
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className={`font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                        {getBrowserInfo(session.user_agent)}
                      </span>
                      {session.is_current && (
                        <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded">
                          {t('security.currentSession')}
                        </span>
                      )}
                    </div>
                    <div className={`text-sm space-y-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                      <div>{t('security.ipAddress')}: {session.ip_address || t('security.unknownIp')}</div>
                      <div>{t('security.loginDate')}: {formatDate(session.created_at)}</div>
                      <div>{t('security.lastActivity')}: {formatDate(session.last_used_at)}</div>
                    </div>
                  </div>

                  {!session.is_current && (
                    <button
                      onClick={() => handleRevokeSession(session.id)}
                      className="px-3 py-1 text-sm bg-red-600 text-white rounded hover:bg-red-700"
                    >
                      {t('security.revokeSession')}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Login History */}
      <div className={`rounded-lg p-6 ${isDarkMode ? 'bg-gray-800' : 'bg-white shadow'}`}>
        <h3 className={`text-xl font-semibold mb-4 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
          {t('security.loginHistory')}
        </h3>

        <p className={`text-sm mb-4 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
          {t('security.loginHistoryDesc')}
        </p>

        {loadingHistory ? (
          <div className="text-center py-8">
            <div className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>{t('security.loading')}</div>
          </div>
        ) : loginHistory.length === 0 ? (
          <div className="text-center py-8">
            <div className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>{t('security.noHistory')}</div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className={`border-b ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
                  <th className={`text-left py-2 px-3 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    {t('security.tableDate')}
                  </th>
                  <th className={`text-left py-2 px-3 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    {t('security.tableIp')}
                  </th>
                  <th className={`text-left py-2 px-3 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    {t('security.tableBrowser')}
                  </th>
                  <th className={`text-left py-2 px-3 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    {t('security.tableMethod')}
                  </th>
                  <th className={`text-left py-2 px-3 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    {t('security.tableStatus')}
                  </th>
                </tr>
              </thead>
              <tbody>
                {loginHistory.map((entry) => (
                  <tr
                    key={entry.id}
                    className={`border-b ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}
                  >
                    <td className={`py-2 px-3 ${isDarkMode ? 'text-gray-300' : 'text-gray-900'}`}>
                      {formatDate(entry.login_at)}
                    </td>
                    <td className={`py-2 px-3 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                      {entry.ip_address || t('security.unknownIp')}
                    </td>
                    <td className={`py-2 px-3 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                      {getBrowserInfo(entry.user_agent)}
                    </td>
                    <td className="py-2 px-3">
                      {entry.login_method === 'google' ? (
                        <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">
                          Google
                        </span>
                      ) : (
                        <span className={`px-2 py-1 text-xs rounded ${isDarkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-700'}`}>
                          {t('security.methodLocal')}
                        </span>
                      )}
                    </td>
                    <td className="py-2 px-3">
                      {entry.success ? (
                        <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded">
                          {t('security.statusSuccess')}
                        </span>
                      ) : (
                        <span className="px-2 py-1 bg-red-100 text-red-800 text-xs rounded">
                          {t('security.statusFailed')}
                          {entry.failure_reason && `: ${entry.failure_reason}`}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
