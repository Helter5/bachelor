export function formatDuration(seconds: number): string {
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`
}

export function pluralizeSk(n: number, singular: string, few: string, many: string): string {
  if (n === 1) return singular
  if (n >= 2 && n <= 4) return few
  return many
}
