import { useState, useEffect } from "react"
import { LandingPage } from "@/components/LandingPage"
import { Dashboard } from "@/components/Dashboard"
import { VerifyEmail } from "@/components/VerifyEmail"
import { ResetPassword } from "@/components/ResetPassword"
import { apiClient, ApiError } from "@/services/apiClient"
import { API_ENDPOINTS } from "@/config/api"

interface UserData {
  id: string;
  username: string;
  first_name: string;
  last_name: string;
  email: string;
  created_at: string;
}

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState<"landing" | "verify" | "reset" | "dashboard">("landing");

  // Fetch user data from API
  const fetchUserData = async () => {
    try {
      const data = await apiClient.get<UserData>(API_ENDPOINTS.AUTH_ME);
      setUserData(data);
      setIsLoggedIn(true);
    } catch (error) {
      // Token is invalid, clear CSRF token from sessionStorage
      if (error instanceof ApiError && error.status === 401) {
        sessionStorage.removeItem("csrf_token");
        // 401 is expected when not logged in, don't log it as error
      } else {
        // Log only unexpected errors (not 401)
        console.error("Error fetching user data:", error);
      }
      setIsLoggedIn(false);
    } finally {
      setIsLoading(false);
    }
  };

  // Check if user is already logged in on component mount
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get("token");
    const path = window.location.pathname;

    // Check for verify-email page
    if (path.includes("verify-email") && token) {
      setCurrentPage("verify");
      setIsLoading(false);
      return;
    }

    // Check for reset-password page
    if (path.includes("reset-password") && token) {
      setCurrentPage("reset");
      setIsLoading(false);
      return;
    }

    // Cookies are HttpOnly and sent automatically
    // Just try to fetch user data - if cookies exist, it will work
    fetchUserData();
  }, []);

  const handleLogin = async () => {
    // Cookies are set by server, just fetch user data
    await fetchUserData();
    setCurrentPage("dashboard");
  };

  const handleBackToLogin = () => {
    // Clear URL params and go back to landing
    window.history.replaceState({}, "", "/");
    setCurrentPage("landing");
  };

  const handleLogout = async () => {
    try {
      // Call logout endpoint to clear cookies on server
      await apiClient.post(API_ENDPOINTS.AUTH_LOGOUT, {});
    } catch (error) {
      console.error("Logout error:", error);
    } finally {
      // Clear CSRF token from sessionStorage
      sessionStorage.removeItem("csrf_token");
      setUserData(null);
      setIsLoggedIn(false);
      // Clear URL query params (e.g. ?section=logs)
      window.history.replaceState({}, "", "/");
    }
  };

  // Show loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0f172a] flex items-center justify-center">
        <div className="text-white">Načítavam...</div>
      </div>
    );
  }

  // Render verify email page
  if (currentPage === "verify") {
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get("token");
    return <VerifyEmail token={token} onBackToLogin={handleBackToLogin} />;
  }

  // Render reset password page
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
        <Dashboard onLogout={handleLogout} userData={userData} />
      )}
    </>
  );
}

export default App
