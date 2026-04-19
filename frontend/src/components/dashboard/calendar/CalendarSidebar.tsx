import type { TFunction } from 'i18next'
import { formatDate } from '@/utils/dateFormatter'
import type { CalendarEvent, RightPanelMode } from './types'

interface CalendarSidebarProps {
  isDarkMode: boolean
  t: TFunction
  i18nLanguage: string
  fullDateLabel: string
  selectedDayEvents: CalendarEvent[]
  visibleMonthEvents: CalendarEvent[]
  rightPanelMode: RightPanelMode
  setRightPanelMode: (mode: RightPanelMode) => void
  onSelectDate: (date: Date) => void
  eventColors: string[]
}

export function CalendarSidebar({
  isDarkMode,
  t,
  i18nLanguage,
  fullDateLabel,
  selectedDayEvents,
  visibleMonthEvents,
  rightPanelMode,
  setRightPanelMode,
  onSelectDate,
  eventColors,
}: CalendarSidebarProps) {
  const activeToggleClass = 'bg-white text-slate-900 shadow-sm'
  const inactiveToggleClass = isDarkMode ? 'text-gray-300 hover:bg-white/5' : 'text-gray-600 hover:bg-white'

  const formattedFullDateLabel = (() => {
    const capitalized = fullDateLabel.length > 0
      ? `${fullDateLabel.charAt(0).toUpperCase()}${fullDateLabel.slice(1)}`
      : fullDateLabel

    return capitalized.replace(/^(\S+)\s/, '$1, ')
  })()

  return (
    <aside className={`xl:col-span-2 rounded-[28px] p-5 md:p-6 shadow-[0_20px_60px_-32px_rgba(15,23,42,0.35)] ${isDarkMode ? 'bg-[#111827] border border-white/10' : 'bg-white border border-gray-200'}`}>
      <h3 className={`text-lg md:text-xl font-semibold mb-3 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
        {formattedFullDateLabel}
      </h3>

      <p className={`text-sm font-semibold mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
        {t('calendar.filterByLabel')}
      </p>
      <div className={`mb-4 inline-flex w-full items-center gap-1 rounded-full p-1 ${isDarkMode ? 'bg-white/5 border border-white/10' : 'bg-slate-100 border border-slate-200'}`}>
        <button
          onClick={() => setRightPanelMode('day')}
          className={`flex-1 inline-flex items-center justify-center gap-2 px-3.5 py-2 rounded-full text-sm font-semibold transition-all ${rightPanelMode === 'day' ? activeToggleClass : inactiveToggleClass}`}
        >
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 3v2m8-2v2M4 9h16M6 5h12a2 2 0 012 2v12a2 2 0 01-2 2H6a2 2 0 01-2-2V7a2 2 0 012-2z" />
            <circle cx="12" cy="14" r="2" fill="currentColor" stroke="none" />
          </svg>
          {t('calendar.filterDay')}
        </button>
        <button
          onClick={() => setRightPanelMode('month')}
          className={`flex-1 inline-flex items-center justify-center gap-2 px-3.5 py-2 rounded-full text-sm font-semibold transition-all ${rightPanelMode === 'month' ? activeToggleClass : inactiveToggleClass}`}
        >
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
            <rect x="4" y="5" width="16" height="15" rx="2" strokeWidth={2} />
            <path strokeLinecap="round" strokeWidth={2} d="M4 10h16M9 3v4m6-4v4" />
          </svg>
          {t('calendar.filterMonth')}
        </button>
      </div>

      {rightPanelMode === 'day' && (
        <>
          {selectedDayEvents.length === 0 ? (
            <div className={`rounded-2xl p-5 ${isDarkMode ? 'bg-white/5 text-gray-400' : 'bg-gray-50 text-gray-500'}`}>
              {t('calendar.emptyDay')}
            </div>
          ) : (
            <div className="space-y-3 max-h-[460px] overflow-y-auto pr-1">
              {selectedDayEvents.map((event, index) => {
                const locality = event.address_locality || event.continent || ''
                const eventTime = event.date.toLocaleTimeString(i18nLanguage, { hour: '2-digit', minute: '2-digit' })
                return (
                  <div key={event.id} className={`rounded-2xl p-4 border ${isDarkMode ? 'bg-white/5 border-white/10' : 'bg-gray-50 border-gray-200'}`}>
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span className={`h-2.5 w-2.5 rounded-full ${eventColors[index % eventColors.length]}`} />
                          <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold ${isDarkMode ? 'bg-white/10 text-gray-300' : 'bg-white text-gray-600 border border-gray-200'}`}>
                            {eventTime}
                          </span>
                        </div>
                        <p className={`text-sm font-semibold leading-snug ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                          {event.name}
                        </p>
                        <p className={`text-xs mt-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                          {formatDate(event.start_date, i18nLanguage)}{locality ? ` · ${locality}` : ''}
                        </p>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </>
      )}

      {rightPanelMode === 'month' && (
        <div className={`rounded-2xl p-4 ${isDarkMode ? 'bg-white/[0.03] border border-white/5' : 'bg-gray-50 border border-gray-100'}`}>
          <div className="flex items-center justify-between mb-3">
            <h4 className={`text-sm font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
              {t('calendar.monthEventsTitle')}
            </h4>
            <span className={`text-xs px-2 py-1 rounded-full ${isDarkMode ? 'bg-white/10 text-gray-300' : 'bg-white text-gray-600'}`}>
              {visibleMonthEvents.length}
            </span>
          </div>

          {visibleMonthEvents.length === 0 ? (
            <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>{t('calendar.emptyMonth')}</p>
          ) : (
            <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
              {visibleMonthEvents.slice(0, 10).map((event, index) => (
                <button
                  key={event.id}
                  onClick={() => onSelectDate(event.date)}
                  className={`w-full text-left rounded-2xl p-3 border transition-all hover:-translate-y-0.5 ${isDarkMode ? 'bg-white/5 border-white/10 hover:bg-white/10' : 'bg-white border-gray-200 hover:bg-gray-100'}`}
                >
                  <div className="flex items-center gap-2">
                    <span className={`h-2.5 w-2.5 rounded-full shrink-0 ${eventColors[index % eventColors.length]}`} />
                    <p className={`text-sm font-medium truncate ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                      {event.name}
                    </p>
                  </div>
                  <p className={`text-xs mt-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                    {formatDate(event.start_date, i18nLanguage)}
                  </p>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </aside>
  )
}
