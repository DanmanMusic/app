// Import necessary React and React Native components
import React, { useState } from 'react'; // Removed useEffect as it's not used here anymore

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View, Button, Platform } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
// Import TanStack Query client and provider

// Import Contexts & Views
import TaskVerificationModal from './src/components/common/TaskVerificationModal';
import { AuthProvider, useAuth } from './src/contexts/AuthContext';
// DataProvider is likely removable soon, but keep for now if other parts still use it
import { DataProvider, useData } from './src/contexts/DataContext';
import { AssignedTask } from './src/mocks/mockAssignedTasks'; // Removed TaskVerificationStatus as it's handled internally now
import { colors } from './src/styles/colors';
import { getUserDisplayName } from './src/utils/helpers';
import { AdminView } from './src/views/AdminView';
import { ParentView } from './src/views/ParentView';
import { PublicView } from './src/views/PublicView';
import { StudentView } from './src/views/StudentView';
import { TeacherView } from './src/views/TeacherView';

// Import Components & Types

// Import Utils & Styles
// Import API functions needed for mutations (will be used in TaskVerificationModal)
// import { createAssignedTask } from './src/api/assignedTasks'; // Import if re-assign uses it directly here

// MSW Initialization - START (No changes needed here)
if (__DEV__) {
  console.log('[MSW] Development mode detected. Initializing MSW...');
  if (Platform.OS === 'web') {
    import('./src/mocks/browser')
      .then(({ worker }) => {
        console.log('[MSW] Starting worker for web...');
        worker.start({
          onUnhandledRequest: 'bypass',
        });
        console.log('[MSW] Web worker started.');
      })
      .catch(err => console.error('[MSW] Web worker failed to start:', err));
  } else {
    import('./src/mocks/server')
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

// DevelopmentViewSelector Component (No changes needed here)
const DevelopmentViewSelector = () => {
  const { setMockAuthState } = useAuth();
  // Still using DataContext here for the user list, which is fine for the dev selector
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
              if (user.linkedStudentIds && user.linkedStudentIds.length === 1) {
                viewingStudentId = user.linkedStudentIds[0];
              }
            } else if (user.role === 'teacher') {
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

// Main App Content Component
const AppContent = () => {
  // Use AuthContext for authentication state
  const { mockAuthState, setMockAuthState, currentUserRole } = useAuth(); // Removed currentUserId as it's not directly used here now
  // Use DataContext ONLY for things not yet migrated (e.g., user list for display names)
  const { currentMockUsers } = useData(); // Removed simulation functions

  // State for the Task Verification Modal
  const [isVerificationModalVisible, setIsVerificationModalVisible] = useState(false);
  const [taskToVerify, setTaskToVerify] = useState<AssignedTask | null>(null);

  // Function to open the verification modal
  const handleInitiateVerificationModal = (task: AssignedTask) => {
    setTaskToVerify(task);
    setIsVerificationModalVisible(true);
  };

  // Function to close the verification modal
  const handleCloseVerificationModal = () => {
    setIsVerificationModalVisible(false);
    setTaskToVerify(null);
  };

  // --- REMOVED ---
  // The handleVerifyTask and handleReassignTask functions are removed from AppContent.
  // These actions will now be handled internally within TaskVerificationModal using useMutation.

  // Function to render the main view based on the current user role
  const renderMainView = () => {
    switch (currentUserRole) {
      case 'public':
        return <PublicView />;
      case 'student':
        // StudentView gets its own ID via useAuth
        return <StudentView />;
      case 'teacher':
        // Pass the function to open the modal
        return <TeacherView onInitiateVerificationModal={handleInitiateVerificationModal} />;
      case 'parent':
        // ParentView handles student selection internally
        return <ParentView />;
      case 'admin':
        // Pass the function to open the modal
        return <AdminView onInitiateVerificationModal={handleInitiateVerificationModal} />;
      default:
        return <Text>Loading or Invalid Role...</Text>;
    }
  };

  // Show Development Role Selector if in DEV mode and not logged in
  if (__DEV__ && !mockAuthState) {
    return <DevelopmentViewSelector />;
  }

  // Render the main application content
  return (
    <View style={styles.container}>
      <StatusBar style="auto" />
      {/* Render the view corresponding to the user's role */}
      {renderMainView()}

      {/* Task Verification Modal */}
      <TaskVerificationModal
        visible={isVerificationModalVisible}
        task={taskToVerify}
        // Pass all users so the modal can look up names if needed
        allUsers={Object.values(currentMockUsers)}
        onClose={handleCloseVerificationModal}
        // --- REMOVED PROPS ---
        // onVerifyTask prop is removed - handled by internal mutation
        // onReassignTaskMock prop is removed - handled by internal mutation
        // TaskVerificationModal will now need its own useMutation hooks
      />

      {/* Development Only: Reset Button */}
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

// Main App Component - Entry Point
export default function App() {
  return (
    // Provide the TanStack Query client to the entire app
    <QueryClientProvider client={queryClient}>
      {/* Provide Safe Area context for handling notches/status bars */}
      <SafeAreaProvider>
        {/* Provide Authentication context */}
        <AuthProvider>
          {/* DataProvider might be removed later if all state moves to TQ */}
          <DataProvider>
            {/* Render the main content */}
            <AppContent />
          </DataProvider>
        </AuthProvider>
      </SafeAreaProvider>
    </QueryClientProvider>
  );
}

// Styles for the App component
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
