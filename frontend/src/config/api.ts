// Production uses same-origin /api through the frontend Nginx proxy.
export const API_BASE_URL = import.meta.env.VITE_API_URL || ''
export const LOCAL_SYNC_AGENT_URL = import.meta.env.VITE_LOCAL_SYNC_AGENT_URL || 'http://127.0.0.1:8765'

export const API_ENDPOINTS = {
  AUTH_ME: '/api/v1/auth/me',
  AUTH_LOGIN: '/api/v1/auth/login',
  AUTH_REGISTER: '/api/v1/auth/register',
  AUTH_LOGOUT: '/api/v1/auth/logout',
  AUTH_REFRESH: '/api/v1/auth/refresh',
  AUTH_VERIFY_EMAIL: (token: string) => `/api/v1/auth/verify-email/${token}`,
  AUTH_RESEND_VERIFICATION: '/api/v1/auth/resend-verification',
  AUTH_FORGOT_PASSWORD: '/api/v1/auth/forgot-password',
  AUTH_RESET_PASSWORD: (token: string) => `/api/v1/auth/reset-password/${token}`,
  AUTH_GOOGLE: '/api/v1/auth/google',

  SPORT_EVENT: '/api/v1/events',
  SPORT_EVENT_DATABASE: '/api/v1/events',
  SPORT_EVENT_SYNC: '/api/v1/admin/sync/events',
  SPORT_EVENT_DETAILS: (id: string) => `/api/v1/events/${id}`,

  TEAM_SYNC: (eventId: number) => `/api/v1/admin/sync/teams/${eventId}`,
  TEAM_DATABASE: (eventId: number) => `/api/v1/teams?event_id=${eventId}`,
  TEAM_PRINT: (eventUuid: string) => `/api/v1/events/${eventUuid}/exports/teams-list`,
  TEAM_SHOW: (eventUuid: string) => `/api/v1/events/${eventUuid}/exports/teams-list`,

  WEIGHT_CATEGORY_SYNC: (eventId: number) => `/api/v1/admin/sync/categories/${eventId}`,
  WEIGHT_CATEGORY_DATABASE: (eventId: number) => `/api/v1/events/${eventId}/categories`,

  ATHLETE_SYNC: (eventId: number) => `/api/v1/admin/sync/athletes/${eventId}`,
  ATHLETES: '/api/v1/athletes',
  ATHLETE_DATABASE: (eventId: number) => `/api/v1/athletes?event_id=${eventId}`,
  ATHLETE_DATABASE_ALL: '/api/v1/athletes',
  ATHLETE_DATABASE_BY_TEAM: (eventId: number, teamId: number) => `/api/v1/athletes?event_id=${eventId}&team_id=${teamId}`,
  ATHLETE_PRINT: (eventUuid: string) => `/api/v1/events/${eventUuid}/exports/athletes-list`,
  ATHLETE_SHOW: (eventUuid: string) => `/api/v1/events/${eventUuid}/exports/athletes-list`,

  REFEREE_SYNC: (eventId: number) => `/api/v1/admin/sync/referees/${eventId}`,
  REFEREES: (eventId: number) => `/api/v1/referees?event_id=${eventId}`,

  RESULTS: (eventUuid: string) => `/api/v1/results/${eventUuid}`,

  FIGHT_SYNC: (eventId: number) => `/api/v1/admin/sync/fights/${eventId}`,

  ARENA_SOURCES: '/api/v1/admin/arena-sources',

  SYNC_LOGS: '/api/v1/admin/sync-logs',
  SYNC_LOG_DETAIL: (logId: number) => `/api/v1/admin/sync-logs/${logId}`,
  SYNC_LOG_UPDATE_STATS: (logId: number) => `/api/v1/admin/sync-logs/${logId}/stats`,
  LOCAL_SYNC_START: '/api/v1/admin/local-sync/start',

  PERSONS: '/api/v1/persons',
  PERSON_DETAIL: (personId: number) => `/api/v1/persons/${personId}`,
  PERSON_FIGHTS: (personId: number) => `/api/v1/persons/${personId}/fights`,
  PERSON_OPPONENTS: (personId: number) => `/api/v1/persons/${personId}/opponents`,
  PERSON_COMMON_OPPONENT_CANDIDATES: (personId: number) => `/api/v1/persons/${personId}/common-opponent-candidates`,
  PERSON_COMPARE: (person1Id: number, person2Id: number, includeFights = false, includeCommonOpponents = false) => `/api/v1/persons/compare?person1_id=${person1Id}&person2_id=${person2Id}${includeFights ? '&include_fights=true' : ''}${includeCommonOpponents ? '&include_common_opponents=true' : ''}`,

  RANKING_CATEGORIES: '/api/v1/rankings/categories',
  RANKINGS: (weightCategory: string, lastN: number = 3, dateFrom?: string) =>
    `/api/v1/rankings?weight_category=${encodeURIComponent(weightCategory)}&last_n=${lastN}${dateFrom ? `&date_from=${dateFrom}` : ''}`,

  EVENT_STATISTICS: (eventId: number) => `/api/v1/events/${eventId}/statistics`,

  EVENT_EXPORT_MEDAL_STANDINGS: (eventUuid: string) => `/api/v1/events/${eventUuid}/exports/medal-standings`,
  EVENT_EXPORT_RESULTS_SUMMARY: (eventUuid: string) => `/api/v1/events/${eventUuid}/exports/results-summary`,
  EVENT_EXPORT_STATISTICS: (eventUuid: string) => `/api/v1/events/${eventUuid}/exports/statistics`,

  DRAW: (eventId: number, weightCategoryId: number, lastN: number = 3) =>
    `/api/v1/draw/${eventId}/${weightCategoryId}?last_n=${lastN}`,

  PROFILE_ME: '/api/v1/profile/me',
  PROFILE_CHANGE_PASSWORD: '/api/v1/profile/change-password',
  PROFILE_UPLOAD_AVATAR: '/api/v1/profile/upload-avatar',
  PROFILE_DELETE_AVATAR: '/api/v1/profile/avatar',
  PROFILE_SESSIONS: '/api/v1/profile/sessions',
  PROFILE_REVOKE_SESSION: (sessionId: number) => `/api/v1/profile/sessions/${sessionId}`,
  PROFILE_REVOKE_ALL_SESSIONS: '/api/v1/profile/sessions/revoke-all',
  PROFILE_LOGIN_HISTORY: '/api/v1/profile/login-history',
} as const
