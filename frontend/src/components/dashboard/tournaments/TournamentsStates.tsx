interface StateDisplayProps {
  isDarkMode: boolean
}

export function LoadingState({ isDarkMode }: StateDisplayProps) {
  return (
    <div className={`p-8 rounded-lg text-center ${isDarkMode ? 'bg-[#1e293b]' : 'bg-white'}`}>
      <div className="flex items-center justify-center gap-3">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        <span className={isDarkMode ? 'text-gray-300' : 'text-gray-600'}>Načítavam turnaje...</span>
      </div>
    </div>
  )
}

export function ErrorState({ isDarkMode, error }: StateDisplayProps & { error: string }) {
  return (
    <div className={`p-6 rounded-lg ${isDarkMode ? 'bg-red-500/10' : 'bg-red-50'}`}>
      <div className="flex items-center gap-3">
        <svg className="w-6 h-6 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <div>
          <p className={`font-semibold ${isDarkMode ? 'text-red-400' : 'text-red-700'}`}>Chyba pri načítaní turnajov</p>
          <p className={`text-sm ${isDarkMode ? 'text-red-300' : 'text-red-600'}`}>{error}</p>
        </div>
      </div>
    </div>
  )
}

export function EmptyState({ isDarkMode }: StateDisplayProps) {
  return (
    <div className={`p-8 rounded-lg text-center ${isDarkMode ? 'bg-[#1e293b]' : 'bg-white'}`}>
      <svg className={`mx-auto h-12 w-12 ${isDarkMode ? 'text-gray-400' : 'text-gray-300'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
      <h3 className={`mt-2 text-lg font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-900'}`}>Žiadne turnaje</h3>
      <p className={`mt-1 text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
        Zatiaľ neboli synchronizované žiadne turnaje. Použite tlačidlo "Synchronizovať" na načítanie dát.
      </p>
    </div>
  )
}

export function NoResultsState({ isDarkMode }: StateDisplayProps) {
  return (
    <div className={`col-span-full text-center py-12 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
      Žiadne turnaje neboli nájdené
    </div>
  )
}
