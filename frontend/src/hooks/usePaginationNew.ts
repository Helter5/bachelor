import { useState, useMemo, useEffect } from 'react'

interface UsePaginationOptions<T> {
  items: T[]
  itemsPerPage?: number
  resetTriggers?: any[]
}

interface UsePaginationReturn<T> {
  currentPage: number
  totalPages: number
  currentItems: T[]
  goToPage: (page: number) => void
  nextPage: () => void
  prevPage: () => void
  canGoNext: boolean
  canGoPrev: boolean
  startIndex: number
  endIndex: number
}

/**
 * Reusable pagination logic
 * @example
 * const { currentItems, currentPage, totalPages, goToPage } = usePagination({
 *   items: athletes,
 *   itemsPerPage: 20,
 *   resetTriggers: [searchQuery, filter]
 * })
 */
export function usePagination<T>({
  items,
  itemsPerPage = 20,
  resetTriggers = []
}: UsePaginationOptions<T>): UsePaginationReturn<T> {
  const [currentPage, setCurrentPage] = useState(1)

  const totalPages = Math.ceil(items.length / itemsPerPage)
  
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage

  const currentItems = useMemo(() => {
    return items.slice(startIndex, endIndex)
  }, [items, startIndex, endIndex])

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1)
  }, resetTriggers)

  const goToPage = (page: number) => {
    const validPage = Math.max(1, Math.min(page, totalPages))
    setCurrentPage(validPage)
  }

  const nextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(prev => prev + 1)
    }
  }

  const prevPage = () => {
    if (currentPage > 1) {
      setCurrentPage(prev => prev - 1)
    }
  }

  return {
    currentPage,
    totalPages,
    currentItems,
    goToPage,
    nextPage,
    prevPage,
    canGoNext: currentPage < totalPages,
    canGoPrev: currentPage > 1,
    startIndex,
    endIndex: Math.min(endIndex, items.length)
  }
}
