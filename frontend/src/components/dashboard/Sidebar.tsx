interface UserData {
  id: string;
  username: string;
  first_name: string;
  last_name: string;
  email: string;
  role: string;
  created_at: string;
}

interface SidebarProps {
  activeSection: string
  setActiveSection: (section: string) => void
  isMobileMenuOpen: boolean
  setIsMobileMenuOpen: (open: boolean) => void
  isDarkMode: boolean
  toggleDarkMode: () => void
  onLogout: () => void
  userData: UserData | null
}

const menuItems = [
  {
    id: "home",
    label: "Prehľad",
    adminOnly: false,
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
      </svg>
    ),
  },
  {
    id: "tournaments",
    label: "Turnaje",
    adminOnly: false,
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
      </svg>
    ),
  },
  {
    id: "athletes",
    label: "Atléti",
    adminOnly: false,
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
      </svg>
    ),
  },
  {
    id: "stats",
    label: "Štatistiky",
    adminOnly: false,
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    ),
  },
  {
    id: "logs",
    label: "Logy",
    adminOnly: true,
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    ),
  },
]

export function Sidebar({
  activeSection,
  setActiveSection,
  isMobileMenuOpen,
  setIsMobileMenuOpen,
  isDarkMode,
  toggleDarkMode,
  onLogout,
  userData,
}: SidebarProps) {
  // Get first letter of first name for avatar
  const avatarLetter = userData?.first_name?.charAt(0).toUpperCase() || 'U';
  const displayName = userData ? `${userData.first_name} ${userData.last_name}` : 'User';
  const displayEmail = userData?.email || 'user@example.com';
  const isAdmin = userData?.role === 'admin';

  // Filter menu items based on admin role
  const filteredMenuItems = menuItems.filter(item => !item.adminOnly || isAdmin);

  return (
    <aside className={`
      fixed lg:relative inset-y-0 left-0 z-40
      flex flex-col w-64
      transform transition-all duration-300 ease-in-out
      ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      ${isDarkMode ? 'bg-[#1e293b] shadow-2xl shadow-black/30' : 'bg-white border-r border-gray-200'}
    `}>
      {/* Logo */}
      <div className={`p-6 ${isDarkMode ? 'border-b border-white/5' : 'border-b border-gray-200'}`}>
        <h1 className={`text-xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Wrestling Federation</h1>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1">
        {filteredMenuItems.map((item) => (
          <button
            key={item.id}
            onClick={() => {
              setActiveSection(item.id)
              setIsMobileMenuOpen(false)
            }}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all ${
              activeSection === item.id
                ? isDarkMode
                  ? "bg-blue-500/10 text-blue-400 shadow-lg shadow-blue-500/5"
                  : "bg-blue-50 text-blue-700"
                : isDarkMode
                  ? "text-slate-300 hover:bg-white/5"
                  : "text-gray-700 hover:bg-gray-100"
            }`}
          >
            {item.icon}
            <span>{item.label}</span>
          </button>
        ))}
      </nav>

      {/* User Section */}
      <div className={`p-4 ${isDarkMode ? 'border-t border-white/5' : 'border-t border-gray-200'}`}>
        {/* User info */}
        <div className="flex items-center gap-3 px-2">
          <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white font-semibold flex-shrink-0">
            {avatarLetter}
          </div>
          <div className="min-w-0">
            <p className={`text-sm font-medium truncate ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{displayName}</p>
            <p className={`text-xs truncate ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>{displayEmail}</p>
          </div>
        </div>

        {/* Actions row */}
        <div className="flex items-center gap-2 mt-6">
          <button
            onClick={onLogout}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-md text-sm font-medium transition-all ${
              isDarkMode
                ? 'bg-white/5 text-slate-300 hover:bg-white/10'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            Odhlásiť sa
          </button>
          <div className="flex-1" />
          <button
            onClick={toggleDarkMode}
            title={isDarkMode ? 'Svetlý režim' : 'Tmavý režim'}
            className={`flex-shrink-0 p-1.5 rounded-lg transition-colors ${
              isDarkMode ? 'text-yellow-400 hover:bg-white/5' : 'text-gray-400 hover:text-gray-700 hover:bg-gray-100'
            }`}
          >
            {isDarkMode ? (
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
              </svg>
            )}
          </button>
          <button
            onClick={() => { setActiveSection('settings'); setIsMobileMenuOpen(false) }}
            title="Nastavenia"
            className={`flex-shrink-0 p-1.5 rounded-lg transition-colors ${
              activeSection === 'settings'
                ? isDarkMode ? 'text-blue-400 bg-blue-500/10' : 'text-blue-600 bg-blue-50'
                : isDarkMode ? 'text-gray-400 hover:text-gray-200 hover:bg-white/5' : 'text-gray-400 hover:text-gray-700 hover:bg-gray-100'
            }`}
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </button>
        </div>
      </div>
    </aside>
  )
}
