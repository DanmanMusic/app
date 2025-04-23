import { useState, useCallback, useEffect } from 'react';
import { useQuery, keepPreviousData } from '@tanstack/react-query';

// Import the API function to fetch assigned tasks and related types
import {
  fetchAssignedTasks,
  TaskAssignmentFilterStatusAPI, // API specific type
  StudentTaskFilterStatusAPI,   // API specific type
} from '../api/assignedTasks';
// Import the data type for an assigned task
import { AssignedTask } from '../mocks/mockAssignedTasks';

// Define filter types used within the hook/component level
export type TaskAssignmentFilterStatus = 'all' | 'assigned' | 'pending' | 'completed';
export type StudentTaskFilterStatus = 'active' | 'inactive' | 'all';

// Define the shape of the object returned by this hook
export interface UsePaginatedAssignedTasksReturn {
  tasks: AssignedTask[];
  currentPage: number;
  totalPages: number;
  totalItems: number;
  setPage: (page: number) => void;
  assignmentFilter: TaskAssignmentFilterStatus; // Filter for task status
  setAssignmentFilter: (filter: TaskAssignmentFilterStatus) => void;
  studentStatusFilter: StudentTaskFilterStatus; // Filter for student status
  setStudentStatusFilter: (filter: StudentTaskFilterStatus) => void;
  isLoading: boolean;
  isFetching: boolean;
  isPlaceholderData: boolean;
  isError: boolean;
  error: Error | null;
  // Optional student ID filter (not used by default in the global view, but kept for flexibility)
  studentId?: string | null;
  setStudentId?: (id: string | null) => void;
}

// Default items per page for this hook (used in Admin view often)
const ITEMS_PER_PAGE = 10;

// The custom hook function
export const usePaginatedAssignedTasks = (
  // Initial values for filters, often set by the calling component (e.g., ViewAllAssignedTasksModal)
  initialAssignmentFilter: TaskAssignmentFilterStatus = 'pending',
  initialStudentStatusFilter: StudentTaskFilterStatus = 'active',
  initialStudentId: string | null = null // Allow optional initial student ID filter
): UsePaginatedAssignedTasksReturn => {

  // State for filters and pagination
  const [assignmentFilter, setAssignmentFilter] =
    useState<TaskAssignmentFilterStatus>(initialAssignmentFilter);
  const [studentStatusFilter, setStudentStatusFilter] = useState<StudentTaskFilterStatus>(
    initialStudentStatusFilter
  );
  const [studentId, setStudentId] = useState<string | null>(initialStudentId); // State for optional student ID filter
  const [currentPage, setCurrentPage] = useState(1);

  // TanStack Query hook for data fetching
  const queryResult = useQuery({
    // Query key includes all parameters that affect the result
    queryKey: [
      'assigned-tasks', // Base key
      {
        page: currentPage,
        limit: ITEMS_PER_PAGE,
        assignmentStatus: assignmentFilter, // Include assignment filter
        studentStatus: studentStatusFilter, // Include student status filter
        studentId: studentId, // Include specific student ID if set
      },
    ],
    // Function to call the API
    queryFn: () =>
      fetchAssignedTasks({
        page: currentPage,
        limit: ITEMS_PER_PAGE,
        // Cast local filter types to API types if they differ
        assignmentStatus: assignmentFilter as TaskAssignmentFilterStatusAPI,
        studentStatus: studentStatusFilter as StudentTaskFilterStatusAPI,
        studentId: studentId ?? undefined, // Pass studentId if set
      }),
    placeholderData: keepPreviousData, // Keep old data while fetching
    staleTime: 1 * 60 * 1000, // 1 minute
    gcTime: 5 * 60 * 1000, // 5 minutes
  });

  // Destructure query results
  const { data, isLoading, isFetching, isError, error, isPlaceholderData } = queryResult;

  // Extract data with defaults
  const tasks = data?.items ?? [];
  const totalPages = data?.totalPages ?? 1;
  const totalItems = data?.totalItems ?? 0;

  // Effect to reset page to 1 when filters change
  useEffect(() => {
    console.log(`[usePaginatedAssignedTasks] Filters/StudentId changed, resetting page to 1.`, {
      assignmentFilter,
      studentStatusFilter,
      studentId,
    });
    // Only reset if not already on page 1
    if (currentPage !== 1) {
      setCurrentPage(1);
    }
  }, [assignmentFilter, studentStatusFilter, studentId]); // Dependencies are the filters

  // Callback to set the current page safely
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
    [totalPages] // Depends on totalPages
  );

  // Return the hook's state and setters
  return {
    tasks,
    currentPage,
    totalPages,
    totalItems,
    setPage,
    assignmentFilter, // Return filter state
    setAssignmentFilter, // Return filter setter
    studentStatusFilter, // Return filter state
    setStudentStatusFilter, // Return filter setter
    studentId, // Return optional student ID state
    setStudentId, // Return optional student ID setter
    isLoading,
    isFetching,
    isPlaceholderData,
    isError,
    error: error instanceof Error ? error : null,
  };
};