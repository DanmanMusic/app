// src/hooks/usePaginatedTeachers.ts

import { useState, useCallback } from 'react';
import { useQuery, keepPreviousData } from '@tanstack/react-query';

// API Client & Types
import { fetchTeachers } from '../api/users'; // Assuming API functions are in this file
import { User } from '../types/userTypes';

// Define the shape of the return value
interface UsePaginatedTeachersReturn {
    teachers: User[]; // Returns the User objects
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

export const usePaginatedTeachers = (): UsePaginatedTeachersReturn => {
    const [currentPage, setCurrentPage] = useState(1);

    // Use TanStack Query to fetch teachers
    const queryResult = useQuery({
        queryKey: ['teachers', { page: currentPage }], // Query key includes page
        queryFn: () => fetchTeachers({ page: currentPage }), // Call the API function
        placeholderData: keepPreviousData, // Use placeholder for smooth pagination
        staleTime: 5 * 60 * 1000, // Data fresh for 5 minutes
        gcTime: 10 * 60 * 1000, // Cache for 10 minutes
    });

    // Extract data and flags
    const { data, isLoading, isFetching, isError, error, isPlaceholderData } = queryResult;

    const teachers = data?.items ?? []; // API returns items array
    const totalPages = data?.totalPages ?? 1; // Default to 1 page
    const totalItems = data?.totalItems ?? 0;

    // Function to change the current page
    const setPage = useCallback((page: number) => {
        console.log(`[usePaginatedTeachers] setPage called with: ${page}`);
        let targetPage = page;
        const effectiveTotalPages = totalPages >= 1 ? totalPages : 1;
        if (page < 1) {
            targetPage = 1;
        } else if (page > effectiveTotalPages) {
            targetPage = effectiveTotalPages;
        }
        console.log(`[usePaginatedTeachers] Setting current page to: ${targetPage}`);
        setCurrentPage(targetPage);
    }, [totalPages]);

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