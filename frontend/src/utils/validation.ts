export const validateRequired = (value: string, label: string): string => {
  if (!value.trim()) return `${label} je povinné`
  return ''
}

export const validateEmail = (value: string): string => {
  if (!value.trim()) return 'E-mail je povinný'
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return 'Neplatný formát e-mailu'
  return ''
}

export const validatePassword = (value: string): string => {
  if (!value) return 'Heslo je povinné'
  if (value.length < 6) return 'Heslo musí mať aspoň 6 znakov'
  return ''
}

export const validatePasswordMatch = (password: string, confirm: string): string => {
  if (!confirm) return 'Zopakujte heslo'
  if (password !== confirm) return 'Heslá sa nezhodujú'
  return ''
}

export const validateUsername = (value: string): string => {
  if (!value.trim()) return 'Prihlasovacie meno je povinné'
  if (value.trim().length < 4) return 'Prihlasovacie meno musí mať aspoň 4 znaky'
  return ''
}
