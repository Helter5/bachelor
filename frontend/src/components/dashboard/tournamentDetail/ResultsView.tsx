import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { CountryFlag } from '../shared/CountryFlag'
import type { FightResult } from './types'

interface ResultsViewProps {
  isDarkMode: boolean
  sortedRounds: [string, FightResult[]][]
  teamCountryByName: Record<string, string | null>
}

export function ResultsView({ isDarkMode, sortedRounds, teamCountryByName }: ResultsViewProps) {
  const { t } = useTranslation()

  const normalizeRoundName = (name: string) =>
    name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, ' ')
      .trim()

  const normalizeTeamName = (name: string) =>
    name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/\s+/g, ' ')
      .trim()

  const [expandedRounds, setExpandedRounds] = useState<Set<string>>(() => {
    const expanded = new Set<string>()
    const isFinal = (name: string) => {
      const normalized = normalizeRoundName(name)
      return (normalized.includes('final') || normalized.includes('finale')) && !/\b3\b/.test(normalized)
    }
    sortedRounds.forEach(([name]) => {
      if (isFinal(name)) expanded.add(name)
    })
    if (sortedRounds.length <= 2) {
      sortedRounds.forEach(([name]) => expanded.add(name))
    } else {
      sortedRounds.slice(-2).forEach(([name]) => expanded.add(name))
    }
    return expanded
  })

  const toggleRound = (roundName: string) => {
    const newExpanded = new Set(expandedRounds)
    if (newExpanded.has(roundName)) {
      newExpanded.delete(roundName)
    } else {
      newExpanded.add(roundName)
    }
    setExpandedRounds(newExpanded)
  }

  const getVictoryTypeColor = (victoryType: string) => {
    const vtLower = victoryType.toLowerCase()
    if (vtLower.includes('fall') || vtLower.includes('pin')) return 'text-purple-500'
    if (vtLower.includes('technical') || vtLower.includes(' tf')) return 'text-blue-500'
    if (vtLower.includes('disq') || vtLower.includes('forfeit')) return 'text-red-500'
    if (vtLower.includes('injury')) return 'text-orange-500'
    return 'text-gray-500'
  }

  const getRoundCategory = (roundName: string) => {
    const normalized = normalizeRoundName(roundName)
    const hasFinal = normalized.includes('final') || normalized.includes('finale')
    const hasGroupRatioRound =
      /\b1\s*16\b/.test(normalized) ||
      /\b1\s*8\b/.test(normalized) ||
      /\b1\s*4\b/.test(normalized) ||
      /\b1\s*2\b/.test(normalized)
    const hasExplicitFinal12 =
      /\b(final|finale)\b.*\b1\s*2\b/.test(normalized) ||
      /\b(final|finale)\b.*\b(1st|2nd|gold)\b/.test(normalized) ||
      /\b(1st|2nd|gold)\b.*\b(final|finale)\b/.test(normalized)

    if (normalized.includes('repechage')) return 'repechage'
    if (hasFinal && /\b(3\s*4|3\s*5|3rd|bronze)\b/.test(normalized)) return 'final3'
    if (hasGroupRatioRound && !hasExplicitFinal12) {
      return 'groupStage'
    }
    if (hasFinal && hasExplicitFinal12) return 'final12'
    if (normalized.includes('qualification') || normalized.includes('group')) {
      return 'groupStage'
    }
    if (hasFinal) return 'final12'
    return 'default'
  }

  const getRoundTheme = (roundName: string) => {
    const category = getRoundCategory(roundName)

    if (category === 'repechage') {
      return {
        headerBorder: isDarkMode ? 'border-amber-500/30 hover:border-amber-500/50' : 'border-amber-200 hover:border-amber-300',
        headerText: isDarkMode ? 'text-amber-400' : 'text-amber-700',
        card: isDarkMode ? 'border-amber-500/20 bg-amber-500/5' : 'border-amber-200 bg-amber-50/30',
      }
    }

    if (category === 'final12') {
      return {
        headerBorder: isDarkMode ? 'border-rose-500/30 hover:border-rose-500/50' : 'border-rose-200 hover:border-rose-300',
        headerText: isDarkMode ? 'text-rose-400' : 'text-rose-700',
        card: isDarkMode ? 'border-rose-500/20 bg-rose-500/5' : 'border-rose-200 bg-rose-50/30',
      }
    }

    if (category === 'final3') {
      return {
        headerBorder: isDarkMode ? 'border-violet-500/30 hover:border-violet-500/50' : 'border-violet-200 hover:border-violet-300',
        headerText: isDarkMode ? 'text-violet-400' : 'text-violet-700',
        card: isDarkMode ? 'border-violet-500/20 bg-violet-500/5' : 'border-violet-200 bg-violet-50/30',
      }
    }

    if (category === 'groupStage') {
      return {
        headerBorder: isDarkMode ? 'border-sky-500/30 hover:border-sky-500/50' : 'border-sky-200 hover:border-sky-300',
        headerText: isDarkMode ? 'text-sky-400' : 'text-sky-700',
        card: isDarkMode ? 'border-sky-500/15 bg-sky-500/5' : 'border-sky-200 bg-sky-50/30',
      }
    }

    return {
      headerBorder: isDarkMode ? 'border-white/10 hover:border-white/20' : 'border-gray-200 hover:border-gray-300',
      headerText: isDarkMode ? 'text-white' : 'text-gray-900',
      card: isDarkMode ? 'border-white/[0.1] bg-[#0f172a]/50' : 'border-gray-200 bg-white',
    }
  }

  return (
    <div className="space-y-8">
      {sortedRounds.map(([roundName, roundFights]) => {
        const validFights = roundFights.filter(f => f.fighter1FullName?.trim() && f.fighter2FullName?.trim())
        if (validFights.length === 0) return null

        const isExpanded = expandedRounds.has(roundName)
        const roundTheme = getRoundTheme(roundName)

        return (
          <div key={roundName}>
            <button
              onClick={() => toggleRound(roundName)}
              className={`w-full mb-4 pb-3 border-b-2 transition-all text-left ${roundTheme.headerBorder}`}
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 flex-1">
                  <span className={`text-lg transition-transform ${isExpanded ? 'rotate-90' : 'rotate-0'}`}>▶</span>
                  <h3
                    className={`text-lg font-bold uppercase tracking-wider ${roundTheme.headerText}`}
                  >
                    {roundName}
                  </h3>
                </div>
                <span
                  className={`text-xs font-normal px-2 py-1 rounded-full shrink-0 ${
                    isDarkMode ? 'bg-white/10 text-gray-400' : 'bg-gray-100 text-gray-600'
                  }`}
                >
                  {validFights.length} {validFights.length === 1 ? t('tournamentDetail.fightSingular') : t('tournamentDetail.fightPlural')}
                </span>
              </div>
            </button>

            {isExpanded && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
              {validFights
                .sort((a, b) => a.fightNumber - b.fightNumber)
                .map((fight) => {
                  const w1 = fight.winnerFighter === fight.fighter1Id
                  const w2 = fight.winnerFighter === fight.fighter2Id
                  const tp1 = fight.technicalPoints?.find((tp: Record<string, unknown>) => tp.fighterId === fight.fighter1Id)
                  const tp2 = fight.technicalPoints?.find((tp: Record<string, unknown>) => tp.fighterId === fight.fighter2Id)
                  const tp1Val = tp1 ? Number(tp1.points) : 0
                  const tp2Val = tp2 ? Number(tp2.points) : 0
                  const cp1Val = Number.isFinite(Number(fight.fighter1RankingPoint)) ? Number(fight.fighter1RankingPoint) : 0
                  const cp2Val = Number.isFinite(Number(fight.fighter2RankingPoint)) ? Number(fight.fighter2RankingPoint) : 0
                  const timeStr = fight.endTime > 0 ? `${Math.floor(fight.endTime / 60)}:${String(fight.endTime % 60).padStart(2, '0')}` : null

                  return (
                    <div
                      key={fight.id}
                      className={`rounded-xl border-2 overflow-hidden transition-all hover:shadow-lg ${roundTheme.card}`}
                    >
                      <div
                        className={`px-3 py-2 border-b flex items-center justify-between text-xs font-semibold ${
                          isDarkMode
                            ? 'bg-white/5 border-white/[0.08]'
                            : 'bg-gray-50 border-gray-100'
                        }`}
                      >
                        <span className={`${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                          {t('tournamentDetail.matchNumber', { number: fight.fightNumber })}
                        </span>
                        {fight.victoryTypeName && (
                          <span
                            className={`px-2.5 py-1 rounded-md text-sm font-bold tracking-wide ${
                              isDarkMode ? 'bg-black/20 border border-white/10' : 'bg-white border border-gray-200'
                            } ${getVictoryTypeColor(fight.victoryTypeName)}`}
                          >
                            {t('tournamentDetail.victoryTypeLabel')}: {fight.victoryTypeName.length > 18 ? fight.victoryTypeName.substring(0, 18) + '…' : fight.victoryTypeName}
                          </span>
                        )}
                      </div>

                      <div
                        className={`px-3 py-3 border-b ${
                          w1
                            ? isDarkMode
                              ? 'bg-green-500/10 border-green-500/30'
                              : 'bg-green-50 border-green-200'
                            : isDarkMode
                              ? 'border-white/[0.05]'
                              : 'border-gray-100'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <p
                              className={`font-semibold text-sm truncate leading-tight ${
                                w1
                                  ? isDarkMode
                                    ? 'text-green-400'
                                    : 'text-green-700'
                                  : isDarkMode
                                    ? 'text-gray-300'
                                    : 'text-gray-600'
                              }`}
                              title={fight.fighter1FullName}
                            >
                              {fight.fighter1FullName}
                            </p>
                            {fight.team1FullName && (
                              <p className={`text-xs mt-1 truncate flex items-center gap-1.5 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                                <CountryFlag
                                  code={teamCountryByName[normalizeTeamName(fight.team1FullName)]}
                                  className="shrink-0"
                                  style={{ fontSize: '0.85rem' }}
                                  flagOnly
                                />
                                <span className="truncate">{fight.team1FullName}</span>
                              </p>
                            )}
                          </div>
                          <div className="shrink-0 min-w-[106px] text-right">
                            <div className={`grid grid-cols-2 gap-3 text-xs font-bold uppercase tracking-wide ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                              <span>CP</span>
                              <span>TP</span>
                            </div>
                            <div
                              className={`grid grid-cols-2 gap-3 text-[30px] leading-none font-extrabold tabular-nums mt-1 ${
                                w1
                                  ? isDarkMode
                                    ? 'text-green-400'
                                    : 'text-green-600'
                                  : isDarkMode
                                    ? 'text-gray-500'
                                    : 'text-gray-400'
                              }`}
                            >
                              <span>{cp1Val}</span>
                              <span>{tp1Val}</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div
                        className={`px-3 py-3 ${
                          w2
                            ? isDarkMode
                              ? 'bg-green-500/10 border-t border-green-500/30'
                              : 'bg-green-50 border-t border-green-200'
                            : isDarkMode
                              ? 'border-t border-white/[0.05]'
                              : 'border-t border-gray-100'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <p
                              className={`font-semibold text-sm truncate leading-tight ${
                                w2
                                  ? isDarkMode
                                    ? 'text-green-400'
                                    : 'text-green-700'
                                  : isDarkMode
                                    ? 'text-gray-300'
                                    : 'text-gray-600'
                              }`}
                              title={fight.fighter2FullName}
                            >
                              {fight.fighter2FullName}
                            </p>
                            {fight.team2FullName && (
                              <p className={`text-xs mt-1 truncate flex items-center gap-1.5 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                                <CountryFlag
                                  code={teamCountryByName[normalizeTeamName(fight.team2FullName)]}
                                  className="shrink-0"
                                  style={{ fontSize: '0.85rem' }}
                                  flagOnly
                                />
                                <span className="truncate">{fight.team2FullName}</span>
                              </p>
                            )}
                          </div>
                          <div className="shrink-0 min-w-[106px] text-right">
                            <div className={`grid grid-cols-2 gap-3 text-xs font-bold uppercase tracking-wide ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                              <span>CP</span>
                              <span>TP</span>
                            </div>
                            <div
                              className={`grid grid-cols-2 gap-3 text-[30px] leading-none font-extrabold tabular-nums mt-1 ${
                                w2
                                  ? isDarkMode
                                    ? 'text-green-400'
                                    : 'text-green-600'
                                  : isDarkMode
                                    ? 'text-gray-500'
                                    : 'text-gray-400'
                              }`}
                            >
                              <span>{cp2Val}</span>
                              <span>{tp2Val}</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {timeStr && (
                        <div
                          className={`px-3 py-2 text-xs text-center font-mono ${
                            isDarkMode
                              ? 'bg-white/[0.02] border-t border-white/[0.05] text-gray-500'
                              : 'bg-gray-50 border-t border-gray-100 text-gray-400'
                          }`}
                        >
                          {timeStr}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
