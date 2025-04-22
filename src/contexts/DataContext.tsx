// src/contexts/DataContext.tsx
import React, { createContext, useState, useContext, useMemo, ReactNode, useCallback } from 'react';
import { Platform } from 'react-native'; // Keep Platform for potential future use

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

// --- Interface DataContextType definition remains the same ---
interface DataContextType {
  currentMockUsers: Record<string, User>;
  assignedTasks: AssignedTask[];
  ticketBalances: Record<string, number>;
  ticketHistory: TicketTransaction[];
  announcements: Announcement[];
  rewardsCatalog: RewardItem[];
  taskLibrary: TaskLibraryItem[];
  mockInstruments: Instrument[];
  simulateMarkTaskComplete: (taskId: string) => void;
  simulateVerifyTask: ( assignedTaskId: string, status: TaskVerificationStatus, actualTickets: number, verifierId?: string ) => void;
  simulateManualTicketAdjustment: (studentId: string, amount: number, notes: string) => void;
  simulateRedeemReward: (studentId: string, rewardId: string) => void;
  simulateAssignTask: ( studentId: string, taskTitle: string, taskDescription: string, taskBasePoints: number, assignerId?: string ) => void;
  simulateReassignTask: ( studentId: string, taskTitle: string, taskDescription: string, taskBasePoints: number, assignerId?: string ) => void;
  simulateCreateUser: (userData: Omit<User, 'id'>) => void;
  simulateEditUser: (userId: string, userData: Partial<Omit<User, 'id'>>) => void;
  simulateDeleteUser: (userId: string) => void;
  simulateToggleUserStatus: (userId: string) => void;
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
  // State hooks
  const [currentMockUsers, setCurrentMockUsers] = useState<Record<string, User>>(mockUsers);
  const [assignedTasks, setAssignedTasks] = useState<AssignedTask[]>(mockAllAssignedTasks);
  const [ticketBalances, setTicketBalances] = useState<Record<string, number>>(initialMockTicketBalances);
  const [ticketHistory, setTicketHistory] = useState<TicketTransaction[]>(initialMockTicketHistory);
  const [announcements, setAnnouncements] = useState<Announcement[]>(initialMockAnnouncements);
  const [rewardsCatalog, setRewardsCatalog] = useState<RewardItem[]>(initialMockRewardsCatalog);
  const [taskLibrary, setTaskLibrary] = useState<TaskLibraryItem[]>(initialMockTaskLibrary);
  const [instruments, setInstruments] = useState<Instrument[]>(mockInstruments);

  // Get auth context methods
  const { currentUserId, setMockAuthState } = useAuth();

  // --- Simulation Functions ---

  const simulateToggleUserStatus = useCallback((userId: string) => {
      console.log(`[DataContext] Attempting to toggle status for user: ${userId}`);
      let userStatusChanged = false;
      let newStatus: UserStatus = 'inactive';

      setCurrentMockUsers(prev => {
          const userToUpdate = prev[userId];
          if (!userToUpdate) {
              console.error(`[DataContext] User not found for status toggle: ${userId}`);
              // alert(`Mock Toggle Status FAILED: User ${userId} not found.`); // Removed alert
              return prev;
          }

          newStatus = userToUpdate.status === 'active' ? 'inactive' : 'active';
          console.log(`[DataContext] Current status: ${userToUpdate.status}, New status: ${newStatus}`);
          userStatusChanged = true;

          return {
              ...prev,
              [userId]: { ...userToUpdate, status: newStatus }
          };
      });

      if (userStatusChanged) {
          const user = currentMockUsers[userId];
          const userName = user ? getUserDisplayName(user) : userId;
          console.log(`[DataContext] Toggle Status SUCCESS: ${userName} is now ${newStatus}.`);
          // alert(`Mock Toggle Status SUCCESS: ${userName} is now ${newStatus}.`); // Removed alert

          if (newStatus === 'inactive' && userId === currentUserId) {
              console.log(`[DataContext] User ${userId} deactivated, logging out.`);
              // alert(`You have been deactivated. Logging out.`); // Removed alert
              setMockAuthState(null);
          }
      }
  }, [currentMockUsers, currentUserId, setMockAuthState]);

  const simulateDeleteUser = useCallback(
    (userId: string) => {
      console.log(`[DataContext] Attempting to permanently delete user: ${userId}`);
      const userToDelete = currentMockUsers[userId];
      if (!userToDelete) {
        console.error(`[DataContext] User not found for deletion: ${userId}`);
        // alert(`Mock Delete User FAILED: User ${userId} not found.`); // Removed alert
        return;
      }

      // --- Temporarily bypass confirmation for testing ---
      const confirmPermanentDelete = true;
      // const confirmPermanentDelete = Platform.OS === 'web' ?
      //     confirm(`PERMANENTLY DELETE user ${getUserDisplayName(userToDelete)} (${userId})? This cannot be undone.`)
      //     : true;
      console.log(`[DataContext] Permanent delete confirmation check bypassed (result: ${confirmPermanentDelete})`);

      if (!confirmPermanentDelete) {
          console.log(`[DataContext] Permanent delete cancelled for ${getUserDisplayName(userToDelete)}.`);
          // alert(`Permanent delete cancelled for ${getUserDisplayName(userToDelete)}.`); // Removed alert
          return;
      }

      const userName = getUserDisplayName(userToDelete);
      console.log(`[DataContext] Proceeding with permanent deletion of ${userName}`);
      setCurrentMockUsers(prev => {
        const newState = { ...prev };
        delete newState[userId];
        console.log(`[DataContext] User record removed for ${userId}.`);
        // TODO: Add logic here to clean up related data if needed
        return newState;
      });

      console.log(`[DataContext] PERMANENT DELETE User SUCCESS: ${userName} (${userId})`);
      // alert(`Mock PERMANENT DELETE User SUCCESS: ${userName} (${userId})`); // Removed alert

       // Logout if the deleted user was the current user
       if (userId === currentUserId) {
           console.log(`[DataContext] Deleted user ${userId} was current user, logging out.`);
           // alert(`Your user account has been permanently deleted. Logging out.`); // Removed alert
           setMockAuthState(null);
       }
    },
    [currentMockUsers, currentUserId, setMockAuthState]
  );

  // --- Other simulation functions (unchanged, kept fully inflated) ---

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
    // alert('Task Marked Complete - Waiting for verification!'); // Removed alert
  }, []);

  const simulateVerifyTask = useCallback(
    (
        assignedTaskId: string,
        status: TaskVerificationStatus,
        actualTickets: number,
        verifierId: string = 'verifier-mock'
    ) => {
      console.log(`[DataContext] Verifying task ${assignedTaskId} with status ${status}, points ${actualTickets}`);
      setAssignedTasks(prevTasks => {
        const taskToVerify = prevTasks.find(t => t.id === assignedTaskId);

        if (
          !taskToVerify ||
          !taskToVerify.isComplete ||
          taskToVerify.verificationStatus !== 'pending'
        ) {
          console.error('[DataContext] Verification Failed - Task not found or not pending.');
          // alert('Verification Failed - Task not found or not pending.'); // Removed alert
          return prevTasks;
        }

        const taskTitle = taskToVerify.taskTitle;
        const studentId = taskToVerify.studentId;

        const updatedTasks = prevTasks.map(task =>
          task.id === assignedTaskId
            ? {
                ...task,
                verificationStatus: status,
                verifiedById: verifierId,
                verifiedDate: new Date().toISOString(),
                actualPointsAwarded:
                  status === 'verified' || status === 'partial' ? actualTickets : undefined,
              }
            : task
        );

        if (status === 'verified' || status === 'partial') {
          const tickets = actualTickets;
          console.log(`[DataContext] Awarding ${tickets} tickets to student ${studentId}`);
          setTicketBalances(prevBalances => ({
            ...prevBalances,
            [studentId]: (prevBalances[studentId] || 0) + tickets,
          }));
          setTicketHistory(prevHistory => {
            const newTaskAwardTx: TicketTransaction = {
              id: `tx-${Date.now()}`,
              studentId: studentId,
              timestamp: new Date().toISOString(),
              amount: tickets,
              type: 'task_award',
              sourceId: assignedTaskId,
              notes: `Task: ${taskTitle} (${status})`,
            };
            return [newTaskAwardTx, ...prevHistory];
          });
           console.log(`[DataContext] Task Verified - Status: ${status}, Awarded: ${actualTickets} tickets`);
          // alert(`Task Verified - Status: ${status}, Awarded: ${actualTickets} tickets`); // Removed alert
        } else {
          console.log(`[DataContext] Task Marked Incomplete - No tickets awarded for task: ${taskTitle}.`);
          // alert(`Task Marked Incomplete - No tickets awarded for task: ${taskTitle}.`); // Removed alert
        }
        return updatedTasks;
      });
    },
    []
  );

  const simulateManualTicketAdjustment = useCallback(
    (studentId: string, amount: number, notes: string) => {
      const student = currentMockUsers[studentId];
      if (!student) {
         console.error(`[DataContext] Error adjusting tickets: Student ${studentId} not found.`);
        // alert(`Error: Student with ID ${studentId} not found.`); // Removed alert
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
       console.log(`[DataContext] Balance Adjusted - Adjusted ${amount} tickets for student ${getUserDisplayName(student)}.`);
      // alert( `Balance Adjusted - Adjusted ${amount} tickets for student ${getUserDisplayName(student)}.` ); // Removed alert
    },
    [currentMockUsers]
  );

  const simulateRedeemReward = useCallback(
    (studentId: string, rewardId: string) => {
      const reward = rewardsCatalog.find(r => r.id === rewardId);
      const student = currentMockUsers[studentId];
      if (!reward || !student) {
         console.error(`[DataContext] Error redeeming reward: ${!reward ? 'Reward' : 'Student'} ${!reward ? rewardId : studentId} not found.`);
        // alert(`Error - ${!reward ? 'Reward' : 'Student'} not found.`); // Removed alert
        return;
      }
      const cost = reward.cost;
      const currentBalance = ticketBalances[studentId] || 0;
      const studentName = getUserDisplayName(student);

      if (currentBalance < cost) {
          console.warn(`[DataContext] Cannot Redeem - Student ${studentName} needs ${cost - currentBalance} more tickets for ${reward.name}.`);
        // alert( `Cannot Redeem - Student ${studentName} needs ${cost - currentBalance} more tickets for ${reward.name}.` ); // Removed alert
        return;
      }
      console.log(`[DataContext] Redeeming ${reward.name} for ${studentName}. Cost: ${cost}`);
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
          notes: `Redeemed: ${reward.name}`,
        },
        ...prevHistory,
      ]);
      const redemptionAnnouncement: Announcement = {
        id: `ann-redemption-${Date.now()}`,
        type: 'redemption_celebration',
        title: '🎉 Reward Redeemed! 🎉',
        message: `${studentName} redeemed a ${reward.name}!`,
        date: new Date().toISOString(),
        relatedStudentId: studentId,
      };
      setAnnouncements(prev => [redemptionAnnouncement, ...prev]);
       console.log(`[DataContext] Reward Redeemed - ${reward.name} for ${studentName}! ${cost} tickets deducted. Announcement created.`);
      // alert( `Reward Redeemed - ${reward.name} redeemed for ${studentName}! ${cost} tickets deducted. A public announcement was created.` ); // Removed alert
    },
    [rewardsCatalog, currentMockUsers, ticketBalances]
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
        // alert(`Error - Student not found.`); // Removed alert
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
       console.log(`[DataContext] Task Assigned - "${taskTitle}" assigned to ${studentName}.`);
      // alert(`Task Assigned - "${taskTitle}" assigned to ${studentName}.`); // Removed alert
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
        // alert(`Error - Student not found.`); // Removed alert
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
      console.log(`[DataContext] Task Re-assigned - "${taskTitle}" re-assigned to ${studentName}.`);
      // alert(`Task Re-assigned - "${taskTitle}" re-assigned to ${studentName}.`); // Removed alert
    },
    [currentMockUsers]
  );

  const simulateCreateUser = useCallback(
    (userData: Omit<User, 'id'>) => {
      const newId = `user-${Date.now()}-${Math.random().toString(36).substring(7)}`;
      const newUser: User = { ...userData, id: newId, status: 'active' };
      console.log(`[DataContext] Creating user ${getUserDisplayName(newUser)} (${newId})`);
      setCurrentMockUsers(prev => ({ ...prev, [newId]: newUser }));
      console.log(`[DataContext] Create User SUCCESS`);
      // alert(`Mock Create User SUCCESS: ${getUserDisplayName(newUser)} (${newId})`); // Removed alert
    },
    []
  );

  const simulateEditUser = useCallback(
    (userId: string, userData: Partial<Omit<User, 'id'>>) => {
      let editedUserName = userId;
      console.log(`[DataContext] Editing user ${userId}`);
      setCurrentMockUsers(prev => {
        if (!prev[userId]) {
          console.error('[DataContext] User not found for edit:', userId);
          // alert(`Mock Edit User FAILED: User ${userId} not found.`); // Removed alert
          return prev;
        }
        const { status, ...restOfUserData } = userData;
        if (status) {
            console.warn("[DataContext] Attempted to change user status via simulateEditUser. Use simulateToggleUserStatus instead.");
        }
        const updatedUser = { ...prev[userId], ...restOfUserData };
        editedUserName = getUserDisplayName(updatedUser);
        return { ...prev, [userId]: updatedUser };
      });
      console.log(`[DataContext] Edit User SUCCESS: ${editedUserName} (${userId})`);
      // alert(`Mock Edit User SUCCESS: ${editedUserName} (${userId})`); // Removed alert
    },
    []
  );

  const simulateCreateAnnouncement = useCallback(
    (announcementData: Omit<Announcement, 'id' | 'date'>) => {
      const newId = `ann-${Date.now()}-${Math.random().toString(36).substring(7)}`;
      const newAnnouncement: Announcement = {
        ...announcementData,
        id: newId,
        date: new Date().toISOString(),
        type: announcementData.type || 'announcement',
      };
      console.log(`[DataContext] Creating announcement "${newAnnouncement.title}" (${newId})`);
      setAnnouncements(prev => [newAnnouncement, ...prev]);
      console.log(`[DataContext] Create Announcement SUCCESS`);
      // alert(`Mock Create Announcement SUCCESS: "${newAnnouncement.title}" (${newId})`); // Removed alert
    },
    []
  );

  const simulateEditAnnouncement = useCallback(
    (announcementId: string, announcementData: Partial<Omit<Announcement, 'id' | 'date'>>) => {
      let editedTitle = announcementId;
      console.log(`[DataContext] Editing announcement ${announcementId}`);
      setAnnouncements(prev =>
        prev.map(ann => {
          if (ann.id === announcementId) {
            const updatedAnn = { ...ann, ...announcementData };
            editedTitle = updatedAnn.title;
            return updatedAnn;
          }
          return ann;
        })
      );
      console.log(`[DataContext] Edit Announcement SUCCESS: "${editedTitle}"`);
      // alert(`Mock Edit Announcement SUCCESS: "${editedTitle}"`); // Removed alert
    },
    []
  );

  const simulateDeleteAnnouncement = useCallback(
    (announcementId: string) => {
      const annToDelete = announcements.find(a => a.id === announcementId);
      if (!annToDelete) {
         console.error(`[DataContext] Delete Announcement FAILED: ID ${announcementId} not found.`);
        // alert(`Mock Delete Announcement FAILED: ID ${announcementId} not found.`); // Removed alert
        return;
      }
      const annTitle = annToDelete.title;
      console.log(`[DataContext] Deleting announcement "${annTitle}" (${announcementId})`);
      setAnnouncements(prev => prev.filter(ann => ann.id !== announcementId));
       console.log(`[DataContext] Delete Announcement SUCCESS`);
      // alert(`Mock Delete Announcement SUCCESS: "${annTitle}" (${announcementId})`); // Removed alert
    },
    [announcements]
  );

  const simulateCreateReward = useCallback(
    (rewardData: Omit<RewardItem, 'id'>) => {
      const newId = `reward-${Date.now()}-${Math.random().toString(36).substring(7)}`;
      const newReward: RewardItem = { ...rewardData, id: newId };
       console.log(`[DataContext] Creating reward ${newReward.name} (${newReward.cost} tickets)`);
      setRewardsCatalog(prev => [...prev, newReward].sort((a, b) => a.cost - b.cost));
      console.log(`[DataContext] Create Reward SUCCESS`);
      // alert(`Mock Create Reward SUCCESS: ${newReward.name} (${newReward.cost} tickets)`); // Removed alert
    },
    []
  );

  const simulateEditReward = useCallback(
    (rewardId: string, rewardData: Partial<Omit<RewardItem, 'id'>>) => {
      let editedName = rewardId;
       console.log(`[DataContext] Editing reward ${rewardId}`);
      setRewardsCatalog(prev =>
        prev
          .map(reward => {
            if (reward.id === rewardId) {
              const updatedReward = { ...reward, ...rewardData };
              editedName = updatedReward.name;
              return updatedReward;
            }
            return reward;
          })
          .sort((a, b) => a.cost - b.cost)
      );
      console.log(`[DataContext] Edit Reward SUCCESS: "${editedName}"`);
      // alert(`Mock Edit Reward SUCCESS: "${editedName}"`); // Removed alert
    },
    []
  );

  const simulateDeleteReward = useCallback(
    (rewardId: string) => {
      const rewardToDelete = rewardsCatalog.find(r => r.id === rewardId);
      if (!rewardToDelete) {
         console.error(`[DataContext] Delete Reward FAILED: ID ${rewardId} not found.`);
        // alert(`Mock Delete Reward FAILED: ID ${rewardId} not found.`); // Removed alert
        return;
      }
      const rewardName = rewardToDelete.name;
       console.log(`[DataContext] Deleting reward "${rewardName}" (${rewardId})`);
      setRewardsCatalog(prev => prev.filter(reward => reward.id !== rewardId));
      console.log(`[DataContext] Delete Reward SUCCESS`);
      // alert(`Mock Delete Reward SUCCESS: "${rewardName}" (${rewardId})`); // Removed alert
    },
    [rewardsCatalog]
  );

  const simulateCreateTaskLibraryItem = useCallback(
    (taskData: Omit<TaskLibraryItem, 'id'>) => {
      const newId = `tasklib-${Date.now()}-${Math.random().toString(36).substring(7)}`;
      const newTask: TaskLibraryItem = { ...taskData, id: newId };
       console.log(`[DataContext] Creating task lib item ${newTask.title} (${newTask.baseTickets} pts)`);
      setTaskLibrary(prev => [...prev, newTask].sort((a, b) => a.title.localeCompare(b.title)));
      console.log(`[DataContext] Create Task Lib SUCCESS`);
      // alert(`Mock Create Task Lib SUCCESS: ${newTask.title} (${newTask.baseTickets} pts)`); // Removed alert
    },
    []
  );

  const simulateEditTaskLibraryItem = useCallback(
    (taskId: string, taskData: Partial<Omit<TaskLibraryItem, 'id'>>) => {
      let editedTitle = taskId;
       console.log(`[DataContext] Editing task lib item ${taskId}`);
      setTaskLibrary(prev =>
        prev
          .map(task => {
            if (task.id === taskId) {
              const updatedTask = { ...task, ...taskData };
              editedTitle = updatedTask.title;
              return updatedTask;
            }
            return task;
          })
          .sort((a, b) => a.title.localeCompare(b.title))
      );
       console.log(`[DataContext] Edit Task Lib SUCCESS: "${editedTitle}"`);
      // alert(`Mock Edit Task Lib SUCCESS: "${editedTitle}"`); // Removed alert
    },
    []
  );

  const simulateDeleteTaskLibraryItem = useCallback(
    (taskId: string) => {
      const taskToDelete = taskLibrary.find(t => t.id === taskId);
      if (!taskToDelete) {
         console.error(`[DataContext] Delete Task Lib FAILED: ID ${taskId} not found.`);
        // alert(`Mock Delete Task Lib FAILED: ID ${taskId} not found.`); // Removed alert
        return;
      }
      const taskTitle = taskToDelete.title;
      console.log(`[DataContext] Deleting task lib item "${taskTitle}" (${taskId})`);
      setTaskLibrary(prev => prev.filter(task => task.id !== taskId));
      console.log(`[DataContext] Delete Task Lib SUCCESS`);
      // alert(`Mock Delete Task Lib SUCCESS: "${taskTitle}" (${taskId})`); // Removed alert
    },
    [taskLibrary]
  );

  const simulateDeleteAssignedTask = useCallback(
    (assignmentId: string) => {
      const taskToDelete = assignedTasks.find(t => t.id === assignmentId);
      if (!taskToDelete) {
           console.error(`[DataContext] Delete Assigned Task FAILED: Assignment ID ${assignmentId} not found.`);
          // alert(`Mock Delete Assigned Task FAILED: Assignment ID ${assignmentId} not found.`); // Removed alert
          return;
      }
      const taskTitle = taskToDelete.taskTitle;
      console.log(`[DataContext] Deleting assigned task "${taskTitle}" (ID: ${assignmentId})`);
      setAssignedTasks(prev => prev.filter(t => t.id !== assignmentId));
      console.log(`[DataContext] Delete Assigned Task SUCCESS`);
      // alert(`Mock Delete Assigned Task SUCCESS: "${taskTitle}" (ID: ${assignmentId})`); // Removed alert
    },
    [assignedTasks]
  );

  const simulateCreateInstrument = useCallback(
    (instrumentData: Omit<Instrument, 'id'>) => {
      const newId = `inst-${Date.now()}-${Math.random().toString(36).substring(7)}`;
      const newInstrument: Instrument = { ...instrumentData, id: newId };
       console.log(`[DataContext] Creating instrument ${newInstrument.name} (${newId})`);
      setInstruments(prev => [...prev, newInstrument].sort((a, b) => a.name.localeCompare(b.name)));
      console.log(`[DataContext] Create Instrument SUCCESS`);
      // alert(`Mock Create Instrument SUCCESS: ${newInstrument.name} (${newId})`); // Removed alert
    },
    []
  );

  const simulateEditInstrument = useCallback(
    (instrumentId: string, instrumentData: Partial<Omit<Instrument, 'id'>>) => {
      let editedName = instrumentId;
       console.log(`[DataContext] Editing instrument ${instrumentId}`);
      setInstruments(prev =>
        prev
          .map(inst => {
            if (inst.id === instrumentId) {
              const updatedInst = { ...inst, ...instrumentData };
              editedName = updatedInst.name;
              return updatedInst;
            }
            return inst;
          })
          .sort((a, b) => a.name.localeCompare(b.name))
      );
       console.log(`[DataContext] Edit Instrument SUCCESS: "${editedName}"`);
      // alert(`Mock Edit Instrument SUCCESS: "${editedName}"`); // Removed alert
    },
    []
  );

  const simulateDeleteInstrument = useCallback(
    (instrumentId: string) => {
      const instToDelete = instruments.find(i => i.id === instrumentId);
      if (!instToDelete) {
          console.error(`[DataContext] Delete Instrument FAILED: ID ${instrumentId} not found.`);
        // alert(`Mock Delete Instrument FAILED: ID ${instrumentId} not found.`); // Removed alert
        return;
      }
      const instName = instToDelete.name;
       console.log(`[DataContext] Deleting instrument "${instName}" (${instrumentId})`);
      setInstruments(prev => prev.filter(inst => inst.id !== instrumentId));
      console.log(`[DataContext] Delete Instrument SUCCESS`);
      // alert(`Mock Delete Instrument SUCCESS: "${instName}" (${instrumentId})`); // Removed alert
    },
    [instruments]
  );

  // getMockStudentData unchanged
  const getMockStudentData = useCallback(
    (studentId: string): StudentProfileData | undefined => {
      const studentUser = currentMockUsers[studentId];
      if (!studentUser || studentUser.role !== 'student') return undefined;

      return {
        user: studentUser,
        balance: ticketBalances[studentId] || 0,
        assignedTasks: assignedTasks.filter(task => task.studentId === studentId),
        history: ticketHistory
          .filter(tx => tx.studentId === studentId)
          .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()),
        rewardsCatalog: rewardsCatalog,
        announcements: announcements,
        taskLibrary: taskLibrary,
        mockInstruments: instruments,
        onMarkTaskComplete: simulateMarkTaskComplete,
      };
    },
    [
      currentMockUsers, ticketBalances, assignedTasks, ticketHistory, rewardsCatalog, announcements, taskLibrary, instruments, simulateMarkTaskComplete,
    ]
  );

  // Context Value Memoization
  const value = useMemo(
    () => ({
      currentMockUsers, assignedTasks, ticketBalances, ticketHistory, announcements, rewardsCatalog, taskLibrary, mockInstruments: instruments,
      simulateMarkTaskComplete, simulateVerifyTask, simulateManualTicketAdjustment, simulateRedeemReward, simulateAssignTask, simulateReassignTask,
      simulateCreateUser, simulateEditUser, simulateDeleteUser, simulateToggleUserStatus,
      simulateCreateAnnouncement, simulateEditAnnouncement, simulateDeleteAnnouncement, simulateCreateReward, simulateEditReward, simulateDeleteReward,
      simulateCreateTaskLibraryItem, simulateEditTaskLibraryItem, simulateDeleteTaskLibraryItem, simulateDeleteAssignedTask,
      simulateCreateInstrument, simulateEditInstrument, simulateDeleteInstrument,
      getMockStudentData,
    }),
    [ // Ensure all dependencies are listed
      currentMockUsers, assignedTasks, ticketBalances, ticketHistory, announcements, rewardsCatalog, taskLibrary, instruments,
      simulateMarkTaskComplete, simulateVerifyTask, simulateManualTicketAdjustment, simulateRedeemReward, simulateAssignTask, simulateReassignTask,
      simulateCreateUser, simulateEditUser, simulateDeleteUser, simulateToggleUserStatus,
      simulateCreateAnnouncement, simulateEditAnnouncement, simulateDeleteAnnouncement, simulateCreateReward, simulateEditReward, simulateDeleteReward,
      simulateCreateTaskLibraryItem, simulateEditTaskLibraryItem, simulateDeleteTaskLibraryItem, simulateDeleteAssignedTask,
      simulateCreateInstrument, simulateEditInstrument, simulateDeleteInstrument,
      getMockStudentData,
      // Added auth context dependencies
      currentUserId, setMockAuthState,
    ]
  );

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
};

// useData hook remains the same
export const useData = (): DataContextType => {
  const context = useContext(DataContext);
  if (context === undefined) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
};