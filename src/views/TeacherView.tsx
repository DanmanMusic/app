// src/views/TeacherView.tsx
import React, { useState, useMemo } from 'react'; // Added useMemo
import { useQuery, useQueryClient } from '@tanstack/react-query'; // Removed useMutation as edits happen in modals
import { View, Text, ScrollView, Button, ActivityIndicator, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';

// Import Supabase-backed API functions
import { fetchInstruments } from '../api/instruments';
import { fetchUserProfile } from '../api/users'; // To fetch teacher profile

// Import Child Section Components
import { TeacherDashboardSection } from '../components/teacher/TeacherDashboardSection'; // Uses fetchAssignedTasks (pending)
import { TeacherStudentsSection } from '../components/teacher/TeacherStudentsSection';   // Uses usePaginatedStudents hook
import { TeacherTasksSection } from '../components/teacher/TeacherTasksSection';       // Uses fetchTaskLibrary

// Import Detail View (Student Detail)
import { AdminStudentDetailView } from '../components/admin/AdminStudentDetailView'; // Reusing admin's detail view

// Import Modals
import AssignTaskModal from '../components/common/AssignTaskModal';         // Reads students/library, create deferred
import TaskVerificationModal from '../components/common/TaskVerificationModal'; // Reads user, update deferred
import EditUserModal from '../components/common/EditUserModal';             // Uses Supabase updateUser (profile fields)

// Import Context & Types
import { useAuth } from '../contexts/AuthContext';
import { TeacherViewProps } from '../types/componentProps'; // Keep props for handler from App.tsx
import { AssignedTask, Instrument, User } from '../types/dataTypes';

// Import Styles & Helpers
import { getUserDisplayName } from '../utils/helpers';
import { appSharedStyles } from '../styles/appSharedStyles';
import { commonSharedStyles } from '../styles/commonSharedStyles'; // For errors
import { colors } from '../styles/colors';


type TeacherSection = 'dashboard' | 'students' | 'tasks';

// Note: TeacherViewProps currently only includes onInitiateVerificationModal from App.tsx
// We might pass other handlers down if needed, but modals mostly handle their own logic now.
export const TeacherView: React.FC<TeacherViewProps> = ({ onInitiateVerificationModal }) => {
  const { currentUserId: teacherId } = useAuth(); // Get logged-in teacher's ID
  const queryClient = useQueryClient();

  // --- State Management ---
  // Main view state
  const [viewingSection, setViewingSection] = useState<TeacherSection>('dashboard');
  // State for student detail view navigation
  const [viewingStudentId, setViewingStudentId] = useState<string | null>(null);
  // Modal visibility states
  const [isAssignTaskModalVisible, setIsAssignTaskModalVisible] = useState(false);
  const [assignTaskTargetStudentId, setAssignTaskTargetStudentId] = useState<string | null>(null);
  // Verification Modal state (uses prop handler from App.tsx, no internal state needed here)
  // const [isVerificationModalVisible, setIsVerificationModalVisible] = useState(false);
  // const [taskToVerify, setTaskToVerify] = useState<AssignedTask | null>(null);
  const [isEditStudentModalVisible, setIsEditStudentModalVisible] = useState(false);
  const [studentToEdit, setStudentToEdit] = useState<User | null>(null); // Store student to edit

  // --- Data Fetching ---
  // Fetch Teacher's own profile
  const {
    data: teacherUser,
    isLoading: teacherLoading,
    isError: teacherError,
    error: teacherErrorMsg,
  } = useQuery<User | null, Error>({
    queryKey: ['userProfile', teacherId], // Use profile key
    queryFn: () => fetchUserProfile(teacherId!), // Fetch own profile
    enabled: !!teacherId,
    staleTime: 15 * 60 * 1000, // Cache teacher profile longer
  });

  // Fetch Instruments (needed for student list display)
  const {
    data: fetchedInstruments = [],
    isLoading: instrumentsLoading,
    isError: instrumentsError, // Add error handling if needed
    error: instrumentsErrorMsg,
  } = useQuery<Instrument[], Error>({
    queryKey: ['instruments'],
    queryFn: fetchInstruments,
    staleTime: Infinity,
  });


  // --- Memoized Values ---
  const teacherDisplayName = useMemo(() => teacherUser ? getUserDisplayName(teacherUser) : 'Loading...', [teacherUser]);


  // --- Event Handlers ---
  // Navigate to student detail
  const handleViewProfile = (studentId: string) => {
    setViewingStudentId(studentId);
  };
  // Navigate back from student detail
  const handleBackFromProfile = () => {
    setViewingStudentId(null);
  };

  // Trigger Assign Task Modal (for specific student)
  const handleInitiateAssignTaskForStudent = (studentId: string) => {
    setAssignTaskTargetStudentId(studentId);
    setIsAssignTaskModalVisible(true);
  };
  // Trigger Assign Task Modal (general, student selected inside)
  const handleInitiateAssignTaskGeneral = () => {
    setAssignTaskTargetStudentId(null); // No preselection
    setIsAssignTaskModalVisible(true);
  };
  // Close Assign Task Modal
  const handleAssignTaskModalClose = () => {
    setIsAssignTaskModalVisible(false);
    setAssignTaskTargetStudentId(null);
  };

  // Trigger Verification Modal (using handler passed from App.tsx)
  const handleInternalInitiateVerification = (task: AssignedTask) => {
     if (onInitiateVerificationModal) {
       onInitiateVerificationModal(task);
     } else {
        console.error("TeacherView: onInitiateVerificationModal prop is missing!");
        Toast.show({type: 'error', text1: 'Error', text2:'Verification handler not configured.'});
     }
  };

  // Trigger Edit Student Modal
  const handleInitiateEditUser = (user: User) => {
    if (user.role === 'student') {
      setStudentToEdit(user);
      setIsEditStudentModalVisible(true);
    } else {
      // This case shouldn't be reachable from TeacherView's UI flow
      Toast.show({ type: 'error', text1: 'Invalid Action', text2: 'Cannot edit non-student users here.' });
    }
  };
  // Close Edit Student Modal
  const handleCloseEditUserModal = () => {
    setIsEditStudentModalVisible(false);
    setStudentToEdit(null);
  };


  // --- Loading & Error States ---
  const isLoading = teacherLoading || instrumentsLoading; // Core data needed for view rendering

  if (isLoading) {
    return (
      <SafeAreaView style={appSharedStyles.safeArea}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading Teacher Data...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (teacherError || !teacherUser) {
    return (
      <SafeAreaView style={appSharedStyles.safeArea}>
        <View style={appSharedStyles.container}>
          <Text style={commonSharedStyles.errorText}>
              Error loading teacher data: {teacherErrorMsg?.message || "Not found."}
          </Text>
        </View>
      </SafeAreaView>
    );
  }
   if (teacherUser.role !== 'teacher') {
      return (
         <SafeAreaView style={appSharedStyles.safeArea}>
             <View style={appSharedStyles.container}>
                 <Text style={commonSharedStyles.errorText}>Error: Logged in user is not a teacher.</Text>
             </View>
         </SafeAreaView>
       );
   }
   if (teacherUser.status === 'inactive') {
       return (
          <SafeAreaView style={appSharedStyles.safeArea}>
              <View style={appSharedStyles.container}>
                  <Text style={appSharedStyles.header}>Account Inactive</Text>
                  <Text style={commonSharedStyles.textCenter}>Your teacher account is currently inactive.</Text>
              </View>
          </SafeAreaView>
        );
   }


  // --- Render Logic ---
  const renderMainContent = () => {
    // Show Student Detail View if a student is selected
    if (viewingStudentId) {
      return (
        // Reuse AdminStudentDetailView, passing only relevant handlers for Teacher role
        <AdminStudentDetailView
          viewingStudentId={viewingStudentId}
          onInitiateVerification={handleInternalInitiateVerification} // Teacher can verify
          onInitiateAssignTaskForStudent={handleInitiateAssignTaskForStudent} // Teacher can assign
          onInitiateEditStudent={handleInitiateEditUser} // Teacher can edit basic info
          // Teachers cannot manage status, adjust tickets, or redeem rewards directly here
          // onInitiateStatusUser={undefined}
          // onInitiateTicketAdjustment={undefined}
          // onInitiateRedemption={undefined}
          // Teachers likely cannot delete assigned tasks from detail view?
          // onInitiateDeleteTask={undefined}
        />
      );
    }

    // Otherwise, show the selected Teacher Section
    return (
      <ScrollView style={appSharedStyles.container}>
        <View style={appSharedStyles.teacherNav}>
          <Button
            title="Dashboard"
            onPress={() => setViewingSection('dashboard')}
            color={viewingSection === 'dashboard' ? colors.primary : colors.secondary}
          />
          <Button
            title="My Students"
            onPress={() => setViewingSection('students')}
            color={viewingSection === 'students' ? colors.primary : colors.secondary}
          />
          <Button
            title="Tasks"
            onPress={() => setViewingSection('tasks')}
            color={viewingSection === 'tasks' ? colors.primary : colors.secondary}
          />
        </View>

        {viewingSection === 'dashboard' && (
          // Pass verification handler down
          <TeacherDashboardSection onInitiateVerificationModal={handleInternalInitiateVerification} />
        )}
        {viewingSection === 'students' && (
          // Pass instruments and handlers down
          <TeacherStudentsSection
            instruments={fetchedInstruments}
            onViewProfile={handleViewProfile}
            onAssignTask={handleInitiateAssignTaskForStudent}
          />
        )}
        {viewingSection === 'tasks' && (
          // Pass general assign handler down
          <TeacherTasksSection onInitiateAssignTaskGeneral={handleInitiateAssignTaskGeneral} />
        )}
         <View style={{ height: 40 }} /> {/* Bottom padding */}
      </ScrollView>
    );
  };

  // Determine Header Title
  const getHeaderTitle = () => {
    if (viewingStudentId) {
       // Fetch student name for header (could use queryClient.getQueryData or let detail view handle title)
       // For simplicity, use a generic title here, detail view shows name internally
       return `Viewing Student`;
    }
    return `Teacher: ${teacherDisplayName}`;
  };

  const showBackButton = !!viewingStudentId;

  return (
    <SafeAreaView style={appSharedStyles.safeArea}>
      {/* Header */}
      <View style={appSharedStyles.headerContainer}>
        <View style={appSharedStyles.headerSideContainer}>
          {showBackButton ? (
            <Button title="← Back" onPress={handleBackFromProfile} />
          ) : (
            <View style={{ width: 60 }} /> // Placeholder for alignment
          )}
        </View>
        <Text style={appSharedStyles.headerTitle} numberOfLines={1} ellipsizeMode="tail">
          {getHeaderTitle()}
        </Text>
        <View style={appSharedStyles.headerSideContainer} />{/* Placeholder */}
      </View>

      {/* Main Content Area */}
      {renderMainContent()}

      {/* Modals */}
      <AssignTaskModal
        visible={isAssignTaskModalVisible}
        onClose={handleAssignTaskModalClose}
        preselectedStudentId={assignTaskTargetStudentId}
      />
      {/* TaskVerificationModal is rendered in App.tsx, triggered by onInitiateVerificationModal prop */}
      <EditUserModal
        visible={isEditStudentModalVisible}
        userToEdit={studentToEdit}
        onClose={handleCloseEditUserModal}
        // instruments prop removed, modal fetches its own
      />
    </SafeAreaView>
  );
};

// Local Styles
const styles = StyleSheet.create({
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
     marginTop: 10,
     color: colors.textSecondary,
  }
});