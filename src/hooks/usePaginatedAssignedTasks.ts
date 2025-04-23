import { useState, useCallback, useEffect } from 'react';

import { useQuery, keepPreviousData } from '@tanstack/react-query';

import {
  fetchAssignedTasks,
  TaskAssignmentFilterStatusAPI,
  StudentTaskFilterStatusAPI,
} from '../api/assignedTasks';
import { AssignedTask } from '../mocks/mockAssignedTasks';

export type TaskAssignmentFilterStatus = 'all' | 'assigned' | 'pending' | 'completed';
export type StudentTaskFilterStatus = 'active' | 'inactive' | 'all';

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

  studentId?: string | null;
  setStudentId?: (id: string | null) => void;
}

const ITEMS_PER_PAGE = 10;

export const usePaginatedAssignedTasks = (
  initialAssignmentFilter: TaskAssignmentFilterStatus = 'pending',
  initialStudentStatusFilter: StudentTaskFilterStatus = 'active',
  initialStudentId: string | null = null
): UsePaginatedAssignedTasksReturn => {
  const [assignmentFilter, setAssignmentFilter] =
    useState<TaskAssignmentFilterStatus>(initialAssignmentFilter);
  const [studentStatusFilter, setStudentStatusFilter] = useState<StudentTaskFilterStatus>(
    initialStudentStatusFilter
  );
  const [studentId, setStudentId] = useState<string | null>(initialStudentId);
  const [currentPage, setCurrentPage] = useState(1);

  const queryResult = useQuery({
    queryKey: [
      'assigned-tasks',
      {
        page: currentPage,
        limit: ITEMS_PER_PAGE,
        assignmentStatus: assignmentFilter,
        studentStatus: studentStatusFilter,
        studentId: studentId,
      },
    ],

    queryFn: () =>
      fetchAssignedTasks({
        page: currentPage,
        limit: ITEMS_PER_PAGE,

        assignmentStatus: assignmentFilter as TaskAssignmentFilterStatusAPI,
        studentStatus: studentStatusFilter as StudentTaskFilterStatusAPI,
        studentId: studentId ?? undefined,
      }),
    placeholderData: keepPreviousData,
    staleTime: 1 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
  });

  const { data, isLoading, isFetching, isError, error, isPlaceholderData } = queryResult;

  const tasks = data?.items ?? [];
  const totalPages = data?.totalPages ?? 1;
  const totalItems = data?.totalItems ?? 0;

  useEffect(() => {
    console.log(`[usePaginatedAssignedTasks] Filters/StudentId changed, resetting page to 1.`, {
      assignmentFilter,
      studentStatusFilter,
      studentId,
    });

    if (currentPage !== 1) {
      setCurrentPage(1);
    }
  }, [assignmentFilter, studentStatusFilter, studentId]);

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
      console.log(`[usePaginatedAssignedTasks] Setting current page to: ${targetPage}`);
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
    assignmentFilter,
    setAssignmentFilter,
    studentStatusFilter,
    setStudentStatusFilter,
    studentId,
    setStudentId,
    isLoading,
    isFetching,
    isPlaceholderData,
    isError,
    error: error instanceof Error ? error : null,
  };
};
