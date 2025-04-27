// src/hooks/usePaginatedAssignedTasks.ts
import { useState, useCallback, useEffect } from 'react';
import { useQuery, keepPreviousData, useQueryClient } from '@tanstack/react-query'; // Added useQueryClient

// Import the Supabase-backed API function and types
import {
  fetchAssignedTasks,
  TaskAssignmentFilterStatusAPI, // Type used by API
  StudentTaskFilterStatusAPI,    // Type used by API
} from '../api/assignedTasks';
import { AssignedTask, UserStatus } from '../types/dataTypes';

// Types used by the hook caller (can be simpler than API types if desired)
export type TaskAssignmentFilterStatus = 'all' | 'assigned' | 'pending' | 'completed';
export type StudentTaskFilterStatus = UserStatus | 'all'; // 'active' | 'inactive' | 'all'

// Interface for the hook's return value remains the same
export interface UsePaginatedAssignedTasksReturn {
  tasks: AssignedTask[];
  currentPage: number;
  totalPages: number;
  totalItems: number;
  setPage: (page: number) => void;
  assignmentFilter: TaskAssignmentFilterStatus;
  setAssignmentFilter: (filter: TaskAssignmentFilterStatus) => void;
  studentStatusFilter: StudentTaskFilterStatus;
  setStudentStatusFilter: (filter: StudentTaskFilterStatus) => void;
  isLoading: boolean;
  isFetching: boolean;
  isPlaceholderData: boolean;
  isError: boolean;
  error: Error | null;

  // Keep studentId filtering capability if needed by specific admin views
  studentId?: string | null;
  setStudentId?: (id: string | null) => void;
  // Add teacherId if needed for filtering in admin view (optional)
  // teacherId?: string | null;
  // setTeacherId?: (id: string | null) => void;
}

// Production-ready page size for task lists
const ITEMS_PER_PAGE = 15; // Adjusted from 10

export const usePaginatedAssignedTasks = (
  initialAssignmentFilter: TaskAssignmentFilterStatus = 'pending',
  initialStudentStatusFilter: StudentTaskFilterStatus = 'active',
  initialStudentId: string | null = null,
  // initialTeacherId: string | null = null // Add if implementing teacher filter here
): UsePaginatedAssignedTasksReturn => {
  const queryClient = useQueryClient();
  const [assignmentFilter, setAssignmentFilter] =
    useState<TaskAssignmentFilterStatus>(initialAssignmentFilter);
  const [studentStatusFilter, setStudentStatusFilter] = useState<StudentTaskFilterStatus>(
    initialStudentStatusFilter
  );
  const [studentId, setStudentId] = useState<string | null>(initialStudentId);
  // const [teacherId, setTeacherId] = useState<string | null>(initialTeacherId); // Add if implementing
  const [currentPage, setCurrentPage] = useState(1);

  // Define the query key including all filter parameters
  const queryKey = [
    'assigned-tasks', // Base key
    { // Parameters object
      page: currentPage,
      limit: ITEMS_PER_PAGE,
      assignmentStatus: assignmentFilter,
      studentStatus: studentStatusFilter,
      studentId: studentId,
      // teacherId: teacherId // Add if implementing
    },
  ];

  const queryResult = useQuery({
    queryKey: queryKey,
    queryFn: () => fetchAssignedTasks({ // Use the Supabase API function
        page: currentPage,
        limit: ITEMS_PER_PAGE,
        // Cast local filter types to the API types if they differ (currently they align)
        assignmentStatus: assignmentFilter as TaskAssignmentFilterStatusAPI,
        studentStatus: studentStatusFilter as StudentTaskFilterStatusAPI,
        studentId: studentId ?? undefined, // Pass undefined if null
        // teacherId: teacherId ?? undefined // Add if implementing
      }),
    placeholderData: keepPreviousData,
    staleTime: 1 * 60 * 1000, // Cache for 1 minute (tasks might change often)
    gcTime: 5 * 60 * 1000,
  });

  const { data, isLoading, isFetching, isError, error, isPlaceholderData } = queryResult;

  // Extract data or default
  const tasks = data?.items ?? [];
  const totalPages = data?.totalPages ?? 1;
  const totalItems = data?.totalItems ?? 0;

  // Effect to reset page when filters change
  useEffect(() => {
    if (currentPage !== 1) {
        console.log(`[usePaginatedAssignedTasks] Filters changed, resetting page to 1.`);
        setCurrentPage(1);
    }
    // Query refetches automatically due to key change
  }, [assignmentFilter, studentStatusFilter, studentId /*, teacherId */]); // Add teacherId if implementing

  // --- Prefetching Logic (Optional) ---
  useEffect(() => {
    const effectiveTotalPages = totalPages >= 1 ? totalPages : 1;
    const prefetchParamsBase = {
        limit: ITEMS_PER_PAGE,
        assignmentStatus: assignmentFilter as TaskAssignmentFilterStatusAPI,
        studentStatus: studentStatusFilter as StudentTaskFilterStatusAPI,
        studentId: studentId ?? undefined,
        // teacherId: teacherId ?? undefined,
    };

    // Prefetch next page
    if (!isPlaceholderData && currentPage < effectiveTotalPages && !isFetching) {
       const nextPage = currentPage + 1;
       const nextQueryKey = ['assigned-tasks', { ...prefetchParamsBase, page: nextPage }];
       console.log(`[usePaginatedAssignedTasks] Prefetching next page: ${nextPage}`);
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
        console.log(`[usePaginatedAssignedTasks] Prefetching previous page: ${prevPage}`);
        queryClient.prefetchQuery({
            queryKey: prevQueryKey,
            queryFn: () => fetchAssignedTasks({ ...prefetchParamsBase, page: prevPage }),
            staleTime: 1 * 60 * 1000,
        });
    }
  }, [
      currentPage, totalPages, isPlaceholderData, isFetching, queryClient,
      assignmentFilter, studentStatusFilter, studentId, /* teacherId */ // Include all query params
  ]);
  // --- End Prefetching Logic ---

  // Callback to change page
  const setPage = useCallback(
    (page: number) => {
      console.log(`[usePaginatedAssignedTasks] setPage called with: ${page}`);
      let targetPage = page;
      const effectiveTotalPages = totalPages >= 1 ? totalPages : 1;
      if (page < 1) {
        targetPage = 1;
      } else if (page > effectiveTotalPages) {
        targetPage = effectiveTotalPages;
      }
       if (targetPage !== currentPage) {
          console.log(`[usePaginatedAssignedTasks] Setting current page to: ${targetPage}`);
          setCurrentPage(targetPage);
       } else {
          console.log(`[usePaginatedAssignedTasks] Already on page ${targetPage}.`);
       }
    },
    [totalPages, currentPage] // Add currentPage dependency
  );

  return {
    tasks,
    currentPage,
    totalPages,
    totalItems,
    setPage,
    assignmentFilter,
    setAssignmentFilter,
    studentStatusFilter,
    setStudentStatusFilter,
    isLoading,
    isFetching,
    isPlaceholderData,
    isError,
    error: error instanceof Error ? error : null,
    // Optional studentId filter controls
    studentId,
    setStudentId,
    // Optional teacherId filter controls
    // teacherId,
    // setTeacherId,
  };
};