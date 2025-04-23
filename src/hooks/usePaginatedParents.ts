// src/hooks/usePaginatedParents.ts

import { useState, useCallback } from 'react';
import { useQuery, keepPreviousData } from '@tanstack/react-query';

// API Client & Types
import { fetchParents } from '../api/users'; // Assuming API functions are in this file
import { User } from '../types/userTypes';

// Define the shape of the return value
interface UsePaginatedParentsReturn {
    parents: User[]; // Returns the User objects
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

const ITEMS_PER_PAGE = 5; // Keep consistent or adjust

export const usePaginatedParents = (): UsePaginatedParentsReturn => {
    const [currentPage, setCurrentPage] = useState(1);

    // Use TanStack Query to fetch parents
    const queryResult = useQuery({
        queryKey: ['parents', { page: currentPage }], // Query key includes page
        queryFn: () => fetchParents({ page: currentPage }), // Call the API function
        placeholderData: keepPreviousData, // Use placeholder for smooth pagination
        staleTime: 5 * 60 * 1000,
        gcTime: 10 * 60 * 1000,
    });

    // Extract data and flags
    const { data, isLoading, isFetching, isError, error, isPlaceholderData } = queryResult;

    const parents = data?.items ?? []; // API returns items array
    const totalPages = data?.totalPages ?? 1;
    const totalItems = data?.totalItems ?? 0;

    // Function to change the current page
    const setPage = useCallback((page: number) => {
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
    }, [totalPages]);

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