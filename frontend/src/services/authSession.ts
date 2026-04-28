const AUTH_SESSION_HINT_KEY = "auth_session_hint"

export function hasAuthSessionHint(): boolean {
  return localStorage.getItem(AUTH_SESSION_HINT_KEY) === "true"
}

export function setAuthSessionHint(): void {
  localStorage.setItem(AUTH_SESSION_HINT_KEY, "true")
}

export function clearAuthSessionHint(): void {
  localStorage.removeItem(AUTH_SESSION_HINT_KEY)
}
