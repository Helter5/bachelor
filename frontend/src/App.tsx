import { useState, useEffect, useCallback } from "react"
import { LandingPage } from "@/components/LandingPage"
import { Dashboard } from "@/components/Dashboard"
import { VerifyEmail } from "@/components/VerifyEmail"
import { ResetPassword } from "@/components/ResetPassword"
import { apiClient, ApiError } from "@/services/apiClient"
import { clearAuthSessionHint, hasAuthSessionHint, setAuthSessionHint } from "@/services/authSession"
import { API_ENDPOINTS } from "@/config/api"
import { mapApiUserDto, type ApiUserDto, type AppUser } from "@/domain/user"

const SUPPORTED_LOCALES = new Set(["sk", "en"])

function getPreferredLocale() {
  const stored = localStorage.getItem("i18n_lang")?.toLowerCase()
  if (stored && SUPPORTED_LOCALES.has(stored)) return stored

  const browser = navigator.language?.toLowerCase().split("-")[0]
  return browser && SUPPORTED_LOCALES.has(browser) ? browser : "sk"
}

function ensureLocalePrefixInPath() {
  const pathname = window.location.pathname
  const segments = pathname.split("/").filter(Boolean)
  const firstSegment = segments[0]?.toLowerCase()

  if (firstSegment && SUPPORTED_LOCALES.has(firstSegment)) {
    return
  }

  const locale = getPreferredLocale()
  const nextPath = `/${[locale, ...segments].join("/")}`
  const query = window.location.search || ""
  const hash = window.location.hash || ""
  window.history.replaceState({}, "", `${nextPath}${query}${hash}`)
}

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userData, setUserData] = useState<AppUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState<"landing" | "verify" | "reset" | "dashboard">("landing");

  const fetchUserData = async () => {
    try {
      const data = await apiClient.get<ApiUserDto>(API_ENDPOINTS.AUTH_ME);
      setUserData(mapApiUserDto(data));
      setIsLoggedIn(true);
      setAuthSessionHint();
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        sessionStorage.removeItem("csrf_token");
        clearAuthSessionHint();
      } else {
        console.error("Error fetching user data:", error);
      }
      setIsLoggedIn(false);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    ensureLocalePrefixInPath();

    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get("token");
    const path = window.location.pathname;

    if (path.includes("verify-email") && token) {
      setCurrentPage("verify");
      setIsLoading(false);
      return;
    }

    if (path.includes("reset-password") && token) {
      setCurrentPage("reset");
      setIsLoading(false);
      return;
    }

    // Avoid a visible 401 on first visit; HttpOnly auth cookies cannot be probed directly.
    if (!hasAuthSessionHint()) {
      setIsLoading(false);
      return;
    }

    fetchUserData();
  }, []);

  const handleLogin = async () => {
    await fetchUserData();
    setCurrentPage("dashboard");
  };

  const handleBackToLogin = () => {
    const locale = getPreferredLocale();
    window.history.replaceState({}, "", `/${locale}`);
    setCurrentPage("landing");
  };

  const handleLogout = async () => {
    try {
      await apiClient.post(API_ENDPOINTS.AUTH_LOGOUT, {});
    } catch (error) {
      console.error("Logout error:", error);
    } finally {
      sessionStorage.removeItem("csrf_token");
      clearAuthSessionHint();
      setUserData(null);
      setIsLoggedIn(false);
      const locale = getPreferredLocale();
      window.history.replaceState({}, "", `/${locale}`);
    }
  };

  const handleUserDataChange = useCallback((updatedUser: AppUser) => {
    setUserData(updatedUser)
  }, [])

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0f172a] flex items-center justify-center">
        <div className="text-white">Načítavam...</div>
      </div>
    );
  }

  if (currentPage === "verify") {
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get("token");
    return <VerifyEmail token={token} onBackToLogin={handleBackToLogin} />;
  }

  if (currentPage === "reset") {
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get("token");
    return <ResetPassword token={token} onBackToLogin={handleBackToLogin} />;
  }

  return (
    <>
      {!isLoggedIn ? (
        <LandingPage onLogin={handleLogin} />
      ) : (
        <Dashboard onLogout={handleLogout} userData={userData} onUserDataChange={handleUserDataChange} />
      )}
    </>
  );
}

export default App
