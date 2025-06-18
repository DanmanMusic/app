import { useState, useCallback, useEffect } from 'react';

import { useQuery, keepPreviousData, useQueryClient } from '@tanstack/react-query';

import { AssignedTask, PaginatedReturn } from '../types/dataTypes';

import {
  fetchAssignedTasks,
  StudentTaskFilterStatusAPI,
  TaskAssignmentFilterStatusAPI,
} from '../api/assignedTasks';

export interface UsePaginatedStudentTasksReturn extends PaginatedReturn {
  tasks: AssignedTask[];
}

const ITEMS_PER_PAGE = 10;

export const usePaginatedStudentTasks = (
  studentId: string | null | undefined
): UsePaginatedStudentTasksReturn => {
  const queryClient = useQueryClient();
  const [currentPage, setCurrentPage] = useState(1);

  const queryKey = [
    'assigned-tasks',
    {
      studentId: studentId,
      page: currentPage,
      limit: ITEMS_PER_PAGE,

      assignmentStatus: 'all',
      studentStatus: 'all',
    },
  ];

  const queryResult = useQuery({
    queryKey: queryKey,
    queryFn: () =>
      fetchAssignedTasks({
        studentId: studentId ?? undefined,
        page: currentPage,
        limit: ITEMS_PER_PAGE,
        assignmentStatus: 'all',
        studentStatus: 'all',
      }),

    enabled: !!studentId,
    placeholderData: keepPreviousData,
    staleTime: 1 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
  });

  const { data, isLoading, isFetching, isError, error, isPlaceholderData } = queryResult;

  const tasks = data?.items ?? [];
  const totalPages = data?.totalPages ?? 1;
  const totalItems = data?.totalItems ?? 0;

  useEffect(() => {
    if (currentPage !== 1) {
      console.log(
        `[usePaginatedStudentTasks] studentId changed to ${studentId}, resetting page to 1.`
      );
      setCurrentPage(1);
    }
  }, [studentId]);

  useEffect(() => {
    if (!studentId) return;

    const effectiveTotalPages = totalPages >= 1 ? totalPages : 1;

    const prefetchParamsBase: {
      studentId: string | undefined;
      limit: number;
      assignmentStatus: TaskAssignmentFilterStatusAPI;
      studentStatus: StudentTaskFilterStatusAPI;
    } = {
      studentId: studentId ?? undefined,
      limit: ITEMS_PER_PAGE,
      assignmentStatus: 'all',
      studentStatus: 'all',
    };

    if (!isPlaceholderData && currentPage < effectiveTotalPages && !isFetching) {
      const nextPage = currentPage + 1;

      const nextQueryKey = ['assigned-tasks', { ...prefetchParamsBase, page: nextPage }];
      console.log(
        `[usePaginatedStudentTasks] Prefetching next page for student ${studentId}: ${nextPage}`
      );
      queryClient.prefetchQuery({
        queryKey: nextQueryKey,
        queryFn: () => fetchAssignedTasks({ ...prefetchParamsBase, page: nextPage }),
        staleTime: 1 * 60 * 1000,
      });
    }

    if (!isPlaceholderData && currentPage > 1 && !isFetching) {
      const prevPage = currentPage - 1;
      const prevQueryKey = ['assigned-tasks', { ...prefetchParamsBase, page: prevPage }];
      console.log(
        `[usePaginatedStudentTasks] Prefetching previous page for student ${studentId}: ${prevPage}`
      );
      queryClient.prefetchQuery({
        queryKey: prevQueryKey,
        queryFn: () => fetchAssignedTasks({ ...prefetchParamsBase, page: prevPage }),
        staleTime: 1 * 60 * 1000,
      });
    }
  }, [currentPage, totalPages, isPlaceholderData, isFetching, queryClient, studentId]);

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
    [totalPages, currentPage]
  );

  return {
    tasks,
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
