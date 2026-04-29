import { useTranslation } from "react-i18next"
import type { WeightCategory } from "./types"
import { StatusBadge } from "../../ui/StatusBadge"
import { Pagination } from "../Pagination"
import { ITEMS_PER_PAGE } from "./types"

function FighterCountPill({ count, isDarkMode, label }: { count: number; isDarkMode: boolean; label: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs ${isDarkMode ? 'bg-white/5 text-gray-300' : 'bg-gray-200 text-gray-600'}`}
      title={`${count} ${label}`}
      aria-label={`${count} ${label}`}
    >
      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.5 20.25a8.25 8.25 0 0115 0" />
      </svg>
      {count}
    </span>
  )
}

interface WeightCategoryGridProps {
  isDarkMode: boolean
  categories: WeightCategory[]
  getWeightCategoryStatus: (wc: WeightCategory) => 'completed' | 'ongoing' | 'waiting'
  onSelect: (wc: { id: number; name: string; sport_name: string; audience_name: string }) => void
  page?: number
  onPageChange?: (page: number) => void
  itemsPerPage?: number
}

export function WeightCategoryGrid({
  isDarkMode,
  categories,
  getWeightCategoryStatus,
  onSelect,
  page,
  onPageChange,
  itemsPerPage = ITEMS_PER_PAGE,
}: WeightCategoryGridProps) {
  const { t } = useTranslation()

  const grouped = categories.reduce((acc, wc) => {
    const key = `${wc.sport_name} - ${wc.audience_name}`
    if (!acc[key]) acc[key] = []
    acc[key].push(wc)
    return acc
  }, {} as Record<string, WeightCategory[]>)

  return (
    <div className="space-y-6">
      {Object.entries(grouped).map(([type, group]) => {
        const paginated = page !== undefined
          ? group.slice((page - 1) * itemsPerPage, page * itemsPerPage)
          : group

        return (
          <div key={type}>
            <p className={`text-xs font-semibold uppercase tracking-widest mb-2 ${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`}>
              {type}
            </p>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {paginated.map((wc) => {
                const status = getWeightCategoryStatus(wc)
                return (
                  <div
                    key={wc.id}
                    onClick={() => onSelect({ id: wc.id, name: wc.name, sport_name: wc.sport_name, audience_name: wc.audience_name })}
                    className={`rounded-xl p-4 cursor-pointer transition-all ${
                      isDarkMode
                        ? 'bg-[#0f172a]/60 border border-white/[0.06] hover:border-white/10 hover:bg-[#1e293b]'
                        : 'bg-white border border-gray-200 hover:border-gray-300 hover:shadow-md'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <h4 className={`font-bold text-base leading-tight ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                        {wc.name}
                      </h4>
                      {status === 'ongoing'
                        ? <StatusBadge variant="info" isDarkMode={isDarkMode}>{t('tournamentDetail.statusOngoing')}</StatusBadge>
                        : status === 'waiting'
                          ? <StatusBadge variant="neutral" isDarkMode={isDarkMode}>{t('tournamentDetail.statusWaiting')}</StatusBadge>
                          : null
                      }
                    </div>
                    <FighterCountPill
                      count={wc.count_fighters}
                      isDarkMode={isDarkMode}
                      label={t('tournamentDetail.fighters')}
                    />
                  </div>
                )
              })}
            </div>

            {page !== undefined && onPageChange && (
              <Pagination
                isDarkMode={isDarkMode}
                currentPage={page}
                totalItems={group.length}
                itemsPerPage={itemsPerPage}
                onPageChange={onPageChange}
              />
            )}
          </div>
        )
      })}
    </div>
  )
}
