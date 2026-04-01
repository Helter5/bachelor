import { useCallback, useEffect, useState, type ReactNode } from "react"
import { useTranslation } from "react-i18next"
import { RankingView } from "./RankingView"
import { ComparisonView } from "./ComparisonView"
import { TeamComparisonView } from "./TeamComparisonView"

interface DashboardStatsProps {
  isDarkMode: boolean
  onSelectPerson?: (person: { id: number; name: string }) => void
}

type StatsCategory = "comparison" | "rankings" | "team_comparison" | null

const STATS_VIEW_QUERY_KEY = "stats_view"

function parseStatsCategoryFromUrl(): StatsCategory {
  const params = new URLSearchParams(window.location.search)
  const value = params.get(STATS_VIEW_QUERY_KEY)

  if (value === "comparison" || value === "rankings" || value === "team_comparison") {
    return value
  }

  return null
}

function pushStatsCategoryToUrl(category: StatsCategory) {
  const params = new URLSearchParams(window.location.search)

  if (category) {
    params.set(STATS_VIEW_QUERY_KEY, category)
  } else {
    params.delete(STATS_VIEW_QUERY_KEY)
  }

  const query = params.toString()
  const nextUrl = query ? `${window.location.pathname}?${query}` : window.location.pathname
  window.history.pushState({}, "", nextUrl)
}

interface StatsCategoryCardProps {
  isDarkMode: boolean
  onClick: () => void
  color: "purple" | "yellow" | "blue"
  icon: ReactNode
  title: string
  description: string
}

function StatsCategoryCard({ isDarkMode, onClick, color, icon, title, description }: StatsCategoryCardProps) {
  const { t } = useTranslation()
  const c = {
    purple: { gradient: "from-purple-500/10 to-purple-600/5 group-hover:from-purple-500/20 group-hover:to-purple-600/10", text: "text-purple-500" },
    yellow: { gradient: "from-yellow-500/10 to-yellow-600/5 group-hover:from-yellow-500/20 group-hover:to-yellow-600/10", text: "text-yellow-500" },
    blue: { gradient: "from-blue-500/10 to-blue-600/5 group-hover:from-blue-500/20 group-hover:to-blue-600/10", text: "text-blue-500" },
  }[color]
  return (
    <button
      onClick={onClick}
      className={`group relative overflow-hidden rounded-xl p-6 text-left transition-all hover:scale-[1.02] ${
        isDarkMode
          ? 'bg-[#1e293b] hover:bg-[#334155] shadow-lg hover:shadow-2xl'
          : 'bg-white hover:shadow-xl border border-gray-200 shadow-lg'
      }`}
    >
      <div className={`absolute inset-0 bg-gradient-to-br ${c.gradient} opacity-0 group-hover:opacity-100 transition-opacity`} />
      <div className="relative z-10">
        <div className={`mb-4 ${c.text}`}>{icon}</div>
        <h3 className={`text-xl font-bold mb-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{title}</h3>
        <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>{description}</p>
        <div className="mt-4 flex items-center gap-2">
          <span className={`text-sm font-medium ${c.text}`}>{t("stats.viewButton")}</span>
          <svg className={`w-4 h-4 ${c.text} transform group-hover:translate-x-1 transition-transform`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </div>
      </div>
    </button>
  )
}

export function DashboardStats({ isDarkMode, onSelectPerson }: DashboardStatsProps) {
  const { t } = useTranslation()
  const [selectedCategory, setSelectedCategory] = useState<StatsCategory>(() => parseStatsCategoryFromUrl())

  useEffect(() => {
    const handlePopState = () => {
      setSelectedCategory(parseStatsCategoryFromUrl())
    }

    window.addEventListener("popstate", handlePopState)
    return () => window.removeEventListener("popstate", handlePopState)
  }, [])

  const handleSelectCategory = useCallback((category: Exclude<StatsCategory, null>) => {
    setSelectedCategory(category)
    pushStatsCategoryToUrl(category)
  }, [])

  const handleBackToStatsOverview = useCallback(() => {
    setSelectedCategory(null)
    pushStatsCategoryToUrl(null)
  }, [])

  if (selectedCategory === "rankings") {
    return <RankingView isDarkMode={isDarkMode} onSelectPerson={onSelectPerson} onBack={handleBackToStatsOverview} />
  }

  if (selectedCategory === "comparison") {
    return <ComparisonView isDarkMode={isDarkMode} onSelectPerson={onSelectPerson} onBack={handleBackToStatsOverview} />
  }

  if (selectedCategory === "team_comparison") {
    return <TeamComparisonView isDarkMode={isDarkMode} onBack={handleBackToStatsOverview} />
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className={`text-3xl font-bold mb-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{t("stats.title")}</h2>
        <p className={isDarkMode ? 'text-gray-300' : 'text-gray-600'}>{t("stats.subtitle")}</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <StatsCategoryCard
          isDarkMode={isDarkMode}
          onClick={() => handleSelectCategory("comparison")}
          color="purple"
          icon={
            <svg className="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
            </svg>
          }
          title={t("stats.comparison.title")}
          description={t("stats.comparison.description")}
        />
        <StatsCategoryCard
          isDarkMode={isDarkMode}
          onClick={() => handleSelectCategory("rankings")}
          color="yellow"
          icon={
            <svg className="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 4h2a2 2 0 012 2v1a5 5 0 01-5 5M8 4H6a2 2 0 00-2 2v1a5 5 0 005 5m3 6v3m-4 0h8M9 12a3 3 0 003-3V4h0a3 3 0 00-3 3v2a3 3 0 003 3z" />
            </svg>
          }
          title={t("stats.rankings.title")}
          description={t("stats.rankings.description")}
        />
        <StatsCategoryCard
          isDarkMode={isDarkMode}
          onClick={() => handleSelectCategory("team_comparison")}
          color="blue"
          icon={
            <svg className="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          }
          title={t("stats.teamComparison.title")}
          description={t("stats.teamComparison.description")}
        />
      </div>
    </div>
  )
}
