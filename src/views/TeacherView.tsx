// src/views/TeacherView.tsx
import React, { useState, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { View, Text, ScrollView, Button, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';

// API Imports
import { fetchUserProfile } from '../api/users'; // Combined imports

// Component Imports
import { TeacherDashboardSection } from '../components/teacher/TeacherDashboardSection';
import { TeacherStudentsSection } from '../components/teacher/TeacherStudentsSection';
import { TeacherTasksSection } from '../components/teacher/TeacherTasksSection';
import { AdminStudentDetailView } from '../components/admin/AdminStudentDetailView'; // Reusing Admin's student detail view
import SetEmailPasswordModal from '../components/common/SetEmailPasswordModal';
import AssignTaskModal from '../components/common/AssignTaskModal';
import EditUserModal from '../components/common/EditUserModal';
import GeneratePinModal from '../components/common/GeneratePinModal';

// Context & Type Imports
import { useAuth } from '../contexts/AuthContext';
import { TeacherViewProps } from '../types/componentProps';
import { AssignedTask, Instrument, User } from '../types/dataTypes';

// Style & Helper Imports
import { getUserDisplayName } from '../utils/helpers';
import { appSharedStyles } from '../styles/appSharedStyles';
import { commonSharedStyles } from '../styles/commonSharedStyles';
import { colors } from '../styles/colors';
import { fetchInstruments } from '../api/instruments';

// Type for the main sections displayed
type TeacherSection = 'dashboard' | 'students' | 'tasks';

export const TeacherView: React.FC<TeacherViewProps> = ({ onInitiateVerificationModal }) => {
  const { currentUserId: teacherId } = useAuth();
  const queryClient = useQueryClient(); // Not currently used, but keep for potential future mutations

  // State for UI control
  const [viewingSection, setViewingSection] = useState<TeacherSection>('dashboard');
  const [viewingStudentId, setViewingStudentId] = useState<string | null>(null); // Track selected student for detail view
  const [isAssignTaskModalVisible, setIsAssignTaskModalVisible] = useState(false);
  const [assignTaskTargetStudentId, setAssignTaskTargetStudentId] = useState<string | null>(null); // For pre-selecting student in modal
  const [isEditStudentModalVisible, setIsEditStudentModalVisible] = useState(false);
  const [studentToEdit, setStudentToEdit] = useState<User | null>(null); // User object for edit modal
  const [isSetCredentialsModalVisible, setIsSetCredentialsModalVisible] = useState(false);
  const [isGeneratePinModalVisible, setIsGeneratePinModalVisible] = useState(false);
  const [userForPin, setUserForPin] = useState<User | null>(null); // User object for PIN modal

  // --- Data Fetching Hooks (Called Unconditionally) ---

  // Fetch the logged-in teacher's profile
  const {
    data: teacherUser,
    isLoading: teacherLoading,
    isError: teacherError,
    error: teacherErrorMsg,
  } = useQuery<User | null, Error>({
    queryKey: ['userProfile', teacherId],
    queryFn: () => (teacherId ? fetchUserProfile(teacherId) : Promise.resolve(null)), // Fetch only if teacherId exists
    enabled: !!teacherId, // Enable query only when teacherId is available
    staleTime: 15 * 60 * 1000, // Cache teacher profile for 15 mins
  });

  // Fetch the list of all instruments (cached indefinitely)
  const {
    data: fetchedInstruments = [],
    isLoading: instrumentsLoading,
    isError: instrumentsError, // Consider adding error display for this if critical
    error: instrumentsErrorMsg,
  } = useQuery<Instrument[], Error>({
    queryKey: ['instruments'],
    queryFn: fetchInstruments,
    staleTime: Infinity, // Instruments don't change often
  });

  // Fetch the profile of the student being viewed (runs only when viewingStudentId is set)
  const {
    data: studentDetailUser,
    isLoading: studentDetailLoading,
    isError: studentDetailError,
    error: studentDetailErrorMsg,
  } = useQuery<User | null, Error>({
    queryKey: ['userProfile', viewingStudentId], // Query key includes the specific student ID
    queryFn: () => {
      if (!viewingStudentId) {
        console.warn('[TeacherView] studentDetailUser queryFn called without viewingStudentId.');
        return Promise.resolve(null); // Return null if no ID
      }
      console.log(`[TeacherView] Fetching profile for student: ${viewingStudentId}`);
      return fetchUserProfile(viewingStudentId); // Fetch the specific student
    },
    enabled: !!viewingStudentId, // CRITICAL: Only run the query when viewingStudentId has a value
    staleTime: 1 * 60 * 1000, // Cache student detail for 1 min
    refetchOnWindowFocus: true,
  });

  // --- Memoized Values ---
  const teacherDisplayName = useMemo(
    () => (teacherUser ? getUserDisplayName(teacherUser) : 'Loading...'),
    [teacherUser]
  );

  // --- Event Handlers ---
  const handleViewProfile = (studentId: string) => setViewingStudentId(studentId);
  const handleBackFromProfile = () => setViewingStudentId(null);

  const handleInitiateAssignTaskForStudent = (studentId: string) => {
    setAssignTaskTargetStudentId(studentId);
    setIsAssignTaskModalVisible(true);
  };
  const handleInitiateAssignTaskGeneral = () => {
    setAssignTaskTargetStudentId(null); // No preselection
    setIsAssignTaskModalVisible(true);
  };
  const handleAssignTaskModalClose = () => {
    setIsAssignTaskModalVisible(false);
    setAssignTaskTargetStudentId(null);
  };

  // Wrapper for verification modal prop
  const handleInternalInitiateVerification = (task: AssignedTask) => {
    if (onInitiateVerificationModal) {
      onInitiateVerificationModal(task);
    } else {
      console.error('TeacherView: onInitiateVerificationModal prop is missing!');
      Toast.show({ type: 'error', text1: 'Error', text2: 'Verification handler not configured.' });
    }
  };

  // Handler to open Edit modal (only for students in this view)
  const handleInitiateEditUser = (user: User) => {
    if (user.role === 'student') {
      setStudentToEdit(user);
      setIsEditStudentModalVisible(true);
    } else {
      Toast.show({
        type: 'error',
        text1: 'Invalid Action',
        text2: 'Cannot edit non-student users here.',
      });
    }
  };
  const handleCloseEditUserModal = () => {
    setIsEditStudentModalVisible(false);
    setStudentToEdit(null);
  };

  // Handler to open PIN generation modal
  const handleInitiatePinGeneration = (user: User | null) => {
    if (user) {
      // Ensure user data is available
      setUserForPin(user);
      setIsGeneratePinModalVisible(true);
    } else {
      console.warn('Attempted PIN generation before student detail loaded or for null user.');
      Toast.show({ type: 'info', text1: 'Info', text2: 'Loading student data...' });
    }
  };
  const handleClosePinGeneration = () => {
    setIsGeneratePinModalVisible(false);
    setUserForPin(null);
  };

  // --- Loading and Error States ---
  const isLoadingCore = teacherLoading || instrumentsLoading;

  if (isLoadingCore) {
    return (
      <SafeAreaView style={appSharedStyles.safeArea}>
        <View style={appSharedStyles.centered}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={appSharedStyles.loadingText}>Loading Teacher Data...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (teacherError || !teacherUser) {
    return (
      <SafeAreaView style={appSharedStyles.safeArea}>
        <View style={appSharedStyles.container}>
          <Text style={commonSharedStyles.errorText}>
            Error loading teacher data: {teacherErrorMsg?.message || 'Not found.'}
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
          <Text style={appSharedStyles.textCenter}>
            Your teacher account is currently inactive.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  // --- Main Content Rendering Logic ---
  const renderMainContent = () => {
    // If viewing a specific student profile
    if (viewingStudentId) {
      if (studentDetailLoading) {
        return (
          <View style={appSharedStyles.centered}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={appSharedStyles.loadingText}>Loading Student Details...</Text>
          </View>
        );
      }
      if (studentDetailError || !studentDetailUser) {
        return (
          <View style={appSharedStyles.container}>
            <Text style={commonSharedStyles.errorText}>
              Error loading student details:{' '}
              {studentDetailErrorMsg?.message || 'Student not found or error occurred.'}
            </Text>
            {/* Provide a way back if loading fails */}
            <Button title="Back to My Students" onPress={handleBackFromProfile} />
          </View>
        );
      }
      // Render the student detail view component
      return (
        <AdminStudentDetailView
          viewingStudentId={viewingStudentId}
          onInitiateVerification={handleInternalInitiateVerification}
          onInitiateAssignTaskForStudent={handleInitiateAssignTaskForStudent}
          onInitiateEditStudent={handleInitiateEditUser}
          // Only pass PIN generation if data is loaded
          onInitiatePinGeneration={
            studentDetailUser ? () => handleInitiatePinGeneration(studentDetailUser) : undefined
          }
          // Remove props irrelevant for teacher's view of student
          // onInitiateStatusUser={...}
          // onInitiateTicketAdjustment={...}
          // onInitiateRedemption={...}
        />
      );
    }

    // Otherwise, render the main teacher dashboard/sections
    return (
      <ScrollView style={appSharedStyles.container}>
        {/* Navigation Tabs */}
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
          <Button
            title="Set Email/Password"
            onPress={() => setIsSetCredentialsModalVisible(true)}
            color={colors.info}
          />
        </View>

        {/* Conditional Section Rendering */}
        {viewingSection === 'dashboard' && (
          <TeacherDashboardSection
            onInitiateVerificationModal={handleInternalInitiateVerification}
          />
        )}
        {viewingSection === 'students' && (
          <TeacherStudentsSection
            instruments={fetchedInstruments}
            onViewProfile={handleViewProfile}
            onAssignTask={handleInitiateAssignTaskForStudent}
          />
        )}
        {viewingSection === 'tasks' && (
          <TeacherTasksSection onInitiateAssignTaskGeneral={handleInitiateAssignTaskGeneral} />
        )}
        <View style={{ height: 40 }} />
        {/* Spacer at bottom */}
      </ScrollView>
    );
  };

  // --- Header Title Logic ---
  const getHeaderTitle = () => {
    if (viewingStudentId) {
      // Show student name in header if loaded, otherwise 'Loading...'
      return `Viewing: ${studentDetailUser ? getUserDisplayName(studentDetailUser) : studentDetailLoading ? 'Loading...' : 'Error'}`;
    }
    // Default header for teacher view
    return `Teacher: ${teacherDisplayName}`;
  };

  const showBackButton = !!viewingStudentId;

  // --- Component Return ---
  return (
    <SafeAreaView style={appSharedStyles.safeArea}>
      {/* Header */}
      <View style={appSharedStyles.headerContainer}>
        <View style={appSharedStyles.headerSideContainer}>
          {showBackButton ? (
            <Button title="← Back" onPress={handleBackFromProfile} />
          ) : (
            <View style={{ width: 60 }} /> /* Placeholder */
          )}
        </View>
        <Text style={appSharedStyles.headerTitle} numberOfLines={1} ellipsizeMode="tail">
          {getHeaderTitle()}
        </Text>
        <View style={appSharedStyles.headerSideContainer} />
        {/* Placeholder for right side */}
      </View>

      {/* Main Content Area */}
      {renderMainContent()}

      {/* Modals */}
      <SetEmailPasswordModal
        visible={isSetCredentialsModalVisible}
        onClose={() => setIsSetCredentialsModalVisible(false)}
      />
      <AssignTaskModal
        visible={isAssignTaskModalVisible}
        onClose={handleAssignTaskModalClose}
        preselectedStudentId={assignTaskTargetStudentId}
      />
      <EditUserModal
        visible={isEditStudentModalVisible}
        userToEdit={studentToEdit}
        onClose={handleCloseEditUserModal}
      />
      <GeneratePinModal
        visible={isGeneratePinModalVisible}
        user={userForPin}
        onClose={handleClosePinGeneration}
      />
    </SafeAreaView>
  );
};
