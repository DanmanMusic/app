// src/contexts/DataContext.tsx
import React, { createContext, useState, useContext, useMemo, ReactNode, useCallback } from 'react';

// Contexts
import { useAuth } from './AuthContext';

// Types
import { StudentProfileData } from '../types/dataTypes';
import { User, UserStatus } from '../types/userTypes';
import {
  AssignedTask,
  TaskVerificationStatus,
  mockAllAssignedTasks,
} from '../mocks/mockAssignedTasks';
import { initialMockTaskLibrary, TaskLibraryItem } from '../mocks/mockTaskLibrary';
import { mockUsers } from '../mocks/mockUsers';
import {
  mockTicketBalances as initialMockTicketBalances,
  mockTicketHistory as initialMockTicketHistory,
  TicketTransaction,
} from '../mocks/mockTickets';
import { initialMockRewardsCatalog, RewardItem } from '../mocks/mockRewards';
import {
  mockAnnouncements as initialMockAnnouncements,
  Announcement,
} from '../mocks/mockAnnouncements';
import { mockInstruments, Instrument } from '../mocks/mockInstruments';

// Utils
import { getUserDisplayName } from '../utils/helpers';

// Interface DataContextType definition (Updated: No Create/Edit/Delete/Toggle User sims)
interface DataContextType {
  currentMockUsers: Record<string, User>; // Still needed
  assignedTasks: AssignedTask[];
  ticketBalances: Record<string, number>;
  ticketHistory: TicketTransaction[];
  announcements: Announcement[];
  rewardsCatalog: RewardItem[];
  taskLibrary: TaskLibraryItem[];
  mockInstruments: Instrument[];
  // Keep remaining simulation functions
  simulateMarkTaskComplete: (taskId: string) => void;
  simulateVerifyTask: ( assignedTaskId: string, status: TaskVerificationStatus, actualTickets: number, verifierId?: string ) => void;
  simulateManualTicketAdjustment: (studentId: string, amount: number, notes: string) => void;
  simulateRedeemReward: (studentId: string, rewardId: string) => void;
  simulateAssignTask: ( studentId: string, taskTitle: string, taskDescription: string, taskBasePoints: number, assignerId?: string ) => void;
  simulateReassignTask: ( studentId: string, taskTitle: string, taskDescription: string, taskBasePoints: number, assignerId?: string ) => void;
  // REMOVED: simulateToggleUserStatus: (userId: string) => void;
  simulateCreateAnnouncement: (announcementData: Omit<Announcement, 'id' | 'date'>) => void;
  simulateEditAnnouncement: ( announcementId: string, announcementData: Partial<Omit<Announcement, 'id' | 'date'>> ) => void;
  simulateDeleteAnnouncement: (announcementId: string) => void;
  simulateCreateReward: (rewardData: Omit<RewardItem, 'id'>) => void;
  simulateEditReward: (rewardId: string, rewardData: Partial<Omit<RewardItem, 'id'>>) => void;
  simulateDeleteReward: (rewardId: string) => void;
  simulateCreateTaskLibraryItem: (taskData: Omit<TaskLibraryItem, 'id'>) => void;
  simulateEditTaskLibraryItem: ( taskId: string, taskData: Partial<Omit<TaskLibraryItem, 'id'>> ) => void;
  simulateDeleteTaskLibraryItem: (taskId: string) => void;
  simulateDeleteAssignedTask: (assignmentId: string) => void;
  simulateCreateInstrument: (instrumentData: Omit<Instrument, 'id'>) => void;
  simulateEditInstrument: ( instrumentId: string, instrumentData: Partial<Omit<Instrument, 'id'>> ) => void;
  simulateDeleteInstrument: (instrumentId: string) => void;
  getMockStudentData: (studentId: string) => StudentProfileData | undefined;
}


const DataContext = createContext<DataContextType | undefined>(undefined);

export const DataProvider = ({ children }: { children: ReactNode }) => {
  // State
  const [currentMockUsers, setCurrentMockUsers] = useState<Record<string, User>>(mockUsers);
  const [assignedTasks, setAssignedTasks] = useState<AssignedTask[]>(mockAllAssignedTasks);
  const [ticketBalances, setTicketBalances] = useState<Record<string, number>>(initialMockTicketBalances);
  const [ticketHistory, setTicketHistory] = useState<TicketTransaction[]>(initialMockTicketHistory);
  const [announcements, setAnnouncements] = useState<Announcement[]>(initialMockAnnouncements);
  const [rewardsCatalog, setRewardsCatalog] = useState<RewardItem[]>(initialMockRewardsCatalog);
  const [taskLibrary, setTaskLibrary] = useState<TaskLibraryItem[]>(initialMockTaskLibrary);
  const [instruments, setInstruments] = useState<Instrument[]>(mockInstruments);

  const { currentUserId, setMockAuthState } = useAuth(); // Keep if needed by other simulations

  // --- Simulation Functions ---

  // REMOVE simulateToggleUserStatus function definition
  // const simulateToggleUserStatus = useCallback( ... ); // REMOVE THIS ENTIRE BLOCK


  // Keep remaining simulations
  const simulateMarkTaskComplete = useCallback((assignmentId: string) => {
    setAssignedTasks(prevTasks =>
      prevTasks.map(task =>
        task.id === assignmentId && !task.isComplete
          ? { ...task, isComplete: true, completedDate: new Date().toISOString(), verificationStatus: 'pending' }
          : task
      )
    );
    console.log(`[DataContext] Task ${assignmentId} marked complete.`);
    console.log('Task Marked Complete - Waiting for verification!');
  }, []);

  const simulateVerifyTask = useCallback(/* ... unchanged ... */ ( assignedTaskId: string, status: TaskVerificationStatus, actualTickets: number, verifierId: string = 'verifier-mock' ) => {
      console.log(`[DataContext] Verifying task ${assignedTaskId} with status ${status}, points ${actualTickets}`);
      let updateOccurred = false;
      let feedbackMessage = 'Verification Failed - Task not found or not pending.';
      setAssignedTasks(prevTasks => {
        const taskIndex = prevTasks.findIndex(t => t.id === assignedTaskId);
        if (taskIndex === -1 || !prevTasks[taskIndex].isComplete || prevTasks[taskIndex].verificationStatus !== 'pending') {
          console.error('[DataContext] Verification Failed - Task not found or not pending.');
          updateOccurred = false;
          return prevTasks;
        }
        const taskToVerify = prevTasks[taskIndex];
        const taskTitle = taskToVerify.taskTitle;
        const studentId = taskToVerify.studentId;
        const updatedTask = { ...taskToVerify, verificationStatus: status, verifiedById: verifierId, verifiedDate: new Date().toISOString(), actualPointsAwarded: (status === 'verified' || status === 'partial') ? actualTickets : undefined };
        const updatedTasks = [...prevTasks];
        updatedTasks[taskIndex] = updatedTask;
        updateOccurred = true;
        if ((status === 'verified' || status === 'partial') && actualTickets >= 0) {
          const tickets = actualTickets;
          console.log(`[DataContext] Awarding ${tickets} tickets to student ${studentId}`);
          setTicketBalances(prevBalances => ({ ...prevBalances, [studentId]: (prevBalances[studentId] || 0) + tickets }));
          setTicketHistory(prevHistory => [{ id: `tx-${Date.now()}`, studentId: studentId, timestamp: new Date().toISOString(), amount: tickets, type: 'task_award', sourceId: assignedTaskId, notes: `Task: ${taskTitle} (${status})` }, ...prevHistory ]);
          feedbackMessage = `Task Verified - Status: ${status}, Awarded: ${actualTickets} tickets`;
        } else if (status === 'incomplete') {
          feedbackMessage = `Task Marked Incomplete - No tickets awarded for task: ${taskTitle}.`;
        } else {
           feedbackMessage = `Task Verified - Status: ${status}, Awarded: 0 tickets`;
        }
        return updatedTasks;
      });
       if (updateOccurred) { console.log(`Verification Update: ${feedbackMessage}`); }
       else { console.error(`Verification Error: ${feedbackMessage}`); }
    }, []);

    const simulateManualTicketAdjustment = useCallback(/* ... unchanged ... */(studentId: string, amount: number, notes: string) => {
        const student = currentMockUsers[studentId];
        if (!student) { console.error(`[DataContext] Error adjusting tickets: Student ${studentId} not found.`); console.error(`Error adjusting tickets: Student with ID ${studentId} not found.`); return; }
        console.log(`[DataContext] Adjusting balance for ${studentId} by ${amount}. Notes: ${notes}`);
        setTicketBalances(prevBalances => ({ ...prevBalances, [studentId]: (prevBalances[studentId] || 0) + amount }));
        setTicketHistory(prevHistory => [{ id: `tx-${Date.now()}`, studentId: studentId, timestamp: new Date().toISOString(), amount: amount, type: amount > 0 ? 'manual_add' : 'manual_subtract', sourceId: `manual-${Date.now()}`, notes: notes }, ...prevHistory ]);
        console.log( `Balance Adjusted - Adjusted ${amount} tickets for student ${getUserDisplayName(student)}.` );
    }, [currentMockUsers]);

    const simulateRedeemReward = useCallback(/* ... unchanged ... */ (studentId: string, rewardId: string) => {
        const reward = rewardsCatalog.find(r => r.id === rewardId);
        const student = currentMockUsers[studentId];
        if (!reward || !student) { const missing = !reward ? 'Reward' : 'Student'; console.error(`[DataContext] Error redeeming reward: ${missing} not found.`); console.error(`Error redeeming reward - ${missing} not found.`); return; }
        const cost = reward.cost;
        const currentBalance = ticketBalances[studentId] || 0;
        const studentName = getUserDisplayName(student);
        if (currentBalance < cost) { console.warn(`[DataContext] Cannot Redeem - Student ${studentName} needs ${cost - currentBalance} more tickets for ${reward.name}.`); console.warn( `Cannot Redeem - Student ${studentName} needs ${cost - currentBalance} more tickets for ${reward.name}.` ); return; }
        console.log(`[DataContext] Redeeming ${reward.name} for ${studentName}. Cost: ${cost}`);
        setTicketBalances(prevBalances => ({ ...prevBalances, [studentId]: prevBalances[studentId] - cost }));
        setTicketHistory(prevHistory => [{ id: `tx-${Date.now()}`, studentId: studentId, timestamp: new Date().toISOString(), amount: -cost, type: 'redemption', sourceId: rewardId, notes: `Redeemed: ${reward.name}` }, ...prevHistory ]);
        const redemptionAnnouncement: Announcement = { id: `ann-redemption-${Date.now()}`, type: 'redemption_celebration', title: '🎉 Reward Redeemed! 🎉', message: `${studentName} redeemed a ${reward.name}!`, date: new Date().toISOString(), relatedStudentId: studentId };
        setAnnouncements(prev => [redemptionAnnouncement, ...prev]);
        console.log( `Reward Redeemed - ${reward.name} redeemed for ${studentName}! ${cost} tickets deducted. A public announcement was created.` );
    }, [rewardsCatalog, currentMockUsers, ticketBalances]);

    const simulateAssignTask = useCallback(/* ... unchanged ... */ ( studentId: string, taskTitle: string, taskDescription: string, taskBasePoints: number, assignerId: string = 'assigner-mock' ) => {
        const student = currentMockUsers[studentId];
        if (!student) { console.error(`[DataContext] Error assigning task: Student ${studentId} not found.`); console.error(`Error assigning task - Student not found.`); return; }
        const studentName = getUserDisplayName(student);
        console.log(`[DataContext] Assigning task "${taskTitle}" to ${studentName}`);
        const newAssignedTask: AssignedTask = { id: `assigned-${Date.now()}-${Math.random().toString(16).slice(2)}`, studentId: studentId, assignedById: assignerId, assignedDate: new Date().toISOString(), taskTitle: taskTitle, taskDescription: taskDescription, taskBasePoints: taskBasePoints, isComplete: false, verificationStatus: undefined };
        setAssignedTasks(prevTasks => [...prevTasks, newAssignedTask]);
        console.log(`Task Assigned - "${taskTitle}" assigned to ${studentName}.`);
    }, [currentMockUsers]);

    const simulateReassignTask = useCallback(/* ... unchanged ... */ ( studentId: string, taskTitle: string, taskDescription: string, taskBasePoints: number, assignerId: string = 'assigner-mock' ) => {
        const student = currentMockUsers[studentId];
        if (!student) { console.error(`[DataContext] Error re-assigning task: Student ${studentId} not found.`); console.error(`Error re-assigning task - Student not found.`); return; }
        const studentName = getUserDisplayName(student);
        console.log(`[DataContext] Re-assigning task "${taskTitle}" to ${studentName}`);
        const newAssignedTask: AssignedTask = { id: `assigned-re-${Date.now()}-${Math.random().toString(16).slice(2)}`, studentId: studentId, assignedById: assignerId, assignedDate: new Date().toISOString(), taskTitle: taskTitle, taskDescription: taskDescription, taskBasePoints: taskBasePoints, isComplete: false, verificationStatus: undefined };
        setAssignedTasks(prevTasks => [...prevTasks, newAssignedTask]);
        console.log(`Task Re-assigned - "${taskTitle}" re-assigned to ${studentName}.`);
    }, [currentMockUsers]);

    const simulateCreateAnnouncement = useCallback(/* ... unchanged ... */ (announcementData: Omit<Announcement, 'id' | 'date'>) => {
        const newId = `ann-${Date.now()}-${Math.random().toString(36).substring(7)}`;
        const newAnnouncement: Announcement = { ...announcementData, id: newId, date: new Date().toISOString(), type: announcementData.type || 'announcement' };
        console.log(`[DataContext] Creating announcement "${newAnnouncement.title}" (${newId})`);
        setAnnouncements(prev => [newAnnouncement, ...prev]);
        console.log(`Mock Create Announcement SUCCESS: "${newAnnouncement.title}" (${newId})`);
    }, []);

    const simulateEditAnnouncement = useCallback(/* ... unchanged ... */ (announcementId: string, announcementData: Partial<Omit<Announcement, 'id' | 'date'>>) => {
        let editedTitle = announcementId;
        console.log(`[DataContext] Editing announcement ${announcementId}`);
        setAnnouncements(prev => prev.map(ann => { if (ann.id === announcementId) { const updatedAnn = { ...ann, ...announcementData }; editedTitle = updatedAnn.title; return updatedAnn; } return ann; }));
        console.log(`Mock Edit Announcement SUCCESS: "${editedTitle}"`);
    }, []);

    const simulateDeleteAnnouncement = useCallback(/* ... unchanged ... */ (announcementId: string) => {
        const annToDelete = announcements.find(a => a.id === announcementId);
        if (!annToDelete) { console.error(`[DataContext] Delete Announcement FAILED: ID ${announcementId} not found.`); console.error(`Mock Delete Announcement FAILED: ID ${announcementId} not found.`); return; }
        const annTitle = annToDelete.title;
        console.log(`[DataContext] Deleting announcement "${annTitle}" (${announcementId})`);
        setAnnouncements(prev => prev.filter(ann => ann.id !== announcementId));
        console.log(`Mock Delete Announcement SUCCESS: "${annTitle}" (${announcementId})`);
    }, [announcements]);

    const simulateCreateReward = useCallback(/* ... unchanged ... */ (rewardData: Omit<RewardItem, 'id'>) => {
        const newId = `reward-${Date.now()}-${Math.random().toString(36).substring(7)}`;
        const newReward: RewardItem = { ...rewardData, id: newId };
        console.log(`[DataContext] Creating reward ${newReward.name} (${newReward.cost} tickets)`);
        setRewardsCatalog(prev => [...prev, newReward].sort((a, b) => a.cost - b.cost));
        console.log(`Mock Create Reward SUCCESS: ${newReward.name} (${newReward.cost} tickets)`);
    }, []);

    const simulateEditReward = useCallback(/* ... unchanged ... */ (rewardId: string, rewardData: Partial<Omit<RewardItem, 'id'>>) => {
        let editedName = rewardId;
        console.log(`[DataContext] Editing reward ${rewardId}`);
        setRewardsCatalog(prev => prev .map(reward => { if (reward.id === rewardId) { const updatedReward = { ...reward, ...rewardData }; editedName = updatedReward.name; return updatedReward; } return reward; }) .sort((a, b) => a.cost - b.cost) );
        console.log(`Mock Edit Reward SUCCESS: "${editedName}"`);
    }, []);

    const simulateDeleteReward = useCallback(/* ... unchanged ... */ (rewardId: string) => {
        const rewardToDelete = rewardsCatalog.find(r => r.id === rewardId);
        if (!rewardToDelete) { console.error(`[DataContext] Delete Reward FAILED: ID ${rewardId} not found.`); console.error(`Mock Delete Reward FAILED: ID ${rewardId} not found.`); return; }
        const rewardName = rewardToDelete.name;
        console.log(`[DataContext] Deleting reward "${rewardName}" (${rewardId})`);
        setRewardsCatalog(prev => prev.filter(reward => reward.id !== rewardId));
        console.log(`Mock Delete Reward SUCCESS: "${rewardName}" (${rewardId})`);
    }, [rewardsCatalog]);

    const simulateCreateTaskLibraryItem = useCallback(/* ... unchanged ... */ (taskData: Omit<TaskLibraryItem, 'id'>) => {
        const newId = `tasklib-${Date.now()}-${Math.random().toString(36).substring(7)}`;
        const newTask: TaskLibraryItem = { ...taskData, id: newId };
        console.log(`[DataContext] Creating task lib item ${newTask.title} (${newTask.baseTickets} pts)`);
        setTaskLibrary(prev => [...prev, newTask].sort((a, b) => a.title.localeCompare(b.title)));
        console.log(`Mock Create Task Lib SUCCESS: ${newTask.title} (${newTask.baseTickets} pts)`);
    }, []);

    const simulateEditTaskLibraryItem = useCallback(/* ... unchanged ... */ (taskId: string, taskData: Partial<Omit<TaskLibraryItem, 'id'>>) => {
        let editedTitle = taskId;
        console.log(`[DataContext] Editing task lib item ${taskId}`);
        setTaskLibrary(prev => prev .map(task => { if (task.id === taskId) { const updatedTask = { ...task, ...taskData }; editedTitle = updatedTask.title; return updatedTask; } return task; }) .sort((a, b) => a.title.localeCompare(b.title)) );
        console.log(`Mock Edit Task Lib SUCCESS: "${editedTitle}"`);
    }, []);

    const simulateDeleteTaskLibraryItem = useCallback(/* ... unchanged ... */ (taskId: string) => {
        const taskToDelete = taskLibrary.find(t => t.id === taskId);
        if (!taskToDelete) { console.error(`[DataContext] Delete Task Lib FAILED: ID ${taskId} not found.`); console.error(`Mock Delete Task Lib FAILED: ID ${taskId} not found.`); return; }
        const taskTitle = taskToDelete.title;
        console.log(`[DataContext] Deleting task lib item "${taskTitle}" (${taskId})`);
        setTaskLibrary(prev => prev.filter(task => task.id !== taskId));
        console.log(`Mock Delete Task Lib SUCCESS: "${taskTitle}" (${taskId})`);
    }, [taskLibrary]);

    const simulateDeleteAssignedTask = useCallback(/* ... unchanged ... */ (assignmentId: string) => {
        const taskToDelete = assignedTasks.find(t => t.id === assignmentId);
        if (!taskToDelete) { console.error(`[DataContext] Delete Assigned Task FAILED: Assignment ID ${assignmentId} not found.`); console.error(`Mock Delete Assigned Task FAILED: Assignment ID ${assignmentId} not found.`); return; }
        const taskTitle = taskToDelete.taskTitle;
        console.log(`[DataContext] Deleting assigned task "${taskTitle}" (ID: ${assignmentId})`);
        setAssignedTasks(prev => prev.filter(t => t.id !== assignmentId));
        console.log(`Mock Delete Assigned Task SUCCESS: "${taskTitle}" (ID: ${assignmentId})`);
    }, [assignedTasks]);

    const simulateCreateInstrument = useCallback(/* ... unchanged ... */ (instrumentData: Omit<Instrument, 'id'>) => {
        const newId = `inst-${Date.now()}-${Math.random().toString(36).substring(7)}`;
        const newInstrument: Instrument = { ...instrumentData, id: newId };
        console.log(`[DataContext] Creating instrument ${newInstrument.name} (${newId})`);
        setInstruments(prev => [...prev, newInstrument].sort((a, b) => a.name.localeCompare(b.name)));
        console.log(`Mock Create Instrument SUCCESS: ${newInstrument.name} (${newId})`);
    }, []);

    const simulateEditInstrument = useCallback(/* ... unchanged ... */ (instrumentId: string, instrumentData: Partial<Omit<Instrument, 'id'>>) => {
        let editedName = instrumentId;
        console.log(`[DataContext] Editing instrument ${instrumentId}`);
        setInstruments(prev => prev .map(inst => { if (inst.id === instrumentId) { const updatedInst = { ...inst, ...instrumentData }; editedName = updatedInst.name; return updatedInst; } return inst; }) .sort((a, b) => a.name.localeCompare(b.name)) );
        console.log(`Mock Edit Instrument SUCCESS: "${editedName}"`);
    }, []);

    const simulateDeleteInstrument = useCallback(/* ... unchanged ... */ (instrumentId: string) => {
        const instToDelete = instruments.find(i => i.id === instrumentId);
        if (!instToDelete) { console.error(`[DataContext] Delete Instrument FAILED: ID ${instrumentId} not found.`); console.error(`Mock Delete Instrument FAILED: ID ${instrumentId} not found.`); return; }
        const instName = instToDelete.name;
        console.log(`[DataContext] Deleting instrument "${instName}" (${instrumentId})`);
        setInstruments(prev => prev.filter(inst => inst.id !== instrumentId));
        console.log(`Mock Delete Instrument SUCCESS: "${instName}" (${instrumentId})`);
    }, [instruments]);

    const getMockStudentData = useCallback( /* ... unchanged ... */ (studentId: string): StudentProfileData | undefined => {
            const studentUser = currentMockUsers[studentId];
            if (!studentUser || studentUser.role !== 'student') return undefined;
            return { user: studentUser, balance: ticketBalances[studentId] || 0, assignedTasks: assignedTasks.filter(task => task.studentId === studentId), history: ticketHistory.filter(tx => tx.studentId === studentId).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()), rewardsCatalog: rewardsCatalog, announcements: announcements, taskLibrary: taskLibrary, mockInstruments: instruments, onMarkTaskComplete: simulateMarkTaskComplete, };
        }, [ currentMockUsers, ticketBalances, assignedTasks, ticketHistory, rewardsCatalog, announcements, taskLibrary, instruments, simulateMarkTaskComplete ] );

  // Context Value Memoization (Updated: Removed simulateToggleUserStatus)
  const value = useMemo(
    () => ({
      currentMockUsers, assignedTasks, ticketBalances, ticketHistory, announcements, rewardsCatalog, taskLibrary, mockInstruments: instruments,
      simulateMarkTaskComplete, simulateVerifyTask, simulateManualTicketAdjustment, simulateRedeemReward, simulateAssignTask, simulateReassignTask,
      // simulateToggleUserStatus, // REMOVED
      simulateCreateAnnouncement, simulateEditAnnouncement, simulateDeleteAnnouncement, simulateCreateReward, simulateEditReward, simulateDeleteReward,
      simulateCreateTaskLibraryItem, simulateEditTaskLibraryItem, simulateDeleteTaskLibraryItem, simulateDeleteAssignedTask,
      simulateCreateInstrument, simulateEditInstrument, simulateDeleteInstrument,
      getMockStudentData,
    }),
    [ // Update dependencies list
      currentMockUsers, assignedTasks, ticketBalances, ticketHistory, announcements, rewardsCatalog, taskLibrary, instruments,
      simulateMarkTaskComplete, simulateVerifyTask, simulateManualTicketAdjustment, simulateRedeemReward, simulateAssignTask, simulateReassignTask,
      // simulateToggleUserStatus removed
      simulateCreateAnnouncement, simulateEditAnnouncement, simulateDeleteAnnouncement, simulateCreateReward, simulateEditReward, simulateDeleteReward,
      simulateCreateTaskLibraryItem, simulateEditTaskLibraryItem, simulateDeleteTaskLibraryItem, simulateDeleteAssignedTask,
      simulateCreateInstrument, simulateEditInstrument, simulateDeleteInstrument,
      getMockStudentData,
      currentUserId, setMockAuthState, // Keep auth dependencies
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