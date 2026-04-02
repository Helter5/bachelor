import { apiClient } from "@/services/apiClient"
import { API_ENDPOINTS, API_BASE_URL } from "@/config/api"
import { useTranslation } from "react-i18next"
import type { Team, Athlete } from "../types"

interface ExportTabProps {
  isDarkMode: boolean
  teams: Team[]
  athletes: Athlete[]
  tournamentUuid: string
}

export function ExportTab({
  isDarkMode,
  teams,
  athletes,
  tournamentUuid,
}: ExportTabProps) {
  const { t } = useTranslation()

  return (
    <div>
      <h3 className={`text-xl font-semibold mb-6 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
        {t("tournamentDetail.export.title")}
      </h3>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Teams Export Card */}
        <div className={`rounded-lg p-6 ${isDarkMode ? 'bg-[#0f172a]/50 shadow-md backdrop-blur-sm' : 'bg-gray-50 border border-gray-200'}`}>
          <div className="flex items-center gap-3 mb-3">
            <svg className={`w-8 h-8 ${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            <div>
              <h4 className={`font-bold text-lg ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{t("tournamentDetail.export.teamsTitle")}</h4>
              <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                {t("tournamentDetail.export.teamsDesc", { count: teams.length })}
              </p>
            </div>
          </div>
          <div className="flex gap-3 mt-4">
            <button
              onClick={() => window.open(API_BASE_URL + API_ENDPOINTS.TEAM_SHOW(tournamentUuid), '_blank')}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
                isDarkMode
                  ? 'bg-[#1e293b] text-white hover:bg-[#334155] border border-white/10'
                  : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'
              }`}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
              {t("tournamentDetail.export.showPdf")}
            </button>
            <button
              onClick={async () => {
                try {
                  const blob = await apiClient.getBlob(API_ENDPOINTS.TEAM_PRINT(tournamentUuid))
                  const url = URL.createObjectURL(blob)
                  const a = document.createElement('a')
                  a.href = url
                  a.download = `timy-${tournamentUuid}.pdf`
                  a.click()
                  URL.revokeObjectURL(url)
                } catch (error) {
                  console.error('Error downloading teams PDF:', error)
                }
              }}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
                isDarkMode
                  ? 'bg-blue-500 text-white hover:bg-blue-600'
                  : 'bg-blue-600 text-white hover:bg-blue-700'
              }`}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              {t("tournamentDetail.export.downloadPdf")}
            </button>
          </div>
        </div>

        {/* Athletes Export Card */}
        <div className={`rounded-lg p-6 ${isDarkMode ? 'bg-[#0f172a]/50 shadow-md backdrop-blur-sm' : 'bg-gray-50 border border-gray-200'}`}>
          <div className="flex items-center gap-3 mb-3">
            <svg className={`w-8 h-8 ${isDarkMode ? 'text-green-400' : 'text-green-600'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            <div>
              <h4 className={`font-bold text-lg ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{t("tournamentDetail.export.athletesTitle")}</h4>
              <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                {t("tournamentDetail.export.athletesDesc", { count: athletes.length })}
              </p>
            </div>
          </div>
          <div className="flex gap-3 mt-4">
            <button
              onClick={() => window.open(API_BASE_URL + API_ENDPOINTS.ATHLETE_SHOW(tournamentUuid), '_blank')}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
                isDarkMode
                  ? 'bg-[#1e293b] text-white hover:bg-[#334155] border border-white/10'
                  : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'
              }`}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 16 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
              {t("tournamentDetail.export.showPdf")}
            </button>
            <button
              onClick={async () => {
                try {
                  const blob = await apiClient.getBlob(API_ENDPOINTS.ATHLETE_PRINT(tournamentUuid))
                  const url = URL.createObjectURL(blob)
                  const a = document.createElement('a')
                  a.href = url
                  a.download = `atleti-${tournamentUuid}.pdf`
                  a.click()
                  URL.revokeObjectURL(url)
                } catch (error) {
                  console.error('Error downloading athletes PDF:', error)
                }
              }}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
                isDarkMode
                  ? 'bg-blue-500 text-white hover:bg-blue-600'
                  : 'bg-blue-600 text-white hover:bg-blue-700'
              }`}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              {t("tournamentDetail.export.downloadPdf")}
            </button>
          </div>
        </div>

        {/* Medal Standings Export Card */}
        <div className={`rounded-lg p-6 ${isDarkMode ? 'bg-[#0f172a]/50 shadow-md backdrop-blur-sm' : 'bg-gray-50 border border-gray-200'}`}>
          <div className="flex items-center gap-3 mb-3">
            <svg className={`w-8 h-8 ${isDarkMode ? 'text-yellow-400' : 'text-yellow-600'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
            </svg>
            <div>
              <h4 className={`font-bold text-lg ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{t("tournamentDetail.export.medalStandingsTitle")}</h4>
              <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                {t("tournamentDetail.export.medalStandingsDesc")}
              </p>
            </div>
          </div>
          <div className="flex gap-3 mt-4">
            <button
              onClick={() => window.open(API_BASE_URL + API_ENDPOINTS.EVENT_EXPORT_MEDAL_STANDINGS(tournamentUuid), '_blank')}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
                isDarkMode
                  ? 'bg-[#1e293b] text-white hover:bg-[#334155] border border-white/10'
                  : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'
              }`}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
              {t("tournamentDetail.export.showPdf")}
            </button>
            <button
              onClick={async () => {
                try {
                  const blob = await apiClient.getBlob(API_ENDPOINTS.EVENT_EXPORT_MEDAL_STANDINGS(tournamentUuid))
                  const url = URL.createObjectURL(blob)
                  const a = document.createElement('a')
                  a.href = url
                  a.download = `medal-standings-${tournamentUuid}.pdf`
                  a.click()
                  URL.revokeObjectURL(url)
                } catch (error) {
                  console.error('Error downloading medal standings PDF:', error)
                }
              }}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
                isDarkMode
                  ? 'bg-blue-500 text-white hover:bg-blue-600'
                  : 'bg-blue-600 text-white hover:bg-blue-700'
              }`}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              {t("tournamentDetail.export.downloadPdf")}
            </button>
          </div>
        </div>

        {/* Results Summary Export Card */}
        <div className={`rounded-lg p-6 ${isDarkMode ? 'bg-[#0f172a]/50 shadow-md backdrop-blur-sm' : 'bg-gray-50 border border-gray-200'}`}>
          <div className="flex items-center gap-3 mb-3">
            <svg className={`w-8 h-8 ${isDarkMode ? 'text-purple-400' : 'text-purple-600'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <div>
              <h4 className={`font-bold text-lg ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{t("tournamentDetail.export.resultsSummaryTitle")}</h4>
              <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                {t("tournamentDetail.export.resultsSummaryDesc")}
              </p>
            </div>
          </div>
          <div className="flex gap-3 mt-4">
            <button
              onClick={() => window.open(API_BASE_URL + API_ENDPOINTS.EVENT_EXPORT_RESULTS_SUMMARY(tournamentUuid), '_blank')}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
                isDarkMode
                  ? 'bg-[#1e293b] text-white hover:bg-[#334155] border border-white/10'
                  : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'
              }`}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
              {t("tournamentDetail.export.showPdf")}
            </button>
            <button
              onClick={async () => {
                try {
                  const blob = await apiClient.getBlob(API_ENDPOINTS.EVENT_EXPORT_RESULTS_SUMMARY(tournamentUuid))
                  const url = URL.createObjectURL(blob)
                  const a = document.createElement('a')
                  a.href = url
                  a.download = `results-summary-${tournamentUuid}.pdf`
                  a.click()
                  URL.revokeObjectURL(url)
                } catch (error) {
                  console.error('Error downloading results summary PDF:', error)
                }
              }}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
                isDarkMode
                  ? 'bg-blue-500 text-white hover:bg-blue-600'
                  : 'bg-blue-600 text-white hover:bg-blue-700'
              }`}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              {t("tournamentDetail.export.downloadPdf")}
            </button>
          </div>
        </div>

        {/* Statistics Excel Export Card */}
        <div className={`rounded-lg p-6 ${isDarkMode ? 'bg-[#0f172a]/50 shadow-md backdrop-blur-sm' : 'bg-gray-50 border border-gray-200'}`}>
          <div className="flex items-center gap-3 mb-3">
            <svg className={`w-8 h-8 ${isDarkMode ? 'text-emerald-400' : 'text-emerald-600'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
            <div>
              <h4 className={`font-bold text-lg ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{t("tournamentDetail.export.statisticsTitle")}</h4>
              <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                {t("tournamentDetail.export.statisticsDesc")}
              </p>
            </div>
          </div>
          <div className="flex gap-3 mt-4">
            <button
              onClick={async () => {
                try {
                  const blob = await apiClient.getBlob(API_ENDPOINTS.EVENT_EXPORT_STATISTICS(tournamentUuid))
                  const url = URL.createObjectURL(blob)
                  const a = document.createElement('a')
                  a.href = url
                  a.download = `statistics-${tournamentUuid}.xlsx`
                  a.click()
                  URL.revokeObjectURL(url)
                } catch (error) {
                  console.error('Error downloading statistics Excel:', error)
                }
              }}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
                isDarkMode
                  ? 'bg-emerald-500 text-white hover:bg-emerald-600'
                  : 'bg-emerald-600 text-white hover:bg-emerald-700'
              }`}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              {t("tournamentDetail.export.downloadExcel")}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
