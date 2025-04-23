
import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  Button,
  FlatList,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';


import { useAuth } from '../contexts/AuthContext';
import { useData } from '../contexts/DataContext';
import { useQuery } from '@tanstack/react-query';
import { usePaginatedStudents } from '../hooks/usePaginatedStudents';
import { usePaginatedTeachers } from '../hooks/usePaginatedTeachers';
import { usePaginatedParents } from '../hooks/usePaginatedParents';
import { fetchInstruments } from '../api/instruments';




import { AdminDashboardSection } from '../components/admin/AdminDashboardSection';
import { AdminUsersSection } from '../components/admin/AdminUsersSection';
import { AdminTasksSection } from '../components/admin/AdminTasksSection';
import { AdminRewardsSection } from '../components/admin/AdminRewardsSection';
import { AdminHistorySection } from '../components/admin/AdminHistorySection';
import { AdminAnnouncementsSection } from '../components/admin/AdminAnnouncementsSection';
import { AdminInstrumentsSection } from '../components/admin/AdminInstrumentsSection';
import { AdminStudentDetailView } from '../components/admin/AdminStudentDetailView';
import AssignTaskModal from '../components/common/AssignTaskModal';
import CreateUserModal from '../components/admin/modals/CreateUserModal';
import ViewAllAssignedTasksModal from '../components/admin/modals/ViewAllAssignedTasksModal';


import { User, UserRole } from '../types/userTypes';
import { AssignedTask } from '../mocks/mockAssignedTasks';
import { Instrument } from '../mocks/mockInstruments';



import { getUserDisplayName } from '../utils/helpers';
import { adminSharedStyles } from '../components/admin/adminSharedStyles';
import { appSharedStyles } from '../styles/appSharedStyles';
import { colors } from '../styles/colors';

type AdminSection =
  | 'dashboard'
  | 'dashboard-pending-verification'
  | 'users'
  | 'tasks'
  | 'rewards'
  | 'history'
  | 'announcements'
  | 'instruments';
type UserTab = 'students' | 'teachers' | 'parents';

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
const styles = StyleSheet.create({
   headerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderPrimary,
    backgroundColor: colors.backgroundPrimary,
  },
  headerSideContainer: {
    minWidth: 60,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
  },
  headerTitle: {
    flex: 1,
    fontSize: 22,
    fontWeight: 'bold',
    color: colors.textPrimary,
    textAlign: 'center',
    marginHorizontal: 5,
  },
});

export const AdminView: React.FC<AdminViewProps> = ({ onInitiateVerificationModal }) => {
  const { currentUserId } = useAuth();
  const {
    currentMockUsers,
    assignedTasks,
    ticketBalances,
    simulateRedeemReward,
    simulateAssignTask,
    simulateDeleteAssignedTask,
    
  } = useData();

  
  const [viewingSection, setViewingSection] = useState<AdminSection>('dashboard');
  const [viewingStudentId, setViewingStudentId] = useState<string | null>(null);
  const [activeUserTab, setActiveUserTab] = useState<UserTab>('students');
  const [isCreateUserModalVisible, setIsCreateUserModalVisible] = useState(false);
  const [isAssignTaskModalVisible, setIsAssignTaskModalVisible] = useState(false);
  const [assignTaskTargetStudentId, setAssignTaskTargetStudentId] = useState<string | null>(null);
  const [isViewAllAssignedTasksModalVisible, setIsViewAllAssignedTasksModalVisible] =
    useState(false);

  
  const {
    students,
    currentPage: studentPage,
    totalPages: studentTotalPages,
    setPage: setStudentPage,
    currentFilter: studentFilter,
    setFilter: setStudentFilter,
    searchTerm: studentSearchTerm,
    setSearchTerm: setStudentSearchTerm,
    isLoading: isStudentListLoading,
    isFetching: isStudentListFetching,
    isError: isStudentListError,
    error: studentListError,
  } = usePaginatedStudents();
  const {
    teachers,
    currentPage: teacherPage,
    totalPages: teacherTotalPages,
    setPage: setTeacherPage,
    isLoading: isTeacherListLoading,
    isFetching: isTeacherListFetching,
    isError: isTeacherListError,
    error: teacherListError,
  } = usePaginatedTeachers();
  const {
    parents,
    currentPage: parentPage,
    totalPages: parentTotalPages,
    setPage: setParentPage,
    isLoading: isParentListLoading,
    isFetching: isParentListFetching,
    isError: isParentListError,
    error: parentListError,
  } = usePaginatedParents();
  const { data: fetchedInstruments = [], isLoading: instrumentsLoading } = useQuery<
    Instrument[],
    Error
  >({
    queryKey: ['instruments'],
    queryFn: fetchInstruments,
    staleTime: Infinity,
    gcTime: Infinity,
  });
  
  

  
  const adminUser = currentUserId ? currentMockUsers[currentUserId] : null;
  const allUsers = useMemo(() => Object.values(currentMockUsers), [currentMockUsers]);
  const allTeachersForModal = useMemo(() => allUsers.filter(u => u.role === 'teacher'), [allUsers]);
  const pendingVerifications = useMemo(
    () => assignedTasks.filter(task => task.isComplete && task.verificationStatus === 'pending'),
    [assignedTasks]
  );
  const viewingStudentUserObject = useMemo(() => {
    return viewingStudentId ? currentMockUsers[viewingStudentId] : null;
  }, [viewingStudentId, currentMockUsers]);

  const dashboardStudents = useMemo(
    () => students.map(s => ({ ...s, role: 'student' })),
    [students]
  );
  const dashboardTeachers = useMemo(
    () => teachers.map(t => ({ id: t.id, name: getUserDisplayName(t), role: t.role })),
    [teachers]
  );
  const dashboardParents = useMemo(
    () => parents.map(p => ({ id: p.id, name: getUserDisplayName(p), role: p.role })),
    [parents]
  );

  
  const handleViewManageUser = (userId: string, role: UserRole) => {
    if (role === 'student') {
      setViewingStudentId(userId);
    } else {
      const u = currentMockUsers[userId];
      alert(`Viewing/Managing (Mock - ${role}): ${u ? getUserDisplayName(u) : userId}`);
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
      console.warn('onInitiateVerificationModal prop not provided');
      alert(`Mock Verify: ${task.taskTitle}`);
    }
  };
  const handleInitiateAssignTaskForStudent = (studentId: string) => {
    setAssignTaskTargetStudentId(studentId);
    setIsAssignTaskModalVisible(true);
  };
  const handleInitiateAssignTaskGeneral = () => {
    setAssignTaskTargetStudentId(null);
    setIsAssignTaskModalVisible(true);
  };
  const handleAssignTaskModalClose = () => {
    setIsAssignTaskModalVisible(false);
    setAssignTaskTargetStudentId(null);
  };
  
  const handleAssignTaskConfirm = (
    studentId: string,
    taskTitle: string,
    taskDescription: string,
    taskBasePoints: number
  ) => {
    simulateAssignTask(studentId, taskTitle, taskDescription, taskBasePoints, currentUserId);
  };
  const handleViewAllAssignedTasks = () => {
    setIsViewAllAssignedTasksModalVisible(true);
  };
  const handleViewAllAssignedTasksModalClose = () => {
    setIsViewAllAssignedTasksModalVisible(false);
  };

  
  if (!adminUser) {
    return (
      <SafeAreaView style={appSharedStyles.safeArea}>
        <ActivityIndicator />
      </SafeAreaView>
    );
  }

  
  if (viewingStudentId && viewingStudentUserObject) {
    
    if (instrumentsLoading ) {
      return (
        <SafeAreaView style={appSharedStyles.safeArea}>
          <ActivityIndicator style={{ marginTop: 30 }} size="large" />
        </SafeAreaView>
      );
    }
    return (
      <AdminStudentDetailView
        student={viewingStudentUserObject} 
        allUsers={allUsers} 
        adminUserName={getUserDisplayName(adminUser)}
        
        
        onRedeemReward={simulateRedeemReward}
        onAssignTask={() => handleInitiateAssignTaskForStudent(viewingStudentId)}
        onBack={handleBackFromStudentDetail}
        onDeleteAssignment={simulateDeleteAssignedTask}
        onInitiateVerification={handleInternalInitiateVerificationModal}
      />
    );
  }

  
  const showBackButton = viewingSection !== 'dashboard';
  const isUsersLoading =
    isStudentListLoading || isTeacherListLoading || isParentListLoading || instrumentsLoading;

  return (
    <SafeAreaView style={appSharedStyles.safeArea}>
      {}
      <View style={styles.headerContainer}>
        <View style={styles.headerSideContainer}>
          {}
          {
            showBackButton ? (
              <Button title="← Back" onPress={() => setViewingSection('dashboard')} />
            ) : (
              <View style={{ width: 60 }} />
            ) 
          }
        </View>
        <Text style={styles.headerTitle} numberOfLines={1} ellipsizeMode="tail">
          Admin: {getUserDisplayName(adminUser)}
        </Text>
        <View style={styles.headerSideContainer}>
          {}
          {
            viewingSection === 'users' ? (
              <Button title="+ User" onPress={() => setIsCreateUserModalVisible(true)} />
            ) : (
              <View style={{ width: 60 }} />
            ) 
          }
        </View>
      </View>

      {}
      <ScrollView style={appSharedStyles.container}>
        {}
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
            allStudents={dashboardStudents}
            allTeachers={dashboardTeachers}
            allParents={dashboardParents}
            allAssignedTasks={assignedTasks}
            onViewPendingVerifications={() => setViewingSection('dashboard-pending-verification')}
          />
        )}
        {viewingSection === 'dashboard-pending-verification' && (
          <View>
            {' '}
            <Text style={appSharedStyles.sectionTitle}>
              {' '}
              Pending Verifications ({pendingVerifications.length}){' '}
            </Text>{' '}
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
                  const taskTitle = item.taskTitle;
                  const baseTickets = item.taskBasePoints;
                  const completedDateTime = item.completedDate
                    ? new Date(item.completedDate).toLocaleString()
                    : 'N/A';
                  return (
                    <View style={adminPendingListStyles.pendingItem}>
                      {' '}
                      <Text style={adminPendingListStyles.pendingTitle}>
                        Task: {taskTitle}
                      </Text>{' '}
                      <Text style={adminPendingListStyles.pendingDetail}>
                        Student: {student ? getUserDisplayName(student) : 'Unknown Student'}
                      </Text>{' '}
                      <Text style={adminPendingListStyles.pendingDetail}>
                        Potential Tickets: {baseTickets}
                      </Text>{' '}
                      <Text style={adminPendingListStyles.pendingDetail}>
                        Completed: {completedDateTime}
                      </Text>{' '}
                      <View style={{ marginTop: 10 }}>
                        {' '}
                        <Button
                          title="Verify Task"
                          onPress={() => handleInternalInitiateVerificationModal(item)}
                        />{' '}
                      </View>{' '}
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
            )}{' '}
          </View>
        )}
        {viewingSection === 'users' && (
          <AdminUsersSection
            displayData={
              activeUserTab === 'students'
                ? students
                : activeUserTab === 'teachers'
                  ? teachers
                  : parents
            }
            currentPage={
              activeUserTab === 'students'
                ? studentPage
                : activeUserTab === 'teachers'
                  ? teacherPage
                  : parentPage
            }
            totalPages={
              activeUserTab === 'students'
                ? studentTotalPages
                : activeUserTab === 'teachers'
                  ? teacherTotalPages
                  : parentTotalPages
            }
            setPage={
              activeUserTab === 'students'
                ? setStudentPage
                : activeUserTab === 'teachers'
                  ? setTeacherPage
                  : setParentPage
            }
            activeTab={activeUserTab}
            setActiveTab={setActiveUserTab}
            studentFilter={studentFilter}
            setFilter={setStudentFilter}
            studentSearchTerm={studentSearchTerm}
            setStudentSearchTerm={setStudentSearchTerm}
            isLoading={isUsersLoading}
            isFetching={
              activeUserTab === 'students'
                ? isStudentListFetching
                : activeUserTab === 'teachers'
                  ? isTeacherListFetching
                  : isParentListFetching
            }
            isError={
              activeUserTab === 'students'
                ? isStudentListError
                : activeUserTab === 'teachers'
                  ? isTeacherListError
                  : isParentListError
            }
            error={
              activeUserTab === 'students'
                ? studentListError
                : activeUserTab === 'teachers'
                  ? teacherListError
                  : parentListError
            }
            mockInstruments={fetchedInstruments}
            onViewManageUser={handleViewManageUser}
            onInitiateAssignTaskForStudent={handleInitiateAssignTaskForStudent}
          />
        )}
        {viewingSection === 'tasks' && (
          <AdminTasksSection
            onInitiateAssignTask={handleInitiateAssignTaskGeneral}
            onInitiateVerification={handleInternalInitiateVerificationModal}
            onDeleteAssignment={simulateDeleteAssignedTask}
          />
        )}
        {viewingSection === 'rewards' && <AdminRewardsSection />}
        {viewingSection === 'history' && <AdminHistorySection />}
        {viewingSection === 'announcements' && <AdminAnnouncementsSection />}
        {viewingSection === 'instruments' && <AdminInstrumentsSection />}
      </ScrollView>

      {}
      <CreateUserModal
        visible={isCreateUserModalVisible}
        onClose={() => setIsCreateUserModalVisible(false)}
        allTeachers={allTeachersForModal}
        mockInstruments={fetchedInstruments}
      />
      <AssignTaskModal
        visible={isAssignTaskModalVisible}
        onClose={handleAssignTaskModalClose}
        allStudents={allUsers
          .filter(u => u.role === 'student' && u.status === 'active')
          .map(s => ({
            id: s.id,
            name: getUserDisplayName(s),
            balance: ticketBalances[s.id] || 0,
            instrumentIds: s.instrumentIds,
            isActive: true,
          }))}
        
        
        preselectedStudentId={assignTaskTargetStudentId}
      />
      <ViewAllAssignedTasksModal
        visible={isViewAllAssignedTasksModalVisible}
        onClose={handleViewAllAssignedTasksModalClose}
        allUsers={allUsers}
        onInitiateVerification={handleInternalInitiateVerificationModal}
      />

      {viewingSection === 'tasks' && (
        <View style={{ alignItems: 'flex-start', paddingHorizontal: 15, paddingBottom: 20 }}>
          {' '}
          <Button title="View All Assigned Tasks" onPress={handleViewAllAssignedTasks} />{' '}
        </View>
      )}
    </SafeAreaView>
  );
};
