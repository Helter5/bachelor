import { useState, useEffect } from "react"
import { useTranslation } from "react-i18next"
import { apiClient } from "@/services/apiClient"
import { API_ENDPOINTS, API_BASE_URL } from "@/config/api"
import { SearchInput } from "./SearchInput"

interface ExportPdfModalProps {
  isDarkMode: boolean
  isOpen: boolean
  onClose: () => void
  exportType: "teams" | "athletes" | null
}
interface Tournament {
  id: number
  name: string
  start_date: string
  end_date?: string
}

export function ExportPdfModal({ isDarkMode, isOpen, onClose, exportType }: ExportPdfModalProps) {
  const { t } = useTranslation()
  const [tournaments, setTournaments] = useState<Tournament[]>([])
  const [selectedTournament, setSelectedTournament] = useState<string>("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc")

  useEffect(() => {
    if (isOpen) {
      fetchTournaments()
      setSearchQuery("")
      setSelectedTournament("")
    }
  }, [isOpen])

  // Close modal on ESC key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose()
      }
    }

    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [isOpen, onClose])

  const fetchTournaments = async () => {
    try {
      setLoading(true)
      const data = await apiClient.get<{ items: Tournament[] }>(API_ENDPOINTS.SPORT_EVENT_DATABASE)
      setTournaments(data.items || [])
      setError(null)
    } catch (err) {
      console.error('Error fetching tournaments:', err)
      setError(t('exportPdf.loadError'))
    } finally {
      setLoading(false)
    }
  }

  const handlePreview = () => {
    if (!selectedTournament) return

    const endpoint = exportType === "teams" 
      ? API_ENDPOINTS.TEAM_SHOW(selectedTournament)
      : API_ENDPOINTS.ATHLETE_SHOW(selectedTournament)

    window.open(`${API_BASE_URL}${endpoint}`, '_blank')
  }

  const handleDownload = async () => {
    if (!selectedTournament) return

    try {
      const endpoint = exportType === "teams"
        ? API_ENDPOINTS.TEAM_PRINT(selectedTournament)
        : API_ENDPOINTS.ATHLETE_PRINT(selectedTournament)

      const blob = await apiClient.getBlob(endpoint)
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `${exportType}-list-${selectedTournament}.pdf`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Error downloading PDF:', error)
      alert(t('exportPdf.downloadError'))
    }
  }

  if (!isOpen) return null

  const title = exportType === "teams" ? t('exportPdf.teamsTitle') : t('exportPdf.athletesTitle')
  const description = exportType === "teams"
    ? t('exportPdf.teamsDesc')
    : t('exportPdf.athletesDesc')

  // Filter and sort tournaments
  const filteredTournaments = tournaments
    .filter(tournament => 
      tournament.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tournament.full_name?.toLowerCase().includes(searchQuery.toLowerCase())
    )
    .sort((a, b) => {
      const comparison = a.name.localeCompare(b.name)
      return sortOrder === "asc" ? comparison : -comparison
    })

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div 
        className={`relative w-full max-w-4xl h-[85vh] flex flex-col rounded-xl shadow-2xl ${
          isDarkMode ? 'bg-[#1e293b]' : 'bg-white'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className={`flex items-center justify-between p-6 ${
          isDarkMode ? 'shadow-inner' : 'shadow-sm'
        }`}>
          <div>
            <h2 className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
              {title}
            </h2>
            <p className={`mt-1 text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              {description}
            </p>
          </div>
          <button
            onClick={onClose}
            className={`p-2 rounded-lg transition-colors ${
              isDarkMode
                ? 'hover:bg-white/10 text-gray-400 hover:text-white'
                : 'hover:bg-gray-100 text-gray-600 hover:text-gray-900'
            }`}
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Search and Sort Bar */}
          <div className={`p-4 space-y-3 ${isDarkMode ? 'bg-[#0f172a]/50' : 'bg-gray-50'}`}>
            <div className="flex gap-3">
              {/* Search Input */}
              <SearchInput
                isDarkMode={isDarkMode}
                value={searchQuery}
                onChange={setSearchQuery}
                placeholder={t('exportPdf.searchPlaceholder')}
                className="flex-1"
              />

              {/* Sort Button */}
              <button
                onClick={() => setSortOrder(prev => prev === "asc" ? "desc" : "asc")}
                className={`px-4 py-2.5 rounded-lg font-medium transition-all flex items-center gap-2 ${
                  isDarkMode
                    ? 'bg-[#1e293b] text-gray-300 hover:bg-[#334155] shadow-lg'
                    : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'
                }`}
                title={sortOrder === "asc" ? t('exportPdf.sortAz') : t('exportPdf.sortZa')}
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  {sortOrder === "asc" ? (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12" />
                  ) : (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h13M3 8h9m-9 4h9m5-4v12m0 0l-4-4m4 4l4-4" />
                  )}
                </svg>
                {sortOrder === "asc" ? "A-Z" : "Z-A"}
              </button>
            </div>

            {/* Results Count */}
            <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              {loading ? t('exportPdf.loading') : `${filteredTournaments.length} ${filteredTournaments.length === 1 ? t('exportPdf.countOne') : filteredTournaments.length < 5 ? t('exportPdf.countFew') : t('exportPdf.countMany')}`}
            </p>
          </div>

          {/* Tournaments List */}
          <div className="flex-1 overflow-y-auto p-4">
            {loading ? (
              <div className={`p-8 text-center ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                <svg className="animate-spin h-8 w-8 mx-auto mb-2" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                {t('exportPdf.loadingTournaments')}
              </div>
            ) : error ? (
              <div className="p-8 text-center text-red-500">
                {error}
              </div>
            ) : filteredTournaments.length === 0 ? (
              <div className={`p-8 text-center ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                {t('exportPdf.notFound')}
              </div>
            ) : (
              <div className="space-y-2">
                {filteredTournaments.map((tournament) => (
                  <button
                    key={String(tournament.id)}
                    onClick={() => setSelectedTournament(String(tournament.id))}
                    className={`w-full text-left p-4 rounded-lg transition-all ${
                      selectedTournament === String(tournament.id)
                        ? isDarkMode
                          ? 'bg-blue-500/20 shadow-lg ring-2 ring-blue-500/50'
                          : 'bg-blue-50 shadow-md ring-2 ring-blue-500/50'
                        : isDarkMode
                          ? 'bg-[#0f172a] hover:bg-[#1e293b] shadow-inner hover:shadow-lg'
                          : 'bg-white hover:bg-gray-50 border border-gray-200 hover:shadow-md'
                    }`}
                  >
                    <h4 className={`font-semibold mb-1 ${
                      selectedTournament === String(tournament.id)
                        ? isDarkMode ? 'text-blue-300' : 'text-blue-900'
                        : isDarkMode ? 'text-white' : 'text-gray-900'
                    }`}>
                      {tournament.name}
                    </h4>
                    <div className="flex items-center gap-3 text-sm">
                      <span className={selectedTournament === String(tournament.id)
                        ? isDarkMode ? 'text-blue-400' : 'text-blue-700'
                        : isDarkMode ? 'text-gray-400' : 'text-gray-600'
                      }>
                        <svg className="w-4 h-4 inline mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        {new Date(tournament.start_date).getFullYear()}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className={`flex items-center justify-end gap-3 p-6 ${
          isDarkMode ? 'bg-[#0f172a]/50 shadow-inner' : 'bg-gray-50 shadow-sm'
        }`}>
          <button
            onClick={onClose}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              isDarkMode
                ? 'bg-white/5 text-gray-300 hover:bg-white/10'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {t('exportPdf.cancel')}
          </button>
          <button
            onClick={handlePreview}
            disabled={!selectedTournament}
            className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 ${
              selectedTournament
                ? isDarkMode
                  ? 'bg-blue-500 text-white hover:bg-blue-600'
                  : 'bg-blue-600 text-white hover:bg-blue-700'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }`}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
            {t('exportPdf.preview')}
          </button>
          <button
            onClick={handleDownload}
            disabled={!selectedTournament}
            className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 ${
              selectedTournament
                ? isDarkMode
                  ? 'bg-green-500 text-white hover:bg-green-600'
                  : 'bg-green-600 text-white hover:bg-green-700'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }`}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            {t('exportPdf.download')}
          </button>
        </div>
      </div>
    </div>
  )
}
