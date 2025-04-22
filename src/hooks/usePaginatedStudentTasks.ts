// src/hooks/usePaginatedStudentTasks.ts

import { useState, useMemo, useCallback, useEffect } from 'react';

// Contexts & Types
import { useData } from '../contexts/DataContext';
import { AssignedTask } from '../mocks/mockAssignedTasks';

// Define the shape of the return value
export interface UsePaginatedStudentTasksReturn {
    tasks: AssignedTask[];
    currentPage: number;
    totalPages: number;
    setPage: (page: number) => void;
    isLoading: boolean;
    error: null | Error;
    totalTasksCount: number; // Added total count
}

const ITEMS_PER_PAGE = 5; // Keep page size smaller for detail views

export const usePaginatedStudentTasks = (studentId: string | null | undefined): UsePaginatedStudentTasksReturn => {
    const { assignedTasks } = useData();

    // State for pagination
    const [currentPage, setCurrentPage] = useState(1);

    // Memoize the filtered and sorted list for the specific student
    const studentTasks = useMemo(() => {
        if (!studentId) return []; // Return empty if no student ID
        console.log(`[usePaginatedStudentTasks] Filtering tasks for student: ${studentId}`);
        const filtered = assignedTasks.filter(task => task.studentId === studentId);
        // Sort (e.g., by assigned date descending)
        return filtered.sort((a, b) => new Date(b.assignedDate).getTime() - new Date(a.assignedDate).getTime());
    }, [assignedTasks, studentId]);

    // Get total count before pagination
    const totalTasksCount = useMemo(() => studentTasks.length, [studentTasks]);

    // Memoize the total number of pages
    const totalPages = useMemo(() => {
        const totalItems = studentTasks.length;
        const pages = Math.ceil(totalItems / ITEMS_PER_PAGE);
        console.log(`[usePaginatedStudentTasks] Recalculated totalPages: ${pages} for ${totalItems} items`);
        return pages > 0 ? pages : 1; // Ensure at least 1 page
    }, [studentTasks]);

     // Clamp currentPage if it becomes invalid (e.g., if tasks are deleted)
     useEffect(() => {
        if (currentPage > totalPages) {
            console.log(`[usePaginatedStudentTasks] Current page ${currentPage} > total pages ${totalPages}, setting to ${totalPages}`);
            setCurrentPage(totalPages);
        }
        // Reset to page 1 if studentId changes
        setCurrentPage(1);
    }, [currentPage, totalPages, studentId]); // Add studentId dependency


    // Memoize the slice of tasks for the current page
    const paginatedTasks = useMemo(() => {
        const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
        const endIndex = startIndex + ITEMS_PER_PAGE;
        console.log(`[usePaginatedStudentTasks] Slicing page ${currentPage}: startIndex=${startIndex}, endIndex=${endIndex}`);
        return studentTasks.slice(startIndex, endIndex);
    }, [currentPage, studentTasks]);

    // Function to change the current page with bounds checking
    const setPage = useCallback((page: number) => {
        console.log(`[usePaginatedStudentTasks] setPage called with: ${page}`);
        let targetPage = page;
        if (page < 1) {
            targetPage = 1;
        } else if (page > totalPages) {
            targetPage = totalPages >= 1 ? totalPages : 1;
        }
        console.log(`[usePaginatedStudentTasks] Setting current page to: ${targetPage}`);
        setCurrentPage(targetPage);
    }, [totalPages]);

    // Return the state and functions
    return {
        tasks: paginatedTasks,
        currentPage,
        totalPages,
        setPage,
        isLoading: false, // Placeholder
        error: null, // Placeholder
        totalTasksCount, // Return total count
    };
};