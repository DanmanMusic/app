// src/hooks/usePaginatedTeachers.ts
import { useState, useCallback, useEffect } from 'react';

import { useQuery, keepPreviousData, useQueryClient } from '@tanstack/react-query';

import { PaginatedReturn, TeacherWithStats } from '../types/dataTypes';
import { useAuth } from '../contexts/AuthContext';
import { fetchTeachersWithStats } from '../api/users';

interface UsePaginatedTeachersReturn extends PaginatedReturn {
  teachers: TeacherWithStats[];
}

const ITEMS_PER_PAGE = 20;

export const usePaginatedTeachers = (): UsePaginatedTeachersReturn => {
  const queryClient = useQueryClient();
  const { appUser } = useAuth();
  const companyId = appUser?.companyId;

  const [currentPage, setCurrentPage] = useState(1);

  const queryKey = ['teachersWithStats', { companyId, page: currentPage, limit: ITEMS_PER_PAGE }];

  const queryResult = useQuery({
    queryKey: queryKey,
    queryFn: () =>
      fetchTeachersWithStats({
        companyId: companyId!,
        page: currentPage,
        limit: ITEMS_PER_PAGE,
      }),
    enabled: !!companyId,
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
    if (!isPlaceholderData && currentPage < effectiveTotalPages && !isFetching && companyId) {
      const nextQueryKey = [
        'teachersWithStats',
        { companyId, page: currentPage + 1, limit: ITEMS_PER_PAGE },
      ];
      queryClient.prefetchQuery({
        queryKey: nextQueryKey,
        queryFn: () =>
          fetchTeachersWithStats({
            companyId: companyId!,
            page: currentPage + 1,
            limit: ITEMS_PER_PAGE,
          }),
        staleTime: 5 * 60 * 1000,
      });
    }
  }, [currentPage, totalPages, isPlaceholderData, isFetching, queryClient, companyId]);

  const setPage = useCallback(
    (page: number) => {
      let targetPage = page;
      const effectiveTotalPages = totalPages >= 1 ? totalPages : 1;
      if (page < 1) {
        targetPage = 1;
      } else if (page > effectiveTotalPages) {
        targetPage = effectiveTotalPages;
      }
      if (targetPage !== currentPage) {
        setCurrentPage(targetPage);
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
