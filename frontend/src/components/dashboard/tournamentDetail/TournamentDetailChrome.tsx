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
        className={`p-2 rounded-lg transition-all ${
          isDarkMode
            ? "hover:bg-white/5 text-gray-300 hover:text-white"
            : "hover:bg-gray-100 text-gray-600 hover:text-gray-900"
        }`}
      >
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
        </svg>
      </button>
      <div>
        <h2 className={`text-3xl font-bold ${isDarkMode ? "text-white" : "text-gray-900"}`}>{tournamentName}</h2>
      </div>
    </div>
  )
}

export function TournamentTabs({ isDarkMode, tabs, activeTab, onTabChange }: TournamentTabsProps) {
  return (
    <div>
      <nav className={`flex gap-8 border-b ${isDarkMode ? "border-white/5" : "border-gray-200"}`}>
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`pb-4 px-1 font-medium transition-all ${
              activeTab === tab.id
                ? isDarkMode
                  ? "text-blue-400"
                  : "text-blue-600"
                : isDarkMode
                  ? "text-gray-400 hover:text-gray-300"
                  : "text-gray-500 hover:text-gray-700"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </nav>
    </div>
  )
}
