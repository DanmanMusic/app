// src/hooks/usePaginatedStudents.ts

import { useEffect, useState, useMemo, useCallback } from 'react';

// Contexts & Types
import { useData } from '../contexts/DataContext';
import { User, UserStatus } from '../types/userTypes';
import { SimplifiedStudent } from '../types/dataTypes'; // Needed for return type
import { getUserDisplayName } from '../utils/helpers';

// Constants
const ITEMS_PER_PAGE = 5; // Or your desired page size

// Define the shape of the return value for this hook
export interface UsePaginatedStudentsReturn {
    students: SimplifiedStudent[]; // Return simplified structure for display list
    currentPage: number;
    totalPages: number;
    setPage: (page: number) => void;
    currentFilter: UserStatus | 'all'; // The currently active filter
    setFilter: (filter: UserStatus | 'all') => void; // Function to change the filter
    isLoading: boolean; // Placeholder for future API loading state
    error: null | Error; // Placeholder for future API errors
}

export const usePaginatedStudents = (): UsePaginatedStudentsReturn => {
    const { currentMockUsers, ticketBalances } = useData(); // Need balances for SimplifiedStudent

    // State for pagination and filtering
    const [currentPage, setCurrentPage] = useState(1);
    const [currentFilter, setFilter] = useState<UserStatus | 'all'>('active'); // Default to active

    // Memoize the filtered and sorted list based on the current filter
    const filteredAndSortedStudents = useMemo(() => {
        console.log(`[usePaginatedStudents] Filtering/Sorting based on filter: ${currentFilter}`);
        return Object.values(currentMockUsers)
            .filter(user => user.role === 'student')
            .filter(student => {
                if (currentFilter === 'all') return true;
                return student.status === currentFilter;
            })
            .sort((a, b) => {
                // Sort primarily by status (active first), then by name
                if (a.status === 'active' && b.status === 'inactive') return -1;
                if (a.status === 'inactive' && b.status === 'active') return 1;
                // If statuses are the same, sort by name
                const lastNameComparison = a.lastName.localeCompare(b.lastName);
                if (lastNameComparison !== 0) return lastNameComparison;
                return a.firstName.localeCompare(b.firstName);
            });
    }, [currentMockUsers, currentFilter]);

    // Recalculate total pages whenever the filtered list changes
    const totalPages = useMemo(() => {
        const totalItems = filteredAndSortedStudents.length;
        const pages = Math.ceil(totalItems / ITEMS_PER_PAGE);
        console.log(`[usePaginatedStudents] Recalculated totalPages: ${pages} for ${totalItems} items`);
        return pages > 0 ? pages : 1; // Ensure at least 1 page
    }, [filteredAndSortedStudents]);

    // Reset to page 1 whenever the filter changes
    useEffect(() => {
        console.log(`[usePaginatedStudents] Filter changed to ${currentFilter}, resetting to page 1.`);
        setCurrentPage(1);
    }, [currentFilter]);


     // Clamp currentPage if it becomes invalid after filtering/data changes
     useEffect(() => {
        if (currentPage > totalPages) {
            console.log(`[usePaginatedStudents] Current page ${currentPage} > total pages ${totalPages}, setting to ${totalPages}`);
            setCurrentPage(totalPages);
        }
         // Optional: handle case where currentPage is less than 1? Should be prevented by setPage.
         // if (currentPage < 1 && totalPages >= 1) {
         //     setCurrentPage(1);
         // }
    }, [currentPage, totalPages]);

    // Memoize the slice of students for the current page
    const paginatedStudents = useMemo(() => {
        const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
        const endIndex = startIndex + ITEMS_PER_PAGE;
        console.log(`[usePaginatedStudents] Slicing page ${currentPage}: startIndex=${startIndex}, endIndex=${endIndex}`);
        const sliced = filteredAndSortedStudents.slice(startIndex, endIndex);

        // Map to SimplifiedStudent structure
        return sliced.map(student => ({
             id: student.id,
             name: getUserDisplayName(student),
             instrumentIds: student.instrumentIds,
             balance: ticketBalances[student.id] || 0, // Get balance from context
             isActive: student.status === 'active',
        }));

    }, [currentPage, filteredAndSortedStudents, ticketBalances]);

    // Function to change the current page with bounds checking
    const setPage = useCallback((page: number) => {
        console.log(`[usePaginatedStudents] setPage called with: ${page}`);
        let targetPage = page;
        if (page < 1) {
            targetPage = 1;
        } else if (page > totalPages) {
            // Avoid setting page beyond total pages if totalPages is 0 or more
             targetPage = totalPages >= 1 ? totalPages : 1;
        }
         console.log(`[usePaginatedStudents] Setting current page to: ${targetPage}`);
        setCurrentPage(targetPage);
    }, [totalPages]);


    // Return the state and functions needed by the component
    return {
        students: paginatedStudents,
        currentPage,
        totalPages,
        setPage,
        currentFilter,
        setFilter, // Expose the filter setter function
        isLoading: false, // Placeholder
        error: null, // Placeholder
    };
};