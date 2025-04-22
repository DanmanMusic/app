// src/hooks/usePaginatedParents.ts

import { useState, useMemo, useCallback } from 'react';

// Contexts & Types
import { useData } from '../contexts/DataContext';
import { User } from '../types/userTypes';

// Constants
const ITEMS_PER_PAGE = 5; // Keep consistent

// Define the shape of the return value
interface UsePaginatedParentsReturn {
    parents: User[]; // Returns the User objects for the current page
    currentPage: number;
    totalPages: number;
    setPage: (page: number) => void;
    isLoading: boolean;
    error: null | Error;
}

export const usePaginatedParents = (): UsePaginatedParentsReturn => {
    const { currentMockUsers } = useData();

    const [currentPage, setCurrentPage] = useState(1);

    // Memoize the list of all parents, sorted
    const sortedParents = useMemo(() => {
        return Object.values(currentMockUsers)
            .filter(user => user.role === 'parent')
            .sort((a, b) => {
                // Parents might not always have last names in some systems, add fallback
                const lastNameA = a.lastName || '';
                const lastNameB = b.lastName || '';
                const firstNameA = a.firstName || '';
                const firstNameB = b.firstName || '';

                const lastNameComparison = lastNameA.localeCompare(lastNameB);
                if (lastNameComparison !== 0) return lastNameComparison;
                return firstNameA.localeCompare(firstNameB);
            });
    }, [currentMockUsers]);

    // Memoize the total number of pages
    const totalPages = useMemo(() => {
        const totalItems = sortedParents.length;
        return Math.ceil(totalItems / ITEMS_PER_PAGE);
    }, [sortedParents]);

    // Memoize the slice of parents for the current page
    const paginatedParents = useMemo(() => {
        const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
        const endIndex = startIndex + ITEMS_PER_PAGE;
         if (currentPage > totalPages && totalPages > 0) {
             const firstPageStartIndex = 0;
             const firstPageEndIndex = firstPageStartIndex + ITEMS_PER_PAGE;
             return sortedParents.slice(firstPageStartIndex, firstPageEndIndex);
         }
          if (currentPage < 1 && totalPages > 0) {
             const firstPageStartIndex = 0;
             const firstPageEndIndex = firstPageStartIndex + ITEMS_PER_PAGE;
             return sortedParents.slice(firstPageStartIndex, firstPageEndIndex);
         }
        return sortedParents.slice(startIndex, endIndex);
    }, [currentPage, sortedParents, totalPages]);

    // Function to change the current page
    const setPage = useCallback((page: number) => {
        let targetPage = page;
        if (page < 1) {
            targetPage = 1;
        } else if (page > totalPages && totalPages > 0) {
            targetPage = totalPages;
        }
        setCurrentPage(targetPage);
    }, [totalPages]);

    return {
        parents: paginatedParents,
        currentPage,
        totalPages,
        setPage,
        isLoading: false,
        error: null,
    };
};