import { useState, useCallback, useEffect } from 'react';
import { useQuery, keepPreviousData, useQueryClient } from '@tanstack/react-query';

import { fetchTicketHistory } from '../api/tickets';
import { TicketTransaction } from '../types/dataTypes';

export interface UsePaginatedStudentHistoryReturn {
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

const ITEMS_PER_PAGE = 20;

export const usePaginatedStudentHistory = (
  studentId: string | null | undefined
): UsePaginatedStudentHistoryReturn => {
  const queryClient = useQueryClient();
  const [currentPage, setCurrentPage] = useState(1);

  const queryKey = ['ticket-history', { studentId, page: currentPage, limit: ITEMS_PER_PAGE }];

  const queryResult = useQuery({
    queryKey: queryKey,
    queryFn: () =>
      fetchTicketHistory({
        studentId: studentId ?? undefined,
        page: currentPage,
        limit: ITEMS_PER_PAGE,
      }),

    enabled: !!studentId,
    placeholderData: keepPreviousData,
    staleTime: 1 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
  });

  const { data, isLoading, isFetching, isError, error, isPlaceholderData } = queryResult;

  const history = data?.items ?? [];
  const totalPages = data?.totalPages ?? 1;
  const totalItems = data?.totalItems ?? 0;

  useEffect(() => {
    if (currentPage !== 1) {
      console.log(
        `[usePaginatedStudentHistory] studentId changed to ${studentId}, resetting page to 1.`
      );
      setCurrentPage(1);
    }
  }, [studentId]);

  useEffect(() => {
    if (!studentId) return;

    const effectiveTotalPages = totalPages >= 1 ? totalPages : 1;
    const prefetchParamsBase = { studentId: studentId ?? undefined, limit: ITEMS_PER_PAGE };

    if (!isPlaceholderData && currentPage < effectiveTotalPages && !isFetching) {
      const nextPage = currentPage + 1;
      const nextQueryKey = ['ticket-history', { ...prefetchParamsBase, page: nextPage }];
      console.log(
        `[usePaginatedStudentHistory] Prefetching next page for student ${studentId}: ${nextPage}`
      );
      queryClient.prefetchQuery({
        queryKey: nextQueryKey,
        queryFn: () => fetchTicketHistory({ ...prefetchParamsBase, page: nextPage }),
        staleTime: 1 * 60 * 1000,
      });
    }

    if (!isPlaceholderData && currentPage > 1 && !isFetching) {
      const prevPage = currentPage - 1;
      const prevQueryKey = ['ticket-history', { ...prefetchParamsBase, page: prevPage }];
      console.log(
        `[usePaginatedStudentHistory] Prefetching previous page for student ${studentId}: ${prevPage}`
      );
      queryClient.prefetchQuery({
        queryKey: prevQueryKey,
        queryFn: () => fetchTicketHistory({ ...prefetchParamsBase, page: prevPage }),
        staleTime: 1 * 60 * 1000,
      });
    }
  }, [currentPage, totalPages, isPlaceholderData, isFetching, queryClient, studentId]);

  const setPage = useCallback(
    (page: number) => {
      console.log(`[usePaginatedStudentHistory] setPage called with: ${page}`);
      let targetPage = page;
      const effectiveTotalPages = totalPages >= 1 ? totalPages : 1;
      if (page < 1) {
        targetPage = 1;
      } else if (page > effectiveTotalPages) {
        targetPage = effectiveTotalPages;
      }
      if (targetPage !== currentPage) {
        console.log(`[usePaginatedStudentHistory] Setting current page to: ${targetPage}`);
        setCurrentPage(targetPage);
      } else {
        console.log(`[usePaginatedStudentHistory] Already on page ${targetPage}.`);
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
