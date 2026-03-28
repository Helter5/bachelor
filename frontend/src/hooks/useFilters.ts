import { useState, useMemo } from 'react'

interface UseFiltersOptions<T> {
  items: T[]
  searchFields?: (keyof T)[]
  filterFn?: (item: T, filters: Record<string, any>) => boolean
}

interface UseFiltersReturn<T> {
  filteredItems: T[]
  searchQuery: string
  setSearchQuery: (query: string) => void
  filters: Record<string, any>
  setFilter: (key: string, value: any) => void
  clearFilters: () => void
  hasActiveFilters: boolean
}

/**
 * Generic filtering and searching logic
 * @example
 * const { filteredItems, searchQuery, setSearchQuery, setFilter } = useFilters({
 *   items: athletes,
 *   searchFields: ['person_full_name'],
 *   filterFn: (athlete, filters) => {
 *     return !filters.country || athlete.country_iso_code === filters.country
 *   }
 * })
 */
export function useFilters<T>({
  items,
  searchFields = [],
  filterFn
}: UseFiltersOptions<T>): UseFiltersReturn<T> {
  const [searchQuery, setSearchQuery] = useState('')
  const [filters, setFilters] = useState<Record<string, any>>({})

  const filteredItems = useMemo(() => {
    let result = items

    // Apply search
    if (searchQuery && searchFields.length > 0) {
      const query = searchQuery.toLowerCase()
      result = result.filter(item => {
        return searchFields.some(field => {
          const value = item[field]
          return value && String(value).toLowerCase().includes(query)
        })
      })
    }

    // Apply custom filters
    if (filterFn) {
      result = result.filter(item => filterFn(item, filters))
    }

    return result
  }, [items, searchQuery, searchFields, filters, filterFn])

  const setFilter = (key: string, value: any) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }))
  }

  const clearFilters = () => {
    setSearchQuery('')
    setFilters({})
  }

  const hasActiveFilters = searchQuery !== '' || Object.keys(filters).some(key => filters[key])

  return {
    filteredItems,
    searchQuery,
    setSearchQuery,
    filters,
    setFilter,
    clearFilters,
    hasActiveFilters
  }
}
