// App.tsx
import React, { useState } from 'react';
// *** Import ImageBackground ***
import { StyleSheet, Text, View, Button, ActivityIndicator, ImageBackground } from 'react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
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

// Type Imports
import { AssignedTask } from './src/types/dataTypes';

// Style & Helper Imports
import { colors } from './src/styles/colors';
import { commonSharedStyles } from './src/styles/commonSharedStyles';

// *** Define the background image source ***
const lightWoodBackground = require('./assets/backgrounds/light_wood.png'); // Adjust path if needed

const queryClient = new QueryClient();

// --- Main Application Content Component ---
const AppContent = () => {
  const { isLoading: authIsLoading, currentUserRole, error: authError, signOut } = useAuth();

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

  const renderMainView = () => {
    if (authIsLoading) {
      // Note: This loading view might cover the background initially.
      // Consider making its background transparent if needed.
      return (
        <View style={styles.centeredLoader}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading Session...</Text>
        </View>
      );
    }

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
    // *** Wrap everything in ImageBackground ***
    <ImageBackground
      source={lightWoodBackground}
      style={styles.backgroundImage}
      resizeMode="cover" // Or 'stretch', 'repeat' etc.
    >
      <View style={styles.backgroundOverlay} />

      {/* *** This container View is now transparent *** */}
      <View style={styles.container}>
        <StatusBar style="auto" />

        {renderMainView()}

        {/* Modals remain outside the main view content but inside background */}
        <TaskVerificationModal
          visible={isVerificationModalVisible}
          task={taskToVerify}
          onClose={handleCloseVerificationModal}
        />
        <LoginModal visible={isLoginModalVisible} onClose={handleCloseLoginModal} />
      </View>
    </ImageBackground>
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
  backgroundImage: {
    flex: 1, // Ensure it fills the screen
    width: '100%',
    height: '100%',
  },
  backgroundOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
    zIndex: 0,
  },
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  centeredLoader: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 10,
    color: colors.textSecondary, // Adjust color for readability on wood
    fontSize: 16,
  },
});
