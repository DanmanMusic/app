// src/hooks/usePaginatedAssignedTasks.ts
import { useState, useCallback, useEffect } from 'react';
import { useQuery, keepPreviousData } from '@tanstack/react-query'; // Import TQ hooks

// API Client & Types
import {
  fetchAssignedTasks,
  TaskAssignmentFilterStatusAPI, // Use API types for filters
  StudentTaskFilterStatusAPI,
} from '../api/assignedTasks';
import { AssignedTask } from '../mocks/mockAssignedTasks';
// Removed: useData context import
// Removed: UserStatus type (using API type now)

// Type definitions for filters remain the same for the hook's interface
export type TaskAssignmentFilterStatus = 'all' | 'assigned' | 'pending' | 'completed';
export type StudentTaskFilterStatus = 'active' | 'inactive' | 'all'; // Keep UserStatus 'active'/'inactive' for hook interface clarity if preferred

// Define the shape of the return value, adding TQ flags
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
  isLoading: boolean; // From TQ
  isFetching: boolean; // From TQ
  isPlaceholderData: boolean; // From TQ
  isError: boolean; // From TQ
  error: Error | null; // From TQ
  // Added studentId prop for filtering
  studentId?: string | null;
  setStudentId?: (id: string | null) => void; // Optional setter
}

const ITEMS_PER_PAGE = 10; // Default page size for tasks

export const usePaginatedAssignedTasks = (
  initialAssignmentFilter: TaskAssignmentFilterStatus = 'pending',
  initialStudentStatusFilter: StudentTaskFilterStatus = 'active',
  initialStudentId: string | null = null // Accept optional initial student ID
): UsePaginatedAssignedTasksReturn => {
  // Removed: useData hook call

  // State for filters and pagination
  const [assignmentFilter, setAssignmentFilter] =
    useState<TaskAssignmentFilterStatus>(initialAssignmentFilter);
  const [studentStatusFilter, setStudentStatusFilter] =
    useState<StudentTaskFilterStatus>(initialStudentStatusFilter);
  const [studentId, setStudentId] = useState<string | null>(initialStudentId); // State for student ID filter
  const [currentPage, setCurrentPage] = useState(1);

  // --- TanStack Query ---
  const queryResult = useQuery({
    // Query key includes all parameters that affect the query
    queryKey: [
      'assigned-tasks',
      {
        page: currentPage,
        limit: ITEMS_PER_PAGE,
        assignmentStatus: assignmentFilter as TaskAssignmentFilterStatusAPI, // Cast for API call
        studentStatus: studentStatusFilter as StudentTaskFilterStatusAPI, // Cast for API call
        studentId: studentId, // Include studentId in key
      },
    ],
    // Query function calls the API client
    queryFn: () =>
      fetchAssignedTasks({
        page: currentPage,
        limit: ITEMS_PER_PAGE,
        assignmentStatus: assignmentFilter as TaskAssignmentFilterStatusAPI,
        studentStatus: studentStatusFilter as StudentTaskFilterStatusAPI,
        studentId: studentId ?? undefined, // Pass undefined if null
      }),
    placeholderData: keepPreviousData, // Show previous data while fetching
    staleTime: 1 * 60 * 1000, // Consider data fresh for 1 minute
    gcTime: 5 * 60 * 1000,
  });

  // Extract data and state from queryResult
  const { data, isLoading, isFetching, isError, error, isPlaceholderData } = queryResult;

  // Memoized values from data or defaults
  const tasks = data?.items ?? [];
  const totalPages = data?.totalPages ?? 1;
  const totalItems = data?.totalItems ?? 0;

  // Reset to page 1 when filters or studentId change
  useEffect(() => {
    console.log(
      `[usePaginatedAssignedTasks] Filters/StudentId changed, resetting page to 1.`,
      { assignmentFilter, studentStatusFilter, studentId }
    );
    // Check if currentPage is already 1 to avoid unnecessary state update/refetch
    if (currentPage !== 1) {
      setCurrentPage(1);
    }
  }, [assignmentFilter, studentStatusFilter, studentId]); // Removed currentPage dependency

  // Function to change the current page
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

  // Return the state and functions needed by components
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
    setStudentId, // Expose setter for studentId if needed outside
    isLoading,
    isFetching,
    isPlaceholderData,
    isError,
    error: error instanceof Error ? error : null,
  };
};