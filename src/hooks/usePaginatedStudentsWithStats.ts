// src/hooks/usePaginatedStudentsWithStats.ts
import { useState, useCallback, useEffect } from 'react';
import { useQuery, keepPreviousData, useQueryClient } from '@tanstack/react-query';

import { fetchStudentsWithStats, StudentWithStats } from '../api/users';
import { useAuth } from '../contexts/AuthContext';
import { UserStatus } from '../types/dataTypes';

const ITEMS_PER_PAGE = 20;

export const usePaginatedStudentsWithStats = ({
  teacherId,
  initialFilter = 'active',
}: {
  teacherId?: string;
  initialFilter?: UserStatus | 'all';
}) => {
  const queryClient = useQueryClient();
  const { appUser } = useAuth();
  const companyId = appUser?.companyId;

  const [currentPage, setCurrentPage] = useState(1);
  const [currentFilter, setInternalFilter] = useState<UserStatus | 'all'>(initialFilter);
  const [searchTerm, setInternalSearchTerm] = useState('');

  const setFilter = useCallback((filter: UserStatus | 'all') => {
    setInternalFilter(filter);
  }, []);

  const setSearchTerm = useCallback((term: string) => {
    setInternalSearchTerm(term);
  }, []);

  const queryKey = [
    'studentsWithStats',
    { companyId, teacherId, page: currentPage, filter: currentFilter, search: searchTerm },
  ];

  const { data, isLoading, isFetching, isError, error, isPlaceholderData } = useQuery({
    queryKey,
    queryFn: () =>
      fetchStudentsWithStats({
        companyId: companyId!,
        teacherId,
        page: currentPage,
        limit: ITEMS_PER_PAGE,
        filter: currentFilter,
        searchTerm,
      }),
    enabled: !!companyId,
    placeholderData: keepPreviousData,
    staleTime: 5 * 60 * 1000,
  });

  useEffect(() => {
    if (currentPage !== 1) {
      setCurrentPage(1);
    }
  }, [currentFilter, searchTerm, teacherId]);

  const setPage = useCallback(
    (page: number) => {
      const totalPages = data?.totalPages ?? 1;
      let targetPage = page;
      if (page < 1) targetPage = 1;
      else if (page > totalPages) targetPage = totalPages;
      if (targetPage !== currentPage) setCurrentPage(targetPage);
    },
    [data?.totalPages, currentPage]
  );

  return {
    students: data?.items ?? [],
    currentPage,
    totalPages: data?.totalPages ?? 1,
    totalItems: data?.totalItems ?? 0,
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
