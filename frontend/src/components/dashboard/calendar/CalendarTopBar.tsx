import type { TFunction } from 'i18next'
import type { CalendarViewMode } from './types'

interface CalendarTopBarProps {
  isDarkMode: boolean
  t: TFunction
  searchQuery: string
  setSearchQuery: (value: string) => void
  periodLabel: string
  onPrevPeriod: () => void
  onNextPeriod: () => void
  onJumpToToday: () => void
  viewMode: CalendarViewMode
  onViewModeChange: (mode: CalendarViewMode) => void
  viewToggleClass: (mode: CalendarViewMode) => string
}

export function CalendarTopBar({
  isDarkMode,
  t,
  searchQuery,
  setSearchQuery,
  periodLabel,
  onPrevPeriod,
  onNextPeriod,
  onJumpToToday,
  viewMode,
  onViewModeChange,
  viewToggleClass,
}: CalendarTopBarProps) {
  return (
    <>
      <label
        className={`mb-4 w-full max-w-[276px] rounded-xl border px-3 py-2.5 flex items-center gap-2 ${
          isDarkMode
            ? 'bg-white/5 border-white/10 text-gray-200'
            : 'bg-white border-gray-200 text-gray-700'
        }`}
      >
        <svg className={`w-4 h-4 shrink-0 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M11 18a7 7 0 100-14 7 7 0 000 14z" />
        </svg>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder={`${t('common.search')}...`}
          maxLength={100}
          className={`w-full bg-transparent border-0 outline-none text-sm placeholder:text-inherit ${isDarkMode ? 'text-gray-100' : 'text-gray-800'}`}
          aria-label={t('common.search')}
        />
      </label>

      <div className="flex flex-wrap items-center gap-1 mb-1">
        <div className="inline-flex items-center justify-center gap-1 shrink-0">
          <button
            onClick={onPrevPeriod}
            className={`inline-flex h-8 w-8 items-center justify-center rounded-full text-base font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 ${isDarkMode ? 'text-gray-300 hover:bg-white/10 hover:text-white' : 'text-gray-700 hover:bg-slate-100 hover:text-gray-900'}`}
            aria-label={t('calendar.previousMonth')}
          >
            &lt;
          </button>
          <span className={`inline-flex h-2.5 w-2.5 rounded-full ${isDarkMode ? 'bg-sky-400' : 'bg-sky-500'}`} aria-hidden="true" />
          <button
            onClick={onNextPeriod}
            className={`inline-flex h-8 w-8 items-center justify-center rounded-full text-base font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 ${isDarkMode ? 'text-gray-300 hover:bg-white/10 hover:text-white' : 'text-gray-700 hover:bg-slate-100 hover:text-gray-900'}`}
            aria-label={t('calendar.nextMonth')}
          >
            &gt;
          </button>
          <button
            onClick={onJumpToToday}
            className={`inline-flex h-8 w-8 items-center justify-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 ${isDarkMode ? 'text-gray-300 hover:bg-white/10 hover:text-white' : 'text-gray-600 hover:bg-slate-100 hover:text-gray-900'}`}
            aria-label={t('calendar.jumpToToday')}
            title={t('calendar.jumpToToday')}
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 3v2m8-2v2M4 9h16M5 5h14a1 1 0 011 1v12a2 2 0 01-2 2H6a2 2 0 01-2-2V6a1 1 0 011-1z" />
              <circle cx="12" cy="14" r="1.75" fill="currentColor" stroke="none" />
            </svg>
          </button>
        </div>

        <h3 className={`ml-2 text-lg font-semibold whitespace-nowrap shrink-0 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
          {periodLabel}
        </h3>

        <div className={`inline-flex items-center gap-1 rounded-full p-1 shrink-0 ml-auto ${isDarkMode ? 'bg-white/5 border border-white/10' : 'bg-slate-100 border border-slate-200'}`}>
          <button aria-pressed={viewMode === 'month'} onClick={() => onViewModeChange('month')} className={viewToggleClass('month')}>
            {t('calendar.monthView')}
          </button>
          <button aria-pressed={viewMode === 'week'} onClick={() => onViewModeChange('week')} className={viewToggleClass('week')}>
            {t('calendar.weekView')}
          </button>
          <button aria-pressed={viewMode === 'day'} onClick={() => onViewModeChange('day')} className={viewToggleClass('day')}>
            {t('calendar.dayView')}
          </button>
        </div>
      </div>
    </>
  )
}
