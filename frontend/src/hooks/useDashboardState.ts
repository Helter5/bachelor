import { useState, useCallback, useEffect } from 'react'

const DASHBOARD_BASE_PATH = '/dashboard'
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

function buildPath(section: string) {
  return section === 'home' ? DASHBOARD_BASE_PATH : `${DASHBOARD_BASE_PATH}/${section}`
}

function appendQuery(path: string, params: URLSearchParams) {
  const query = params.toString()
  return query ? `${path}?${query}` : path
}

function parseLocationState() {
  const params = new URLSearchParams(window.location.search)
  const segments = getPathSegments()

  let section = 'home'
  let tournamentId: number | null = null
  let personId: number | null = null

  const dashboardIndex = segments.indexOf('dashboard')
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
    const basePath = pathnameWithoutPerson.startsWith(DASHBOARD_BASE_PATH)
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
