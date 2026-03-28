import type { FightResult, WeightCategory } from "../types"

interface ResultsTabProps {
  isDarkMode: boolean
  results: FightResult[]
  resultsLoading: boolean
  resultsError: string | null
  weightCategories: WeightCategory[]
  weightCategoriesLoading: boolean
  selectedWeightCategoryForResults: { id: number; name: string; sport_name: string; audience_name: string } | null
  openWeightCategoryResultsDetail: (wc: { id: number; name: string; sport_name: string; audience_name: string }) => void
  closeWeightCategoryResultsDetail: () => void
  getWeightCategoryStatus: (wc: WeightCategory) => 'completed' | 'ongoing' | 'waiting'
  onSelectPerson?: (person: { id: number; name: string }) => void
  handleNameClick: (name: string) => void
}

export function ResultsTab({
  isDarkMode,
  results,
  resultsLoading,
  resultsError,
  weightCategories,
  weightCategoriesLoading,
  selectedWeightCategoryForResults,
  openWeightCategoryResultsDetail,
  closeWeightCategoryResultsDetail,
  getWeightCategoryStatus,
  onSelectPerson,
  handleNameClick,
}: ResultsTabProps) {
  if (selectedWeightCategoryForResults) {
    return (
      <div>
        {/* Detail View Header */}
        <div className="flex items-center gap-4 mb-6">
          <button
            onClick={closeWeightCategoryResultsDetail}
            className={`p-2 rounded-lg transition-all ${
              isDarkMode
                ? 'hover:bg-white/5 text-gray-300 hover:text-white'
                : 'hover:bg-gray-100 text-gray-600 hover:text-gray-900'
            }`}
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </button>
          <div className="flex-1">
            <h3 className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
              {selectedWeightCategoryForResults.name}
            </h3>
            <p className={`text-sm mt-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              {selectedWeightCategoryForResults.sport_name} • {selectedWeightCategoryForResults.audience_name}
            </p>
          </div>
        </div>

        {/* Results in spider/bracket layout */}
        {(() => {
          const categoryFights = results.filter(r => r.weightCategoryName === selectedWeightCategoryForResults.name)

          if (categoryFights.length === 0) {
            const weightCategory = weightCategories.find(wc => wc.id === selectedWeightCategoryForResults.id)
            const hasFighters = weightCategory && weightCategory.count_fighters > 0

            return (
              <div className={`text-center py-12 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                <svg className={`mx-auto h-12 w-12 mb-4 ${isDarkMode ? 'text-gray-600' : 'text-gray-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <p className="text-lg font-medium">
                  {hasFighters ? 'Zápasy ešte neboli vygenerované' : 'Žiadne výsledky'}
                </p>
                {hasFighters && (
                  <p className="text-sm mt-2">V tejto váhovej kategórií sú zápasníci, ale zápasy ešte neboli vytvorené</p>
                )}
              </div>
            )
          }

          const validFights = categoryFights.filter(fight =>
            fight.fighter1FullName && fight.fighter1FullName.trim() !== '' &&
            fight.fighter2FullName && fight.fighter2FullName.trim() !== ''
          )

          const roundGroups = validFights.reduce((acc, fight) => {
            const roundName = fight.roundFriendlyName
            if (!acc[roundName]) {
              acc[roundName] = []
            }
            acc[roundName].push(fight)
            return acc
          }, {} as Record<string, FightResult[]>)

          const sortedRounds = Object.entries(roundGroups).sort((a, b) => {
            const [nameA] = a
            const [nameB] = b

            const getPriority = (name: string) => {
              const lower = name.toLowerCase()

              if (lower.includes('qualif')) return 1

              const groupMatch = lower.match(/([a-z])\s*\|\s*round\s+(\d+)/)
              if (groupMatch) {
                const roundNum = parseInt(groupMatch[2])
                return 2 + (roundNum - 1) * 0.1 + (groupMatch[1].charCodeAt(0) - 97) * 0.01
              }

              if (lower.includes('1/4') || lower.includes('quarter')) return 10
              if (lower.includes('1/2') || lower.includes('semi')) return 11
              if (lower.includes('repechage') || lower.includes('repêchage')) return 12
              if (lower.includes('final 3-5') || lower.includes('final3-5')) return 13
              if (lower.includes('final 3-4') || lower.includes('final3-4')) return 14
              if (lower.includes('final 1-2') || lower.includes('final1-2')) return 15
              if (lower.includes('final 1-3') || lower.includes('final1-3')) return 16
              if (lower.includes('final')) return 17

              return 20
            }

            const priorityDiff = getPriority(nameA) - getPriority(nameB)
            if (priorityDiff !== 0) return priorityDiff

            return nameA.localeCompare(nameB)
          })

          return (
            <div className="space-y-8">
              {sortedRounds.map(([roundName, fights]) => (
                <div key={roundName}>
                  <h2 className={`text-2xl font-bold mb-4 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                    {roundName}
                  </h2>

                  <div className={`rounded-lg overflow-hidden ${isDarkMode ? 'shadow-lg' : 'border border-gray-200'}`}>
                    <table className="w-full">
                      <thead>
                        <tr className={`border-b ${isDarkMode ? 'border-white/5 bg-white/5' : 'border-gray-200 bg-gray-50'}`}>
                          <th className={`text-left py-3 px-4 text-sm font-semibold ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                            Wrestler
                          </th>
                          <th className={`text-center py-3 px-4 text-sm font-semibold ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                            TP
                          </th>
                          <th className={`text-center py-3 px-4 text-sm font-semibold ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                            CP
                          </th>
                          <th className={`text-center py-3 px-4 text-sm font-semibold ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                            Victory
                          </th>
                          <th className={`text-center py-3 px-4 text-sm font-semibold ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                            Time
                          </th>
                          <th className={`text-center py-3 px-4 text-sm font-semibold ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                            CP
                          </th>
                          <th className={`text-center py-3 px-4 text-sm font-semibold ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                            TP
                          </th>
                          <th className={`text-right py-3 px-4 text-sm font-semibold ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                            Wrestler
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {fights.sort((a, b) => a.fightNumber - b.fightNumber).map((fight) => {
                          const isFighter1Winner = fight.winnerFighter === fight.fighter1Id
                          const isFighter2Winner = fight.winnerFighter === fight.fighter2Id

                          return (
                            <tr
                              key={fight.id}
                              className={`border-b last:border-b-0 ${
                                isDarkMode
                                  ? 'border-white/5 hover:bg-white/5'
                                  : 'border-gray-100 hover:bg-gray-50'
                              }`}
                            >
                              <td className={`py-3 px-4 ${
                                isFighter1Winner
                                  ? isDarkMode ? 'text-red-400 font-bold' : 'text-red-700 font-bold'
                                  : isDarkMode ? 'text-gray-300' : 'text-gray-700'
                              }`}>
                                {onSelectPerson ? (
                                  <button onClick={() => handleNameClick(fight.fighter1FullName)} className="hover:underline text-left">
                                    {fight.fighter1FullName}
                                  </button>
                                ) : fight.fighter1FullName}
                              </td>

                              <td className={`py-3 px-4 text-center text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                                {(() => {
                                  const tp = fight.technicalPoints?.find((tp: Record<string, unknown>) => tp.fighterId === fight.fighter1Id)
                                  return tp ? String(tp.points) : '-'
                                })()}
                              </td>

                              <td className={`py-3 px-4 text-center text-sm ${
                                isFighter1Winner
                                  ? isDarkMode ? 'text-red-400 font-bold' : 'text-red-700 font-bold'
                                  : isDarkMode ? 'text-gray-400' : 'text-gray-600'
                              }`}>
                                {fight.fighter1RankingPoint}
                              </td>

                              <td className={`py-3 px-4 text-center text-sm font-medium ${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`}>
                                {fight.victoryTypeName}
                              </td>

                              <td className={`py-3 px-4 text-center text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                                {fight.endTime > 0 ? `${Math.floor(fight.endTime / 60)}:${String(fight.endTime % 60).padStart(2, '0')}` : 'Nedefinovaný'}
                              </td>

                              <td className={`py-3 px-4 text-center text-sm ${
                                isFighter2Winner
                                  ? isDarkMode ? 'text-red-400 font-bold' : 'text-red-700 font-bold'
                                  : isDarkMode ? 'text-gray-400' : 'text-gray-600'
                              }`}>
                                {fight.fighter2RankingPoint}
                              </td>

                              <td className={`py-3 px-4 text-center text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                                {(() => {
                                  const tp = fight.technicalPoints?.find((tp: Record<string, unknown>) => tp.fighterId === fight.fighter2Id)
                                  return tp ? String(tp.points) : '-'
                                })()}
                              </td>

                              <td className={`py-3 px-4 text-right ${
                                isFighter2Winner
                                  ? isDarkMode ? 'text-red-400 font-bold' : 'text-red-700 font-bold'
                                  : isDarkMode ? 'text-gray-300' : 'text-gray-700'
                              }`}>
                                {onSelectPerson ? (
                                  <button onClick={() => handleNameClick(fight.fighter2FullName)} className="hover:underline text-right">
                                    {fight.fighter2FullName}
                                  </button>
                                ) : fight.fighter2FullName}
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}
            </div>
          )
        })()}
      </div>
    )
  }

  return (
    <div>
      <h3 className={`text-xl font-semibold mb-6 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
        Výsledky
      </h3>

      {resultsError && (
        <div className={`p-4 rounded-lg mb-4 ${isDarkMode ? 'bg-red-900/20 text-red-400' : 'bg-red-50 text-red-600'}`}>
          {resultsError}
        </div>
      )}

      {resultsLoading || weightCategoriesLoading ? (
        <div className={`text-center py-12 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p>Načítavam váhové kategórie...</p>
        </div>
      ) : weightCategories.length === 0 ? (
        <div className={`text-center py-12 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
          <svg className={`mx-auto h-12 w-12 mb-4 ${isDarkMode ? 'text-gray-600' : 'text-gray-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <p className="text-lg font-medium">Žiadne váhové kategórie</p>
          <p className="text-sm mt-2">Použite synchronizáciu na hlavnej stránke</p>
        </div>
      ) : (
        <div className="space-y-12">
          {(() => {
            const grouped = weightCategories.reduce((acc, wc) => {
              const key = `${wc.sport_name} - ${wc.audience_name}`
              if (!acc[key]) {
                acc[key] = []
              }
              acc[key].push(wc)
              return acc
            }, {} as Record<string, WeightCategory[]>)

            return Object.entries(grouped).map(([type, categories]) => (
              <div key={type}>
                <h1 className={`text-4xl font-bold mb-8 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                  {type}
                </h1>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {categories.map((wc) => (
                    <div
                      key={wc.id}
                      onClick={() => openWeightCategoryResultsDetail({ id: wc.id, name: wc.name, sport_name: wc.sport_name, audience_name: wc.audience_name })}
                      className={`rounded-lg p-4 transition-all cursor-pointer ${
                        isDarkMode
                          ? 'bg-[#0f172a]/50 hover:bg-[#1e293b] shadow-md hover:shadow-xl backdrop-blur-sm'
                          : 'bg-gray-50 hover:bg-gray-100 border border-gray-200'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-3">
                        <h4 className={`font-bold text-lg ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                          {wc.name}
                        </h4>
                        <div>
                          {(() => {
                            const status = getWeightCategoryStatus(wc)
                            if (status === 'completed') {
                              return (
                                <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${isDarkMode ? 'bg-green-900/30 text-green-400' : 'bg-green-100 text-green-800'}`}>
                                  Dokončené
                                </span>
                              )
                            } else if (status === 'ongoing') {
                              return (
                                <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${isDarkMode ? 'bg-blue-900/30 text-blue-400' : 'bg-blue-100 text-blue-800'}`}>
                                  Prebieha
                                </span>
                              )
                            } else {
                              return (
                                <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${isDarkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-700'}`}>
                                  Čaká
                                </span>
                              )
                            }
                          })()}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 text-sm">
                        <svg className={`w-4 h-4 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                        </svg>
                        <span className={`font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                          {wc.count_fighters} zápasníkov
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))
          })()}
        </div>
      )}
    </div>
  )
}
