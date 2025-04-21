// src/views/AdminView.tsx
import React, { useState, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  Button,
  FlatList,
  Platform,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { User, UserRole } from '../types/userTypes';
import { AssignedTask, TaskVerificationStatus } from '../mocks/mockAssignedTasks';
import { TaskLibraryItem } from '../mocks/mockTaskLibrary';
import { RewardItem } from '../mocks/mockRewards';
import { TicketTransaction } from '../mocks/mockTickets';
import { Announcement } from '../mocks/mockAnnouncements';
import { Instrument } from '../mocks/mockInstruments';
import { getTaskTitle, getInstrumentNames, getUserDisplayName } from '../utils/helpers';
import { StudentViewProps, TicketHistoryItem } from './StudentView';
import { AdminDashboardSection } from '../components/admin/AdminDashboardSection';
import { AdminUsersSection } from '../components/admin/AdminUsersSection';
import { AdminTasksSection } from '../components/admin/AdminTasksSection';
import { AdminRewardsSection } from '../components/admin/AdminRewardsSection';
import { AdminHistorySection } from '../components/admin/AdminHistorySection';
import { AdminAnnouncementsSection } from '../components/admin/AdminAnnouncementsSection';
import { AdminInstrumentsSection } from '../components/admin/AdminInstrumentsSection';
import { AdminStudentDetailView } from '../components/admin/AdminStudentDetailView';
import TaskVerificationModal from '../components/TaskVerificationModal';
import { adminSharedStyles } from '../components/admin/adminSharedStyles';
import { appSharedStyles } from '../styles/appSharedStyles';
import { colors } from '../styles/colors';


export interface SimplifiedStudent { id: string; name: string; instrumentIds?: string[]; balance: number; }
export interface SimplifiedUser { id: string; name: string; role: UserRole; }
type AdminSection = | 'dashboard' | 'dashboard-pending-verification' | 'users' | 'tasks' | 'rewards' | 'history' | 'announcements' | 'instruments';


interface AdminViewProps {
    user: User;
    allUsers: User[];
    allStudents: SimplifiedStudent[];
    allTeachers: SimplifiedUser[];
    allParents: SimplifiedUser[];
    allAssignedTasks: AssignedTask[];
    taskLibrary: TaskLibraryItem[];
    rewardsCatalog: RewardItem[];
    allTicketHistory: TicketTransaction[];
    announcements: Announcement[];
    mockInstruments: Instrument[];
    onManualTicketAdjust: (studentId: string, amount: number, notes: string) => void;
    onRedeemReward: (studentId: string, rewardId: string) => void;
    onVerifyTask: (taskId: string, status: TaskVerificationStatus, points: number) => void;
    onAssignTask: (taskId: string, studentId: string) => void;
    onReassignTaskMock: (originalTaskId: string, studentId: string) => void;
    onCreateUser: (userData: Omit<User, 'id'>) => void;
    onEditUser: (userId: string, userData: Partial<Omit<User, 'id'>>) => void;
    onDeleteUser: (userId: string) => void;
    onCreateTaskLibraryItem: (taskData: Omit<TaskLibraryItem, 'id'>) => void;
    onEditTaskLibraryItem: (taskId: string, taskData: Partial<Omit<TaskLibraryItem, 'id'>>) => void;
    onDeleteTaskLibraryItem: (taskId: string) => void;
    onCreateReward: (rewardData: Omit<RewardItem, 'id'>) => void;
    onEditReward: (rewardId: string, rewardData: Partial<Omit<RewardItem, 'id'>>) => void;
    onDeleteReward: (rewardId: string) => void;
    onCreateAnnouncement: (announcementData: any) => void;
    onEditAnnouncement: (announcementId: string, announcementData: any) => void;
    onDeleteAnnouncement: (announcementId: string) => void;
    onCreateInstrument: (instrumentData: any) => void;
    onEditInstrument: (instrumentId: string, instrumentData: any) => void;
    onDeleteInstrument: (instrumentId: string) => void;
    getStudentData: (studentId: string) => StudentViewProps | undefined;
    onInitiateVerificationModal?: (task: AssignedTask) => void;
    onDeleteAssignment?: (taskId: string) => void;
 }


const adminPendingListStyles = StyleSheet.create({
    pendingItem:{ backgroundColor:colors.backgroundPrimary, padding:12, marginBottom:10, borderRadius:8, borderWidth:1, borderColor:colors.borderWarning }, pendingTitle:{ fontSize:16, fontWeight:'bold', marginBottom:5, color:colors.textPrimary }, pendingDetail:{ fontSize:14, color:colors.textSecondary, marginBottom:3 },
 });


export const AdminView: React.FC<AdminViewProps> = ({
  user, allUsers, allStudents, allTeachers, allParents, allAssignedTasks,
  taskLibrary, rewardsCatalog, allTicketHistory, announcements, mockInstruments,
  onManualTicketAdjust, onRedeemReward, onVerifyTask, onAssignTask, onReassignTaskMock,
  onCreateUser, onEditUser, onDeleteUser, onCreateTaskLibraryItem, onEditTaskLibraryItem,
  onDeleteTaskLibraryItem, onCreateReward, onEditReward, onDeleteReward,
  onCreateAnnouncement, onEditAnnouncement, onDeleteAnnouncement, onCreateInstrument,
  onEditInstrument, onDeleteInstrument, getStudentData,
  onInitiateVerificationModal,
  onDeleteAssignment,
}) => {

  const [viewingSection, setViewingSection] = useState<AdminSection>('dashboard');
  const [viewingStudentId, setViewingStudentId] = useState<string | null>(null);
  const [isVerificationModalVisible, setIsVerificationModalVisible] = useState(false);
  const [taskToVerify, setTaskToVerify] = useState<AssignedTask | null>(null);
  const [isCreateUserModalVisible, setIsCreateUserModalVisible] = useState(false);



  const viewingStudentData = useMemo(() => {
    return viewingStudentId ? getStudentData(viewingStudentId) : null;
  }, [viewingStudentId, getStudentData]);

  const pendingVerifications = useMemo(() => allAssignedTasks.filter(
    task => task.isComplete && task.verificationStatus === 'pending'
  ), [allAssignedTasks]);




  const handleViewManageUser = (userId: string, role: UserRole) => {

    if (role === 'student') {
      setViewingStudentId(userId);
    } else if (role === 'teacher' || role === 'admin') {
      const selectedUser = allUsers.find(u => u.id === userId);
      alert(`Viewing/Managing (Mock): ${selectedUser ? getUserDisplayName(selectedUser) : userId}`);
    } else if (role === 'parent') {
       const selectedUser = allUsers.find(u => u.id === userId);
       alert(`Viewing Parent (Read-Only Mock): ${selectedUser ? getUserDisplayName(selectedUser) : userId}`);
    }
  };


  const handleBackFromStudentDetail = () => {

    setViewingStudentId(null);
    setViewingSection('users');
  };

  const handleInternalInitiateVerificationModal = (task: AssignedTask) => {
      if (onInitiateVerificationModal) {
          onInitiateVerificationModal(task);
      } else {
          setTaskToVerify(task);
          setIsVerificationModalVisible(true);
      }
   };

  const handleCloseVerificationModal = () => {
       setIsVerificationModalVisible(false);
       setTaskToVerify(null);
   };
  const handleCreateUser = (newUserData: Omit<User, 'id'>) => { onCreateUser(newUserData); setIsCreateUserModalVisible(false); };




  if (viewingStudentId && viewingStudentData) {

    return (
      <AdminStudentDetailView
        studentData={viewingStudentData}
        taskLibrary={taskLibrary}
        mockInstruments={mockInstruments}
        allUsers={allUsers}
        adminUserName={getUserDisplayName(user)}
        onManualTicketAdjust={onManualTicketAdjust}
        onRedeemReward={onRedeemReward}
        onAssignTask={onAssignTask}
        onEditUser={onEditUser}
        onDeleteUser={onDeleteUser}
        onBack={handleBackFromStudentDetail}
      />
    );
  }



  return (
    <SafeAreaView style={appSharedStyles.safeArea}>

       <View style={appSharedStyles.headerContainer}>
         {(viewingSection !== 'dashboard') && ( <Button title="← Back" onPress={() => setViewingSection('dashboard')} /> )}
         <Text style={appSharedStyles.header} numberOfLines={1} ellipsizeMode="tail"> Admin: {getUserDisplayName(user)} </Text>
         <View style={{ width: (viewingSection !== 'dashboard') ? 50 : 0 }} />
       </View>


      <ScrollView style={appSharedStyles.container}>

        {viewingSection !== 'dashboard-pending-verification' && (
          <View style={adminSharedStyles.adminNav}>
            <Button title="Dashboard" onPress={() => setViewingSection('dashboard')} color={viewingSection === 'dashboard' ? colors.primary : colors.secondary} />
            <Button title="Users" onPress={() => setViewingSection('users')} color={viewingSection === 'users' ? colors.primary : colors.secondary} />
            <Button title="Tasks" onPress={() => setViewingSection('tasks')} color={viewingSection === 'tasks' ? colors.primary : colors.secondary} />
            <Button title="Rewards" onPress={() => setViewingSection('rewards')} color={viewingSection === 'rewards' ? colors.primary : colors.secondary} />
            <Button title="History" onPress={() => setViewingSection('history')} color={viewingSection === 'history' ? colors.primary : colors.secondary} />
            <Button title="Announcements" onPress={() => setViewingSection('announcements')} color={viewingSection === 'announcements' ? colors.primary : colors.secondary} />
            <Button title="Instruments" onPress={() => setViewingSection('instruments')} color={viewingSection === 'instruments' ? colors.primary : colors.secondary} />
          </View>
        )}


        {viewingSection === 'dashboard' && (
          <AdminDashboardSection
            allStudents={allStudents}
            allTeachers={allTeachers}
            allParents={allParents}
            allAssignedTasks={allAssignedTasks}
            onViewPendingVerifications={() => setViewingSection('dashboard-pending-verification')}
          />
        )}
        {viewingSection === 'dashboard-pending-verification' && (
             <View>
               <Text style={appSharedStyles.sectionTitle}>Pending Verifications ({pendingVerifications.length})</Text>
               {pendingVerifications.length > 0 ? (
                 <FlatList
                   data={pendingVerifications.sort((a, b) => new Date(a.completedDate || a.assignedDate).getTime() - new Date(b.completedDate || b.assignedDate).getTime())}
                   keyExtractor={item => item.id}
                   renderItem={({ item }) => {
                     const student = allUsers.find(s => s.id === item.studentId && s.role === 'student');
                     const taskDetail = taskLibrary.find(t => t.id === item.taskId);
                     const baseTickets = taskDetail?.baseTickets ?? 0;
                     const completedDateTime = item.completedDate ? new Date(item.completedDate).toLocaleString() : 'N/A';
                     return (
                       <View style={adminPendingListStyles.pendingItem}>
                         <Text style={adminPendingListStyles.pendingTitle}>Task: {getTaskTitle(item.taskId, taskLibrary)}</Text>
                         <Text style={adminPendingListStyles.pendingDetail}>Student: {student ? getUserDisplayName(student) : 'Unknown Student'}</Text>
                         <Text style={adminPendingListStyles.pendingDetail}>Potential Tickets: {baseTickets}</Text>
                         <Text style={adminPendingListStyles.pendingDetail}>Completed: {completedDateTime}</Text>
                         <View style={{ marginTop: 10 }}><Button title="Verify Task" onPress={() => handleInternalInitiateVerificationModal(item)} /></View>
                       </View>
                     );
                   }}
                   scrollEnabled={false}
                   ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
                   ListEmptyComponent={() => (<Text style={appSharedStyles.emptyListText}>No tasks pending verification.</Text>)}
                 />
               ) : (<Text style={appSharedStyles.emptyListText}>No tasks pending verification.</Text>)}
             </View>
        )}
        {viewingSection === 'users' && (
          <AdminUsersSection
            allStudents={allStudents}
            allTeachers={allTeachers}
            allParents={allParents}
            mockInstruments={mockInstruments}
            onCreateUser={handleCreateUser}
            onViewManageUser={handleViewManageUser}
            onAssignTask={onAssignTask}
            taskLibrary={taskLibrary}
            isCreateUserModalVisible={isCreateUserModalVisible}
            setIsCreateUserModalVisible={setIsCreateUserModalVisible}
            allUsers={allUsers}
          />
        )}
        {viewingSection === 'tasks' && (
          <AdminTasksSection
            taskLibrary={taskLibrary}
            allStudents={allStudents}
            allUsers={allUsers}
            allAssignedTasks={allAssignedTasks}
            onCreateTaskLibraryItem={onCreateTaskLibraryItem}
            onEditTaskLibraryItem={onEditTaskLibraryItem}
            onDeleteTaskLibraryItem={onDeleteTaskLibraryItem}
            onAssignTask={onAssignTask}
            onInitiateVerification={handleInternalInitiateVerificationModal}
            onDeleteAssignment={onDeleteAssignment}
          />
        )}
        {viewingSection === 'rewards' && (
          <AdminRewardsSection
            rewardsCatalog={rewardsCatalog}
            onCreateReward={onCreateReward}
            onEditReward={onEditReward}
            onDeleteReward={onDeleteReward}
          />
        )}
        {viewingSection === 'history' && (
          <AdminHistorySection allTicketHistory={allTicketHistory} />
        )}
        {viewingSection === 'announcements' && (
          <AdminAnnouncementsSection
            announcements={announcements}
            onCreateAnnouncement={onCreateAnnouncement}
            onEditAnnouncement={onEditAnnouncement}
            onDeleteAnnouncement={onDeleteAnnouncement}
          />
        )}
        {viewingSection === 'instruments' && (
          <AdminInstrumentsSection
            mockInstruments={mockInstruments}
            onCreateInstrument={onCreateInstrument}
            onEditInstrument={onEditInstrument}
            onDeleteInstrument={onDeleteInstrument}
          />
        )}
      </ScrollView>


       <TaskVerificationModal visible={isVerificationModalVisible} task={taskToVerify} taskLibrary={taskLibrary} allUsers={allUsers} onClose={handleCloseVerificationModal} onVerifyTask={onVerifyTask} onReassignTaskMock={onReassignTaskMock} />


    </SafeAreaView>
  );
};