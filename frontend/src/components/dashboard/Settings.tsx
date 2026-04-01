import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { apiClient } from '@/services/apiClient'
import { API_ENDPOINTS } from '@/config/api'
import { ProfileSettings } from './settings/ProfileSettings'
import { ArenaSourcesSettings } from './settings/ArenaSourcesSettings'
import { SecuritySettings } from './settings/SecuritySettings'

interface User {
  id: number
  username: string
  role: string
}

interface SettingsProps {
  isDarkMode: boolean
  toggleDarkMode: () => void
}

type TabType = 'profile' | 'arena-sources' | 'security'

export function Settings({ isDarkMode }: SettingsProps) {
  const { t } = useTranslation()
  const [activeTab, setActiveTab] = useState<TabType>('profile')
  const [user, setUser] = useState<User | null>(null)

  useEffect(() => {
    loadUser()
  }, [])

  const loadUser = async () => {
    try {
      const data = await apiClient.get<User>(API_ENDPOINTS.PROFILE_ME)
      setUser(data)
    } catch (err) {
      console.error('Error loading user:', err)
    }
  }

  const isAdmin = user?.role === 'admin'

  const tabs = [
    { id: 'profile' as TabType, label: t("settings.tabs.profile"), adminOnly: false },
    { id: 'arena-sources' as TabType, label: t("settings.tabs.arenaSources"), adminOnly: true },
    { id: 'security' as TabType, label: t("settings.tabs.security"), adminOnly: false },
  ].filter(tab => !tab.adminOnly || isAdmin)

  return (
    <div className="max-w-6xl mx-auto">
      <h2 className={`text-3xl font-bold mb-6 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
        {t("settings.title")}
      </h2>

      {/* Tabs */}
      <div className="mb-6">
        <div className="flex space-x-8">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`py-3 px-1 font-medium transition-colors ${
                activeTab === tab.id
                  ? isDarkMode
                    ? 'text-blue-400'
                    : 'text-blue-600'
                  : isDarkMode
                  ? 'text-gray-400 hover:text-gray-300'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      <div>
        {activeTab === 'profile' && <ProfileSettings isDarkMode={isDarkMode} />}
        {activeTab === 'arena-sources' && isAdmin && <ArenaSourcesSettings isDarkMode={isDarkMode} />}
        {activeTab === 'security' && <SecuritySettings isDarkMode={isDarkMode} />}
      </div>
    </div>
  )
}
