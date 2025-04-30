// App.tsx
import React, { useState } from 'react';
import { StyleSheet, Text, View, Button, ActivityIndicator } from 'react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';

// Component & Context Imports
import TaskVerificationModal from './src/components/common/TaskVerificationModal';
import { AuthProvider, useAuth } from './src/contexts/AuthContext'; // Using AuthProvider
import { AdminView } from './src/views/AdminView';
import { ParentView } from './src/views/ParentView';
import { PublicView } from './src/views/PublicView';
import { StudentView } from './src/views/StudentView';
import { TeacherView } from './src/views/TeacherView';
import LoginModal from './src/components/common/LoginModal';

// Type Imports
import { AssignedTask } from './src/types/dataTypes';

// Style & Helper Imports
import { colors } from './src/styles/colors';
import { commonSharedStyles } from './src/styles/commonSharedStyles';
// Removed appSharedStyles import if only used for test button styles

const queryClient = new QueryClient();

// --- Main Application Content Component ---
const AppContent = () => {
  // Use REAL auth state from context
  const {
    isLoading: authIsLoading,
    isAuthenticated,
    currentUserRole,
    error: authError,
    signOut,
  } = useAuth();

  // State for modals remains the same
  const [isVerificationModalVisible, setIsVerificationModalVisible] = useState(false);
  const [taskToVerify, setTaskToVerify] = useState<AssignedTask | null>(null);
  const [isLoginModalVisible, setIsLoginModalVisible] = useState(false);

  const handleInitiateVerificationModal = (task: AssignedTask) => {
    setTaskToVerify(task);
    setIsVerificationModalVisible(true);
  };
  const handleCloseVerificationModal = () => {
    setIsVerificationModalVisible(false);
    setTaskToVerify(null);
  };

  const handleOpenLoginModal = () => setIsLoginModalVisible(true);
  const handleCloseLoginModal = () => setIsLoginModalVisible(false);

  // Define renderMainView INSIDE AppContent
  const renderMainView = () => {
    // Show initial loading indicator
    if (authIsLoading) {
      return (
        <View style={styles.centeredLoader}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading Session...</Text>
        </View>
      );
    }

    // Show error if auth context failed
    if (authError) {
      return (
        <View style={styles.centeredLoader}>
          <Text style={commonSharedStyles.errorText}>
            Authentication Error: {authError.message}
          </Text>
          <Button title="Try Login" onPress={handleOpenLoginModal} color={colors.primary} />
        </View>
      );
    }

    // Use currentUserRole directly from context
    switch (currentUserRole) {
      case 'public':
        // Show PublicView if not authenticated
        return <PublicView onLoginPress={handleOpenLoginModal} />;
      case 'student':
        return <StudentView />;
      case 'teacher':
        return <TeacherView onInitiateVerificationModal={handleInitiateVerificationModal} />;
      case 'parent':
        return <ParentView />;
      case 'admin':
        return <AdminView onInitiateVerificationModal={handleInitiateVerificationModal} />;
      default:
        // This case should ideally not be reached if role is always defined
        console.error('Reached default case in renderMainView, role:', currentUserRole);
        return (
          <View style={styles.centeredLoader}>
            <Text>Error: Invalid Role or State</Text>
            <Text style={{ color: colors.textLight, marginBottom: 10 }}>
              (Role: {currentUserRole ?? 'undefined'})
            </Text>
            <Button title="Sign Out" onPress={signOut} color={colors.danger} />
          </View>
        );
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar style="auto" />

      {renderMainView()}

      <TaskVerificationModal
        visible={isVerificationModalVisible}
        task={taskToVerify}
        onClose={handleCloseVerificationModal}
      />
      <LoginModal visible={isLoginModalVisible} onClose={handleCloseLoginModal} />

      {/* Removed Test Fetch Button View */}

      {isAuthenticated && (
        <View style={styles.signOutButtonContainer}>
          <Button title="Sign Out" onPress={signOut} color={colors.danger} />
        </View>
      )}
    </View>
  );
};
// --- END AppContent ---

// --- Main App Component (Entry Point) ---
export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <SafeAreaProvider>
        <AuthProvider>
          <AppContent />
          <Toast />
        </AuthProvider>
      </SafeAreaProvider>
    </QueryClientProvider>
  );
}

// Styles
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.backgroundPrimary, // Use primary background
  },
  centeredLoader: {
    // Style for initial loading/error
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: colors.backgroundSecondary, // Use secondary for loading bg
  },
  loadingText: {
    // Added style for loading text
    marginTop: 10,
    color: colors.textSecondary,
    fontSize: 16,
  },
  signOutButtonContainer: {
    // Kept optional sign out button style
    position: 'absolute',
    bottom: 15,
    right: 15,
    zIndex: 100,
    backgroundColor: 'rgba(200, 0, 0, 0.6)', // Reddish background
    borderRadius: 5,
    padding: 3,
  },
});
