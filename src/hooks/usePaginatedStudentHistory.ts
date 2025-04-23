import { useState, useCallback, useEffect } from 'react';

import { useQuery, keepPreviousData } from '@tanstack/react-query';

import { fetchTicketHistory } from '../api/tickets';
import { TicketTransaction } from '../mocks/mockTickets';

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

const ITEMS_PER_PAGE = 10;

export const usePaginatedStudentHistory = (
  studentId: string | null | undefined
): UsePaginatedStudentHistoryReturn => {
  const [currentPage, setCurrentPage] = useState(1);

  const queryResult = useQuery({
    queryKey: ['ticket-history', { studentId, page: currentPage, limit: ITEMS_PER_PAGE }],

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
    console.log(`[usePaginatedStudentHistory] studentId changed to ${studentId}, resetting page.`);

    if (currentPage !== 1) {
      setCurrentPage(1);
    }
  }, [studentId]);

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
      console.log(`[usePaginatedStudentHistory] Setting current page to: ${targetPage}`);
      setCurrentPage(targetPage);
    },
    [totalPages]
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
