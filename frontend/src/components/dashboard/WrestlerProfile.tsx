import { useState, useEffect, useMemo } from "react"
import { apiClient } from "@/services/apiClient"
import { API_ENDPOINTS } from "@/config/api"
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  LineChart, Line, ResponsiveContainer, Legend
} from "recharts"

interface WrestlerProfileProps {
  isDarkMode: boolean
  personId: number
  onBack: () => void
}

interface PersonDetail {
  id: number
  full_name: string
  country_iso_code: string | null
  events: {
    athlete_id: number
    event_id: number
    event_name: string | null
    team_name: string | null
    team_country: string | null
    weight_category: string | null
    is_competing: boolean
  }[]
}

interface PersonFight {
  fight_id: number
  event_name: string | null
  weight_category: string | null
  opponent: string | null
  is_winner: boolean | null
  victory_type: string | null
  tp_self: number | null
  tp_opponent: number | null
  cp_self: number | null
  cp_opponent: number | null
}

interface PersonFightsResponse {
  person: string
  country: string | null
  total_fights: number
  fights: PersonFight[]
}

const CHART_COLORS = ["#8b5cf6", "#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#ec4899", "#06b6d4", "#84cc16"]
const WIN_COLOR = "#10b981"
const LOSS_COLOR = "#ef4444"

export function WrestlerProfile({ isDarkMode, personId, onBack }: WrestlerProfileProps) {
  const [person, setPerson] = useState<PersonDetail | null>(null)
  const [fightsData, setFightsData] = useState<PersonFightsResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [chartMetric, setChartMetric] = useState<"tp" | "cp">("tp")

  useEffect(() => {
    setLoading(true)
    setError(null)

    Promise.all([
      apiClient.get<PersonDetail>(API_ENDPOINTS.PERSON_DETAIL(personId)),
      apiClient.get<PersonFightsResponse>(API_ENDPOINTS.PERSON_FIGHTS(personId)),
    ])
      .then(([personData, fightsResp]) => {
        setPerson(personData)
        setFightsData(fightsResp)
      })
      .catch(() => setError("Nepodarilo sa načítať profil zápasníka"))
      .finally(() => setLoading(false))
  }, [personId])

  const stats = useMemo(() => {
    if (!fightsData || !person) return null

    const fights = fightsData.fights
    const totalFights = fights.length
    const wins = fights.filter(f => f.is_winner === true).length
    const losses = fights.filter(f => f.is_winner === false).length
    const winRate = totalFights > 0 ? Math.round((wins / totalFights) * 100) : 0

    const tpValues = fights.map(f => f.tp_self).filter((v): v is number => v !== null)
    const cpValues = fights.map(f => f.cp_self).filter((v): v is number => v !== null)
    const avgTp = tpValues.length > 0 ? (tpValues.reduce((a, b) => a + b, 0) / tpValues.length).toFixed(1) : "0"
    const avgCp = cpValues.length > 0 ? (cpValues.reduce((a, b) => a + b, 0) / cpValues.length).toFixed(1) : "0"

    // Most common victory type
    const victoryTypes: Record<string, number> = {}
    fights.forEach(f => {
      if (f.is_winner && f.victory_type) {
        victoryTypes[f.victory_type] = (victoryTypes[f.victory_type] || 0) + 1
      }
    })
    const mostCommonVictory = Object.entries(victoryTypes).sort((a, b) => b[1] - a[1])[0]?.[0] || "-"

    const numTournaments = person.events.length

    // Victory type bar chart data (all victory types, including losses by type)
    const allVictoryTypes: Record<string, number> = {}
    fights.forEach(f => {
      if (f.victory_type) {
        allVictoryTypes[f.victory_type] = (allVictoryTypes[f.victory_type] || 0) + 1
      }
    })
    const victoryTypeBarData = Object.entries(allVictoryTypes)
      .sort((a, b) => b[1] - a[1])
      .map(([name, value]) => ({ name, value }))

    // TP and CP per tournament
    const eventMetricMap: Record<string, { tpTotal: number; tpCount: number; cpTotal: number; cpCount: number }> = {}
    fights.forEach(f => {
      const eventName = f.event_name || "Unknown"
      if (!eventMetricMap[eventName]) eventMetricMap[eventName] = { tpTotal: 0, tpCount: 0, cpTotal: 0, cpCount: 0 }
      if (f.tp_self !== null) {
        eventMetricMap[eventName].tpTotal += f.tp_self
        eventMetricMap[eventName].tpCount += 1
      }
      if (f.cp_self !== null) {
        eventMetricMap[eventName].cpTotal += f.cp_self
        eventMetricMap[eventName].cpCount += 1
      }
    })
    const metricPerTournament = Object.entries(eventMetricMap).map(([name, data]) => ({
      name: name.length > 25 ? name.slice(0, 22) + "..." : name,
      avgTp: data.tpCount > 0 ? Math.round((data.tpTotal / data.tpCount) * 10) / 10 : 0,
      avgCp: data.cpCount > 0 ? Math.round((data.cpTotal / data.cpCount) * 10) / 10 : 0,
    }))

    return {
      totalFights,
      wins,
      losses,
      winRate,
      avgTp,
      avgCp,
      mostCommonVictory,
      numTournaments,
      pieData: [
        { name: "Výhra", value: wins },
        { name: "Prehra", value: losses },
      ],
      victoryTypeBarData,
      metricPerTournament,
    }
  }, [fightsData, person])

  if (loading) {
    return (
      <div className={`text-center py-20 ${isDarkMode ? "text-gray-400" : "text-gray-600"}`}>
        <div className="inline-block w-10 h-10 border-4 border-current border-t-transparent rounded-full animate-spin mb-4" />
        <p>Načítavam profil...</p>
      </div>
    )
  }

  if (error || !person || !fightsData || !stats) {
    return (
      <div className="space-y-4">
        <button onClick={onBack} className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${isDarkMode ? "bg-[#1e293b] hover:bg-[#334155] text-gray-300" : "bg-gray-100 hover:bg-gray-200 text-gray-700"}`}>
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
          Späť
        </button>
        <div className={`rounded-lg p-8 text-center ${isDarkMode ? "bg-red-900/20 text-red-400" : "bg-red-50 text-red-600"}`}>
          {error || "Nepodarilo sa načítať profil"}
        </div>
      </div>
    )
  }

  const tooltipStyle = {
    backgroundColor: isDarkMode ? "#1e293b" : "#fff",
    border: `1px solid ${isDarkMode ? "rgba(255,255,255,0.1)" : "#e5e7eb"}`,
    borderRadius: "8px",
    color: isDarkMode ? "#e2e8f0" : "#1f2937",
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={onBack}
          className={`p-2 rounded-lg transition-all ${isDarkMode ? "hover:bg-white/5 text-gray-300 hover:text-white" : "hover:bg-gray-100 text-gray-600 hover:text-gray-900"}`}
        >
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
        </button>
        <div className="flex items-center gap-3">
          {person.country_iso_code && (
            <span className={`fi fi-${person.country_iso_code.toLowerCase()} fis rounded-md`} style={{ fontSize: "2.5rem" }} />
          )}
          <div>
            <h2 className={`text-3xl font-bold ${isDarkMode ? "text-white" : "text-gray-900"}`}>
              {person.full_name}
            </h2>
            <p className={`text-sm mt-1 ${isDarkMode ? "text-gray-400" : "text-gray-600"}`}>
              {stats.totalFights} zápasov na {stats.numTournaments} turnajoch
            </p>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {[
          { label: "Zápasy", value: stats.totalFights, color: "text-blue-500" },
          { label: "Win rate", value: `${stats.winRate}%`, color: "text-green-500" },
          { label: "Priem. TP", value: stats.avgTp, color: "text-purple-500" },
          { label: "Priem. CP", value: stats.avgCp, color: "text-yellow-500" },
          { label: "Najč. výhra", value: stats.mostCommonVictory, color: "text-orange-500" },
          { label: "Turnaje", value: stats.numTournaments, color: "text-cyan-500" },
        ].map((card) => (
          <div
            key={card.label}
            className={`rounded-xl p-4 text-center ${isDarkMode ? "bg-[#1e293b]" : "bg-white border border-gray-200"} shadow-sm`}
          >
            <p className={`text-xs font-medium mb-1 ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}>{card.label}</p>
            <p className={`text-xl font-bold ${card.color}`}>{card.value}</p>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Win/Loss Pie */}
        <div className={`rounded-xl p-6 ${isDarkMode ? "bg-[#1e293b]" : "bg-white border border-gray-200"} shadow-sm`}>
          <h3 className={`text-lg font-bold mb-4 ${isDarkMode ? "text-white" : "text-gray-900"}`}>Výhra / Prehra</h3>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart style={{ overflow: "visible" }}>
              <Pie data={stats.pieData} cx="50%" cy="55%" innerRadius={50} outerRadius={80} dataKey="value" label={({ name, value }) => `${name}: ${value}`}>
                <Cell fill={WIN_COLOR} />
                <Cell fill={LOSS_COLOR} />
              </Pie>
              <Tooltip contentStyle={tooltipStyle} />
              <Legend wrapperStyle={{ paddingTop: 16 }} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Victory Type Bar */}
        <div className={`rounded-xl p-6 ${isDarkMode ? "bg-[#1e293b]" : "bg-white border border-gray-200"} shadow-sm`}>
          <h3 className={`text-lg font-bold mb-4 ${isDarkMode ? "text-white" : "text-gray-900"}`}>Typy víťazstiev</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={stats.victoryTypeBarData}>
              <CartesianGrid strokeDasharray="3 3" stroke={isDarkMode ? "rgba(255,255,255,0.05)" : "#f0f0f0"} />
              <XAxis dataKey="name" tick={{ fill: isDarkMode ? "#94a3b8" : "#6b7280", fontSize: 12 }} />
              <YAxis tick={{ fill: isDarkMode ? "#94a3b8" : "#6b7280", fontSize: 12 }} allowDecimals={false} />
              <Tooltip contentStyle={tooltipStyle} />
              <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                {stats.victoryTypeBarData.map((_, i) => (
                  <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* TP/CP per Tournament Line */}
        <div className={`rounded-xl p-6 ${isDarkMode ? "bg-[#1e293b]" : "bg-white border border-gray-200"} shadow-sm`}>
          <div className="flex items-center justify-between mb-4">
            <h3 className={`text-lg font-bold ${isDarkMode ? "text-white" : "text-gray-900"}`}>
              Priem. {chartMetric === "tp" ? "TP" : "CP"} podľa turnaja
            </h3>
            <div className={`flex rounded-lg overflow-hidden ${isDarkMode ? "bg-white/5" : "bg-gray-100"}`}>
              <button
                onClick={() => setChartMetric("tp")}
                className={`px-3 py-1 text-sm font-medium transition-all ${
                  chartMetric === "tp"
                    ? isDarkMode ? "bg-purple-600 text-white" : "bg-purple-500 text-white"
                    : isDarkMode ? "text-gray-400 hover:text-white" : "text-gray-600 hover:text-gray-900"
                }`}
              >
                TP
              </button>
              <button
                onClick={() => setChartMetric("cp")}
                className={`px-3 py-1 text-sm font-medium transition-all ${
                  chartMetric === "cp"
                    ? isDarkMode ? "bg-yellow-600 text-white" : "bg-yellow-500 text-white"
                    : isDarkMode ? "text-gray-400 hover:text-white" : "text-gray-600 hover:text-gray-900"
                }`}
              >
                CP
              </button>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={stats.metricPerTournament}>
              <CartesianGrid strokeDasharray="3 3" stroke={isDarkMode ? "rgba(255,255,255,0.05)" : "#f0f0f0"} />
              <XAxis dataKey="name" tick={{ fill: isDarkMode ? "#94a3b8" : "#6b7280", fontSize: 10 }} angle={-20} textAnchor="end" height={50} />
              <YAxis tick={{ fill: isDarkMode ? "#94a3b8" : "#6b7280", fontSize: 12 }} />
              <Tooltip contentStyle={tooltipStyle} />
              <Legend />
              {chartMetric === "tp" ? (
                <Line type="monotone" dataKey="avgTp" name="Priem. TP" stroke="#8b5cf6" strokeWidth={2} dot={{ r: 4, fill: "#8b5cf6" }} />
              ) : (
                <Line type="monotone" dataKey="avgCp" name="Priem. CP" stroke="#f59e0b" strokeWidth={2} dot={{ r: 4, fill: "#f59e0b" }} />
              )}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Events Table */}
      <div className={`rounded-xl p-6 ${isDarkMode ? "bg-[#1e293b]" : "bg-white border border-gray-200"} shadow-sm`}>
        <h3 className={`text-lg font-bold mb-4 ${isDarkMode ? "text-white" : "text-gray-900"}`}>Turnaje</h3>
        <div className={`rounded-lg overflow-hidden ${isDarkMode ? "shadow-lg" : "border border-gray-200"}`}>
          <table className="w-full">
            <thead>
              <tr className={`border-b ${isDarkMode ? "border-white/5 bg-white/5" : "border-gray-200 bg-gray-50"}`}>
                <th className={`text-left py-3 px-4 text-sm font-semibold ${isDarkMode ? "text-gray-300" : "text-gray-700"}`}>Turnaj</th>
                <th className={`text-left py-3 px-4 text-sm font-semibold ${isDarkMode ? "text-gray-300" : "text-gray-700"}`}>Tím</th>
                <th className={`text-left py-3 px-4 text-sm font-semibold ${isDarkMode ? "text-gray-300" : "text-gray-700"}`}>Kategória</th>
              </tr>
            </thead>
            <tbody>
              {person.events.map((event) => (
                <tr key={event.athlete_id} className={`border-b last:border-b-0 ${isDarkMode ? "border-white/5 hover:bg-white/5" : "border-gray-100 hover:bg-gray-50"}`}>
                  <td className={`py-3 px-4 text-sm font-medium ${isDarkMode ? "text-white" : "text-gray-900"}`}>{event.event_name || "-"}</td>
                  <td className={`py-3 px-4 text-sm ${isDarkMode ? "text-gray-300" : "text-gray-700"}`}>
                    {event.team_country ? (
                      <span
                        className={`fi fi-${event.team_country.toLowerCase()} rounded-sm`}
                        style={{ fontSize: "1.2rem" }}
                        title={event.team_name ?? undefined}
                      />
                    ) : (
                      event.team_name || "-"
                    )}
                  </td>
                  <td className={`py-3 px-4 text-sm ${isDarkMode ? "text-gray-400" : "text-gray-600"}`}>{event.weight_category || "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Fights Table */}
      <div className={`rounded-xl p-6 ${isDarkMode ? "bg-[#1e293b]" : "bg-white border border-gray-200"} shadow-sm`}>
        <h3 className={`text-lg font-bold mb-4 ${isDarkMode ? "text-white" : "text-gray-900"}`}>Zápasy ({stats.totalFights})</h3>
        <div className={`rounded-lg overflow-hidden ${isDarkMode ? "shadow-lg" : "border border-gray-200"}`}>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className={`border-b ${isDarkMode ? "border-white/5 bg-white/5" : "border-gray-200 bg-gray-50"}`}>
                  <th className={`text-left py-3 px-4 text-sm font-semibold ${isDarkMode ? "text-gray-300" : "text-gray-700"}`}>Turnaj</th>
                  <th className={`text-left py-3 px-4 text-sm font-semibold ${isDarkMode ? "text-gray-300" : "text-gray-700"}`}>Kategória</th>
                  <th className={`text-left py-3 px-4 text-sm font-semibold ${isDarkMode ? "text-gray-300" : "text-gray-700"}`}>Súper</th>
                  <th className={`text-center py-3 px-4 text-sm font-semibold ${isDarkMode ? "text-gray-300" : "text-gray-700"}`}>Výsledok</th>
                  <th className={`text-center py-3 px-4 text-sm font-semibold ${isDarkMode ? "text-gray-300" : "text-gray-700"}`}>Typ</th>
                  <th className={`text-center py-3 px-4 text-sm font-semibold ${isDarkMode ? "text-gray-300" : "text-gray-700"}`}>TP</th>
                  <th className={`text-center py-3 px-4 text-sm font-semibold ${isDarkMode ? "text-gray-300" : "text-gray-700"}`}>CP</th>
                </tr>
              </thead>
              <tbody>
                {fightsData.fights.map((fight) => (
                  <tr key={fight.fight_id} className={`border-b last:border-b-0 ${isDarkMode ? "border-white/5 hover:bg-white/5" : "border-gray-100 hover:bg-gray-50"}`}>
                    <td className={`py-3 px-4 text-sm ${isDarkMode ? "text-gray-300" : "text-gray-700"}`}>{fight.event_name || "-"}</td>
                    <td className={`py-3 px-4 text-sm ${isDarkMode ? "text-gray-400" : "text-gray-600"}`}>{fight.weight_category || "-"}</td>
                    <td className={`py-3 px-4 text-sm font-medium ${isDarkMode ? "text-white" : "text-gray-900"}`}>{fight.opponent || "-"}</td>
                    <td className="py-3 px-4 text-center">
                      {fight.is_winner === true ? (
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${isDarkMode ? "bg-green-900/30 text-green-400" : "bg-green-100 text-green-800"}`}>V</span>
                      ) : fight.is_winner === false ? (
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${isDarkMode ? "bg-red-900/30 text-red-400" : "bg-red-100 text-red-800"}`}>P</span>
                      ) : (
                        <span className={`text-xs ${isDarkMode ? "text-gray-500" : "text-gray-400"}`}>-</span>
                      )}
                    </td>
                    <td className={`py-3 px-4 text-center text-sm font-medium ${isDarkMode ? "text-purple-400" : "text-purple-600"}`}>{fight.victory_type || "-"}</td>
                    <td className={`py-3 px-4 text-center text-sm ${isDarkMode ? "text-gray-300" : "text-gray-700"}`}>
                      <span className={fight.is_winner ? "font-bold" : ""}>{fight.tp_self ?? "-"}</span>
                      <span className={isDarkMode ? "text-gray-500" : "text-gray-400"}> : </span>
                      <span>{fight.tp_opponent ?? "-"}</span>
                    </td>
                    <td className={`py-3 px-4 text-center text-sm ${isDarkMode ? "text-gray-300" : "text-gray-700"}`}>
                      <span className={fight.is_winner ? "font-bold" : ""}>{fight.cp_self ?? "-"}</span>
                      <span className={isDarkMode ? "text-gray-500" : "text-gray-400"}> : </span>
                      <span>{fight.cp_opponent ?? "-"}</span>
                    </td>
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
