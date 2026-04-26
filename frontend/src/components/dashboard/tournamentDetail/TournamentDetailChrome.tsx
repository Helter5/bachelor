import type { TabType } from "./types"

interface TournamentDetailHeaderProps {
  isDarkMode: boolean
  tournamentName: string
  onBack: () => void
}

interface TournamentTabsProps {
  isDarkMode: boolean
  tabs: Array<{ id: TabType; label: string }>
  activeTab: TabType
  onTabChange: (tab: TabType) => void
}

export function TournamentDetailHeader({ isDarkMode, tournamentName, onBack }: TournamentDetailHeaderProps) {
  return (
    <div className="flex items-center gap-4">
      <button
        onClick={onBack}
        className={`p-2 rounded-lg transition-all shrink-0 ${
          isDarkMode
            ? "hover:bg-white/5 text-gray-300 hover:text-white"
            : "hover:bg-gray-100 text-gray-600 hover:text-gray-900"
        }`}
      >
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
        </svg>
      </button>
      <div className="min-w-0">
        <h2 className={`text-xl md:text-3xl font-bold truncate ${isDarkMode ? "text-white" : "text-gray-900"}`}>{tournamentName}</h2>
      </div>
    </div>
  )
}

export function TournamentTabs({ isDarkMode, tabs, activeTab, onTabChange }: TournamentTabsProps) {
  return (
    <div className={`md:border-b ${isDarkMode ? "md:border-white/5" : "md:border-gray-200"}`}>
      <nav className="grid grid-cols-2 sm:grid-cols-4 md:flex md:gap-8 gap-1">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`py-2.5 md:pb-4 md:pt-0 px-2 md:px-1 rounded-lg md:rounded-none font-medium transition-all text-sm md:text-base text-center md:text-left ${
              activeTab === tab.id
                ? isDarkMode
                  ? "text-blue-400 bg-blue-500/10 md:bg-transparent md:border-b-2 md:border-blue-400"
                  : "text-blue-600 bg-blue-50 md:bg-transparent md:border-b-2 md:border-blue-600"
                : isDarkMode
                  ? "text-gray-400 hover:text-gray-300 hover:bg-white/5 md:hover:bg-transparent"
                  : "text-gray-500 hover:text-gray-700 hover:bg-gray-100 md:hover:bg-transparent"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </nav>
    </div>
  )
}
