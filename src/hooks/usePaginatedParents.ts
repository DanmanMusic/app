

import { useState, useCallback } from 'react';
import { useQuery, keepPreviousData } from '@tanstack/react-query';


import { fetchParents } from '../api/users'; 
import { User } from '../types/userTypes';


interface UsePaginatedParentsReturn {
  parents: User[]; 
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

const ITEMS_PER_PAGE = 5; 

export const usePaginatedParents = (): UsePaginatedParentsReturn => {
  const [currentPage, setCurrentPage] = useState(1);

  
  const queryResult = useQuery({
    queryKey: ['parents', { page: currentPage }], 
    queryFn: () => fetchParents({ page: currentPage }), 
    placeholderData: keepPreviousData, 
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });

  
  const { data, isLoading, isFetching, isError, error, isPlaceholderData } = queryResult;

  const parents = data?.items ?? []; 
  const totalPages = data?.totalPages ?? 1;
  const totalItems = data?.totalItems ?? 0;

  
  const setPage = useCallback(
    (page: number) => {
      console.log(`[usePaginatedParents] setPage called with: ${page}`);
      let targetPage = page;
      const effectiveTotalPages = totalPages >= 1 ? totalPages : 1;
      if (page < 1) {
        targetPage = 1;
      } else if (page > effectiveTotalPages) {
        targetPage = effectiveTotalPages;
      }
      console.log(`[usePaginatedParents] Setting current page to: ${targetPage}`);
      setCurrentPage(targetPage);
    },
    [totalPages]
  );

  return {
    parents,
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
