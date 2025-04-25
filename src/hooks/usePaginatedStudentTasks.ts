import { useState, useCallback, useEffect } from 'react';

import { useQuery, keepPreviousData } from '@tanstack/react-query';

import { fetchAssignedTasks } from '../api/assignedTasks';
import { AssignedTask } from '../types/dataTypes';

export type TaskAssignmentFilterStatus = 'all' | 'assigned' | 'pending' | 'completed';
export type StudentTaskFilterStatus = 'active' | 'inactive' | 'all';

export interface UsePaginatedStudentTasksReturn {
  tasks: AssignedTask[];
  currentPage: number;
  totalPages: number;
  totalItems: number;
  setPage: (page: number) => void;
  isLoading: boolean;
  isFetching: boolean;
  isPlaceholderData: boolean;
  isError: boolean;
  error: Error | null;
  totalTasksCount: number;
}

const ITEMS_PER_PAGE = 5;

export const usePaginatedStudentTasks = (
  studentId: string | null | undefined
): UsePaginatedStudentTasksReturn => {
  const [currentPage, setCurrentPage] = useState(1);

  const queryResult = useQuery({
    queryKey: [
      'assigned-tasks',
      {
        studentId: studentId,
        page: currentPage,
        limit: ITEMS_PER_PAGE,
      },
    ],

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
    console.log(
      `[usePaginatedStudentTasks] studentId changed to ${studentId}, resetting page to 1.`
    );
    if (currentPage !== 1) {
      setCurrentPage(1);
    }
  }, [studentId]);

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
      console.log(`[usePaginatedStudentTasks] Setting current page to: ${targetPage}`);
      setCurrentPage(targetPage);
    },
    [totalPages]
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
    totalTasksCount: totalItems,
  };
};
