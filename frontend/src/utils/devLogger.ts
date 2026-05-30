/**
 * Development-only logger. Calls become no-ops in production builds so
 * internal error messages, API paths, and user identifiers do not leak into
 * the browser console of deployed clients.
 *
 * Use these instead of bare `console.error` / `console.warn` in app code.
 * The `ErrorBoundary` keeps its raw `console.error` since that message is
 * what helps debug catastrophic render failures.
 */

const isDev = import.meta.env.DEV

export const devError = (...args: unknown[]): void => {
  if (isDev) {
    // eslint-disable-next-line no-console
    console.error(...args)
  }
}

export const devWarn = (...args: unknown[]): void => {
  if (isDev) {
    // eslint-disable-next-line no-console
    console.warn(...args)
  }
}
