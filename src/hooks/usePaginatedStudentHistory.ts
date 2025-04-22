// src/hooks/usePaginatedStudentHistory.ts

import { useState, useMemo, useCallback, useEffect } from 'react';

// Contexts & Types
import { useData } from '../contexts/DataContext';
import { TicketTransaction } from '../mocks/mockTickets';

// Define the shape of the return value
export interface UsePaginatedStudentHistoryReturn {
    history: TicketTransaction[];
    currentPage: number;
    totalPages: number;
    setPage: (page: number) => void;
    isLoading: boolean;
    error: null | Error;
    totalHistoryCount: number; // Added total count
}

const ITEMS_PER_PAGE = 10; // Can use a different page size for history

export const usePaginatedStudentHistory = (studentId: string | null | undefined): UsePaginatedStudentHistoryReturn => {
    const { ticketHistory } = useData();

    // State for pagination
    const [currentPage, setCurrentPage] = useState(1);

    // Memoize the filtered and sorted list for the specific student
    const studentHistory = useMemo(() => {
        if (!studentId) return []; // Return empty if no student ID
        console.log(`[usePaginatedStudentHistory] Filtering history for student: ${studentId}`);
        const filtered = ticketHistory.filter(tx => tx.studentId === studentId);
        // Sort (most recent first)
        return filtered.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    }, [ticketHistory, studentId]);

     // Get total count before pagination
    const totalHistoryCount = useMemo(() => studentHistory.length, [studentHistory]);

    // Memoize the total number of pages
    const totalPages = useMemo(() => {
        const totalItems = studentHistory.length;
        const pages = Math.ceil(totalItems / ITEMS_PER_PAGE);
        console.log(`[usePaginatedStudentHistory] Recalculated totalPages: ${pages} for ${totalItems} items`);
        return pages > 0 ? pages : 1; // Ensure at least 1 page
    }, [studentHistory]);

     // Clamp currentPage and reset if studentId changes
     useEffect(() => {
        if (currentPage > totalPages) {
             console.log(`[usePaginatedStudentHistory] Current page ${currentPage} > total pages ${totalPages}, setting to ${totalPages}`);
            setCurrentPage(totalPages);
        }
         // Reset to page 1 if studentId changes
         setCurrentPage(1);
    }, [currentPage, totalPages, studentId]); // Add studentId dependency

    // Memoize the slice of history for the current page
    const paginatedHistory = useMemo(() => {
        const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
        const endIndex = startIndex + ITEMS_PER_PAGE;
         console.log(`[usePaginatedStudentHistory] Slicing page ${currentPage}: startIndex=${startIndex}, endIndex=${endIndex}`);
        return studentHistory.slice(startIndex, endIndex);
    }, [currentPage, studentHistory]);

    // Function to change the current page with bounds checking
    const setPage = useCallback((page: number) => {
        console.log(`[usePaginatedStudentHistory] setPage called with: ${page}`);
        let targetPage = page;
        if (page < 1) {
            targetPage = 1;
        } else if (page > totalPages) {
            targetPage = totalPages >= 1 ? totalPages : 1;
        }
         console.log(`[usePaginatedStudentHistory] Setting current page to: ${targetPage}`);
        setCurrentPage(targetPage);
    }, [totalPages]);

    // Return the state and functions
    return {
        history: paginatedHistory,
        currentPage,
        totalPages,
        setPage,
        isLoading: false, // Placeholder
        error: null, // Placeholder
        totalHistoryCount, // Return total count
    };
};