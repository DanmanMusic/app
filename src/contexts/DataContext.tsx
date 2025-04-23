
import React, { createContext, useState, useContext, useMemo, ReactNode, useCallback } from 'react';




import { useAuth } from './AuthContext';


import { StudentProfileData } from '../types/dataTypes';
import { User } from '../types/userTypes';
import {
  AssignedTask,
  TaskVerificationStatus,
  mockAllAssignedTasks,
} from '../mocks/mockAssignedTasks';
import { mockUsers } from '../mocks/mockUsers';
import {
  mockTicketBalances as initialMockTicketBalances,
  mockTicketHistory as initialMockTicketHistory,
  TicketTransaction,
} from '../mocks/mockTickets';


import { getUserDisplayName } from '../utils/helpers';


interface DataContextType {
  currentMockUsers: Record<string, User>;
  assignedTasks: AssignedTask[];
  ticketBalances: Record<string, number>;
  ticketHistory: TicketTransaction[];
  simulateMarkTaskComplete: (taskId: string) => void;
  simulateVerifyTask: (
    assignedTaskId: string,
    status: TaskVerificationStatus,
    actualTickets: number,
    verifierId?: string
  ) => void;
  simulateManualTicketAdjustment: (studentId: string, amount: number, notes: string) => void;
  simulateRedeemReward: (studentId: string, rewardId: string) => void;
  simulateAssignTask: (
    studentId: string,
    taskTitle: string,
    taskDescription: string,
    taskBasePoints: number,
    assignerId?: string
  ) => void;
  simulateReassignTask: (
    studentId: string,
    taskTitle: string,
    taskDescription: string,
    taskBasePoints: number,
    assignerId?: string
  ) => void;
  simulateDeleteAssignedTask: (assignmentId: string) => void;
  getMockStudentData: (
    studentId: string
  ) =>
    | Omit<
        StudentProfileData,
        'rewardsCatalog' | 'announcements' | 'taskLibrary' | 'mockInstruments'
      >
    | undefined;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export const DataProvider = ({ children }: { children: ReactNode }) => {
  
  const [currentMockUsers, setCurrentMockUsers] = useState<Record<string, User>>(mockUsers);
  const [assignedTasks, setAssignedTasks] = useState<AssignedTask[]>(mockAllAssignedTasks);
  const [ticketBalances, setTicketBalances] =
    useState<Record<string, number>>(initialMockTicketBalances);
  const [ticketHistory, setTicketHistory] = useState<TicketTransaction[]>(initialMockTicketHistory);

  const { currentUserId } = useAuth(); 

  

  const simulateMarkTaskComplete = useCallback((assignmentId: string) => {
    setAssignedTasks(prevTasks =>
      prevTasks.map(task =>
        task.id === assignmentId && !task.isComplete
          ? {
              ...task,
              isComplete: true,
              completedDate: new Date().toISOString(),
              verificationStatus: 'pending',
            }
          : task
      )
    );
    console.log(`[DataContext] Task ${assignmentId} marked complete.`);
  }, []);

  const simulateVerifyTask = useCallback(
    (
      assignedTaskId: string,
      status: TaskVerificationStatus,
      actualTickets: number,
      verifierId: string = 'verifier-mock'
    ) => {
      console.log(
        `[DataContext] Verifying task ${assignedTaskId} with status ${status}, points ${actualTickets}`
      );
      let updateOccurred = false;
      let feedbackMessage = 'Verification Failed - Task not found or not pending.';
      setAssignedTasks(prevTasks => {
        const taskIndex = prevTasks.findIndex(t => t.id === assignedTaskId);
        if (
          taskIndex === -1 ||
          !prevTasks[taskIndex].isComplete ||
          prevTasks[taskIndex].verificationStatus !== 'pending'
        ) {
          console.error('[DataContext] Verification Failed - Task not found or not pending.');
          updateOccurred = false;
          return prevTasks;
        }
        const taskToVerify = prevTasks[taskIndex];
        const taskTitle = taskToVerify.taskTitle;
        const studentId = taskToVerify.studentId;
        const updatedTask = {
          ...taskToVerify,
          verificationStatus: status,
          verifiedById: verifierId,
          verifiedDate: new Date().toISOString(),
          actualPointsAwarded:
            status === 'verified' || status === 'partial' ? actualTickets : undefined,
        };
        const updatedTasks = [...prevTasks];
        updatedTasks[taskIndex] = updatedTask;
        updateOccurred = true;
        if ((status === 'verified' || status === 'partial') && actualTickets >= 0) {
          const tickets = actualTickets;
          console.log(`[DataContext] Awarding ${tickets} tickets to student ${studentId}`);
          setTicketBalances(prevBalances => ({
            ...prevBalances,
            [studentId]: (prevBalances[studentId] || 0) + tickets,
          }));
          setTicketHistory(prevHistory => [
            {
              id: `tx-${Date.now()}`,
              studentId: studentId,
              timestamp: new Date().toISOString(),
              amount: tickets,
              type: 'task_award',
              sourceId: assignedTaskId,
              notes: `Task: ${taskTitle} (${status})`,
            },
            ...prevHistory,
          ]);
          feedbackMessage = `Task Verified - Status: ${status}, Awarded: ${actualTickets} tickets`;
        } else if (status === 'incomplete') {
          feedbackMessage = `Task Marked Incomplete - No tickets awarded for task: ${taskTitle}.`;
        } else {
          feedbackMessage = `Task Verified - Status: ${status}, Awarded: 0 tickets`;
        }
        return updatedTasks;
      });
      if (updateOccurred) {
        console.log(`Verification Update: ${feedbackMessage}`);
      } else {
        console.error(`Verification Error: ${feedbackMessage}`);
      }
    },
    []
  );

  const simulateManualTicketAdjustment = useCallback(
    (studentId: string, amount: number, notes: string) => {
      const student = currentMockUsers[studentId];
      if (!student) {
        console.error(`[DataContext] Error adjusting tickets: Student ${studentId} not found.`);
        return;
      }
      console.log(`[DataContext] Adjusting balance for ${studentId} by ${amount}. Notes: ${notes}`);
      setTicketBalances(prevBalances => ({
        ...prevBalances,
        [studentId]: (prevBalances[studentId] || 0) + amount,
      }));
      setTicketHistory(prevHistory => [
        {
          id: `tx-${Date.now()}`,
          studentId: studentId,
          timestamp: new Date().toISOString(),
          amount: amount,
          type: amount > 0 ? 'manual_add' : 'manual_subtract',
          sourceId: `manual-${Date.now()}`,
          notes: notes,
        },
        ...prevHistory,
      ]);
      console.log(
        `Balance Adjusted - Adjusted ${amount} tickets for student ${getUserDisplayName(student)}.`
      );
    },
    [currentMockUsers]
  );

  const simulateRedeemReward = useCallback(
    (studentId: string, rewardId: string) => {
      const student = currentMockUsers[studentId];
      const rewardCost = 100; 
      const rewardName = `Reward ${rewardId}`; 

      console.warn(
        `[DataContext] simulateRedeemReward needs refactoring. Rewards data not available. Using placeholders.`
      );

      if (!student) {
        const missing = 'Student';
        console.error(`[DataContext] Error redeeming reward: ${missing} not found.`);
        return;
      }
      const cost = rewardCost;
      const currentBalance = ticketBalances[studentId] || 0;
      const studentName = getUserDisplayName(student);
      if (currentBalance < cost) {
        console.warn(
          `[DataContext] Cannot Redeem - Student ${studentName} needs ${
            cost - currentBalance
          } more tickets for ${rewardName}.`
        );
        return;
      }
      console.log(`[DataContext] Redeeming ${rewardName} for ${studentName}. Cost: ${cost}`);
      setTicketBalances(prevBalances => ({
        ...prevBalances,
        [studentId]: prevBalances[studentId] - cost,
      }));
      setTicketHistory(prevHistory => [
        {
          id: `tx-${Date.now()}`,
          studentId: studentId,
          timestamp: new Date().toISOString(),
          amount: -cost,
          type: 'redemption',
          sourceId: rewardId,
          notes: `Redeemed: ${rewardName} (Placeholder)`,
        },
        ...prevHistory,
      ]);
      console.log(
        `Reward Redeemed (Placeholder) - ${rewardName} redeemed for ${studentName}! ${cost} tickets deducted.`
      );
    },
    [currentMockUsers, ticketBalances]
  );

  const simulateAssignTask = useCallback(
    (
      studentId: string,
      taskTitle: string,
      taskDescription: string,
      taskBasePoints: number,
      assignerId: string = 'assigner-mock'
    ) => {
      const student = currentMockUsers[studentId];
      if (!student) {
        console.error(`[DataContext] Error assigning task: Student ${studentId} not found.`);
        return;
      }
      const studentName = getUserDisplayName(student);
      console.log(`[DataContext] Assigning task "${taskTitle}" to ${studentName}`);
      const newAssignedTask: AssignedTask = {
        id: `assigned-${Date.now()}-${Math.random().toString(16).slice(2)}`,
        studentId: studentId,
        assignedById: assignerId,
        assignedDate: new Date().toISOString(),
        taskTitle: taskTitle,
        taskDescription: taskDescription,
        taskBasePoints: taskBasePoints,
        isComplete: false,
        verificationStatus: undefined,
      };
      setAssignedTasks(prevTasks => [...prevTasks, newAssignedTask]);
      console.log(`Task Assigned - "${taskTitle}" assigned to ${studentName}.`);
    },
    [currentMockUsers]
  );

  const simulateReassignTask = useCallback(
    (
      studentId: string,
      taskTitle: string,
      taskDescription: string,
      taskBasePoints: number,
      assignerId: string = 'assigner-mock'
    ) => {
      const student = currentMockUsers[studentId];
      if (!student) {
        console.error(`[DataContext] Error re-assigning task: Student ${studentId} not found.`);
        return;
      }
      const studentName = getUserDisplayName(student);
      console.log(`[DataContext] Re-assigning task "${taskTitle}" to ${studentName}`);
      const newAssignedTask: AssignedTask = {
        id: `assigned-re-${Date.now()}-${Math.random().toString(16).slice(2)}`,
        studentId: studentId,
        assignedById: assignerId,
        assignedDate: new Date().toISOString(),
        taskTitle: taskTitle,
        taskDescription: taskDescription,
        taskBasePoints: taskBasePoints,
        isComplete: false,
        verificationStatus: undefined,
      };
      setAssignedTasks(prevTasks => [...prevTasks, newAssignedTask]);
      console.log(`Task Re-assigned - "${taskTitle}" re-assigned to ${studentName}.`);
    },
    [currentMockUsers]
  );

  const simulateDeleteAssignedTask = useCallback(
    (assignmentId: string) => {
      const taskToDelete = assignedTasks.find(t => t.id === assignmentId);
      if (!taskToDelete) {
        console.error(
          `[DataContext] Delete Assigned Task FAILED: Assignment ID ${assignmentId} not found.`
        );
        return;
      }
      const taskTitle = taskToDelete.taskTitle;
      console.log(`[DataContext] Deleting assigned task "${taskTitle}" (ID: ${assignmentId})`);
      setAssignedTasks(prev => prev.filter(t => t.id !== assignmentId));
      console.log(`Assigned Task Deleted - "${taskTitle}" (ID: ${assignmentId})`);
    },
    [assignedTasks]
  );

  const getMockStudentData = useCallback(
    (
      studentId: string
    ):
      | Omit<
          StudentProfileData,
          'rewardsCatalog' | 'announcements' | 'taskLibrary' | 'mockInstruments'
        >
      | undefined => {
      const studentUser = currentMockUsers[studentId];
      if (!studentUser || studentUser.role !== 'student') return undefined;

      const studentAssignedTasks = assignedTasks.filter(task => task.studentId === studentId);
      const studentHistory = ticketHistory
        .filter(tx => tx.studentId === studentId)
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

      return {
        user: studentUser,
        balance: ticketBalances[studentId] || 0,
        assignedTasks: studentAssignedTasks,
        history: studentHistory,
        onMarkTaskComplete: simulateMarkTaskComplete,
      };
    },
    [currentMockUsers, ticketBalances, assignedTasks, ticketHistory, simulateMarkTaskComplete]
  );

  
  const value = useMemo(
    () => ({
      currentMockUsers,
      assignedTasks,
      ticketBalances,
      ticketHistory,
      simulateMarkTaskComplete,
      simulateVerifyTask,
      simulateManualTicketAdjustment,
      simulateRedeemReward,
      simulateAssignTask,
      simulateReassignTask,
      simulateDeleteAssignedTask,
      getMockStudentData,
    }),
    [
      currentMockUsers,
      assignedTasks,
      ticketBalances,
      ticketHistory,
      simulateMarkTaskComplete,
      simulateVerifyTask,
      simulateManualTicketAdjustment,
      simulateRedeemReward,
      simulateAssignTask,
      simulateReassignTask,
      simulateDeleteAssignedTask,
      getMockStudentData,
      currentUserId, 
    ]
  );

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
};


export const useData = (): DataContextType => {
  const context = useContext(DataContext);
  if (context === undefined) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
};
