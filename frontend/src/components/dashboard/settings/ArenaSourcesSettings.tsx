import { useState, useEffect, useCallback } from "react"
import { useTranslation } from "react-i18next"
import { apiClient } from "@/services/apiClient"
import { API_ENDPOINTS } from "@/config/api"
import { Toast } from "../../ui/Toast"
import { ErrorAlert } from "../../ui/ErrorAlert"

interface ArenaSource {
  id: number
  name: string
  host: string
  port: number
  client_id: string | null
  client_secret: string | null
  api_key: string | null
  is_enabled: boolean
  last_sync_at: string | null
  created_at: string
}

interface ArenaSourcesSettingsProps {
  isDarkMode: boolean
}

function SectionCard({ isDarkMode, children }: { isDarkMode: boolean; children: React.ReactNode }) {
  return (
    <div className={`rounded-2xl p-6 ${isDarkMode ? 'bg-[#0f172a]/60 border border-white/8' : 'bg-white border border-gray-200 shadow-sm'}`}>
      {children}
    </div>
  )
}

function FormInput({
  isDarkMode, label, type = 'text', value, onChange, placeholder,
}: {
  isDarkMode: boolean; label: string; type?: string; value: string | number
  onChange: (v: string) => void; placeholder?: string
}) {
  return (
    <div>
      <label className={`block text-xs font-medium mb-1.5 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={`w-full px-3.5 py-2.5 rounded-xl text-sm border transition-colors outline-none focus:ring-2 ${
          isDarkMode
            ? 'bg-white/5 border-white/10 text-white placeholder-gray-500 focus:border-purple-500/50 focus:ring-purple-500/10'
            : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400 focus:border-purple-400 focus:ring-purple-100'
        }`}
      />
    </div>
  )
}

export function ArenaSourcesSettings({ isDarkMode }: ArenaSourcesSettingsProps) {
  const { t } = useTranslation()
  const [arenaSources, setArenaSources] = useState<ArenaSource[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [editingSource, setEditingSource] = useState<ArenaSource | null>(null)
  const [isAddingNew, setIsAddingNew] = useState(false)
  const [pendingDeleteId, setPendingDeleteId] = useState<number | null>(null)
  const [toast, setToast] = useState<{ show: boolean; variant: "success" | "error" | "warning"; title: string; message?: string }>({
    show: false, variant: "success", title: "",
  })
  const [formData, setFormData] = useState({ name: "", host: "host.docker.internal", port: 8080, client_id: "", client_secret: "", api_key: "" })

  const loadArenaSources = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await apiClient.get<ArenaSource[]>(API_ENDPOINTS.ARENA_SOURCES)
      setArenaSources(data)
    } catch {
      setError(t("arenaSources.loadError"))
    } finally {
      setLoading(false)
    }
  }, [t])

  useEffect(() => { void loadArenaSources() }, [loadArenaSources])

  const handleAddNew = () => {
    setIsAddingNew(true)
    setEditingSource(null)
    setFormData({ name: "", host: "host.docker.internal", port: 8080, client_id: "", client_secret: "", api_key: "" })
  }

  const handleLoadDefault = () => {
    setIsAddingNew(true)
    setEditingSource(null)
    setFormData({ name: t("arenaSources.defaultName"), host: "host.docker.internal", port: 8080, client_id: "", client_secret: "", api_key: "" })
  }

  const handleEdit = (source: ArenaSource) => {
    setEditingSource(source)
    setIsAddingNew(false)
    setFormData({ name: source.name, host: source.host, port: source.port, client_id: source.client_id || "", client_secret: source.client_secret || "", api_key: source.api_key || "" })
  }

  const handleCancel = () => {
    setIsAddingNew(false)
    setEditingSource(null)
    setFormData({ name: "", host: "host.docker.internal", port: 8080, client_id: "", client_secret: "", api_key: "" })
  }

  const handleSave = async () => {
    try {
      if (editingSource) {
        await apiClient.put(`${API_ENDPOINTS.ARENA_SOURCES}/${editingSource.id}`, formData)
      } else {
        await apiClient.post(API_ENDPOINTS.ARENA_SOURCES, formData)
      }
      await loadArenaSources()
      handleCancel()
    } catch {
      setError(t("arenaSources.saveError"))
    }
  }

  const handleDelete = async (id: number) => {
    try {
      await apiClient.delete(`${API_ENDPOINTS.ARENA_SOURCES}/${id}`)
      setPendingDeleteId(null)
      await loadArenaSources()
    } catch {
      setError(t("arenaSources.deleteError"))
    }
  }

  const handleToggle = async (id: number) => {
    try {
      await apiClient.post(`${API_ENDPOINTS.ARENA_SOURCES}/${id}/toggle`, {})
      await loadArenaSources()
    } catch {
      setError(t("arenaSources.toggleError"))
    }
  }

  const handleTest = async (id: number) => {
    try {
      const result = await apiClient.post<{ success: boolean; message: string; events_count?: number }>(
        `${API_ENDPOINTS.ARENA_SOURCES}/${id}/test`, {}
      )
      setToast({
        show: true,
        variant: result.success ? "success" : "error",
        title: result.success ? t("arenaSources.testSuccess") : t("arenaSources.testFailed"),
        message: result.success ? t("arenaSources.testEventsCount", { count: result.events_count }) : result.message,
      })
    } catch (err) {
      setToast({ show: true, variant: "error", title: t("arenaSources.testError"), message: err instanceof Error ? err.message : String(err) })
    }
  }

  const formatDate = (dateString: string | null) => {
    if (!dateString) return t("arenaSources.never")
    return new Date(dateString).toLocaleString("sk-SK")
  }

  const formOpen = isAddingNew || editingSource !== null

  return (
    <div className="space-y-6">
      <SectionCard isDarkMode={isDarkMode}>
        {/* Header */}
        <div className="flex items-start justify-between mb-2">
          <div>
            <h3 className={`text-base font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
              {t("arenaSources.title")}
            </h3>
            <p className={`text-sm mt-0.5 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
              {t("arenaSources.description")}
            </p>
          </div>
          <div className="flex gap-2 ml-4">
            <button
              onClick={handleLoadDefault}
              disabled={formOpen}
              className={`px-3.5 py-2 rounded-xl text-sm font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
                isDarkMode
                  ? 'bg-white/8 hover:bg-white/12 text-gray-300 border border-white/8'
                  : 'bg-gray-100 hover:bg-gray-200 text-gray-700 border border-gray-200'
              }`}
            >
              {t("arenaSources.loadDefault")}
            </button>
            <button
              onClick={handleAddNew}
              disabled={formOpen}
              className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {t("arenaSources.addNew")}
            </button>
          </div>
        </div>

        {error && <ErrorAlert message={error} isDarkMode={isDarkMode} className="mt-4" />}

        {/* Add/Edit Form */}
        {formOpen && (
          <div className={`mt-5 p-5 rounded-xl border ${isDarkMode ? 'bg-white/3 border-white/8' : 'bg-gray-50 border-gray-200'}`}>
            <h4 className={`text-sm font-semibold mb-4 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
              {editingSource ? t("arenaSources.editFormTitle") : t("arenaSources.addFormTitle")}
            </h4>

            <div className="space-y-4">
              <FormInput isDarkMode={isDarkMode} label={t("arenaSources.nameLabel")} value={formData.name}
                onChange={(v) => setFormData({ ...formData, name: v })} placeholder={t("arenaSources.namePlaceholder")} />

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="sm:col-span-2">
                  <FormInput isDarkMode={isDarkMode} label={t("arenaSources.hostLabel")} value={formData.host}
                    onChange={(v) => setFormData({ ...formData, host: v })} placeholder="host.docker.internal" />
                </div>
                <FormInput isDarkMode={isDarkMode} label={t("arenaSources.portLabel")} type="number" value={formData.port}
                  onChange={(v) => setFormData({ ...formData, port: parseInt(v) || 8080 })} placeholder="8080" />
              </div>

              <FormInput isDarkMode={isDarkMode} label={t("arenaSources.apiKeyLabel")} value={formData.api_key}
                onChange={(v) => setFormData({ ...formData, api_key: v })} placeholder="API key" />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormInput isDarkMode={isDarkMode} label={t("arenaSources.clientIdLabel")} value={formData.client_id}
                  onChange={(v) => setFormData({ ...formData, client_id: v })} placeholder="OAuth client ID" />
                <FormInput isDarkMode={isDarkMode} label={t("arenaSources.clientSecretLabel")} value={formData.client_secret}
                  onChange={(v) => setFormData({ ...formData, client_secret: v })} placeholder="OAuth client secret" />
              </div>

              <div className={`text-xs rounded-xl p-3 ${isDarkMode ? 'bg-blue-500/10 border border-blue-500/20 text-blue-300' : 'bg-blue-50 border border-blue-200 text-blue-700'}`}>
                <p className="font-semibold mb-1">{t("arenaSources.credentialsHint")}</p>
                <ul className="space-y-0.5 list-disc list-inside text-xs opacity-90">
                  <li><strong>Client ID</strong> + <strong>Secret</strong>: Settings → Apps → App ID / Secret</li>
                  <li><strong>API Key</strong>: Settings → Users → API Key</li>
                </ul>
              </div>

              <div className="flex gap-2 pt-1">
                <button onClick={handleSave}
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium transition-colors">
                  {t("arenaSources.save")}
                </button>
                <button onClick={handleCancel}
                  className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${isDarkMode ? 'bg-white/8 hover:bg-white/12 text-gray-300' : 'bg-gray-200 hover:bg-gray-300 text-gray-700'}`}>
                  {t("arenaSources.cancel")}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Sources List */}
        <div className="mt-5">
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="w-5 h-5 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : arenaSources.length === 0 ? (
            <div className={`text-center py-10 rounded-xl border-2 border-dashed ${isDarkMode ? 'border-white/10 text-gray-500' : 'border-gray-200 text-gray-400'}`}>
              <svg className="w-10 h-10 mx-auto mb-3 opacity-40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2" />
              </svg>
              <p className="text-sm">{t("arenaSources.empty")}</p>
            </div>
          ) : (
            <div className="space-y-3">
              {arenaSources.map((source) => (
                <div
                  key={source.id}
                  className={`p-4 rounded-xl border ${isDarkMode ? 'bg-white/3 border-white/8' : 'bg-gray-50 border-gray-200'}`}
                >
                  <div className="flex items-center justify-between gap-4">
                    {/* Left: info */}
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`w-9 h-9 shrink-0 rounded-xl flex items-center justify-center ${
                        source.is_enabled
                          ? 'bg-green-500/15 text-green-400'
                          : isDarkMode ? 'bg-white/8 text-gray-500' : 'bg-gray-200 text-gray-400'
                      }`}>
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2" />
                        </svg>
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`font-semibold text-sm ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{source.name}</span>
                          <span className={`font-mono text-xs ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>{source.host}:{source.port}</span>
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                            source.is_enabled
                              ? 'bg-green-500/12 text-green-400'
                              : 'bg-red-500/12 text-red-400'
                          }`}>
                            {source.is_enabled ? t("arenaSources.active") : t("arenaSources.inactive")}
                          </span>
                        </div>
                        <p className={`text-xs mt-0.5 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                          {t("arenaSources.lastSync")} {formatDate(source.last_sync_at)}
                        </p>
                      </div>
                    </div>

                    {/* Right: actions */}
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => handleTest(source.id)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border ${
                          isDarkMode
                            ? 'bg-blue-500/10 border-blue-500/20 text-blue-400 hover:bg-blue-500/20'
                            : 'bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100'
                        }`}
                      >
                        Test
                      </button>
                      <button
                        onClick={() => handleToggle(source.id)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border ${
                          source.is_enabled
                            ? isDarkMode
                              ? 'bg-yellow-500/10 border-yellow-500/20 text-yellow-400 hover:bg-yellow-500/20'
                              : 'bg-yellow-50 border-yellow-200 text-yellow-700 hover:bg-yellow-100'
                            : isDarkMode
                              ? 'bg-green-500/10 border-green-500/20 text-green-400 hover:bg-green-500/20'
                              : 'bg-green-50 border-green-200 text-green-700 hover:bg-green-100'
                        }`}
                      >
                        {source.is_enabled ? t("arenaSources.deactivate") : t("arenaSources.activate")}
                      </button>
                      <button
                        onClick={() => handleEdit(source)}
                        disabled={formOpen}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border disabled:opacity-40 disabled:cursor-not-allowed ${
                          isDarkMode
                            ? 'bg-blue-500/10 border-blue-500/20 text-blue-400 hover:bg-blue-500/20'
                            : 'bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100'
                        }`}
                      >
                        {t("arenaSources.editButton")}
                      </button>

                      {pendingDeleteId === source.id ? (
                        <div className="flex items-center gap-1.5">
                          <span className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>{t("arenaSources.confirmDelete")}</span>
                          <button onClick={() => handleDelete(source.id)}
                            className="px-3 py-1.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 text-xs font-medium">
                            {t("common.yes")}
                          </button>
                          <button onClick={() => setPendingDeleteId(null)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-medium ${isDarkMode ? 'bg-white/8 text-gray-300 hover:bg-white/12' : 'bg-gray-200 text-gray-600 hover:bg-gray-300'}`}>
                            {t("common.no")}
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setPendingDeleteId(source.id)}
                          className="px-3 py-1.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 text-xs font-medium transition-colors"
                        >
                          {t("arenaSources.deleteButton")}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </SectionCard>

      <Toast
        show={toast.show}
        variant={toast.variant}
        title={toast.title}
        message={toast.message}
        onClose={() => setToast((p) => ({ ...p, show: false }))}
      />
    </div>
  )
}
