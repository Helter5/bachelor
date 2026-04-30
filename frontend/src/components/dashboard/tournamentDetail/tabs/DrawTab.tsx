import { useMemo, useState, useCallback } from "react"
import { useTranslation } from "react-i18next"
import { apiClient } from "@/services/apiClient"
import { API_ENDPOINTS } from "@/config/api"
import type { Team, WeightCategory } from "../types"
import { Select } from "../../../ui/Select"
import { EmptyState } from "../../../ui/EmptyState"
import { CountryFlag } from "../../shared/CountryFlag"
import { buildArenaFlagUrl } from "../../shared/countryFlagUtils"

interface DrawAthlete {
  seed: number
  person_id: number
  full_name: string
  country_iso_code: string | null
  team_name: string | null
  score: number
}

interface DrawMatch {
  match_number: number
  athlete_a: DrawAthlete | null
  athlete_b: DrawAthlete | null
  penalty_score: number
  penalty_reasons: string[]
}

interface DrawResult {
  weight_category_name: string
  athletes_count: number
  bracket_size: number
  byes_count: number
  last_n_tournaments: number
  total_penalty: number
  seeding: DrawAthlete[]
  bracket: DrawMatch[]
  error?: string
}

interface CategoryDraw {
  wc: WeightCategory
  result: DrawResult | null
  loading: boolean
  error: string | null
}

interface DrawTabProps {
  isDarkMode: boolean
  eventId: number
  teams: Team[]
  weightCategories: WeightCategory[]
  weightCategoriesLoading: boolean
  athletesCount: number
  athletesLoading: boolean
}

export function DrawTab({
  isDarkMode,
  eventId,
  teams,
  weightCategories,
  weightCategoriesLoading,
  athletesCount,
  athletesLoading,
}: DrawTabProps) {
  const { t } = useTranslation()
  const [lastN, setLastN] = useState(3)
  const [draws, setDraws] = useState<Record<number, CategoryDraw>>({})
  const [expandedId, setExpandedId] = useState<number | null>(null)
  const [generatingAll, setGeneratingAll] = useState(false)
  const [infoExpanded, setInfoExpanded] = useState(false)
  const toggleInfo = useCallback(() => setInfoExpanded(v => !v), [])

  const lastNOptions = useMemo(
    () => [1, 2, 3, 5, 10].map((n) => ({ value: n, label: `${n} ${t("draw.tournamentCount")}` })),
    [t],
  )

  const text = isDarkMode ? 'text-white' : 'text-gray-900'
  const sub = isDarkMode ? 'text-gray-400' : 'text-gray-500'
  const card = isDarkMode ? 'bg-[#0f172a] border border-white/5' : 'bg-gray-50 border border-gray-200'
  const hasEventAthletes = athletesCount > 0
  const generationDisabled = generatingAll || weightCategoriesLoading || athletesLoading || !weightCategories.length || !hasEventAthletes
  const teamsByName = useMemo(() => {
    const normalizeTeamName = (name: string) =>
      name
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/\s+/g, ' ')
        .trim()

    const map = new Map<string, Team>()
    for (const team of teams) {
      map.set(normalizeTeamName(team.name), team)
    }
    return map
  }, [teams])

  const generateForCategory = async (wc: WeightCategory, n: number): Promise<DrawResult | null> => {
    try {
      return await apiClient.get<DrawResult>(API_ENDPOINTS.DRAW(eventId, wc.id, n))
    } catch {
      return null
    }
  }

  const handleGenerateAll = async () => {
    if (!weightCategories.length || !hasEventAthletes) return
    setGeneratingAll(true)

    const initial: Record<number, CategoryDraw> = {}
    for (const wc of weightCategories) {
      initial[wc.id] = { wc, result: null, loading: true, error: null }
    }
    setDraws(initial)

    const results = await Promise.allSettled(
      weightCategories.map(wc => generateForCategory(wc, lastN))
    )

    const updated: Record<number, CategoryDraw> = {}
    results.forEach((res, i) => {
      const wc = weightCategories[i]
      if (res.status === "fulfilled" && res.value) {
        updated[wc.id] = { wc, result: res.value, loading: false, error: res.value.error ?? null }
      } else {
        updated[wc.id] = { wc, result: null, loading: false, error: t("draw.failed") }
      }
    })
    setDraws(updated)

    const first = weightCategories.find(wc => updated[wc.id]?.result && !updated[wc.id]?.error)
    if (first) setExpandedId(first.id)

    setGeneratingAll(false)
  }

  const hasDraws = Object.keys(draws).length > 0

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h3 className={`text-xl font-semibold ${text}`}>{t("draw.title")}</h3>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <label className={`text-sm ${sub}`}>{t("draw.lastN")}</label>
            <Select
              value={lastN}
              onChange={setLastN}
              options={lastNOptions}
              isDarkMode={isDarkMode}
            />
          </div>

          <button
            onClick={handleGenerateAll}
            disabled={generationDisabled}
            className={`px-4 py-2 rounded-lg font-medium text-sm text-white transition-all ${
              generationDisabled
                ? 'bg-blue-600/50 cursor-not-allowed'
                : 'bg-blue-600 hover:bg-blue-700'
            }`}
          >
            {generatingAll ? t("draw.generating") : hasDraws ? t("draw.regenerateAll") : t("draw.generateAll")}
          </button>
        </div>
      </div>

      <div className={`rounded-lg border overflow-hidden ${isDarkMode ? 'border-white/5' : 'border-gray-200'}`}>
        <button
          onClick={toggleInfo}
          className={`w-full flex items-center justify-between px-4 py-3 text-sm transition-colors ${
            isDarkMode ? 'bg-[#1e293b] hover:bg-white/5' : 'bg-gray-50 hover:bg-gray-100'
          }`}
        >
          <div className="flex items-center gap-2">
            <svg className={`w-4 h-4 flex-shrink-0 ${isDarkMode ? 'text-blue-400' : 'text-blue-500'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className={`font-medium ${text}`}>{t("draw.howItWorks")}</span>
          </div>
          <svg className={`w-4 h-4 transition-transform ${infoExpanded ? 'rotate-180' : ''} ${sub}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {infoExpanded && (
          <div className={`px-4 py-3 border-t ${isDarkMode ? 'bg-[#0f172a] border-white/5' : 'bg-white border-gray-100'}`}>
            <p className={`text-sm ${sub} mb-4`}>{t("draw.howItWorksDesc")}</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {(
                [
                  { title: "draw.infoSeeding", desc: "draw.infoSeedingDesc", icon: "M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" },
                  { title: "draw.infoBracket", desc: "draw.infoBracketDesc", icon: "M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" },
                  { title: "draw.infoPenalty", desc: "draw.infoPenaltyDesc", icon: "M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" },
                  { title: "draw.infoLastN", desc: "draw.infoLastNDesc", icon: "M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" },
                ] as const
              ).map(({ title, desc, icon }) => (
                <div key={title} className={`rounded-lg p-3 ${isDarkMode ? 'bg-white/5' : 'bg-gray-50'}`}>
                  <div className="flex items-start gap-2">
                    <svg className={`w-4 h-4 mt-0.5 flex-shrink-0 ${isDarkMode ? 'text-blue-400' : 'text-blue-500'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={icon} />
                    </svg>
                    <div>
                      <p className={`text-xs font-semibold ${text} mb-1`}>{t(title)}</p>
                      <p className={`text-xs ${sub} leading-relaxed`}>{t(desc)}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {weightCategoriesLoading && (
        <p className={`text-sm ${sub}`}>{t("draw.loadingCategories")}</p>
      )}

      {!weightCategoriesLoading && athletesLoading && (
        <p className={`text-sm ${sub}`}>{t("tournamentDetail.errors.loadingAthletes")}</p>
      )}

      {!weightCategoriesLoading && !weightCategories.length && (
        <p className={`text-sm ${sub}`}>{t("draw.noCategories")}</p>
      )}

      {!weightCategoriesLoading && !athletesLoading && !hasEventAthletes && (
        <div className={card}>
          <EmptyState
            icon="person"
            title={t("draw.noAthletesInEvent")}
            description={t("draw.noAthletesInEventDesc")}
            isDarkMode={isDarkMode}
          />
        </div>
      )}

      {!hasDraws && !generatingAll && weightCategories.length > 0 && hasEventAthletes && (
        <div className={`rounded-lg p-8 text-center ${card}`}>
          <p className={`text-sm ${sub} mb-1`}>{t("draw.instructions")}</p>
        </div>
      )}

      <div className="space-y-2">
        {weightCategories.map(wc => {
          const entry = draws[wc.id]
          const isExpanded = expandedId === wc.id

          return (
            <div key={wc.id} className={`rounded-lg border overflow-hidden transition-all ${
              isDarkMode ? 'border-white/5' : 'border-gray-200'
            }`}>
              <button
                onClick={() => setExpandedId(isExpanded ? null : wc.id)}
                className={`w-full flex items-center justify-between px-4 py-3 transition-colors ${
                  isDarkMode ? 'bg-[#1e293b] hover:bg-white/5' : 'bg-white hover:bg-gray-50'
                }`}
              >
                <div className="flex items-center gap-3">
                  <ChevronIcon expanded={isExpanded} isDarkMode={isDarkMode} />
                  <span className={`font-medium ${text}`}>{wc.name}</span>
                  <span className={`text-xs ${sub}`}>{wc.audience_name}</span>
                </div>

                <div className="flex items-center gap-3 text-sm">
                  {!entry && <span className={`text-xs ${sub}`}>{t("draw.notGenerated")}</span>}
                  {entry?.loading && <span className={`text-xs ${sub}`}>{t("draw.generating")}</span>}
                  {entry?.error && <span className="text-xs text-red-400">{entry.error}</span>}
                  {entry?.result && !entry.error && (
                    <>
                      <span className={`text-xs ${sub}`}>{entry.result.athletes_count} {t("draw.athletes")}</span>
                      <PenaltyBadge penalty={entry.result.total_penalty} />
                    </>
                  )}
                </div>
              </button>

              {isExpanded && entry?.result && !entry.error && (
                <div className={`px-4 pb-4 pt-2 ${isDarkMode ? 'bg-[#1e293b]' : 'bg-white'}`}>
                  <DrawContent result={entry.result} teamsByName={teamsByName} isDarkMode={isDarkMode} />
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}


function ChevronIcon({ expanded, isDarkMode }: { expanded: boolean; isDarkMode: boolean }) {
  return (
    <svg
      className={`w-4 h-4 transition-transform ${expanded ? 'rotate-90' : ''} ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}
      fill="none" viewBox="0 0 24 24" stroke="currentColor"
    >
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
    </svg>
  )
}

function PenaltyBadge({ penalty }: { penalty: number }) {
  const { t } = useTranslation()

  if (penalty === 0) {
    return <span className="text-xs px-2 py-0.5 rounded-full bg-green-500/15 text-green-400">{t("draw.penaltyNone")}</span>
  }
  return (
    <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-400">
      {t("draw.penaltyLabel", { count: penalty })}
    </span>
  )
}

function DrawContent({
  result,
  teamsByName,
  isDarkMode,
}: {
  result: DrawResult
  teamsByName: Map<string, Team>
  isDarkMode: boolean
}) {
  const { t } = useTranslation()
  const text = isDarkMode ? 'text-white' : 'text-gray-900'
  const sub = isDarkMode ? 'text-gray-400' : 'text-gray-500'
  const divider = isDarkMode ? 'border-white/5' : 'border-gray-100'
  const normalizeTeamName = (name: string) =>
    name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/\s+/g, ' ')
      .trim()

  return (
    <div className="space-y-4 mt-2">
      <div className="flex gap-5 text-sm flex-wrap">
        <span className={sub}>{t("draw.bracketLabel")} <span className={`font-medium ${text}`}>{result.bracket_size}</span></span>
        {result.byes_count > 0 && (
          <span className={sub}>{t("draw.byeLabel")} <span className={`font-medium ${text}`}>{result.byes_count}</span></span>
        )}
        <span className={sub}>{t("draw.seedingFrom", { count: result.last_n_tournaments })}</span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div>
          <p className={`text-xs font-semibold uppercase tracking-wide ${sub} mb-2`}>{t("draw.round1")}</p>
          <div className="space-y-1.5">
            {result.bracket.map(match => (
              <div key={match.match_number} className={`rounded-lg p-2.5 ${isDarkMode ? 'bg-black/20' : 'bg-gray-50'} ${match.penalty_score > 0 ? 'ring-1 ring-amber-500/30' : ''}`}>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`text-xs font-mono w-5 ${sub}`}>{match.match_number}</span>
                  <AthleteSlot athlete={match.athlete_a} isDarkMode={isDarkMode} />
                  <span className={`text-xs ${sub}`}>vs</span>
                  <AthleteSlot athlete={match.athlete_b} isDarkMode={isDarkMode} bye />
                  {match.penalty_score > 0 && (
                    <span className="ml-auto text-xs text-amber-400" title={match.penalty_reasons.join('\n')}>
                      ⚠ {match.penalty_score}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div>
          <p className={`text-xs font-semibold uppercase tracking-wide ${sub} mb-2`}>{t("draw.seeding")}</p>
          <div className={`rounded-lg overflow-hidden border ${isDarkMode ? 'border-white/5' : 'border-gray-200'}`}>
            <table className="w-full text-xs">
              <thead>
                <tr className={isDarkMode ? 'bg-white/5' : 'bg-gray-50'}>
                  <th className={`text-left px-3 py-1.5 font-medium ${sub}`}>{t("draw.tableHash")}</th>
                  <th className={`text-left px-3 py-1.5 font-medium ${sub}`}>{t("draw.tableName")}</th>
                  <th className={`text-left px-3 py-1.5 font-medium ${sub}`}>{t("draw.tableTeam")}</th>
                  <th className={`text-left px-3 py-1.5 font-medium ${sub}`}>{t("draw.tableScore")}</th>
                </tr>
              </thead>
              <tbody>
                {result.seeding.map(a => (
                  <tr key={a.person_id} className={`border-t ${divider}`}>
                    <td className="px-3 py-1.5">
                      <span className={`inline-flex items-center justify-center w-5 h-5 rounded-full text-xs font-bold ${
                        a.seed <= 2 ? 'bg-yellow-500/20 text-yellow-400' :
                        a.seed <= 4 ? 'bg-blue-500/20 text-blue-400' :
                        isDarkMode ? 'bg-white/5 text-gray-400' : 'bg-gray-100 text-gray-600'
                      }`}>{a.seed}</span>
                    </td>
                    <td className={`px-3 py-1.5 font-medium ${text}`}>{a.full_name}</td>
                    <td className={`px-3 py-1.5 ${sub}`}>
                      {(() => {
                        if (!a.team_name) return '—'
                        const team = teamsByName.get(normalizeTeamName(a.team_name))
                        return (
                          <span className="inline-flex items-center gap-1.5">
                            <CountryFlag
                              code={team?.country_iso_code ?? null}
                              imageUrl={buildArenaFlagUrl(team?.alternate_name ?? team?.country_iso_code)}
                              flagOnly
                            />
                            <span>{a.team_name}</span>
                          </span>
                        )
                      })()}
                    </td>
                    <td className={`px-3 py-1.5 ${sub}`}>{a.score}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}

function AthleteSlot({ athlete, isDarkMode, bye = false }: { athlete: DrawAthlete | null; isDarkMode: boolean; bye?: boolean }) {
  const { t } = useTranslation()
  const sub = isDarkMode ? 'text-gray-400' : 'text-gray-500'
  const text = isDarkMode ? 'text-white' : 'text-gray-900'

  if (!athlete) {
    return (
      <span className={`text-xs italic ${sub} min-w-32`}>{bye ? t("draw.byeText") : '—'}</span>
    )
  }
  return (
    <div className="flex items-center gap-1.5 min-w-32">
      <span className={`inline-flex items-center justify-center w-5 h-5 rounded-full text-xs font-bold flex-shrink-0 ${
        athlete.seed <= 2 ? 'bg-yellow-500/20 text-yellow-400' :
        athlete.seed <= 4 ? 'bg-blue-500/20 text-blue-400' :
        isDarkMode ? 'bg-white/5 text-gray-400' : 'bg-gray-100 text-gray-600'
      }`}>{athlete.seed}</span>
      <span className={`text-xs font-medium ${text} truncate`}>{athlete.full_name}</span>
    </div>
  )
}
