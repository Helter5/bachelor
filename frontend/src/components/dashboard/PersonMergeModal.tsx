import { useState } from "react"
import { Button } from "@/components/ui/button"
import { apiClient } from "@/services/apiClient"
import { API_ENDPOINTS } from "@/config/api"
import { CountryFlag } from "./CountryFlag"

interface PersonForMerge {
  id: number
  full_name: string
  country_iso_code: string | null
}

interface PersonMergeModalProps {
  isOpen: boolean
  onClose: () => void
  onMerged: () => void
  persons: PersonForMerge[]
  isDarkMode: boolean
}

export function PersonMergeModal({
  isOpen,
  onClose,
  onMerged,
  persons,
  isDarkMode,
}: PersonMergeModalProps) {
  const [targetId, setTargetId] = useState<number | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!isOpen) return null

  const handleMerge = async () => {
    if (!targetId) return

    const sourceIds = persons.filter(p => p.id !== targetId).map(p => p.id)

    try {
      setLoading(true)
      setError(null)
      await apiClient.post(API_ENDPOINTS.ADMIN_PERSONS_MERGE, {
        target_person_id: targetId,
        source_person_ids: sourceIds,
      })
      onMerged()
      onClose()
    } catch (err) {
      console.error("Merge failed:", err)
      setError(err instanceof Error ? err.message : "Zlúčenie zlyhalo")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black bg-opacity-50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal Content */}
      <div className={`relative rounded-xl shadow-2xl max-w-lg w-full p-6 animate-in zoom-in-95 ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`}>
        <div className="flex items-start gap-4 mb-6">
          <div className="w-12 h-12 rounded-full bg-orange-100 flex items-center justify-center flex-shrink-0">
            <svg className="w-6 h-6 text-orange-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          </div>
          <div className="flex-1">
            <h3 className={`text-xl font-bold mb-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
              Zlúčiť osoby
            </h3>
            <p className={`mb-4 text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
              Vyberte primárnu osobu, ktorej meno a krajina sa zachovajú. Ostatné záznamy budú zlúčené a odstránené.
            </p>
          </div>
        </div>

        {/* Person list with radio buttons */}
        <div className={`rounded-lg border mb-4 divide-y ${
          isDarkMode ? 'border-gray-600 divide-gray-600' : 'border-gray-200 divide-gray-200'
        }`}>
          {persons.map((person) => (
            <label
              key={person.id}
              className={`flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors ${
                targetId === person.id
                  ? isDarkMode ? 'bg-blue-500/10' : 'bg-blue-50'
                  : isDarkMode ? 'hover:bg-white/5' : 'hover:bg-gray-50'
              }`}
            >
              <input
                type="radio"
                name="targetPerson"
                checked={targetId === person.id}
                onChange={() => setTargetId(person.id)}
                className="w-4 h-4 text-blue-600"
              />
              <div className="flex-1 min-w-0">
                <span className={`text-sm font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                  {person.full_name}
                </span>
              </div>
              {person.country_iso_code ? (
                <span className="flex items-center gap-1.5 flex-shrink-0">
                  <CountryFlag code={person.country_iso_code} />
                  <span className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                    {person.country_iso_code}
                  </span>
                </span>
              ) : (
                <span className={`text-xs ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>-</span>
              )}
              {targetId === person.id && (
                <span className="text-xs font-medium text-blue-500 flex-shrink-0">Primárna</span>
              )}
            </label>
          ))}
        </div>

        {error && (
          <div className={`rounded-lg p-3 mb-4 text-sm ${isDarkMode ? 'bg-red-500/10 text-red-400' : 'bg-red-50 text-red-700'}`}>
            {error}
          </div>
        )}

        <div className="flex gap-3 justify-end">
          <Button
            onClick={onClose}
            disabled={loading}
            className={isDarkMode ? 'bg-gray-700 hover:bg-gray-600 text-white' : 'bg-gray-200 hover:bg-gray-300 text-gray-800'}
          >
            Zrušiť
          </Button>
          <Button
            onClick={handleMerge}
            disabled={!targetId || loading}
            className="bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Zlučujem...' : 'Zlúčiť'}
          </Button>
        </div>
      </div>
    </div>
  )
}
