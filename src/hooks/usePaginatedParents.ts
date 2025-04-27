// src/hooks/usePaginatedParents.ts
import { useState, useCallback, useEffect } from 'react';
import { useQuery, keepPreviousData, useQueryClient } from '@tanstack/react-query'; // Added useQueryClient

// Import the Supabase-backed API function and types
import { fetchParents } from '../api/users'; // Changed API function
import { User } from '../types/dataTypes';

// Interface for the hook's return value remains the same
interface UsePaginatedParentsReturn {
  parents: User[]; // Changed property name for clarity
  currentPage: number;
  totalPages: number;
  totalItems: number;
  setPage: (page: number) => void;
  isLoading: boolean;
  isFetching: boolean;
  isPlaceholderData: boolean;
  isError: boolean;
  error: Error | null;
}

// Production-ready default page size
const ITEMS_PER_PAGE = 20; // Consistent page size

export const usePaginatedParents = (): UsePaginatedParentsReturn => {
  const queryClient = useQueryClient(); // Get query client instance
  const [currentPage, setCurrentPage] = useState(1);

  // Define the query key incorporating pagination parameters
  const queryKey = ['parents', { page: currentPage, limit: ITEMS_PER_PAGE }]; // Changed query key root

  const queryResult = useQuery({
    queryKey: queryKey,
    queryFn: () => fetchParents({ page: currentPage, limit: ITEMS_PER_PAGE }), // Call fetchParents
    placeholderData: keepPreviousData,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
    gcTime: 10 * 60 * 1000,
  });

  const { data, isLoading, isFetching, isError, error, isPlaceholderData } = queryResult;

  // Extract data or default to empty values
  const parents = data?.items ?? []; // Assuming fetchParents returns { items: User[] }
  const totalPages = data?.totalPages ?? 1;
  const totalItems = data?.totalItems ?? 0;

  // --- Prefetching Logic (Optional) ---
  useEffect(() => {
    const effectiveTotalPages = totalPages >= 1 ? totalPages : 1;
    // Prefetch the next page
    if (!isPlaceholderData && currentPage < effectiveTotalPages && !isFetching) {
      const nextQueryKey = ['parents', { page: currentPage + 1, limit: ITEMS_PER_PAGE }];
      console.log(`[usePaginatedParents] Prefetching next page: ${currentPage + 1}`);
      queryClient.prefetchQuery({
        queryKey: nextQueryKey,
        queryFn: () => fetchParents({ page: currentPage + 1, limit: ITEMS_PER_PAGE }),
        staleTime: 5 * 60 * 1000,
      });
    }
     // Prefetch the previous page
     if (!isPlaceholderData && currentPage > 1 && !isFetching) {
        const prevQueryKey = ['parents', { page: currentPage - 1, limit: ITEMS_PER_PAGE }];
        console.log(`[usePaginatedParents] Prefetching previous page: ${currentPage - 1}`);
        queryClient.prefetchQuery({
            queryKey: prevQueryKey,
            queryFn: () => fetchParents({ page: currentPage - 1, limit: ITEMS_PER_PAGE }),
            staleTime: 5 * 60 * 1000,
        });
     }
  }, [currentPage, totalPages, isPlaceholderData, isFetching, queryClient]);
  // --- End Prefetching Logic ---

  // Callback to change the current page
  const setPage = useCallback(
    (page: number) => {
      console.log(`[usePaginatedParents] setPage called with: ${page}`);
      let targetPage = page;
      const effectiveTotalPages = totalPages >= 1 ? totalPages : 1;
      if (page < 1) {
        targetPage = 1;
      } else if (page > effectiveTotalPages) {
        targetPage = effectiveTotalPages;
      }
      if (targetPage !== currentPage) {
          console.log(`[usePaginatedParents] Setting current page to: ${targetPage}`);
          setCurrentPage(targetPage);
      } else {
           console.log(`[usePaginatedParents] Already on page ${targetPage}, not changing.`);
      }
    },
    [totalPages, currentPage] // Add currentPage dependency
  );

  // Return the hook's state and setters
  return {
    parents, // Changed return property name
    currentPage,
    totalPages,
    totalItems,
    setPage,
    isLoading,
    isFetching,
    isPlaceholderData,
    isError,
    error: error instanceof Error ? error : null,
  };
};