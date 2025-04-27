// App.tsx
import React, { useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View, Button, Platform } from 'react-native'; // Platform might be removable if not used elsewhere now
import { SafeAreaProvider } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';

// Component & Context Imports
import TaskVerificationModal from './src/components/common/TaskVerificationModal';
import { AuthProvider, useAuth } from './src/contexts/AuthContext';
import { AdminView } from './src/views/AdminView';
import { ParentView } from './src/views/ParentView';
import { PublicView } from './src/views/PublicView';
import { StudentView } from './src/views/StudentView';
import { TeacherView } from './src/views/TeacherView';

// Type Imports
import { AssignedTask, User } from './src/types/dataTypes';

// Style & Helper Imports
import { colors } from './src/styles/colors';
import { getUserDisplayName } from './src/utils/helpers';

const mockUsers: User[] = [];

// --- MSW Initialization Block REMOVED ---
// if (__DEV__) {
//   console.log('[MSW] Development mode detected. Initializing MSW...');
//   if (Platform.OS === 'web') {
//     import('./src/mocks/browser') // No longer exists
//       .then(({ worker }) => {
//         console.log('[MSW] Starting worker for web...');
//         worker.start({ onUnhandledRequest: 'bypass' });
//         console.log('[MSW] Web worker started.');
//       })
//       .catch(err => console.error('[MSW] Web worker failed to start:', err));
//   } else {
//     import('./src/mocks/server') // No longer exists
//       .then(({ server }) => {
//         console.log('[MSW] Starting server for native...');
//         server.listen({ onUnhandledRequest: 'bypass' });
//         console.log('[MSW] Native server started.');
//       })
//       .catch(err => console.error('[MSW] Native server failed to start:', err));
//   }
// }
// --- End of REMOVED MSW Block ---

const queryClient = new QueryClient();

// Development View Selector remains for now to allow role switching during dev
// TODO: Remove this component entirely when real authentication is implemented.
const DevelopmentViewSelector = () => {
  const { setMockAuthState } = useAuth();
  // TODO: This should eventually fetch actual users if kept for testing roles
  const currentMockUsers = mockUsers;

  return (
    <View style={styles.selectorContainer}>
      <Text style={styles.selectorTitle}>Development Mode: Select User Role</Text>

      <Button
        title="View as Public (Not Logged In)"
        onPress={() => setMockAuthState({ role: 'public' })}
        color={colors.secondary}
      />

      {/* TODO: Replace this mock user mapping with actual user fetching/selection for testing */}
      {Object.values(currentMockUsers).map(user => (
        <Button
          key={user.id}
          title={`Login as ${getUserDisplayName(user)} (${user.role})`}
          onPress={() => {
            // Logic to simulate logging in as this user role
            // This part remains the same for now for dev switching
            let viewingStudentId: string | undefined;
            if (user.role === 'student') {
              viewingStudentId = user.id;
            } else if (user.role === 'parent') {
              // Simplistic: assumes first linked student if available
              viewingStudentId = user.linkedStudentIds?.[0];
            } else if (user.role === 'teacher') {
               // Simplistic: finds first active student linked to this teacher
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

// Main Application Content Component
const AppContent = () => {
  const { mockAuthState, setMockAuthState, currentUserRole } = useAuth();
  // State for the Task Verification Modal
  const [isVerificationModalVisible, setIsVerificationModalVisible] = useState(false);
  const [taskToVerify, setTaskToVerify] = useState<AssignedTask | null>(null);

  // Handlers for Task Verification Modal
  const handleInitiateVerificationModal = (task: AssignedTask) => {
    setTaskToVerify(task);
    setIsVerificationModalVisible(true);
  };
  const handleCloseVerificationModal = () => {
    setIsVerificationModalVisible(false);
    setTaskToVerify(null);
  };

  // Renders the main view based on the current user role (from AuthContext)
  const renderMainView = () => {
    switch (currentUserRole) {
      case 'public':
        return <PublicView />;
      case 'student':
        // StudentView might need user ID from context if not passed props
        return <StudentView />;
      case 'teacher':
        return <TeacherView onInitiateVerificationModal={handleInitiateVerificationModal} />;
      case 'parent':
        return <ParentView />;
      case 'admin':
        // AdminView might pass down the handler if needed by sub-components
        return <AdminView onInitiateVerificationModal={handleInitiateVerificationModal} />;
      default:
        // Should not happen if AuthContext provides a valid role or 'public'
        return <Text>Loading or Invalid Role...</Text>;
    }
  };

  // In development mode, if no mock auth state is set, show the role selector
  if (__DEV__ && !mockAuthState) {
    return <DevelopmentViewSelector />;
  }

  // Otherwise, render the main application structure
  return (
    <View style={styles.container}>
      <StatusBar style="auto" />

      {renderMainView()}

      {/* Task Verification Modal (Common) */}
      <TaskVerificationModal
        visible={isVerificationModalVisible}
        task={taskToVerify}
        onClose={handleCloseVerificationModal}
      />

      {/* Development Mode: Show reset button if mock auth state is active */}
      {__DEV__ && mockAuthState && (
        <View style={styles.resetButtonContainer}>
          <Button
            title="Reset Mock View"
            onPress={() => setMockAuthState(null)} // Clears mock state, showing selector again
            color={colors.secondary}
          />
        </View>
      )}
    </View>
  );
};

// Main App Component (Entry Point)
export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <SafeAreaProvider>
        <AuthProvider>
          <AppContent />
          <Toast /> {/* Global Toast provider */}
        </AuthProvider>
      </SafeAreaProvider>
    </QueryClientProvider>
  );
}

// Styles
const styles = StyleSheet.create({
  container: { // Style for the main AppContent container
    flex: 1,
    backgroundColor: colors.backgroundPrimary, // Use primary background
  },
  selectorContainer: { // Style for the DevelopmentViewSelector container
    flex: 1,
    padding: 20,
    justifyContent: 'center',
    gap: 10,
    backgroundColor: colors.backgroundPrimary, // Consistent background
  },
  selectorTitle: {
    fontSize: 18,
    marginBottom: 20,
    textAlign: 'center',
    fontWeight: 'bold',
    color: colors.textPrimary,
  },
  resetButtonContainer: { // Style for the reset button in dev mode
    position: 'absolute',
    top: 40, // Adjust positioning as needed (consider safe area)
    right: 10,
    zIndex: 10, // Ensure it's above other content
  },
});