import { useState } from "react"
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

interface ExportCardProps {
  isDarkMode: boolean
  icon: React.ReactNode
  iconBg: string
  title: string
  description: string
  format: "PDF" | "XLSX"
  selector?: React.ReactNode
  onPreview?: () => void
  onDownload: () => void
  downloadLabel: string
}

function ExportCard({
  isDarkMode,
  icon,
  iconBg,
  title,
  description,
  format,
  selector,
  onPreview,
  onDownload,
  downloadLabel,
}: ExportCardProps) {
  const { t } = useTranslation()

  return (
    <div className={`rounded-xl overflow-hidden transition-all flex flex-col ${
      isDarkMode
        ? 'bg-[#0f172a] border border-white/[0.06] hover:border-white/10'
        : 'bg-white border border-gray-200 hover:border-gray-300 hover:shadow-md'
    }`}>
      <div className="p-5 flex items-start gap-4 flex-1">
        <div className={`shrink-0 w-11 h-11 rounded-xl flex items-center justify-center ${iconBg}`}>
          {icon}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h4 className={`font-semibold text-base leading-tight ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
              {title}
            </h4>
            <span className={`shrink-0 text-[10px] font-bold px-2.5 py-0.5 rounded-sm ${
              format === "XLSX"
                ? isDarkMode ? 'bg-emerald-500/20 text-emerald-400' : 'bg-emerald-100 text-emerald-700'
                : isDarkMode ? 'bg-red-500/20 text-red-400' : 'bg-red-100 text-red-700'
            }`}>
              {format}
            </span>
          </div>
          <p className={`text-sm leading-snug ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
            {description}
          </p>
          {selector && <div className="mt-2">{selector}</div>}
        </div>
      </div>

      <div className={isDarkMode ? 'border-t border-white/[0.05]' : 'border-t border-gray-100'} />

      <div className="px-5 py-3 flex items-center gap-2">
        {onPreview && (
          <button
            onClick={onPreview}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              isDarkMode
                ? 'text-gray-400 hover:text-white hover:bg-white/8'
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
            }`}
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
            {t("tournamentDetail.export.showPdf")}
          </button>
        )}
        <div className="flex-1" />
        <button
          onClick={onDownload}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            isDarkMode
              ? 'bg-blue-500/90 text-white hover:bg-blue-500 shadow-sm shadow-blue-500/20'
              : 'bg-blue-600 text-white hover:bg-blue-700 shadow-sm shadow-blue-600/20'
          }`}
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          {downloadLabel}
        </button>
      </div>
    </div>
  )
}

async function downloadBlob(endpoint: string, filename: string) {
  const blob = await apiClient.getBlob(endpoint)
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export function ExportTab({
  isDarkMode,
  teams,
  athletes,
  tournamentUuid,
}: ExportTabProps) {
  const { t } = useTranslation()
  const [medalStandingsBy, setMedalStandingsBy] = useState<"teams" | "athletes">("teams")

  return (
    <div>
      <h3 className={`text-xl font-semibold mb-6 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
        {t("tournamentDetail.export.title")}
      </h3>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <ExportCard
          isDarkMode={isDarkMode}
          iconBg={isDarkMode ? 'bg-blue-500/15' : 'bg-blue-50'}
          icon={
            <svg className={`w-5 h-5 ${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          }
          title={t("tournamentDetail.export.teamsTitle")}
          description={t("tournamentDetail.export.teamsDesc", { count: teams.length })}
          format="PDF"
          onPreview={() => window.open(API_BASE_URL + API_ENDPOINTS.TEAM_SHOW(tournamentUuid), '_blank')}
          onDownload={() => downloadBlob(API_ENDPOINTS.TEAM_PRINT(tournamentUuid), `timy-${tournamentUuid}.pdf`).catch(e => console.error(e))}
          downloadLabel={t("tournamentDetail.export.downloadPdf")}
        />

        <ExportCard
          isDarkMode={isDarkMode}
          iconBg={isDarkMode ? 'bg-green-500/15' : 'bg-green-50'}
          icon={
            <svg className={`w-5 h-5 ${isDarkMode ? 'text-green-400' : 'text-green-600'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          }
          title={t("tournamentDetail.export.athletesTitle")}
          description={t("tournamentDetail.export.athletesDesc", { count: athletes.length })}
          format="PDF"
          onPreview={() => window.open(API_BASE_URL + API_ENDPOINTS.ATHLETE_SHOW(tournamentUuid), '_blank')}
          onDownload={() => downloadBlob(API_ENDPOINTS.ATHLETE_PRINT(tournamentUuid), `atleti-${tournamentUuid}.pdf`).catch(e => console.error(e))}
          downloadLabel={t("tournamentDetail.export.downloadPdf")}
        />

        <ExportCard
          isDarkMode={isDarkMode}
          iconBg={isDarkMode ? 'bg-yellow-500/15' : 'bg-yellow-50'}
          icon={
            <svg className={`w-5 h-5 ${isDarkMode ? 'text-yellow-400' : 'text-yellow-600'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
            </svg>
          }
          title={t("tournamentDetail.export.medalStandingsTitle")}
          description={t("tournamentDetail.export.medalStandingsDesc")}
          format="PDF"
          selector={
            <div className="flex flex-col gap-1.5">
              <span className={`text-[11px] font-medium ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                {t("tournamentDetail.export.medalByLabel")}
              </span>
              <div className="flex gap-2">
                {(["teams", "athletes"] as const).map(option => {
                  const isSelected = medalStandingsBy === option
                  return (
                    <button
                      key={option}
                      onClick={() => setMedalStandingsBy(option)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-all ${
                        isSelected
                          ? isDarkMode
                            ? 'bg-blue-500/15 border-blue-500/40 text-blue-400'
                            : 'bg-blue-50 border-blue-300 text-blue-700'
                          : isDarkMode
                            ? 'border-white/[0.08] text-gray-400 hover:border-white/20 hover:text-gray-300'
                            : 'border-gray-200 text-gray-500 hover:border-gray-300 hover:text-gray-700'
                      }`}
                    >
                      {option === "teams" ? (
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 21V5" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5c4-2 8-2 12 0v9c-4-2-8-2-12 0V5z" />
                        </svg>
                      ) : (
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                      )}
                      {option === "teams" ? t("tournamentDetail.export.medalByTeams") : t("tournamentDetail.export.medalByAthletes")}
                      {isSelected && (
                        <svg className="w-3 h-3 ml-0.5 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      )}
                    </button>
                  )
                })}
              </div>
            </div>
          }
          onPreview={() => window.open(API_BASE_URL + API_ENDPOINTS.EVENT_EXPORT_MEDAL_STANDINGS(tournamentUuid) + `?by=${medalStandingsBy}`, '_blank')}
          onDownload={() => downloadBlob(API_ENDPOINTS.EVENT_EXPORT_MEDAL_STANDINGS(tournamentUuid) + `?by=${medalStandingsBy}`, `medal-standings-${tournamentUuid}.pdf`).catch(e => console.error(e))}
          downloadLabel={t("tournamentDetail.export.downloadPdf")}
        />

        <ExportCard
          isDarkMode={isDarkMode}
          iconBg={isDarkMode ? 'bg-purple-500/15' : 'bg-purple-50'}
          icon={
            <svg className={`w-5 h-5 ${isDarkMode ? 'text-purple-400' : 'text-purple-600'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          }
          title={t("tournamentDetail.export.resultsSummaryTitle")}
          description={t("tournamentDetail.export.resultsSummaryDesc")}
          format="PDF"
          onPreview={() => window.open(API_BASE_URL + API_ENDPOINTS.EVENT_EXPORT_RESULTS_SUMMARY(tournamentUuid), '_blank')}
          onDownload={() => downloadBlob(API_ENDPOINTS.EVENT_EXPORT_RESULTS_SUMMARY(tournamentUuid), `results-summary-${tournamentUuid}.pdf`).catch(e => console.error(e))}
          downloadLabel={t("tournamentDetail.export.downloadPdf")}
        />

        <ExportCard
          isDarkMode={isDarkMode}
          iconBg={isDarkMode ? 'bg-emerald-500/15' : 'bg-emerald-50'}
          icon={
            <svg className={`w-5 h-5 ${isDarkMode ? 'text-emerald-400' : 'text-emerald-600'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
          }
          title={t("tournamentDetail.export.statisticsTitle")}
          description={t("tournamentDetail.export.statisticsDesc")}
          format="XLSX"
          onDownload={() => downloadBlob(API_ENDPOINTS.EVENT_EXPORT_STATISTICS(tournamentUuid), `statistics-${tournamentUuid}.xlsx`).catch(e => console.error(e))}
          downloadLabel={t("tournamentDetail.export.downloadExcel")}
        />
      </div>
    </div>
  )
}
