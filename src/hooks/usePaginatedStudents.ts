// src/hooks/usePaginatedStudents.ts
import { useState, useCallback, useEffect } from 'react';

import { useQuery, keepPreviousData, useQueryClient } from '@tanstack/react-query';

import { User, UserStatus } from '../types/dataTypes';

import { fetchProfilesByRole } from '../api/users';

export interface UsePaginatedStudentsReturn {
  students: User[];
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

const ITEMS_PER_PAGE = 20;

export const usePaginatedStudents = (): UsePaginatedStudentsReturn => {
  const queryClient = useQueryClient();
  const [currentPage, setCurrentPage] = useState(1);
  const [currentFilter, setInternalFilter] = useState<UserStatus | 'all'>('active');
  const [searchTerm, setInternalSearchTerm] = useState('');

  const setFilter = useCallback((filter: UserStatus | 'all') => {
    setInternalFilter(filter);
  }, []);

  const setSearchTerm = useCallback((term: string) => {
    setInternalSearchTerm(term);
  }, []);

  const queryKey = [
    'students',
    { page: currentPage, limit: ITEMS_PER_PAGE, filter: currentFilter, search: searchTerm },
  ];

  const queryResult = useQuery({
    queryKey: queryKey,

    queryFn: () =>
      fetchProfilesByRole({
        role: 'student',
        page: currentPage,
        limit: ITEMS_PER_PAGE,
        filter: currentFilter,
        searchTerm: searchTerm,
      }),
    placeholderData: keepPreviousData,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });

  const { data, isLoading, isFetching, isError, error, isPlaceholderData } = queryResult;

  const students = data?.items ?? [];
  const totalPages = data?.totalPages ?? 1;
  const totalItems = data?.totalItems ?? 0;

  useEffect(() => {
    if (currentPage !== 1) {
      setCurrentPage(1);
    }
  }, [currentFilter, searchTerm]);

  useEffect(() => {
    const effectiveTotalPages = totalPages >= 1 ? totalPages : 1;
    const prefetchParams = {
      role: 'student' as const,
      limit: ITEMS_PER_PAGE,
      filter: currentFilter,
      searchTerm: searchTerm,
    };

    if (!isPlaceholderData && currentPage < effectiveTotalPages && !isFetching) {
      const nextPage = currentPage + 1;
      queryClient.prefetchQuery({
        queryKey: ['students', { ...prefetchParams, page: nextPage }],
        queryFn: () => fetchProfilesByRole({ ...prefetchParams, page: nextPage }),
        staleTime: 5 * 60 * 1000,
      });
    }

    if (!isPlaceholderData && currentPage > 1 && !isFetching) {
      const prevPage = currentPage - 1;
      queryClient.prefetchQuery({
        queryKey: ['students', { ...prefetchParams, page: prevPage }],
        queryFn: () => fetchProfilesByRole({ ...prefetchParams, page: prevPage }),
        staleTime: 5 * 60 * 1000,
      });
    }
  }, [
    currentPage,
    totalPages,
    isPlaceholderData,
    isFetching,
    currentFilter,
    searchTerm,
    queryClient,
  ]);

  const setPage = useCallback(
    (page: number) => {
      const effectiveTotalPages = totalPages >= 1 ? totalPages : 1;
      let targetPage = page;
      if (page < 1) targetPage = 1;
      else if (page > effectiveTotalPages) targetPage = effectiveTotalPages;
      if (targetPage !== currentPage) setCurrentPage(targetPage);
    },
    [totalPages, currentPage]
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
    isFetching,
    isPlaceholderData,
    isError,
    error: error instanceof Error ? error : null,
  };
};
