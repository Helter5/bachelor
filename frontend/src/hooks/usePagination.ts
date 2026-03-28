import { useState, useMemo, useEffect } from "react"

interface UsePaginationProps<T> {
  items: T[]
  itemsPerPage?: number
  resetTriggers?: any[]
}

export function usePagination<T>({ 
  items, 
  itemsPerPage = 20,
  resetTriggers = []
}: UsePaginationProps<T>) {
  const [currentPage, setCurrentPage] = useState(1)

  // Reset to page 1 when dependencies change
  useEffect(() => {
    setCurrentPage(1)
  }, resetTriggers)

  const totalPages = Math.ceil(items.length / itemsPerPage)
  
  const currentItems = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage
    const endIndex = startIndex + itemsPerPage
    return items.slice(startIndex, endIndex)
  }, [items, currentPage, itemsPerPage])

  const goToPage = (page: number) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)))
  }

  const nextPage = () => {
    setCurrentPage(prev => Math.min(totalPages, prev + 1))
  }

  const previousPage = () => {
    setCurrentPage(prev => Math.max(1, prev - 1))
  }

  const resetPage = () => {
    setCurrentPage(1)
  }

  const canGoNext = currentPage < totalPages
  const canGoPrev = currentPage > 1

  return {
    currentPage,
    totalPages,
    currentItems,
    goToPage,
    nextPage,
    previousPage,
    resetPage,
    canGoNext,
    canGoPrev
  }
}
