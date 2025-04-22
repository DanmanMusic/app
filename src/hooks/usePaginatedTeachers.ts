// src/hooks/usePaginatedTeachers.ts

import { useState, useMemo, useCallback } from 'react';

// Contexts & Types
import { useData } from '../contexts/DataContext';
import { User } from '../types/userTypes';

// Constants
const ITEMS_PER_PAGE = 5; // Keep consistent or adjust as needed

// Define the shape of the return value
interface UsePaginatedTeachersReturn {
    teachers: User[]; // Returns the User objects for the current page
    currentPage: number;
    totalPages: number;
    setPage: (page: number) => void;
    isLoading: boolean;
    error: null | Error;
}

export const usePaginatedTeachers = (): UsePaginatedTeachersReturn => {
    const { currentMockUsers } = useData();

    const [currentPage, setCurrentPage] = useState(1);

    // Memoize the list of all teachers, sorted
    const sortedTeachers = useMemo(() => {
        return Object.values(currentMockUsers)
            .filter(user => user.role === 'teacher')
            .sort((a, b) => {
                const lastNameComparison = a.lastName.localeCompare(b.lastName);
                if (lastNameComparison !== 0) return lastNameComparison;
                return a.firstName.localeCompare(b.firstName);
            });
    }, [currentMockUsers]);

    // Memoize the total number of pages
    const totalPages = useMemo(() => {
        const totalItems = sortedTeachers.length;
        return Math.ceil(totalItems / ITEMS_PER_PAGE);
    }, [sortedTeachers]);

    // Memoize the slice of teachers for the current page
    const paginatedTeachers = useMemo(() => {
        const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
        const endIndex = startIndex + ITEMS_PER_PAGE;
        // Basic bounds check for currentPage, though less critical without filtering
         if (currentPage > totalPages && totalPages > 0) {
             const firstPageStartIndex = 0;
             const firstPageEndIndex = firstPageStartIndex + ITEMS_PER_PAGE;
             return sortedTeachers.slice(firstPageStartIndex, firstPageEndIndex);
         }
          if (currentPage < 1 && totalPages > 0) {
             const firstPageStartIndex = 0;
             const firstPageEndIndex = firstPageStartIndex + ITEMS_PER_PAGE;
             return sortedTeachers.slice(firstPageStartIndex, firstPageEndIndex);
         }
        return sortedTeachers.slice(startIndex, endIndex);
    }, [currentPage, sortedTeachers, totalPages]);

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
        teachers: paginatedTeachers,
        currentPage,
        totalPages,
        setPage,
        isLoading: false,
        error: null,
    };
};