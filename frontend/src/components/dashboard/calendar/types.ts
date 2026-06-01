import type { Event } from '@/hooks/useTournaments'

export type CalendarEvent = Event & {
  date: Date
  endDate: Date
}

export type CalendarViewMode = 'month' | 'week' | 'day'
export type RightPanelMode = 'day' | 'month'
