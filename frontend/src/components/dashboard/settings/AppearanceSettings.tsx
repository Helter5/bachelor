import { useTranslation } from 'react-i18next'

interface AppearanceSettingsProps {
  isDarkMode: boolean
  toggleDarkMode: () => void
}

function SectionCard({ isDarkMode, icon, title, description, children }: {
  isDarkMode: boolean
  icon: React.ReactNode
  title: string
  description?: string
  children: React.ReactNode
}) {
  return (
    <div className={`rounded-2xl ${isDarkMode ? 'bg-[#0f172a]/60 border border-white/8' : 'bg-white border border-gray-200 shadow-sm'}`}>
      <div className={`flex items-center gap-3 px-6 py-4 border-b ${isDarkMode ? 'border-white/6 bg-white/2' : 'border-gray-100 bg-gray-50'}`}>
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${isDarkMode ? 'bg-blue-500/20 text-blue-400' : 'bg-blue-100 text-blue-600'}`}>
          {icon}
        </div>
        <div>
          <p className={`text-sm font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{title}</p>
          {description && <p className={`text-xs mt-0.5 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>{description}</p>}
        </div>
      </div>
      <div className="px-6 py-5">
        {children}
      </div>
    </div>
  )
}

function ToggleRow({ isDarkMode, label, description, checked, onChange }: {
  isDarkMode: boolean
  label: string
  description?: string
  checked: boolean
  onChange: () => void
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div>
        <p className={`text-sm font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{label}</p>
        {description && <p className={`text-xs mt-0.5 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>{description}</p>}
      </div>
      <button
        onClick={onChange}
        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none ${
          checked ? 'bg-blue-600' : isDarkMode ? 'bg-white/15' : 'bg-gray-300'
        }`}
        role="switch"
        aria-checked={checked}
      >
        <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow transition duration-200 ${checked ? 'translate-x-5' : 'translate-x-0'}`} />
      </button>
    </div>
  )
}

const IconSun = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
  </svg>
)

const IconGlobe = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
  </svg>
)

const LANGUAGES = [
  { code: 'sk', labelKey: 'appearance.langSlovak', flag: '🇸🇰' },
  { code: 'en', labelKey: 'appearance.langEnglish', flag: '🇬🇧' },
]

export function AppearanceSettings({ isDarkMode, toggleDarkMode }: AppearanceSettingsProps) {
  const { t, i18n } = useTranslation()
  const currentLang = (i18n.resolvedLanguage || i18n.language || 'sk').toLowerCase().startsWith('sk') ? 'sk' : 'en'

  const switchLanguage = (code: string) => {
    if (code === currentLang) return
    i18n.changeLanguage(code)
    const segments = window.location.pathname.split('/').filter(Boolean)
    const first = segments[0]?.toLowerCase()
    const rest = first === 'sk' || first === 'en' ? segments.slice(1) : segments
    const path = `/${[code, ...rest].join('/')}`
    window.history.pushState({}, '', path === `/${code}` ? path : path.replace(/\/$/, ''))
  }

  return (
    <div className="space-y-5">
      {/* Theme */}
      <SectionCard
        isDarkMode={isDarkMode}
        icon={<IconSun />}
        title={t('appearance.themeTitle')}
        description={t('appearance.themeDesc')}
      >
        <ToggleRow
          isDarkMode={isDarkMode}
          label={t('appearance.darkMode')}
          description={t('appearance.darkModeDesc')}
          checked={isDarkMode}
          onChange={toggleDarkMode}
        />
      </SectionCard>

      {/* Language */}
      <SectionCard
        isDarkMode={isDarkMode}
        icon={<IconGlobe />}
        title={t('appearance.languageTitle')}
        description={t('appearance.languageDesc')}
      >
        <div className="flex flex-wrap gap-3">
          {LANGUAGES.map((lang) => {
            const active = currentLang === lang.code
            return (
              <button
                key={lang.code}
                onClick={() => switchLanguage(lang.code)}
                className={`flex items-center gap-2.5 px-4 py-3 rounded-xl border text-sm font-medium transition-all ${
                  active
                    ? isDarkMode
                      ? 'bg-blue-500/15 border-blue-500/30 text-blue-300'
                      : 'bg-blue-50 border-blue-300 text-blue-700'
                    : isDarkMode
                      ? 'bg-white/3 border-white/8 text-gray-400 hover:bg-white/6 hover:text-gray-200'
                      : 'bg-gray-50 border-gray-200 text-gray-500 hover:bg-gray-100 hover:text-gray-700'
                }`}
              >
                <span className="text-lg leading-none">{lang.flag}</span>
                <span>{t(lang.labelKey)}</span>
                {active && (
                  <svg className={`w-4 h-4 ml-1 ${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`} fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                )}
              </button>
            )
          })}
        </div>
      </SectionCard>
    </div>
  )
}
