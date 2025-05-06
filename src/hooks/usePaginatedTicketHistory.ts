import { useState, useCallback, useEffect } from 'react';

import { useQuery, keepPreviousData, useQueryClient } from '@tanstack/react-query';

import { TicketTransaction } from '../types/dataTypes';

import { fetchTicketHistory } from '../api/tickets';

export interface UsePaginatedTicketHistoryReturn {
  history: TicketTransaction[];
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

const ITEMS_PER_PAGE = 25;

export const usePaginatedTicketHistory = (): UsePaginatedTicketHistoryReturn => {
  const queryClient = useQueryClient();
  const [currentPage, setCurrentPage] = useState(1);

  const queryKey = ['ticket-history', { page: currentPage, limit: ITEMS_PER_PAGE }];

  const queryResult = useQuery({
    queryKey: queryKey,
    queryFn: () =>
      fetchTicketHistory({
        page: currentPage,
        limit: ITEMS_PER_PAGE,
      }),
    placeholderData: keepPreviousData,
    staleTime: 1 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
  });

  const { data, isLoading, isFetching, isError, error, isPlaceholderData } = queryResult;

  const history = data?.items ?? [];
  const totalPages = data?.totalPages ?? 1;
  const totalItems = data?.totalItems ?? 0;

  useEffect(() => {
    const effectiveTotalPages = totalPages >= 1 ? totalPages : 1;
    const prefetchParamsBase = { limit: ITEMS_PER_PAGE };

    if (!isPlaceholderData && currentPage < effectiveTotalPages && !isFetching) {
      const nextPage = currentPage + 1;
      const nextQueryKey = ['ticket-history', { ...prefetchParamsBase, page: nextPage }];
      console.log(`[usePaginatedTicketHistory - Global] Prefetching next page: ${nextPage}`);
      queryClient.prefetchQuery({
        queryKey: nextQueryKey,
        queryFn: () => fetchTicketHistory({ ...prefetchParamsBase, page: nextPage }),
        staleTime: 1 * 60 * 1000,
      });
    }

    if (!isPlaceholderData && currentPage > 1 && !isFetching) {
      const prevPage = currentPage - 1;
      const prevQueryKey = ['ticket-history', { ...prefetchParamsBase, page: prevPage }];
      console.log(`[usePaginatedTicketHistory - Global] Prefetching previous page: ${prevPage}`);
      queryClient.prefetchQuery({
        queryKey: prevQueryKey,
        queryFn: () => fetchTicketHistory({ ...prefetchParamsBase, page: prevPage }),
        staleTime: 1 * 60 * 1000,
      });
    }
  }, [currentPage, totalPages, isPlaceholderData, isFetching, queryClient]);

  const setPage = useCallback(
    (page: number) => {
      console.log(`[usePaginatedTicketHistory - Global] setPage called with: ${page}`);
      let targetPage = page;
      const effectiveTotalPages = totalPages >= 1 ? totalPages : 1;
      if (page < 1) {
        targetPage = 1;
      } else if (page > effectiveTotalPages) {
        targetPage = effectiveTotalPages;
      }
      if (targetPage !== currentPage) {
        console.log(`[usePaginatedTicketHistory - Global] Setting current page to: ${targetPage}`);
        setCurrentPage(targetPage);
      } else {
        console.log(`[usePaginatedTicketHistory - Global] Already on page ${targetPage}.`);
      }
    },
    [totalPages, currentPage]
  );

  return {
    history,
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
