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
  is_current: boolean
}

interface LoginHistoryEntry {
  id: number
  login_at: string
  ip_address: string | null
  user_agent: string | null
  success: boolean
  failure_reason: string | null
  login_method: string | null
}

interface SecuritySettingsProps {
  isDarkMode: boolean
}

function SectionCard({ isDarkMode, children }: { isDarkMode: boolean; children: React.ReactNode }) {
  return (
    <div className={`rounded-2xl p-6 ${isDarkMode ? 'bg-[#0f172a]/60 border border-white/8' : 'bg-white border border-gray-200 shadow-sm'}`}>
      {children}
    </div>
  )
}

const IconMonitor = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
  </svg>
)

const IconGoogle = () => (
  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
  </svg>
)

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
    } catch {
      setError(t('security.loadError'))
    } finally {
      setLoadingSessions(false)
    }
  }

  const loadLoginHistory = async () => {
    try {
      setLoadingHistory(true)
      const data = await apiClient.get<LoginHistoryEntry[]>(`${API_ENDPOINTS.PROFILE_LOGIN_HISTORY}?limit=20`)
      setLoginHistory(data)
    } catch {
      // silent
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
      setTimeout(() => setSuccess(null), 3000)
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
      await apiClient.post(API_ENDPOINTS.PROFILE_REVOKE_ALL_SESSIONS, {})
      await apiClient.post(API_ENDPOINTS.AUTH_LOGOUT, {})
      window.location.href = '/'
    } catch {
      setError(t('security.revokeAllError'))
    }
  }

  const formatDate = (dateString: string) => new Date(dateString).toLocaleString('sk-SK')

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
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
          <svg className="w-4 h-4 shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" /></svg>
          {error}
        </div>
      )}
      {success && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-green-500/10 border border-green-500/20 text-green-400 text-sm">
          <svg className="w-4 h-4 shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
          {success}
        </div>
      )}

      {/* Active Sessions */}
      <SectionCard isDarkMode={isDarkMode}>
        <div className="flex items-center justify-between mb-2">
          <div>
            <h3 className={`text-base font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
              {t('security.activeSessions')}
            </h3>
            <p className={`text-sm mt-0.5 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
              {t('security.activeSessionsDesc')}
            </p>
          </div>
          {sessions.length > 1 && (
            <button
              onClick={handleRevokeAllSessions}
              className="px-4 py-2 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 text-sm font-medium transition-colors"
            >
              {t('security.revokeAll')}
            </button>
          )}
        </div>

        <div className="mt-5">
          {loadingSessions ? (
            <div className="flex justify-center py-8">
              <div className="w-5 h-5 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : sessions.length === 0 ? (
            <p className={`text-sm text-center py-6 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
              {t('security.noSessions')}
            </p>
          ) : (
            <div className="space-y-3">
              {sessions.map((session) => (
                <div
                  key={session.id}
                  className={`flex items-center justify-between p-4 rounded-xl border ${
                    session.is_current
                      ? isDarkMode
                        ? 'bg-purple-500/10 border-purple-500/20'
                        : 'bg-purple-50 border-purple-200'
                      : isDarkMode
                        ? 'bg-white/3 border-white/6'
                        : 'bg-gray-50 border-gray-200'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                      session.is_current
                        ? 'bg-purple-500/20 text-purple-400'
                        : isDarkMode ? 'bg-white/8 text-gray-400' : 'bg-gray-200 text-gray-500'
                    }`}>
                      <IconMonitor />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className={`text-sm font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                          {getBrowserInfo(session.user_agent)}
                        </span>
                        {session.is_current && (
                          <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-green-500/15 text-green-400">
                            {t('security.currentSession')}
                          </span>
                        )}
                      </div>
                      <div className={`text-xs mt-0.5 space-x-3 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                        <span>{session.ip_address || t('security.unknownIp')}</span>
                        <span>·</span>
                        <span>{t('security.lastActivity')}: {formatDate(session.last_used_at)}</span>
                      </div>
                    </div>
                  </div>
                  {!session.is_current && (
                    <button
                      onClick={() => handleRevokeSession(session.id)}
                      className="px-3 py-1.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 text-xs font-medium transition-colors"
                    >
                      {t('security.revokeSession')}
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </SectionCard>

      {/* Login History */}
      <SectionCard isDarkMode={isDarkMode}>
        <div className="mb-5">
          <h3 className={`text-base font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
            {t('security.loginHistory')}
          </h3>
          <p className={`text-sm mt-0.5 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
            {t('security.loginHistoryDesc')}
          </p>
        </div>

        {loadingHistory ? (
          <div className="flex justify-center py-8">
            <div className="w-5 h-5 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : loginHistory.length === 0 ? (
          <p className={`text-sm text-center py-6 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
            {t('security.noHistory')}
          </p>
        ) : (
          <div className={`rounded-xl overflow-hidden border ${isDarkMode ? 'border-white/8' : 'border-gray-200'}`}>
            <table className="w-full">
              <thead>
                <tr className={`border-b text-xs font-semibold uppercase tracking-wide ${isDarkMode ? 'border-white/8 bg-white/3 text-gray-400' : 'border-gray-200 bg-gray-50 text-gray-500'}`}>
                  <th className="text-left py-3 px-4">{t('security.tableDate')}</th>
                  <th className="text-left py-3 px-4">{t('security.tableIp')}</th>
                  <th className="text-left py-3 px-4">{t('security.tableBrowser')}</th>
                  <th className="text-left py-3 px-4">{t('security.tableMethod')}</th>
                  <th className="text-left py-3 px-4">{t('security.tableStatus')}</th>
                </tr>
              </thead>
              <tbody>
                {loginHistory.map((entry) => (
                  <tr key={entry.id} className={`border-b last:border-b-0 text-sm ${isDarkMode ? 'border-white/5 hover:bg-white/3' : 'border-gray-100 hover:bg-gray-50'}`}>
                    <td className={`py-3 px-4 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                      {formatDate(entry.login_at)}
                    </td>
                    <td className={`py-3 px-4 font-mono text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                      {entry.ip_address || '—'}
                    </td>
                    <td className={`py-3 px-4 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                      {getBrowserInfo(entry.user_agent)}
                    </td>
                    <td className="py-3 px-4">
                      {entry.login_method === 'google' ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-blue-500/10 text-blue-400 border border-blue-500/20">
                          <IconGoogle />Google
                        </span>
                      ) : (
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${isDarkMode ? 'bg-white/8 text-gray-300' : 'bg-gray-100 text-gray-600'}`}>
                          {t('security.methodLocal')}
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      {entry.success ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-green-500/10 text-green-400 border border-green-500/20">
                          <span className="w-1.5 h-1.5 rounded-full bg-green-400" />
                          {t('security.statusSuccess')}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-red-500/10 text-red-400 border border-red-500/20">
                          <span className="w-1.5 h-1.5 rounded-full bg-red-400" />
                          {t('security.statusFailed')}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>
    </div>
  )
}
