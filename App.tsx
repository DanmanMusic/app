import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View, Button, Alert, Platform } from 'react-native';
import React, { useState, useEffect } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AuthProvider, useAuth } from './src/contexts/AuthContext';
import { DataProvider, useData } from './src/contexts/DataContext';

import { PublicView } from './src/views/PublicView';
import { StudentView } from './src/views/StudentView';
import { TeacherView } from './src/views/TeacherView';
import { ParentView } from './src/views/ParentView';
import { AdminView } from './src/views/AdminView';

import TaskVerificationModal from './src/components/TaskVerificationModal';
import { AssignedTask, TaskVerificationStatus } from './src/mocks/mockAssignedTasks';

import { appSharedStyles } from './src/styles/appSharedStyles';
import { colors } from './src/styles/colors';
import { getUserDisplayName } from './src/utils/helpers';
import { UserRole } from './src/types/userTypes';


const DevelopmentViewSelector = () => {
    const { setMockAuthState } = useAuth();
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
                            viewingStudentId = Object.values(currentMockUsers).find(u =>
                                u.role === 'student' && u.linkedTeacherIds?.includes(user.id)
                            )?.id;
                        }
                        setMockAuthState({ role: user.role, userId: user.id, viewingStudentId });
                    }}
                    color={
                        user.role === 'admin' ? colors.danger
                      : user.role === 'teacher' ? colors.primary
                      : user.role === 'parent' ? colors.success
                      : user.role === 'student' ? colors.gold
                      : colors.secondary
                    }
                />
            ))}
        </View>
    );
};


const AppContent = () => {
  const { isAuthenticated, currentUserRole } = useAuth();
  const {
      taskLibrary,
      currentMockUsers,
      simulateVerifyTask,
      simulateReassignTask,
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


  const handleVerifyTask = (taskId: string, status: TaskVerificationStatus, actualTickets: number) => {
      simulateVerifyTask(taskId, status, actualTickets);

  };


  const handleReassignTask = (originalTaskId: string, studentId: string) => {
      simulateReassignTask(originalTaskId, studentId);
      handleCloseVerificationModal();
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

        return <Text>Loading or Authentication Required.</Text>;
    }
  };


  const { mockAuthState, setMockAuthState } = useAuth();
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
              taskLibrary={taskLibrary}
              allUsers={Object.values(currentMockUsers)}
              onClose={handleCloseVerificationModal}
              onVerifyTask={handleVerifyTask}
              onReassignTaskMock={handleReassignTask}
          />
          {__DEV__ && mockAuthState && (
              <View style={styles.resetButtonContainer}>
                  <Button title="Reset Mock View" onPress={() => setMockAuthState(null)} />
              </View>
          )}
      </View>
  );
}



export default function App() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <DataProvider>
          <AppContent />
        </DataProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.backgroundPrimary },
    selectorContainer: { flex: 1, padding: 20, justifyContent: 'center', gap: 10, backgroundColor: colors.backgroundPrimary },
    selectorTitle: { fontSize: 18, marginBottom: 20, textAlign: 'center', fontWeight: 'bold', color: colors.textPrimary },
    resetButtonContainer: { position: 'absolute', bottom: 20, left: 20, right: 20 },
});