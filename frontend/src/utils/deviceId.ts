/**
 * Device ID generator for tracking unique devices
 * Note: This is not a real MAC address (not accessible via browser)
 * but a device fingerprint that serves similar purpose
 */

function generateHash(str: string): string {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = (hash << 5) - hash + char
    hash = hash & hash
  }
  return Math.abs(hash).toString(16)
}

export function getDeviceId(): string {
  const STORAGE_KEY = 'device_id'

  // Check if device ID already exists in localStorage
  const stored = localStorage.getItem(STORAGE_KEY)
  if (stored) {
    return stored
  }

  // Generate device fingerprint from browser properties
  const fingerprint = [
    navigator.userAgent,
    navigator.language,
    screen.width + 'x' + screen.height,
    screen.colorDepth,
    new Date().getTimezoneOffset(),
    navigator.platform,
    navigator.hardwareConcurrency || 0,
  ].join('|')

  // Create a hash from the fingerprint
  const deviceId = generateHash(fingerprint)

  // Store for future use
  localStorage.setItem(STORAGE_KEY, deviceId)

  return deviceId
}
