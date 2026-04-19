import { useMemo } from 'react'
import type { FightResult } from '../types'

interface BracketMatch {
  id: number
  fighter1Name: string
  fighter2Name: string
  fighter1Id: number
  fighter2Id: number
  fighter1Score: number
  fighter2Score: number
  winner: number | null
  victoryType: string
  endTime: number
  fightNumber: number
}

interface BracketRound {
  name: string
  matches: BracketMatch[]
  isRepechage: boolean
}

const CARD_WIDTH = 180
const CARD_HEIGHT = 110
const ROUND_GAP = 100
const MATCH_GAP = 16

interface TournamentBracketProps {
  fights: FightResult[]
  isDarkMode: boolean
  sortedRounds: [string, FightResult[]][]
}

export function TournamentBracket({ fights, isDarkMode, sortedRounds }: TournamentBracketProps) {
  const bracketData = useMemo(() => {
    return sortedRounds.map(([roundName, fightList]) => {
      const isRepechage = roundName.toLowerCase().includes('repechage') || roundName.toLowerCase().includes('repêchage')
      const matches: BracketMatch[] = fightList
        .sort((a, b) => a.fightNumber - b.fightNumber)
        .map(f => {
          const tp1 = f.technicalPoints?.find((tp: Record<string, unknown>) => tp.fighterId === f.fighter1Id)
          const tp2 = f.technicalPoints?.find((tp: Record<string, unknown>) => tp.fighterId === f.fighter2Id)
          const tp1Val = tp1 ? Number(tp1.points) : 0
          const tp2Val = tp2 ? Number(tp2.points) : 0
          
          return {
            id: f.id,
            fighter1Name: f.fighter1FullName || '',
            fighter2Name: f.fighter2FullName || '',
            fighter1Id: f.fighter1Id,
            fighter2Id: f.fighter2Id,
            fighter1Score: tp1Val,
            fighter2Score: tp2Val,
            winner: f.winnerFighter,
            victoryType: f.victoryTypeName || '',
            endTime: f.endTime || 0,
            fightNumber: f.fightNumber,
          }
        })

      return {
        name: roundName,
        matches,
        isRepechage,
      }
    })
  }, [sortedRounds])

  // Calculate total dimensions
  const totalWidth = bracketData.length * (CARD_WIDTH + ROUND_GAP) + ROUND_GAP
  const maxMatches = Math.max(...bracketData.map(r => r.matches.length), 1)
  const totalHeight = maxMatches * (CARD_HEIGHT + MATCH_GAP) + MATCH_GAP * 2

  // Get Y position for a match in a round (spaced to fit between source matches)
  const getSpacingMultiplier = (roundIndex: number): number => {
    if (roundIndex === 0) return 1
    if (roundIndex >= bracketData.length) return 1
    const currentMatches = bracketData[roundIndex].matches.length
    const prevMatches = bracketData[roundIndex - 1].matches.length
    return Math.max(1, prevMatches / currentMatches)
  }

  const getMatchYPosition = (roundIndex: number, matchIndex: number): number => {
    const spacing = (CARD_HEIGHT + MATCH_GAP) * getSpacingMultiplier(roundIndex)
    // Center the match in its allocated space
    return MATCH_GAP + matchIndex * spacing + spacing / 2 - CARD_HEIGHT / 2
  }

  // Get X position for a round
  const getRoundXPosition = (roundIndex: number): number => {
    return ROUND_GAP + roundIndex * (CARD_WIDTH + ROUND_GAP)
  }

  const getWinnerNextMatchPosition = (roundIndex: number, matchIndex: number): { nextRoundIndex: number; nextMatchIndex: number } | null => {
    if (roundIndex >= bracketData.length - 1) return null

    const nextRound = bracketData[roundIndex + 1]
    const expectedNextIndex = Math.floor(matchIndex / 2)

    if (expectedNextIndex < nextRound.matches.length) {
      return { nextRoundIndex: roundIndex + 1, nextMatchIndex: expectedNextIndex }
    }
    return null
  }

  const VictoryTypeColor = ({ victoryType, isDark }: { victoryType: string; isDark: boolean }) => {
    const vtLower = victoryType.toLowerCase()
    if (vtLower.includes('fall') || vtLower.includes('pin')) return isDark ? 'text-purple-400' : 'text-purple-600'
    if (vtLower.includes('technical') || vtLower.includes(' tf')) return isDark ? 'text-blue-400' : 'text-blue-600'
    if (vtLower.includes('disq') || vtLower.includes('forfeit')) return isDark ? 'text-red-400' : 'text-red-600'
    return isDark ? 'text-gray-500' : 'text-gray-400'
  }

  return (
    <div className="w-full overflow-x-auto pb-6">
      <div style={{ width: totalWidth, height: totalHeight, position: 'relative' }}>
        {/* SVG for connector lines */}
        <svg
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            pointerEvents: 'none',
            zIndex: 0,
          }}
        >
          {bracketData.map((round, roundIndex) =>
            round.matches.map((match, matchIndex) => {
              if (!match.winner) return null

              const nextPos = getWinnerNextMatchPosition(roundIndex, matchIndex)
              if (!nextPos) return null

              const currentY = getMatchYPosition(roundIndex, matchIndex) + CARD_HEIGHT / 2
              const nextY = getMatchYPosition(nextPos.nextRoundIndex, nextPos.nextMatchIndex) + CARD_HEIGHT / 2

              const currentX = getRoundXPosition(roundIndex) + CARD_WIDTH
              const nextX = getRoundXPosition(nextPos.nextRoundIndex)

              const midX = currentX + (nextX - currentX) / 2

              return (
                <g key={`line-${roundIndex}-${matchIndex}`}>
                  {/* Horizontal line from current match */}
                  <line
                    x1={currentX}
                    y1={currentY}
                    x2={midX}
                    y2={currentY}
                    stroke={isDarkMode ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.2)'}
                    strokeWidth="1"
                  />
                  {/* Vertical connector */}
                  <line
                    x1={midX}
                    y1={currentY}
                    x2={midX}
                    y2={nextY}
                    stroke={isDarkMode ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.2)'}
                    strokeWidth="1"
                  />
                  {/* Horizontal line to next match */}
                  <line
                    x1={midX}
                    y1={nextY}
                    x2={nextX}
                    y2={nextY}
                    stroke={isDarkMode ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.2)'}
                    strokeWidth="1"
                  />
                </g>
              )
            })
          )}
        </svg>

        {/* Rounds container */}
        <div style={{ display: 'flex', gap: ROUND_GAP, position: 'relative', zIndex: 1 }}>
          {bracketData.map((round, roundIndex) => {
            const spacingMultiplier = getSpacingMultiplier(roundIndex)
            const roundHeight = round.matches.reduce((sum, _, idx) => {
              if (idx === 0) return CARD_HEIGHT
              const dynamicGap = spacingMultiplier > 1 
                ? MATCH_GAP + (spacingMultiplier - 1) * (CARD_HEIGHT + MATCH_GAP)
                : MATCH_GAP
              return sum + CARD_HEIGHT + dynamicGap
            }, 0) + MATCH_GAP * 2

            return (
            <div
              key={round.name}
              style={{
                display: 'flex',
                flexDirection: 'column',
                minWidth: CARD_WIDTH,
                height: roundHeight,
                position: 'relative',
              }}
            >
              {/* Round header */}
              <div
                className={`text-center py-2 rounded-lg text-xs font-bold uppercase tracking-wider mb-2 ${
                  round.isRepechage
                    ? isDarkMode
                      ? 'bg-amber-500/10 text-amber-400'
                      : 'bg-amber-50 text-amber-700'
                    : isDarkMode
                      ? 'bg-white/5 text-gray-300'
                      : 'bg-gray-100 text-gray-700'
                }`}
                style={{ marginTop: MATCH_GAP }}
              >
                {round.name}
              </div>

              {/* Matches in this round */}
              {round.matches.map((match, matchIndex) => {
                const w1 = match.winner === match.fighter1Id
                const w2 = match.winner === match.fighter2Id
                const timeStr = match.endTime > 0 ? `${Math.floor(match.endTime / 60)}:${String(match.endTime % 60).padStart(2, '0')}` : null
                
                // Calculate dynamic margin to space matches correctly
                const spacingMultiplier = getSpacingMultiplier(roundIndex)
                const dynamicGap = spacingMultiplier > 1 
                  ? MATCH_GAP + (spacingMultiplier - 1) * (CARD_HEIGHT + MATCH_GAP)
                  : MATCH_GAP

                return (
                  <div
                    key={match.id}
                    style={{
                      width: CARD_WIDTH,
                      height: CARD_HEIGHT,
                      marginTop: matchIndex === 0 ? MATCH_GAP : dynamicGap,
                    }}
                    className={`rounded-lg overflow-hidden border flex flex-col text-xs ${
                      isDarkMode ? 'bg-[#0f172a]/70 border-white/[0.07]' : 'bg-white border-gray-200 shadow-sm'
                    }`}
                  >
                    {/* Fighter 1 */}
                    <div
                      className={`flex-1 flex items-center gap-1 px-2 py-1.5 border-l-[2px] ${
                        w1
                          ? isDarkMode
                            ? 'border-green-500 bg-green-500/[0.06]'
                            : 'border-green-500 bg-green-50/60'
                          : 'border-transparent'
                      }`}
                    >
                      <div className="flex-1 min-w-0">
                        <p
                          className={`font-semibold truncate leading-tight ${
                            w1 ? (isDarkMode ? 'text-white' : 'text-gray-900') : isDarkMode ? 'text-gray-500' : 'text-gray-400'
                          }`}
                          title={match.fighter1Name}
                        >
                          {match.fighter1Name}
                        </p>
                      </div>
                      <span className={`font-bold tabular-nums shrink-0 ${w1 ? (isDarkMode ? 'text-white' : 'text-gray-900') : isDarkMode ? 'text-gray-600' : 'text-gray-300'}`}>
                        {match.fighter1Score}
                      </span>
                    </div>

                    <div className={`h-px ${isDarkMode ? 'bg-white/[0.05]' : 'bg-gray-100'}`} />

                    {/* Fighter 2 */}
                    <div
                      className={`flex-1 flex items-center gap-1 px-2 py-1.5 border-l-[2px] ${
                        w2
                          ? isDarkMode
                            ? 'border-green-500 bg-green-500/[0.06]'
                            : 'border-green-500 bg-green-50/60'
                          : 'border-transparent'
                      }`}
                    >
                      <div className="flex-1 min-w-0">
                        <p
                          className={`font-semibold truncate leading-tight ${
                            w2 ? (isDarkMode ? 'text-white' : 'text-gray-900') : isDarkMode ? 'text-gray-500' : 'text-gray-400'
                          }`}
                          title={match.fighter2Name}
                        >
                          {match.fighter2Name}
                        </p>
                      </div>
                      <span className={`font-bold tabular-nums shrink-0 ${w2 ? (isDarkMode ? 'text-white' : 'text-gray-900') : isDarkMode ? 'text-gray-600' : 'text-gray-300'}`}>
                        {match.fighter2Score}
                      </span>
                    </div>

                    {/* Footer: victory type */}
                    {match.victoryType && (
                      <div className={`px-1.5 py-0.5 text-[0.65rem] font-medium border-t ${isDarkMode ? 'border-white/[0.05] bg-white/[0.01]' : 'border-gray-100 bg-gray-50'}`}>
                        <p className={`truncate ${VictoryTypeColor({ victoryType: match.victoryType, isDark: isDarkMode })}`}>
                          {match.victoryType}
                          {timeStr && ` • ${timeStr}`}
                        </p>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
