import { useTranslation } from "react-i18next"

interface RightSidebarProps {
  isDarkMode: boolean
}

export function RightSidebar({ isDarkMode }: RightSidebarProps) {
  const { t } = useTranslation()
  return (
    <aside className={`hidden xl:block xl:w-[600px] overflow-y-auto ${isDarkMode ? 'bg-[#1e293b] shadow-2xl shadow-black/30' : 'bg-white border-l border-gray-200'}`}>
      <div className="p-8">
        <h3 className={`text-xl font-bold mb-6 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{t("rightSidebar.title")}</h3>

        <div className={`rounded-xl p-6 mb-6 ${isDarkMode ? 'bg-[#0f172a]/60 border border-white/10' : 'bg-gray-50 border border-gray-200'}`}>
          <div className="flex items-center gap-3 mb-4">
            <div className={`p-2.5 rounded-lg ${isDarkMode ? 'bg-orange-500/20' : 'bg-orange-100'}`}>
              <svg className="w-6 h-6 text-orange-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <div>
              <h4 className={`font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{t("rightSidebar.arenaTitle")}</h4>
              <p className={`text-xs ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>{t("rightSidebar.arenaSubtitle")}</p>
            </div>
          </div>

          <p className={`text-sm leading-relaxed mb-4 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            {t("rightSidebar.arenaDesc1")}
          </p>

          <p className={`text-sm leading-relaxed mb-5 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            {t("rightSidebar.arenaDesc2")}
          </p>

          <a
            href="https://github.com/unitedworldwrestling/arena-public"
            target="_blank"
            rel="noopener noreferrer"
            className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
              isDarkMode
                ? 'bg-white/10 text-white hover:bg-white/15 border border-white/10'
                : 'bg-gray-900 text-white hover:bg-gray-800'
            }`}
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
            </svg>
            {t("rightSidebar.arenaGithub")}
            <svg className="w-3.5 h-3.5 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
          </a>
        </div>

        <div className={`rounded-xl p-6 ${isDarkMode ? 'bg-[#0f172a]/60 border border-white/10' : 'bg-gray-50 border border-gray-200'}`}>
          <h4 className={`font-semibold mb-4 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{t("rightSidebar.howItWorksTitle")}</h4>
          <div className="space-y-4">
            {[
              { step: "1", title: t("rightSidebar.step1Title"), desc: t("rightSidebar.step1Desc") },
              { step: "2", title: t("rightSidebar.step2Title"), desc: t("rightSidebar.step2Desc") },
              { step: "3", title: t("rightSidebar.step3Title"), desc: t("rightSidebar.step3Desc") },
            ].map((item) => (
              <div key={item.step} className="flex gap-3">
                <div className={`flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                  isDarkMode ? 'bg-purple-500/20 text-purple-400' : 'bg-purple-100 text-purple-600'
                }`}>
                  {item.step}
                </div>
                <div>
                  <p className={`text-sm font-medium ${isDarkMode ? 'text-gray-200' : 'text-gray-800'}`}>{item.title}</p>
                  <p className={`text-xs mt-0.5 ${isDarkMode ? 'text-gray-500' : 'text-gray-500'}`}>{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </aside>
  )
}
