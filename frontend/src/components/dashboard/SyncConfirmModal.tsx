import { Button } from "@/components/ui/button"

interface SyncConfirmModalProps {
  isOpen: boolean
  onConfirm: () => void
  onCancel: () => void
  lastSyncDate: string
  isDarkMode: boolean
}

export function SyncConfirmModal({
  isOpen,
  onConfirm,
  onCancel,
  lastSyncDate,
  isDarkMode,
}: SyncConfirmModalProps) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black bg-opacity-50 backdrop-blur-sm"
        onClick={onCancel}
      />

      {/* Modal Content */}
      <div className={`relative rounded-xl shadow-2xl max-w-md w-full p-6 animate-in zoom-in-95 ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`}>
        <div className="flex items-start gap-4 mb-6">
          <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
            <svg className="w-6 h-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div className="flex-1">
            <h3 className={`text-xl font-bold mb-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
              Potvrdiť synchronizáciu
            </h3>
            <p className={`mb-4 ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
              Chystáte sa synchronizovať údaje do databázy. Táto akcia aktualizuje všetky záznamy.
            </p>

            <div className={`rounded-lg p-4 mb-4 border ${isDarkMode ? 'bg-gray-700 border-gray-600' : 'bg-gray-50 border-gray-200'}`}>
              <div className="flex items-center gap-2 text-sm">
                <svg className={`w-4 h-4 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className={isDarkMode ? 'text-gray-300' : 'text-gray-600'}>Posledná synchronizácia:</span>
              </div>
              <p className={`font-semibold mt-1 ml-6 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                {lastSyncDate}
              </p>
            </div>

            <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
              Chcete pokračovať so synchronizáciou?
            </p>
          </div>
        </div>

        <div className="flex gap-3 justify-end">
          <Button
            onClick={onCancel}
            className="bg-red-600 hover:bg-red-700 text-white"
          >
            Nie, zrušiť
          </Button>
          <Button
            onClick={onConfirm}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            Áno, synchronizovať
          </Button>
        </div>
      </div>
    </div>
  )
}
