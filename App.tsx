import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View, Button, Alert } from 'react-native';
import React, { useState, useEffect } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { mockUsers, UserRole, User } from './src/mocks/mockUsers';
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
import { mockRewardsCatalog, RewardItem } from './src/mocks/mockRewards';
import { mockAnnouncements, Announcement } from './src/mocks/mockAnnouncements';
import { mockTaskLibrary, TaskLibraryItem } from './src/mocks/mockTaskLibrary';
import { mockInstruments, Instrument } from './src/mocks/mockInstruments';

import { getTaskTitle, getInstrumentNames } from './src/utils/helpers';

import { PublicView } from './src/views/PublicView';
import { PupilView, PupilViewProps } from './src/views/PupilView';
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
          title={`Login as ${user.name} (${user.role})`}
          onPress={() => {
            let viewingStudentId: string | undefined;
            if (user.role === 'pupil') {
              viewingStudentId = user.id;
            } else if (
              user.role === 'parent' &&
              user.linkedStudentIds &&
              user.linkedStudentIds.length > 0
            ) {
              viewingStudentId = user.linkedStudentIds[0];
            } else if (
              user.role === 'teacher' &&
              user.linkedStudentIds &&
              user.linkedStudentIds.length > 0
            ) {
              viewingStudentId = user.linkedStudentIds[0];
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
                  : colors.gold
          }
        />
      ))}
    </View>
  );
};

export default function App() {
  const [mockAuthState, setMockAuthState] = useState<MockAuthState | null>(null);

  const [assignedTasks, setAssignedTasks] = useState<AssignedTask[]>([]);
  const [ticketBalances, setTicketBalances] = useState<Record<string, number>>({});
  const [ticketHistory, setTicketHistory] = useState<TicketTransaction[]>([]);

  const [isVerificationModalVisible, setIsVerificationModalVisible] = useState(false);
  const [taskToVerify, setTaskToVerify] = useState<AssignedTask | null>(null);


  useEffect(() => {
    setAssignedTasks(initialMockAllAssignedTasks);
    setTicketBalances(initialMockTicketBalances);
    setTicketHistory(initialMockTicketHistory);
  }, []);

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
    Alert.alert('Task Marked Complete', 'Waiting for teacher verification!');
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
        Alert.alert("Verification Failed", "Task not found or not pending.");
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
            notes: `Task: ${getTaskTitle(taskToVerify.taskId, mockTaskLibrary)} (${status})`,
          };
          return [
            newTaskAwardTx,
            ...prevHistory,
          ];
        });

         Alert.alert("Task Verified", `Status: ${status}, Awarded: ${actualTickets} tickets`);

      } else {
         Alert.alert("Task Marked Incomplete", `No tickets awarded for task ${taskId}.`);
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
    const studentName = mockUsers[studentId]?.name || studentId;
    Alert.alert('Balance Adjusted', `Adjusted ${amount} tickets for student ${studentName}.`);
  };

  const simulateRedeemReward = (studentId: string, rewardId: string) => {
    const reward = mockRewardsCatalog.find(r => r.id === rewardId);
    if (!reward) {
      Alert.alert('Error', 'Reward not found.');
      return;
    }
    const cost = reward.cost;
    const currentBalance = ticketBalances[studentId] || 0;
    const redeemedStudentName = mockUsers[studentId]?.name || studentId;


    if (currentBalance < cost) {
      Alert.alert(
        'Cannot Redeem',
        `Student ${redeemedStudentName} needs ${cost - currentBalance} more tickets for ${reward.name}.`
      );
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
    Alert.alert(
      'Reward Redeemed',
      `${reward.name} redeemed for ${redeemedStudentName}! ${cost} tickets deducted. A public announcement is simulated.`
    );
  };

  const simulateAssignTask = (taskId: string, studentId: string) => {
    const taskDetails = mockTaskLibrary.find(t => t.id === taskId);
    if (!taskDetails) {
      Alert.alert('Error', `Task Library item with ID "${taskId}" not found.`);
      return;
    }
    const studentName = mockUsers[studentId]?.name || studentId;

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
    Alert.alert(
      'Task Assigned',
      `${taskDetails.title} assigned to ${studentName}.`
    );
  };

  const simulateReassignTask = (originalTaskId: string, studentId: string) => {
    const taskDetails = mockTaskLibrary.find(t => t.id === originalTaskId);
    if (!taskDetails) {
      Alert.alert('Error', `Original Task ID "${originalTaskId}" not found in library.`);
      return;
    }
    const studentName = mockUsers[studentId]?.name || studentId;


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
    Alert.alert(
      'Task Re-assigned',
      `${taskDetails.title} re-assigned to ${studentName}.`
    );
  };

  const getMockStudentData = (studentId: string): PupilViewProps | undefined => {
    const studentUser = mockUsers[studentId];
    if (!studentUser || studentUser.role !== 'pupil') return undefined;

    return {
      user: studentUser,
      balance: ticketBalances[studentId] || 0,
      assignedTasks: assignedTasks.filter(task => task.studentId === studentId),
      history: ticketHistory
        .filter(tx => tx.studentId === studentId)
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()),
      rewardsCatalog: mockRewardsCatalog,
      announcements: mockAnnouncements,
      taskLibrary: mockTaskLibrary,
      mockInstruments: mockInstruments,
      onMarkTaskComplete: simulateMarkTaskComplete,
    };
  };

  const renderMainView = () => {
    switch (currentUserRole) {
      case 'public':
        return <PublicView rewardsCatalog={mockRewardsCatalog} announcements={mockAnnouncements} />;

      case 'pupil':
        if (!currentUserId) return <Text>Error: Pupil ID not set in mock state.</Text>;
        const pupilData = getMockStudentData(currentUserId);
        if (!pupilData)
          return <Text>Error: Mock data not found for pupil ID: {currentUserId}</Text>;
        return <PupilView {...pupilData} />;

      case 'teacher':
        if (!currentUserId) return <Text>Error: Teacher ID not set in mock state.</Text>;
        const teacherUser = mockUsers[currentUserId];

        const allPupilUsers = Object.values(mockUsers).filter(u => u.role === 'pupil');

        const teacherMockData = {
          user: teacherUser,
          allStudents: allPupilUsers.map(student => ({
            id: student.id,
            name: student.name,
            instrumentIds: student.instrumentIds,
            balance: ticketBalances[student.id] || 0,
          })),
          studentsLinkedToTeacher: allPupilUsers
            .filter(u => teacherUser.linkedStudentIds?.includes(u.id))
            .map(student => ({
              id: student.id,
              name: student.name,
              instrumentIds: student.instrumentIds,
              balance: ticketBalances[student.id] || 0,
            })),
          pendingVerifications: assignedTasks.filter(
            task => task.isComplete && task.verificationStatus === 'pending'
          ),
          taskLibrary: mockTaskLibrary,
          allAssignedTasks: assignedTasks,
          rewardsCatalog: mockRewardsCatalog,
          mockInstruments: mockInstruments,
          onVerifyTask: simulateVerifyTask,
          onAssignTask: simulateAssignTask,
          onReassignTaskMock: simulateReassignTask,
          onInitiateVerificationModal: handleInitiateVerificationModal,
          getStudentData: getMockStudentData,
        };
        return <TeacherView {...teacherMockData} />;

      case 'parent':
        if (!currentUserId) return <Text>Error: Parent ID not set in mock state.</Text>;
        const parentUser = mockUsers[currentUserId];
        const linkedStudents = Object.values(mockUsers).filter(
          u => parentUser.linkedStudentIds?.includes(u.id) && u.role === 'pupil'
        );

        const parentMockData = {
          user: parentUser,
          linkedStudents: linkedStudents.map(student => ({
            id: student.id,
            name: student.name,
            instrumentIds: student.instrumentIds,
            balance: ticketBalances[student.id] || 0,
          })),
          currentViewingStudentId: currentViewingStudentId,
          currentViewingStudentData: currentViewingStudentId
            ? getMockStudentData(currentViewingStudentId)
            : undefined,
          setViewingStudentId: (studentId: string) =>
            setMockAuthState(prev => (prev ? { ...prev, viewingStudentId: studentId } : null)),
          onMarkTaskComplete: simulateMarkTaskComplete,
          mockInstruments: mockInstruments,
        };
        return <ParentView {...parentMockData} />;

      case 'admin':
        if (!currentUserId) return <Text>Error: Admin ID not set in mock state.</Text>;
        const adminUser = mockUsers[currentUserId];
        const allPupilUsersAdmin = Object.values(mockUsers).filter(u => u.role === 'pupil');
        const allTeachers = Object.values(mockUsers).filter(u => u.role === 'teacher');
        const allParents = Object.values(mockUsers).filter(u => u.role === 'parent');

        const adminMockData = {
          user: adminUser,
          allUsers: Object.values(mockUsers),
          allPupils: allPupilUsersAdmin.map(student => ({
            id: student.id,
            name: student.name,
            instrumentIds: student.instrumentIds,
            balance: ticketBalances[student.id] || 0,
          })),
          allTeachers: allTeachers,
          allParents: allParents,
          allAssignedTasks: assignedTasks,
          taskLibrary: mockTaskLibrary,
          rewardsCatalog: mockRewardsCatalog,
          allTicketHistory: ticketHistory,
          announcements: mockAnnouncements,
          mockInstruments: mockInstruments,

          onManualTicketAdjust: simulateManualTicketAdjustment,
          onRedeemReward: simulateRedeemReward,
          onVerifyTask: simulateVerifyTask,
          onAssignTask: simulateAssignTask,
          onReassignTaskMock: simulateReassignTask,
          onInitiateVerificationModal: handleInitiateVerificationModal,

          onCreateUser: (userData: any) =>
            Alert.alert('Mock Create User', JSON.stringify(userData)),
          onEditUser: (userId: string, userData: any) =>
            Alert.alert('Mock Edit User', `${userId}: ${JSON.stringify(userData)}`),
          onDeleteUser: (userId: string) => Alert.alert('Mock Delete User', userId),
          onCreateTaskLibraryItem: (taskData: any) =>
            Alert.alert('Mock Create Task Lib', JSON.stringify(taskData)),
          onEditTaskLibraryItem: (taskId: string, taskData: any) =>
            Alert.alert('Mock Edit Task Lib', `${taskId}: ${JSON.stringify(taskData)}`),
          onDeleteTaskLibraryItem: (taskId: string) => Alert.alert('Mock Delete Task Lib', taskId),
          onCreateReward: (rewardData: any) =>
            Alert.alert('Mock Create Reward', JSON.stringify(rewardData)),
          onEditReward: (rewardId: string, rewardData: any) =>
            Alert.alert('Mock Edit Reward', `${rewardId}: ${JSON.stringify(rewardData)}`),
          onDeleteReward: (rewardId: string) => Alert.alert('Mock Delete Reward', rewardId),
          onCreateAnnouncement: (announcementData: any) =>
            Alert.alert('Mock Create Announcement', JSON.stringify(announcementData)),
          onEditAnnouncement: (announcementId: string, announcementData: any) =>
            Alert.alert(
              'Mock Edit Announcement',
              `${announcementId}: ${JSON.stringify(announcementData)}`
            ),
          onDeleteAnnouncement: (announcementId: string) =>
            Alert.alert('Mock Delete Announcement', announcementId),
          onCreateInstrument: (instrumentData: any) =>
            Alert.alert('Mock Create Instrument', JSON.stringify(instrumentData)),
          onEditInstrument: (instrumentId: string, instrumentData: any) =>
            Alert.alert(
              'Mock Edit Instrument',
              `${instrumentId}: ${JSON.stringify(instrumentData)}`
            ),
          onDeleteInstrument: (instrumentId: string) =>
            Alert.alert('Mock Delete Instrument', instrumentId),
          getStudentData: getMockStudentData,
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

        <TaskVerificationModal
           visible={isVerificationModalVisible}
           task={taskToVerify}
           taskLibrary={mockTaskLibrary}
           allUsers={Object.values(mockUsers)}
           onClose={handleCloseVerificationModal}
           onVerifyTask={simulateVerifyTask}
           onReassignTaskMock={simulateReassignTask}
         />


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
  container: {
    flex: 1,
    backgroundColor: colors.backgroundPrimary,
  },
  selectorContainer: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
    gap: 10,
    backgroundColor: colors.backgroundPrimary,
  },
  selectorTitle: {
    fontSize: 18,
    marginBottom: 20,
    textAlign: 'center',
    fontWeight: 'bold',
    color: colors.textPrimary,
  },
  resetButtonContainer: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
  },
});