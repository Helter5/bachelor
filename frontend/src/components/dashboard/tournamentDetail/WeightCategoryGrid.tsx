import { useTranslation } from "react-i18next"
import type { WeightCategory } from "./types"
import { StatusBadge } from "../../ui/StatusBadge"
import { Pagination } from "../Pagination"
import { ITEMS_PER_PAGE } from "./types"

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
                    <p className={`text-xs ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                      {wc.count_fighters} {t('tournamentDetail.fighters')}
                    </p>
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
