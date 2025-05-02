import { useState, useCallback, useEffect } from 'react';
import { useQuery, keepPreviousData, useQueryClient } from '@tanstack/react-query';

import {
  fetchAssignedTasks,
  TaskAssignmentFilterStatusAPI,
  StudentTaskFilterStatusAPI,
} from '../api/assignedTasks';
import { AssignedTask, UserStatus } from '../types/dataTypes';

// Keep existing type aliases
export type TaskAssignmentFilterStatus = 'all' | 'assigned' | 'pending' | 'completed';
export type StudentTaskFilterStatus = UserStatus | 'all';

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

  // Keep studentId for direct student filtering (optional, used by AdminStudentDetailView)
  studentId?: string | null;
  setStudentId?: (id: string | null) => void;
  // No need to return teacherId, it's an input parameter
}

const ITEMS_PER_PAGE = 15;

export const usePaginatedAssignedTasks = (
  initialAssignmentFilter: TaskAssignmentFilterStatus = 'all', // Default to 'all' now
  initialStudentStatusFilter: StudentTaskFilterStatus = 'active',
  initialStudentId: string | null = null,
  teacherId?: string // <-- ADD teacherId parameter
): UsePaginatedAssignedTasksReturn => {
  const queryClient = useQueryClient();
  const [assignmentFilter, setAssignmentFilter] =
    useState<TaskAssignmentFilterStatus>(initialAssignmentFilter);
  const [studentStatusFilter, setStudentStatusFilter] = useState<StudentTaskFilterStatus>(
    initialStudentStatusFilter
  );
  // Keep studentId state if needed for other views using this hook
  const [studentId, setStudentId] = useState<string | null>(initialStudentId);

  const [currentPage, setCurrentPage] = useState(1);

  // --- UPDATE queryKey to include teacherId ---
  const queryKey = [
    'assigned-tasks',
    {
      page: currentPage,
      limit: ITEMS_PER_PAGE,
      assignmentStatus: assignmentFilter,
      studentStatus: studentStatusFilter,
      studentId: studentId,
      teacherId: teacherId, // <-- ADD teacherId to key
    },
  ];

  const queryResult = useQuery({
    queryKey: queryKey,
    queryFn: () =>
      fetchAssignedTasks({
        page: currentPage,
        limit: ITEMS_PER_PAGE,
        assignmentStatus: assignmentFilter as TaskAssignmentFilterStatusAPI,
        studentStatus: studentStatusFilter as StudentTaskFilterStatusAPI,
        studentId: studentId ?? undefined,
        teacherId: teacherId, // <-- PASS teacherId to fetch function
      }),
    placeholderData: keepPreviousData,
    staleTime: 1 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
    // Enable the query only if not filtering by teacher OR if teacherId is provided
    enabled: !teacherId || !!teacherId,
  });

  const { data, isLoading, isFetching, isError, error, isPlaceholderData } = queryResult;

  const tasks = data?.items ?? [];
  const totalPages = data?.totalPages ?? 1;
  const totalItems = data?.totalItems ?? 0;

  // --- UPDATE useEffect dependency array for resetting page ---
  useEffect(() => {
    // Reset to page 1 if filters OR teacherId change (and not already on page 1)
    if (currentPage !== 1) {
      console.log(`[usePaginatedAssignedTasks] Filters or teacherId changed, resetting page to 1.`);
      setCurrentPage(1);
    }
    // Note: We don't reset if only initial filters change via props,
    // internal state drives the reset. Initial filters set the *first* state.
  }, [assignmentFilter, studentStatusFilter, studentId, teacherId]); // <-- ADD teacherId dependency

  // --- UPDATE useEffect dependency array and prefetch params for prefetching ---
  useEffect(() => {
    const effectiveTotalPages = totalPages >= 1 ? totalPages : 1;
    const prefetchParamsBase = {
      limit: ITEMS_PER_PAGE,
      assignmentStatus: assignmentFilter as TaskAssignmentFilterStatusAPI,
      studentStatus: studentStatusFilter as StudentTaskFilterStatusAPI,
      studentId: studentId ?? undefined,
      teacherId: teacherId, // <-- ADD teacherId to prefetch params
    };

    // Prefetch next page
    if (!isPlaceholderData && currentPage < effectiveTotalPages && !isFetching) {
      const nextPage = currentPage + 1;
      const nextQueryKey = ['assigned-tasks', { ...prefetchParamsBase, page: nextPage }];
      // console.log(`[usePaginatedAssignedTasks] Prefetching next page: ${nextPage}`); // Keep logging if desired
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
      // console.log(`[usePaginatedAssignedTasks] Prefetching previous page: ${prevPage}`); // Keep logging if desired
      queryClient.prefetchQuery({
        queryKey: prevQueryKey,
        queryFn: () => fetchAssignedTasks({ ...prefetchParamsBase, page: prevPage }),
        staleTime: 1 * 60 * 1000,
      });
    }
  }, [
    // <-- ADD teacherId dependency here too
    currentPage,
    totalPages,
    isPlaceholderData,
    isFetching,
    queryClient,
    assignmentFilter,
    studentStatusFilter,
    studentId,
    teacherId,
  ]);

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
    [totalPages, currentPage]
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
    studentId,
    setStudentId,
  };
};
