// src/hooks/usePaginatedAssignedTasks.ts

import { useState, useMemo, useCallback, useEffect } from 'react';

// Contexts & Types
import { useData } from '../contexts/DataContext';
import { AssignedTask } from '../mocks/mockAssignedTasks';
import { UserStatus } from '../types/userTypes';

// Type definitions for filters
export type TaskAssignmentFilterStatus = 'all' | 'assigned' | 'pending' | 'completed';
export type StudentTaskFilterStatus = UserStatus | 'all'; // 'active', 'inactive', 'all'

// Define the shape of the return value
export interface UsePaginatedAssignedTasksReturn {
    tasks: AssignedTask[];
    currentPage: number;
    totalPages: number;
    setPage: (page: number) => void;
    assignmentFilter: TaskAssignmentFilterStatus;
    setAssignmentFilter: (filter: TaskAssignmentFilterStatus) => void;
    studentStatusFilter: StudentTaskFilterStatus;
    setStudentStatusFilter: (filter: StudentTaskFilterStatus) => void;
    isLoading: boolean;
    error: null | Error;
}

const ITEMS_PER_PAGE = 10; // Adjust page size as needed

export const usePaginatedAssignedTasks = (
    initialAssignmentFilter: TaskAssignmentFilterStatus = 'pending',
    initialStudentStatusFilter: StudentTaskFilterStatus = 'active'
): UsePaginatedAssignedTasksReturn => {
    const { assignedTasks, currentMockUsers } = useData();

    // State for filters and pagination
    const [assignmentFilter, setAssignmentFilter] = useState<TaskAssignmentFilterStatus>(initialAssignmentFilter);
    const [studentStatusFilter, setStudentStatusFilter] = useState<StudentTaskFilterStatus>(initialStudentStatusFilter);
    const [currentPage, setCurrentPage] = useState(1);

    // Memoize the filtered and sorted list
    const filteredAndSortedTasks = useMemo(() => {
        console.log(`[usePaginatedAssignedTasks] Filtering tasks. Assignment: ${assignmentFilter}, Student Status: ${studentStatusFilter}`);

        const filtered = assignedTasks.filter(task => {
            // Filter by assignment status
            let assignmentMatch: boolean = false; // <-- Initialize here
            switch (assignmentFilter) {
                case 'assigned':
                    assignmentMatch = !task.isComplete;
                    break;
                case 'pending':
                    assignmentMatch = task.isComplete && task.verificationStatus === 'pending';
                    break;
                case 'completed':
                    // Ensure boolean evaluation even if verificationStatus is undefined but task is complete
                    assignmentMatch = task.isComplete === true && task.verificationStatus !== undefined && task.verificationStatus !== 'pending';
                    break;
                case 'all':
                default:
                    assignmentMatch = true;
                    break;
            }
            if (!assignmentMatch) return false;

            // Filter by student status
            const student = currentMockUsers[task.studentId];
            if (!student) {
                 console.warn(`[usePaginatedAssignedTasks] Student ${task.studentId} not found for task ${task.id}. Excluding task.`);
                 return false; // Skip tasks with unknown students
            }
            let studentStatusMatch: boolean = false; // <-- Initialize here
            switch (studentStatusFilter) {
                case 'active':
                    studentStatusMatch = student.status === 'active';
                    break;
                case 'inactive':
                    studentStatusMatch = student.status === 'inactive';
                    break;
                case 'all':
                default:
                    studentStatusMatch = true;
                    break;
            }
            return studentStatusMatch; // Combined result (assignmentMatch already checked)
        });

        // Sort (e.g., by assigned date descending)
        return filtered.sort((a, b) => new Date(b.assignedDate).getTime() - new Date(a.assignedDate).getTime());

    }, [assignedTasks, assignmentFilter, studentStatusFilter, currentMockUsers]);

    // Recalculate total pages whenever the filtered list changes
    const totalPages = useMemo(() => {
        const totalItems = filteredAndSortedTasks.length;
        const pages = Math.ceil(totalItems / ITEMS_PER_PAGE);
        console.log(`[usePaginatedAssignedTasks] Recalculated totalPages: ${pages} for ${totalItems} items`);
        return pages > 0 ? pages : 1;
    }, [filteredAndSortedTasks]);

    // Reset to page 1 whenever *any* filter changes
    useEffect(() => {
        console.log(`[usePaginatedAssignedTasks] Filter changed, resetting to page 1.`);
        setCurrentPage(1);
    }, [assignmentFilter, studentStatusFilter]);

    // Clamp currentPage if it becomes invalid
    useEffect(() => {
        if (currentPage > totalPages) {
             console.log(`[usePaginatedAssignedTasks] Current page ${currentPage} > total pages ${totalPages}, setting to ${totalPages}`);
            setCurrentPage(totalPages);
        }
    }, [currentPage, totalPages]);

    // Memoize the slice of tasks for the current page
    const paginatedTasks = useMemo(() => {
        const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
        const endIndex = startIndex + ITEMS_PER_PAGE;
        console.log(`[usePaginatedAssignedTasks] Slicing page ${currentPage}: startIndex=${startIndex}, endIndex=${endIndex}`);
        return filteredAndSortedTasks.slice(startIndex, endIndex);
    }, [currentPage, filteredAndSortedTasks]);

    // Function to change the current page with bounds checking
    const setPage = useCallback((page: number) => {
        console.log(`[usePaginatedAssignedTasks] setPage called with: ${page}`);
        let targetPage = page;
        if (page < 1) {
            targetPage = 1;
        } else if (page > totalPages) {
            targetPage = totalPages >= 1 ? totalPages : 1;
        }
        console.log(`[usePaginatedAssignedTasks] Setting current page to: ${targetPage}`);
        setCurrentPage(targetPage);
    }, [totalPages]);

    // Return the state and functions
    return {
        tasks: paginatedTasks,
        currentPage,
        totalPages,
        setPage,
        assignmentFilter,
        setAssignmentFilter,
        studentStatusFilter,
        setStudentStatusFilter,
        isLoading: false,
        error: null,
    };
};