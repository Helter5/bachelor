import { useState, useEffect, useMemo, useRef, type Dispatch, type SetStateAction } from "react"
import { useTranslation } from "react-i18next"
import { apiClient } from "@/services/apiClient"
import { API_ENDPOINTS } from "@/config/api"
import { Toast } from "@/components/ui/Toast"
import { Checkbox } from "@/components/ui/Checkbox"
import { WrestlerPicker } from "./WrestlerPicker"
import type { Person, PickerMode } from "./WrestlerPicker"
import { usePersons } from "@/hooks/usePersons"
import { DashboardStatsShell } from "./DashboardStatsShell"
import { ComparisonFightSection } from "./ComparisonFightSummary"
import { CommonOpponentCard } from "./CommonOpponentCard"
import type { ComparisonResult } from "./comparisonTypes"

interface ComparisonViewProps {
  isDarkMode: boolean
  onSelectPerson?: (person: { id: number; name: string }) => void
  onBack: () => void
}

type SetState<T> = Dispatch<SetStateAction<T>>

function mergeUniquePersons(primary: Person[] | null, secondary: Person[] | null): Person[] | null {
  if (primary === null || secondary === null) return null

  const merged = [...primary]
  const ids = new Set(primary.map((person) => person.id))

  for (const person of secondary) {
    if (!ids.has(person.id)) merged.push(person)
  }

  return merged.sort((a, b) => (a.full_name || '').localeCompare(b.full_name || ''))
}

async function loadComparisonCandidates(
  personId: number,
  setOpponents: SetState<Person[] | null>,
  setCommonCandidates: SetState<Person[] | null>,
  setLoadingOpponents: SetState<boolean>,
  setLoadingCommonCandidates: SetState<boolean>
) {
  setLoadingOpponents(true)
  setLoadingCommonCandidates(true)

  try {
    const [opponents, commonCandidates] = await Promise.all([
      apiClient.get<{ id: number; full_name: string; country_iso_code: string | null }[]>(
        API_ENDPOINTS.PERSON_OPPONENTS(personId)
      ),
      apiClient.get<{ id: number; full_name: string; country_iso_code: string | null }[]>(
        API_ENDPOINTS.PERSON_COMMON_OPPONENT_CANDIDATES(personId)
      ),
    ])

    setOpponents(opponents || [])
    setCommonCandidates(commonCandidates || [])
  } catch {
    setOpponents([])
    setCommonCandidates([])
  } finally {
    setLoadingOpponents(false)
    setLoadingCommonCandidates(false)
  }
}

export function ComparisonView({ isDarkMode, onSelectPerson, onBack }: ComparisonViewProps) {
  const { t } = useTranslation()
  const persons = usePersons()

  const [wrestler1Search, setWrestler1Search] = useState("")
  const [wrestler2Search, setWrestler2Search] = useState("")
  const [selectedWrestler1, setSelectedWrestler1] = useState<Person | null>(null)
  const [selectedWrestler2, setSelectedWrestler2] = useState<Person | null>(null)
  const [mode1, setMode1] = useState<PickerMode>("idle")
  const [mode2, setMode2] = useState<PickerMode>("idle")
  const [comparisonResult, setComparisonResult] = useState<ComparisonResult | null>(null)
  const [comparisonError, setComparisonError] = useState<string | null>(null)
  const [comparing, setComparing] = useState(false)
  const [includeFights, setIncludeFights] = useState(false)
  const [includeCommonOpponents, setIncludeCommonOpponents] = useState(false)
  const [comparedWith, setComparedWith] = useState<{ fights: boolean; opponents: boolean } | null>(null)
  const [opponentsOfP1, setOpponentsOfP1] = useState<Person[] | null>(null)
  const [loadingOpponents, setLoadingOpponents] = useState(false)
  const [commonCandidates, setCommonCandidates] = useState<Person[] | null>(null)
  const [loadingCommonCandidates, setLoadingCommonCandidates] = useState(false)
  const [showAllP2, setShowAllP2] = useState(false)
  const [opponentsOfP2, setOpponentsOfP2] = useState<Person[] | null>(null)
  const [loadingOpponentsP2, setLoadingOpponentsP2] = useState(false)
  const [commonCandidatesP2, setCommonCandidatesP2] = useState<Person[] | null>(null)
  const [loadingCommonCandidatesP2, setLoadingCommonCandidatesP2] = useState(false)
  const [showAllP1, setShowAllP1] = useState(false)

  const searchRef1 = useRef<HTMLInputElement>(null)
  const searchRef2 = useRef<HTMLInputElement>(null)
  const containerRef1 = useRef<HTMLDivElement>(null)
  const containerRef2 = useRef<HTMLDivElement>(null)

  const anyOptionSelected = includeFights || includeCommonOpponents

  useEffect(() => {
    if (!selectedWrestler2) {
      setOpponentsOfP2(null)
      setCommonCandidatesP2(null)
      setShowAllP1(false)
      return
    }
    setShowAllP1(false)
    void loadComparisonCandidates(
      selectedWrestler2.id,
      setOpponentsOfP2,
      setCommonCandidatesP2,
      setLoadingOpponentsP2,
      setLoadingCommonCandidatesP2
    )
  }, [selectedWrestler2])

  const filterListForP1 = useMemo<Person[] | null>(() => {
    if (selectedWrestler1 || !selectedWrestler2 || !anyOptionSelected) return null
    if (includeFights && includeCommonOpponents) {
      return mergeUniquePersons(opponentsOfP2, commonCandidatesP2)
    }
    if (includeFights) return opponentsOfP2
    return commonCandidatesP2
  }, [selectedWrestler1, selectedWrestler2, anyOptionSelected, includeFights, includeCommonOpponents, opponentsOfP2, commonCandidatesP2])

  const loadingFilterP1 = (includeFights && loadingOpponentsP2) || (includeCommonOpponents && loadingCommonCandidatesP2)
  const usingOpponentsForP1 = !showAllP1 && filterListForP1 !== null && filterListForP1.length > 0
  const basePersons1 = usingOpponentsForP1 ? filterListForP1! : persons

  const filteredPersons1 = useMemo(() => {
    if (!wrestler1Search.trim()) return basePersons1
    return basePersons1.filter(p => p.full_name.toLowerCase().includes(wrestler1Search.toLowerCase()))
  }, [basePersons1, wrestler1Search])

  useEffect(() => {
    if (!selectedWrestler1) {
      setOpponentsOfP1(null)
      setCommonCandidates(null)
      setShowAllP2(false)
      return
    }
    setShowAllP2(false)
    void loadComparisonCandidates(
      selectedWrestler1.id,
      setOpponentsOfP1,
      setCommonCandidates,
      setLoadingOpponents,
      setLoadingCommonCandidates
    )
  }, [selectedWrestler1])

  const filterList = useMemo<Person[] | null>(() => {
    if (!anyOptionSelected) return null
    if (includeFights && includeCommonOpponents) {
      return mergeUniquePersons(opponentsOfP1, commonCandidates)
    }
    if (includeFights) return opponentsOfP1
    return commonCandidates
  }, [anyOptionSelected, includeFights, includeCommonOpponents, opponentsOfP1, commonCandidates])

  const loadingFilter = (includeFights && loadingOpponents) || (includeCommonOpponents && loadingCommonCandidates)
  const usingOpponents = !showAllP2 && filterList !== null && filterList.length > 0
  const basePersons2 = usingOpponents ? filterList! : persons

  const filteredPersons2 = useMemo(() => {
    if (!wrestler2Search.trim()) return basePersons2
    return basePersons2.filter(p => p.full_name.toLowerCase().includes(wrestler2Search.toLowerCase()))
  }, [basePersons2, wrestler2Search])

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
    setComparisonError(null)
    setComparing(false)
    setIncludeFights(false)
    setIncludeCommonOpponents(false)
    setComparedWith(null)
    setOpponentsOfP1(null)
    setCommonCandidates(null)
    setShowAllP2(false)
    setOpponentsOfP2(null)
    setCommonCandidatesP2(null)
    setShowAllP1(false)
    onBack()
  }

  const isSameWrestler = selectedWrestler1 && selectedWrestler2 && selectedWrestler1.id === selectedWrestler2.id

  const neitherSelected = !includeFights && !includeCommonOpponents

  const handleCompare = async () => {
    if (!selectedWrestler1 || !selectedWrestler2 || isSameWrestler || neitherSelected) return
    setComparing(true)
    setComparisonResult(null)
    setComparisonError(null)
    setComparedWith(null)
    try {
      const data = await apiClient.get<ComparisonResult>(API_ENDPOINTS.PERSON_COMPARE(selectedWrestler1.id, selectedWrestler2.id, includeFights, includeCommonOpponents))
      setComparisonResult(data)
      setComparedWith({ fights: includeFights, opponents: includeCommonOpponents })
    } catch {
      setComparisonError(t("comparison.noFights"))
    } finally {
      setComparing(false)
    }
  }

  return (
    <DashboardStatsShell
      isDarkMode={isDarkMode}
      onBack={reset}
      backLabel={t("comparison.backToCategories")}
      title={t("comparison.title")}
      subtitle={t("comparison.subtitle")}
    >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div>
            {selectedWrestler2 && !selectedWrestler1 && anyOptionSelected && (
              <div className={`mb-2 flex items-center gap-1.5 text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                {loadingFilterP1 ? (
                  <span className="animate-pulse">{t("comparison.loadingOpponents")}</span>
                ) : filterListForP1 && filterListForP1.length > 0 ? (
                  <>
                    <svg className={`w-3.5 h-3.5 flex-shrink-0 ${usingOpponentsForP1 ? (isDarkMode ? 'text-purple-400' : 'text-purple-500') : (isDarkMode ? 'text-gray-500' : 'text-gray-400')}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                    {usingOpponentsForP1 ? (
                      <>
                        <span>{t("comparison.suggestedOpponents", { count: filterListForP1.length })}</span>
                        <button
                          onClick={() => setShowAllP1(true)}
                          className={`ml-1 underline underline-offset-2 transition-colors ${isDarkMode ? 'hover:text-gray-200' : 'hover:text-gray-700'}`}
                        >
                          {t("comparison.showAll")}
                        </button>
                      </>
                    ) : (
                      <>
                        <span>{t("comparison.showingAll")}</span>
                        <button
                          onClick={() => setShowAllP1(false)}
                          className={`ml-1 underline underline-offset-2 transition-colors ${isDarkMode ? 'text-purple-400 hover:text-purple-300' : 'text-purple-600 hover:text-purple-700'}`}
                        >
                          {t("comparison.showSuggested", { count: filterListForP1.length })}
                        </button>
                      </>
                    )}
                  </>
                ) : filterListForP1 !== null && filterListForP1.length === 0 ? (
                  <span>{t("comparison.noOpponentsFound")}</span>
                ) : null}
              </div>
            )}
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
              allPersons={basePersons1}
              searchInputRef={searchRef1}
              containerRef={containerRef1}
            />
          </div>
          <div>
            {selectedWrestler1 && !selectedWrestler2 && anyOptionSelected && (
              <div className={`mb-2 flex items-center gap-1.5 text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                {loadingFilter ? (
                  <span className="animate-pulse">{t("comparison.loadingOpponents")}</span>
                ) : filterList && filterList.length > 0 ? (
                  <>
                    <svg className={`w-3.5 h-3.5 flex-shrink-0 ${usingOpponents ? (isDarkMode ? 'text-purple-400' : 'text-purple-500') : (isDarkMode ? 'text-gray-500' : 'text-gray-400')}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                    {usingOpponents ? (
                      <>
                        <span>{t("comparison.suggestedOpponents", { count: filterList.length })}</span>
                        <button
                          onClick={() => setShowAllP2(true)}
                          className={`ml-1 underline underline-offset-2 transition-colors ${isDarkMode ? 'hover:text-gray-200' : 'hover:text-gray-700'}`}
                        >
                          {t("comparison.showAll")}
                        </button>
                      </>
                    ) : (
                      <>
                        <span>{t("comparison.showingAll")}</span>
                        <button
                          onClick={() => setShowAllP2(false)}
                          className={`ml-1 underline underline-offset-2 transition-colors ${isDarkMode ? 'text-purple-400 hover:text-purple-300' : 'text-purple-600 hover:text-purple-700'}`}
                        >
                          {t("comparison.showSuggested", { count: filterList.length })}
                        </button>
                      </>
                    )}
                  </>
                ) : filterList !== null && filterList.length === 0 ? (
                  <span>{t("comparison.noOpponentsFound")}</span>
                ) : null}
              </div>
            )}
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
              allPersons={basePersons2}
              searchInputRef={searchRef2}
              containerRef={containerRef2}
            />
          </div>
        </div>

        <Toast
          show={!!isSameWrestler}
          variant="warning"
          title={t("comparison.sameWrestlerWarning")}
          message={t("comparison.sameWrestlerMsg")}
        />

        <div className="space-y-2 mb-4">
          <Checkbox
            checked={includeFights}
            onChange={setIncludeFights}
            isDarkMode={isDarkMode}
            className={isDarkMode ? 'text-gray-300' : 'text-gray-700'}
            label={<span className="text-sm">{t("comparison.includeFights")}</span>}
          />
          <Checkbox
            checked={includeCommonOpponents}
            onChange={setIncludeCommonOpponents}
            isDarkMode={isDarkMode}
            className={isDarkMode ? 'text-gray-300' : 'text-gray-700'}
            label={
              <span className="text-sm flex items-center gap-1">
                {t("comparison.includeCommonOpponents")}
                {includeCommonOpponents && (
                  <span className={`text-xs ml-1 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                    — A vs C, B vs C → porovná sa na základe C
                  </span>
                )}
              </span>
            }
          />
        </div>

        <div className="space-y-2">
          {selectedWrestler1 && selectedWrestler2 && !isSameWrestler && neitherSelected && (
            <p className={`text-xs ${isDarkMode ? 'text-amber-400' : 'text-amber-600'}`}>
              {t("comparison.selectAtLeastOne")}
            </p>
          )}
          <div className="flex items-center gap-3">
            <button
              disabled={!selectedWrestler1 || !selectedWrestler2 || comparing || !!isSameWrestler || neitherSelected}
              onClick={handleCompare}
              className={`px-6 py-2.5 rounded-lg font-medium transition-all ${
                selectedWrestler1 && selectedWrestler2 && !comparing && !isSameWrestler && !neitherSelected
                  ? 'bg-purple-600 text-white hover:bg-purple-700 active:scale-95'
                  : isDarkMode
                    ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                    : 'bg-gray-200 text-gray-400 cursor-not-allowed'
              }`}
            >
              {comparing ? t("comparison.comparingButton") : t("comparison.compareButton")}
            </button>
            <button
              onClick={reset}
              className={`px-6 py-2.5 rounded-lg font-medium transition-all ${
                isDarkMode
                  ? 'bg-[#0f172a]/50 text-gray-300 hover:bg-[#0f172a] border border-white/10'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-200'
              }`}
            >
              {t("comparison.cancelButton")}
            </button>
          </div>
        </div>

        {comparisonResult && comparedWith && (
          <div className="mt-8 space-y-8">
            {comparedWith.fights && (
              <ComparisonFightSection
                isDarkMode={isDarkMode}
                result={comparisonResult}
                onSelectPerson={onSelectPerson}
              />
            )}

            {comparedWith.opponents && (
              <>
                {comparisonResult.common_opponents && comparisonResult.common_opponents.length > 0 ? (
                  <div>
                    <h3 className={`text-lg font-bold mb-4 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                      {t("comparison.commonOpponents", { count: comparisonResult.common_opponents.length })}
                    </h3>
                    <div className="space-y-4">
                      {comparisonResult.common_opponents.map((opp, idx) => (
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
                ) : (
                  <div className={`text-center py-6 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                    <p className="text-sm">{t("comparison.noCommonOpponents")}</p>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {comparisonError && (
          <div className={`mt-6 rounded-lg p-4 ${isDarkMode ? 'bg-red-900/20 text-red-400' : 'bg-red-50 text-red-600'}`}>
            {comparisonError}
          </div>
        )}
    </DashboardStatsShell>
  )
}
