// src/hooks/usePaginatedTicketHistory.ts

import { useState, useMemo, useCallback, useEffect } from 'react';

// Contexts & Types
import { useData } from '../contexts/DataContext';
import { TicketTransaction } from '../mocks/mockTickets';

// Define the shape of the return value
export interface UsePaginatedTicketHistoryReturn {
    history: TicketTransaction[]; // Transactions for the current page
    currentPage: number;
    totalPages: number;
    setPage: (page: number) => void;
    isLoading: boolean;
    error: null | Error;
}

const ITEMS_PER_PAGE = 15; // Adjust page size for history view

export const usePaginatedTicketHistory = (): UsePaginatedTicketHistoryReturn => {
    const { ticketHistory } = useData(); // Get the full history list

    // State for pagination
    const [currentPage, setCurrentPage] = useState(1);

    // Memoize the sorted list (most recent first)
    const sortedHistory = useMemo(() => {
        console.log(`[usePaginatedTicketHistory] Sorting history.`);
        // Ensure sorting is correct
        return [...ticketHistory].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    }, [ticketHistory]);

    // Memoize the total number of pages
    const totalPages = useMemo(() => {
        const totalItems = sortedHistory.length;
        const pages = Math.ceil(totalItems / ITEMS_PER_PAGE);
        console.log(`[usePaginatedTicketHistory] Recalculated totalPages: ${pages} for ${totalItems} items`);
        return pages > 0 ? pages : 1; // Ensure at least 1 page
    }, [sortedHistory]);

     // Clamp currentPage if it becomes invalid (e.g., if history shrinks)
     // Although less likely in mock data, good practice for real data
     useEffect(() => {
        if (currentPage > totalPages) {
            console.log(`[usePaginatedTicketHistory] Current page ${currentPage} > total pages ${totalPages}, setting to ${totalPages}`);
            setCurrentPage(totalPages);
        }
    }, [currentPage, totalPages]);

    // Memoize the slice of history for the current page
    const paginatedHistory = useMemo(() => {
        const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
        const endIndex = startIndex + ITEMS_PER_PAGE;
        console.log(`[usePaginatedTicketHistory] Slicing page ${currentPage}: startIndex=${startIndex}, endIndex=${endIndex}`);
        return sortedHistory.slice(startIndex, endIndex);
    }, [currentPage, sortedHistory]);

    // Function to change the current page with bounds checking
    const setPage = useCallback((page: number) => {
        console.log(`[usePaginatedTicketHistory] setPage called with: ${page}`);
        let targetPage = page;
        if (page < 1) {
            targetPage = 1;
        } else if (page > totalPages) {
            targetPage = totalPages >= 1 ? totalPages : 1;
        }
         console.log(`[usePaginatedTicketHistory] Setting current page to: ${targetPage}`);
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
    };
};