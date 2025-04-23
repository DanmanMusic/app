// App.tsx
import React, { useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View, Button, Platform } from 'react-native'; // Added Platform
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'; // Added TQ imports

// Contexts & Views
import { AuthProvider, useAuth } from './src/contexts/AuthContext';
import { DataProvider, useData } from './src/contexts/DataContext';
import { PublicView } from './src/views/PublicView';
import { StudentView } from './src/views/StudentView';
import { TeacherView } from './src/views/TeacherView';
import { ParentView } from './src/views/ParentView';
import { AdminView } from './src/views/AdminView';

// Components & Types
import TaskVerificationModal from './src/components/TaskVerificationModal';
import { AssignedTask, TaskVerificationStatus } from './src/mocks/mockAssignedTasks';

// Utils & Styles
import { colors } from './src/styles/colors';
import { getUserDisplayName } from './src/utils/helpers';

// MSW Initialization - START
if (__DEV__) {
  // Only run MSW in development
  console.log('[MSW] Development mode detected. Initializing MSW...');
  // Conditional import based on platform
  if (Platform.OS === 'web') {
    import('./src/mocks/browser') // Adjusted path
      .then(({ worker }) => {
        console.log('[MSW] Starting worker for web...');
        worker.start({
          onUnhandledRequest: 'bypass', // Allow unhandled requests (like static assets)
        });
        console.log('[MSW] Web worker started.');
      })
      .catch(err => console.error('[MSW] Web worker failed to start:', err));
  } else {
    import('./src/mocks/server') // Adjusted path
      .then(({ server }) => {
        console.log('[MSW] Starting server for native...');
        server.listen({
          onUnhandledRequest: 'bypass',
        });
        console.log('[MSW] Native server started.');
      })
      .catch(err => console.error('[MSW] Native server failed to start:', err));
  }
}
// MSW Initialization - END

// Create a client instance for TanStack Query
const queryClient = new QueryClient();

const DevelopmentViewSelector = () => {
  const { setMockAuthState } = useAuth();
  // Use TQ to get users? Or keep context for initial selector? Keep context for now.
  const { currentMockUsers } = useData();

  return (
    <View style={styles.selectorContainer}>
      <Text style={styles.selectorTitle}>Development Mode: Select User Role</Text>

      <Button
        title="View as Public (Not Logged In)"
        onPress={() => setMockAuthState({ role: 'public' })}
        color={colors.secondary}
      />

      {Object.values(currentMockUsers).map(user => (
        <Button
          key={user.id}
          title={`Login as ${getUserDisplayName(user)} (${user.role})`}
          onPress={() => {
            let viewingStudentId: string | undefined;
            if (user.role === 'student') {
              viewingStudentId = user.id;
            } else if (user.role === 'parent') {
              // Auto-select first linked student if only one exists
              if (user.linkedStudentIds && user.linkedStudentIds.length === 1) {
                viewingStudentId = user.linkedStudentIds[0];
              }
              // If multiple, ParentView will handle selection
            } else if (user.role === 'teacher') {
              // Find *any* active student linked to this teacher for initial view
              viewingStudentId = Object.values(currentMockUsers).find(
                u =>
                  u.role === 'student' &&
                  u.status === 'active' &&
                  u.linkedTeacherIds?.includes(user.id)
              )?.id;
            }
            setMockAuthState({ role: user.role, userId: user.id, viewingStudentId });
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

const AppContent = () => {
  const { mockAuthState, setMockAuthState, currentUserRole, currentUserId } = useAuth();
  // Still use DataContext for simulations not yet migrated
  const {
    currentMockUsers, // Needed for user lookups
    simulateVerifyTask, // Keep for now
    simulateReassignTask, // Keep for now
    // taskLibrary, // No longer needed directly here
  } = useData();

  const [isVerificationModalVisible, setIsVerificationModalVisible] = useState(false);
  const [taskToVerify, setTaskToVerify] = useState<AssignedTask | null>(null);

  const handleInitiateVerificationModal = (task: AssignedTask) => {
    setTaskToVerify(task);
    setIsVerificationModalVisible(true);
  };

  const handleCloseVerificationModal = () => {
    setIsVerificationModalVisible(false);
    setTaskToVerify(null);
  };

  // Keep using simulation functions from DataContext for now
  const handleVerifyTask = (
    taskId: string,
    status: TaskVerificationStatus,
    actualTickets: number
  ) => {
    simulateVerifyTask(taskId, status, actualTickets, currentUserId); // Pass verifierId
    handleCloseVerificationModal(); // Close modal after verification attempt
  };

  // Updated to accept the full original task object
  const handleReassignTask = (originalTask: AssignedTask) => {
    console.log('[App.tsx] Reassigning task based on:', originalTask);
    // Use snapshot data from the original task for re-assignment
    simulateReassignTask(
      originalTask.studentId, // Ensure studentId is correct
      originalTask.taskTitle,
      originalTask.taskDescription,
      originalTask.taskBasePoints,
      currentUserId // Pass current user as assigner
    );
    handleCloseVerificationModal(); // Close modal after reassigning
  };

  const renderMainView = () => {
    switch (currentUserRole) {
      case 'public':
        return <PublicView />;
      case 'student':
        return <StudentView />; // StudentView handles its own ID via useAuth
      case 'teacher':
        return <TeacherView onInitiateVerificationModal={handleInitiateVerificationModal} />;
      case 'parent':
        return <ParentView />; // ParentView handles student selection/viewing
      case 'admin':
        return <AdminView onInitiateVerificationModal={handleInitiateVerificationModal} />;
      default:
        return <Text>Loading or Invalid Role...</Text>;
    }
  };

  // Show Dev Selector if in DEV mode and no mock auth state is set
  if (__DEV__ && !mockAuthState) {
    return <DevelopmentViewSelector />;
  }

  // If not in DEV or mockAuthState is set, render the main app content
  return (
    <View style={styles.container}>
      <StatusBar style="auto" />
      {renderMainView()}

      {/* Task Verification Modal */}
      <TaskVerificationModal
        visible={isVerificationModalVisible}
        task={taskToVerify}
        // Removed taskLibrary prop
        allUsers={Object.values(currentMockUsers)} // Pass users for display names
        onClose={handleCloseVerificationModal}
        onVerifyTask={handleVerifyTask}
        // --- FIX: Pass the full original task object ---
        onReassignTaskMock={handleReassignTask} // Prop now expects AssignedTask object
      />

      {/* Reset Button (Dev Only) */}
      {__DEV__ && mockAuthState && (
        <View style={styles.resetButtonContainer}>
          <Button
            title="Reset Mock View"
            onPress={() => setMockAuthState(null)}
            color={colors.secondary}
          />
        </View>
      )}
    </View>
  );
};

export default function App() {
  return (
    // Wrap everything in QueryClientProvider
    <QueryClientProvider client={queryClient}>
      <SafeAreaProvider>
        <AuthProvider>
          {/* DataProvider might eventually be removed if all state goes to TQ */}
          <DataProvider>
            <AppContent />
          </DataProvider>
        </AuthProvider>
      </SafeAreaProvider>
    </QueryClientProvider>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.backgroundPrimary },
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
  resetButtonContainer: { position: 'absolute', bottom: 20, left: 20, right: 20 },
});
