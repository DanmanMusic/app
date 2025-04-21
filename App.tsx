// App.tsx
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View, Button, Alert } from 'react-native';
import React, { useState, useEffect } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { UserRole, User } from './src/types/userTypes';
import { mockUsers } from './src/mocks/mockUsers';

import {
  mockTicketBalances as initialMockTicketBalances,
  mockTicketHistory as initialMockTicketHistory,
  TicketTransaction,
  TransactionType,
} from './src/mocks/mockTickets';
import {
  mockAllAssignedTasks as initialMockAllAssignedTasks,
  AssignedTask,
  TaskVerificationStatus,
} from './src/mocks/mockAssignedTasks';
import {
  initialMockRewardsCatalog,
  RewardItem
} from './src/mocks/mockRewards';
import {
  mockAnnouncements as initialMockAnnouncements,
  Announcement,
  AnnouncementType,
} from './src/mocks/mockAnnouncements';
import {
  initialMockTaskLibrary,
  TaskLibraryItem
} from './src/mocks/mockTaskLibrary';
import { mockInstruments, Instrument } from './src/mocks/mockInstruments';

import { getTaskTitle, getInstrumentNames, getUserDisplayName, getInstrumentIconSource } from './src/utils/helpers';

import { PublicView } from './src/views/PublicView';
import { StudentView, StudentViewProps } from './src/views/StudentView';
import { TeacherView } from './src/views/TeacherView';
import { ParentView } from './src/views/ParentView';
import { AdminView } from './src/views/AdminView';

import TaskVerificationModal from './src/components/TaskVerificationModal';

import { appSharedStyles } from './src/styles/appSharedStyles';
import { colors } from './src/styles/colors';


type MockAuthState = {
  role: UserRole | 'public';
  userId?: string;
  viewingStudentId?: string;
};

const DevelopmentViewSelector = ({
  onSelectView,
}: {
  onSelectView: (state: MockAuthState) => void;
}) => {
    return (
        <View style={styles.selectorContainer}>
            <Text style={styles.selectorTitle}>Development Mode: Select User Role</Text>

            <Button
                title="View as Public (Not Logged In)"
                onPress={() => onSelectView({ role: 'public' })}
                color={colors.secondary}
            />

            {Object.values(mockUsers).map(user => (
                <Button
                    key={user.id}
                    title={`Login as ${getUserDisplayName(user)} (${user.role})`}
                    onPress={() => {
                        let viewingStudentId: string | undefined;
                        if (user.role === 'student') {
                            viewingStudentId = user.id;
                        } else if (
                            user.role === 'parent' &&
                            user.linkedStudentIds &&
                            user.linkedStudentIds.length > 0
                        ) {
                            viewingStudentId = user.linkedStudentIds[0];
                        } else if (user.role === 'teacher') {
                            viewingStudentId = Object.values(mockUsers).find(u => u.role === 'student' && u.linkedTeacherIds?.includes(user.id))?.id;
                        }

                        onSelectView({ role: user.role, userId: user.id, viewingStudentId });
                    }}
                    color={
                        user.role === 'admin'
                            ? colors.danger
                            : user.role === 'teacher'
                                ? colors.primary
                                : user.role === 'parent'
                                    ? colors.success
                                    : user.role === 'student'
                                        ? colors.gold
                                        : colors.secondary
                    }
                />
            ))}
        </View>
    );
};

export default function App() {
  const [mockAuthState, setMockAuthState] = useState<MockAuthState | null>(null);

  const [currentMockUsers, setCurrentMockUsers] = useState<Record<string, User>>(mockUsers);
  const [assignedTasks, setAssignedTasks] = useState<AssignedTask[]>(initialMockAllAssignedTasks);
  const [ticketBalances, setTicketBalances] = useState<Record<string, number>>(initialMockTicketBalances);
  const [ticketHistory, setTicketHistory] = useState<TicketTransaction[]>(initialMockTicketHistory);
  const [announcements, setAnnouncements] = useState<Announcement[]>(initialMockAnnouncements);
  const [rewardsCatalog, setRewardsCatalog] = useState<RewardItem[]>(initialMockRewardsCatalog);
  const [taskLibrary, setTaskLibrary] = useState<TaskLibraryItem[]>(initialMockTaskLibrary);


  const [isVerificationModalVisible, setIsVerificationModalVisible] = useState(false);
  const [taskToVerify, setTaskToVerify] = useState<AssignedTask | null>(null);


  useEffect(() => {
    if (!mockAuthState) {
        setCurrentMockUsers(mockUsers);
        setAssignedTasks(initialMockAllAssignedTasks);
        setTicketBalances(initialMockTicketBalances);
        setTicketHistory(initialMockTicketHistory);
        setAnnouncements(initialMockAnnouncements);
        setRewardsCatalog(initialMockRewardsCatalog);
        setTaskLibrary(initialMockTaskLibrary);

        setTaskToVerify(null);
        setIsVerificationModalVisible(false);
    }
  }, [mockAuthState]);

  const isAuthenticated = !!mockAuthState;
  const currentUserRole: UserRole | 'public' = mockAuthState?.role || 'public';
  const currentUserId: string | undefined = mockAuthState?.userId;
  const currentViewingStudentId: string | undefined = mockAuthState?.viewingStudentId;


  const handleInitiateVerificationModal = (task: AssignedTask) => {
    setTaskToVerify(task);
    setIsVerificationModalVisible(true);
  };

  const handleCloseVerificationModal = () => {
    setIsVerificationModalVisible(false);
    setTaskToVerify(null);
  };


  const simulateMarkTaskComplete = (taskId: string) => {
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
  };

  const simulateVerifyTask = (
    taskId: string,
    status: TaskVerificationStatus,
    actualTickets: number
  ) => {
    setAssignedTasks(prevTasks => {
      const taskToVerify = prevTasks.find(t => t.id === taskId);
      if (
        !taskToVerify ||
        !taskToVerify.isComplete ||
        taskToVerify.verificationStatus !== 'pending'
      ) {
        console.warn('Attempted to verify task not in pending state or not found:', taskId);
        alert("Verification Failed - Task not found or not pending.");
        setIsVerificationModalVisible(false);
        setTaskToVerify(null);
        return prevTasks;
      }

      const updatedTasks = prevTasks.map(task =>
        task.id === taskId
          ? {
              ...task,
              verificationStatus: status,
              verifiedDate: new Date().toISOString(),
              actualPointsAwarded: (status === 'verified' || status === 'partial') ? actualTickets : undefined,
            }
          : task
      );

      if (status === 'verified' || status === 'partial') {
        const studentId = taskToVerify.studentId;
        const tickets = actualTickets;

        setTicketBalances(prevBalances => ({
          ...prevBalances,
          [studentId]: (prevBalances[studentId] || 0) + tickets,
        }));

        setTicketHistory(prevHistory => {
          const newTaskAwardTx: TicketTransaction = {
            id: `tx-${Date.now()}-${Math.random().toString(36).substring(7)}`,
            studentId: studentId,
            timestamp: new Date().toISOString(),
            amount: tickets,
            type: 'task_award',
            sourceId: taskId,
            notes: `Task: ${getTaskTitle(taskToVerify.taskId, taskLibrary)} (${status})`,
          };
          return [
            newTaskAwardTx,
            ...prevHistory,
          ];
        });
         alert(`Task Verified - Status: ${status}, Awarded: ${actualTickets} tickets`);

      } else {
         alert(`Task Marked Incomplete - No tickets awarded for task ${taskId}.`);
      }

       setIsVerificationModalVisible(false);
       setTaskToVerify(null);


      return updatedTasks;
    });
  };

  const simulateManualTicketAdjustment = (studentId: string, amount: number, notes: string) => {
    setTicketBalances(prevBalances => ({
      ...prevBalances,
      [studentId]: (prevBalances[studentId] || 0) + amount,
    }));
    setTicketHistory(prevHistory => [
      {
        id: `tx-${Date.now()}-${Math.random().toString(36).substring(7)}`,
        studentId: studentId,
        timestamp: new Date().toISOString(),
        amount: amount,
        type: amount > 0 ? 'manual_add' : 'manual_subtract',
        sourceId: `manual-${Date.now()}`,
        notes: notes,
      },
      ...prevHistory,
    ]);

    const student = currentMockUsers[studentId];
    alert(`Balance Adjusted - Adjusted ${amount} tickets for student ${getUserDisplayName(student)}.`);
  };

  const simulateRedeemReward = (studentId: string, rewardId: string) => {
        const reward = rewardsCatalog.find(r => r.id === rewardId);
        if (!reward) {
            alert('Error - Reward not found.');
            return;
        }
        const cost = reward.cost;
        const currentBalance = ticketBalances[studentId] || 0;
        const redeemedStudent = currentMockUsers[studentId];
        const redeemedStudentName = getUserDisplayName(redeemedStudent);


        if (currentBalance < cost) {
            alert(`Cannot Redeem - Student ${redeemedStudentName} needs ${cost - currentBalance} more tickets for ${reward.name}.`);
            return;
        }

        setTicketBalances(prevBalances => ({
            ...prevBalances,
            [studentId]: prevBalances[studentId] - cost,
        }));

        setTicketHistory(prevHistory => [
            {
                id: `tx-${Date.now()}-${Math.random().toString(36).substring(7)}`,
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
            id: `ann-redemption-${Date.now()}-${Math.random().toString(36).substring(7)}`,
            type: 'redemption_celebration',
            title: '🎉 Reward Redeemed! 🎉',
            message: `${redeemedStudentName} redeemed a ${reward.name}!`,
            date: new Date().toISOString(),
            relatedStudentId: studentId,
        };
        setAnnouncements(prev => [redemptionAnnouncement, ...prev]);
        alert(`Reward Redeemed - ${reward.name} redeemed for ${redeemedStudentName}! ${cost} tickets deducted. A public announcement was created.`);
  };

  const simulateAssignTask = (taskId: string, studentId: string) => {
    const taskDetails = taskLibrary.find(t => t.id === taskId);
    if (!taskDetails) {
      alert(`Error - Task Library item with ID "${taskId}" not found.`);
      return;
    }

    const student = currentMockUsers[studentId];
    const studentName = getUserDisplayName(student);

    const newAssignedTask: AssignedTask = {
      id: `assigned-${Date.now()}-${Math.random().toString(36).substring(7)}`,
      taskId: taskId,
      studentId: studentId,
      assignedById: currentUserId || 'admin-mock',
      assignedDate: new Date().toISOString(),
      isComplete: false,
      verificationStatus: undefined,
    };

    setAssignedTasks(prevTasks => [...prevTasks, newAssignedTask]);
    alert(`Task Assigned - ${taskDetails.title} assigned to ${studentName}.`);
  };

  const simulateReassignTask = (originalTaskId: string, studentId: string) => {
    const taskDetails = taskLibrary.find(t => t.id === originalTaskId);
    if (!taskDetails) {
      alert(`Error - Original Task ID "${originalTaskId}" not found in library.`);
      return;
    }

    const student = currentMockUsers[studentId];
    const studentName = getUserDisplayName(student);


    const newAssignedTask: AssignedTask = {
      id: `assigned-re-${Date.now()}-${Math.random().toString(36).substring(7)}`,
      taskId: originalTaskId,
      studentId: studentId,
      assignedById: currentUserId || 'admin-mock',
      assignedDate: new Date().toISOString(),
      isComplete: false,
      verificationStatus: undefined,
    };

    setAssignedTasks(prevTasks => [...prevTasks, newAssignedTask]);
    alert(`Task Re-assigned - ${taskDetails.title} re-assigned to ${studentName}.`);
  };


  const simulateCreateUser = (userData: Omit<User, 'id'>) => {
    const newId = `user-${Date.now()}-${Math.random().toString(36).substring(7)}`;
    const newUser: User = { ...userData, id: newId };
    setCurrentMockUsers(prev => ({ ...prev, [newId]: newUser }));
    alert(`Mock Create User SUCCESS: ${getUserDisplayName(newUser)} (${newId})`);
  };

  const simulateEditUser = (userId: string, userData: Partial<Omit<User, 'id'>>) => {
    setCurrentMockUsers(prev => {
        if (!prev[userId]) {
            console.error("User not found for edit:", userId);
            return prev;
        }
        return {
            ...prev,
            [userId]: { ...prev[userId], ...userData }
        };
    });

    const editedUser = { ...currentMockUsers[userId], ...userData } as User;
    alert(`Mock Edit User SUCCESS: ${getUserDisplayName(editedUser)} (${userId})`);
  };

  const simulateDeleteUser = (userId: string) => {
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

  };


  const simulateCreateAnnouncement = (announcementData: Omit<Announcement, 'id' | 'date'>) => {
    const newId = `ann-${Date.now()}-${Math.random().toString(36).substring(7)}`;
    const newAnnouncement: Announcement = {
      ...announcementData,
      id: newId,
      date: new Date().toISOString(),
      type: announcementData.type || 'announcement',
    };
    setAnnouncements(prev => [newAnnouncement, ...prev]);
    alert(`Mock Create Announcement SUCCESS: "${newAnnouncement.title}" (${newId})`);
  };

  const simulateEditAnnouncement = (
    announcementId: string,
    announcementData: Partial<Omit<Announcement, 'id' | 'date'>>
  ) => {
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
  };


  const simulateDeleteAnnouncement = (announcementId: string) => {
    const annToDelete = announcements.find(a => a.id === announcementId);
     if (!annToDelete) {
        alert(`Mock Delete Announcement FAILED: ID ${announcementId} not found.`);
        return;
     }
     const annTitle = annToDelete.title;
     setAnnouncements(prev => prev.filter(ann => ann.id !== announcementId));
     alert(`Mock Delete Announcement SUCCESS: "${annTitle}" (${announcementId})`);
  };



  const simulateCreateReward = (rewardData: Omit<RewardItem, 'id'>) => {
    const newId = `reward-${Date.now()}-${Math.random().toString(36).substring(7)}`;
    const newReward: RewardItem = { ...rewardData, id: newId };
    setRewardsCatalog(prev => [...prev, newReward].sort((a,b) => a.cost - b.cost));
    alert(`Mock Create Reward SUCCESS: ${newReward.name} (${newReward.cost} tickets)`);
  };

  const simulateEditReward = (rewardId: string, rewardData: Partial<Omit<RewardItem, 'id'>>) => {
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
  };

  const simulateDeleteReward = (rewardId: string) => {
      const rewardToDelete = rewardsCatalog.find(r => r.id === rewardId);
      if (!rewardToDelete) {
          alert(`Mock Delete Reward FAILED: ID ${rewardId} not found.`);
          return;
      }
      const rewardName = rewardToDelete.name;
      setRewardsCatalog(prev => prev.filter(reward => reward.id !== rewardId));
      alert(`Mock Delete Reward SUCCESS: "${rewardName}" (${rewardId})`);
  };


  const simulateCreateTaskLibraryItem = (taskData: Omit<TaskLibraryItem, 'id'>) => {
      const newId = `tasklib-${Date.now()}-${Math.random().toString(36).substring(7)}`;
      const newTask: TaskLibraryItem = { ...taskData, id: newId };
      setTaskLibrary(prev => [...prev, newTask].sort((a, b) => a.title.localeCompare(b.title)));
      alert(`Mock Create Task Lib SUCCESS: ${newTask.title} (${newTask.baseTickets} pts)`);
  };

  const simulateEditTaskLibraryItem = (taskId: string, taskData: Partial<Omit<TaskLibraryItem, 'id'>>) => {
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
  };

  const simulateDeleteTaskLibraryItem = (taskId: string) => {
      const taskToDelete = taskLibrary.find(t => t.id === taskId);
      if (!taskToDelete) {
          alert(`Mock Delete Task Lib FAILED: ID ${taskId} not found.`);
          return;
      }
      const taskTitle = taskToDelete.title;

      const isAssigned = assignedTasks.some(at => at.taskId === taskId);
      if (isAssigned) {

        const confirmDelete = confirm(`Warning: Task "${taskTitle}" is currently assigned to one or more students. Deleting it from the library might cause display issues for those assignments. Are you sure you want to delete it?`);
        if (!confirmDelete) {
            alert(`Mock Delete Task Lib CANCELED: "${taskTitle}" (${taskId})`);
            return;
        }
      }

      setTaskLibrary(prev => prev.filter(task => task.id !== taskId));
      alert(`Mock Delete Task Lib SUCCESS: "${taskTitle}" (${taskId})`);

  };

  const simulateDeleteAssignedTask = (assignmentId: string) => {
        const taskInfo = assignedTasks.find(t => t.id === assignmentId);
        setAssignedTasks(prev => prev.filter(t => t.id !== assignmentId));
        alert(`Mock Delete Assigned Task SUCCESS: Assignment ID ${assignmentId} (Task: ${taskInfo ? getTaskTitle(taskInfo.taskId, taskLibrary) : 'Unknown'})`);
    };


  const getMockStudentData = (studentId: string): StudentViewProps | undefined => {
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
      mockInstruments: mockInstruments,
      onMarkTaskComplete: simulateMarkTaskComplete,
    };
  };


  const renderMainView = () => {
    const usersFromState = Object.values(currentMockUsers);

    switch (currentUserRole) {
      case 'public':
        return <PublicView rewardsCatalog={rewardsCatalog} announcements={announcements} />;
      case 'student':
        if (!currentUserId) return <Text>Error: Student ID not set.</Text>;
        const studentData = getMockStudentData(currentUserId);
        if (!studentData) return <Text>Error: Mock data not found for student.</Text>;
        return <StudentView {...studentData} />;
      case 'teacher':
         if (!currentUserId) return <Text>Error: Teacher ID not set.</Text>;
         const teacherUser = currentMockUsers[currentUserId];
         if (!teacherUser) return <Text>Error: Teacher user data not found.</Text>;
         const allStudentUsers = usersFromState.filter(u => u.role === 'student');
         const teacherMockData = {
             user: teacherUser,
             allStudents: allStudentUsers.map(student => ({ id: student.id, name: getUserDisplayName(student), instrumentIds: student.instrumentIds, balance: ticketBalances[student.id] || 0 })),
             studentsLinkedToTeacher: allStudentUsers.filter(u => u.linkedTeacherIds?.includes(teacherUser.id)).map(student => ({ id: student.id, name: getUserDisplayName(student), instrumentIds: student.instrumentIds, balance: ticketBalances[student.id] || 0 })),
             pendingVerifications: assignedTasks.filter(task => task.isComplete && task.verificationStatus === 'pending' && allStudentUsers.some(student => student.id === task.studentId && student.linkedTeacherIds?.includes(teacherUser.id))),
             taskLibrary: taskLibrary,
             allAssignedTasks: assignedTasks,
             rewardsCatalog: rewardsCatalog,
             mockInstruments: mockInstruments,
             onVerifyTask: simulateVerifyTask,
             onAssignTask: simulateAssignTask,
             onReassignTaskMock: simulateReassignTask,
             onInitiateVerificationModal: handleInitiateVerificationModal,
             getStudentData: getMockStudentData,
         };
         return <TeacherView {...teacherMockData} />;
      case 'parent':
         if (!currentUserId) return <Text>Error: Parent ID not set.</Text>;
         const parentUser = currentMockUsers[currentUserId];
         if (!parentUser) return <Text>Error: Parent user data not found.</Text>;
         const linkedStudents = usersFromState.filter(u => parentUser.linkedStudentIds?.includes(u.id) && u.role === 'student');
         const parentMockData = {
             user: parentUser,
             linkedStudents: linkedStudents.map(student => ({ id: student.id, name: getUserDisplayName(student), instrumentIds: student.instrumentIds, balance: ticketBalances[student.id] || 0 })),
             currentViewingStudentId: currentViewingStudentId,
             currentViewingStudentData: currentViewingStudentId ? getMockStudentData(currentViewingStudentId) : undefined,
             setViewingStudentId: (studentId: string) => setMockAuthState(prev => (prev ? { ...prev, viewingStudentId: studentId } : null)),
             onMarkTaskComplete: simulateMarkTaskComplete,
             mockInstruments: mockInstruments,

         };
         return <ParentView {...parentMockData} />;

      case 'admin':
        if (!currentUserId) return <Text>Error: Admin ID not set.</Text>;
        const adminUser = currentMockUsers[currentUserId];
        if (!adminUser) return <Text>Error: Admin user data not found.</Text>;
        const allStudentUsersAdmin = usersFromState.filter(u => u.role === 'student');
        const allTeachers = usersFromState.filter(u => u.role === 'teacher');
        const allParents = usersFromState.filter(u => u.role === 'parent');

        const adminMockData = {
          user: adminUser,
          allUsers: usersFromState,
          allStudents: allStudentUsersAdmin.map(student => ({ id: student.id, name: getUserDisplayName(student), instrumentIds: student.instrumentIds, balance: ticketBalances[student.id] || 0 })),
          allTeachers: allTeachers.map(t => ({ id: t.id, name: getUserDisplayName(t), role: t.role })),
          allParents: allParents.map(p => ({ id: p.id, name: getUserDisplayName(p), role: p.role })),
          allAssignedTasks: assignedTasks,
          taskLibrary: taskLibrary,
          rewardsCatalog: rewardsCatalog,
          allTicketHistory: ticketHistory,
          announcements: announcements,
          mockInstruments: mockInstruments,
          onManualTicketAdjust: simulateManualTicketAdjustment,
          onRedeemReward: simulateRedeemReward,
          onVerifyTask: simulateVerifyTask,
          onAssignTask: simulateAssignTask,
          onReassignTaskMock: simulateReassignTask,
          onInitiateVerificationModal: handleInitiateVerificationModal,
          onCreateUser: simulateCreateUser,
          onEditUser: simulateEditUser,
          onDeleteUser: simulateDeleteUser,
          onCreateAnnouncement: simulateCreateAnnouncement,
          onEditAnnouncement: simulateEditAnnouncement,
          onDeleteAnnouncement: simulateDeleteAnnouncement,
          onCreateTaskLibraryItem: simulateCreateTaskLibraryItem,
          onEditTaskLibraryItem: simulateEditTaskLibraryItem,
          onDeleteTaskLibraryItem: simulateDeleteTaskLibraryItem,
          onCreateReward: simulateCreateReward,
          onEditReward: simulateEditReward,
          onDeleteReward: simulateDeleteReward,
          onCreateInstrument: (instrumentData: any) => alert(`Mock Create Instrument: ${JSON.stringify(instrumentData)}`),
          onEditInstrument: (instrumentId: string, instrumentData: any) => alert(`Mock Edit Instrument: ${instrumentId}: ${JSON.stringify(instrumentData)}`),
          onDeleteInstrument: (instrumentId: string) => alert(`Mock Delete Instrument: ${instrumentId}`),
          getStudentData: getMockStudentData,
          onDeleteAssignment: simulateDeleteAssignedTask, // Pass down delete assignment mock
        };
        return <AdminView {...adminMockData} />;

      default:
        return <Text>Loading or Authentication Required.</Text>;
    }
  };


  return (
    <SafeAreaProvider>
      <View style={styles.container}>
        <StatusBar style="auto" />
        {__DEV__ && !mockAuthState ? (
          <DevelopmentViewSelector onSelectView={setMockAuthState} />
        ) : (
          renderMainView()
        )}
        <TaskVerificationModal visible={isVerificationModalVisible} task={taskToVerify} taskLibrary={taskLibrary} allUsers={Object.values(currentMockUsers)} onClose={handleCloseVerificationModal} onVerifyTask={simulateVerifyTask} onReassignTaskMock={simulateReassignTask} />
        {__DEV__ && mockAuthState && (
          <View style={styles.resetButtonContainer}>
            <Button title="Reset Mock View" onPress={() => setMockAuthState(null)} />
          </View>
        )}
      </View>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.backgroundPrimary },
    selectorContainer: { flex: 1, padding: 20, justifyContent: 'center', gap: 10, backgroundColor: colors.backgroundPrimary },
    selectorTitle: { fontSize: 18, marginBottom: 20, textAlign: 'center', fontWeight: 'bold', color: colors.textPrimary },
    resetButtonContainer: { position: 'absolute', bottom: 20, left: 20, right: 20 },
});