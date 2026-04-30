import type { Event } from "@/hooks/useTournaments"
import { formatDate } from "@/utils/dateFormatter"
import { CountryFlag } from "../shared/CountryFlag"

interface TournamentCardProps {
  event: Event
  isDarkMode: boolean
  onSelect: (tournament: { id: number; name: string; start_date: string; end_date?: string }) => void
}

export function TournamentCard({ event, isDarkMode, onSelect }: TournamentCardProps) {
  return (
    <div
      onClick={() => onSelect({
        id: event.id,
        name: event.full_name || event.name,
        start_date: event.start_date,
        end_date: event.end_date
      })}
      className={`rounded-lg transition-all hover:scale-[1.02] cursor-pointer overflow-hidden ${
        isDarkMode
          ? 'bg-[#1e293b] hover:bg-[#334155] shadow-lg hover:shadow-2xl'
          : 'bg-white hover:shadow-xl border border-gray-200 shadow-lg'
      }`}
    >
      <div className="flex h-full">
        <div className={`w-32 flex-shrink-0 flex items-center justify-center p-4 ${
          isDarkMode ? 'bg-white/5' : 'bg-gray-50'
        }`}>
          {event.country_iso_code ? (
            <CountryFlag code={event.country_iso_code} style={{ fontSize: '5rem' }} flagOnly />
          ) : (
            <svg
              className={`w-20 h-20 ${isDarkMode ? 'text-gray-600' : 'text-gray-300'}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          )}
        </div>

        <div className="flex-1 p-4 flex flex-col justify-between">
          <div>
            <h3 className={`text-lg font-bold mb-3 line-clamp-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
              {event.name}
            </h3>

            <div className="space-y-2 text-sm">
              <div className={`flex items-start gap-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                <svg className="w-4 h-4 mt-0.5 flex-shrink-0 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <div>
                  <span className="font-medium">{formatDate(event.start_date)}</span>
                  {event.end_date && event.end_date !== event.start_date && (
                    <>
                      <br />
                      <span className={isDarkMode ? 'text-gray-400' : 'text-gray-500'}>
                        → {formatDate(event.end_date)}
                      </span>
                    </>
                  )}
                </div>
              </div>

              {event.address_locality && (
                <div className={`flex items-center gap-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  <svg className="w-4 h-4 flex-shrink-0 text-orange-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <span className="truncate">{event.address_locality}</span>
                </div>
              )}

              {event.continent && (
                <div className={`flex items-center gap-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  <svg className="w-4 h-4 flex-shrink-0 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>{event.continent}</span>
                </div>
              )}

              {event.tournament_type && (
                <div className="pt-1">
                  <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                    isDarkMode ? 'bg-purple-500/20 text-purple-300' : 'bg-purple-100 text-purple-700'
                  }`}>
                    {event.tournament_type}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
