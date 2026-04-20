import type { TFunction } from 'i18next'
import type { ReactNode } from 'react'
import { formatDate } from '@/utils/dateFormatter'
import type { CalendarEvent, CalendarViewMode } from './types'

interface CalendarGridViewsProps {
  isDarkMode: boolean
  t: TFunction
  i18nLanguage: string
  viewMode: CalendarViewMode
  weekdayLabels: string[]
  monthCells: Date[]
  weekDays: Date[]
  dayEvents: CalendarEvent[]
  fullDateLabel: string
  eventMap: Map<string, CalendarEvent[]>
  dateKey: (date: Date) => string
  isInVisibleMonth: (date: Date) => boolean
  isToday: (date: Date) => boolean
  isSelected: (date: Date) => boolean
  flashDateKey: string | null
  selectDate: (date: Date) => void
  renderEventDots: (eventsForDay: CalendarEvent[]) => ReactNode
  selectedDate: Date
}

export function CalendarGridViews({
  isDarkMode,
  t,
  i18nLanguage,
  viewMode,
  weekdayLabels,
  monthCells,
  weekDays,
  dayEvents,
  fullDateLabel,
  eventMap,
  dateKey,
  isInVisibleMonth,
  isToday,
  isSelected,
  flashDateKey,
  selectDate,
  renderEventDots,
  selectedDate,
}: CalendarGridViewsProps) {
  if (viewMode === 'day') {
    return (
      <div className={`rounded-3xl border p-5 ${isDarkMode ? 'border-white/10 bg-white/[0.04]' : 'border-gray-200 bg-slate-50'}`}>
        <div className="flex items-center justify-between gap-4 mb-4">
          <div>
            <h4 className={`text-xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
              {fullDateLabel}
            </h4>
            <p className={`text-xs mt-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
              {t('calendar.daySummary', { count: dayEvents.length })}
            </p>
          </div>
          <span className={`rounded-full px-3 py-1 text-xs font-semibold ${isDarkMode ? 'bg-sky-500/10 text-sky-300' : 'bg-sky-100 text-sky-700'}`}>
            {dayEvents.length}
          </span>
        </div>

        {dayEvents.length === 0 ? (
          <p className={`${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>{t('calendar.emptyDay')}</p>
        ) : (
          <div className="space-y-3">
            {dayEvents.map((event, index) => (
              <div key={event.id} className={`rounded-2xl p-4 border ${isDarkMode ? 'bg-[#0f172a] border-white/5' : 'bg-white border-gray-100'}`}>
                <div className="flex items-start gap-3">
                  <span className={`mt-1 h-2.5 w-2.5 rounded-full ${index % 4 === 0 ? 'bg-sky-500' : index % 4 === 1 ? 'bg-emerald-500' : index % 4 === 2 ? 'bg-violet-500' : 'bg-rose-500'}`} />
                  <div className="min-w-0 flex-1">
                    <p className={`text-sm font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                      {event.name}
                    </p>
                    <p className={`text-xs mt-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                      {formatDate(event.start_date, i18nLanguage)}{event.address_locality || event.continent ? ` · ${event.address_locality || event.continent}` : ''}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    )
  }

  if (viewMode === 'week') {
    return (
      <div className={`rounded-2xl overflow-hidden border ${isDarkMode ? 'border-white/10' : 'border-gray-200'}`}>
        <div className={`grid grid-cols-7 text-[11px] uppercase tracking-[0.22em] font-semibold ${isDarkMode ? 'text-gray-400 bg-white/[0.02]' : 'text-gray-500 bg-gray-50'} [&>*:nth-child(7n)]:border-r-0`}>
          {weekdayLabels.map(label => (
            <div key={label} className={`px-1 py-2 text-center border-r border-b ${isDarkMode ? 'border-white/10' : 'border-gray-200'}`}>
              {label}
            </div>
          ))}
        </div>

        <div className={`grid grid-cols-7 [&>*:nth-child(7n)]:border-r-0`}>
          {weekDays.map((date) => {
            const dateEvents = eventMap.get(dateKey(date)) || []
            const selectedMarker = isSelected(date)
            const todayMarker = isToday(date)
            return (
              <button
                key={dateKey(date)}
                onClick={() => selectDate(date)}
                className={`min-h-[228px] border-r text-left p-3 transition-colors ${
                  selectedMarker
                    ? isDarkMode
                      ? 'bg-sky-500/12 outline outline-1 outline-sky-400 -outline-offset-1'
                      : 'bg-sky-50 outline outline-1 outline-sky-500 -outline-offset-1'
                    : isDarkMode
                      ? 'bg-white/[0.03] hover:bg-white/[0.06]'
                      : 'bg-white hover:bg-gray-50'
                } ${isDarkMode ? 'border-white/10' : 'border-gray-200'} ${flashDateKey === dateKey(date) ? isDarkMode ? 'animate-pulse shadow-[0_0_0_2px_rgba(56,189,248,0.45)]' : 'animate-pulse shadow-[0_0_0_2px_rgba(14,165,233,0.35)]' : ''}`}
              >
                <div className="flex items-center justify-between gap-2">
                  {dateEvents.length > 0 && (
                    <span className={`inline-flex h-8 min-w-8 items-center justify-center rounded-md px-2 text-[11px] font-semibold ${isDarkMode ? 'bg-sky-500/12 text-sky-300' : 'bg-sky-50 text-sky-700'}`}>
                      {dateEvents.length}
                    </span>
                  )}
                  <span className={`ml-auto text-sm font-semibold ${todayMarker ? 'text-sky-500' : isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                    {date.getDate()}
                  </span>
                </div>
                <div className="mt-3 min-h-[14px]">{dateEvents.length > 0 && renderEventDots(dateEvents)}</div>
              </button>
            )
          })}
        </div>
      </div>
    )
  }

  return (
    <div
      className={`rounded-2xl overflow-hidden border ${isDarkMode ? 'border-white/10' : 'border-gray-200'}`}
      data-selected-date={selectedDate.toISOString()}
    >
      <div className={`grid grid-cols-7 text-[11px] uppercase tracking-[0.22em] font-semibold ${isDarkMode ? 'text-gray-400 bg-white/[0.02]' : 'text-gray-500 bg-gray-50'} [&>*:nth-child(7n)]:border-r-0`}>
        {weekdayLabels.map(label => (
          <div key={label} className={`px-1 py-2 text-center border-r border-b ${isDarkMode ? 'border-white/10' : 'border-gray-200'}`}>
            {label}
          </div>
        ))}
      </div>

      <div className={`grid grid-cols-7 [&>*:nth-child(7n)]:border-r-0 [&>*:nth-last-child(-n+7)]:border-b-0`}>
        {monthCells.map((date) => {
          const dateEvents = eventMap.get(dateKey(date)) || []
          const inMonth = isInVisibleMonth(date)
          const todayMarker = isToday(date)
          const selectedMarker = isSelected(date)
          return (
            <button
              key={dateKey(date)}
              onClick={() => selectDate(date)}
              className={`group relative min-h-[152px] border-r border-b text-left p-2.5 md:p-3.5 transition-colors ${
                selectedMarker
                  ? isDarkMode
                    ? 'bg-sky-500/12 outline outline-1 outline-sky-400 -outline-offset-1'
                    : 'bg-sky-50 outline outline-1 outline-sky-500 -outline-offset-1'
                  : inMonth
                    ? isDarkMode
                      ? 'bg-white/[0.03] hover:bg-white/[0.06]'
                      : 'bg-white hover:bg-gray-50'
                    : isDarkMode
                      ? 'bg-white/[0.015] opacity-65 hover:opacity-90'
                      : 'bg-gray-50 opacity-70 hover:opacity-95'
              } ${isDarkMode ? 'border-white/10' : 'border-gray-200'} ${flashDateKey === dateKey(date) ? isDarkMode ? 'animate-pulse shadow-[0_0_0_2px_rgba(56,189,248,0.45)]' : 'animate-pulse shadow-[0_0_0_2px_rgba(14,165,233,0.35)]' : ''}`}
            >
              <div className="flex items-center justify-between gap-2">
                {dateEvents.length > 0 && (
                  <span className={`inline-flex h-8 min-w-8 items-center justify-center rounded-md px-2 text-[11px] font-semibold ${isDarkMode ? 'bg-sky-500/12 text-sky-300' : 'bg-sky-50 text-sky-700'}`}>
                    {dateEvents.length}
                  </span>
                )}
                <span
                  className={`inline-flex h-8 min-w-8 ml-auto items-center justify-center rounded-full text-sm font-semibold transition-colors ${
                    todayMarker
                      ? isDarkMode
                        ? 'bg-sky-500 text-white'
                        : 'bg-sky-600 text-white'
                      : inMonth
                        ? isDarkMode
                          ? 'text-white'
                          : 'text-gray-900'
                        : isDarkMode
                          ? 'text-gray-500'
                          : 'text-gray-400'
                  }`}
                >
                  {date.getDate()}
                </span>
              </div>

              <div className="mt-3 min-h-[14px]">
                {dateEvents.length > 0 && renderEventDots(dateEvents)}
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
