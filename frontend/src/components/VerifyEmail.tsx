import { useEffect, useState, useRef } from "react"
import { useTranslation } from "react-i18next"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { apiClient, ApiError } from "@/services/apiClient"
import { API_ENDPOINTS } from "@/config/api"

interface VerifyEmailProps {
  token: string | null
  onBackToLogin: () => void
}

export function VerifyEmail({ token, onBackToLogin }: VerifyEmailProps) {
  const { t } = useTranslation()
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading")
  const [message, setMessage] = useState("")
  const hasVerified = useRef(false) // Prevent double verification in React Strict Mode

  useEffect(() => {
    if (!token) {
      setStatus("error")
      setMessage(t("verifyEmail.invalidLink"))
      return
    }

    // Prevent double API call in React 18 Strict Mode (development)
    if (hasVerified.current) {
      return
    }
    hasVerified.current = true

    const verifyEmail = async () => {
      try {
        const response = await apiClient.get<{ message: string }>(
          API_ENDPOINTS.AUTH_VERIFY_EMAIL(token),
          { requireAuth: false }
        )
        setStatus("success")
        setMessage(response.message)
      } catch (error) {
        console.error("Verification error:", error)
        setStatus("error")
        if (error instanceof ApiError) {
          setMessage(error.message || t("verifyEmail.invalidToken"))
        } else {
          setMessage(t("verifyEmail.verifyError"))
        }
      }
    }

    verifyEmail()
  }, [token, t])

  return (
    <div className="min-h-screen bg-[#0f172a] flex items-center justify-center p-8">
      <div className="w-full max-w-md">
        <Card className="border-white/10 bg-[#1e293b]/80 backdrop-blur-xl shadow-2xl shadow-blue-500/10">
          <CardContent className="pt-8 pb-8">
            {status === "loading" && (
              <div className="text-center">
                <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                <h2 className="text-2xl font-bold text-white mb-2">{t("verifyEmail.loading")}</h2>
                <p className="text-gray-400">{t("verifyEmail.pleaseWait")}</p>
              </div>
            )}

            {status === "success" && (
              <div className="text-center">
                <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg
                    className="w-8 h-8 text-green-500"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                </div>
                <h2 className="text-2xl font-bold text-white mb-2">{t("verifyEmail.successTitle")}</h2>
                <p className="text-gray-400 mb-6">{message}</p>
                <Button
                  onClick={onBackToLogin}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                >
                  {t("verifyEmail.backToLogin")}
                </Button>
              </div>
            )}

            {status === "error" && (
              <div className="text-center">
                <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg
                    className="w-8 h-8 text-red-500"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </div>
                <h2 className="text-2xl font-bold text-white mb-2">{t("verifyEmail.errorTitle")}</h2>
                <p className="text-gray-400 mb-6">{message}</p>
                <Button
                  onClick={onBackToLogin}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                >
                  {t("verifyEmail.backToLoginError")}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
