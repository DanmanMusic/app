import React, { useState, useMemo, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Modal,
  View,
  Text,
  Button,
  FlatList,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Switch,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';

import { createAssignedTask } from '../../api/assignedTasks';
import { fetchTaskLibrary } from '../../api/taskLibrary';
import { fetchStudents, fetchUserProfile } from '../../api/users';

import { useAuth } from '../../contexts/AuthContext';

import { AssignedTask, TaskLibraryItem, User, SimplifiedStudent } from '../../types/dataTypes';
import { AssignTaskModalProps } from '../../types/componentProps';

import { appSharedStyles } from '../../styles/appSharedStyles';
import { colors } from '../../styles/colors';
import { modalSharedStyles } from '../../styles/modalSharedStyles';
import { commonSharedStyles } from '../../styles/commonSharedStyles';
import Toast from 'react-native-toast-message';

export const AssignTaskModal: React.FC<AssignTaskModalProps> = ({
  visible,
  onClose,
  preselectedStudentId,
}) => {
  const { currentUserId: assignerId, currentUserRole } = useAuth();
  const queryClient = useQueryClient();

  const [step, setStep] = useState(1);
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [selectedLibraryTask, setSelectedLibraryTask] = useState<TaskLibraryItem | null>(null);
  const [isAdHocMode, setIsAdHocMode] = useState(false);

  const [adHocTitle, setAdHocTitle] = useState('');
  const [adHocDescription, setAdHocDescription] = useState('');
  const [adHocBasePoints, setAdHocBasePoints] = useState<number | ''>('');

  const [studentSearchTerm, setStudentSearchTerm] = useState('');

  const {
    data: taskLibrary = [],
    isLoading: isLoadingLibrary,
    isError: isErrorLibrary,
    error: errorLibrary,
  } = useQuery<TaskLibraryItem[], Error>({
    queryKey: ['task-library'],
    queryFn: fetchTaskLibrary,
    staleTime: 10 * 60 * 1000,
    enabled: visible && step === 2 && !isAdHocMode,
  });

  const filterTeacherId = currentUserRole === 'teacher' ? assignerId : undefined;

  const {
    data: studentListResult,
    isLoading: isLoadingStudents,
    isError: isErrorStudents,
    error: errorStudents,
  } = useQuery({
    queryKey: [
      'students',
      {
        filter: 'active',
        context: 'assignTaskModal',
        teacherId: filterTeacherId,

        limit: 500,
        page: 1,
      },
    ],
    queryFn: () =>
      fetchStudents({
        filter: 'active',
        page: 1,
        limit: 500,
        teacherId: filterTeacherId,
      }),
    enabled: visible && step === 1 && !preselectedStudentId && !!assignerId,
    staleTime: 5 * 60 * 1000,
  });

  const sortedTasks = useMemo(
    () => [...taskLibrary].sort((a, b) => a.title.localeCompare(b.title)),
    [taskLibrary]
  );

  const availableStudents: SimplifiedStudent[] = useMemo(() => {
    return studentListResult?.students ?? [];
  }, [studentListResult]);

  const filteredStudents = useMemo(() => {
    const searchTermLower = studentSearchTerm.toLowerCase().trim();
    if (!searchTermLower) {
      return [...availableStudents].sort((a, b) => a.name.localeCompare(b.name));
    }

    return availableStudents
      .filter(student => student.name.toLowerCase().includes(searchTermLower))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [availableStudents, studentSearchTerm]);

  const selectedStudentName = useMemo(() => {
    if (!selectedStudentId) return 'Unknown Student';

    const student = availableStudents.find(s => s.id === selectedStudentId);
    return student?.name || `ID: ${selectedStudentId}`;
  }, [selectedStudentId, availableStudents]);

  const mutation = useMutation({
    mutationFn: createAssignedTask,
    onSuccess: createdAssignment => {
      console.log('[AssignTaskModal] Task assigned (Simulated):', createdAssignment);
      queryClient.invalidateQueries({ queryKey: ['assigned-tasks'] });
      queryClient.invalidateQueries({
        queryKey: ['assigned-tasks', { studentId: createdAssignment.studentId }],
      });
      onClose();
      Toast.show({ type: 'success', text1: 'Success', text2: 'Task assignment simulated.' });
    },
    onError: error => {
      console.error('[AssignTaskModal] Error assigning task:', error);
      Toast.show({
        type: 'error',
        text1: 'Assignment Not Implemented',
        text2: error instanceof Error ? error.message : 'Could not assign task.',
        position: 'bottom',
        visibilityTime: 5000,
      });
    },
  });

  useEffect(() => {
    if (visible) {
      setIsAdHocMode(false);
      setSelectedLibraryTask(null);
      setAdHocTitle('');
      setAdHocDescription('');
      setAdHocBasePoints('');
      setStudentSearchTerm('');
      mutation.reset();

      if (preselectedStudentId) {
        setSelectedStudentId(preselectedStudentId);
        setStep(2);
      } else {
        setSelectedStudentId(null);
        setStep(1);
      }
    } else {
      setStep(1);
      setSelectedStudentId(null);
      setSelectedLibraryTask(null);
      setIsAdHocMode(false);
      setAdHocTitle('');
      setAdHocDescription('');
      setAdHocBasePoints('');
      setStudentSearchTerm('');
    }
  }, [visible, preselectedStudentId]);

  const handleStudentSelect = (studentId: string) => {
    setSelectedStudentId(studentId);
    setStep(2);
  };

  const handleLibraryTaskSelect = (task: TaskLibraryItem) => {
    setSelectedLibraryTask(task);
    setIsAdHocMode(false);
    setStep(3);
  };

  const handleAdHocSubmit = () => {
    const numericPoints =
      typeof adHocBasePoints === 'number'
        ? adHocBasePoints
        : parseInt(String(adHocBasePoints || '-1'), 10);
    if (
      !adHocTitle.trim() ||
      !adHocDescription.trim() ||
      isNaN(numericPoints) ||
      numericPoints < 0
    ) {
      Toast.show({
        type: 'error',
        text1: 'Validation Error',
        text2: 'Please fill in valid Title, Description, and Points for custom tasks.',
      });
      return;
    }
    setSelectedLibraryTask(null);
    setIsAdHocMode(true);
    setStep(3);
  };

  const handleConfirm = () => {
    if (!selectedStudentId || !assignerId) {
      Toast.show({ type: 'error', text1: 'Error', text2: 'Student or assigner ID missing.' });
      return;
    }

    let assignmentData: Omit<
      AssignedTask,
      'id' | 'isComplete' | 'verificationStatus' | 'assignedDate'
    > & { assignedById: string };

    if (isAdHocMode) {
      const numericPoints =
        typeof adHocBasePoints === 'number'
          ? adHocBasePoints
          : parseInt(String(adHocBasePoints || '-1'), 10);
      if (
        !adHocTitle.trim() ||
        !adHocDescription.trim() ||
        isNaN(numericPoints) ||
        numericPoints < 0
      ) {
        Toast.show({
          type: 'error',
          text1: 'Validation Error',
          text2: 'Invalid custom task details.',
        });
        return;
      }
      assignmentData = {
        studentId: selectedStudentId,
        assignedById: assignerId,
        taskTitle: adHocTitle.trim(),
        taskDescription: adHocDescription.trim(),
        taskBasePoints: numericPoints,
      };
    } else if (selectedLibraryTask) {
      assignmentData = {
        studentId: selectedStudentId,
        assignedById: assignerId,
        taskTitle: selectedLibraryTask.title,
        taskDescription: selectedLibraryTask.description,
        taskBasePoints: selectedLibraryTask.baseTickets,
      };
    } else {
      Toast.show({
        type: 'error',
        text1: 'Validation Error',
        text2: 'No task selected or defined.',
      });
      return;
    }

    Toast.show({
      type: 'info',
      text1: 'Feature Not Implemented',
      text2: 'Task assignment requires server-side logic.',
      visibilityTime: 5000,
    });
    console.warn(
      '[AssignTaskModal] Attempted task assignment, but API implementation is deferred.',
      assignmentData
    );
  };

  const goBack = () => {
    if (step === 3) {
      setStep(2);
    } else if (step === 2 && !preselectedStudentId) {
      setStep(1);
      setSelectedStudentId(null);
    } else {
      onClose();
    }
  };

  const renderStepContent = () => {
    if (step === 1 && !preselectedStudentId) {
      return (
        <>
          <Text style={modalSharedStyles.stepTitle}>Step 1: Select Student</Text>
          <TextInput
            style={commonSharedStyles.searchInput}
            placeholder={
              filterTeacherId ? 'Search Your Students...' : 'Search All Active Students...'
            }
            value={studentSearchTerm}
            onChangeText={setStudentSearchTerm}
            placeholderTextColor={colors.textLight}
            autoCapitalize="none"
            autoCorrect={false}
          />
          {isLoadingStudents && (
            <ActivityIndicator color={colors.primary} style={styles.listLoader} />
          )}
          {isErrorStudents && (
            <Text style={commonSharedStyles.errorText}>
              Error loading students: {errorStudents?.message}
            </Text>
          )}
          {!isLoadingStudents && !isErrorStudents && (
            <FlatList
              style={modalSharedStyles.contentScrollView}
              data={filteredStudents}
              keyExtractor={item => item.id}
              renderItem={({ item }) => (
                <TouchableOpacity onPress={() => handleStudentSelect(item.id)}>
                  <View style={modalSharedStyles.listItem}>
                    <Text style={modalSharedStyles.listItemText}>{item.name}</Text>
                  </View>
                </TouchableOpacity>
              )}
              ListEmptyComponent={
                <Text style={appSharedStyles.emptyListText}>
                  {studentSearchTerm ? 'No students match search.' : 'No active students found.'}
                </Text>
              }
            />
          )}
        </>
      );
    }

    if (step === 2) {
      return (
        <>
          <Text style={modalSharedStyles.stepTitle}>
            Step {preselectedStudentId ? 1 : 2}: Assign Task to {selectedStudentName}
          </Text>
          <View style={modalSharedStyles.modeSwitchContainer}>
            <Text style={commonSharedStyles.label}>Select from Library</Text>
            <Switch
              trackColor={{ false: colors.secondary, true: colors.primary }}
              thumbColor={colors.backgroundPrimary}
              ios_backgroundColor={colors.secondary}
              onValueChange={setIsAdHocMode}
              value={isAdHocMode}
            />
            <Text style={commonSharedStyles.label}>Create Custom Task</Text>
          </View>
          <ScrollView style={modalSharedStyles.contentScrollView}>
            {isAdHocMode ? (
              <View>
                <Text style={commonSharedStyles.label}>Custom Task Title:</Text>
                <TextInput
                  style={commonSharedStyles.input}
                  value={adHocTitle}
                  onChangeText={setAdHocTitle}
                  placeholder="e.g., Help setup for recital"
                  placeholderTextColor={colors.textLight}
                  editable={!mutation.isPending}
                />
                <Text style={commonSharedStyles.label}>Custom Task Description:</Text>
                <TextInput
                  style={commonSharedStyles.textArea}
                  value={adHocDescription}
                  onChangeText={setAdHocDescription}
                  placeholder="Describe the task briefly"
                  placeholderTextColor={colors.textLight}
                  multiline={true}
                  editable={!mutation.isPending}
                />
                <Text style={commonSharedStyles.label}>Base Points:</Text>
                <TextInput
                  style={commonSharedStyles.input}
                  value={String(adHocBasePoints)}
                  onChangeText={text =>
                    setAdHocBasePoints(
                      text === '' ? '' : parseInt(text.replace(/[^0-9]/g, ''), 10) || 0
                    )
                  }
                  placeholder="e.g., 50"
                  placeholderTextColor={colors.textLight}
                  keyboardType="numeric"
                  editable={!mutation.isPending}
                />
                <Button
                  title="Use This Custom Task"
                  onPress={handleAdHocSubmit}
                  disabled={
                    mutation.isPending ||
                    !adHocTitle.trim() ||
                    !adHocDescription.trim() ||
                    adHocBasePoints === '' ||
                    adHocBasePoints < 0
                  }
                />
              </View>
            ) : (
              <>
                {isLoadingLibrary && <ActivityIndicator style={styles.listLoader} />}
                {isErrorLibrary && (
                  <Text style={commonSharedStyles.errorText}>
                    Error loading task library: {errorLibrary?.message}
                  </Text>
                )}
                {!isLoadingLibrary && !isErrorLibrary && (
                  <FlatList
                    data={sortedTasks}
                    keyExtractor={item => item.id}
                    renderItem={({ item }) => (
                      <TouchableOpacity onPress={() => handleLibraryTaskSelect(item)}>
                        <View style={modalSharedStyles.listItem}>
                          <Text style={modalSharedStyles.taskItemText}>
                            {item.title} ({item.baseTickets} pts)
                          </Text>
                          <Text style={modalSharedStyles.taskDescription}>{item.description}</Text>
                        </View>
                      </TouchableOpacity>
                    )}
                    ListEmptyComponent={
                      <Text style={appSharedStyles.emptyListText}>Task library is empty.</Text>
                    }
                  />
                )}
              </>
            )}
          </ScrollView>
        </>
      );
    }

    if (step === 3) {
      const taskTitle = isAdHocMode ? adHocTitle : selectedLibraryTask?.title;
      const taskPoints = isAdHocMode ? adHocBasePoints : selectedLibraryTask?.baseTickets;
      return (
        <>
          <Text style={modalSharedStyles.stepTitle}>
            Step {preselectedStudentId ? 2 : 3}: Confirm Assignment
          </Text>
          <Text style={modalSharedStyles.confirmationText}>
            Assign task "{taskTitle || 'N/A'}" ({taskPoints ?? '?'} points) to "
            {selectedStudentName}"?
          </Text>
          <Text style={styles.infoText}>
            Note: Task assignment requires server-side setup and is currently disabled.
          </Text>
        </>
      );
    }
    return null;
  };

  return (
    <Modal animationType="slide" transparent={true} visible={visible} onRequestClose={onClose}>
      <View style={modalSharedStyles.centeredView}>
        <View style={modalSharedStyles.modalView}>
          <Text style={modalSharedStyles.modalTitle}>Assign Task</Text>

          {renderStepContent()}

          <View style={modalSharedStyles.buttonContainer}>
            {step === 3 && (
              <Button
                title={'Confirm & Assign (Disabled)'}
                onPress={handleConfirm}
                disabled={true}
              />
            )}

            {((step > 1 && !preselectedStudentId) ||
              step === 3 ||
              (step === 2 && preselectedStudentId)) && (
              <Button
                title="Back"
                onPress={goBack}
                color={colors.secondary}
                disabled={mutation.isPending}
              />
            )}

            <Button
              title="Cancel"
              onPress={onClose}
              color={colors.secondary}
              disabled={mutation.isPending}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  listLoader: {
    marginVertical: 20,
  },
  infoText: {
    fontSize: 13,
    color: colors.textLight,
    textAlign: 'center',
    marginVertical: 10,
    fontStyle: 'italic',
    paddingHorizontal: 10,
  },
});

export default AssignTaskModal;
