import { useState, useCallback, useEffect } from 'react';

import { useQuery, keepPreviousData, useQueryClient } from '@tanstack/react-query';

import { AssignedTask, PaginatedReturn, UserStatus } from '../types/dataTypes';

import {
  fetchAssignedTasks,
  TaskAssignmentFilterStatusAPI,
  StudentTaskFilterStatusAPI,
} from '../api/assignedTasks';

export type TaskAssignmentFilterStatus = 'all' | 'assigned' | 'pending' | 'completed';
export type StudentTaskFilterStatus = UserStatus | 'all';

export interface UsePaginatedAssignedTasksReturn extends PaginatedReturn {
  tasks: AssignedTask[];
  assignmentFilter: TaskAssignmentFilterStatus;
  setAssignmentFilter: (filter: TaskAssignmentFilterStatus) => void;
  studentStatusFilter: StudentTaskFilterStatus;
  setStudentStatusFilter: (filter: StudentTaskFilterStatus) => void;
  studentId?: string | null;
  setStudentId?: (id: string | null) => void;
}

const ITEMS_PER_PAGE = 15;

export const usePaginatedAssignedTasks = (
  initialAssignmentFilter: TaskAssignmentFilterStatus = 'all',
  initialStudentStatusFilter: StudentTaskFilterStatus = 'active',
  initialStudentId: string | null = null,
  teacherId?: string
): UsePaginatedAssignedTasksReturn => {
  const queryClient = useQueryClient();
  const [assignmentFilter, setAssignmentFilter] =
    useState<TaskAssignmentFilterStatus>(initialAssignmentFilter);
  const [studentStatusFilter, setStudentStatusFilter] = useState<StudentTaskFilterStatus>(
    initialStudentStatusFilter
  );

  const [studentId, setStudentId] = useState<string | null>(initialStudentId);

  const [currentPage, setCurrentPage] = useState(1);

  const queryKey = [
    'assigned-tasks',
    {
      page: currentPage,
      limit: ITEMS_PER_PAGE,
      assignmentStatus: assignmentFilter,
      studentStatus: studentStatusFilter,
      studentId: studentId,
      teacherId: teacherId,
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
        teacherId: teacherId,
      }),
    placeholderData: keepPreviousData,
    staleTime: 1 * 60 * 1000,
    gcTime: 5 * 60 * 1000,

    enabled: !teacherId || !!teacherId,
  });

  const { data, isLoading, isFetching, isError, error, isPlaceholderData } = queryResult;

  const tasks = data?.items ?? [];
  const totalPages = data?.totalPages ?? 1;
  const totalItems = data?.totalItems ?? 0;

  useEffect(() => {
    if (currentPage !== 1) {
      console.log(`[usePaginatedAssignedTasks] Filters or teacherId changed, resetting page to 1.`);
      setCurrentPage(1);
    }
  }, [assignmentFilter, studentStatusFilter, studentId, teacherId]);

  useEffect(() => {
    const effectiveTotalPages = totalPages >= 1 ? totalPages : 1;
    const prefetchParamsBase = {
      limit: ITEMS_PER_PAGE,
      assignmentStatus: assignmentFilter as TaskAssignmentFilterStatusAPI,
      studentStatus: studentStatusFilter as StudentTaskFilterStatusAPI,
      studentId: studentId ?? undefined,
      teacherId: teacherId,
    };

    if (!isPlaceholderData && currentPage < effectiveTotalPages && !isFetching) {
      const nextPage = currentPage + 1;
      const nextQueryKey = ['assigned-tasks', { ...prefetchParamsBase, page: nextPage }];

      queryClient.prefetchQuery({
        queryKey: nextQueryKey,
        queryFn: () => fetchAssignedTasks({ ...prefetchParamsBase, page: nextPage }),
        staleTime: 1 * 60 * 1000,
      });
    }

    if (!isPlaceholderData && currentPage > 1 && !isFetching) {
      const prevPage = currentPage - 1;
      const prevQueryKey = ['assigned-tasks', { ...prefetchParamsBase, page: prevPage }];

      queryClient.prefetchQuery({
        queryKey: prevQueryKey,
        queryFn: () => fetchAssignedTasks({ ...prefetchParamsBase, page: prevPage }),
        staleTime: 1 * 60 * 1000,
      });
    }
  }, [
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
