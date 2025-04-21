
import React, { createContext, useState, useContext, useMemo, ReactNode, useCallback } from 'react';
import { Platform } from 'react-native';
import { StudentProfileData } from '../views/StudentView'; 
import { User, UserRole } from '../types/userTypes';
import { mockUsers } from '../mocks/mockUsers';
import {
  mockTicketBalances as initialMockTicketBalances,
  mockTicketHistory as initialMockTicketHistory,
  TicketTransaction,
  TransactionType,
} from '../mocks/mockTickets';
import {
  mockAllAssignedTasks as initialMockAllAssignedTasks,
  AssignedTask,
  TaskVerificationStatus,
} from '../mocks/mockAssignedTasks';
import {
  initialMockRewardsCatalog,
  RewardItem
} from '../mocks/mockRewards';
import {
  mockAnnouncements as initialMockAnnouncements,
  Announcement,
  AnnouncementType,
} from '../mocks/mockAnnouncements';
import {
  initialMockTaskLibrary,
  TaskLibraryItem
} from '../mocks/mockTaskLibrary';
import { mockInstruments, Instrument } from '../mocks/mockInstruments';
import { getTaskTitle, getUserDisplayName } from '../utils/helpers';
import { StudentViewProps } from '../views/StudentView'; 


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
  simulateVerifyTask: (taskId: string, status: TaskVerificationStatus, actualTickets: number) => void;
  simulateManualTicketAdjustment: (studentId: string, amount: number, notes: string) => void;
  simulateRedeemReward: (studentId: string, rewardId: string) => void;
  simulateAssignTask: (taskId: string, studentId: string, assignerId?: string) => void; 
  simulateReassignTask: (originalTaskId: string, studentId: string, assignerId?: string) => void; 
  simulateCreateUser: (userData: Omit<User, 'id'>) => void;
  simulateEditUser: (userId: string, userData: Partial<Omit<User, 'id'>>) => void;
  simulateDeleteUser: (userId: string) => void;
  simulateCreateAnnouncement: (announcementData: Omit<Announcement, 'id' | 'date'>) => void;
  simulateEditAnnouncement: (announcementId: string, announcementData: Partial<Omit<Announcement, 'id' | 'date'>>) => void;
  simulateDeleteAnnouncement: (announcementId: string) => void;
  simulateCreateReward: (rewardData: Omit<RewardItem, 'id'>) => void;
  simulateEditReward: (rewardId: string, rewardData: Partial<Omit<RewardItem, 'id'>>) => void;
  simulateDeleteReward: (rewardId: string) => void;
  simulateCreateTaskLibraryItem: (taskData: Omit<TaskLibraryItem, 'id'>) => void;
  simulateEditTaskLibraryItem: (taskId: string, taskData: Partial<Omit<TaskLibraryItem, 'id'>>) => void;
  simulateDeleteTaskLibraryItem: (taskId: string) => void;
  simulateDeleteAssignedTask: (assignmentId: string) => void;
  simulateCreateInstrument: (instrumentData: Omit<Instrument, 'id'>) => void; 
  simulateEditInstrument: (instrumentId: string, instrumentData: Partial<Omit<Instrument, 'id'>>) => void; 
  simulateDeleteInstrument: (instrumentId: string) => void; 

  
  getMockStudentData: (studentId: string) => StudentProfileData | undefined;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export const DataProvider = ({ children }: { children: ReactNode }) => {
  
  const [currentMockUsers, setCurrentMockUsers] = useState<Record<string, User>>(mockUsers);
  const [assignedTasks, setAssignedTasks] = useState<AssignedTask[]>(initialMockAllAssignedTasks);
  const [ticketBalances, setTicketBalances] = useState<Record<string, number>>(initialMockTicketBalances);
  const [ticketHistory, setTicketHistory] = useState<TicketTransaction[]>(initialMockTicketHistory);
  const [announcements, setAnnouncements] = useState<Announcement[]>(initialMockAnnouncements);
  const [rewardsCatalog, setRewardsCatalog] = useState<RewardItem[]>(initialMockRewardsCatalog);
  const [taskLibrary, setTaskLibrary] = useState<TaskLibraryItem[]>(initialMockTaskLibrary);
  const [instruments, setInstruments] = useState<Instrument[]>(mockInstruments); 

  
  

  const simulateMarkTaskComplete = useCallback((taskId: string) => {
    setAssignedTasks(prevTasks =>
      prevTasks.map(task =>
        task.id === taskId && !task.isComplete
          ? {
              ...task,
              isComplete: true,
              completedDate: new Date().toISOString(),
              verificationStatus: 'pending',
            }
          : task
      )
    );
    alert('Task Marked Complete - Waiting for teacher verification!');
  }, []);

  const simulateVerifyTask = useCallback((taskId: string, status: TaskVerificationStatus, actualTickets: number) => {
     setAssignedTasks(prevTasks => {
       const taskToVerify = prevTasks.find(t => t.id === taskId);
       if (!taskToVerify || !taskToVerify.isComplete || taskToVerify.verificationStatus !== 'pending') {
         console.warn('Attempted to verify task not in pending state or not found:', taskId);
         alert("Verification Failed - Task not found or not pending.");
         
         return prevTasks;
       }

       const updatedTasks = prevTasks.map(task =>
         task.id === taskId
           ? { ...task, verificationStatus: status, verifiedDate: new Date().toISOString(), actualPointsAwarded: (status === 'verified' || status === 'partial') ? actualTickets : undefined, }
           : task
       );

       if (status === 'verified' || status === 'partial') {
         const studentId = taskToVerify.studentId;
         const tickets = actualTickets;
         setTicketBalances(prevBalances => ({ ...prevBalances, [studentId]: (prevBalances[studentId] || 0) + tickets, }));
         setTicketHistory(prevHistory => {
           const newTaskAwardTx: TicketTransaction = { id: `tx-${Date.now()}`, studentId: studentId, timestamp: new Date().toISOString(), amount: tickets, type: 'task_award', sourceId: taskId, notes: `Task: ${getTaskTitle(taskToVerify.taskId, taskLibrary)} (${status})`, };
           return [newTaskAwardTx, ...prevHistory];
         });
         alert(`Task Verified - Status: ${status}, Awarded: ${actualTickets} tickets`);
       } else {
         alert(`Task Marked Incomplete - No tickets awarded for task ${taskId}.`);
       }
       

       return updatedTasks;
     });
   }, [taskLibrary]); 

   const simulateManualTicketAdjustment = useCallback((studentId: string, amount: number, notes: string) => {
        const student = currentMockUsers[studentId];
        if (!student) {
            alert(`Error: Student with ID ${studentId} not found.`);
            return;
        }
        setTicketBalances(prevBalances => ({ ...prevBalances, [studentId]: (prevBalances[studentId] || 0) + amount }));
        setTicketHistory(prevHistory => [
            { id: `tx-${Date.now()}`, studentId: studentId, timestamp: new Date().toISOString(), amount: amount, type: amount > 0 ? 'manual_add' : 'manual_subtract', sourceId: `manual-${Date.now()}`, notes: notes, },
            ...prevHistory,
        ]);
        alert(`Balance Adjusted - Adjusted ${amount} tickets for student ${getUserDisplayName(student)}.`);
    }, [currentMockUsers]); 

    const simulateRedeemReward = useCallback((studentId: string, rewardId: string) => {
        const reward = rewardsCatalog.find(r => r.id === rewardId);
        const student = currentMockUsers[studentId];
        if (!reward || !student) {
            alert(`Error - ${!reward ? 'Reward' : 'Student'} not found.`);
            return;
        }
        const cost = reward.cost;
        const currentBalance = ticketBalances[studentId] || 0;
        const studentName = getUserDisplayName(student);

        if (currentBalance < cost) {
            alert(`Cannot Redeem - Student ${studentName} needs ${cost - currentBalance} more tickets for ${reward.name}.`);
            return;
        }

        setTicketBalances(prevBalances => ({ ...prevBalances, [studentId]: prevBalances[studentId] - cost }));
        setTicketHistory(prevHistory => [
            { id: `tx-${Date.now()}`, studentId: studentId, timestamp: new Date().toISOString(), amount: -cost, type: 'redemption', sourceId: rewardId, notes: `Redeemed: ${reward.name}`, },
            ...prevHistory,
        ]);
        const redemptionAnnouncement: Announcement = { id: `ann-redemption-${Date.now()}`, type: 'redemption_celebration', title: '🎉 Reward Redeemed! 🎉', message: `${studentName} redeemed a ${reward.name}!`, date: new Date().toISOString(), relatedStudentId: studentId };
        setAnnouncements(prev => [redemptionAnnouncement, ...prev]);
        alert(`Reward Redeemed - ${reward.name} redeemed for ${studentName}! ${cost} tickets deducted. A public announcement was created.`);
    }, [rewardsCatalog, currentMockUsers, ticketBalances]); 

    const simulateAssignTask = useCallback((taskId: string, studentId: string, assignerId: string = 'admin-mock') => { 
        const taskDetails = taskLibrary.find(t => t.id === taskId);
        const student = currentMockUsers[studentId];
        if (!taskDetails || !student) {
          alert(`Error - ${!taskDetails ? 'Task' : 'Student'} not found.`);
          return;
        }
        const studentName = getUserDisplayName(student);
        const newAssignedTask: AssignedTask = { id: `assigned-${Date.now()}`, taskId: taskId, studentId: studentId, assignedById: assignerId, assignedDate: new Date().toISOString(), isComplete: false, verificationStatus: undefined };
        setAssignedTasks(prevTasks => [...prevTasks, newAssignedTask]);
        alert(`Task Assigned - ${taskDetails.title} assigned to ${studentName}.`);
    }, [taskLibrary, currentMockUsers]); 

    const simulateReassignTask = useCallback((originalTaskId: string, studentId: string, assignerId: string = 'admin-mock') => {
        const taskDetails = taskLibrary.find(t => t.id === originalTaskId);
        const student = currentMockUsers[studentId];
        if (!taskDetails || !student) {
          alert(`Error - ${!taskDetails ? 'Original Task' : 'Student'} not found.`);
          return;
        }
        const studentName = getUserDisplayName(student);
        const newAssignedTask: AssignedTask = { id: `assigned-re-${Date.now()}`, taskId: originalTaskId, studentId: studentId, assignedById: assignerId, assignedDate: new Date().toISOString(), isComplete: false, verificationStatus: undefined, };
        setAssignedTasks(prevTasks => [...prevTasks, newAssignedTask]);
        alert(`Task Re-assigned - ${taskDetails.title} re-assigned to ${studentName}.`);
    }, [taskLibrary, currentMockUsers]); 

    const simulateCreateUser = useCallback((userData: Omit<User, 'id'>) => {
        const newId = `user-${Date.now()}-${Math.random().toString(36).substring(7)}`;
        const newUser: User = { ...userData, id: newId };
        setCurrentMockUsers(prev => ({ ...prev, [newId]: newUser }));
        alert(`Mock Create User SUCCESS: ${getUserDisplayName(newUser)} (${newId})`);
    }, []);

    const simulateEditUser = useCallback((userId: string, userData: Partial<Omit<User, 'id'>>) => {
        let editedUserName = userId;
        setCurrentMockUsers(prev => {
            if (!prev[userId]) {
                console.error("User not found for edit:", userId);
                alert(`Mock Edit User FAILED: User ${userId} not found.`);
                return prev;
            }
            const updatedUser = { ...prev[userId], ...userData };
            editedUserName = getUserDisplayName(updatedUser);
            return { ...prev, [userId]: updatedUser };
        });
        
        alert(`Mock Edit User SUCCESS: ${editedUserName} (${userId})`);
    }, []); 

    const simulateDeleteUser = useCallback((userId: string) => {
        const userToDelete = currentMockUsers[userId];
        if (!userToDelete) {
           alert(`Mock Delete User FAILED: User ${userId} not found.`);
           return;
        }
        const userName = getUserDisplayName(userToDelete);
        setCurrentMockUsers(prev => {
            const newState = { ...prev };
            delete newState[userId];
            return newState;
        });
        alert(`Mock Delete User SUCCESS: ${userName} (${userId})`);
    }, [currentMockUsers]); 

    const simulateCreateAnnouncement = useCallback((announcementData: Omit<Announcement, 'id' | 'date'>) => {
        const newId = `ann-${Date.now()}-${Math.random().toString(36).substring(7)}`;
        const newAnnouncement: Announcement = { ...announcementData, id: newId, date: new Date().toISOString(), type: announcementData.type || 'announcement' };
        setAnnouncements(prev => [newAnnouncement, ...prev]);
        alert(`Mock Create Announcement SUCCESS: "${newAnnouncement.title}" (${newId})`);
    }, []);

    const simulateEditAnnouncement = useCallback((announcementId: string, announcementData: Partial<Omit<Announcement, 'id' | 'date'>>) => {
        let editedTitle = announcementId;
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
        alert(`Mock Edit Announcement SUCCESS: "${editedTitle}"`);
      }, []);

    const simulateDeleteAnnouncement = useCallback((announcementId: string) => {
        const annToDelete = announcements.find(a => a.id === announcementId);
        if (!annToDelete) {
           alert(`Mock Delete Announcement FAILED: ID ${announcementId} not found.`);
           return;
        }
        const annTitle = annToDelete.title;
        setAnnouncements(prev => prev.filter(ann => ann.id !== announcementId));
        alert(`Mock Delete Announcement SUCCESS: "${annTitle}" (${announcementId})`);
    }, [announcements]); 

    const simulateCreateReward = useCallback((rewardData: Omit<RewardItem, 'id'>) => {
        const newId = `reward-${Date.now()}-${Math.random().toString(36).substring(7)}`;
        const newReward: RewardItem = { ...rewardData, id: newId };
        setRewardsCatalog(prev => [...prev, newReward].sort((a,b) => a.cost - b.cost));
        alert(`Mock Create Reward SUCCESS: ${newReward.name} (${newReward.cost} tickets)`);
    }, []);

    const simulateEditReward = useCallback((rewardId: string, rewardData: Partial<Omit<RewardItem, 'id'>>) => {
        let editedName = rewardId;
        setRewardsCatalog(prev =>
          prev.map(reward => {
            if (reward.id === rewardId) {
               const updatedReward = { ...reward, ...rewardData };
               editedName = updatedReward.name;
               return updatedReward;
            }
            return reward;
          }).sort((a, b) => a.cost - b.cost)
        );
        alert(`Mock Edit Reward SUCCESS: "${editedName}"`);
     }, []);

    const simulateDeleteReward = useCallback((rewardId: string) => {
        const rewardToDelete = rewardsCatalog.find(r => r.id === rewardId);
        if (!rewardToDelete) {
            alert(`Mock Delete Reward FAILED: ID ${rewardId} not found.`);
            return;
        }
        const rewardName = rewardToDelete.name;
        setRewardsCatalog(prev => prev.filter(reward => reward.id !== rewardId));
        alert(`Mock Delete Reward SUCCESS: "${rewardName}" (${rewardId})`);
    }, [rewardsCatalog]); 

    const simulateCreateTaskLibraryItem = useCallback((taskData: Omit<TaskLibraryItem, 'id'>) => {
        const newId = `tasklib-${Date.now()}-${Math.random().toString(36).substring(7)}`;
        const newTask: TaskLibraryItem = { ...taskData, id: newId };
        setTaskLibrary(prev => [...prev, newTask].sort((a, b) => a.title.localeCompare(b.title)));
        alert(`Mock Create Task Lib SUCCESS: ${newTask.title} (${newTask.baseTickets} pts)`);
    }, []);

    const simulateEditTaskLibraryItem = useCallback((taskId: string, taskData: Partial<Omit<TaskLibraryItem, 'id'>>) => {
        let editedTitle = taskId;
        setTaskLibrary(prev =>
            prev.map(task => {
                if (task.id === taskId) {
                    const updatedTask = { ...task, ...taskData };
                    editedTitle = updatedTask.title;
                    return updatedTask;
                }
                return task;
            }).sort((a, b) => a.title.localeCompare(b.title))
        );
        alert(`Mock Edit Task Lib SUCCESS: "${editedTitle}"`);
    }, []);

    const simulateDeleteTaskLibraryItem = useCallback((taskId: string) => {
        const taskToDelete = taskLibrary.find(t => t.id === taskId);
        if (!taskToDelete) {
            alert(`Mock Delete Task Lib FAILED: ID ${taskId} not found.`);
            return;
        }
        const taskTitle = taskToDelete.title;
        const isAssigned = assignedTasks.some(at => at.taskId === taskId);
        if (isAssigned) {
          const confirmDelete = Platform.OS === 'web'
            ? confirm(`Warning: Task "${taskTitle}" is currently assigned... Delete anyway?`)
            : true; 
          if (!confirmDelete) {
              alert(`Mock Delete Task Lib CANCELED: "${taskTitle}" (${taskId})`);
              return;
          }
        }
        setTaskLibrary(prev => prev.filter(task => task.id !== taskId));
        alert(`Mock Delete Task Lib SUCCESS: "${taskTitle}" (${taskId})`);
    }, [taskLibrary, assignedTasks]); 

    const simulateDeleteAssignedTask = useCallback((assignmentId: string) => {
        const taskInfo = assignedTasks.find(t => t.id === assignmentId);
        setAssignedTasks(prev => prev.filter(t => t.id !== assignmentId));
        alert(`Mock Delete Assigned Task SUCCESS: Assignment ID ${assignmentId} (Task: ${taskInfo ? getTaskTitle(taskInfo.taskId, taskLibrary) : 'Unknown'})`);
    }, [assignedTasks, taskLibrary]); 

    const simulateCreateInstrument = useCallback((instrumentData: Omit<Instrument, 'id'>) => {
        const newId = `inst-${Date.now()}-${Math.random().toString(36).substring(7)}`;
        const newInstrument: Instrument = { ...instrumentData, id: newId };
        setInstruments(prev => [...prev, newInstrument].sort((a, b) => a.name.localeCompare(b.name)));
        alert(`Mock Create Instrument SUCCESS: ${newInstrument.name} (${newId})`);
    }, []);

    const simulateEditInstrument = useCallback((instrumentId: string, instrumentData: Partial<Omit<Instrument, 'id'>>) => {
        let editedName = instrumentId;
        setInstruments(prev =>
            prev.map(inst => {
                if (inst.id === instrumentId) {
                    const updatedInst = { ...inst, ...instrumentData };
                    editedName = updatedInst.name;
                    return updatedInst;
                }
                return inst;
            }).sort((a, b) => a.name.localeCompare(b.name))
        );
        alert(`Mock Edit Instrument SUCCESS: "${editedName}"`);
    }, []);

    const simulateDeleteInstrument = useCallback((instrumentId: string) => {
        const instToDelete = instruments.find(i => i.id === instrumentId);
        if (!instToDelete) {
            alert(`Mock Delete Instrument FAILED: ID ${instrumentId} not found.`);
            return;
        }
        const instName = instToDelete.name;
        setInstruments(prev => prev.filter(inst => inst.id !== instrumentId));
        alert(`Mock Delete Instrument SUCCESS: "${instName}" (${instrumentId})`);
    }, [instruments]);


  
  const getMockStudentData = useCallback((studentId: string): StudentViewProps | undefined => {
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
  }, [currentMockUsers, ticketBalances, assignedTasks, ticketHistory, rewardsCatalog, announcements, taskLibrary, instruments, simulateMarkTaskComplete]); 


  
  const value = useMemo(() => ({
    currentMockUsers,
    assignedTasks,
    ticketBalances,
    ticketHistory,
    announcements,
    rewardsCatalog,
    taskLibrary,
    mockInstruments: instruments, 
    simulateMarkTaskComplete,
    simulateVerifyTask,
    simulateManualTicketAdjustment,
    simulateRedeemReward,
    simulateAssignTask,
    simulateReassignTask,
    simulateCreateUser,
    simulateEditUser,
    simulateDeleteUser,
    simulateCreateAnnouncement,
    simulateEditAnnouncement,
    simulateDeleteAnnouncement,
    simulateCreateReward,
    simulateEditReward,
    simulateDeleteReward,
    simulateCreateTaskLibraryItem,
    simulateEditTaskLibraryItem,
    simulateDeleteTaskLibraryItem,
    simulateDeleteAssignedTask,
    simulateCreateInstrument,
    simulateEditInstrument,
    simulateDeleteInstrument,
    getMockStudentData,
  }), [
      currentMockUsers, assignedTasks, ticketBalances, ticketHistory, announcements, rewardsCatalog, taskLibrary, instruments, 
      simulateMarkTaskComplete, simulateVerifyTask, simulateManualTicketAdjustment, simulateRedeemReward, simulateAssignTask, simulateReassignTask, simulateCreateUser, simulateEditUser, simulateDeleteUser, simulateCreateAnnouncement, simulateEditAnnouncement, simulateDeleteAnnouncement, simulateCreateReward, simulateEditReward, simulateDeleteReward, simulateCreateTaskLibraryItem, simulateEditTaskLibraryItem, simulateDeleteTaskLibraryItem, simulateDeleteAssignedTask, simulateCreateInstrument, simulateEditInstrument, simulateDeleteInstrument, 
      getMockStudentData
  ]); 

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
};


export const useData = (): DataContextType => {
  const context = useContext(DataContext);
  if (context === undefined) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
};