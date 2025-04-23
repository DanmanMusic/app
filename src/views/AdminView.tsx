import React, { useState } from 'react';
// Import necessary hooks and components
import { useQuery } from '@tanstack/react-query'; // Removed useMutation as it's not used directly here
import {
  View,
  Text,
  ScrollView,
  Button,
  FlatList,
  StyleSheet,
  ActivityIndicator, // Removed Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// Import API functions used by queries in this view
import { fetchAssignedTasks } from '../api/assignedTasks';
import { fetchInstruments } from '../api/instruments';
import { fetchTaskLibrary } from '../api/taskLibrary';
// Import API functions (assuming fetchUserById exists or is handled by fetch)
// import { fetchUserById } from '../api/users'; // If using a specific function

// Import Child Components (Sections)
import { AdminAnnouncementsSection } from '../components/admin/AdminAnnouncementsSection';
import { AdminDashboardSection } from '../components/admin/AdminDashboardSection';
import { AdminHistorySection } from '../components/admin/AdminHistorySection';
import { AdminInstrumentsSection } from '../components/admin/AdminInstrumentsSection';
import { AdminRewardsSection } from '../components/admin/AdminRewardsSection';
import { AdminStudentDetailView } from '../components/admin/AdminStudentDetailView';
import { AdminTasksSection } from '../components/admin/AdminTasksSection';
import { AdminUsersSection } from '../components/admin/AdminUsersSection';

// Import Modals triggered by this view
import CreateUserModal from '../components/admin/modals/CreateUserModal';
import { ViewAllAssignedTasksModal } from '../components/admin/modals/ViewAllAssignedTasksModal';
import AssignTaskModal from '../components/common/AssignTaskModal';

// Import Contexts and Hooks
import { useAuth } from '../contexts/AuthContext';
import { usePaginatedParents } from '../hooks/usePaginatedParents';
import { usePaginatedStudents } from '../hooks/usePaginatedStudents';
import { usePaginatedTeachers } from '../hooks/usePaginatedTeachers';

// Import Types
import { AssignedTask } from '../mocks/mockAssignedTasks';
import { Instrument } from '../mocks/mockInstruments';
import { TaskLibraryItem } from '../mocks/mockTaskLibrary';
import { AdminViewProps } from '../types/componentProps'; // Use imported props type
import { User, UserRole } from '../types/userTypes';

// Import Utils and Styles
import { getUserDisplayName } from '../utils/helpers';
import { adminSharedStyles } from '../components/admin/adminSharedStyles';
import { appSharedStyles } from '../styles/appSharedStyles';
import { colors } from '../styles/colors';

// --- Style Definitions ---
const adminPendingListStyles = StyleSheet.create({
  pendingItem: {
    backgroundColor: colors.backgroundPrimary,
    padding: 12,
    marginBottom: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.borderWarning,
  },
  pendingTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 5,
    color: colors.textPrimary,
  },
  pendingDetail: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 3,
  },
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
// --- End Style Definitions ---

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
  // Removed queryClient as it wasn't used directly here
  // const queryClient = useQueryClient();

  // --- State ---
  const [viewingSection, setViewingSection] = useState<AdminSection>('dashboard');
  const [viewingStudentId, setViewingStudentId] = useState<string | null>(null); // ID for detail view
  const [activeUserTab, setActiveUserTab] = useState<UserTab>('students');
  const [isCreateUserModalVisible, setIsCreateUserModalVisible] = useState(false);
  const [isAssignTaskModalVisible, setIsAssignTaskModalVisible] = useState(false);
  const [assignTaskTargetStudentId, setAssignTaskTargetStudentId] = useState<string | null>(null);
  const [isViewAllAssignedTasksModalVisible, setIsViewAllAssignedTasksModalVisible] =
    useState(false);

  // --- TQ Queries ---
  // Fetch Admin User Data
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

  // Fetch Task Library (needed for AdminTasksSection props)
  const {
    data: taskLibrary = [],
    isLoading: libraryLoading,
    isError: libraryError,
  } = useQuery<TaskLibraryItem[], Error>({
    queryKey: ['task-library'],
    queryFn: fetchTaskLibrary,
    staleTime: 10 * 60 * 1000,
  });

  // Fetch Paginated User Lists
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

  // Fetch Instruments
  const { data: fetchedInstruments = [], isLoading: instrumentsLoading } = useQuery<
    Instrument[],
    Error
  >({
    queryKey: ['instruments'],
    queryFn: fetchInstruments,
    staleTime: Infinity,
  });

  // Fetch Pending Tasks for Dashboard/List
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

  // --- Event Handlers ---
  const handleViewManageUser = (userId: string, role: UserRole) => {
    console.log(`[AdminView] handleViewManageUser called with ID: ${userId}, Role: ${role}`);
    if (role === 'student') {
      setViewingStudentId(userId); // Set state to trigger detail view render
    } else {
      // Placeholder for viewing other user types (could open a simpler modal)
      const userList = role === 'teacher' ? teachers : role === 'parent' ? parents : [];
      const user = userList.find(u => u.id === userId);
      alert(
        `TODO: Implement viewing/managing for ${role}: ${user ? getUserDisplayName(user) : userId}`
      );
    }
  };

  const handleBackFromStudentDetail = () => {
    setViewingStudentId(null); // Clear student ID to return to list view
    setViewingSection('users'); // Optionally switch back to users tab
  };

  // Use the prop directly if it exists
  const handleInternalInitiateVerificationModal = (task: AssignedTask) => {
    if (onInitiateVerificationModal) {
      onInitiateVerificationModal(task); // Call the passed-in function
    } else {
      console.warn('onInitiateVerificationModal prop not provided to AdminView');
    }
  };

  const handleInitiateAssignTaskForStudent = (studentId: string) => {
    setAssignTaskTargetStudentId(studentId); // Pre-select student
    setIsAssignTaskModalVisible(true); // Open modal
  };

  const handleInitiateAssignTaskGeneral = () => {
    setAssignTaskTargetStudentId(null); // No pre-selection
    setIsAssignTaskModalVisible(true); // Open modal
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

  // --- Render Logic ---
  const isLoadingCoreData = adminLoading || instrumentsLoading;
  if (isLoadingCoreData) {
    // Render loading state while essential admin/instrument data loads
    return (
      <SafeAreaView style={appSharedStyles.safeArea}>
        <View style={appSharedStyles.container}>
          <ActivityIndicator size="large" />
        </View>
      </SafeAreaView>
    );
  }
  if (!adminUser || adminError) {
    // Render error state if admin data failed
    return (
      <SafeAreaView style={appSharedStyles.safeArea}>
        <View style={appSharedStyles.container}>
          <Text style={appSharedStyles.textDanger}>Error loading Admin user data.</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Render Student Detail View if an ID is set
  if (viewingStudentId) {
    return (
      <AdminStudentDetailView
        viewingStudentId={viewingStudentId} // Pass the ID
        adminUserName={getUserDisplayName(adminUser)} // Pass admin name
        onBack={handleBackFromStudentDetail}
        // Let detail view fetch its own users if needed for lookups like teacher names
        // Pass callbacks for actions managed/triggered at App level or AdminView level
        onInitiateVerification={handleInternalInitiateVerificationModal}
        onAssignTask={() => handleInitiateAssignTaskForStudent(viewingStudentId)} // Opens modal managed here
        // Removed onRedeemReward, onDeleteAssignment - should be handled via TQ/modals internally
      />
    );
  }

  // Render Main Admin View Content
  const showBackButton = viewingSection !== 'dashboard';
  const isUsersLoading = isStudentListLoading || isTeacherListLoading || isParentListLoading;

  return (
    <SafeAreaView style={appSharedStyles.safeArea}>
      <View style={styles.headerContainer}>
        <View style={styles.headerSideContainer}>
          {showBackButton ? (
            <Button title="← Back" onPress={() => setViewingSection('dashboard')} />
          ) : (
            <View style={{ width: 60 }} />
          )}
        </View>
        <Text style={styles.headerTitle} numberOfLines={1} ellipsizeMode="tail">
          Admin: {getUserDisplayName(adminUser)}
        </Text>
        <View style={styles.headerSideContainer}>
          {viewingSection === 'users' ? (
            <Button title="+ User" onPress={() => setIsCreateUserModalVisible(true)} />
          ) : (
            <View style={{ width: 60 }} />
          )}
        </View>
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

        {viewingSection === 'dashboard' && (
          <AdminDashboardSection
            onViewPendingVerifications={() => setViewingSection('dashboard-pending-verification')}
          />
        )}
        {viewingSection === 'dashboard-pending-verification' && (
          <View>
            <Text style={appSharedStyles.sectionTitle}>
              {' '}
              Pending Verifications ({pendingVerifications.length}){' '}
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
                        <View style={adminPendingListStyles.pendingItem}>
                          <Text style={adminPendingListStyles.pendingTitle}>
                            Task: {item.taskTitle}
                          </Text>
                          <Text style={adminPendingListStyles.pendingDetail}>
                            Student: {studentSimple?.name ?? 'Unknown Student'}
                          </Text>
                          <Text style={adminPendingListStyles.pendingDetail}>
                            Potential Tickets: {item.taskBasePoints}
                          </Text>
                          <Text style={adminPendingListStyles.pendingDetail}>
                            Completed:{' '}
                            {item.completedDate
                              ? new Date(item.completedDate).toLocaleString()
                              : 'N/A'}
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
          />
        )}
        {viewingSection === 'tasks' && (
          <AdminTasksSection
            taskLibrary={taskLibrary}
            isLoading={libraryLoading}
            isError={libraryError ?? false}
            onInitiateAssignTask={handleInitiateAssignTaskGeneral}
            // Removed onInitiateVerification - it's triggered from other lists
          />
        )}
        {viewingSection === 'rewards' && <AdminRewardsSection />}
        {viewingSection === 'history' && <AdminHistorySection />}
        {viewingSection === 'announcements' && <AdminAnnouncementsSection />}
        {viewingSection === 'instruments' && <AdminInstrumentsSection />}
      </ScrollView>

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

      {viewingSection === 'tasks' && (
        <View style={{ alignItems: 'flex-start', paddingHorizontal: 15, paddingBottom: 20 }}>
          <Button title="View All Assigned Tasks" onPress={handleViewAllAssignedTasks} />
        </View>
      )}
    </SafeAreaView>
  );
};
