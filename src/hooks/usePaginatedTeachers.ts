// src/hooks/usePaginatedTeachers.ts
import { useState, useCallback, useEffect } from 'react';
import { useQuery, keepPreviousData, useQueryClient } from '@tanstack/react-query'; // Added useQueryClient

// Import the Supabase-backed API function and types
import { fetchTeachers } from '../api/users';
import { User } from '../types/dataTypes';

// Interface for the hook's return value remains the same
interface UsePaginatedTeachersReturn {
  teachers: User[];
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

export const usePaginatedTeachers = (): UsePaginatedTeachersReturn => {
  const queryClient = useQueryClient(); // Get query client instance
  const [currentPage, setCurrentPage] = useState(1);

  // Define the query key incorporating pagination parameters
  const queryKey = ['teachers', { page: currentPage, limit: ITEMS_PER_PAGE }];

  const queryResult = useQuery({
    queryKey: queryKey,
    queryFn: () => fetchTeachers({ page: currentPage, limit: ITEMS_PER_PAGE }), // Call Supabase API
    placeholderData: keepPreviousData,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
    gcTime: 10 * 60 * 1000,
  });

  const { data, isLoading, isFetching, isError, error, isPlaceholderData } = queryResult;

  // Extract data or default to empty values
  const teachers = data?.items ?? []; // Assuming fetchTeachers returns { items: User[] }
  const totalPages = data?.totalPages ?? 1;
  const totalItems = data?.totalItems ?? 0;

  // --- Prefetching Logic (Optional) ---
  useEffect(() => {
    const effectiveTotalPages = totalPages >= 1 ? totalPages : 1;
    // Prefetch the next page
    if (!isPlaceholderData && currentPage < effectiveTotalPages && !isFetching) {
      const nextQueryKey = ['teachers', { page: currentPage + 1, limit: ITEMS_PER_PAGE }];
      console.log(`[usePaginatedTeachers] Prefetching next page: ${currentPage + 1}`);
      queryClient.prefetchQuery({
        queryKey: nextQueryKey,
        queryFn: () => fetchTeachers({ page: currentPage + 1, limit: ITEMS_PER_PAGE }),
        staleTime: 5 * 60 * 1000,
      });
    }
     // Prefetch the previous page
     if (!isPlaceholderData && currentPage > 1 && !isFetching) {
        const prevQueryKey = ['teachers', { page: currentPage - 1, limit: ITEMS_PER_PAGE }];
        console.log(`[usePaginatedTeachers] Prefetching previous page: ${currentPage - 1}`);
        queryClient.prefetchQuery({
            queryKey: prevQueryKey,
            queryFn: () => fetchTeachers({ page: currentPage - 1, limit: ITEMS_PER_PAGE }),
            staleTime: 5 * 60 * 1000,
        });
     }
  }, [currentPage, totalPages, isPlaceholderData, isFetching, queryClient]);
  // --- End Prefetching Logic ---

  // Callback to change the current page
  const setPage = useCallback(
    (page: number) => {
      console.log(`[usePaginatedTeachers] setPage called with: ${page}`);
      let targetPage = page;
      const effectiveTotalPages = totalPages >= 1 ? totalPages : 1;
      if (page < 1) {
        targetPage = 1;
      } else if (page > effectiveTotalPages) {
        targetPage = effectiveTotalPages;
      }
      if (targetPage !== currentPage) {
          console.log(`[usePaginatedTeachers] Setting current page to: ${targetPage}`);
          setCurrentPage(targetPage);
      } else {
           console.log(`[usePaginatedTeachers] Already on page ${targetPage}, not changing.`);
      }
    },
    [totalPages, currentPage] // Add currentPage dependency
  );

  // Return the hook's state and setters
  return {
    teachers,
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