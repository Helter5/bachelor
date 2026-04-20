import { useState, useEffect, useCallback, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { apiClient } from '@/services/apiClient'
import { API_ENDPOINTS } from '@/config/api'

interface SyncLog {
  id: number
  user_id: number
  arena_source_id: number | null
  started_at: string
  finished_at: string | null
  status: string
  duration_seconds: number | null
  events_created: number
  events_updated: number
  athletes_created: number
  athletes_updated: number
  teams_created: number
  teams_updated: number
  weight_categories_created: number
  weight_categories_updated: number
  fights_created: number
  fights_updated: number
  error_message: string | null
  details: Record<string, unknown> | null
  ip_address: string | null
  username: string | null
  arena_source_name: string | null
}

interface SyncLogsProps {
  isDarkMode: boolean
}

export function SyncLogs({ isDarkMode }: SyncLogsProps) {
  const { t } = useTranslation()
  const [logs, setLogs] = useState<SyncLog[]>([])
  const [selectedLog, setSelectedLog] = useState<SyncLog | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadLogs = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await apiClient.get<SyncLog[]>(`${API_ENDPOINTS.SYNC_LOGS}?limit=10`)
      setLogs(data)
    } catch (err) {
      console.error('Error loading sync logs:', err)
      setError(t('syncLogs.loadError'))
    } finally {
      setLoading(false)
    }
  }, [t])

  useEffect(() => {
    void loadLogs()
  }, [loadLogs])

  const loadLogDetail = async (logId: number) => {
    try {
      const data = await apiClient.get<SyncLog>(API_ENDPOINTS.SYNC_LOG_DETAIL(logId))
      setSelectedLog(data)
    } catch (err) {
      console.error('Error loading log detail:', err)
      setError(t('syncLogs.detailLoadError'))
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('sk-SK')
  }

  const formatDuration = (seconds: number | null) => {
    if (seconds === null) return '-'
    if (seconds < 60) return `${seconds}s`
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return `${minutes}m ${remainingSeconds}s`
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success':
        return 'bg-green-100 text-green-800'
      case 'failed':
        return 'bg-red-100 text-red-800'
      case 'in_progress':
        return 'bg-blue-100 text-blue-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'success':
        return t('syncLogs.statusSuccess')
      case 'failed':
        return t('syncLogs.statusFailed')
      case 'in_progress':
        return t('syncLogs.statusInProgress')
      default:
        return status
    }
  }

  const getTotalRecords = (log: SyncLog) => {
    return (
      log.events_created +
      log.events_updated +
      log.athletes_created +
      log.athletes_updated +
      log.teams_created +
      log.teams_updated +
      log.weight_categories_created +
      log.weight_categories_updated +
      log.fights_created +
      log.fights_updated
    )
  }

  const DetailField = ({ label, value }: { label: string; value: ReactNode }) => (
    <div>
      <div className={`text-sm font-medium ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
        {label}
      </div>
      <div className={`text-lg ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
        {value}
      </div>
    </div>
  )

  const StatCard = ({ label, value }: { label: string; value: ReactNode }) => (
    <div className={`p-4 rounded ${isDarkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
      <div className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>{label}</div>
      <div className={`text-xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{value}</div>
    </div>
  )

  const StatusPill = ({ status }: { status: string }) => (
    <span className={`px-3 py-1 rounded text-sm ${getStatusColor(status)}`}>
      {getStatusText(status)}
    </span>
  )

  return (
    <div className="space-y-6">
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      {/* Logs List */}
      <div className={`rounded-lg p-6 ${isDarkMode ? 'bg-gray-800' : 'bg-white shadow'}`}>
        <h3 className={`text-xl font-semibold mb-4 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
          {t('syncLogs.title')}
        </h3>

        <p className={`text-sm mb-4 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
          {t('syncLogs.desc')}
        </p>

        {loading ? (
          <div className="text-center py-8">
            <div className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>{t('syncLogs.loading')}</div>
          </div>
        ) : logs.length === 0 ? (
          <div className="text-center py-8">
            <div className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>{t('syncLogs.empty')}</div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className={`border-b ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
                  <th className={`text-left py-2 px-3 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    {t('syncLogs.tableDate')}
                  </th>
                  <th className={`text-left py-2 px-3 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    {t('syncLogs.tableUser')}
                  </th>
                  <th className={`text-left py-2 px-3 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    {t('syncLogs.tableStatus')}
                  </th>
                  <th className={`text-left py-2 px-3 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    {t('syncLogs.tableDuration')}
                  </th>
                  <th className={`text-left py-2 px-3 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    {t('syncLogs.tableTotal')}
                  </th>
                  <th className={`text-left py-2 px-3 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    {t('syncLogs.tableAction')}
                  </th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr
                    key={log.id}
                    className={`border-b ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}
                  >
                    <td className={`py-2 px-3 ${isDarkMode ? 'text-gray-300' : 'text-gray-900'}`}>
                      {formatDate(log.started_at)}
                    </td>
                    <td className={`py-2 px-3 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                      {log.username || t('syncLogs.unknownUser')}
                    </td>
                    <td className="py-2 px-3">
                      <span className={`px-2 py-1 rounded text-xs ${getStatusColor(log.status)}`}>
                        {getStatusText(log.status)}
                      </span>
                    </td>
                    <td className={`py-2 px-3 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                      {formatDuration(log.duration_seconds)}
                    </td>
                    <td className={`py-2 px-3 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                      {getTotalRecords(log)}
                    </td>
                    <td className="py-2 px-3">
                      <button
                        onClick={() => loadLogDetail(log.id)}
                        className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
                      >
                        {t('common.detail')}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Log Detail Modal */}
      {selectedLog && (
        <div className="fixed inset-0 backdrop-blur-sm bg-black/30 flex items-center justify-center z-50 p-4">
          <div className={`max-w-4xl w-full max-h-[90vh] overflow-y-auto rounded-lg ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`}>
            <div className={`sticky top-0 p-6 border-b ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
              <div className="flex justify-between items-center">
                <h3 className={`text-2xl font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                  {t('syncLogs.detailTitle', { id: selectedLog.id })}
                </h3>
                <button
                  onClick={() => setSelectedLog(null)}
                  className={`text-2xl ${isDarkMode ? 'text-gray-400 hover:text-gray-200' : 'text-gray-600 hover:text-gray-900'}`}
                >
                  ×
                </button>
              </div>
            </div>

            <div className="p-6 space-y-6">
              {/* Overview */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <DetailField
                  label={t('syncLogs.detailUser')}
                  value={<>{selectedLog.username || t('syncLogs.unknownUser')} {selectedLog.ip_address && `(${selectedLog.ip_address})`}</>}
                />
                <DetailField
                  label={t('syncLogs.detailSource')}
                  value={selectedLog.arena_source_name || t('syncLogs.detailAllSources')}
                />
                <DetailField
                  label={t('syncLogs.detailStart')}
                  value={formatDate(selectedLog.started_at)}
                />
                <DetailField
                  label={t('syncLogs.detailEnd')}
                  value={selectedLog.finished_at ? formatDate(selectedLog.finished_at) : t('syncLogs.detailInProgress')}
                />
                <DetailField
                  label={t('syncLogs.detailDuration')}
                  value={formatDuration(selectedLog.duration_seconds)}
                />
                <DetailField
                  label={t('syncLogs.detailStatus')}
                  value={<StatusPill status={selectedLog.status} />}
                />
              </div>

              {/* Statistics */}
              <div>
                <h4 className={`text-lg font-semibold mb-3 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                  {t('syncLogs.statsTitle')}
                </h4>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <StatCard label={t('syncLogs.statsEvents')} value={<>+{selectedLog.events_created} / ~{selectedLog.events_updated}</>} />
                  <StatCard label={t('syncLogs.statsAthletes')} value={<>+{selectedLog.athletes_created} / ~{selectedLog.athletes_updated}</>} />
                  <StatCard label={t('syncLogs.statsTeams')} value={<>+{selectedLog.teams_created} / ~{selectedLog.teams_updated}</>} />
                  <StatCard label={t('syncLogs.statsCategories')} value={<>+{selectedLog.weight_categories_created} / ~{selectedLog.weight_categories_updated}</>} />
                  <StatCard label={t('syncLogs.statsFights')} value={<>+{selectedLog.fights_created} / ~{selectedLog.fights_updated}</>} />
                </div>
                <div className={`text-xs mt-2 ${isDarkMode ? 'text-gray-500' : 'text-gray-500'}`}>
                  {t('syncLogs.statsLegend')}
                </div>
              </div>

              {/* Error Message */}
              {selectedLog.error_message && (
                <div>
                  <h4 className={`text-lg font-semibold mb-3 text-red-600`}>
                    {t('syncLogs.errorTitle')}
                  </h4>
                  <div className={`p-4 rounded bg-red-50 border border-red-200`}>
                    <code className="text-sm text-red-900">{selectedLog.error_message}</code>
                  </div>
                </div>
              )}

              {/* Details */}
              {selectedLog.details && (
                <div>
                  <h4 className={`text-lg font-semibold mb-3 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                    {t('syncLogs.detailsTitle')}
                  </h4>
                  <div className={`rounded divide-y ${isDarkMode ? 'bg-gray-700 divide-gray-600' : 'bg-gray-50 divide-gray-200'}`}>
                    {selectedLog.details.source_name != null && (
                      <div className="flex justify-between px-4 py-2">
                        <span className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>{t('syncLogs.detailsSourceName')}</span>
                        <span className={`text-sm font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{String(selectedLog.details.source_name)}</span>
                      </div>
                    )}
                    {selectedLog.details.host != null && (
                      <div className="flex justify-between px-4 py-2">
                        <span className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>{t('syncLogs.detailsHost')}</span>
                        <span className={`text-sm font-medium font-mono ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{String(selectedLog.details.host)}</span>
                      </div>
                    )}
                    {selectedLog.details.total_events != null && (
                      <div className="flex justify-between px-4 py-2">
                        <span className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>{t('syncLogs.detailsEventsCount')}</span>
                        <span className={`text-sm font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{String(selectedLog.details.total_events)}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Close Button */}
              <div className="flex justify-end">
                <button
                  onClick={() => setSelectedLog(null)}
                  className={`px-6 py-2 rounded ${isDarkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-200 hover:bg-gray-300'}`}
                >
                  {t('syncLogs.close')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
