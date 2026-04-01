import { useState, useRef } from "react"
import { useTranslation } from "react-i18next"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Toast } from "@/components/ui/Toast"
import { GoogleLogin } from '@react-oauth/google'
import { apiClient, ApiError } from "@/services/apiClient"
import { API_ENDPOINTS } from "@/config/api"
import { validateUsername, validateRequired, validateEmail, validatePassword, validatePasswordMatch } from "@/utils/validation"

interface LandingPageProps {
  onLogin: () => void;
}

export function LandingPage({ onLogin }: LandingPageProps) {
  const { t } = useTranslation()
  const [isRegister, setIsRegister] = useState(false)
  const [showResendVerification, setShowResendVerification] = useState(false)
  const [showForgotPassword, setShowForgotPassword] = useState(false)
  const [resendEmail, setResendEmail] = useState("")
  const [forgotPasswordEmail, setForgotPasswordEmail] = useState("")
  const googleButtonRef = useRef<HTMLDivElement>(null)
  const [formData, setFormData] = useState({
    username: "",
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    confirmPassword: ""
  })
  const [loginData, setLoginData] = useState({
    username: "",
    password: ""
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [toast, setToast] = useState<{ show: boolean; variant: "success" | "error" | "warning"; title: string; message?: string }>({
    show: false, variant: "error", title: ""
  })

  const showToast = (variant: "success" | "error" | "warning", title: string, message?: string) => {
    setToast({ show: true, variant, title, message })
  }

  const handleLoginClick = async (e: React.FormEvent) => {
    e.preventDefault();

    // Basic validation
    if (!loginData.username.trim() || !loginData.password.trim()) {
      showToast("warning", t("landing.toasts.fillAllFields"))
      return
    }

    try {
      const data = await apiClient.post<{ csrf_token: string; token_type: string }>(
        API_ENDPOINTS.AUTH_LOGIN,
        {
          username: loginData.username.trim(),
          password: loginData.password.trim(),
        },
        { requireAuth: false }
      )

      // Success - CSRF token stored in cookie AND in memory for headers
      // Cookies are HttpOnly (access_token, refresh_token)
      // CSRF token is NOT HttpOnly (client needs to read it)
      
      // Store CSRF token in sessionStorage for X-CSRF-Token header
      sessionStorage.setItem("csrf_token", data.csrf_token)

      // Call parent onLogin callback
      onLogin();
    } catch (error) {
      console.error("Login error:", error)
      if (error instanceof ApiError && error.status === 401) {
        showToast("error", t("landing.toasts.invalidCredentials"))
      } else if (error instanceof ApiError && error.status === 403) {
        // Email not verified - show resend verification form
        // Pre-fill email field with the username/email used for login
        setResendEmail(loginData.username)
        setShowResendVerification(true)
        showToast("warning", t("landing.toasts.emailNotVerified"), t("landing.toasts.emailNotVerifiedMsg"))
      } else if (error instanceof Error) {
        showToast("error", t("landing.toasts.loginError"), error.message)
      } else {
        showToast("error", t("landing.toasts.loginError"), t("landing.toasts.serverError"))
      }
    }
  };

  const handleResendVerification = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!resendEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(resendEmail)) {
      showToast("warning", t("landing.toasts.enterValidEmail"))
      return
    }

    try {
      await apiClient.post(
        API_ENDPOINTS.AUTH_RESEND_VERIFICATION,
        { email: resendEmail },
        { requireAuth: false }
      )
      showToast("success", t("landing.toasts.emailSent"), t("landing.toasts.emailSentMsg"))
      setShowResendVerification(false)
      setResendEmail("")
    } catch (error) {
      console.error("Resend verification error:", error)
      showToast("error", t("landing.toasts.error"), t("landing.toasts.sendError"))
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!forgotPasswordEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(forgotPasswordEmail)) {
      showToast("warning", t("landing.toasts.enterValidEmail"))
      return
    }

    try {
      await apiClient.post(
        API_ENDPOINTS.AUTH_FORGOT_PASSWORD,
        { email: forgotPasswordEmail },
        { requireAuth: false }
      )
      showToast("success", t("landing.toasts.requestSent"), t("landing.toasts.requestSentMsg"))
      setShowForgotPassword(false)
      setForgotPasswordEmail("")
    } catch (error) {
      console.error("Forgot password error:", error)
      showToast("error", t("landing.toasts.error"), t("landing.toasts.sendRequestError"))
    }
  };

  const handleGoogleSuccess = async (credentialResponse: { credential: string }) => {
    try {
      const data = await apiClient.post<{ csrf_token: string; token_type: string }>(
        API_ENDPOINTS.AUTH_GOOGLE,
        { credential: credentialResponse.credential },
        { requireAuth: false }
      )

      // Store CSRF token
      sessionStorage.setItem("csrf_token", data.csrf_token)

      // Call parent onLogin callback
      onLogin();
    } catch (error) {
      console.error("Google login error:", error)
      if (error instanceof ApiError) {
        showToast("error", t("landing.toasts.googleLoginError"), error.message)
      } else {
        showToast("error", t("landing.toasts.googleLoginError"), t("landing.toasts.serverError"))
      }
    }
  };

  const handleGoogleError = () => {
    showToast("error", t("landing.toasts.loginError"), t("landing.toasts.googleLoginFailed"))
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const newErrors: Record<string, string> = {
      username: validateUsername(formData.username),
      firstName: validateRequired(formData.firstName, t("landing.validation.firstNameLabel")),
      lastName: validateRequired(formData.lastName, t("landing.validation.lastNameLabel")),
      email: validateEmail(formData.email),
      password: validatePassword(formData.password),
      confirmPassword: validatePasswordMatch(formData.password, formData.confirmPassword),
    }

    if (Object.values(newErrors).some(e => e)) {
      setErrors(newErrors)
      return
    }

    // Clear errors and proceed with registration
    setErrors({})

    try {
      await apiClient.post<{ access_token: string; token_type: string }>(
        API_ENDPOINTS.AUTH_REGISTER,
        {
          username: formData.username,
          first_name: formData.firstName,
          last_name: formData.lastName,
          email: formData.email,
          password: formData.password,
        },
        { requireAuth: false }
      )

      // Success
      showToast("success", t("landing.toasts.registrationSuccess"), t("landing.toasts.registrationSuccessMsg"))
      setIsRegister(false)
      // Reset form
      setFormData({
        username: "",
        firstName: "",
        lastName: "",
        email: "",
        password: "",
        confirmPassword: ""
      })
    } catch (error) {
      console.error("Registration error:", error)
      if (error instanceof ApiError) {
        const errorMessage = error.message
        if (errorMessage.includes("Username")) {
          newErrors.username = errorMessage
          setErrors(newErrors)
        } else if (errorMessage.includes("Email")) {
          newErrors.email = errorMessage
          setErrors(newErrors)
        } else {
          showToast("error", t("landing.toasts.registrationError"), errorMessage)
        }
      } else {
        showToast("error", t("landing.toasts.registrationError"), t("landing.toasts.serverError"))
      }
    }
  }

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    // Clear error for this field when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: "" }))
    }
  }

  const handleRegisterBlur = (field: string) => {
    const value = formData[field as keyof typeof formData]
    let error = ""
    if (field === 'username') error = validateUsername(value)
    else if (field === 'firstName') error = validateRequired(value, t("landing.validation.firstNameLabel"))
    else if (field === 'lastName') error = validateRequired(value, t("landing.validation.lastNameLabel"))
    else if (field === 'email') error = validateEmail(value)
    else if (field === 'password') error = validatePassword(value)
    else if (field === 'confirmPassword') error = validatePasswordMatch(formData.password, value)
    if (error) setErrors(prev => ({ ...prev, [field]: error }))
  }

  return (
    <div className="min-h-screen bg-[#0f172a]">
      <Toast
        show={toast.show}
        variant={toast.variant}
        title={toast.title}
        message={toast.message}
        duration={3000}
        onClose={() => setToast(prev => ({ ...prev, show: false }))}
      />
      <div className="flex min-h-screen">
        {/* Left Side - Branding */}
        <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-[#1e293b] to-[#0f172a] p-12 flex-col justify-between relative overflow-hidden">
          {/* Background glow effects */}
          <div className="absolute -top-20 -right-20 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl" />
          <div className="absolute top-1/2 -left-32 w-80 h-80 bg-purple-500/10 rounded-full blur-3xl" />
          <div className="absolute -bottom-20 right-20 w-72 h-72 bg-blue-600/10 rounded-full blur-3xl" />

          {/* Subtle grid pattern overlay */}
          <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.01)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.01)_1px,transparent_1px)] bg-[size:40px_40px] opacity-30" />

          {/* Gradient overlay for depth */}
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 via-transparent to-purple-500/5" />

          <div className="relative z-10">
            <h1 className="text-4xl font-bold text-white mb-4 drop-shadow-lg">
              Wrestling Federation
            </h1>
            <p className="text-blue-100 text-lg drop-shadow-md">
              {t("landing.tagline")}
            </p>
          </div>

          <div className="space-y-6 relative z-10">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-lg bg-blue-500/20 backdrop-blur-sm flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <div>
                <h3 className="font-semibold text-white mb-1">{t("landing.feature1Title")}</h3>
                <p className="text-blue-100 text-sm">
                  {t("landing.feature1Desc")}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-lg bg-blue-500/20 backdrop-blur-sm flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                </svg>
              </div>
              <div>
                <h3 className="font-semibold text-white mb-1">{t("landing.feature2Title")}</h3>
                <p className="text-blue-100 text-sm">
                  {t("landing.feature2Desc")}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-lg bg-blue-500/20 backdrop-blur-sm flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <div>
                <h3 className="font-semibold text-white mb-1">{t("landing.feature3Title")}</h3>
                <p className="text-blue-100 text-sm">
                  {t("landing.feature3Desc")}
                </p>
              </div>
            </div>
          </div>

          <div className="text-gray-400 text-sm relative z-10">
            {t("landing.copyright")}
          </div>
        </div>

        {/* Right Side - Login/Register Form */}
        <div className="flex-1 flex items-center justify-center p-8 bg-[#0f172a] relative overflow-hidden">
          {/* Background glow effects */}
          <div className="absolute top-20 -left-20 w-72 h-72 bg-blue-500/20 rounded-full blur-3xl" />
          <div className="absolute bottom-20 -right-20 w-72 h-72 bg-purple-500/20 rounded-full blur-3xl" />

          <div className="w-full max-w-md relative z-10">
            <div className="mb-8">
              <h2 className="text-3xl font-bold text-white mb-2">
                {isRegister ? t("landing.createAccount") : t("landing.welcomeBack")}
              </h2>
              <p className="text-gray-400">
                {isRegister ? t("landing.registerSubtitle") : t("landing.loginSubtitle")}
              </p>
            </div>

            <Card className="border-white/10 bg-[#1e293b]/80 backdrop-blur-xl shadow-2xl shadow-blue-500/10 relative overflow-hidden">
              {/* Top gradient reflection */}
              <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-blue-500/50 to-transparent" />

              {/* Corner accent */}
              <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-blue-500/10 to-transparent rounded-bl-full" />

              {/* Subtle grid pattern overlay */}
              <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:20px_20px] [mask-image:radial-gradient(ellipse_at_center,black_50%,transparent_100%)]" />
              <CardContent className="pt-6 relative z-10">
                {showForgotPassword ? (
                  // Forgot Password Form
                  <form onSubmit={handleForgotPassword} className="space-y-5">
                    <div className="text-center mb-4">
                      <div className="w-12 h-12 bg-blue-500/20 rounded-full flex items-center justify-center mx-auto mb-3">
                        <svg className="w-6 h-6 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                        </svg>
                      </div>
                      <h3 className="text-lg font-semibold text-white mb-1">{t("landing.forgotPasswordTitle")}</h3>
                      <p className="text-sm text-gray-400">{t("landing.forgotPasswordSubtitle")}</p>
                    </div>
                    <div className="space-y-2">
                      <label htmlFor="forgot-email" className="text-sm font-medium text-gray-300">
                        {t("landing.emailLabel")}
                      </label>
                      <Input
                        id="forgot-email"
                        type="email"
                        placeholder="vas.email@example.com"
                        className="h-11 bg-[#0f172a] border-white/10 text-white placeholder:text-gray-500 focus:border-blue-500"
                        value={forgotPasswordEmail}
                        onChange={(e) => setForgotPasswordEmail(e.target.value)}
                      />
                    </div>
                    <Button type="submit" className="w-full h-11 bg-blue-600 hover:bg-blue-700 text-white" size="lg">
                      {t("landing.sendLink")}
                    </Button>
                    <Button
                      type="button"
                      onClick={() => {
                        setShowForgotPassword(false)
                        setForgotPasswordEmail("")
                      }}
                      className="w-full h-11 bg-gray-600 hover:bg-gray-700 text-white"
                      size="lg"
                    >
                      {t("common.cancel")}
                    </Button>
                  </form>
                ) : showResendVerification ? (
                  // Resend Verification Form
                  <form onSubmit={handleResendVerification} className="space-y-5">
                    <div className="text-center mb-4">
                      <div className="w-12 h-12 bg-yellow-500/20 rounded-full flex items-center justify-center mx-auto mb-3">
                        <svg className="w-6 h-6 text-yellow-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                        </svg>
                      </div>
                      <h3 className="text-lg font-semibold text-white mb-1">{t("landing.resendVerificationTitle")}</h3>
                      <p className="text-sm text-gray-400">{t("landing.resendVerificationSubtitle")}</p>
                    </div>
                    <div className="space-y-2">
                      <label htmlFor="resend-email" className="text-sm font-medium text-gray-300">
                        {t("landing.emailLabel")}
                      </label>
                      <Input
                        id="resend-email"
                        type="email"
                        placeholder="vas.email@example.com"
                        className="h-11 bg-[#0f172a] border-white/10 text-white placeholder:text-gray-500 focus:border-blue-500"
                        value={resendEmail}
                        onChange={(e) => setResendEmail(e.target.value)}
                      />
                    </div>
                    <Button type="submit" className="w-full h-11 bg-blue-600 hover:bg-blue-700 text-white" size="lg">
                      {t("landing.sendVerificationEmail")}
                    </Button>
                    <Button
                      type="button"
                      onClick={() => {
                        setShowResendVerification(false)
                        setResendEmail("")
                      }}
                      className="w-full h-11 bg-gray-600 hover:bg-gray-700 text-white"
                      size="lg"
                    >
                      {t("common.cancel")}
                    </Button>
                  </form>
                ) : !isRegister ? (
                  // Login Form
                  <div className="space-y-5">
                    {/* Google Sign In - Top */}
                    <button
                      type="button"
                      onClick={() => {
                        const btn = googleButtonRef.current?.querySelector('div[role="button"]') as HTMLElement;
                        btn?.click();
                      }}
                      className="w-full h-11 bg-white hover:bg-gray-100 text-gray-700 font-medium rounded-lg flex items-center justify-center gap-3 transition-colors border border-white/20"
                    >
                      <svg className="w-5 h-5" viewBox="0 0 24 24">
                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                      </svg>
                      {t("landing.loginWithGoogle")}
                    </button>

                    {/* Divider */}
                    <div className="relative">
                      <div className="absolute inset-0 flex items-center">
                        <div className="w-full border-t border-white/10"></div>
                      </div>
                      <div className="relative flex justify-center">
                        <span className="bg-[#1e293b] px-4 text-xs text-gray-500 uppercase tracking-wider">{t("landing.or")}</span>
                      </div>
                    </div>

                    {/* Local Login Form */}
                    <form onSubmit={handleLoginClick} className="space-y-4">
                      <div className="space-y-2">
                        <label htmlFor="username" className="text-sm font-medium text-gray-300">
                          {t("landing.loginLabel")}
                        </label>
                        <Input
                          id="username"
                          type="text"
                          placeholder="uzivatelske_meno"
                          className={`h-11 bg-[#0f172a] border-white/10 text-white placeholder:text-gray-500 focus:border-blue-500 ${errors.loginUsername ? 'border-red-500' : ''}`}
                          value={loginData.username}
                          onChange={(e) => {
                            setLoginData(prev => ({ ...prev, username: e.target.value }))
                            if (errors.loginUsername) setErrors(prev => ({ ...prev, loginUsername: '' }))
                          }}
                          onBlur={() => {
                            if (!loginData.username.trim()) setErrors(prev => ({ ...prev, loginUsername: t("landing.validation.loginUsernameRequired") }))
                          }}
                        />
                        {errors.loginUsername && (
                          <p className="text-sm text-red-400">{errors.loginUsername}</p>
                        )}
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <label htmlFor="password" className="text-sm font-medium text-gray-300">
                            {t("landing.passwordLabel")}
                          </label>
                          <button
                            type="button"
                            onClick={() => setShowForgotPassword(true)}
                            className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
                          >
                            {t("landing.forgotPasswordLink")}
                          </button>
                        </div>
                        <Input
                          id="password"
                          type="password"
                          placeholder="••••••••"
                          className={`h-11 bg-[#0f172a] border-white/10 text-white placeholder:text-gray-500 focus:border-blue-500 ${errors.loginPassword ? 'border-red-500' : ''}`}
                          value={loginData.password}
                          onChange={(e) => {
                            setLoginData(prev => ({ ...prev, password: e.target.value }))
                            if (errors.loginPassword) setErrors(prev => ({ ...prev, loginPassword: '' }))
                          }}
                          onBlur={() => {
                            if (!loginData.password.trim()) setErrors(prev => ({ ...prev, loginPassword: t("landing.validation.loginPasswordRequired") }))
                          }}
                        />
                        {errors.loginPassword && (
                          <p className="text-sm text-red-400">{errors.loginPassword}</p>
                        )}
                      </div>
                      <Button type="submit" className="w-full h-11 bg-blue-600 hover:bg-blue-700 text-white transition-colors" size="lg">
                        {t("landing.submitLogin")}
                      </Button>
                    </form>

                    {/* Hidden Google Button */}
                    <div ref={googleButtonRef} className="hidden">
                      <GoogleLogin
                        onSuccess={handleGoogleSuccess}
                        onError={handleGoogleError}
                      />
                    </div>
                  </div>
                ) : (
                  // Registration Form
                  <form onSubmit={handleRegisterSubmit} className="space-y-4">
                    <div className="space-y-2">
                      <label htmlFor="username" className="text-sm font-medium text-gray-300">
                        {t("landing.loginLabel")}
                      </label>
                      <Input
                        id="username"
                        type="text"
                        placeholder="pouzivatel123"
                        className={`h-11 bg-[#0f172a] border-white/10 text-white placeholder:text-gray-500 focus:border-blue-500 ${errors.username ? 'border-red-500' : ''}`}
                        value={formData.username}
                        onChange={(e) => handleInputChange('username', e.target.value)}
                        onBlur={() => handleRegisterBlur('username')}
                      />
                      {errors.username && (
                        <p className="text-sm text-red-400">{errors.username}</p>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label htmlFor="firstName" className="text-sm font-medium text-gray-300">
                          {t("landing.validation.firstNameLabel")}
                        </label>
                        <Input
                          id="firstName"
                          type="text"
                          placeholder="Ján"
                          className={`h-11 bg-[#0f172a] border-white/10 text-white placeholder:text-gray-500 focus:border-blue-500 ${errors.firstName ? 'border-red-500' : ''}`}
                          value={formData.firstName}
                          onChange={(e) => handleInputChange('firstName', e.target.value)}
                          onBlur={() => handleRegisterBlur('firstName')}
                        />
                        {errors.firstName && (
                          <p className="text-sm text-red-400">{errors.firstName}</p>
                        )}
                      </div>

                      <div className="space-y-2">
                        <label htmlFor="lastName" className="text-sm font-medium text-gray-300">
                          {t("landing.validation.lastNameLabel")}
                        </label>
                        <Input
                          id="lastName"
                          type="text"
                          placeholder="Novák"
                          className={`h-11 bg-[#0f172a] border-white/10 text-white placeholder:text-gray-500 focus:border-blue-500 ${errors.lastName ? 'border-red-500' : ''}`}
                          value={formData.lastName}
                          onChange={(e) => handleInputChange('lastName', e.target.value)}
                          onBlur={() => handleRegisterBlur('lastName')}
                        />
                        {errors.lastName && (
                          <p className="text-sm text-red-400">{errors.lastName}</p>
                        )}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label htmlFor="reg-email" className="text-sm font-medium text-gray-300">
                        {t("landing.emailLabel")}
                      </label>
                      <Input
                        id="reg-email"
                        type="email"
                        placeholder="vas.email@example.com"
                        className={`h-11 bg-[#0f172a] border-white/10 text-white placeholder:text-gray-500 focus:border-blue-500 ${errors.email ? 'border-red-500' : ''}`}
                        value={formData.email}
                        onChange={(e) => handleInputChange('email', e.target.value)}
                        onBlur={() => handleRegisterBlur('email')}
                      />
                      {errors.email && (
                        <p className="text-sm text-red-400">{errors.email}</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <label htmlFor="reg-password" className="text-sm font-medium text-gray-300">
                        {t("landing.passwordLabel")}
                      </label>
                      <Input
                        id="reg-password"
                        type="password"
                        placeholder="••••••••"
                        className={`h-11 bg-[#0f172a] border-white/10 text-white placeholder:text-gray-500 focus:border-blue-500 ${errors.password ? 'border-red-500' : ''}`}
                        value={formData.password}
                        onChange={(e) => handleInputChange('password', e.target.value)}
                        onBlur={() => handleRegisterBlur('password')}
                      />
                      {errors.password && (
                        <p className="text-sm text-red-400">{errors.password}</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <label htmlFor="confirmPassword" className="text-sm font-medium text-gray-300">
                        {t("landing.repeatPassword")}
                      </label>
                      <Input
                        id="confirmPassword"
                        type="password"
                        placeholder="••••••••"
                        className={`h-11 bg-[#0f172a] border-white/10 text-white placeholder:text-gray-500 focus:border-blue-500 ${errors.confirmPassword ? 'border-red-500' : ''}`}
                        value={formData.confirmPassword}
                        onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                        onBlur={() => handleRegisterBlur('confirmPassword')}
                      />
                      {errors.confirmPassword && (
                        <p className="text-sm text-red-400">{errors.confirmPassword}</p>
                      )}
                    </div>

                    <Button type="submit" className="w-full h-11 bg-blue-600 hover:bg-blue-700 text-white" size="lg">
                      {t("landing.submitRegister")}
                    </Button>
                  </form>
                )}

                {/* Toggle between Login and Register */}
                <div className="mt-6 text-center text-sm text-gray-400">
                  {isRegister ? t("landing.hasAccount") : t("landing.noAccount")}
                  <button
                    type="button"
                    onClick={() => {
                      setIsRegister(!isRegister)
                      setErrors({})
                      setFormData({
                        username: "",
                        firstName: "",
                        lastName: "",
                        email: "",
                        password: "",
                        confirmPassword: ""
                      })
                    }}
                    className="text-blue-400 hover:text-blue-300 font-medium transition-colors"
                  >
                    {isRegister ? t("landing.loginLink") : t("landing.registerLink")}
                  </button>
                </div>
              </CardContent>
            </Card>

            {/* Mobile branding */}
            <div className="lg:hidden mt-8 text-center">
              <h3 className="font-semibold text-white mb-2">Wrestling Federation</h3>
              <p className="text-gray-400 text-sm">
                {t("landing.mobileBranding")}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
