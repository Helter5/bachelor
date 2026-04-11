import { useState, useEffect, useRef, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { apiClient } from '@/services/apiClient'
import { API_BASE_URL, API_ENDPOINTS } from '@/config/api'
import { validateRequired, validateEmail, validatePassword, validatePasswordMatch } from '@/utils/validation'

interface User {
  id: number
  username: string
  first_name: string
  last_name: string
  email: string
  role: string
  avatar_url: string | null
}

interface ProfileSettingsProps {
  isDarkMode: boolean
  onUserUpdated: (user: User) => void
}

// --- Icons ---
const IconPerson = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
  </svg>
)
const IconEmail = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
  </svg>
)
const IconLock = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
  </svg>
)
const IconCheck = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
)

// --- Sub-components ---

function SectionCard({ isDarkMode, icon, title, description, children }: {
  isDarkMode: boolean
  icon: React.ReactNode
  title: string
  description?: string
  children: React.ReactNode
}) {
  return (
    <div className={`rounded-2xl overflow-hidden ${isDarkMode ? 'bg-[#0f172a]/60 border border-white/8' : 'bg-white border border-gray-200 shadow-sm'}`}>
      {/* Section header strip */}
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

function FormInput({ isDarkMode, label, type = 'text', value, onChange, onBlur, error, placeholder, icon }: {
  isDarkMode: boolean
  label: string
  type?: string
  value: string
  onChange: (v: string) => void
  onBlur?: () => void
  error?: string
  placeholder?: string
  icon?: React.ReactNode
}) {
  return (
    <div>
      <label className={`block text-xs font-medium mb-1.5 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
        {label}
      </label>
      <div className="relative">
        {icon && (
          <div className={`absolute left-3 top-1/2 -translate-y-1/2 ${error ? 'text-red-400' : isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
            {icon}
          </div>
        )}
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onBlur={onBlur}
          placeholder={placeholder}
          className={`w-full py-2.5 rounded-xl text-sm border transition-colors outline-none focus:ring-2 ${
            icon ? 'pl-10 pr-3.5' : 'px-3.5'
          } ${
            error
              ? 'border-red-500/60 focus:ring-red-500/15 ' + (isDarkMode ? 'bg-red-500/5 text-white' : 'bg-red-50 text-gray-900')
              : isDarkMode
                ? 'bg-white/5 border-white/10 text-white placeholder-gray-600 focus:border-blue-500/50 focus:ring-blue-500/10 focus:bg-white/7'
                : 'bg-gray-50 border-gray-200 text-gray-900 placeholder-gray-400 focus:border-blue-400 focus:ring-blue-100 focus:bg-white'
          }`}
        />
      </div>
      {error && <p className="text-xs text-red-400 mt-1.5 flex items-center gap-1">
        <svg className="w-3 h-3 shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd"/></svg>
        {error}
      </p>}
    </div>
  )
}

// --- Main component ---

export function ProfileSettings({ isDarkMode, onUserUpdated }: ProfileSettingsProps) {
  const { t } = useTranslation()
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [avatarUploading, setAvatarUploading] = useState(false)
  const [profileSaving, setProfileSaving] = useState(false)
  const [passwordSaving, setPasswordSaving] = useState(false)
  const [avatarSuccess, setAvatarSuccess] = useState(false)
  const [profileSuccess, setProfileSuccess] = useState(false)
  const [passwordSuccess, setPasswordSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const avatarInputRef = useRef<HTMLInputElement | null>(null)

  const [profileForm, setProfileForm] = useState({ first_name: '', last_name: '', email: '' })
  const [profileErrors, setProfileErrors] = useState<Record<string, string>>({})
  const [passwordForm, setPasswordForm] = useState({ current_password: '', new_password: '', confirm_password: '' })
  const [passwordErrors, setPasswordErrors] = useState<Record<string, string>>({})

  const loadProfile = useCallback(async () => {
    try {
      setLoading(true)
      const data = await apiClient.get<User>(API_ENDPOINTS.PROFILE_ME)
      setUser(data)
      setProfileForm({ first_name: data.first_name, last_name: data.last_name, email: data.email })
      onUserUpdated(data)
    } catch {
      setError(t('profile.loadError'))
    } finally {
      setLoading(false)
    }
  }, [onUserUpdated, t])

  useEffect(() => {
    loadProfile()
  }, [loadProfile])

  const getAvatarUrl = (avatarUrl: string | null) => {
    if (!avatarUrl) return user?.role === 'admin' ? '/avatars/default-admin.png' : '/avatars/default-user.png'
    if (avatarUrl.startsWith('http://') || avatarUrl.startsWith('https://')) return avatarUrl
    return `${API_BASE_URL}${avatarUrl}`
  }

  const handleAvatarUpload = async (file: File) => {
    setError(null)

    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
    if (!allowedTypes.includes(file.type)) {
      setError(t('profile.avatarInvalidType'))
      return
    }

    if (file.size > 5 * 1024 * 1024) {
      setError(t('profile.avatarTooLarge'))
      return
    }

    try {
      setAvatarUploading(true)
      const formData = new FormData()
      formData.append('file', file)

      const data = await apiClient.postForm<{ avatar_url: string }>(API_ENDPOINTS.PROFILE_UPLOAD_AVATAR, formData)
      setUser((prev) => {
        if (!prev) return prev
        const updated = { ...prev, avatar_url: data.avatar_url }
        onUserUpdated(updated)
        return updated
      })
      setAvatarSuccess(true)
      setTimeout(() => setAvatarSuccess(false), 3000)
    } catch {
      setError(t('profile.avatarUploadError'))
    } finally {
      setAvatarUploading(false)
      if (avatarInputRef.current) {
        avatarInputRef.current.value = ''
      }
    }
  }

  const handleAvatarDelete = async () => {
    setError(null)
    try {
      setAvatarUploading(true)
      await apiClient.delete(API_ENDPOINTS.PROFILE_DELETE_AVATAR)
      setUser((prev) => {
        if (!prev) return prev
        const updated = { ...prev, avatar_url: null }
        onUserUpdated(updated)
        return updated
      })
      setAvatarSuccess(true)
      setTimeout(() => setAvatarSuccess(false), 3000)
    } catch {
      setError(t('profile.avatarDeleteError'))
    } finally {
      setAvatarUploading(false)
    }
  }

  const handleProfileBlur = (field: keyof typeof profileForm) => {
    const value = profileForm[field]
    let err = ''
    if (field === 'email') err = validateEmail(value)
    else if (field === 'first_name') err = validateRequired(value, t('profile.firstName'))
    else if (field === 'last_name') err = validateRequired(value, t('profile.lastName'))
    setProfileErrors(prev => ({ ...prev, [field]: err }))
  }

  const handleProfileChange = (field: keyof typeof profileForm, value: string) => {
    setProfileForm(prev => ({ ...prev, [field]: value }))
    if (profileErrors[field]) setProfileErrors(prev => ({ ...prev, [field]: '' }))
  }

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    const newErrors = {
      first_name: validateRequired(profileForm.first_name, t('profile.firstName')),
      last_name: validateRequired(profileForm.last_name, t('profile.lastName')),
      email: validateEmail(profileForm.email),
    }
    setProfileErrors(newErrors)
    if (Object.values(newErrors).some(e => e)) return
    try {
      setProfileSaving(true)
      const updated = await apiClient.put<User>(API_ENDPOINTS.PROFILE_ME, profileForm)
      setUser(updated)
      onUserUpdated(updated)
      setProfileSuccess(true)
      setTimeout(() => setProfileSuccess(false), 3000)
    } catch {
      setError(t('profile.updateError'))
    } finally {
      setProfileSaving(false)
    }
  }

  const handlePasswordBlur = (field: keyof typeof passwordForm) => {
    let err = ''
    if (field === 'current_password') err = validateRequired(passwordForm.current_password, t('profile.currentPassword'))
    else if (field === 'new_password') err = validatePassword(passwordForm.new_password)
    else if (field === 'confirm_password') err = validatePasswordMatch(passwordForm.new_password, passwordForm.confirm_password)
    setPasswordErrors(prev => ({ ...prev, [field]: err }))
  }

  const handlePasswordChange = (field: keyof typeof passwordForm, value: string) => {
    setPasswordForm(prev => ({ ...prev, [field]: value }))
    if (passwordErrors[field]) setPasswordErrors(prev => ({ ...prev, [field]: '' }))
  }

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    const newErrors = {
      current_password: validateRequired(passwordForm.current_password, t('profile.currentPassword')),
      new_password: validatePassword(passwordForm.new_password),
      confirm_password: validatePasswordMatch(passwordForm.new_password, passwordForm.confirm_password),
    }
    setPasswordErrors(newErrors)
    if (Object.values(newErrors).some(e => e)) return
    try {
      setPasswordSaving(true)
      await apiClient.post(API_ENDPOINTS.PROFILE_CHANGE_PASSWORD, {
        current_password: passwordForm.current_password,
        new_password: passwordForm.new_password,
      })
      setPasswordSuccess(true)
      setPasswordForm({ current_password: '', new_password: '', confirm_password: '' })
      setPasswordErrors({})
      setTimeout(() => setPasswordSuccess(false), 3000)
    } catch {
      setError(t('profile.passwordError'))
    } finally {
      setPasswordSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="flex items-center gap-3">
          <div className="w-5 h-5 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
          <span className={isDarkMode ? 'text-gray-400' : 'text-gray-500'}>{t('profile.loading')}</span>
        </div>
      </div>
    )
  }

  const avatarUrl = getAvatarUrl(user?.avatar_url ?? null)

  return (
    <div className="space-y-5">
      {error && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
          <svg className="w-4 h-4 shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" /></svg>
          {error}
        </div>
      )}

      {/* Identity card */}
      <div className={`rounded-2xl p-5 flex items-center gap-4 ${isDarkMode ? 'bg-blue-500/8 border border-blue-500/15' : 'bg-blue-50 border border-blue-100'}`}>
        <img
          src={avatarUrl}
          alt={t('profile.avatarAlt')}
          className="w-12 h-12 rounded-full object-cover border border-blue-200/40 shrink-0"
        />
        <div>
          <p className={`font-semibold text-base ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
            {user?.first_name} {user?.last_name}
          </p>
          <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>@{user?.username}</p>
          <span className={`inline-block mt-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${
            user?.role === 'admin'
              ? isDarkMode ? 'bg-blue-500/15 text-blue-400' : 'bg-blue-100 text-blue-700'
              : isDarkMode ? 'bg-slate-500/20 text-slate-400' : 'bg-gray-100 text-gray-600'
          }`}>
            {user?.role}
          </span>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <input
              ref={avatarInputRef}
              type="file"
              accept="image/jpeg,image/png,image/gif,image/webp"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (file) handleAvatarUpload(file)
              }}
            />
            <button
              type="button"
              onClick={() => avatarInputRef.current?.click()}
              disabled={avatarUploading}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                isDarkMode
                  ? 'bg-blue-500/20 text-blue-300 hover:bg-blue-500/30 disabled:opacity-60'
                  : 'bg-blue-100 text-blue-700 hover:bg-blue-200 disabled:opacity-60'
              }`}
            >
              {avatarUploading ? t('profile.uploadingAvatar') : t('profile.uploadAvatar')}
            </button>
            {user?.avatar_url && (
              <button
                type="button"
                onClick={handleAvatarDelete}
                disabled={avatarUploading}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  isDarkMode
                    ? 'bg-red-500/20 text-red-300 hover:bg-red-500/30 disabled:opacity-60'
                    : 'bg-red-100 text-red-700 hover:bg-red-200 disabled:opacity-60'
                }`}
              >
                {t('profile.removeAvatar')}
              </button>
            )}
            {avatarSuccess && (
              <span className="flex items-center gap-1.5 text-green-400 text-xs">
                <IconCheck />{t('profile.avatarUpdated')}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Personal data */}
      <SectionCard
        isDarkMode={isDarkMode}
        icon={<IconPerson />}
        title={t('profile.personalData')}
        description={t('profile.personalDataDesc')}
      >
        <form onSubmit={handleUpdateProfile} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormInput
              isDarkMode={isDarkMode}
              label={t('profile.firstName')}
              value={profileForm.first_name}
              onChange={(v) => handleProfileChange('first_name', v)}
              onBlur={() => handleProfileBlur('first_name')}
              error={profileErrors.first_name}
              icon={<IconPerson />}
            />
            <FormInput
              isDarkMode={isDarkMode}
              label={t('profile.lastName')}
              value={profileForm.last_name}
              onChange={(v) => handleProfileChange('last_name', v)}
              onBlur={() => handleProfileBlur('last_name')}
              error={profileErrors.last_name}
              icon={<IconPerson />}
            />
          </div>
          <FormInput
            isDarkMode={isDarkMode}
            label={t('profile.email')}
            type="email"
            value={profileForm.email}
            onChange={(v) => handleProfileChange('email', v)}
            onBlur={() => handleProfileBlur('email')}
            error={profileErrors.email}
            icon={<IconEmail />}
          />
          <div className="flex items-center gap-3 pt-1">
            <button
              type="submit"
              disabled={profileSaving}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-sm font-medium transition-colors"
            >
              {profileSaving
                ? <><div className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />{t('profile.saving')}</>
                : t('profile.saveChanges')
              }
            </button>
            {profileSuccess && (
              <span className="flex items-center gap-1.5 text-green-400 text-sm">
                <IconCheck />{t('profile.updateSuccess')}
              </span>
            )}
          </div>
        </form>
      </SectionCard>

      {/* Change password */}
      <SectionCard
        isDarkMode={isDarkMode}
        icon={<IconLock />}
        title={t('profile.changePassword')}
        description={t('profile.changePasswordDesc')}
      >
        <form onSubmit={handleChangePassword} className="space-y-4">
          <FormInput
            isDarkMode={isDarkMode}
            label={t('profile.currentPassword')}
            type="password"
            value={passwordForm.current_password}
            onChange={(v) => handlePasswordChange('current_password', v)}
            onBlur={() => handlePasswordBlur('current_password')}
            error={passwordErrors.current_password}
            icon={<IconLock />}
          />
          <div className={`border-t pt-4 ${isDarkMode ? 'border-white/6' : 'border-gray-100'}`}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormInput
                isDarkMode={isDarkMode}
                label={t('profile.newPassword')}
                type="password"
                value={passwordForm.new_password}
                onChange={(v) => handlePasswordChange('new_password', v)}
                onBlur={() => handlePasswordBlur('new_password')}
                error={passwordErrors.new_password}
                icon={<IconLock />}
              />
              <FormInput
                isDarkMode={isDarkMode}
                label={t('profile.confirmNewPassword')}
                type="password"
                value={passwordForm.confirm_password}
                onChange={(v) => handlePasswordChange('confirm_password', v)}
                onBlur={() => handlePasswordBlur('confirm_password')}
                error={passwordErrors.confirm_password}
                icon={<IconLock />}
              />
            </div>
          </div>
          <div className="flex items-center gap-3 pt-1">
            <button
              type="submit"
              disabled={passwordSaving}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-sm font-medium transition-colors"
            >
              {passwordSaving
                ? <><div className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />{t('profile.saving')}</>
                : t('profile.changePasswordButton')
              }
            </button>
            {passwordSuccess && (
              <span className="flex items-center gap-1.5 text-green-400 text-sm">
                <IconCheck />{t('profile.passwordSuccess')}
              </span>
            )}
          </div>
        </form>
      </SectionCard>
    </div>
  )
}
