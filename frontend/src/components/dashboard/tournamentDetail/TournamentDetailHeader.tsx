interface TournamentDetailHeaderProps {
  isDarkMode: boolean
  tournamentName: string
  tournamentStartDate: string
  tournamentEndDate?: string
  onBack: () => void
}

export function TournamentDetailHeader({
  isDarkMode,
  tournamentName,
  tournamentStartDate,
  tournamentEndDate,
  onBack
}: TournamentDetailHeaderProps) {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('sk-SK', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  return (
    <div className="flex items-start justify-between gap-4 mb-6">
      <div className="flex-1">
        {/* Breadcrumb */}
        <button
          onClick={onBack}
          className={`flex items-center gap-2 mb-3 text-sm transition-colors ${
            isDarkMode ? 'text-gray-400 hover:text-gray-200' : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Späť na zoznam turnajov
        </button>

        {/* Tournament Info */}
        <div>
          <h1 className={`text-3xl font-bold mb-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
            {tournamentName}
          </h1>
          <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            {formatDate(tournamentStartDate)}
            {tournamentEndDate && ` - ${formatDate(tournamentEndDate)}`}
          </p>
        </div>
      </div>
    </div>
  )
}
