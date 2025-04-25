import React, { useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View, Button, Platform } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';

import TaskVerificationModal from './src/components/common/TaskVerificationModal';
import { AuthProvider, useAuth } from './src/contexts/AuthContext';
import { AssignedTask } from './src/types/dataTypes';
import { colors } from './src/styles/colors';
import { getUserDisplayName } from './src/utils/helpers';
import { AdminView } from './src/views/AdminView';
import { ParentView } from './src/views/ParentView';
import { PublicView } from './src/views/PublicView';
import { StudentView } from './src/views/StudentView';
import { TeacherView } from './src/views/TeacherView';
import { mockUsers } from './src/mocks/mockUsers';

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

const queryClient = new QueryClient();

const DevelopmentViewSelector = () => {
  const { setMockAuthState } = useAuth();
  const currentMockUsers = mockUsers;

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

const AppContent = () => {
  const { mockAuthState, setMockAuthState, currentUserRole } = useAuth();
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

  const renderMainView = () => {
    switch (currentUserRole) {
      case 'public':
        return <PublicView />;
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

  if (__DEV__ && !mockAuthState) {
    return <DevelopmentViewSelector />;
  }

  return (
    <View style={styles.container}>
      <StatusBar style="auto" />

      {renderMainView()}

      <TaskVerificationModal
        visible={isVerificationModalVisible}
        task={taskToVerify}
        onClose={handleCloseVerificationModal}
      />

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
  resetButtonContainer: { position: 'absolute', top: 0, right: 0 },
});
