import { useState, useCallback } from 'react';

import { useQuery, keepPreviousData } from '@tanstack/react-query';

import { fetchTeachers } from '../api/users';
import { User } from '../types/userTypes';

interface UsePaginatedTeachersReturn {
  teachers: User[];
  currentPage: number;
  totalPages: number;
  totalItems: number;
  setPage: (page: number) => void;
  isLoading: boolean;
  isFetching: boolean;
  isPlaceholderData: boolean;
  isError: boolean;
  error: Error | null;
}

export const usePaginatedTeachers = (): UsePaginatedTeachersReturn => {
  const [currentPage, setCurrentPage] = useState(1);

  const queryResult = useQuery({
    queryKey: ['teachers', { page: currentPage }],
    queryFn: () => fetchTeachers({ page: currentPage }),
    placeholderData: keepPreviousData,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });

  const { data, isLoading, isFetching, isError, error, isPlaceholderData } = queryResult;

  const teachers = data?.items ?? [];
  const totalPages = data?.totalPages ?? 1;
  const totalItems = data?.totalItems ?? 0;

  const setPage = useCallback(
    (page: number) => {
      console.log(`[usePaginatedTeachers] setPage called with: ${page}`);
      let targetPage = page;
      const effectiveTotalPages = totalPages >= 1 ? totalPages : 1;
      if (page < 1) {
        targetPage = 1;
      } else if (page > effectiveTotalPages) {
        targetPage = effectiveTotalPages;
      }
      console.log(`[usePaginatedTeachers] Setting current page to: ${targetPage}`);
      setCurrentPage(targetPage);
    },
    [totalPages]
  );

  return {
    teachers,
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
