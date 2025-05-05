import { useState, useCallback, useEffect } from 'react';

import { useQuery, keepPreviousData, useQueryClient } from '@tanstack/react-query';

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

const ITEMS_PER_PAGE = 20;

export const usePaginatedStudents = (): UsePaginatedStudentsReturn => {
  const queryClient = useQueryClient();
  const [currentPage, setCurrentPage] = useState(1);
  const [currentFilter, setInternalFilter] = useState<UserStatus | 'all'>('active');
  const [searchTerm, setInternalSearchTerm] = useState('');

  const setFilter = useCallback((filter: UserStatus | 'all') => {
    console.log(`[usePaginatedStudents] setFilter called with: ${filter}`);
    setInternalFilter(filter);
  }, []);

  const setSearchTerm = useCallback((term: string) => {
    console.log(`[usePaginatedStudents] setSearchTerm called with: ${term}`);
    setInternalSearchTerm(term);
  }, []);

  const queryKey = [
    'students',
    { page: currentPage, limit: ITEMS_PER_PAGE, filter: currentFilter, search: searchTerm },
  ];

  const queryResult = useQuery({
    queryKey: queryKey,
    queryFn: () =>
      fetchStudents({
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

  const students = data?.students ?? [];
  const totalPages = data?.totalPages ?? 1;
  const totalItems = data?.totalItems ?? 0;

  useEffect(() => {
    if (currentPage !== 1) {
      console.log(`[usePaginatedStudents] Filter or Search changed, resetting page to 1.`);
      setCurrentPage(1);
    }
  }, [currentFilter, searchTerm]);

  useEffect(() => {
    const effectiveTotalPages = totalPages >= 1 ? totalPages : 1;

    if (!isPlaceholderData && currentPage < effectiveTotalPages && !isFetching) {
      const nextQueryKey = [
        'students',
        { page: currentPage + 1, limit: ITEMS_PER_PAGE, filter: currentFilter, search: searchTerm },
      ];
      console.log(`[usePaginatedStudents] Prefetching next page: ${currentPage + 1}`);
      queryClient.prefetchQuery({
        queryKey: nextQueryKey,
        queryFn: () =>
          fetchStudents({
            page: currentPage + 1,
            limit: ITEMS_PER_PAGE,
            filter: currentFilter,
            searchTerm: searchTerm,
          }),
        staleTime: 5 * 60 * 1000,
      });
    }

    if (!isPlaceholderData && currentPage > 1 && !isFetching) {
      const prevQueryKey = [
        'students',
        { page: currentPage - 1, limit: ITEMS_PER_PAGE, filter: currentFilter, search: searchTerm },
      ];
      console.log(`[usePaginatedStudents] Prefetching previous page: ${currentPage - 1}`);
      queryClient.prefetchQuery({
        queryKey: prevQueryKey,
        queryFn: () =>
          fetchStudents({
            page: currentPage - 1,
            limit: ITEMS_PER_PAGE,
            filter: currentFilter,
            searchTerm: searchTerm,
          }),
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
      console.log(`[usePaginatedStudents] setPage called with: ${page}`);
      let targetPage = page;
      const effectiveTotalPages = totalPages >= 1 ? totalPages : 1;
      if (page < 1) {
        targetPage = 1;
      } else if (page > effectiveTotalPages) {
        targetPage = effectiveTotalPages;
      }
      if (targetPage !== currentPage) {
        console.log(`[usePaginatedStudents] Setting current page to: ${targetPage}`);
        setCurrentPage(targetPage);
      } else {
        console.log(`[usePaginatedStudents] Already on page ${targetPage}, not changing.`);
      }
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
