import { useEffect, useState, useRef } from "react"
import { useTranslation } from "react-i18next"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { apiClient, ApiError } from "@/services/apiClient"
import { API_ENDPOINTS } from "@/config/api"

interface ResetPasswordProps {
  token: string | null
  onBackToLogin: () => void
}

export function ResetPassword({ token, onBackToLogin }: ResetPasswordProps) {
  const { t } = useTranslation()
  const [status, setStatus] = useState<"loading" | "form" | "success" | "error">("loading")
  const [message, setMessage] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const hasVerified = useRef(false)

  useEffect(() => {
    if (!token) {
      setStatus("error")
      setMessage(t("resetPassword.invalidLink"))
      return
    }

    if (hasVerified.current) return
    hasVerified.current = true

    const verifyToken = async () => {
      try {
        await apiClient.get<{ valid: boolean }>(
          API_ENDPOINTS.AUTH_RESET_PASSWORD(token),
          { requireAuth: false }
        )
        setStatus("form")
      } catch (error) {
        setStatus("error")
        if (error instanceof ApiError) {
          setMessage(error.message || t("resetPassword.invalidToken"))
        } else {
          setMessage(t("resetPassword.resetError"))
        }
      }
    }

    verifyToken()
  }, [token, t])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (newPassword !== confirmPassword) {
      setMessage(t("resetPassword.passwordMismatch") || "Passwords do not match")
      return
    }
    setSubmitting(true)
    setMessage("")
    try {
      await apiClient.post<{ message: string }>(
        API_ENDPOINTS.AUTH_SET_PASSWORD,
        { token, new_password: newPassword },
        { requireAuth: false }
      )
      setStatus("success")
    } catch (error) {
      if (error instanceof ApiError) {
        setMessage(error.message || t("resetPassword.invalidToken"))
      } else {
        setMessage(t("resetPassword.resetError"))
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#0f172a] flex items-center justify-center p-8">
      <div className="w-full max-w-md">
        <Card className="border-white/10 bg-[#1e293b]/80 backdrop-blur-xl shadow-2xl shadow-blue-500/10">
          <CardContent className="pt-8 pb-8">
            {status === "loading" && (
              <div className="text-center">
                <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                <h2 className="text-2xl font-bold text-white mb-2">{t("resetPassword.loading")}</h2>
                <p className="text-gray-400">{t("resetPassword.pleaseWait")}</p>
              </div>
            )}

            {status === "form" && (
              <div>
                <h2 className="text-2xl font-bold text-white mb-2 text-center">{t("resetPassword.setNewPassword") || "Set New Password"}</h2>
                <form onSubmit={handleSubmit} className="mt-6 space-y-4">
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">{t("resetPassword.newPassword") || "New Password"}</label>
                    <input
                      type="password"
                      value={newPassword}
                      onChange={e => setNewPassword(e.target.value)}
                      required
                      minLength={6}
                      className="w-full px-3 py-2 bg-[#0f172a] border border-white/10 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">{t("resetPassword.confirmPassword") || "Confirm Password"}</label>
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={e => setConfirmPassword(e.target.value)}
                      required
                      minLength={6}
                      className="w-full px-3 py-2 bg-[#0f172a] border border-white/10 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  {message && <p className="text-red-400 text-sm">{message}</p>}
                  <Button type="submit" disabled={submitting} className="w-full bg-blue-600 hover:bg-blue-700 text-white">
                    {submitting ? (t("resetPassword.pleaseWait") || "Please wait...") : (t("resetPassword.submit") || "Set Password")}
                  </Button>
                </form>
              </div>
            )}

            {status === "success" && (
              <div className="text-center">
                <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h2 className="text-2xl font-bold text-white mb-2">{t("resetPassword.successTitle")}</h2>
                <p className="text-gray-400 mb-6">{t("resetPassword.successDesc") || "Your password has been updated. You can now log in."}</p>
                <Button onClick={onBackToLogin} className="w-full bg-blue-600 hover:bg-blue-700 text-white">
                  {t("resetPassword.backToLogin")}
                </Button>
              </div>
            )}

            {status === "error" && (
              <div className="text-center">
                <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </div>
                <h2 className="text-2xl font-bold text-white mb-2">{t("resetPassword.errorTitle")}</h2>
                <p className="text-gray-400 mb-6">{message}</p>
                <Button onClick={onBackToLogin} className="w-full bg-blue-600 hover:bg-blue-700 text-white">
                  {t("resetPassword.backToLoginError")}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
