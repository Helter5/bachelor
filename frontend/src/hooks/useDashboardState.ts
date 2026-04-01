import { useState, useCallback, useEffect } from 'react'
import i18n from '@/i18n'

const SUPPORTED_LOCALES = new Set(['sk', 'en'])
const DEFAULT_LOCALE = 'sk'
const DASHBOARD_SEGMENT = 'dashboard'
const VALID_SECTIONS = new Set(['home', 'tournaments', 'athletes', 'stats', 'fighters', 'settings', 'logs'])

interface TournamentDetail {
  id: number
  uuid: string
  name: string
  start_date: string
  end_date?: string
}

interface SelectedPerson {
  id: number
  name: string
}

interface DashboardState {
  activeSection: string
  isMobileMenuOpen: boolean
  showDetailsMobile: boolean
  selectedTournament: TournamentDetail | null
  selectedPerson: SelectedPerson | null
}

function getPathSegments() {
  return window.location.pathname.split('/').filter(Boolean)
}

function getLocaleFromPath() {
  const first = getPathSegments()[0]?.toLowerCase()
  return first && SUPPORTED_LOCALES.has(first) ? first : null
}

function getCurrentLocale() {
  const fromPath = getLocaleFromPath()
  if (fromPath) return fromPath

  const resolved = (i18n.resolvedLanguage || i18n.language || DEFAULT_LOCALE).toLowerCase().split('-')[0]
  return SUPPORTED_LOCALES.has(resolved) ? resolved : DEFAULT_LOCALE
}

function getPathSegmentsWithoutLocale() {
  const segments = getPathSegments()
  if (segments[0] && SUPPORTED_LOCALES.has(segments[0].toLowerCase())) {
    return segments.slice(1)
  }
  return segments
}

function buildPath(section: string, locale = getCurrentLocale()) {
  const basePath = `/${locale}/${DASHBOARD_SEGMENT}`
  return section === 'home' ? basePath : `${basePath}/${section}`
}

function appendQuery(path: string, params: URLSearchParams) {
  const query = params.toString()
  return query ? `${path}?${query}` : path
}

function parseLocationState() {
  const params = new URLSearchParams(window.location.search)
  const segments = getPathSegmentsWithoutLocale()

  let section = 'home'
  let tournamentId: number | null = null
  let personId: number | null = null

  const dashboardIndex = segments.indexOf(DASHBOARD_SEGMENT)
  const rootIndex = dashboardIndex >= 0 ? dashboardIndex + 1 : 0

  const sectionFromPath = segments[rootIndex]
  if (sectionFromPath && VALID_SECTIONS.has(sectionFromPath)) {
    section = sectionFromPath
  } else if (sectionFromPath === undefined && segments.length > 0 && dashboardIndex >= 0) {
    section = 'home'
  }

  if (section === 'tournaments') {
    const tournamentFromPath = segments[rootIndex + 1]
    if (tournamentFromPath && /^\d+$/.test(tournamentFromPath)) {
      tournamentId = Number(tournamentFromPath)
    }
  }

  const personSegmentIndex = segments.indexOf('person')
  if (personSegmentIndex >= 0) {
    const personValue = segments[personSegmentIndex + 1]
    if (personValue && /^\d+$/.test(personValue)) {
      personId = Number(personValue)
    }
  }

  // Backward compatibility for existing query links
  if (params.get('section') && VALID_SECTIONS.has(params.get('section') as string)) {
    section = params.get('section') as string
  }
  if (!tournamentId && params.get('tournament')) {
    tournamentId = Number(params.get('tournament'))
  }
  if (!personId && params.get('person')) {
    personId = Number(params.get('person'))
  }

  return { section, tournamentId, personId }
}

export function useDashboardState() {
  const [state, setState] = useState<DashboardState>(() => {
    const { section, personId } = parseLocationState()
    return {
      activeSection: section,
      isMobileMenuOpen: false,
      showDetailsMobile: false,
      selectedTournament: null,
      selectedPerson: personId ? { id: personId, name: '' } : null
    }
  })

  // Handle browser back/forward navigation
  useEffect(() => {
    const handlePopState = () => {
      const { section, personId, tournamentId } = parseLocationState()
      const locale = getLocaleFromPath()
      if (locale && i18n.resolvedLanguage !== locale) {
        i18n.changeLanguage(locale)
      }

      setState(prev => ({
        ...prev,
        activeSection: section,
        selectedTournament: tournamentId && prev.selectedTournament?.id === tournamentId ? prev.selectedTournament : null,
        selectedPerson: personId ? { id: personId, name: '' } : null
      }))
    }

    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [])

  const setActiveSection = useCallback((section: string) => {
    window.history.pushState({}, '', buildPath(section))

    setState(prev => ({ ...prev, activeSection: section, selectedTournament: null, selectedPerson: null }))
  }, [])

  const selectTournament = useCallback((tournament: TournamentDetail) => {
    window.history.pushState({}, '', `${buildPath('tournaments')}/${tournament.id}`)

    setState(prev => ({ ...prev, activeSection: 'tournaments', selectedTournament: tournament, selectedPerson: null }))
  }, [])

  const clearTournamentSelection = useCallback(() => {
    window.history.pushState({}, '', buildPath('tournaments'))

    setState(prev => ({ ...prev, selectedTournament: null }))
  }, [])

  const selectPerson = useCallback((person: SelectedPerson) => {
    const params = new URLSearchParams(window.location.search)
    const pathnameWithoutPerson = window.location.pathname.replace(/\/person\/\d+\/?$/, '')
    const fallbackSection = state.activeSection === 'home' ? 'stats' : state.activeSection
    const localeDashboardPrefix = `/${getCurrentLocale()}/${DASHBOARD_SEGMENT}`
    const legacyDashboardPrefix = `/${DASHBOARD_SEGMENT}`
    const basePath = pathnameWithoutPerson.startsWith(localeDashboardPrefix) || pathnameWithoutPerson.startsWith(legacyDashboardPrefix)
      ? pathnameWithoutPerson
      : buildPath(fallbackSection)
    const nextPath = `${basePath}/person/${person.id}`
    window.history.pushState({}, '', appendQuery(nextPath, params))

    setState(prev => ({ ...prev, selectedPerson: person }))
  }, [state.activeSection])

  const clearPersonSelection = useCallback(() => {
    const params = new URLSearchParams(window.location.search)
    params.delete('person')
    const nextPath = window.location.pathname.replace(/\/person\/\d+\/?$/, '') || buildPath(state.activeSection)
    window.history.pushState({}, '', appendQuery(nextPath, params))

    setState(prev => ({ ...prev, selectedPerson: null }))
  }, [state.activeSection])

  const toggleMobileMenu = useCallback(() => {
    setState(prev => ({ ...prev, isMobileMenuOpen: !prev.isMobileMenuOpen }))
  }, [])

  const closeMobileMenu = useCallback(() => {
    setState(prev => ({ ...prev, isMobileMenuOpen: false }))
  }, [])

  const toggleDetailsMobile = useCallback(() => {
    setState(prev => ({ ...prev, showDetailsMobile: !prev.showDetailsMobile }))
  }, [])

  return {
    state,
    setActiveSection,
    selectTournament,
    clearTournamentSelection,
    selectPerson,
    clearPersonSelection,
    toggleMobileMenu,
    closeMobileMenu,
    toggleDetailsMobile,
  }
}
