import { useState, useCallback, useEffect } from 'react';

import { useQuery, keepPreviousData, useQueryClient } from '@tanstack/react-query';

import { PaginatedReturn, User } from '../types/dataTypes';

import { fetchAdmins } from '../api/users';

interface UsePaginatedAdminsReturn extends PaginatedReturn {
  admins: User[];
}

const ITEMS_PER_PAGE = 20;

export const usePaginatedAdmins = (): UsePaginatedAdminsReturn => {
  const queryClient = useQueryClient();
  const [currentPage, setCurrentPage] = useState(1);

  const queryKey = ['admins', { page: currentPage, limit: ITEMS_PER_PAGE }];

  const queryResult = useQuery({
    queryKey: queryKey,
    queryFn: () => fetchAdmins({ page: currentPage, limit: ITEMS_PER_PAGE }),
    placeholderData: keepPreviousData,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });

  const { data, isLoading, isFetching, isError, error, isPlaceholderData } = queryResult;

  const admins = data?.items ?? [];
  const totalPages = data?.totalPages ?? 1;
  const totalItems = data?.totalItems ?? 0;

  useEffect(() => {
    const effectiveTotalPages = totalPages >= 1 ? totalPages : 1;
    if (!isPlaceholderData && !isFetching) {
      if (currentPage < effectiveTotalPages) {
        const nextQueryKey = ['admins', { page: currentPage + 1, limit: ITEMS_PER_PAGE }];
        queryClient.prefetchQuery({
          queryKey: nextQueryKey,
          queryFn: () => fetchAdmins({ page: currentPage + 1, limit: ITEMS_PER_PAGE }),
          staleTime: 5 * 60 * 1000,
        });
      }

      if (currentPage > 1) {
        const prevQueryKey = ['admins', { page: currentPage - 1, limit: ITEMS_PER_PAGE }];
        queryClient.prefetchQuery({
          queryKey: prevQueryKey,
          queryFn: () => fetchAdmins({ page: currentPage - 1, limit: ITEMS_PER_PAGE }),
          staleTime: 5 * 60 * 1000,
        });
      }
    }
  }, [currentPage, totalPages, isPlaceholderData, isFetching, queryClient]);

  const setPage = useCallback(
    (page: number) => {
      let targetPage = page;
      const effectiveTotalPages = totalPages >= 1 ? totalPages : 1;
      if (page < 1) targetPage = 1;
      else if (page > effectiveTotalPages) targetPage = effectiveTotalPages;
      if (targetPage !== currentPage) setCurrentPage(targetPage);
    },
    [totalPages, currentPage]
  );

  return {
    admins,
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
