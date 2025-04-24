import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { View, Text, ScrollView, Button, FlatList, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// Import API functions used by queries in this view
import { fetchAssignedTasks } from '../api/assignedTasks';
import { fetchInstruments } from '../api/instruments';
import { fetchTaskLibrary } from '../api/taskLibrary';
import { fetchTeachers } from '../api/users'; // Import fetchTeachers

// Import Child Components (Sections)
import { AdminAnnouncementsSection } from '../components/admin/AdminAnnouncementsSection';
import { AdminDashboardSection } from '../components/admin/AdminDashboardSection';
import { AdminHistorySection } from '../components/admin/AdminHistorySection';
import { AdminInstrumentsSection } from '../components/admin/AdminInstrumentsSection';
import { AdminRewardsSection } from '../components/admin/AdminRewardsSection';
import { AdminStudentDetailView } from '../components/admin/AdminStudentDetailView';
import { AdminTasksSection } from '../components/admin/AdminTasksSection';
import { AdminUsersSection } from '../components/admin/AdminUsersSection';

// Import Modals triggered by this view or its children
import CreateUserModal from '../components/admin/modals/CreateUserModal';
import { ViewAllAssignedTasksModal } from '../components/admin/modals/ViewAllAssignedTasksModal';
import AssignTaskModal from '../components/common/AssignTaskModal';
import EditUserModal from '../components/common/EditUserModal';

// Import Contexts and Hooks
import { useAuth } from '../contexts/AuthContext';
import { usePaginatedParents } from '../hooks/usePaginatedParents';
import { usePaginatedStudents } from '../hooks/usePaginatedStudents';
import { usePaginatedTeachers } from '../hooks/usePaginatedTeachers';

// Import Types
import { AssignedTask } from '../mocks/mockAssignedTasks';
import { Instrument } from '../mocks/mockInstruments';
import { TaskLibraryItem } from '../mocks/mockTaskLibrary';
import { AdminViewProps } from '../types/componentProps';
import { User, UserRole } from '../types/userTypes';

// Import Utils and Styles
import { getUserDisplayName } from '../utils/helpers';
import { adminSharedStyles } from '../styles/adminSharedStyles';
import { appSharedStyles } from '../styles/appSharedStyles';
import { colors } from '../styles/colors';

// --- Type Definitions ---
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
// --- End Type Definitions ---

export const AdminView: React.FC<AdminViewProps> = ({ onInitiateVerificationModal }) => {
  const { currentUserId } = useAuth();

  // --- State ---
  const [viewingSection, setViewingSection] = useState<AdminSection>('dashboard');
  const [viewingStudentId, setViewingStudentId] = useState<string | null>(null);
  const [activeUserTab, setActiveUserTab] = useState<UserTab>('students');
  const [isCreateUserModalVisible, setIsCreateUserModalVisible] = useState(false);
  const [isAssignTaskModalVisible, setIsAssignTaskModalVisible] = useState(false);
  const [assignTaskTargetStudentId, setAssignTaskTargetStudentId] = useState<string | null>(null);
  const [isViewAllAssignedTasksModalVisible, setIsViewAllAssignedTasksModalVisible] =
    useState(false);
  const [isEditStudentModalVisible, setIsEditStudentModalVisible] = useState(false);

  // --- TQ Queries ---
  const {
    data: adminUser,
    isLoading: adminLoading,
    isError: adminError,
  } = useQuery<User, Error>({
    queryKey: ['user', currentUserId],
    queryFn: async () => {
      if (!currentUserId) throw new Error('No admin user ID');
      const response = await fetch(`/api/users/${currentUserId}`);
      if (!response.ok) throw new Error('Failed to fetch admin user data');
      const userData = await response.json();
      if (userData.role !== 'admin') throw new Error('User is not admin');
      return userData;
    },
    enabled: !!currentUserId,
    staleTime: 15 * 60 * 1000,
  });

  const { data: viewingStudentUser } = useQuery<User, Error>({
    queryKey: ['user', viewingStudentId],
    queryFn: async () => {
      if (!viewingStudentId) throw new Error('No student ID');
      const response = await fetch(`/api/users/${viewingStudentId}`);
      if (!response.ok) throw new Error(`Failed to fetch student ${viewingStudentId}`);
      return response.json();
    },
    enabled: !!viewingStudentId,
    staleTime: 5 * 60 * 1000,
  });

  const {
    data: taskLibrary = [],
    isLoading: libraryLoading,
    isError: libraryError,
  } = useQuery<TaskLibraryItem[], Error>({
    queryKey: ['task-library'],
    queryFn: fetchTaskLibrary,
    staleTime: 10 * 60 * 1000,
  });

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
  });

  const {
    data: assignedTasksResult,
    isLoading: assignedTasksLoading,
    isError: assignedTasksError,
    error: assignedTasksErrorMsg,
  } = useQuery({
    queryKey: ['assigned-tasks', { assignmentStatus: 'pending', studentStatus: 'active' }],
    queryFn: () =>
      fetchAssignedTasks({ assignmentStatus: 'pending', studentStatus: 'active', limit: 1000 }),
    staleTime: 1 * 60 * 1000,
  });
  const pendingTasks = assignedTasksResult?.items ?? [];
  const pendingVerifications = pendingTasks;

  const { data: allActiveTeachers = [] } = useQuery<User[], Error>({
    queryKey: ['teachers', { status: 'active', context: 'adminViewLookup' }],
    queryFn: async () => {
      // Assuming fetchTeachers fetches page 1 by default, adjust if needed to get ALL active
      const result = await fetchTeachers({ page: 1 });
      return (result?.items || []).filter(t => t.status === 'active');
    },
    staleTime: 10 * 60 * 1000,
  });

  // --- Event Handlers ---
  const handleViewManageUser = (userId: string, role: UserRole) => {
    if (role === 'student') {
      setViewingStudentId(userId);
    } else {
      const userList = role === 'teacher' ? teachers : role === 'parent' ? parents : [];
      const user = userList.find(u => u.id === userId);
      alert(`TODO: Manage ${role}: ${user ? getUserDisplayName(user) : userId}`);
    }
  };
  const handleBackFromStudentDetail = () => {
    setViewingStudentId(null);
    setViewingSection('users');
  };
  const handleInternalInitiateVerificationModal = (task: AssignedTask) => {
    if (onInitiateVerificationModal) {
      onInitiateVerificationModal(task);
    }
  };
  const handleInitiateAssignTaskForStudent = (studentId: string) => {
    console.log('[AdminView] handleInitiateAssignTaskForStudent called for:', studentId);
    setAssignTaskTargetStudentId(studentId);
    setIsAssignTaskModalVisible(true);
  };
  const handleInitiateCreateUser = () => {
    console.log('[AdminView] handleInitiateCreateUser called');
    setIsCreateUserModalVisible(true);
  };  
  const handleInitiateAssignTaskGeneral = () => {
    console.log('[AdminView] handleInitiateAssignTaskGeneral called');
    setAssignTaskTargetStudentId(null);
    setIsAssignTaskModalVisible(true);
  };
  const handleAssignTaskModalClose = () => {
    setIsAssignTaskModalVisible(false);
    setAssignTaskTargetStudentId(null);
  };
  const handleViewAllAssignedTasks = () => {
    setIsViewAllAssignedTasksModalVisible(true);
  };
  const handleViewAllAssignedTasksModalClose = () => {
    setIsViewAllAssignedTasksModalVisible(false);
  };
  const handleEditStudentClick = () => {
    if (viewingStudentId) setIsEditStudentModalVisible(true);
  };

  // --- Render Logic ---
  const isLoadingCoreData = adminLoading || instrumentsLoading;
  if (isLoadingCoreData) {
    return (
      <SafeAreaView style={appSharedStyles.safeArea}>
        <View
          style={[appSharedStyles.container, { justifyContent: 'center', alignItems: 'center' }]}
        >
          <ActivityIndicator size="large" />
        </View>
      </SafeAreaView>
    );
  }
  if (!adminUser || adminError) {
    return (
      <SafeAreaView style={appSharedStyles.safeArea}>
        <View style={appSharedStyles.container}>
          <Text style={appSharedStyles.textDanger}>Error loading Admin user data.</Text>
        </View>
      </SafeAreaView>
    );
  }

  // --- Determine main content ---
  const renderMainContent = () => {
    if (viewingStudentId) {
      return (
        <AdminStudentDetailView
          viewingStudentId={viewingStudentId}
          onInitiateVerification={handleInternalInitiateVerificationModal}
          onInitiateAssignTaskForStudent={() =>
            handleInitiateAssignTaskForStudent(viewingStudentId)
          }
          onInitiateEditStudent={handleEditStudentClick}          
        />
      );
    }

    const isUsersLoading = isStudentListLoading || isTeacherListLoading || isParentListLoading;
    return (
      <ScrollView style={appSharedStyles.container}>
        {/* Navigation Buttons */}
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

        {/* Sections */}
        {viewingSection === 'dashboard' && (
          <AdminDashboardSection
            onViewPendingVerifications={() => setViewingSection('dashboard-pending-verification')}
          />
        )}
        {viewingSection === 'dashboard-pending-verification' && (
          <View>
            <Text style={appSharedStyles.sectionTitle}>
              Pending Verifications ({pendingVerifications.length})
            </Text>
            {assignedTasksLoading && (
              <ActivityIndicator style={{ marginVertical: 10 }} color={colors.primary} />
            )}
            {assignedTasksError && (
              <Text style={[appSharedStyles.textDanger, { marginVertical: 10 }]}>
                Error loading tasks: {assignedTasksErrorMsg?.message}
              </Text>
            )}
            {!assignedTasksLoading && !assignedTasksError && (
              <>
                {pendingVerifications.length > 0 ? (
                  <FlatList
                    data={pendingVerifications.sort(
                      (a, b) =>
                        new Date(a.completedDate || a.assignedDate).getTime() -
                        new Date(b.completedDate || b.assignedDate).getTime()
                    )}
                    keyExtractor={item => item.id}
                    renderItem={({ item }) => {
                      const studentSimple = students.find(s => s.id === item.studentId);
                      return (
                        <View style={appSharedStyles.pendingItem}>
                          {' '}
                          {/* ... item content ... */}{' '}
                          <Button
                            title="Verify Task"
                            onPress={() => handleInternalInitiateVerificationModal(item)}
                          />{' '}
                        </View>
                      );
                    }}
                    scrollEnabled={false}
                    ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
                    ListEmptyComponent={() => (
                      <Text style={appSharedStyles.emptyListText}>
                        No tasks pending verification.
                      </Text>
                    )}
                  />
                ) : (
                  <Text style={appSharedStyles.emptyListText}>No tasks pending verification.</Text>
                )}
              </>
            )}
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
            setStudentFilter={setStudentFilter}
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
            onInitiateCreateUser={handleInitiateCreateUser}
          />
        )}
        {viewingSection === 'tasks' && (
          <AdminTasksSection
            taskLibrary={taskLibrary}
            isLoading={libraryLoading}
            isError={libraryError ?? false}
            onInitiateAssignTask={handleInitiateAssignTaskGeneral}
          />
        )}
        {viewingSection === 'rewards' && <AdminRewardsSection />}
        {viewingSection === 'history' && <AdminHistorySection />}
        {viewingSection === 'announcements' && <AdminAnnouncementsSection />}
        {viewingSection === 'instruments' && <AdminInstrumentsSection />}

        {/* View All Tasks Button */}
        {viewingSection === 'tasks' && (
          <View style={{ alignItems: 'flex-start', marginTop: 10, marginBottom: 20 }}>
            <Button title="View All Assigned Tasks" onPress={handleViewAllAssignedTasks} />
          </View>
        )}
      </ScrollView>
    );
  };
  // --- END: Determine main content ---

  // --- Main Return Structure ---
  const showBackButton = !!viewingStudentId || viewingSection !== 'dashboard';
  const handleBackPress = () => {
    if (viewingStudentId) {
      handleBackFromStudentDetail();
    } else {
      setViewingSection('dashboard');
    }
  };
  const isStudentActive = viewingStudentUser?.status === 'active';

  return (
    <SafeAreaView style={appSharedStyles.safeArea}>
      {/* Header */}
      <View style={appSharedStyles.headerContainer}>
        <View style={appSharedStyles.headerSideContainer}>
          {showBackButton ? (
            <Button title="← Back" onPress={handleBackPress} />
          ) : (
            <View style={{ width: 60 }} />
          )}
        </View>
        <Text style={appSharedStyles.headerTitle} numberOfLines={1} ellipsizeMode="tail">
          {viewingStudentId
            ? viewingStudentUser
              ? getUserDisplayName(viewingStudentUser)
              : 'Loading...'
            : `Admin: ${getUserDisplayName(adminUser)}`}
        </Text>
      </View>

      {/* Main Content */}
      {renderMainContent()}

      {/* Modals */}
      <CreateUserModal
        visible={isCreateUserModalVisible}
        onClose={() => setIsCreateUserModalVisible(false)}
        mockInstruments={fetchedInstruments}
      />
      <AssignTaskModal
        visible={isAssignTaskModalVisible}
        onClose={handleAssignTaskModalClose}
        preselectedStudentId={assignTaskTargetStudentId}
      />
      <ViewAllAssignedTasksModal
        visible={isViewAllAssignedTasksModalVisible}
        onClose={handleViewAllAssignedTasksModalClose}
        onInitiateVerification={handleInternalInitiateVerificationModal}
      />
      {viewingStudentUser && (
        <EditUserModal
          visible={isEditStudentModalVisible}
          userToEdit={viewingStudentUser}
          onClose={() => setIsEditStudentModalVisible(false)}
          mockInstruments={fetchedInstruments}
        />
      )}
    </SafeAreaView>
  );
};
