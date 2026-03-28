import { useState, useEffect, useMemo, useRef } from "react"
import { apiClient } from "@/services/apiClient"
import { API_ENDPOINTS } from "@/config/api"
import { Toast } from "@/components/ui/Toast"
import { WrestlerPicker } from "./WrestlerPicker"
import type { Person, PickerMode } from "./WrestlerPicker"
import { usePersons } from "@/hooks/usePersons"
import { formatDuration, pluralizeSk } from "@/utils/format"

interface FightHistoryTableProps {
  isDarkMode: boolean
  fights: any[]
}

function FightHistoryTable({ isDarkMode, fights }: FightHistoryTableProps) {
  return (
    <div>
      <h3 className={`text-lg font-bold mb-4 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
        História zápasov
      </h3>
      <div className={`rounded-lg overflow-hidden ${isDarkMode ? 'shadow-lg' : 'border border-gray-200'}`}>
        <table className="w-full">
          <thead>
            <tr className={`border-b ${isDarkMode ? 'border-white/5 bg-white/5' : 'border-gray-200 bg-gray-50'}`}>
              <th className={`text-left py-3 px-4 text-sm font-semibold ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>Turnaj</th>
              <th className={`text-left py-3 px-4 text-sm font-semibold ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>Kategória</th>
              <th className={`text-center py-3 px-4 text-sm font-semibold ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>Víťaz</th>
              <th className={`text-center py-3 px-4 text-sm font-semibold ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>Typ výhry</th>
              <th className={`text-center py-3 px-4 text-sm font-semibold ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>CP</th>
              <th className={`text-center py-3 px-4 text-sm font-semibold ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>TP</th>
              <th className={`text-center py-3 px-4 text-sm font-semibold ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>Čas</th>
            </tr>
          </thead>
          <tbody>
            {fights.map((fight: any, idx: number) => (
              <tr
                key={fight.fight_id || idx}
                className={`border-b last:border-b-0 ${isDarkMode ? 'border-white/5 hover:bg-white/5' : 'border-gray-100 hover:bg-gray-50'}`}
              >
                <td className={`py-3 px-4 text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  {fight.sport_event_name || '-'}
                </td>
                <td className={`py-3 px-4 text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  {fight.weight_category || '-'}
                </td>
                <td className="py-3 px-4 text-center">
                  {fight.winner ? (
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${
                      fight.winner === 'person1' ? 'bg-green-900/30 text-green-400' : 'bg-blue-900/30 text-blue-400'
                    }`}>
                      {fight.winner_name}
                    </span>
                  ) : (
                    <span className={`text-xs ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>-</span>
                  )}
                </td>
                <td className={`py-3 px-4 text-center text-sm font-medium ${isDarkMode ? 'text-purple-400' : 'text-purple-600'}`}>
                  {fight.victory_type || '-'}
                </td>
                <td className={`py-3 px-4 text-center text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  <span className={fight.winner === 'person1' ? 'font-bold' : ''}>{fight.person1_cp ?? '-'}</span>
                  <span className={isDarkMode ? 'text-gray-500' : 'text-gray-400'}> : </span>
                  <span className={fight.winner === 'person2' ? 'font-bold' : ''}>{fight.person2_cp ?? '-'}</span>
                </td>
                <td className={`py-3 px-4 text-center text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  <span className={fight.winner === 'person1' ? 'font-bold' : ''}>{fight.person1_tp ?? '-'}</span>
                  <span className={isDarkMode ? 'text-gray-500' : 'text-gray-400'}> : </span>
                  <span className={fight.winner === 'person2' ? 'font-bold' : ''}>{fight.person2_tp ?? '-'}</span>
                </td>
                <td className={`py-3 px-4 text-center text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  {fight.duration ? formatDuration(fight.duration) : '-'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

interface CommonOpponentCardProps {
  isDarkMode: boolean
  opp: any
  person1Name: string
  person2Name: string
}

function CommonOpponentCard({ isDarkMode, opp, person1Name, person2Name }: CommonOpponentCardProps) {
  return (
    <div className={`rounded-lg p-5 ${isDarkMode ? 'bg-[#0f172a]/60 border border-white/5' : 'bg-gray-50 border border-gray-200'}`}>
      <div className={`text-sm font-bold mb-4 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
        vs {opp.opponent.name}
        {opp.opponent.country && (
          <span className={`ml-2 font-normal text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
            ({opp.opponent.country})
          </span>
        )}
      </div>
      <div className="grid grid-cols-2 gap-4">
        {[
          { name: person1Name, summary: opp.person1_summary },
          { name: person2Name, summary: opp.person2_summary },
        ].map(({ name, summary }) => (
          <div key={name} className={`rounded-lg p-3 ${isDarkMode ? 'bg-white/5' : 'bg-white border border-gray-100'}`}>
            <div className={`text-xs font-medium mb-2 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>{name}</div>
            {summary && summary.wins !== undefined ? (
              <div className="flex items-center gap-3">
                <span className="text-green-500 font-bold text-lg">{summary.wins}V</span>
                <span className={`font-bold text-lg ${isDarkMode ? 'text-red-400' : 'text-red-500'}`}>{summary.losses}P</span>
                {summary.avg_cp > 0 && (
                  <span className={`text-xs ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>Ø CP: {summary.avg_cp}</span>
                )}
                {summary.avg_tp > 0 && (
                  <span className={`text-xs ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>Ø TP: {summary.avg_tp}</span>
                )}
              </div>
            ) : (
              <span className={`text-xs ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>Žiadne zápasy</span>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

interface ComparisonViewProps {
  isDarkMode: boolean
  onSelectPerson?: (person: { id: number; name: string }) => void
  onBack: () => void
}

export function ComparisonView({ isDarkMode, onSelectPerson, onBack }: ComparisonViewProps) {
  const persons = usePersons()

  const [wrestler1Search, setWrestler1Search] = useState("")
  const [wrestler2Search, setWrestler2Search] = useState("")
  const [selectedWrestler1, setSelectedWrestler1] = useState<Person | null>(null)
  const [selectedWrestler2, setSelectedWrestler2] = useState<Person | null>(null)
  const [mode1, setMode1] = useState<PickerMode>("idle")
  const [mode2, setMode2] = useState<PickerMode>("idle")
  const [comparisonResult, setComparisonResult] = useState<any>(null)
  const [comparing, setComparing] = useState(false)
  const [includeCommonOpponents, setIncludeCommonOpponents] = useState(false)

  const searchRef1 = useRef<HTMLInputElement>(null)
  const searchRef2 = useRef<HTMLInputElement>(null)
  const containerRef1 = useRef<HTMLDivElement>(null)
  const containerRef2 = useRef<HTMLDivElement>(null)

  const filteredPersons1 = useMemo(() => {
    if (!wrestler1Search.trim()) return persons
    return persons.filter(p => p.full_name.toLowerCase().includes(wrestler1Search.toLowerCase()))
  }, [persons, wrestler1Search])

  const filteredPersons2 = useMemo(() => {
    if (!wrestler2Search.trim()) return persons
    return persons.filter(p => p.full_name.toLowerCase().includes(wrestler2Search.toLowerCase()))
  }, [persons, wrestler2Search])

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef1.current && !containerRef1.current.contains(e.target as Node)) {
        if (mode1 !== "idle") setMode1("idle")
        setWrestler1Search("")
      }
      if (containerRef2.current && !containerRef2.current.contains(e.target as Node)) {
        if (mode2 !== "idle") setMode2("idle")
        setWrestler2Search("")
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [mode1, mode2])

  useEffect(() => {
    if (mode1 === "search") searchRef1.current?.focus()
  }, [mode1])
  useEffect(() => {
    if (mode2 === "search") searchRef2.current?.focus()
  }, [mode2])

  const reset = () => {
    setWrestler1Search("")
    setWrestler2Search("")
    setSelectedWrestler1(null)
    setSelectedWrestler2(null)
    setMode1("idle")
    setMode2("idle")
    setComparisonResult(null)
    setComparing(false)
    setIncludeCommonOpponents(false)
    onBack()
  }

  const isSameWrestler = selectedWrestler1 && selectedWrestler2 && selectedWrestler1.id === selectedWrestler2.id

  const handleCompare = async () => {
    if (!selectedWrestler1 || !selectedWrestler2 || isSameWrestler) return
    setComparing(true)
    setComparisonResult(null)
    try {
      const data = await apiClient.get(API_ENDPOINTS.PERSON_COMPARE(selectedWrestler1.id, selectedWrestler2.id, includeCommonOpponents))
      setComparisonResult(data)
    } catch {
      setComparisonResult({ error: "Nepodarilo sa načítať porovnanie" })
    } finally {
      setComparing(false)
    }
  }

  return (
    <div className="space-y-6">
      <button
        onClick={reset}
        className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
          isDarkMode
            ? 'bg-[#1e293b] hover:bg-[#334155] text-gray-300 hover:text-white'
            : 'bg-gray-100 hover:bg-gray-200 text-gray-700 hover:text-gray-900'
        }`}
      >
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Späť na kategórie
      </button>

      <div className={`rounded-xl p-8 ${isDarkMode ? 'bg-[#1e293b]' : 'bg-white border border-gray-200'} shadow-lg`}>
        <h2 className={`text-2xl font-bold mb-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
          Porovnanie zápasníkov
        </h2>
        <p className={`text-sm mb-6 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
          Porovnanie štatistík naprieč všetkými turnajmi
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <WrestlerPicker
            isDarkMode={isDarkMode}
            wrestler={1}
            selected={selectedWrestler1}
            mode={mode1}
            onModeChange={setMode1}
            search={wrestler1Search}
            onSearchChange={setWrestler1Search}
            onSelect={setSelectedWrestler1}
            filteredPersons={filteredPersons1}
            allPersons={persons}
            searchInputRef={searchRef1}
            containerRef={containerRef1}
          />
          <WrestlerPicker
            isDarkMode={isDarkMode}
            wrestler={2}
            selected={selectedWrestler2}
            mode={mode2}
            onModeChange={setMode2}
            search={wrestler2Search}
            onSearchChange={setWrestler2Search}
            onSelect={setSelectedWrestler2}
            filteredPersons={filteredPersons2}
            allPersons={persons}
            searchInputRef={searchRef2}
            containerRef={containerRef2}
          />
        </div>

        <Toast
          show={!!isSameWrestler}
          variant="warning"
          title="Nie je možné porovnať zápasníka so sebou samým"
          message="Vyberte dvoch rôznych zápasníkov."
        />

        <label className={`flex items-center gap-2 mb-4 cursor-pointer select-none ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
          <input
            type="checkbox"
            checked={includeCommonOpponents}
            onChange={(e) => setIncludeCommonOpponents(e.target.checked)}
            className="w-4 h-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
          />
          <span className="text-sm">Zahrnúť spoločných súperov (aj keď medzi sebou nezápasili)</span>
          {includeCommonOpponents && (
            <span className={`text-xs ml-1 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
              — A vs C, B vs C → porovná sa na základe C
            </span>
          )}
        </label>

        <div className="flex items-center gap-3">
          <button
            disabled={!selectedWrestler1 || !selectedWrestler2 || comparing || !!isSameWrestler}
            onClick={handleCompare}
            className={`px-6 py-2.5 rounded-lg font-medium transition-all ${
              selectedWrestler1 && selectedWrestler2 && !comparing && !isSameWrestler
                ? 'bg-purple-600 text-white hover:bg-purple-700 active:scale-95'
                : isDarkMode
                  ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                  : 'bg-gray-200 text-gray-400 cursor-not-allowed'
            }`}
          >
            {comparing ? 'Načítavam...' : 'Porovnať'}
          </button>
          <button
            onClick={reset}
            className={`px-6 py-2.5 rounded-lg font-medium transition-all ${
              isDarkMode
                ? 'bg-[#0f172a]/50 text-gray-300 hover:bg-[#0f172a] border border-white/10'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-200'
            }`}
          >
            Zrušiť
          </button>
        </div>

        {comparisonResult && !comparisonResult.error && (
          <div className="mt-8 space-y-8">
            {/* Head-to-head summary */}
            <div className={`rounded-xl p-6 ${isDarkMode ? 'bg-[#0f172a]/80 border border-white/5' : 'bg-gray-50 border border-gray-200'}`}>
              <h3 className={`text-lg font-bold mb-6 text-center ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                Vzájomné zápasy
              </h3>
              <div className="flex items-center justify-center gap-6">
                {[
                  { person: comparisonResult.person1, wins: comparisonResult.person1_wins, otherWins: comparisonResult.person2_wins },
                  { person: comparisonResult.person2, wins: comparisonResult.person2_wins, otherWins: comparisonResult.person1_wins },
                ].map(({ person, wins, otherWins }, i) => (
                  <div key={person.id} className="text-center flex-1">
                    <div className={`text-sm font-medium mb-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                      {person.country && (
                        <span className={`fi fi-${person.country.toLowerCase()} rounded-sm mr-1.5`} style={{ fontSize: '0.9rem' }} />
                      )}
                      {onSelectPerson ? (
                        <button onClick={() => onSelectPerson({ id: person.id, name: person.name })} className={`hover:underline ${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`}>
                          {person.name}
                        </button>
                      ) : person.name}
                    </div>
                    <div className={`text-5xl font-black ${
                      wins > otherWins ? 'text-green-500'
                        : wins < otherWins ? isDarkMode ? 'text-red-400' : 'text-red-500'
                        : isDarkMode ? 'text-gray-400' : 'text-gray-500'
                    }`}>
                      {wins}
                    </div>
                    <div className={`text-xs mt-1 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                      {pluralizeSk(wins, 'výhra', 'výhry', 'výhier')}
                    </div>
                  </div>
                )).reduce<React.ReactNode[]>((acc, el, i) => {
                  if (i === 1) {
                    acc.push(
                      <div key="vs" className="flex flex-col items-center">
                        <div className={`text-sm font-bold px-4 py-2 rounded-full ${isDarkMode ? 'bg-white/5 text-gray-400' : 'bg-gray-200 text-gray-500'}`}>
                          {comparisonResult.total_fights} {pluralizeSk(comparisonResult.total_fights, 'zápas', 'zápasy', 'zápasov')}
                        </div>
                      </div>
                    )
                  }
                  acc.push(el)
                  return acc
                }, [])}
              </div>
            </div>

            {comparisonResult.fights && comparisonResult.fights.length > 0 && (
              <FightHistoryTable isDarkMode={isDarkMode} fights={comparisonResult.fights} />
            )}

            {comparisonResult.total_fights === 0 && (
              <div className={`text-center py-8 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                <svg className={`mx-auto h-12 w-12 mb-3 ${isDarkMode ? 'text-gray-600' : 'text-gray-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                </svg>
                <p className="text-lg font-medium">Žiadne vzájomné zápasy</p>
                <p className="text-sm mt-1">Títo zápasníci proti sebe ešte nezápasili</p>
              </div>
            )}

            {comparisonResult.common_opponents && comparisonResult.common_opponents.length > 0 && (
              <div>
                <h3 className={`text-lg font-bold mb-4 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                  Spoloční súperi ({comparisonResult.common_opponents.length})
                </h3>
                <div className="space-y-4">
                  {comparisonResult.common_opponents.map((opp: any, idx: number) => (
                    <CommonOpponentCard
                      key={opp.opponent.id || idx}
                      isDarkMode={isDarkMode}
                      opp={opp}
                      person1Name={comparisonResult.person1.name}
                      person2Name={comparisonResult.person2.name}
                    />
                  ))}
                </div>
              </div>
            )}

            {comparisonResult.common_opponents && comparisonResult.common_opponents.length === 0 && (
              <div className={`text-center py-6 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                <p className="text-sm">Žiadni spoloční súperi</p>
              </div>
            )}
          </div>
        )}

        {comparisonResult?.error && (
          <div className={`mt-6 rounded-lg p-4 ${isDarkMode ? 'bg-red-900/20 text-red-400' : 'bg-red-50 text-red-600'}`}>
            {comparisonResult.error}
          </div>
        )}
      </div>
    </div>
  )
}
