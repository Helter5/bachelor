interface TournamentsPaginationProps {
  isDarkMode: boolean
  currentPage: number
  totalPages: number
  onPreviousPage: () => void
  onNextPage: () => void
  onGoToPage: (page: number) => void
}

export function TournamentsPagination({
  isDarkMode,
  currentPage,
  totalPages,
  onPreviousPage,
  onNextPage,
  onGoToPage
}: TournamentsPaginationProps) {
  if (totalPages <= 1) return null

  return (
    <div className={`flex items-center justify-center gap-2 p-4 rounded-lg ${
      isDarkMode ? 'bg-[#1e293b] shadow-lg' : 'bg-white'
    }`}>
      <button
        onClick={onPreviousPage}
        disabled={currentPage === 1}
        className={`px-4 py-2 rounded-lg font-medium transition-all ${
          currentPage === 1
            ? isDarkMode
              ? 'bg-[#0f172a]/50 text-gray-600 cursor-not-allowed border border-white/5 shadow-inner'
              : 'bg-gray-100 text-gray-400 cursor-not-allowed'
            : isDarkMode
              ? 'bg-[#0f172a]/50 text-gray-300 hover:bg-white/5 shadow-inner'
              : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
        }`}
      >
        Predošlá
      </button>

      <div className="flex items-center gap-2">
        {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
          let pageNum: number
          if (totalPages <= 5) {
            pageNum = i + 1
          } else if (currentPage <= 3) {
            pageNum = i + 1
          } else if (currentPage >= totalPages - 2) {
            pageNum = totalPages - 4 + i
          } else {
            pageNum = currentPage - 2 + i
          }

          return (
            <button
              key={pageNum}
              onClick={() => onGoToPage(pageNum)}
              className={`w-10 h-10 rounded-lg font-medium transition-all ${
                currentPage === pageNum
                  ? isDarkMode
                    ? 'bg-blue-500 text-white'
                    : 'bg-blue-600 text-white'
                  : isDarkMode
                    ? 'bg-[#0f172a]/50 text-gray-300 hover:bg-white/5 shadow-inner'
                    : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
              }`}
            >
              {pageNum}
            </button>
          )
        })}
      </div>

      <button
        onClick={onNextPage}
        disabled={currentPage === totalPages}
        className={`px-4 py-2 rounded-lg font-medium transition-all ${
          currentPage === totalPages
            ? isDarkMode
              ? 'bg-[#0f172a]/50 text-gray-600 cursor-not-allowed border border-white/5 shadow-inner'
              : 'bg-gray-100 text-gray-400 cursor-not-allowed'
            : isDarkMode
              ? 'bg-[#0f172a]/50 text-gray-300 hover:bg-white/5 shadow-inner'
              : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
        }`}
      >
        Ďalšia
      </button>
    </div>
  )
}
