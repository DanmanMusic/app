// App.tsx
import React, { useState } from 'react';

import { StyleSheet, Text, View, Button, ActivityIndicator, ImageBackground } from 'react-native';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';

import LoginModal from './src/components/common/LoginModal';
import TaskVerificationModal from './src/components/common/TaskVerificationModal';
import { AuthProvider, useAuth } from './src/contexts/AuthContext';
import { colors } from './src/styles/colors';
import { commonSharedStyles } from './src/styles/commonSharedStyles';
import { AssignedTask } from './src/types/dataTypes';
import { AdminView } from './src/views/AdminView';
import { ParentView } from './src/views/ParentView';
import { PublicView } from './src/views/PublicView';
import { StudentView } from './src/views/StudentView';
import { TeacherView } from './src/views/TeacherView';

const lightWoodBackground = require('./assets/backgrounds/light_wood.png'); // Adjust path if needed

const queryClient = new QueryClient();

const AppContent = () => {
  const { isLoadingProfile, currentUserRole, error: authError, signOut } = useAuth();

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
    if (isLoadingProfile) {
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
    <ImageBackground source={lightWoodBackground} style={styles.backgroundImage} resizeMode="cover">
      <View style={styles.backgroundOverlay} />

      <View style={styles.container}>
        <StatusBar style="auto" />

        {renderMainView()}

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

const styles = StyleSheet.create({
  backgroundImage: {
    flex: 1,
    width: '100%',
    height: '100%',
    paddingHorizontal: 5,
    paddingVertical: 2,
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
    color: colors.textSecondary,
    fontSize: 16,
  },
});
