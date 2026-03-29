import { useState } from "react"
import { apiClient } from "@/services/apiClient"
import { API_ENDPOINTS } from "@/config/api"
import type { WeightCategory } from "../types"

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
}

interface DrawTabProps {
  isDarkMode: boolean
  eventId: number
  weightCategories: WeightCategory[]
  weightCategoriesLoading: boolean
}

export function DrawTab({ isDarkMode, eventId, weightCategories, weightCategoriesLoading }: DrawTabProps) {
  const [selectedWcId, setSelectedWcId] = useState<number | null>(null)
  const [lastN, setLastN] = useState(3)
  const [drawResult, setDrawResult] = useState<DrawResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const card = isDarkMode ? 'bg-[#0f172a] border border-white/5' : 'bg-gray-50 border border-gray-200'
  const text = isDarkMode ? 'text-white' : 'text-gray-900'
  const sub = isDarkMode ? 'text-gray-400' : 'text-gray-500'
  const badge = isDarkMode ? 'bg-white/5 text-gray-300' : 'bg-gray-100 text-gray-700'

  const handleGenerate = async () => {
    if (!selectedWcId) return
    setLoading(true)
    setError(null)
    setDrawResult(null)
    try {
      const data = await apiClient.get<DrawResult>(API_ENDPOINTS.DRAW(eventId, selectedWcId, lastN))
      setDrawResult(data)
    } catch {
      setError('Nepodarilo sa vygenerovať žreb')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <h3 className={`text-xl font-semibold ${text}`}>Generátor žrebu</h3>

      {/* Controls */}
      <div className={`rounded-lg p-4 ${card} flex flex-wrap gap-4 items-end`}>
        <div className="flex-1 min-w-48">
          <label className={`block text-sm font-medium mb-1 ${sub}`}>Váhová kategória</label>
          {weightCategoriesLoading ? (
            <div className={`text-sm ${sub}`}>Načítavam...</div>
          ) : (
            <select
              value={selectedWcId ?? ""}
              onChange={e => { setSelectedWcId(Number(e.target.value) || null); setDrawResult(null) }}
              className={`w-full rounded-lg px-3 py-2 text-sm border ${
                isDarkMode
                  ? 'bg-[#1e293b] border-white/10 text-white'
                  : 'bg-white border-gray-300 text-gray-900'
              }`}
            >
              <option value="">Vyberte kategóriu...</option>
              {weightCategories.map(wc => (
                <option key={wc.id} value={wc.id}>{wc.name} — {wc.audience_name}</option>
              ))}
            </select>
          )}
        </div>

        <div className="w-40">
          <label className={`block text-sm font-medium mb-1 ${sub}`}>Počet turnajov (nasadenie)</label>
          <select
            value={lastN}
            onChange={e => setLastN(Number(e.target.value))}
            className={`w-full rounded-lg px-3 py-2 text-sm border ${
              isDarkMode
                ? 'bg-[#1e293b] border-white/10 text-white'
                : 'bg-white border-gray-300 text-gray-900'
            }`}
          >
            {[1, 2, 3, 5, 10].map(n => (
              <option key={n} value={n}>Posledných {n}</option>
            ))}
          </select>
        </div>

        <button
          onClick={handleGenerate}
          disabled={!selectedWcId || loading}
          className={`px-5 py-2 rounded-lg font-medium text-sm transition-all ${
            !selectedWcId || loading
              ? 'opacity-40 cursor-not-allowed bg-blue-600 text-white'
              : 'bg-blue-600 hover:bg-blue-700 text-white'
          }`}
        >
          {loading ? 'Generujem...' : 'Generovať žreb'}
        </button>
      </div>

      {error && (
        <div className="rounded-lg p-4 bg-red-500/10 border border-red-500/20 text-red-400 text-sm">{error}</div>
      )}

      {drawResult && (
        <div className="space-y-6">
          {/* Summary */}
          <div className={`rounded-lg p-4 ${card} flex flex-wrap gap-6`}>
            <div>
              <div className={`text-xs ${sub} mb-1`}>Kategória</div>
              <div className={`font-semibold ${text}`}>{drawResult.weight_category_name}</div>
            </div>
            <div>
              <div className={`text-xs ${sub} mb-1`}>Atléti</div>
              <div className={`font-semibold ${text}`}>{drawResult.athletes_count}</div>
            </div>
            <div>
              <div className={`text-xs ${sub} mb-1`}>Veľkosť bracketа</div>
              <div className={`font-semibold ${text}`}>{drawResult.bracket_size}</div>
            </div>
            <div>
              <div className={`text-xs ${sub} mb-1`}>Voľné miesta (bye)</div>
              <div className={`font-semibold ${text}`}>{drawResult.byes_count}</div>
            </div>
            <div>
              <div className={`text-xs ${sub} mb-1`}>Celkové penalizácie</div>
              <div className={`font-semibold ${drawResult.total_penalty > 0 ? 'text-amber-400' : 'text-green-400'}`}>
                {drawResult.total_penalty}
              </div>
            </div>
          </div>

          {/* Bracket */}
          <div>
            <h4 className={`text-lg font-semibold mb-3 ${text}`}>Žreb — 1. kolo</h4>
            <div className="space-y-2">
              {drawResult.bracket.map(match => (
                <div
                  key={match.match_number}
                  className={`rounded-lg p-4 ${card} ${match.penalty_score > 0 ? 'border-amber-500/30' : ''}`}
                >
                  <div className="flex items-center gap-3 flex-wrap">
                    <span className={`text-xs font-mono ${sub} w-12`}>#{match.match_number}</span>

                    <AthleteSlot athlete={match.athlete_a} isDarkMode={isDarkMode} />

                    <span className={`text-xs font-bold ${sub}`}>vs</span>

                    <AthleteSlot athlete={match.athlete_b} isDarkMode={isDarkMode} bye />

                    {match.penalty_score > 0 && (
                      <div className="ml-auto flex flex-col items-end gap-1">
                        <span className="text-xs font-semibold text-amber-400">
                          Penalizácia: {match.penalty_score}
                        </span>
                        {match.penalty_reasons.map((r, i) => (
                          <span key={i} className="text-xs text-amber-400/70">{r}</span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Seeding table */}
          <div>
            <h4 className={`text-lg font-semibold mb-3 ${text}`}>Nasadenie</h4>
            <div className={`rounded-lg overflow-hidden border ${isDarkMode ? 'border-white/5' : 'border-gray-200'}`}>
              <table className="w-full text-sm">
                <thead>
                  <tr className={isDarkMode ? 'bg-white/5' : 'bg-gray-50'}>
                    {['Nasadenie', 'Meno', 'Krajina', 'Tím', 'Skóre'].map(h => (
                      <th key={h} className={`text-left px-4 py-2 font-medium ${sub}`}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {drawResult.seeding.map(a => (
                    <tr key={a.person_id} className={`border-t ${isDarkMode ? 'border-white/5' : 'border-gray-100'}`}>
                      <td className="px-4 py-2">
                        <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold ${
                          a.seed <= 2 ? 'bg-yellow-500/20 text-yellow-400' :
                          a.seed <= 4 ? 'bg-blue-500/20 text-blue-400' :
                          badge
                        }`}>{a.seed}</span>
                      </td>
                      <td className={`px-4 py-2 font-medium ${text}`}>{a.full_name}</td>
                      <td className={`px-4 py-2 ${sub}`}>{a.country_iso_code ?? '—'}</td>
                      <td className={`px-4 py-2 ${sub}`}>{a.team_name ?? '—'}</td>
                      <td className={`px-4 py-2 ${sub}`}>{a.score}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function AthleteSlot({
  athlete,
  isDarkMode,
  bye = false,
}: {
  athlete: DrawAthlete | null
  isDarkMode: boolean
  bye?: boolean
}) {
  const sub = isDarkMode ? 'text-gray-400' : 'text-gray-500'
  const text = isDarkMode ? 'text-white' : 'text-gray-900'

  if (!athlete) {
    return (
      <div className="flex items-center gap-2 min-w-48">
        <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs ${sub} border ${isDarkMode ? 'border-white/10' : 'border-gray-300'}`}>—</span>
        <span className={`text-sm italic ${sub}`}>{bye ? 'Voľné miesto (bye)' : '—'}</span>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-2 min-w-48">
      <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold ${
        athlete.seed <= 2 ? 'bg-yellow-500/20 text-yellow-400' :
        athlete.seed <= 4 ? 'bg-blue-500/20 text-blue-400' :
        isDarkMode ? 'bg-white/5 text-gray-300' : 'bg-gray-100 text-gray-600'
      }`}>{athlete.seed}</span>
      <div>
        <div className={`text-sm font-medium ${text}`}>{athlete.full_name}</div>
        <div className={`text-xs ${sub}`}>{athlete.team_name ?? athlete.country_iso_code ?? '—'}</div>
      </div>
    </div>
  )
}
