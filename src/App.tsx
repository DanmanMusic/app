// App.tsx
import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  Button,
  ActivityIndicator,
  ImageBackground,
  Platform,
} from 'react-native';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import { StatusBar } from 'expo-status-bar';
import * as Linking from 'expo-linking';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';

import LegalTextModal from './components/common/LegalTextModal';
import LoginModal from './components/common/LoginModal';
import TaskVerificationModal from './components/common/TaskVerificationModal';
import { privacyPolicy, termsOfUse } from './constants/legalContent';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { colors } from './styles/colors';
import { commonSharedStyles } from './styles/commonSharedStyles';
import { AssignedTask } from './types/dataTypes';
import { AdminView } from './views/AdminView';
import { ParentView } from './views/ParentView';
import { PublicView } from './views/PublicView';
import { StudentView } from './views/StudentView';
import { TeacherView } from './views/TeacherView';

const danmansInteriorBackground = require('../assets/backgrounds/public_background.webp');

const queryClient = new QueryClient();

const AppContent = () => {
  const { isLoadingProfile, currentUserRole, error: authError, signOut } = useAuth();

  console.log('currentUserRole:', currentUserRole);

  const [isVerificationModalVisible, setIsVerificationModalVisible] = useState(false);
  const [taskToVerify, setTaskToVerify] = useState<AssignedTask | null>(null);
  const [isLoginModalVisible, setIsLoginModalVisible] = useState(false);
  const [legalModalContent, setLegalModalContent] = useState<{
    title: string;
    content: string;
  } | null>(null);

  useEffect(() => {
    if (Platform.OS !== 'web') {
      return;
    }

    const checkInitialUrl = async () => {
      const initialUrl = await Linking.getInitialURL(); // Await the promise
      if (initialUrl) {
        const parsedUrl = Linking.parse(initialUrl); // Now this receives a string
        const viewParam = parsedUrl.queryParams?.view as string;

        if (viewParam === 'privacy' || viewParam === 'terms') {
          setTimeout(() => {
            handleOpenLegalModal(viewParam);
          }, 500);
        }
      }
    };
    checkInitialUrl();
  }, []);

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

  const handleOpenLegalModal = (type: 'privacy' | 'terms') => {
    if (type === 'privacy') {
      setLegalModalContent(privacyPolicy);
    } else {
      setLegalModalContent(termsOfUse);
    }
  };
  const handleCloseLegalModal = () => setLegalModalContent(null);

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
        return (
          <PublicView onLoginPress={handleOpenLoginModal} onLegalLinkPress={handleOpenLegalModal} />
        );
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
    <ImageBackground
      source={danmansInteriorBackground}
      style={styles.backgroundImage}
      resizeMode="cover"
    >
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
        <LegalTextModal
          visible={!!legalModalContent}
          onClose={handleCloseLegalModal}
          title={legalModalContent?.title || ''}
          content={legalModalContent?.content || ''}
        />
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
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
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
