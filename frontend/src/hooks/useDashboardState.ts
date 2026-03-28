import { useState, useCallback, useEffect } from 'react'

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

export function useDashboardState() {
  const [state, setState] = useState<DashboardState>(() => {
    // Initialize from URL params
    const params = new URLSearchParams(window.location.search)
    const section = params.get('section') || 'home'
    return {
      activeSection: section,
      isMobileMenuOpen: false,
      showDetailsMobile: false,
      selectedTournament: null,
      selectedPerson: null
    }
  })

  // Handle browser back/forward navigation
  useEffect(() => {
    const handlePopState = () => {
      const params = new URLSearchParams(window.location.search)
      const section = params.get('section') || 'home'
      const personId = params.get('person')
      setState(prev => ({
        ...prev,
        activeSection: section,
        selectedTournament: null,
        selectedPerson: personId ? { id: Number(personId), name: '' } : null
      }))
    }

    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [])

  const setActiveSection = useCallback((section: string) => {
    // Build clean URL with only the section param
    const params = new URLSearchParams()
    if (section !== 'home') {
      params.set('section', section)
    }
    const newUrl = params.toString() ? `?${params.toString()}` : window.location.pathname
    window.history.pushState({}, '', newUrl)

    setState(prev => ({ ...prev, activeSection: section, selectedTournament: null, selectedPerson: null }))
  }, [])

  const selectTournament = useCallback((tournament: TournamentDetail) => {
    // Add tournament to URL
    const params = new URLSearchParams(window.location.search)
    params.set('tournament', tournament.id.toString())
    window.history.pushState({}, '', `?${params.toString()}`)

    setState(prev => ({ ...prev, selectedTournament: tournament }))
  }, [])

  const clearTournamentSelection = useCallback(() => {
    // Remove tournament from URL
    const params = new URLSearchParams(window.location.search)
    params.delete('tournament')
    const newUrl = params.toString() ? `?${params.toString()}` : window.location.pathname
    window.history.pushState({}, '', newUrl)

    setState(prev => ({ ...prev, selectedTournament: null }))
  }, [])

  const selectPerson = useCallback((person: SelectedPerson) => {
    const params = new URLSearchParams(window.location.search)
    const currentSection = params.get('section') || 'stats'
    params.set('section', currentSection)
    params.set('person', person.id.toString())
    window.history.pushState({}, '', `?${params.toString()}`)

    setState(prev => ({ ...prev, selectedPerson: person }))
  }, [])

  const clearPersonSelection = useCallback(() => {
    const params = new URLSearchParams(window.location.search)
    params.delete('person')
    const newUrl = params.toString() ? `?${params.toString()}` : window.location.pathname
    window.history.pushState({}, '', newUrl)

    setState(prev => ({ ...prev, selectedPerson: null }))
  }, [])

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
