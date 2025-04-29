// App.tsx
import React, { useState } from 'react';
import { StyleSheet, Text, View, Button, ActivityIndicator, ScrollView } from 'react-native';
import { QueryClient, QueryClientProvider, useQuery } from '@tanstack/react-query';
import { StatusBar } from 'expo-status-bar';
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
import LoginModal from './src/components/common/LoginModal';

// API Function for Selector
import { fetchActiveProfilesForDevSelector } from './src/api/users';

// Type Imports
import { AssignedTask, User, UserRole } from './src/types/dataTypes';

// Style & Helper Imports
import { colors } from './src/styles/colors';
import { getUserDisplayName } from './src/utils/helpers';
import { commonSharedStyles } from './src/styles/commonSharedStyles';
import { appSharedStyles } from './src/styles/appSharedStyles';


const queryClient = new QueryClient();

// --- Development Role Selector ---
const DevelopmentRoleSelector = () => {
  const { setMockAuthState } = useAuth();
  const { data: activeUsers = [], isLoading, isError, error } = useQuery({
    queryKey: ['activeProfilesForDevSelector'],
    queryFn: fetchActiveProfilesForDevSelector,
    staleTime: 5 * 60 * 1000,
  });

  const handleSelectUser = (user: Pick<User, 'id' | 'role' | 'firstName' | 'lastName' | 'nickname'>) => {
     console.log(`[DEV] Switching view to: ${getUserDisplayName(user)} (${user.role})`);
    setMockAuthState({ role: user.role, userId: user.id });
  };

  return (
    <ScrollView contentContainerStyle={styles.selectorContainer}>
      <Text style={styles.selectorTitle}>Development Mode: Select User</Text>
      <Button
        title="View as Public (Not Logged In)"
        onPress={() => setMockAuthState({ role: 'public' })}
        color={colors.secondary}
      />
      {isLoading && <ActivityIndicator size="large" color={colors.primary} />}
      {isError && (<Text style={commonSharedStyles.errorText}>Error loading users: {error?.message}</Text>)}
      {!isLoading && !isError && activeUsers.map(user => (
        <Button
          key={user.id}
          title={`Login as ${getUserDisplayName(user)} (${user.role})`}
          onPress={() => handleSelectUser(user)}
          color={
              user.role === 'admin' ? colors.danger
              : user.role === 'teacher' ? colors.primary
              : user.role === 'parent' ? colors.success
              : user.role === 'student' ? colors.gold
              : colors.secondary
          }
        />
      ))}
    </ScrollView>
  );
};
// --- END Development Role Selector ---

// --- Main Application Content Component ---
// This component contains the core logic for rendering views and modals
const AppContent = () => {
  const { mockAuthState, setMockAuthState, currentUserRole } = useAuth();
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

  // Define renderMainView INSIDE AppContent where state/props are accessible
  const renderMainView = () => {
    if (__DEV__ && !mockAuthState) {
      return <DevelopmentRoleSelector />;
    }

    switch (currentUserRole) {
      case 'public':
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
        return <Text>Loading or Invalid Role...</Text>;
    }
  };

  const showDevResetButton = __DEV__ && mockAuthState;

  return (
    // This View wraps the actual content displayed
    <View style={styles.container}>
      <StatusBar style="auto" />

      {/* Call the render function defined above */}
      {renderMainView()}

      {/* Render Modals */}
      <TaskVerificationModal
        visible={isVerificationModalVisible}
        task={taskToVerify}
        onClose={handleCloseVerificationModal}
      />
      <LoginModal
         visible={isLoginModalVisible}
         onClose={handleCloseLoginModal}
       />

      {/* Dev Reset Button */}
      {showDevResetButton && (
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
// --- END AppContent ---


// --- Main App Component (Entry Point) ---
// This is the component registered with Expo. It sets up providers.
export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <SafeAreaProvider>
        <AuthProvider>
          {/* Render AppContent, which holds the view logic */}
          <AppContent />
          <Toast /> {/* Global Toast provider */}
        </AuthProvider>
      </SafeAreaProvider>
    </QueryClientProvider>
  );
}
// --- END App ---


// Styles
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.backgroundPrimary,
  },
  selectorContainer: {
    flexGrow: 1,
    padding: 20,
    alignItems: 'stretch',
    gap: 10,
    backgroundColor: colors.backgroundSecondary,
  },
  selectorTitle: {
    fontSize: 18,
    marginBottom: 20,
    textAlign: 'center',
    fontWeight: 'bold',
    color: colors.textPrimary,
  },
  resetButtonContainer: {
    position: 'absolute',
    top: 40,
    right: 10,
    zIndex: 10,
  },
});