import { useState, useMemo, useCallback, useEffect } from 'react';

import { useQuery, keepPreviousData } from '@tanstack/react-query';

import { fetchStudents } from '../api/users';
import { SimplifiedStudent, UserStatus } from '../types/dataTypes';

export interface UsePaginatedStudentsReturn {
  students: SimplifiedStudent[];
  currentPage: number;
  totalPages: number;
  totalItems: number;
  setPage: (page: number) => void;
  currentFilter: UserStatus | 'all';
  setFilter: (filter: UserStatus | 'all') => void;
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  isLoading: boolean;
  isFetching: boolean;
  isPlaceholderData: boolean;
  isError: boolean;
  error: Error | null;
}

export const usePaginatedStudents = (): UsePaginatedStudentsReturn => {
  const [currentPage, setCurrentPage] = useState(1);
  const [currentFilter, setFilter] = useState<UserStatus | 'all'>('active');
  const [searchTerm, setSearchTerm] = useState('');

  const queryResult = useQuery({
    queryKey: ['students', { page: currentPage, filter: currentFilter, search: searchTerm }],

    queryFn: () =>
      fetchStudents({ page: currentPage, filter: currentFilter, searchTerm: searchTerm }),

    placeholderData: keepPreviousData,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });

  const { data, isLoading, isFetching, isError, error, isPlaceholderData } = queryResult;

  const students = data?.students ?? [];
  const totalPages = data?.totalPages ?? 1;
  const totalItems = data?.totalItems ?? 0;

  useEffect(() => {
    console.log(`[usePaginatedStudents] Filter or Search changed, resetting page to 1.`);

    if (currentPage !== 1) {
      setCurrentPage(1);
    }
  }, [currentFilter, searchTerm]);

  const setPage = useCallback(
    (page: number) => {
      console.log(`[usePaginatedStudents] setPage called with: ${page}`);
      let targetPage = page;

      const effectiveTotalPages = totalPages >= 1 ? totalPages : 1;
      if (page < 1) {
        targetPage = 1;
      } else if (page > effectiveTotalPages) {
        targetPage = effectiveTotalPages;
      }
      console.log(`[usePaginatedStudents] Setting current page to: ${targetPage}`);
      setCurrentPage(targetPage);
    },
    [totalPages]
  );

  return {
    students,
    currentPage,
    totalPages,
    totalItems,
    setPage,
    currentFilter,
    setFilter,
    searchTerm,
    setSearchTerm,
    isLoading,

    isFetching: isFetching,
    isPlaceholderData,
    isError,
    error: error instanceof Error ? error : null,
  };
};
