interface DashboardBackButtonProps {
  isDarkMode: boolean
  label: string
  onClick: () => void
}

export function DashboardBackButton({ isDarkMode, label, onClick }: DashboardBackButtonProps) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
        isDarkMode
          ? "bg-[#1e293b] hover:bg-[#334155] text-gray-300 hover:text-white"
          : "bg-gray-100 hover:bg-gray-200 text-gray-700 hover:text-gray-900"
      }`}
    >
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
      </svg>
      {label}
    </button>
  )
}