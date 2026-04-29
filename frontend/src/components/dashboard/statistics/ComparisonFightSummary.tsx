import { useTranslation } from "react-i18next"
import type { ReactNode } from "react"
import { formatDuration, pluralizeSk } from "@/utils/format"
import type { ComparisonFight, ComparisonPerson, ComparisonResult } from "./comparisonTypes"

interface WrestlerFightProfile {
  winsByType: Record<string, number>
  lossesByType: Record<string, number>
  avgTpFor: number
  avgCpFor: number
  tpDiff: number
  form: ("W" | "L" | "-")[]
}

function average(values: number[]) {
  return values.length ? Math.round((values.reduce((sum, value) => sum + value, 0) / values.length) * 10) / 10 : 0
}

function buildWrestlerFightProfile(fights: ComparisonFight[], personKey: "person1" | "person2"): WrestlerFightProfile {
  const isPerson1 = personKey === "person1"
  const tpFor: number[] = []
  const tpAgainst: number[] = []
  const cpFor: number[] = []
  const winsByType: Record<string, number> = {}
  const lossesByType: Record<string, number> = {}
  const form = fights.slice(-5).map((fight) => {
    if (!fight.winner) return "-"
    return fight.winner === personKey ? "W" : "L"
  })

  for (const fight of fights) {
    const ownTp = isPerson1 ? fight.person1_tp : fight.person2_tp
    const otherTp = isPerson1 ? fight.person2_tp : fight.person1_tp
    const ownCp = isPerson1 ? fight.person1_cp : fight.person2_cp

    if (ownTp !== null) tpFor.push(ownTp)
    if (otherTp !== null) tpAgainst.push(otherTp)
    if (ownCp !== null) cpFor.push(ownCp)

    if (!fight.victory_type || !fight.winner) continue
    const bucket = fight.winner === personKey ? winsByType : lossesByType
    bucket[fight.victory_type] = (bucket[fight.victory_type] ?? 0) + 1
  }

  const avgTpFor = average(tpFor)
  const avgTpAgainst = average(tpAgainst)

  return {
    winsByType,
    lossesByType,
    avgTpFor,
    avgCpFor: average(cpFor),
    tpDiff: Math.round((avgTpFor - avgTpAgainst) * 10) / 10,
    form,
  }
}

function ProfileStat({ label, value, isDarkMode }: { label: string; value: string | number; isDarkMode: boolean }) {
  return (
    <div className={`rounded-lg px-3 py-2 ${isDarkMode ? "bg-white/5" : "bg-white border border-gray-100"}`}>
      <div className={`text-[11px] font-medium uppercase tracking-wider ${isDarkMode ? "text-gray-500" : "text-gray-400"}`}>{label}</div>
      <div className={`mt-1 text-sm font-bold ${isDarkMode ? "text-gray-100" : "text-gray-900"}`}>{value}</div>
    </div>
  )
}

function FinishPills({ values, isDarkMode }: { values: Record<string, number>; isDarkMode: boolean }) {
  const entries = Object.entries(values).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
  if (!entries.length) return <span className={isDarkMode ? "text-gray-500" : "text-gray-400"}>-</span>

  return (
    <div className="flex flex-wrap gap-1.5">
      {entries.map(([type, count]) => (
        <span key={type} className={`rounded px-2 py-0.5 text-xs font-semibold ${isDarkMode ? "bg-purple-900/30 text-purple-300" : "bg-purple-50 text-purple-700"}`}>
          {type} · {count}
        </span>
      ))}
    </div>
  )
}

function FormPills({ form }: { form: ("W" | "L" | "-")[] }) {
  if (!form.length) return <span>-</span>
  return (
    <div className="flex gap-1.5">
      {form.map((result, index) => (
        <span
          key={`${result}-${index}`}
          className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${
            result === "W" ? "bg-green-500/15 text-green-500" :
              result === "L" ? "bg-red-500/15 text-red-500" :
                "bg-gray-500/10 text-gray-400"
          }`}
        >
          {result}
        </span>
      ))}
    </div>
  )
}

function WrestlerProfilePanel({
  isDarkMode,
  person,
  profile,
}: {
  isDarkMode: boolean
  person: ComparisonPerson
  profile: WrestlerFightProfile
}) {
  const { t } = useTranslation()

  return (
    <div className={`rounded-lg p-4 ${isDarkMode ? "bg-[#0f172a]/60 border border-white/5" : "bg-gray-50 border border-gray-200"}`}>
      <div className={`mb-4 text-sm font-bold ${isDarkMode ? "text-white" : "text-gray-900"}`}>
        {person.country && (
          <span className={`fi fi-${person.country.toLowerCase()} rounded-sm mr-1.5`} style={{ fontSize: "0.9rem" }} />
        )}
        {person.name}
      </div>
      <div className="grid grid-cols-2 gap-2">
        <ProfileStat label={t("comparison.avgTpFor")} value={profile.avgTpFor.toFixed(1)} isDarkMode={isDarkMode} />
        <ProfileStat label={t("comparison.avgCpFor")} value={profile.avgCpFor.toFixed(1)} isDarkMode={isDarkMode} />
        <ProfileStat label={t("comparison.tpDiff")} value={profile.tpDiff.toFixed(1)} isDarkMode={isDarkMode} />
        <div className={`rounded-lg px-3 py-2 ${isDarkMode ? "bg-white/5" : "bg-white border border-gray-100"}`}>
          <div className={`text-[11px] font-medium uppercase tracking-wider ${isDarkMode ? "text-gray-500" : "text-gray-400"}`}>{t("comparison.recentForm")}</div>
          <div className="mt-1"><FormPills form={profile.form} /></div>
        </div>
      </div>
      <div className="mt-4 space-y-3">
        <div>
          <div className={`mb-1.5 text-xs font-semibold ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}>{t("comparison.winsByType")}</div>
          <FinishPills values={profile.winsByType} isDarkMode={isDarkMode} />
        </div>
        <div>
          <div className={`mb-1.5 text-xs font-semibold ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}>{t("comparison.lossesByType")}</div>
          <FinishPills values={profile.lossesByType} isDarkMode={isDarkMode} />
        </div>
      </div>
    </div>
  )
}

function FightProfileSummary({ isDarkMode, result }: { isDarkMode: boolean; result: ComparisonResult }) {
  const profile1 = buildWrestlerFightProfile(result.fights, "person1")
  const profile2 = buildWrestlerFightProfile(result.fights, "person2")

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-6">
      <WrestlerProfilePanel isDarkMode={isDarkMode} person={result.person1} profile={profile1} />
      <WrestlerProfilePanel isDarkMode={isDarkMode} person={result.person2} profile={profile2} />
    </div>
  )
}

function FightHistoryTable({ isDarkMode, fights }: { isDarkMode: boolean; fights: ComparisonFight[] }) {
  const { t } = useTranslation()
  return (
    <div>
      <h3 className={`text-lg font-bold mb-4 ${isDarkMode ? "text-white" : "text-gray-900"}`}>
        {t("comparison.fightHistory")}
      </h3>
      <div className={`rounded-lg overflow-hidden ${isDarkMode ? "shadow-lg" : "border border-gray-200"}`}>
        <table className="w-full">
          <thead>
            <tr className={`border-b ${isDarkMode ? "border-white/5 bg-white/5" : "border-gray-200 bg-gray-50"}`}>
              <th className={`text-left py-3 px-4 text-sm font-semibold ${isDarkMode ? "text-gray-300" : "text-gray-700"}`}>{t("comparison.tableHeaders.tournament")}</th>
              <th className={`text-left py-3 px-4 text-sm font-semibold ${isDarkMode ? "text-gray-300" : "text-gray-700"}`}>{t("comparison.tableHeaders.category")}</th>
              <th className={`text-center py-3 px-4 text-sm font-semibold ${isDarkMode ? "text-gray-300" : "text-gray-700"}`}>{t("comparison.tableHeaders.winner")}</th>
              <th className={`text-center py-3 px-4 text-sm font-semibold ${isDarkMode ? "text-gray-300" : "text-gray-700"}`}>{t("comparison.tableHeaders.winType")}</th>
              <th className={`text-center py-3 px-4 text-sm font-semibold ${isDarkMode ? "text-gray-300" : "text-gray-700"}`}>{t("comparison.tableHeaders.cp")}</th>
              <th className={`text-center py-3 px-4 text-sm font-semibold ${isDarkMode ? "text-gray-300" : "text-gray-700"}`}>{t("comparison.tableHeaders.tp")}</th>
              <th className={`text-center py-3 px-4 text-sm font-semibold ${isDarkMode ? "text-gray-300" : "text-gray-700"}`}>{t("comparison.tableHeaders.time")}</th>
            </tr>
          </thead>
          <tbody>
            {fights.map((fight, idx) => (
              <tr
                key={fight.fight_id || idx}
                className={`border-b last:border-b-0 ${isDarkMode ? "border-white/5 hover:bg-white/5" : "border-gray-100 hover:bg-gray-50"}`}
              >
                <td className={`py-3 px-4 text-sm ${isDarkMode ? "text-gray-300" : "text-gray-700"}`}>
                  {fight.sport_event_name || "-"}
                </td>
                <td className={`py-3 px-4 text-sm ${isDarkMode ? "text-gray-400" : "text-gray-600"}`}>
                  {fight.weight_category || "-"}
                </td>
                <td className="py-3 px-4 text-center">
                  {fight.winner ? (
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${
                      fight.winner === "person1" ? "bg-green-900/30 text-green-400" : "bg-blue-900/30 text-blue-400"
                    }`}>
                      {fight.winner_name}
                    </span>
                  ) : (
                    <span className={`text-xs ${isDarkMode ? "text-gray-500" : "text-gray-400"}`}>-</span>
                  )}
                </td>
                <td className={`py-3 px-4 text-center text-sm font-medium ${isDarkMode ? "text-purple-400" : "text-purple-600"}`}>
                  {fight.victory_type || "-"}
                </td>
                <td className={`py-3 px-4 text-center text-sm ${isDarkMode ? "text-gray-300" : "text-gray-700"}`}>
                  <span className={fight.winner === "person1" ? "font-bold" : ""}>{fight.person1_cp ?? "-"}</span>
                  <span className={isDarkMode ? "text-gray-500" : "text-gray-400"}> : </span>
                  <span className={fight.winner === "person2" ? "font-bold" : ""}>{fight.person2_cp ?? "-"}</span>
                </td>
                <td className={`py-3 px-4 text-center text-sm ${isDarkMode ? "text-gray-300" : "text-gray-700"}`}>
                  <span className={fight.winner === "person1" ? "font-bold" : ""}>{fight.person1_tp ?? "-"}</span>
                  <span className={isDarkMode ? "text-gray-500" : "text-gray-400"}> : </span>
                  <span className={fight.winner === "person2" ? "font-bold" : ""}>{fight.person2_tp ?? "-"}</span>
                </td>
                <td className={`py-3 px-4 text-center text-sm ${isDarkMode ? "text-gray-400" : "text-gray-600"}`}>
                  {fight.duration ? formatDuration(fight.duration) : "-"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export function ComparisonFightSection({
  isDarkMode,
  result,
  onSelectPerson,
}: {
  isDarkMode: boolean
  result: ComparisonResult
  onSelectPerson?: (person: { id: number; name: string }) => void
}) {
  const { t } = useTranslation()

  return (
    <div className={`rounded-xl p-6 ${isDarkMode ? "bg-[#0f172a]/80 border border-white/5" : "bg-gray-50 border border-gray-200"}`}>
      <h3 className={`text-lg font-bold mb-6 text-center ${isDarkMode ? "text-white" : "text-gray-900"}`}>
        {t("comparison.headToHead")}
      </h3>
      <div className="flex items-center justify-center gap-6">
        {[
          { person: result.person1, wins: result.person1_wins, otherWins: result.person2_wins },
          { person: result.person2, wins: result.person2_wins, otherWins: result.person1_wins },
        ].map(({ person, wins, otherWins }) => (
          <div key={person.id} className="text-center flex-1">
            <div className={`text-sm font-medium mb-1 ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}>
              {person.country && (
                <span className={`fi fi-${person.country.toLowerCase()} rounded-sm mr-1.5`} style={{ fontSize: "0.9rem" }} />
              )}
              {onSelectPerson ? (
                <button onClick={() => onSelectPerson({ id: person.id, name: person.name })} className={`hover:underline ${isDarkMode ? "text-blue-400" : "text-blue-600"}`}>
                  {person.name}
                </button>
              ) : person.name}
            </div>
            <div className={`text-5xl font-black ${
              wins > otherWins ? "text-green-500"
                : wins < otherWins ? isDarkMode ? "text-red-400" : "text-red-500"
                  : isDarkMode ? "text-gray-400" : "text-gray-500"
            }`}>
              {wins}
            </div>
            <div className={`text-xs mt-1 ${isDarkMode ? "text-gray-500" : "text-gray-400"}`}>
              {pluralizeSk(wins, t("comparison.wins"), t("comparison.winsFew"), t("comparison.winsMany"))}
            </div>
          </div>
        )).reduce<ReactNode[]>((acc, el, i) => {
          if (i === 1) {
            acc.push(
              <div key="vs" className="flex flex-col items-center">
                <div className={`text-sm font-bold px-4 py-2 rounded-full ${isDarkMode ? "bg-white/5 text-gray-400" : "bg-gray-200 text-gray-500"}`}>
                  {result.total_fights} {pluralizeSk(result.total_fights, t("comparison.fights"), t("comparison.fightsFew"), t("comparison.fightsMany"))}
                </div>
              </div>
            )
          }
          acc.push(el)
          return acc
        }, [])}
      </div>

      {result.fights.length > 0 && (
        <FightProfileSummary isDarkMode={isDarkMode} result={result} />
      )}

      {result.fights.length > 0 && (
        <div className="mt-6">
          <FightHistoryTable isDarkMode={isDarkMode} fights={result.fights} />
        </div>
      )}

      {result.total_fights === 0 && (
        <div className={`text-center py-6 ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}>
          <svg className={`mx-auto h-10 w-10 mb-3 ${isDarkMode ? "text-gray-600" : "text-gray-400"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
          </svg>
          <p className="font-medium">{t("comparison.noHeadToHead")}</p>
          <p className={`text-sm mt-1 ${isDarkMode ? "text-gray-500" : "text-gray-400"}`}>{t("comparison.noHeadToHeadDesc")}</p>
        </div>
      )}
    </div>
  )
}
