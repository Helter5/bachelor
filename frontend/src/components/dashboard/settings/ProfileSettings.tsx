import { useState, useEffect } from 'react'
import { apiClient } from '@/services/apiClient'
import { API_ENDPOINTS } from '@/config/api'
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
}

export function ProfileSettings({ isDarkMode }: ProfileSettingsProps) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const [profileForm, setProfileForm] = useState({
    first_name: '',
    last_name: '',
    email: ''
  })
  const [profileErrors, setProfileErrors] = useState<Record<string, string>>({})

  const [passwordForm, setPasswordForm] = useState({
    current_password: '',
    new_password: '',
    confirm_password: ''
  })
  const [passwordErrors, setPasswordErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    loadProfile()
  }, [])

  const loadProfile = async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await apiClient.get<User>(API_ENDPOINTS.PROFILE_ME)
      setUser(data)
      setProfileForm({
        first_name: data.first_name,
        last_name: data.last_name,
        email: data.email
      })
    } catch (err) {
      console.error('Error loading profile:', err)
      setError('Nepodarilo sa načítať profil')
    } finally {
      setLoading(false)
    }
  }

  const handleProfileBlur = (field: keyof typeof profileForm) => {
    const value = profileForm[field]
    let error = ''
    if (field === 'email') error = validateEmail(value)
    else if (field === 'first_name') error = validateRequired(value, 'Meno')
    else if (field === 'last_name') error = validateRequired(value, 'Priezvisko')
    setProfileErrors(prev => ({ ...prev, [field]: error }))
  }

  const handleProfileChange = (field: keyof typeof profileForm, value: string) => {
    setProfileForm(prev => ({ ...prev, [field]: value }))
    if (profileErrors[field]) setProfileErrors(prev => ({ ...prev, [field]: '' }))
  }

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccess(null)

    const newErrors = {
      first_name: validateRequired(profileForm.first_name, 'Meno'),
      last_name: validateRequired(profileForm.last_name, 'Priezvisko'),
      email: validateEmail(profileForm.email),
    }
    setProfileErrors(newErrors)
    if (Object.values(newErrors).some(e => e)) return

    try {
      const updated = await apiClient.put<User>(API_ENDPOINTS.PROFILE_ME, profileForm)
      setUser(updated)
      setSuccess('Profil bol úspešne aktualizovaný')
    } catch {
      setError('Nepodarilo sa aktualizovať profil')
    }
  }

  const handlePasswordBlur = (field: keyof typeof passwordForm) => {
    let error = ''
    if (field === 'current_password') error = validateRequired(passwordForm.current_password, 'Aktuálne heslo')
    else if (field === 'new_password') error = validatePassword(passwordForm.new_password)
    else if (field === 'confirm_password') error = validatePasswordMatch(passwordForm.new_password, passwordForm.confirm_password)
    setPasswordErrors(prev => ({ ...prev, [field]: error }))
  }

  const handlePasswordChange = (field: keyof typeof passwordForm, value: string) => {
    setPasswordForm(prev => ({ ...prev, [field]: value }))
    if (passwordErrors[field]) setPasswordErrors(prev => ({ ...prev, [field]: '' }))
  }

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccess(null)

    const newErrors = {
      current_password: validateRequired(passwordForm.current_password, 'Aktuálne heslo'),
      new_password: validatePassword(passwordForm.new_password),
      confirm_password: validatePasswordMatch(passwordForm.new_password, passwordForm.confirm_password),
    }
    setPasswordErrors(newErrors)
    if (Object.values(newErrors).some(e => e)) return

    try {
      await apiClient.post(API_ENDPOINTS.PROFILE_CHANGE_PASSWORD, {
        current_password: passwordForm.current_password,
        new_password: passwordForm.new_password
      })
      setSuccess('Heslo bolo úspešne zmenené. Všetky ostatné relácie boli odhlásené.')
      setPasswordForm({ current_password: '', new_password: '', confirm_password: '' })
      setPasswordErrors({})
    } catch {
      setError('Nepodarilo sa zmeniť heslo')
    }
  }

  const inputClass = (hasError: boolean) =>
    `w-full px-3 py-2 rounded border ${hasError ? 'border-red-500' : ''} ${
      isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'
    }`

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>Načítavam...</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}
      {success && (
        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded">
          {success}
        </div>
      )}

      {/* Profile Info Section */}
      <div className={`rounded-lg p-6 ${isDarkMode ? 'bg-gray-800' : 'bg-white shadow'}`}>
        <h3 className={`text-xl font-semibold mb-4 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
          Osobné údaje
        </h3>

        <form onSubmit={handleUpdateProfile} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className={`block text-sm font-medium mb-1 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                Meno
              </label>
              <input
                type="text"
                value={profileForm.first_name}
                onChange={(e) => handleProfileChange('first_name', e.target.value)}
                onBlur={() => handleProfileBlur('first_name')}
                className={inputClass(!!profileErrors.first_name)}
              />
              {profileErrors.first_name && (
                <p className="text-sm text-red-500 mt-1">{profileErrors.first_name}</p>
              )}
            </div>

            <div>
              <label className={`block text-sm font-medium mb-1 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                Priezvisko
              </label>
              <input
                type="text"
                value={profileForm.last_name}
                onChange={(e) => handleProfileChange('last_name', e.target.value)}
                onBlur={() => handleProfileBlur('last_name')}
                className={inputClass(!!profileErrors.last_name)}
              />
              {profileErrors.last_name && (
                <p className="text-sm text-red-500 mt-1">{profileErrors.last_name}</p>
              )}
            </div>
          </div>

          <div>
            <label className={`block text-sm font-medium mb-1 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
              Email
            </label>
            <input
              type="email"
              value={profileForm.email}
              onChange={(e) => handleProfileChange('email', e.target.value)}
              onBlur={() => handleProfileBlur('email')}
              className={inputClass(!!profileErrors.email)}
            />
            {profileErrors.email && (
              <p className="text-sm text-red-500 mt-1">{profileErrors.email}</p>
            )}
          </div>

          <button
            type="submit"
            className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
          >
            Uložiť zmeny
          </button>
        </form>
      </div>

      {/* Password Change Section */}
      <div className={`rounded-lg p-6 ${isDarkMode ? 'bg-gray-800' : 'bg-white shadow'}`}>
        <h3 className={`text-xl font-semibold mb-4 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
          Zmena hesla
        </h3>

        <form onSubmit={handleChangePassword} className="space-y-4">
          <div>
            <label className={`block text-sm font-medium mb-1 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
              Aktuálne heslo
            </label>
            <input
              type="password"
              value={passwordForm.current_password}
              onChange={(e) => handlePasswordChange('current_password', e.target.value)}
              onBlur={() => handlePasswordBlur('current_password')}
              className={inputClass(!!passwordErrors.current_password)}
            />
            {passwordErrors.current_password && (
              <p className="text-sm text-red-500 mt-1">{passwordErrors.current_password}</p>
            )}
          </div>

          <div>
            <label className={`block text-sm font-medium mb-1 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
              Nové heslo
            </label>
            <input
              type="password"
              value={passwordForm.new_password}
              onChange={(e) => handlePasswordChange('new_password', e.target.value)}
              onBlur={() => handlePasswordBlur('new_password')}
              className={inputClass(!!passwordErrors.new_password)}
            />
            {passwordErrors.new_password && (
              <p className="text-sm text-red-500 mt-1">{passwordErrors.new_password}</p>
            )}
          </div>

          <div>
            <label className={`block text-sm font-medium mb-1 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
              Potvrdiť nové heslo
            </label>
            <input
              type="password"
              value={passwordForm.confirm_password}
              onChange={(e) => handlePasswordChange('confirm_password', e.target.value)}
              onBlur={() => handlePasswordBlur('confirm_password')}
              className={inputClass(!!passwordErrors.confirm_password)}
            />
            {passwordErrors.confirm_password && (
              <p className="text-sm text-red-500 mt-1">{passwordErrors.confirm_password}</p>
            )}
          </div>

          <button
            type="submit"
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Zmeniť heslo
          </button>
        </form>
      </div>
    </div>
  )
}
