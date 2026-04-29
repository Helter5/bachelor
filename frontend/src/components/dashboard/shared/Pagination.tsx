import { useTranslation } from "react-i18next"

interface PaginationProps {
  isDarkMode: boolean
  currentPage: number
  totalItems: number
  itemsPerPage: number
  onPageChange: (page: number) => void
  onShowAll?: () => void
}

export function Pagination({ isDarkMode, currentPage, totalItems, itemsPerPage, onPageChange, onShowAll }: PaginationProps) {
  const { t } = useTranslation()
  const totalPages = Math.ceil(totalItems / itemsPerPage)

  if (totalPages <= 1 && !onShowAll) return null

  const getPageNumbers = () => {
    return Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
      if (totalPages <= 5) return i + 1
      if (currentPage <= 3) return i + 1
      if (currentPage >= totalPages - 2) return totalPages - 4 + i
      return currentPage - 2 + i
    })
  }

  const navBtn = (disabled: boolean) =>
    disabled
      ? `w-9 h-9 flex items-center justify-center rounded-md text-sm font-bold cursor-not-allowed transition-colors ${
          isDarkMode ? 'text-gray-600' : 'text-gray-300'
        }`
      : `w-9 h-9 flex items-center justify-center rounded-md text-sm font-bold transition-colors cursor-pointer ${
          isDarkMode
            ? 'text-gray-400 hover:bg-white/10 hover:text-white'
            : 'text-gray-500 hover:bg-gray-100 hover:text-gray-900'
        }`

  const pageBtn = (active: boolean) =>
    active
      ? `w-9 h-9 flex items-center justify-center rounded-md text-sm font-semibold transition-colors ${
          isDarkMode ? 'bg-blue-600 text-white shadow-md' : 'bg-blue-600 text-white shadow-sm'
        }`
      : `w-9 h-9 flex items-center justify-center rounded-md text-sm font-medium transition-colors cursor-pointer ${
          isDarkMode
            ? 'text-gray-300 hover:bg-white/10 hover:text-white border border-transparent hover:border-white/10'
            : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900 border border-transparent hover:border-gray-200'
        }`

  return (
    <div className={`flex items-center justify-center gap-0.5 py-3 px-4 rounded-lg ${isDarkMode ? 'bg-[#1e293b]' : 'bg-white border border-gray-200'}`}>
      <button onClick={() => onPageChange(1)} disabled={currentPage === 1} title={t("pagination.firstPage")} className={navBtn(currentPage === 1)}>«</button>
      <button onClick={() => onPageChange(Math.max(1, currentPage - 1))} disabled={currentPage === 1} title={t("pagination.prevPage")} className={navBtn(currentPage === 1)}>‹</button>

      <div className={`mx-1 h-5 w-px ${isDarkMode ? 'bg-white/10' : 'bg-gray-200'}`} />

      {getPageNumbers().map((pageNum) => (
        <button
          key={pageNum}
          onClick={() => onPageChange(pageNum)}
          className={pageBtn(currentPage === pageNum)}
        >
          {pageNum}
        </button>
      ))}

      <div className={`mx-1 h-5 w-px ${isDarkMode ? 'bg-white/10' : 'bg-gray-200'}`} />

      <button onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))} disabled={currentPage === totalPages} title={t("pagination.nextPage")} className={navBtn(currentPage === totalPages)}>›</button>
      <button onClick={() => onPageChange(totalPages)} disabled={currentPage === totalPages} title={t("pagination.lastPage")} className={navBtn(currentPage === totalPages)}>»</button>

      {onShowAll && (
        <>
          <div className={`mx-2 h-5 w-px ${isDarkMode ? 'bg-white/10' : 'bg-gray-200'}`} />
          <button
            onClick={onShowAll}
            className={`px-3 h-7 rounded-full text-xs font-medium transition-all ${
              isDarkMode
                ? 'bg-blue-600/20 text-blue-400 hover:bg-blue-600/40 hover:text-blue-300 ring-1 ring-blue-500/30'
                : 'bg-blue-50 text-blue-600 hover:bg-blue-100 ring-1 ring-blue-200'
            }`}
          >
            {t("pagination.showAll")}
          </button>
        </>
      )}
    </div>
  )
}
