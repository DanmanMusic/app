// src/hooks/usePaginatedStudents.ts
import { useState, useCallback, useEffect } from 'react';
import { useQuery, keepPreviousData, useQueryClient } from '@tanstack/react-query'; // Added useQueryClient

// Import the Supabase-backed API function and types
import { fetchStudents } from '../api/users';
import { SimplifiedStudent, UserStatus } from '../types/dataTypes';

// Interface for the hook's return value remains the same
export interface UsePaginatedStudentsReturn {
  students: SimplifiedStudent[];
  currentPage: number;
  totalPages: number;
  totalItems: number;
  setPage: (page: number) => void;
  currentFilter: UserStatus | 'all';
  setFilter: (filter: UserStatus | 'all') => void;
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  isLoading: boolean; // Represents initial load
  isFetching: boolean; // Represents any fetch (initial or subsequent)
  isPlaceholderData: boolean; // From keepPreviousData
  isError: boolean;
  error: Error | null;
}

// Production-ready default page size
const ITEMS_PER_PAGE = 20; // Increased from typical mock value

export const usePaginatedStudents = (): UsePaginatedStudentsReturn => {
  const queryClient = useQueryClient(); // Get query client instance
  const [currentPage, setCurrentPage] = useState(1);
  const [currentFilter, setFilter] = useState<UserStatus | 'all'>('active'); // Default filter
  const [searchTerm, setSearchTerm] = useState('');

  // Define the query key incorporating all parameters that affect the query
  const queryKey = ['students', { page: currentPage, limit: ITEMS_PER_PAGE, filter: currentFilter, search: searchTerm }];

  const queryResult = useQuery({
    queryKey: queryKey, // Use the defined query key
    queryFn: () => fetchStudents({ // Call the Supabase-backed API function
        page: currentPage,
        limit: ITEMS_PER_PAGE,
        filter: currentFilter,
        searchTerm: searchTerm
    }),
    placeholderData: keepPreviousData, // Keep displaying old data while fetching new
    staleTime: 5 * 60 * 1000, // Data is considered fresh for 5 minutes
    gcTime: 10 * 60 * 1000, // Cache garbage collection time
  });

  const { data, isLoading, isFetching, isError, error, isPlaceholderData } = queryResult;

  // Extract data or default to empty values
  const students = data?.students ?? [];
  const totalPages = data?.totalPages ?? 1;
  const totalItems = data?.totalItems ?? 0;

  // Effect to reset page to 1 when filters or search term change
  useEffect(() => {
    // Only reset if not already on page 1
    if (currentPage !== 1) {
        console.log(`[usePaginatedStudents] Filter or Search changed, resetting page to 1.`);
        setCurrentPage(1);
    }
    // No need to refetch here, the query key change triggers it
  }, [currentFilter, searchTerm]); // Depend on filter and search term


  // --- Prefetching Logic (Optional but good for UX) ---
  useEffect(() => {
    const effectiveTotalPages = totalPages >= 1 ? totalPages : 1;
    // Prefetch the next page if not on the last page and not currently fetching
    if (!isPlaceholderData && currentPage < effectiveTotalPages && !isFetching) {
        const nextQueryKey = ['students', { page: currentPage + 1, limit: ITEMS_PER_PAGE, filter: currentFilter, search: searchTerm }];
        console.log(`[usePaginatedStudents] Prefetching next page: ${currentPage + 1}`);
        queryClient.prefetchQuery({
            queryKey: nextQueryKey,
            queryFn: () => fetchStudents({ page: currentPage + 1, limit: ITEMS_PER_PAGE, filter: currentFilter, searchTerm: searchTerm }),
            staleTime: 5 * 60 * 1000, // Use same stale time
        });
    }
    // Prefetch the previous page if not on the first page and not currently fetching
    if (!isPlaceholderData && currentPage > 1 && !isFetching) {
       const prevQueryKey = ['students', { page: currentPage - 1, limit: ITEMS_PER_PAGE, filter: currentFilter, search: searchTerm }];
        console.log(`[usePaginatedStudents] Prefetching previous page: ${currentPage - 1}`);
        queryClient.prefetchQuery({
             queryKey: prevQueryKey,
             queryFn: () => fetchStudents({ page: currentPage - 1, limit: ITEMS_PER_PAGE, filter: currentFilter, searchTerm: searchTerm }),
             staleTime: 5 * 60 * 1000,
        });
    }
  }, [currentPage, totalPages, isPlaceholderData, isFetching, currentFilter, searchTerm, queryClient]);
  // --- End Prefetching Logic ---


  // Callback to change the current page, ensuring bounds are respected
  const setPage = useCallback(
    (page: number) => {
      console.log(`[usePaginatedStudents] setPage called with: ${page}`);
      let targetPage = page;
      const effectiveTotalPages = totalPages >= 1 ? totalPages : 1; // Ensure at least 1 page
      if (page < 1) {
        targetPage = 1;
      } else if (page > effectiveTotalPages) {
        targetPage = effectiveTotalPages;
      }
      if (targetPage !== currentPage) {
          console.log(`[usePaginatedStudents] Setting current page to: ${targetPage}`);
          setCurrentPage(targetPage);
      } else {
           console.log(`[usePaginatedStudents] Already on page ${targetPage}, not changing.`);
      }
    },
    [totalPages, currentPage] // Add currentPage dependency
  );

  // Return the hook's state and setters
  return {
    students,
    currentPage,
    totalPages,
    totalItems,
    setPage,
    currentFilter,
    setFilter, // Expose setter for filter
    searchTerm,
    setSearchTerm, // Expose setter for search term
    isLoading, // True only on initial load without cached/placeholder data
    isFetching, // True whenever a fetch is in progress
    isPlaceholderData, // True if showing stale data while fetching
    isError,
    error: error instanceof Error ? error : null, // Ensure error is Error object or null
  };
};