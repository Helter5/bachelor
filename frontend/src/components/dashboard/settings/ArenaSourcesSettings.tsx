import { useState, useEffect } from 'react'
import { apiClient } from '@/services/apiClient'
import { API_ENDPOINTS } from '@/config/api'

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

export function ArenaSourcesSettings({ isDarkMode }: ArenaSourcesSettingsProps) {
  const [arenaSources, setArenaSources] = useState<ArenaSource[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [editingSource, setEditingSource] = useState<ArenaSource | null>(null)
  const [isAddingNew, setIsAddingNew] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    host: 'host.docker.internal',
    port: 8080,
    client_id: '',
    client_secret: '',
    api_key: ''
  })

  useEffect(() => {
    loadArenaSources()
  }, [])

  const loadArenaSources = async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await apiClient.get<ArenaSource[]>(API_ENDPOINTS.ARENA_SOURCES)
      setArenaSources(data)
    } catch (err) {
      console.error('Error loading arena sources:', err)
      setError('Nepodarilo sa načítať Arena zdroje')
    } finally {
      setLoading(false)
    }
  }

  const handleAddNew = () => {
    setIsAddingNew(true)
    setEditingSource(null)
    setFormData({ name: '', host: 'host.docker.internal', port: 8080, client_id: '', client_secret: '', api_key: '' })
  }

  const handleLoadDefault = () => {
    setIsAddingNew(true)
    setEditingSource(null)
    setFormData({ name: 'Lokálny Arena Server', host: 'host.docker.internal', port: 8080, client_id: '', client_secret: '', api_key: '' })
  }

  const handleEdit = (source: ArenaSource) => {
    setEditingSource(source)
    setIsAddingNew(false)
    setFormData({
      name: source.name,
      host: source.host,
      port: source.port,
      client_id: source.client_id || '',
      client_secret: source.client_secret || '',
      api_key: source.api_key || ''
    })
  }

  const handleCancel = () => {
    setIsAddingNew(false)
    setEditingSource(null)
    setFormData({ name: '', host: 'host.docker.internal', port: 8080, client_id: '', client_secret: '', api_key: '' })
  }

  const handleSave = async () => {
    try {
      if (editingSource) {
        // Update existing source
        await apiClient.put(`${API_ENDPOINTS.ARENA_SOURCES}/${editingSource.id}`, formData)
      } else {
        // Create new source
        await apiClient.post(API_ENDPOINTS.ARENA_SOURCES, formData)
      }
      await loadArenaSources()
      handleCancel()
    } catch (err) {
      console.error('Error saving arena source:', err)
      setError('Nepodarilo sa uložiť Arena zdroj')
    }
  }

  const handleDelete = async (id: number) => {
    if (!confirm('Naozaj chcete odstrániť tento Arena zdroj?')) return

    try {
      await apiClient.delete(`${API_ENDPOINTS.ARENA_SOURCES}/${id}`)
      await loadArenaSources()
    } catch (err) {
      console.error('Error deleting arena source:', err)
      setError('Nepodarilo sa odstrániť Arena zdroj')
    }
  }

  const handleToggle = async (id: number) => {
    try {
      await apiClient.post(`${API_ENDPOINTS.ARENA_SOURCES}/${id}/toggle`, {})
      await loadArenaSources()
    } catch (err) {
      console.error('Error toggling arena source:', err)
      setError('Nepodarilo sa zmeniť stav Arena zdroja')
    }
  }

  const handleTest = async (id: number) => {
    try {
      const result = await apiClient.post<{ success: boolean; message: string; events_count?: number }>(
        `${API_ENDPOINTS.ARENA_SOURCES}/${id}/test`,
        {}
      )
      if (result.success) {
        alert(`✅ Úspešné pripojenie!\n\nPočet eventov: ${result.events_count}`)
      } else {
        alert(`❌ Neúspešné pripojenie\n\n${result.message}`)
      }
    } catch (err: any) {
      console.error('Error testing arena source:', err)
      alert(`❌ Chyba pripojenia\n\n${err.message || 'Neznáma chyba'}`)
    }
  }

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Nikdy'
    return new Date(dateString).toLocaleString('sk-SK')
  }

  return (
    <div>
      <div className={`rounded-lg p-6 mb-6 ${isDarkMode ? 'bg-gray-800' : 'bg-white shadow'}`}>
        <div className="flex justify-between items-center mb-4">
          <h3 className={`text-xl font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
            Arena Zdroje
          </h3>
          <div className="flex gap-2">
            <button
              onClick={handleLoadDefault}
              disabled={isAddingNew || editingSource !== null}
              className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Načítať predvolený
            </button>
            <button
              onClick={handleAddNew}
              disabled={isAddingNew || editingSource !== null}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              + Pridať nový zdroj
            </button>
          </div>
        </div>

        <p className={`text-sm mb-4 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
          Konfigurácia Arena inštancií, z ktorých sa budú synchronizovať dáta. Môžete pridať viacero trénerských Arena Docker inštancií.
        </p>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        {/* Add/Edit Form */}
        {(isAddingNew || editingSource) && (
          <div className={`p-4 rounded mb-4 ${isDarkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
            <h4 className={`font-semibold mb-3 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
              {editingSource ? 'Upraviť Arena zdroj' : 'Pridať nový Arena zdroj'}
            </h4>

            <div className="grid grid-cols-1 gap-4 mb-4">
              <div>
                <label className={`block text-sm font-medium mb-1 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  Názov
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Napr. Tréner Bratislava"
                  className={`w-full px-3 py-2 rounded border ${
                    isDarkMode
                      ? 'bg-gray-600 border-gray-500 text-white'
                      : 'bg-white border-gray-300 text-gray-900'
                  }`}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div>
                <label className={`block text-sm font-medium mb-1 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  Host
                </label>
                <input
                  type="text"
                  value={formData.host}
                  onChange={(e) => setFormData({ ...formData, host: e.target.value })}
                  placeholder="host.docker.internal"
                  className={`w-full px-3 py-2 rounded border ${
                    isDarkMode
                      ? 'bg-gray-600 border-gray-500 text-white'
                      : 'bg-white border-gray-300 text-gray-900'
                  }`}
                />
              </div>

              <div>
                <label className={`block text-sm font-medium mb-1 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  Port
                </label>
                <input
                  type="number"
                  value={formData.port}
                  onChange={(e) => setFormData({ ...formData, port: parseInt(e.target.value) || 8080 })}
                  placeholder="8080"
                  className={`w-full px-3 py-2 rounded border ${
                    isDarkMode
                      ? 'bg-gray-600 border-gray-500 text-white'
                      : 'bg-white border-gray-300 text-gray-900'
                  }`}
                />
              </div>

              <div>
                <label className={`block text-sm font-medium mb-1 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  API Key
                </label>
                <input
                  type="text"
                  value={formData.api_key}
                  onChange={(e) => setFormData({ ...formData, api_key: e.target.value })}
                  placeholder="API key"
                  className={`w-full px-3 py-2 rounded border ${
                    isDarkMode
                      ? 'bg-gray-600 border-gray-500 text-white'
                      : 'bg-white border-gray-300 text-gray-900'
                  }`}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-2">
              <div>
                <label className={`block text-sm font-medium mb-1 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  Client ID
                </label>
                <input
                  type="text"
                  value={formData.client_id}
                  onChange={(e) => setFormData({ ...formData, client_id: e.target.value })}
                  placeholder="OAuth client ID"
                  className={`w-full px-3 py-2 rounded border ${
                    isDarkMode
                      ? 'bg-gray-600 border-gray-500 text-white'
                      : 'bg-white border-gray-300 text-gray-900'
                  }`}
                />
              </div>

              <div>
                <label className={`block text-sm font-medium mb-1 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  Client Secret
                </label>
                <input
                  type="text"
                  value={formData.client_secret}
                  onChange={(e) => setFormData({ ...formData, client_secret: e.target.value })}
                  placeholder="OAuth client secret"
                  className={`w-full px-3 py-2 rounded border ${
                    isDarkMode
                      ? 'bg-gray-600 border-gray-500 text-white'
                      : 'bg-white border-gray-300 text-gray-900'
                  }`}
                />
              </div>
            </div>

            <div className={`text-xs rounded p-3 mb-4 ${isDarkMode ? 'bg-gray-600 text-gray-300' : 'bg-blue-50 text-blue-800'}`}>
              <strong>Kde nájsť credentials v Arena:</strong>
              <ul className="mt-1 space-y-1 list-disc list-inside">
                <li><strong>Client ID</strong> a <strong>Client Secret</strong>: Settings → Apps → vyber aplikáciu → <em>App ID</em> = Client ID, <em>Secret</em> = Client Secret</li>
                <li><strong>API Key</strong>: Settings → Users → vyber používateľa → <em>API Key</em></li>
              </ul>
            </div>

            <div className="flex gap-2">
              <button
                onClick={handleSave}
                className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
              >
                Uložiť
              </button>
              <button
                onClick={handleCancel}
                className={`px-4 py-2 rounded ${
                  isDarkMode ? 'bg-gray-600 hover:bg-gray-500' : 'bg-gray-200 hover:bg-gray-300'
                }`}
              >
                Zrušiť
              </button>
            </div>
          </div>
        )}

        {/* Sources List */}
        {loading ? (
          <div className="text-center py-8">
            <div className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>Načítavam...</div>
          </div>
        ) : arenaSources.length === 0 ? (
          <div className="text-center py-8">
            <div className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>
              Zatiaľ nemáte nakonfigurované žiadne Arena zdroje
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {arenaSources.map((source) => (
              <div
                key={source.id}
                className={`p-4 rounded border ${
                  isDarkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-200'
                }`}
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span className={`font-semibold text-lg ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                        {source.name}
                      </span>
                      <span className={`font-mono text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                        ({source.host}:{source.port})
                      </span>
                      <span
                        className={`px-2 py-1 rounded text-xs font-medium ${
                          source.is_enabled
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {source.is_enabled ? 'Aktívny' : 'Neaktívny'}
                      </span>
                    </div>
                    <div className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                      <div>Posledná synchronizácia: {formatDate(source.last_sync_at)}</div>
                      {source.api_key && (
                        <div className="mt-1">API Key: {source.api_key.substring(0, 20)}...</div>
                      )}
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => handleTest(source.id)}
                      className="px-3 py-1 text-sm bg-purple-600 text-white rounded hover:bg-purple-700"
                      title="Otestovať pripojenie"
                    >
                      Test
                    </button>
                    <button
                      onClick={() => handleToggle(source.id)}
                      className={`px-3 py-1 text-sm rounded ${
                        source.is_enabled
                          ? 'bg-yellow-600 text-white hover:bg-yellow-700'
                          : 'bg-green-600 text-white hover:bg-green-700'
                      }`}
                    >
                      {source.is_enabled ? 'Deaktivovať' : 'Aktivovať'}
                    </button>
                    <button
                      onClick={() => handleEdit(source)}
                      disabled={isAddingNew || editingSource !== null}
                      className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                    >
                      Upraviť
                    </button>
                    <button
                      onClick={() => handleDelete(source.id)}
                      className="px-3 py-1 text-sm bg-red-600 text-white rounded hover:bg-red-700"
                    >
                      Odstrániť
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
