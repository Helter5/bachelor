import { useState, useEffect, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { apiClient } from '@/services/apiClient'
import { API_ENDPOINTS } from '@/config/api'
import { ProfileSettings } from './settings/ProfileSettings'
import { ArenaSourcesSettings } from './settings/ArenaSourcesSettings'
import { SecuritySettings } from './settings/SecuritySettings'
import { AppearanceSettings } from './settings/AppearanceSettings'
import { mapApiUserDto, type ApiUserDto, type AppUser } from '@/domain/user'

interface SettingsProps {
  isDarkMode: boolean
  toggleDarkMode: () => void
  onUserDataChange: (user: AppUser) => void
}

type TabType = 'profile' | 'appearance' | 'arena-sources' | 'security'

const IconUser = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
  </svg>
)
const IconPalette = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
  </svg>
)
const IconServer = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01" />
  </svg>
)
const IconShield = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
  </svg>
)

export function Settings({ isDarkMode, toggleDarkMode, onUserDataChange }: SettingsProps) {
  const { t } = useTranslation()
  const [activeTab, setActiveTab] = useState<TabType>('profile')
  const [user, setUser] = useState<AppUser | null>(null)

  const loadUser = useCallback(async () => {
    try {
      const data = await apiClient.get<ApiUserDto>(API_ENDPOINTS.PROFILE_ME)
      setUser(mapApiUserDto(data))
    } catch (err) {
      console.error('Error loading user:', err)
    }
  }, [])

  useEffect(() => {
    loadUser()
  }, [loadUser])

  const handleUserUpdated = useCallback((updatedUser: AppUser) => {
    setUser((prev) => ({
      ...updatedUser,
      created_at: updatedUser.created_at ?? prev?.created_at ?? new Date().toISOString(),
    }))

    onUserDataChange(updatedUser)
  }, [onUserDataChange])

  const isAdmin = user?.role === 'admin'

  const tabs = [
    { id: 'profile' as TabType, label: t("settings.tabs.profile"), icon: <IconUser />, adminOnly: false },
    { id: 'appearance' as TabType, label: t("settings.tabs.appearance"), icon: <IconPalette />, adminOnly: false },
    { id: 'arena-sources' as TabType, label: t("settings.tabs.arenaSources"), icon: <IconServer />, adminOnly: true },
    { id: 'security' as TabType, label: t("settings.tabs.security"), icon: <IconShield />, adminOnly: false },
  ].filter(tab => !tab.adminOnly || isAdmin)

  return (
    <div className="max-w-6xl mx-auto">
      <h2 className={`text-2xl md:text-3xl font-bold mb-6 md:mb-8 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
        {t("settings.title")}
      </h2>

      <div className="flex flex-col md:flex-row gap-4 md:gap-8">
        {/* Nav – horizontal scrollable on mobile, vertical sidebar on md+ */}
        <nav className="md:w-56 md:shrink-0">
          <ul className="grid grid-cols-2 md:flex md:flex-col gap-1 pb-1 md:pb-0">
            {tabs.map((tab) => {
              const active = activeTab === tab.id
              return (
                <li key={tab.id}>
                  <button
                    onClick={() => setActiveTab(tab.id)}
                    className={`w-full flex items-center gap-2 md:gap-3 px-3 md:px-4 py-2.5 md:py-3 rounded-xl text-sm font-medium transition-all whitespace-nowrap ${
                      active
                        ? isDarkMode
                          ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                          : 'bg-blue-50 text-blue-700 border border-blue-200'
                        : isDarkMode
                          ? 'text-gray-400 hover:text-gray-200 hover:bg-white/5'
                          : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    <span className={active ? (isDarkMode ? 'text-blue-400' : 'text-blue-600') : ''}>{tab.icon}</span>
                    {tab.label}
                  </button>
                </li>
              )
            })}
          </ul>
        </nav>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {activeTab === 'profile' && (
            <ProfileSettings
              isDarkMode={isDarkMode}
              onUserUpdated={handleUserUpdated}
            />
          )}
          {activeTab === 'appearance' && <AppearanceSettings isDarkMode={isDarkMode} toggleDarkMode={toggleDarkMode} />}
          {activeTab === 'arena-sources' && isAdmin && <ArenaSourcesSettings isDarkMode={isDarkMode} />}
          {activeTab === 'security' && <SecuritySettings isDarkMode={isDarkMode} />}
        </div>
      </div>
    </div>
  )
}
