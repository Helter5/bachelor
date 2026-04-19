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
  onJumpToToday: () => void
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
  onJumpToToday,
  onSelectDate,
  eventColors,
}: CalendarSidebarProps) {
  return (
    <aside className={`xl:col-span-2 rounded-[28px] p-5 md:p-6 shadow-[0_20px_60px_-32px_rgba(15,23,42,0.35)] ${isDarkMode ? 'bg-[#111827] border border-white/10' : 'bg-white border border-gray-200'}`}>
      <div className="flex items-start justify-between gap-3 mb-4">
        <div>
          <h3 className={`text-lg font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
            {fullDateLabel}
          </h3>
          <p className={`text-xs mt-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
            {t('calendar.daySummary', { count: selectedDayEvents.length })}
          </p>
        </div>
        <button
          onClick={onJumpToToday}
          className={`px-3 py-2 text-sm rounded-xl transition-colors ${isDarkMode ? 'bg-white/5 text-gray-300 hover:bg-white/10' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
        >
          {t('calendar.jumpToToday')}
        </button>
      </div>

      <div className={`mb-4 inline-flex items-center gap-1 rounded-full p-1 ${isDarkMode ? 'bg-white/5 border border-white/10' : 'bg-slate-100 border border-slate-200'}`}>
        <button
          onClick={() => setRightPanelMode('day')}
          className={`px-3.5 py-2 rounded-full text-sm font-semibold transition-all ${rightPanelMode === 'day' ? 'bg-white text-slate-900 shadow-sm' : isDarkMode ? 'text-gray-300 hover:bg-white/5' : 'text-gray-600 hover:bg-white'}`}
        >
          {t('calendar.dayView')}
        </button>
        <button
          onClick={() => setRightPanelMode('month')}
          className={`px-3.5 py-2 rounded-full text-sm font-semibold transition-all ${rightPanelMode === 'month' ? 'bg-white text-slate-900 shadow-sm' : isDarkMode ? 'text-gray-300 hover:bg-white/5' : 'text-gray-600 hover:bg-white'}`}
        >
          {t('calendar.monthView')}
        </button>
      </div>

      {rightPanelMode === 'day' && (
        <>
          {selectedDayEvents.length === 0 ? (
            <div className={`rounded-2xl p-5 ${isDarkMode ? 'bg-white/5 text-gray-400' : 'bg-gray-50 text-gray-500'}`}>
              {t('calendar.emptyDay')}
            </div>
          ) : (
            <div className="space-y-3">
              {selectedDayEvents.map((event, index) => {
                const locality = event.address_locality || event.continent || ''
                const eventTime = event.date.toLocaleTimeString(i18nLanguage, { hour: '2-digit', minute: '2-digit' })
                return (
                  <div key={event.id} className={`rounded-2xl p-4 border ${isDarkMode ? 'bg-white/5 border-white/5' : 'bg-gray-50 border-gray-100'}`}>
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span className={`h-2.5 w-2.5 rounded-full ${index % 4 === 0 ? 'bg-sky-500' : index % 4 === 1 ? 'bg-emerald-500' : index % 4 === 2 ? 'bg-violet-500' : 'bg-rose-500'}`} />
                          <span className={`text-xs font-semibold uppercase tracking-[0.2em] ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                            {eventTime}
                          </span>
                        </div>
                        <p className={`text-sm font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
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
                  className={`w-full text-left rounded-2xl p-3 transition-all hover:-translate-y-0.5 ${isDarkMode ? 'bg-white/5 hover:bg-white/10' : 'bg-white hover:bg-gray-100'}`}
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
