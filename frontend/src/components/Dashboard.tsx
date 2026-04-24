import { useTranslation } from "react-i18next"
import { Sidebar } from "./dashboard/Sidebar"
import { SyncConfirmModal } from "./dashboard/SyncConfirmModal"
import { Toast } from "./ui/Toast"
import { DashboardStats } from "./dashboard/DashboardStats"
import { CalendarSection } from "./dashboard/CalendarSection"
import { RightSidebar } from "./dashboard/RightSidebar"
import { TournamentsList } from "./dashboard/TournamentsList"
import { TournamentDetail } from "./dashboard/TournamentDetail"
import { FightersList } from "./dashboard/FightersList"
import { WrestlerProfile } from "./dashboard/WrestlerProfile"
import { AthletesList } from "./dashboard/AthletesList"
import { Settings } from "./dashboard/Settings"
import { SyncLogs } from "./dashboard/settings/SyncLogs"
import { useSync } from "@/hooks/useSync"
import { useDarkMode } from "@/hooks/useDarkMode"
import { useDashboardState } from "@/hooks/useDashboardState"
import type { AppUser } from "@/domain/user"

interface DashboardProps {
  onLogout: () => void;
  userData: AppUser | null;
  onUserDataChange: (userData: AppUser) => void;
}

export function Dashboard({ onLogout, userData, onUserDataChange }: DashboardProps) {
  const { t } = useTranslation()
  const isAdmin = userData?.role === 'admin'
  // Custom hooks for state management
  const { syncState, handleSyncClick, confirmSync, cancelSync, dismissError } = useSync()
  const { isDarkMode, toggleDarkMode } = useDarkMode()
  const {
    state: dashboardState,
    setActiveSection,
    selectTournament,
    clearTournamentSelection,
    selectPerson,
    clearPersonSelection,
    toggleMobileMenu,
    closeMobileMenu,
    toggleDetailsMobile,
  } = useDashboardState(isAdmin)

  return (
    <div className={`flex h-screen ${isDarkMode ? 'bg-[#0f172a]' : 'bg-gray-50'}`}>
      {/* Sync Confirm Modal */}
      <SyncConfirmModal
        isOpen={syncState.showConfirm}
        onConfirm={confirmSync}
        onCancel={cancelSync}
        lastSyncDate={syncState.lastSyncDate}
        isDarkMode={isDarkMode}
      />

      {/* Sync Toast Notifications */}
      <Toast
        show={syncState.showSuccess}
        variant="success"
        title={t("dashboard.toast.syncSuccess")}
        message={t("dashboard.toast.syncSuccessMsg")}
      />
      <Toast
        show={syncState.showError}
        variant="error"
        title={t("dashboard.toast.syncError")}
        message={syncState.errorMessage}
        onClose={dismissError}
      />

      {/* Mobile Header */}
      <div className={`lg:hidden fixed top-0 left-0 right-0 z-50 ${isDarkMode ? 'bg-[#1e293b] shadow-lg shadow-black/20' : 'bg-white border-b border-gray-200'}`}>
        <div className="flex items-center justify-between p-4">
          <h1 className={`text-lg font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Wrestling Federation</h1>
          <button
            onClick={toggleMobileMenu}
            className="p-2 rounded-lg hover:bg-gray-100"
            aria-label="Toggle menu"
          >
            <svg className="w-6 h-6 text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              {dashboardState.isMobileMenuOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>
      </div>

      {/* Sidebar */}
      <Sidebar
        activeSection={dashboardState.activeSection}
        setActiveSection={setActiveSection}
        isMobileMenuOpen={dashboardState.isMobileMenuOpen}
        setIsMobileMenuOpen={closeMobileMenu}
        isDarkMode={isDarkMode}
        onLogout={onLogout}
        userData={userData}
      />

      {/* Mobile Menu Overlay */}
      {dashboardState.isMobileMenuOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black bg-opacity-50 z-30"
          onClick={closeMobileMenu}
        />
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden flex-col lg:flex-row">
        {/* Center Content */}
        <main className="flex-1 overflow-auto pt-16 lg:pt-0">
          <div className="p-4 md:p-8">
            {/* Conditional rendering based on active section */}
            {dashboardState.activeSection === 'calendar' ? (
              <CalendarSection isDarkMode={isDarkMode} />
            ) : dashboardState.activeSection === 'tournaments' ? (
              dashboardState.selectedPerson ? (
                <WrestlerProfile
                  isDarkMode={isDarkMode}
                  personId={dashboardState.selectedPerson.id}
                  onBack={clearPersonSelection}
                />
              ) : dashboardState.selectedTournament ? (
                <TournamentDetail
                  isDarkMode={isDarkMode}
                  tournamentId={dashboardState.selectedTournament.id}
                  tournamentUuid={String(dashboardState.selectedTournament.id)}
                  tournamentName={dashboardState.selectedTournament.name}
                  tournamentStartDate={dashboardState.selectedTournament.start_date}
                  tournamentEndDate={dashboardState.selectedTournament.end_date}
                  onBack={clearTournamentSelection}
                  onSelectPerson={(id, name) => selectPerson({ id, name })}
                />
              ) : (
                <TournamentsList
                  isDarkMode={isDarkMode}
                  onSelectTournament={selectTournament}
                />
              )
            ) : dashboardState.activeSection === 'stats' ? (
              dashboardState.selectedPerson ? (
                <WrestlerProfile
                  isDarkMode={isDarkMode}
                  personId={dashboardState.selectedPerson.id}
                  onBack={clearPersonSelection}
                />
              ) : (
                <DashboardStats isDarkMode={isDarkMode} onSelectPerson={selectPerson} />
              )
            ) : dashboardState.activeSection === 'athletes' ? (
              dashboardState.selectedPerson ? (
                <WrestlerProfile
                  isDarkMode={isDarkMode}
                  personId={dashboardState.selectedPerson.id}
                  onBack={clearPersonSelection}
                />
              ) : (
                <AthletesList isDarkMode={isDarkMode} onSelectPerson={selectPerson} />
              )
            ) : dashboardState.activeSection === 'fighters' ? (
              <FightersList isDarkMode={isDarkMode} />
            ) : dashboardState.activeSection === 'settings' ? (
              <Settings isDarkMode={isDarkMode} toggleDarkMode={toggleDarkMode} onUserDataChange={onUserDataChange} />
            ) : dashboardState.activeSection === 'logs' ? (
              <div>
                <h2 className={`text-3xl font-bold mb-6 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                  {t("dashboard.logs")}
                </h2>
                <SyncLogs isDarkMode={isDarkMode} />
              </div>
            ) : (
              <>
                {/* Header */}
                <div className="mb-8">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
                    <div>
                      <h2 className={`text-3xl font-bold mb-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{t("dashboard.title")}</h2>
                      <p className={isDarkMode ? 'text-gray-300' : 'text-gray-600'}>{t("dashboard.welcome")}</p>
                    </div>

                    {/* Sync Button — admin only */}
                    {isAdmin && (
                      <div className="flex items-center gap-3">
                        <div className="flex flex-col items-end gap-2">
                          {syncState.isSyncing && (
                            <div className={`w-full min-w-[260px] rounded-lg border px-3 py-2 ${isDarkMode ? 'border-blue-500/30 bg-blue-500/10' : 'border-blue-200 bg-blue-50'}`}>
                              <div className="flex items-center justify-between gap-3 mb-1.5">
                                <span className={`text-xs font-medium ${isDarkMode ? 'text-blue-200' : 'text-blue-700'}`}>
                                  {t("dashboard.syncing")}
                                </span>
                                <span className={`text-xs font-semibold ${isDarkMode ? 'text-blue-100' : 'text-blue-800'}`}>
                                  {syncState.progressPercent}%
                                </span>
                              </div>
                              <div className={`h-2 rounded-full overflow-hidden ${isDarkMode ? 'bg-blue-950/60' : 'bg-blue-100'}`}>
                                <div
                                  className="h-full bg-blue-600 transition-all duration-300"
                                  style={{ width: `${Math.max(0, Math.min(100, syncState.progressPercent))}%` }}
                                />
                              </div>
                              <div className={`mt-1.5 flex items-center justify-between text-[11px] ${isDarkMode ? 'text-blue-200/85' : 'text-blue-700/90'}`}>
                                <span>{t("dashboard.syncStep", { step: syncState.currentStep || t("dashboard.syncStepUnknown") })}</span>
                                <span>{t("dashboard.syncBy", { name: syncState.initiatedBy || t("syncLogs.unknownUser") })}</span>
                              </div>
                            </div>
                          )}
                          <button
                            onClick={handleSyncClick}
                            disabled={syncState.isSyncing}
                            className={`
                              flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all
                              ${syncState.isSyncing
                                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                : 'bg-blue-600 text-white hover:bg-blue-700 active:scale-95'
                              }
                            `}
                            title={t("dashboard.syncTooltip")}
                            aria-label={t("dashboard.syncAriaLabel")}
                          >
                            <svg
                              className={`w-5 h-5 ${syncState.isSyncing ? 'animate-spin' : ''}`}
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                              />
                            </svg>
                            <span className="hidden sm:inline">
                              {syncState.isSyncing ? t("dashboard.syncButtonActive") : t("dashboard.syncButton")}
                            </span>
                          </button>
                          {syncState.lastSyncDate && (
                            <span className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                              {t("dashboard.lastSync", { date: syncState.lastSyncDate })}
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Mobile Details Button */}
                <button
                  onClick={toggleDetailsMobile}
                  className="xl:hidden w-full mb-6 p-4 bg-white rounded-lg border border-gray-200 flex items-center justify-between hover:bg-gray-50 transition-colors"
                  aria-expanded={dashboardState.showDetailsMobile}
                  aria-label={t("dashboard.showDetails")}
                >
                  <span className="font-medium text-gray-900">{t("dashboard.showDetails")}</span>
                  <svg
                    className={`w-5 h-5 text-gray-600 transition-transform ${dashboardState.showDetailsMobile ? 'rotate-180' : ''}`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {/* Mobile Details Section */}
                {dashboardState.showDetailsMobile && (
                  <div className="xl:hidden mb-6">
                    <RightSidebar isDarkMode={isDarkMode} />
                  </div>
                )}

              </>
            )}
          </div>
        </main>

        {/* Right Sidebar - Desktop only */}
        {dashboardState.activeSection === 'home' && (
          <RightSidebar isDarkMode={isDarkMode} />
        )}
      </div>
    </div>
  );
}
