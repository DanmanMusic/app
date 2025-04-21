import React, { useState, useMemo } from 'react';
import { View, Text, ScrollView, Button, FlatList, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../contexts/AuthContext';
import { useData } from '../contexts/DataContext';
import { User, UserRole } from '../types/userTypes';
import { AssignedTask } from '../mocks/mockAssignedTasks';
import { getTaskTitle, getUserDisplayName } from '../utils/helpers';
import { AdminDashboardSection } from '../components/admin/AdminDashboardSection';
import { AdminUsersSection } from '../components/admin/AdminUsersSection';
import { AdminTasksSection } from '../components/admin/AdminTasksSection';
import { AdminRewardsSection } from '../components/admin/AdminRewardsSection';
import { AdminHistorySection } from '../components/admin/AdminHistorySection';
import { AdminAnnouncementsSection } from '../components/admin/AdminAnnouncementsSection';
import { AdminInstrumentsSection } from '../components/admin/AdminInstrumentsSection';
import { AdminStudentDetailView } from '../components/admin/AdminStudentDetailView';
import { adminSharedStyles } from '../components/admin/adminSharedStyles';
import { appSharedStyles } from '../styles/appSharedStyles';
import { colors } from '../styles/colors';
import { SimplifiedStudent } from '../types/dataTypes';

export interface SimplifiedUser {
  id: string;
  name: string;
  role: UserRole;
}

type AdminSection =
  | 'dashboard'
  | 'dashboard-pending-verification'
  | 'users'
  | 'tasks'
  | 'rewards'
  | 'history'
  | 'announcements'
  | 'instruments';

interface AdminViewProps {
  onInitiateVerificationModal?: (task: AssignedTask) => void;
}

const adminPendingListStyles = StyleSheet.create({
  pendingItem: {
    backgroundColor: colors.backgroundPrimary,
    padding: 12,
    marginBottom: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.borderWarning,
  },
  pendingTitle: { fontSize: 16, fontWeight: 'bold', marginBottom: 5, color: colors.textPrimary },
  pendingDetail: { fontSize: 14, color: colors.textSecondary, marginBottom: 3 },
});

export const AdminView: React.FC<AdminViewProps> = ({ onInitiateVerificationModal }) => {
  const { currentUserId } = useAuth();
  const {
    currentMockUsers,
    assignedTasks,
    ticketBalances,
    taskLibrary,
    rewardsCatalog,
    ticketHistory,
    announcements,
    mockInstruments,
    simulateManualTicketAdjustment,
    simulateRedeemReward,
    simulateAssignTask,
    simulateCreateUser,
    simulateEditUser,
    simulateDeleteUser,
    simulateCreateTaskLibraryItem,
    simulateEditTaskLibraryItem,
    simulateDeleteTaskLibraryItem,
    simulateCreateReward,
    simulateEditReward,
    simulateDeleteReward,
    simulateCreateAnnouncement,
    simulateEditAnnouncement,
    simulateDeleteAnnouncement,
    simulateCreateInstrument,
    simulateEditInstrument,
    simulateDeleteInstrument,
    getMockStudentData,
    simulateDeleteAssignedTask,
  } = useData();

  const [viewingSection, setViewingSection] = useState<AdminSection>('dashboard');
  const [viewingStudentId, setViewingStudentId] = useState<string | null>(null);
  const [isCreateUserModalVisible, setIsCreateUserModalVisible] = useState(false);
  const adminUser = currentUserId ? currentMockUsers[currentUserId] : null;
  const allUsers = useMemo(() => Object.values(currentMockUsers), [currentMockUsers]);
  const allStudents: SimplifiedStudent[] = useMemo(
    () =>
      allUsers
        .filter(u => u.role === 'student')
        .map(student => ({
          id: student.id,
          name: getUserDisplayName(student),
          instrumentIds: student.instrumentIds,
          balance: ticketBalances[student.id] || 0,
        })),
    [allUsers, ticketBalances]
  );
  const allTeachers = useMemo(
    () =>
      allUsers
        .filter(u => u.role === 'teacher')
        .map(t => ({ id: t.id, name: getUserDisplayName(t), role: t.role })),
    [allUsers]
  );
  const allParents = useMemo(
    () =>
      allUsers
        .filter(u => u.role === 'parent')
        .map(p => ({ id: p.id, name: getUserDisplayName(p), role: p.role })),
    [allUsers]
  );
  const pendingVerifications = useMemo(
    () => assignedTasks.filter(task => task.isComplete && task.verificationStatus === 'pending'),
    [assignedTasks]
  );
  const viewingStudentData = useMemo(() => {
    return viewingStudentId ? getMockStudentData(viewingStudentId) : null;
  }, [viewingStudentId, getMockStudentData]);
  const handleViewManageUser = (userId: string, role: UserRole) => {
    if (role === 'student') {
      setViewingStudentId(userId);
    } else {
      const selectedUser = currentMockUsers[userId];
      alert(`Viewing/Managing (Mock): ${selectedUser ? getUserDisplayName(selectedUser) : userId}`);
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
      console.warn('onInitiateVerificationModal prop not provided to AdminView');
    }
  };
  const handleCreateUser = (newUserData: Omit<User, 'id'>) => {
    simulateCreateUser(newUserData);
    setIsCreateUserModalVisible(false);
  };
  if (!adminUser) {
    return (
      <SafeAreaView style={appSharedStyles.safeArea}>
        <Text>Loading Admin Data...</Text>
      </SafeAreaView>
    );
  }
  if (viewingStudentId && viewingStudentData) {
    return (
      <AdminStudentDetailView
        studentData={viewingStudentData}
        taskLibrary={taskLibrary}
        mockInstruments={mockInstruments}
        allUsers={allUsers}
        adminUserName={getUserDisplayName(adminUser)}
        onManualTicketAdjust={simulateManualTicketAdjustment}
        onRedeemReward={simulateRedeemReward}
        onAssignTask={taskId => simulateAssignTask(taskId, viewingStudentId, currentUserId)}
        onEditUser={simulateEditUser}
        onDeleteUser={simulateDeleteUser}
        onBack={handleBackFromStudentDetail}
        onDeleteAssignment={simulateDeleteAssignedTask}
      />
    );
  }

  return (
    <SafeAreaView style={appSharedStyles.safeArea}>
      <View style={appSharedStyles.headerContainer}>
        {viewingSection !== 'dashboard' && (
          <Button title="← Back" onPress={() => setViewingSection('dashboard')} />
        )}
        <Text style={appSharedStyles.header} numberOfLines={1} ellipsizeMode="tail">
          {' '}
          Admin: {getUserDisplayName(adminUser)}{' '}
        </Text>
        <View style={{ width: viewingSection !== 'dashboard' ? 50 : 0 }} />
      </View>

      <ScrollView style={appSharedStyles.container}>
        {viewingSection !== 'dashboard-pending-verification' && (
          <View style={adminSharedStyles.adminNav}>
            <Button
              title="Dashboard"
              onPress={() => setViewingSection('dashboard')}
              color={viewingSection === 'dashboard' ? colors.primary : colors.secondary}
            />
            <Button
              title="Users"
              onPress={() => setViewingSection('users')}
              color={viewingSection === 'users' ? colors.primary : colors.secondary}
            />
            <Button
              title="Tasks"
              onPress={() => setViewingSection('tasks')}
              color={viewingSection === 'tasks' ? colors.primary : colors.secondary}
            />
            <Button
              title="Rewards"
              onPress={() => setViewingSection('rewards')}
              color={viewingSection === 'rewards' ? colors.primary : colors.secondary}
            />
            <Button
              title="History"
              onPress={() => setViewingSection('history')}
              color={viewingSection === 'history' ? colors.primary : colors.secondary}
            />
            <Button
              title="Announcements"
              onPress={() => setViewingSection('announcements')}
              color={viewingSection === 'announcements' ? colors.primary : colors.secondary}
            />
            <Button
              title="Instruments"
              onPress={() => setViewingSection('instruments')}
              color={viewingSection === 'instruments' ? colors.primary : colors.secondary}
            />
          </View>
        )}

        {}
        {viewingSection === 'dashboard' && (
          <AdminDashboardSection
            allStudents={allStudents}
            allTeachers={allTeachers}
            allParents={allParents}
            allAssignedTasks={assignedTasks}
            onViewPendingVerifications={() => setViewingSection('dashboard-pending-verification')}
          />
        )}
        {viewingSection === 'dashboard-pending-verification' && (
          <View>
            <Text style={appSharedStyles.sectionTitle}>
              Pending Verifications ({pendingVerifications.length})
            </Text>
            {pendingVerifications.length > 0 ? (
              <FlatList
                data={pendingVerifications.sort(
                  (a, b) =>
                    new Date(a.completedDate || a.assignedDate).getTime() -
                    new Date(b.completedDate || b.assignedDate).getTime()
                )}
                keyExtractor={item => item.id}
                renderItem={({ item }) => {
                  const student = currentMockUsers[item.studentId];
                  const taskDetail = taskLibrary.find(t => t.id === item.taskId);
                  const baseTickets = taskDetail?.baseTickets ?? 0;
                  const completedDateTime = item.completedDate
                    ? new Date(item.completedDate).toLocaleString()
                    : 'N/A';
                  return (
                    <View style={adminPendingListStyles.pendingItem}>
                      <Text style={adminPendingListStyles.pendingTitle}>
                        Task: {getTaskTitle(item.taskId, taskLibrary)}
                      </Text>
                      <Text style={adminPendingListStyles.pendingDetail}>
                        Student: {student ? getUserDisplayName(student) : 'Unknown Student'}
                      </Text>
                      <Text style={adminPendingListStyles.pendingDetail}>
                        Potential Tickets: {baseTickets}
                      </Text>
                      <Text style={adminPendingListStyles.pendingDetail}>
                        Completed: {completedDateTime}
                      </Text>
                      <View style={{ marginTop: 10 }}>
                        <Button
                          title="Verify Task"
                          onPress={() => handleInternalInitiateVerificationModal(item)}
                        />
                      </View>
                    </View>
                  );
                }}
                scrollEnabled={false}
                ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
                ListEmptyComponent={() => (
                  <Text style={appSharedStyles.emptyListText}>No tasks pending verification.</Text>
                )}
              />
            ) : (
              <Text style={appSharedStyles.emptyListText}>No tasks pending verification.</Text>
            )}
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
            onAssignTask={(taskId, studentId) =>
              simulateAssignTask(taskId, studentId, currentUserId)
            }
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
            allAssignedTasks={assignedTasks}
            onCreateTaskLibraryItem={simulateCreateTaskLibraryItem}
            onEditTaskLibraryItem={simulateEditTaskLibraryItem}
            onDeleteTaskLibraryItem={simulateDeleteTaskLibraryItem}
            onAssignTask={(taskId, studentId) =>
              simulateAssignTask(taskId, studentId, currentUserId)
            }
            onInitiateVerification={handleInternalInitiateVerificationModal}
            onDeleteAssignment={simulateDeleteAssignedTask}
          />
        )}
        {viewingSection === 'rewards' && (
          <AdminRewardsSection
            rewardsCatalog={rewardsCatalog}
            onCreateReward={simulateCreateReward}
            onEditReward={simulateEditReward}
            onDeleteReward={simulateDeleteReward}
          />
        )}
        {viewingSection === 'history' && <AdminHistorySection allTicketHistory={ticketHistory} />}
        {viewingSection === 'announcements' && (
          <AdminAnnouncementsSection
            announcements={announcements}
            onCreateAnnouncement={simulateCreateAnnouncement}
            onEditAnnouncement={simulateEditAnnouncement}
            onDeleteAnnouncement={simulateDeleteAnnouncement}
          />
        )}
        {viewingSection === 'instruments' && (
          <AdminInstrumentsSection
            mockInstruments={mockInstruments}
            onCreateInstrument={simulateCreateInstrument}
            onEditInstrument={simulateEditInstrument}
            onDeleteInstrument={simulateDeleteInstrument}
          />
        )}
      </ScrollView>
      {}
    </SafeAreaView>
  );
};
