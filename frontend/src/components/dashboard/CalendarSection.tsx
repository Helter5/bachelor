import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useTournaments } from '@/hooks/useTournaments'
import { CalendarTopBar } from './calendar/CalendarTopBar'
import { CalendarGridViews } from './calendar/CalendarGridViews'
import { CalendarSidebar } from './calendar/CalendarSidebar'
import type { CalendarEvent, CalendarViewMode, RightPanelMode } from './calendar/types'

interface CalendarSectionProps {
  isDarkMode: boolean
}

export function CalendarSection({ isDarkMode }: CalendarSectionProps) {
  const { t, i18n } = useTranslation()
  const { events, loading, error } = useTournaments()

  const today = useMemo(() => new Date(), [])
  const [searchQuery, setSearchQuery] = useState('')
  const [viewMode, setViewMode] = useState<CalendarViewMode>('month')
  const [rightPanelMode, setRightPanelMode] = useState<RightPanelMode>('day')
  const [flashDateKey, setFlashDateKey] = useState<string | null>(null)
  const [flashTick, setFlashTick] = useState(0)
  const [visibleMonth, setVisibleMonth] = useState(() => new Date(today.getFullYear(), today.getMonth(), 1))
  const [selectedDate, setSelectedDate] = useState(() => new Date(today.getFullYear(), today.getMonth(), today.getDate()))

  const dateKey = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`

  const monthFormatter = useMemo(() => new Intl.DateTimeFormat(i18n.language, { month: 'long' }), [i18n.language])
  const fullDateFormatter = useMemo(() => new Intl.DateTimeFormat(i18n.language, { dateStyle: 'full' }), [i18n.language])
  const weekdayFormatter = useMemo(() => new Intl.DateTimeFormat(i18n.language, { weekday: 'short' }), [i18n.language])

  const validEvents = useMemo<CalendarEvent[]>(() => {
    return events
      .map(event => ({
        ...event,
        date: new Date(event.start_date),
      }))
      .filter(event => !Number.isNaN(event.date.getTime()))
      .sort((a, b) => a.date.getTime() - b.date.getTime())
  }, [events])

  const filteredEvents = useMemo(() => {
    const query = searchQuery.trim().toLowerCase()
    if (!query) return validEvents

    return validEvents.filter(event => {
      const haystack = [
        event.name,
        event.full_name || '',
        event.address_locality || '',
        event.continent || '',
      ]
        .join(' ')
        .toLowerCase()

      return haystack.includes(query)
    })
  }, [validEvents, searchQuery])

  useEffect(() => {
    const query = searchQuery.trim()
    if (!query || filteredEvents.length === 0) return

    const firstMatch = filteredEvents[0].date
    const matchKey = dateKey(firstMatch)
    const shouldChangeMonth =
      firstMatch.getFullYear() !== visibleMonth.getFullYear() ||
      firstMatch.getMonth() !== visibleMonth.getMonth()

    const shouldChangeDay = dateKey(firstMatch) !== dateKey(selectedDate)

    if (shouldChangeMonth) {
      setVisibleMonth(new Date(firstMatch.getFullYear(), firstMatch.getMonth(), 1))
    }

    if (shouldChangeDay) {
      setSelectedDate(new Date(firstMatch.getFullYear(), firstMatch.getMonth(), firstMatch.getDate()))
    }

    setFlashDateKey(matchKey)
    setFlashTick((value) => value + 1)
    setRightPanelMode('month')
  }, [searchQuery, filteredEvents, visibleMonth, selectedDate])

  useEffect(() => {
    if (!flashDateKey) return
    const timeoutId = setTimeout(() => setFlashDateKey(null), 900)
    return () => clearTimeout(timeoutId)
  }, [flashDateKey, flashTick])

  const addMonths = (date: Date, delta: number) => new Date(date.getFullYear(), date.getMonth() + delta, 1)
  const startOfMonth = useMemo(
    () => new Date(visibleMonth.getFullYear(), visibleMonth.getMonth(), 1),
    [visibleMonth]
  )
  const startWeekday = (startOfMonth.getDay() + 6) % 7
  const calendarStart = useMemo(() => {
    const start = new Date(startOfMonth)
    start.setDate(startOfMonth.getDate() - startWeekday)
    return start
  }, [startOfMonth, startWeekday])

  const eventMap = useMemo(() => {
    const map = new Map<string, typeof validEvents>()
    filteredEvents.forEach(event => {
      const key = dateKey(event.date)
      const list = map.get(key) || []
      list.push(event)
      map.set(key, list)
    })
    return map
  }, [filteredEvents])

  const monthCells = useMemo(() => {
    return Array.from({ length: 42 }, (_, index) => {
      const date = new Date(calendarStart)
      date.setDate(calendarStart.getDate() + index)
      return date
    })
  }, [calendarStart])

  const selectedDayEvents = eventMap.get(dateKey(selectedDate)) || []
  const visibleMonthEvents = filteredEvents.filter(event => event.date.getFullYear() === visibleMonth.getFullYear() && event.date.getMonth() === visibleMonth.getMonth())

  const weekdayLabels = useMemo(() => {
    const monday = new Date(2024, 0, 1)
    return Array.from({ length: 7 }, (_, index) => {
      const date = new Date(monday)
      date.setDate(monday.getDate() + index)
      return weekdayFormatter.format(date)
    })
  }, [weekdayFormatter])

  const goToMonth = (delta: number) => {
    setVisibleMonth(current => addMonths(current, delta))
  }

  const selectDate = (date: Date) => {
    setVisibleMonth(new Date(date.getFullYear(), date.getMonth(), 1))
    setSelectedDate(new Date(date.getFullYear(), date.getMonth(), date.getDate()))
    setRightPanelMode('day')
  }

  const getWeekStart = (date: Date) => {
    const start = new Date(date)
    const day = (start.getDay() + 6) % 7
    start.setDate(start.getDate() - day)
    return start
  }

  const weekStart = getWeekStart(selectedDate)
  const weekDays = useMemo(() => {
    return Array.from({ length: 7 }, (_, index) => {
      const date = new Date(weekStart)
      date.setDate(weekStart.getDate() + index)
      return date
    })
  }, [weekStart])

  const dayEvents = eventMap.get(dateKey(selectedDate)) || []

  const isToday = (date: Date) => dateKey(date) === dateKey(today)
  const isSelected = (date: Date) => dateKey(date) === dateKey(selectedDate)
  const isInVisibleMonth = (date: Date) => date.getMonth() === visibleMonth.getMonth() && date.getFullYear() === visibleMonth.getFullYear()

  const eventColors = ['bg-sky-500', 'bg-emerald-500', 'bg-violet-500', 'bg-rose-500', 'bg-amber-500', 'bg-cyan-500']

  const formatMonthYear = (date: Date) => {
    const month = monthFormatter.format(date)
    const monthTitleCase = month.charAt(0).toLocaleUpperCase(i18n.language) + month.slice(1)
    return `${monthTitleCase}, ${date.getFullYear()}`
  }

  const renderEventDots = (eventsForDay: CalendarEvent[]) => (
    <div className="flex flex-wrap items-center gap-1.5 max-w-full">
      {eventsForDay.map((event, index) => (
        <span
          key={event.id}
          className={`h-2.5 w-2.5 rounded-full ring-2 ${isDarkMode ? 'ring-[#111827]' : 'ring-white'} ${eventColors[index % eventColors.length]}`}
          title={event.name}
        />
      ))}
    </div>
  )

  const viewToggleClass = (mode: CalendarViewMode) =>
    `px-3.5 py-2 rounded-full text-sm font-semibold transition-all ${
      viewMode === mode
        ? isDarkMode
          ? 'bg-white text-slate-900 shadow-sm'
          : 'bg-white text-slate-900 shadow-sm'
        : isDarkMode
          ? 'text-gray-300 hover:bg-white/5'
          : 'text-gray-600 hover:bg-white'
    }`

  return (
    <div className="my-6 space-y-6">
      {loading && (
        <div className={`rounded-2xl p-5 ${isDarkMode ? 'bg-[#1e293b] text-gray-300 border border-white/10' : 'bg-white border border-gray-200 text-gray-600'}`}>
          {t('common.loading')}
        </div>
      )}

      {error && !loading && (
        <div className={`rounded-2xl p-5 ${isDarkMode ? 'bg-red-500/10 text-red-300 border border-red-500/20' : 'bg-red-50 text-red-700 border border-red-200'}`}>
          {error}
        </div>
      )}

      {!loading && !error && (
        <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
          <section className={`xl:col-span-3 rounded-[28px] p-5 md:p-6 shadow-[0_20px_60px_-32px_rgba(15,23,42,0.35)] ${isDarkMode ? 'bg-[#111827] border border-white/10' : 'bg-white border border-gray-200'}`}>
            <CalendarTopBar
              isDarkMode={isDarkMode}
              t={t}
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
              monthLabel={formatMonthYear(visibleMonth)}
              onPrevMonth={() => goToMonth(-1)}
              onNextMonth={() => goToMonth(1)}
              viewMode={viewMode}
              setViewMode={setViewMode}
              viewToggleClass={viewToggleClass}
            />

            <CalendarGridViews
              isDarkMode={isDarkMode}
              t={t}
              i18nLanguage={i18n.language}
              viewMode={viewMode}
              weekdayLabels={weekdayLabels}
              monthCells={monthCells}
              weekDays={weekDays}
              selectedDate={selectedDate}
              dayEvents={dayEvents}
              fullDateLabel={fullDateFormatter.format(selectedDate)}
              eventMap={eventMap}
              dateKey={dateKey}
              isInVisibleMonth={isInVisibleMonth}
              isToday={isToday}
              isSelected={isSelected}
              flashDateKey={flashDateKey}
              selectDate={selectDate}
              renderEventDots={renderEventDots}
            />
          </section>

          <CalendarSidebar
            isDarkMode={isDarkMode}
            t={t}
            i18nLanguage={i18n.language}
            fullDateLabel={fullDateFormatter.format(selectedDate)}
            selectedDayEvents={selectedDayEvents}
            visibleMonthEvents={visibleMonthEvents}
            rightPanelMode={rightPanelMode}
            setRightPanelMode={setRightPanelMode}
            onJumpToToday={() => selectDate(today)}
            onSelectDate={selectDate}
            eventColors={eventColors}
          />
        </div>
      )}
    </div>
  )
}