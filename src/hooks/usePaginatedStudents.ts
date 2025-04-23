// src/hooks/usePaginatedStudents.ts

import { useState, useMemo, useCallback, useEffect } from 'react';
// Import useQuery and the keepPreviousData helper from TanStack Query
import { useQuery, keepPreviousData } from '@tanstack/react-query';

// API Client & Types
import { fetchStudents } from '../api/users'; // Use the API client function
import { UserStatus } from '../types/userTypes';
import { SimplifiedStudent } from '../types/dataTypes';

// Define the shape of the return value for this hook (adding search and TQ flags)
export interface UsePaginatedStudentsReturn {
    students: SimplifiedStudent[];
    currentPage: number;
    totalPages: number;
    totalItems: number; // Add total items count
    setPage: (page: number) => void;
    currentFilter: UserStatus | 'all';
    setFilter: (filter: UserStatus | 'all') => void;
    searchTerm: string; // Add search term state
    setSearchTerm: (term: string) => void; // Add search term setter
    isLoading: boolean; // Loading state for initial fetch when no data/placeholder exists
    isFetching: boolean; // Loading state for background refetches/new page fetches
    isPlaceholderData: boolean; // Flag indicating placeholder data is shown
    isError: boolean; // Query error state
    error: Error | null; // Error object
}

const ITEMS_PER_PAGE = 5; // Ensure this matches the MSW handler if needed there

export const usePaginatedStudents = (): UsePaginatedStudentsReturn => {
    // State for pagination, filtering, and searching
    const [currentPage, setCurrentPage] = useState(1);
    const [currentFilter, setFilter] = useState<UserStatus | 'all'>('active'); // Default filter
    const [searchTerm, setSearchTerm] = useState('');

    // Debounce search term locally if needed in a real app, but skip for simplicity here

    // Use TanStack Query to fetch data
    const queryResult = useQuery({
        // Query key: An array that uniquely identifies this query.
        // TQ automatically refetches when these keys change.
        queryKey: ['students', { page: currentPage, filter: currentFilter, search: searchTerm }],
        // Query function: The async function to fetch data.
        queryFn: () => fetchStudents({ page: currentPage, filter: currentFilter, searchTerm: searchTerm }),
        // Options:
        // Use the keepPreviousData function from TQ as placeholderData
        // This shows the data from the previous page/filter while the new data loads
        placeholderData: keepPreviousData,
        staleTime: 5 * 60 * 1000, // Data is considered fresh for 5 minutes
        gcTime: 10 * 60 * 1000, // cacheTime is now gcTime (garbage collection time in ms)
    });

    // Extract data and flags from the query result
    // isPlaceholderData tells us if we are showing old data while fetching new data
    const { data, isLoading, isFetching, isError, error, isPlaceholderData } = queryResult;

    // If using placeholderData, 'data' might be from a previous query key.
    // We often rely on `isFetching` to show loading state during page changes.
    const students = data?.students ?? [];
    const totalPages = data?.totalPages ?? 1; // Default to 1 page if no data
    const totalItems = data?.totalItems ?? 0;

    // Reset to page 1 whenever filter or search term changes
    useEffect(() => {
        console.log(`[usePaginatedStudents] Filter or Search changed, resetting page to 1.`);
        // Check if currentPage is already 1 to avoid unnecessary state update/refetch
        if (currentPage !== 1) {
            setCurrentPage(1);
        }
    }, [currentFilter, searchTerm]); // Removed currentPage from dependency array here

    // Function to change the current page with bounds checking
    const setPage = useCallback((page: number) => {
        console.log(`[usePaginatedStudents] setPage called with: ${page}`);
        let targetPage = page;
        // Ensure page is within valid bounds (1 to totalPages)
        // Ensure totalPages is at least 1 before using it in comparison
        const effectiveTotalPages = totalPages >= 1 ? totalPages : 1;
        if (page < 1) {
            targetPage = 1;
        } else if (page > effectiveTotalPages) {
            targetPage = effectiveTotalPages;
        }
        console.log(`[usePaginatedStudents] Setting current page to: ${targetPage}`);
        setCurrentPage(targetPage);
    }, [totalPages]); // Depends only on totalPages for bounds check

    // Return the state and functions needed by the component
    return {
        students,
        currentPage,
        totalPages,
        totalItems,
        setPage,
        currentFilter,
        setFilter,
        searchTerm,
        setSearchTerm,
        isLoading, // Use for initial load indicator
        // Use isFetching to indicate background activity or new page load indicator
        // when placeholderData is being shown
        isFetching: isFetching,
        isPlaceholderData, // Pass this flag through
        isError,
        error: error instanceof Error ? error : null, // Ensure error is Error or null
    };
};