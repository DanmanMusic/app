import { useState, useCallback, useEffect } from 'react';

import { useQuery, keepPreviousData, useQueryClient } from '@tanstack/react-query';

import { fetchTeachers } from '../api/users';
import { User } from '../types/dataTypes';

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

const ITEMS_PER_PAGE = 20;

export const usePaginatedTeachers = (): UsePaginatedTeachersReturn => {
  const queryClient = useQueryClient();
  const [currentPage, setCurrentPage] = useState(1);

  const queryKey = ['teachers', { page: currentPage, limit: ITEMS_PER_PAGE }];

  const queryResult = useQuery({
    queryKey: queryKey,
    queryFn: () => fetchTeachers({ page: currentPage, limit: ITEMS_PER_PAGE }),
    placeholderData: keepPreviousData,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });

  const { data, isLoading, isFetching, isError, error, isPlaceholderData } = queryResult;

  const teachers = data?.items ?? [];
  const totalPages = data?.totalPages ?? 1;
  const totalItems = data?.totalItems ?? 0;

  useEffect(() => {
    const effectiveTotalPages = totalPages >= 1 ? totalPages : 1;

    if (!isPlaceholderData && currentPage < effectiveTotalPages && !isFetching) {
      const nextQueryKey = ['teachers', { page: currentPage + 1, limit: ITEMS_PER_PAGE }];
      console.log(`[usePaginatedTeachers] Prefetching next page: ${currentPage + 1}`);
      queryClient.prefetchQuery({
        queryKey: nextQueryKey,
        queryFn: () => fetchTeachers({ page: currentPage + 1, limit: ITEMS_PER_PAGE }),
        staleTime: 5 * 60 * 1000,
      });
    }

    if (!isPlaceholderData && currentPage > 1 && !isFetching) {
      const prevQueryKey = ['teachers', { page: currentPage - 1, limit: ITEMS_PER_PAGE }];
      console.log(`[usePaginatedTeachers] Prefetching previous page: ${currentPage - 1}`);
      queryClient.prefetchQuery({
        queryKey: prevQueryKey,
        queryFn: () => fetchTeachers({ page: currentPage - 1, limit: ITEMS_PER_PAGE }),
        staleTime: 5 * 60 * 1000,
      });
    }
  }, [currentPage, totalPages, isPlaceholderData, isFetching, queryClient]);

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
      if (targetPage !== currentPage) {
        console.log(`[usePaginatedTeachers] Setting current page to: ${targetPage}`);
        setCurrentPage(targetPage);
      } else {
        console.log(`[usePaginatedTeachers] Already on page ${targetPage}, not changing.`);
      }
    },
    [totalPages, currentPage]
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
