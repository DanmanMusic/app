

import { useState, useMemo, useCallback, useEffect } from 'react';


import { useData } from '../contexts/DataContext';
import { AssignedTask } from '../mocks/mockAssignedTasks';


export interface UsePaginatedStudentTasksReturn {
  tasks: AssignedTask[];
  currentPage: number;
  totalPages: number;
  setPage: (page: number) => void;
  isLoading: boolean;
  error: null | Error;
  totalTasksCount: number; 
}

const ITEMS_PER_PAGE = 5; 

export const usePaginatedStudentTasks = (
  studentId: string | null | undefined
): UsePaginatedStudentTasksReturn => {
  const { assignedTasks } = useData();

  
  const [currentPage, setCurrentPage] = useState(1);

  
  const studentTasks = useMemo(() => {
    if (!studentId) return []; 
    console.log(`[usePaginatedStudentTasks] Filtering tasks for student: ${studentId}`);
    const filtered = assignedTasks.filter(task => task.studentId === studentId);
    
    return filtered.sort(
      (a, b) => new Date(b.assignedDate).getTime() - new Date(a.assignedDate).getTime()
    );
  }, [assignedTasks, studentId]);

  
  const totalTasksCount = useMemo(() => studentTasks.length, [studentTasks]);

  
  const totalPages = useMemo(() => {
    const totalItems = studentTasks.length;
    const pages = Math.ceil(totalItems / ITEMS_PER_PAGE);
    console.log(
      `[usePaginatedStudentTasks] Recalculated totalPages: ${pages} for ${totalItems} items`
    );
    return pages > 0 ? pages : 1; 
  }, [studentTasks]);

  
  useEffect(() => {
    if (currentPage > totalPages) {
      console.log(
        `[usePaginatedStudentTasks] Current page ${currentPage} > total pages ${totalPages}, setting to ${totalPages}`
      );
      setCurrentPage(totalPages);
    }
    
    setCurrentPage(1);
  }, [currentPage, totalPages, studentId]); 

  
  const paginatedTasks = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    console.log(
      `[usePaginatedStudentTasks] Slicing page ${currentPage}: startIndex=${startIndex}, endIndex=${endIndex}`
    );
    return studentTasks.slice(startIndex, endIndex);
  }, [currentPage, studentTasks]);

  
  const setPage = useCallback(
    (page: number) => {
      console.log(`[usePaginatedStudentTasks] setPage called with: ${page}`);
      let targetPage = page;
      if (page < 1) {
        targetPage = 1;
      } else if (page > totalPages) {
        targetPage = totalPages >= 1 ? totalPages : 1;
      }
      console.log(`[usePaginatedStudentTasks] Setting current page to: ${targetPage}`);
      setCurrentPage(targetPage);
    },
    [totalPages]
  );

  
  return {
    tasks: paginatedTasks,
    currentPage,
    totalPages,
    setPage,
    isLoading: false, 
    error: null, 
    totalTasksCount, 
  };
};
