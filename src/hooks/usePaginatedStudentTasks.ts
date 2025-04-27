// src/hooks/usePaginatedStudentTasks.ts
import { useState, useCallback, useEffect } from 'react';
import { useQuery, keepPreviousData, useQueryClient } from '@tanstack/react-query'; // Added useQueryClient

// Import the Supabase-backed API function and types
import { fetchAssignedTasks, StudentTaskFilterStatusAPI, TaskAssignmentFilterStatusAPI } from '../api/assignedTasks';
import { AssignedTask } from '../types/dataTypes';

// Types for filters aren't strictly needed here as we use 'all'
// export type TaskAssignmentFilterStatus = 'all' | 'assigned' | 'pending' | 'completed';
// export type StudentTaskFilterStatus = 'active' | 'inactive' | 'all';

// Interface for the hook's return value remains the same
// Added totalItems for consistency, renaming totalTasksCount
export interface UsePaginatedStudentTasksReturn {
  tasks: AssignedTask[];
  currentPage: number;
  totalPages: number;
  totalItems: number; // Use totalItems for consistency
  setPage: (page: number) => void;
  isLoading: boolean;
  isFetching: boolean;
  isPlaceholderData: boolean;
  isError: boolean;
  error: Error | null;
  // totalTasksCount: number; // Removed, use totalItems instead
}

// Page size for task lists within student view (can be smaller)
const ITEMS_PER_PAGE = 10; // Adjusted from 5

export const usePaginatedStudentTasks = (
  studentId: string | null | undefined // Hook requires the specific student's ID
): UsePaginatedStudentTasksReturn => {
  const queryClient = useQueryClient();
  const [currentPage, setCurrentPage] = useState(1);

  // Define the query key, dependent on the specific studentId and pagination
  const queryKey = [
    'assigned-tasks', // Use the same base key as the admin hook
    { // Parameters specific to this hook's usage
      studentId: studentId,
      page: currentPage,
      limit: ITEMS_PER_PAGE,
      // Default other filters to 'all' as this hook shows *all* tasks for *one* student
      assignmentStatus: 'all',
      studentStatus: 'all',
    },
  ];

  const queryResult = useQuery({
    queryKey: queryKey,
    queryFn: () => fetchAssignedTasks({ // Use the Supabase API function
        studentId: studentId ?? undefined, // Ensure studentId is passed
        page: currentPage,
        limit: ITEMS_PER_PAGE,
        assignmentStatus: 'all', // Always fetch all statuses for this student view
        studentStatus: 'all',    // Student status filter not needed when fetching for one student
      }),
    // Only run the query if a valid studentId is provided
    enabled: !!studentId,
    placeholderData: keepPreviousData,
    staleTime: 1 * 60 * 1000, // Tasks might change, shorter stale time
    gcTime: 5 * 60 * 1000,
  });

  const { data, isLoading, isFetching, isError, error, isPlaceholderData } = queryResult;

  // Extract data or default
  const tasks = data?.items ?? [];
  const totalPages = data?.totalPages ?? 1;
  const totalItems = data?.totalItems ?? 0; // Use totalItems

  // Effect to reset page to 1 if the studentId changes
  useEffect(() => {
    if (currentPage !== 1) {
      console.log(`[usePaginatedStudentTasks] studentId changed to ${studentId}, resetting page to 1.`);
      setCurrentPage(1);
    }
    // Query refetches automatically due to queryKey change
  }, [studentId]); // Only depends on studentId


  // --- Prefetching Logic (Optional) ---
  useEffect(() => {
    // Ensure studentId is valid before prefetching
    if (!studentId) return;

    const effectiveTotalPages = totalPages >= 1 ? totalPages : 1;

    // --- CORRECTED: Explicitly type prefetchParamsBase ---
    const prefetchParamsBase: {
        studentId: string | undefined;
        limit: number;
        assignmentStatus: TaskAssignmentFilterStatusAPI; // Use API type
        studentStatus: StudentTaskFilterStatusAPI;    // Use API type
    } = {
        studentId: studentId ?? undefined,
        limit: ITEMS_PER_PAGE,
        assignmentStatus: 'all', // 'all' is valid for TaskAssignmentFilterStatusAPI
        studentStatus: 'all',    // 'all' is valid for StudentTaskFilterStatusAPI
     };
    // --- END CORRECTION ---

    // Prefetch next page
    if (!isPlaceholderData && currentPage < effectiveTotalPages && !isFetching) {
        const nextPage = currentPage + 1;
        // Now spreading prefetchParamsBase should match the expected types
        const nextQueryKey = ['assigned-tasks', { ...prefetchParamsBase, page: nextPage }];
        console.log(`[usePaginatedStudentTasks] Prefetching next page for student ${studentId}: ${nextPage}`);
        queryClient.prefetchQuery({
            queryKey: nextQueryKey,
            queryFn: () => fetchAssignedTasks({ ...prefetchParamsBase, page: nextPage }),
            staleTime: 1 * 60 * 1000,
        });
    }
    // Prefetch previous page
    if (!isPlaceholderData && currentPage > 1 && !isFetching) {
        const prevPage = currentPage - 1;
        const prevQueryKey = ['assigned-tasks', { ...prefetchParamsBase, page: prevPage }];
        console.log(`[usePaginatedStudentTasks] Prefetching previous page for student ${studentId}: ${prevPage}`);
        queryClient.prefetchQuery({
            queryKey: prevQueryKey,
            queryFn: () => fetchAssignedTasks({ ...prefetchParamsBase, page: prevPage }),
            staleTime: 1 * 60 * 1000,
        });
    }
    // Ensure all dependencies used in the effect are listed
  }, [currentPage, totalPages, isPlaceholderData, isFetching, queryClient, studentId]);
  // --- End Prefetching Logic ---

  // Callback to change page
  const setPage = useCallback(
    (page: number) => {
      console.log(`[usePaginatedStudentTasks] setPage called with: ${page}`);
      let targetPage = page;
      const effectiveTotalPages = totalPages >= 1 ? totalPages : 1;
      if (page < 1) {
        targetPage = 1;
      } else if (page > effectiveTotalPages) {
        targetPage = effectiveTotalPages;
      }
      if (targetPage !== currentPage) {
          console.log(`[usePaginatedStudentTasks] Setting current page to: ${targetPage}`);
          setCurrentPage(targetPage);
      } else {
          console.log(`[usePaginatedStudentTasks] Already on page ${targetPage}.`);
      }
    },
    [totalPages, currentPage] // Add currentPage dependency
  );

  return {
    tasks,
    currentPage,
    totalPages,
    totalItems, // Use totalItems
    setPage,
    isLoading,
    isFetching,
    isPlaceholderData,
    isError,
    error: error instanceof Error ? error : null,
    // totalTasksCount: totalItems, // Removed, use totalItems directly
  };
};