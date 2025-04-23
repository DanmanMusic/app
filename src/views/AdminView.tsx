import React, { useState, useMemo } from 'react';
import {
  View, Text, ScrollView, Button, FlatList, StyleSheet, ActivityIndicator, Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuth } from '../contexts/AuthContext';
// Removed useData
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { usePaginatedStudents } from '../hooks/usePaginatedStudents';
import { usePaginatedTeachers } from '../hooks/usePaginatedTeachers';
import { usePaginatedParents } from '../hooks/usePaginatedParents';
import { fetchInstruments } from '../api/instruments';
import { fetchAssignedTasks } from '../api/assignedTasks';

import { fetchTaskLibrary } from '../api/taskLibrary'; // Ensure this is imported
import { TaskLibraryItem } from '../mocks/mockTaskLibrary'; // Ensure this is imported

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
import { ViewAllAssignedTasksModal } from '../components/admin/modals/ViewAllAssignedTasksModal';

import { User, UserRole } from '../types/userTypes'; // Combined User types import
import { AssignedTask } from '../mocks/mockAssignedTasks';
import { Instrument } from '../mocks/mockInstruments';
import { AdminViewProps } from '../types/componentProps';

import { getUserDisplayName } from '../utils/helpers';
import { adminSharedStyles } from '../components/admin/adminSharedStyles';
import { appSharedStyles } from '../styles/appSharedStyles';
import { colors } from '../styles/colors';


// --- Define Styles needed specifically in AdminView ---
// Styles for the Pending Verification items list
const adminPendingListStyles = StyleSheet.create({
   pendingItem: {
    backgroundColor: colors.backgroundPrimary,
    padding: 12,
    marginBottom: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.borderWarning, // Highlight pending items
  },
  pendingTitle: {
      fontSize: 16,
      fontWeight: 'bold',
      marginBottom: 5,
      color: colors.textPrimary
  },
  pendingDetail: {
      fontSize: 14,
      color: colors.textSecondary,
      marginBottom: 3
  },
});

// General styles for AdminView layout (like header)
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
    minWidth: 60, // Ensure space even if button isn't there
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
  },
  headerTitle: {
    flex: 1, // Allow title to take available space
    fontSize: 22,
    fontWeight: 'bold',
    color: colors.textPrimary,
    textAlign: 'center',
    marginHorizontal: 5, // Add some spacing
  },
});
// --- End Style Definitions ---


type AdminSection =
  | 'dashboard'
  | 'dashboard-pending-verification'
  | 'users'
  | 'tasks'
  | 'rewards'
  | 'history'
  | 'announcements'
  | 'instruments';
// ---> END ADDITION <---

type UserTab = 'students' | 'teachers' | 'parents';

// Use the imported AdminViewProps type
export const AdminView: React.FC<AdminViewProps> = ({ onInitiateVerificationModal }) => {
  const { currentUserId } = useAuth();
  const queryClient = useQueryClient();

  // --- State ---
  const [viewingSection, setViewingSection] = useState<AdminSection>('dashboard');
  const [viewingStudentId, setViewingStudentId] = useState<string | null>(null);
  const [activeUserTab, setActiveUserTab] = useState<UserTab>('students');
  const [isCreateUserModalVisible, setIsCreateUserModalVisible] = useState(false);
  const [isAssignTaskModalVisible, setIsAssignTaskModalVisible] = useState(false);
  const [assignTaskTargetStudentId, setAssignTaskTargetStudentId] = useState<string | null>(null);
  const [isViewAllAssignedTasksModalVisible, setIsViewAllAssignedTasksModalVisible] = useState(false);

  // --- TQ Queries ---
  const { data: adminUser, isLoading: adminLoading } = useQuery<User, Error>({
      queryKey: ['user', currentUserId],
      queryFn: async () => { /* ... fetch admin user ... */
          if (!currentUserId) throw new Error("No admin user ID");
          const response = await fetch(`/api/users/${currentUserId}`);
          if (!response.ok) throw new Error("Failed to fetch admin user data");
          const userData = await response.json();
          if (userData.role !== 'admin') throw new Error ("User is not admin");
          return userData;
      },
      enabled: !!currentUserId,
      staleTime: 15 * 60 * 1000,
  });

  const {
    data: taskLibrary = [], // Default to empty array
    isLoading: libraryLoading,
    isError: libraryError // Boolean error flag from TQ
    // error: libraryErrorObject // Optional: get the full error object if needed
} = useQuery<TaskLibraryItem[], Error>({
    queryKey: ['task-library'], // Unique key for the task library data
    queryFn: fetchTaskLibrary, // The API function to fetch the data
    staleTime: 10 * 60 * 1000, // Cache library data for 10 minutes
});

const {
  students,
  currentPage: studentPage,         // <<< ADDED
  totalPages: studentTotalPages,    // <<< ADDED
  setPage: setStudentPage,          // <<< ADDED
  currentFilter: studentFilter,     // <<< Use the correct name from the hook
  setFilter: setStudentFilter,      // <<< Use the correct name from the hook
  searchTerm: studentSearchTerm,    // <<< Use the correct name from the hook
  setSearchTerm: setStudentSearchTerm, // <<< Use the correct name from the hook
  isLoading: isStudentListLoading,
  isFetching: isStudentListFetching,
  isError: isStudentListError,
  error: studentListError
} = usePaginatedStudents(); 

const {
  teachers,
  currentPage: teacherPage,         // <<< ADDED
  totalPages: teacherTotalPages,    // <<< ADDED
  setPage: setTeacherPage,          // <<< ADDED
  isLoading: isTeacherListLoading,
  isFetching: isTeacherListFetching,
  isError: isTeacherListError,
  error: teacherListError
} = usePaginatedTeachers();

const {
  parents,
  currentPage: parentPage,          // <<< ADDED
  totalPages: parentTotalPages,     // <<< ADDED
  setPage: setParentPage,           // <<< ADDED
  isLoading: isParentListLoading,
  isFetching: isParentListFetching,
  isError: isParentListError,
  error: parentListError
} = usePaginatedParents();

  const { data: fetchedInstruments = [], isLoading: instrumentsLoading } = useQuery<Instrument[],Error>({
    queryKey: ['instruments'],
    queryFn: fetchInstruments,
    staleTime: Infinity,
    gcTime: Infinity,
  });

  const {
      data: assignedTasksResult,
      isLoading: assignedTasksLoading,
      isError: assignedTasksError,
      error: assignedTasksErrorMsg
  } = useQuery({
      queryKey: ['assigned-tasks', { assignmentStatus: 'pending', studentStatus: 'active' }],
      queryFn: () => fetchAssignedTasks({ assignmentStatus: 'pending', studentStatus: 'active', limit: 1000 }),
      staleTime: 1 * 60 * 1000,
  });
  const pendingTasks = assignedTasksResult?.items ?? [];

  // --- Memos / Derived State ---
  const allTeachersForModal = useMemo(() => teachers.filter(t => t.status === 'active'), [teachers]);
  const pendingVerifications = pendingTasks;

  // --- Event Handlers ---
  const handleViewManageUser = (userId: string, role: UserRole) => { /* ... */ };
  const handleBackFromStudentDetail = () => { /* ... */ };
  const handleInternalInitiateVerificationModal = (task: AssignedTask) => { /* ... */ };
  const handleInitiateAssignTaskForStudent = (studentId: string) => { /* ... */ };
  const handleInitiateAssignTaskGeneral = () => { /* ... */ };
  const handleAssignTaskModalClose = () => { /* ... */ };
  const handleViewAllAssignedTasks = () => { /* ... */ };
  const handleViewAllAssignedTasksModalClose = () => { /* ... */ };


  // --- Render Logic ---
  const isLoadingCoreData = adminLoading || instrumentsLoading;
  if (isLoadingCoreData) { /* ... loading indicator ... */ }
  if (!adminUser) { /* ... error display ... */ }

  // Student Detail View Render
  if (viewingStudentId) {
      return (
        <AdminStudentDetailView
          viewingStudentId={viewingStudentId}
          adminUserName={adminUser ? getUserDisplayName(adminUser) : 'Admin'}
          onBack={handleBackFromStudentDetail}
          onInitiateVerification={handleInternalInitiateVerificationModal}
          onAssignTask={() => handleInitiateAssignTaskForStudent(viewingStudentId)}
        />
      );
  }

  // Main Admin View Render
  const showBackButton = viewingSection !== 'dashboard';
  const isUsersLoading = isStudentListLoading || isTeacherListLoading || isParentListLoading;

  return (
    <SafeAreaView style={appSharedStyles.safeArea}>
      {/* Header - uses `styles` */}
      <View style={styles.headerContainer}>
         <View style={styles.headerSideContainer}>
          { showBackButton ? (<Button title="← Back" onPress={() => setViewingSection('dashboard')} />) : (<View style={{ width: 60 }} />) }
         </View>
         <Text style={styles.headerTitle} numberOfLines={1} ellipsizeMode="tail">
          Admin: {getUserDisplayName(adminUser)}
         </Text>
         <View style={styles.headerSideContainer}>
          { viewingSection === 'users' ? (<Button title="+ User" onPress={() => setIsCreateUserModalVisible(true)} />) : (<View style={{ width: 60 }} />) }
         </View>
      </View>

      {/* Scrollable Content - uses `appSharedStyles` */}
      <ScrollView style={appSharedStyles.container}>
        {/* Nav - uses `adminSharedStyles` */}
        {viewingSection !== 'dashboard-pending-verification' && (
          <View style={adminSharedStyles.adminNav}>
            { /* Nav Buttons... */ }
             <Button title="Dashboard" onPress={() => setViewingSection('dashboard')} color={viewingSection === 'dashboard' ? colors.primary : colors.secondary}/>
            <Button title="Users" onPress={() => setViewingSection('users')} color={viewingSection === 'users' ? colors.primary : colors.secondary}/>
            <Button title="Tasks" onPress={() => setViewingSection('tasks')} color={viewingSection === 'tasks' ? colors.primary : colors.secondary}/>
            <Button title="Rewards" onPress={() => setViewingSection('rewards')} color={viewingSection === 'rewards' ? colors.primary : colors.secondary}/>
            <Button title="History" onPress={() => setViewingSection('history')} color={viewingSection === 'history' ? colors.primary : colors.secondary}/>
            <Button title="Announcements" onPress={() => setViewingSection('announcements')} color={viewingSection === 'announcements' ? colors.primary : colors.secondary}/>
            <Button title="Instruments" onPress={() => setViewingSection('instruments')} color={viewingSection === 'instruments' ? colors.primary : colors.secondary}/>
          </View>
        )}

        {/* Dashboard Section */}
        {viewingSection === 'dashboard' && (
          <AdminDashboardSection
            onViewPendingVerifications={() => setViewingSection('dashboard-pending-verification')}
          />
        )}
        {/* Pending Verification Section - uses `appSharedStyles` and `adminPendingListStyles` */}
        {viewingSection === 'dashboard-pending-verification' && (
          <View>
            <Text style={appSharedStyles.sectionTitle}> Pending Verifications ({pendingVerifications.length}) </Text>
             {assignedTasksLoading && <ActivityIndicator style={{ marginVertical: 10 }} color={colors.primary}/>}
             {assignedTasksError && <Text style={[appSharedStyles.textDanger, { marginVertical: 10 }]}>Error loading tasks: {assignedTasksErrorMsg?.message}</Text>}
             {!assignedTasksLoading && !assignedTasksError && (
                <>
                    {pendingVerifications.length > 0 ? (
                    <FlatList
                        data={pendingVerifications.sort( (a, b) => new Date(a.completedDate || a.assignedDate).getTime() - new Date(b.completedDate || b.assignedDate).getTime() )}
                        keyExtractor={item => item.id}
                        renderItem={({ item }) => {
                            const studentSimple = students.find(s => s.id === item.studentId);
                            return (
                                // Uses adminPendingListStyles
                                <View style={adminPendingListStyles.pendingItem}>
                                    <Text style={adminPendingListStyles.pendingTitle}>Task: {item.taskTitle}</Text>
                                    <Text style={adminPendingListStyles.pendingDetail}>Student: {studentSimple?.name ?? 'Unknown Student'}</Text>
                                    <Text style={adminPendingListStyles.pendingDetail}>Potential Tickets: {item.taskBasePoints}</Text>
                                    <Text style={adminPendingListStyles.pendingDetail}>Completed: {item.completedDate ? new Date(item.completedDate).toLocaleString() : 'N/A'}</Text>
                                    <View style={{ marginTop: 10 }}>
                                        <Button title="Verify Task" onPress={() => handleInternalInitiateVerificationModal(item)}/>
                                    </View>
                                </View>
                            );
                        }}
                        scrollEnabled={false}
                        ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
                        ListEmptyComponent={() => ( <Text style={appSharedStyles.emptyListText}>No tasks pending verification.</Text> )}
                    />
                    ) : ( <Text style={appSharedStyles.emptyListText}>No tasks pending verification.</Text> )}
                </>
             )}
          </View>
        )}
        {/* Users Section - Uses imported component which uses its own/shared styles */}
        {viewingSection === 'users' && (
          <AdminUsersSection
            displayData={ activeUserTab === 'students' ? students : activeUserTab === 'teachers' ? teachers : parents }
            currentPage={ activeUserTab === 'students' ? studentPage : activeUserTab === 'teachers' ? teacherPage : parentPage }
            totalPages={ activeUserTab === 'students' ? studentTotalPages : activeUserTab === 'teachers' ? teacherTotalPages : parentTotalPages }
            setPage={ activeUserTab === 'students' ? setStudentPage : activeUserTab === 'teachers' ? setTeacherPage : setParentPage }
            activeTab={activeUserTab}
            setActiveTab={setActiveUserTab}
            studentFilter={studentFilter}
            setStudentFilter={setStudentFilter}
            studentSearchTerm={studentSearchTerm}
            setStudentSearchTerm={setStudentSearchTerm}
            isLoading={isUsersLoading}
            isFetching={ activeUserTab === 'students' ? isStudentListFetching : activeUserTab === 'teachers' ? isTeacherListFetching : isParentListFetching }
            isError={ activeUserTab === 'students' ? isStudentListError : activeUserTab === 'teachers' ? isTeacherListError : isParentListError }
            error={ activeUserTab === 'students' ? studentListError : activeUserTab === 'teachers' ? teacherListError : parentListError }
            mockInstruments={fetchedInstruments}
            onViewManageUser={handleViewManageUser}
            onInitiateAssignTaskForStudent={handleInitiateAssignTaskForStudent}
          />
        )}
        {/* Other Sections - Use imported components */}
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
      </ScrollView>

      {/* Modals */}
      <CreateUserModal
        visible={isCreateUserModalVisible}
        onClose={() => setIsCreateUserModalVisible(false)}
        allTeachers={allTeachersForModal}
        mockInstruments={fetchedInstruments}
      />
      <AssignTaskModal
        visible={isAssignTaskModalVisible}
        onClose={handleAssignTaskModalClose}
        allStudents={students.filter(s => s.isActive)}
        preselectedStudentId={assignTaskTargetStudentId}
      />
      <ViewAllAssignedTasksModal
        visible={isViewAllAssignedTasksModalVisible}
        onClose={handleViewAllAssignedTasksModalClose}
        onInitiateVerification={handleInternalInitiateVerificationModal}
      />

      {/* View All Tasks Button */}
      {viewingSection === 'tasks' && (
        <View style={{ alignItems: 'flex-start', paddingHorizontal: 15, paddingBottom: 20 }}>
          <Button title="View All Assigned Tasks" onPress={handleViewAllAssignedTasks} />
        </View>
      )}
    </SafeAreaView>
  );
};