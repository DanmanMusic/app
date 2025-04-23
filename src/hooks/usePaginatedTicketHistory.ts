import { useState, useCallback } from 'react';

import { useQuery, keepPreviousData } from '@tanstack/react-query';

import { fetchTicketHistory } from '../api/tickets';
import { TicketTransaction } from '../mocks/mockTickets';

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

const ITEMS_PER_PAGE = 15;

export const usePaginatedTicketHistory = (): UsePaginatedTicketHistoryReturn => {
  const [currentPage, setCurrentPage] = useState(1);

  const queryResult = useQuery({
    queryKey: ['ticket-history', { page: currentPage, limit: ITEMS_PER_PAGE }],

    queryFn: () => fetchTicketHistory({ page: currentPage, limit: ITEMS_PER_PAGE }),
    placeholderData: keepPreviousData,
    staleTime: 1 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
  });

  const { data, isLoading, isFetching, isError, error, isPlaceholderData } = queryResult;

  const history = data?.items ?? [];
  const totalPages = data?.totalPages ?? 1;
  const totalItems = data?.totalItems ?? 0;

  const setPage = useCallback(
    (page: number) => {
      console.log(`[usePaginatedTicketHistory] setPage called with: ${page}`);
      let targetPage = page;
      const effectiveTotalPages = totalPages >= 1 ? totalPages : 1;
      if (page < 1) {
        targetPage = 1;
      } else if (page > effectiveTotalPages) {
        targetPage = effectiveTotalPages;
      }
      console.log(`[usePaginatedTicketHistory] Setting current page to: ${targetPage}`);
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
