// Import necessary hooks and types from React and TanStack Query
import { useState, useCallback, useEffect } from 'react';

import { useQuery, keepPreviousData } from '@tanstack/react-query';

// Import the API function to fetch assigned tasks and related types
import {
  fetchAssignedTasks,
  TaskAssignmentFilterStatusAPI,
  StudentTaskFilterStatusAPI,
} from '../api/assignedTasks';
// Import the data type for an assigned task
import { AssignedTask } from '../mocks/mockAssignedTasks';

// Define filter types used within the hook/component level
export type TaskAssignmentFilterStatus = 'all' | 'assigned' | 'pending' | 'completed';
export type StudentTaskFilterStatus = 'active' | 'inactive' | 'all';

// Define the shape of the object returned by this hook
// <<< CORRECTION POINT: Ensure isError is DEFINITELY here >>>
export interface UsePaginatedStudentTasksReturn {
  tasks: AssignedTask[];
  currentPage: number;
  totalPages: number;
  totalItems: number;
  setPage: (page: number) => void;
  isLoading: boolean;
  isFetching: boolean;
  isPlaceholderData: boolean;
  isError: boolean; // <<< MAKE SURE THIS LINE EXISTS AND IS CORRECT
  error: Error | null;
  totalTasksCount: number; // Renamed from the old implementation for clarity
}

// Define the number of items to fetch per page
const ITEMS_PER_PAGE = 5;

// The custom hook function
export const usePaginatedStudentTasks = (
  studentId: string | null | undefined // Accept studentId to fetch tasks for
): UsePaginatedStudentTasksReturn => {
  // State for the current page number
  const [currentPage, setCurrentPage] = useState(1);

  // Use TanStack Query's useQuery hook to fetch data
  const queryResult = useQuery({
    // Define the query key. This uniquely identifies the query data.
    queryKey: [
      'assigned-tasks',
      {
        studentId: studentId,
        page: currentPage,
        limit: ITEMS_PER_PAGE,
      },
    ],
    // The function that performs the data fetching (calling the API)
    queryFn: () =>
      fetchAssignedTasks({
        studentId: studentId ?? undefined, // Pass studentId to the API call
        page: currentPage,
        limit: ITEMS_PER_PAGE,
        // Assuming 'all' status if not specified for a single student
        assignmentStatus: 'all',
        studentStatus: 'all',
      }),
    // Ensure the hook only runs if a valid studentId is provided
    enabled: !!studentId,
    // Keep previous data visible while fetching new data for a smoother UX
    placeholderData: keepPreviousData,
    // Configure caching behavior (times in milliseconds)
    staleTime: 1 * 60 * 1000, // 1 minute
    gcTime: 5 * 60 * 1000, // 5 minutes
  });

  // Destructure the result object from useQuery
  // <<< CORRECTION POINT: Ensure isError is DESTRUCTURED here >>>
  const { data, isLoading, isFetching, isError, error, isPlaceholderData } = queryResult;

  // Extract the relevant data from the API response, providing defaults
  const tasks = data?.items ?? [];
  const totalPages = data?.totalPages ?? 1;
  const totalItems = data?.totalItems ?? 0;

  // Effect to reset the page to 1 if the studentId changes
  useEffect(() => {
    console.log(
      `[usePaginatedStudentTasks] studentId changed to ${studentId}, resetting page to 1.`
    );
    if (currentPage !== 1) {
      setCurrentPage(1);
    }
  }, [studentId]);

  // Callback function to safely update the current page
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

  // Return the state and functions needed by the component
  // <<< CORRECTION POINT: Ensure isError is RETURNED here >>>
  return {
    tasks,
    currentPage,
    totalPages,
    totalItems,
    setPage,
    isLoading,
    isFetching,
    isPlaceholderData,
    isError, // <<< MAKE SURE isError FROM queryResult IS RETURNED
    error: error instanceof Error ? error : null,
    totalTasksCount: totalItems,
  };
};
