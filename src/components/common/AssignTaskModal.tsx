import React, { useState, useMemo, useEffect } from 'react';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  Modal,
  View,
  Text,
  StyleSheet,
  Button,
  FlatList,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Switch,
  ActivityIndicator,
  Alert,
} from 'react-native';

import { createAssignedTask } from '../../api/assignedTasks';
import { fetchTaskLibrary } from '../../api/taskLibrary';
import { fetchStudents } from '../../api/users';
import { useAuth } from '../../contexts/AuthContext';
import { AssignedTask } from '../../mocks/mockAssignedTasks';
import { TaskLibraryItem } from '../../mocks/mockTaskLibrary';
import { appSharedStyles } from '../../styles/appSharedStyles';
import { colors } from '../../styles/colors';
import { AssignTaskModalProps } from '../../types/componentProps';
import { SimplifiedStudent } from '../../types/dataTypes';

const modalStyles = StyleSheet.create({
  centeredView: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.7)',
  },
  modalView: {
    margin: 10,
    backgroundColor: colors.backgroundPrimary,
    borderRadius: 10,
    padding: 15,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
    width: '95%',
    maxHeight: '90%',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 15,
    textAlign: 'center',
    color: colors.textPrimary,
    width: '100%',
    borderBottomWidth: 1,
    borderBottomColor: colors.borderPrimary,
    paddingBottom: 10,
  },
  stepTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: 10,
    marginBottom: 10,
    color: colors.textSecondary,
    alignSelf: 'flex-start',
    width: '100%',
  },
  contentScrollView: { width: '100%', maxHeight: '65%', marginBottom: 15 },
  searchInput: {
    width: '100%',
    borderWidth: 1,
    borderColor: colors.borderPrimary,
    borderRadius: 5,
    padding: 10,
    fontSize: 16,
    color: colors.textPrimary,
    backgroundColor: colors.backgroundPrimary,
    marginBottom: 10,
  },
  listItem: { padding: 12, borderBottomWidth: 1, borderBottomColor: colors.borderSecondary },
  listItemText: { fontSize: 15, color: colors.textPrimary },
  taskItemText: { fontSize: 14, color: colors.textPrimary },
  taskDescription: { fontSize: 12, color: colors.textLight, marginTop: 3 },
  modeSwitchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 15,
    paddingHorizontal: 5,
  },
  label: { fontSize: 14, fontWeight: 'bold', marginBottom: 5, color: colors.textPrimary },
  input: {
    width: '100%',
    borderWidth: 1,
    borderColor: colors.borderPrimary,
    borderRadius: 5,
    padding: 10,
    fontSize: 16,
    color: colors.textPrimary,
    backgroundColor: colors.backgroundPrimary,
    marginBottom: 10,
  },
  textArea: { minHeight: 80, textAlignVertical: 'top' },
  confirmationText: { fontSize: 16, marginVertical: 15, textAlign: 'center', lineHeight: 22 },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    marginTop: 15,
    borderTopWidth: 1,
    borderTopColor: colors.borderPrimary,
    paddingTop: 15,
    gap: 10,
  },
  footerButton: { width: '100%', marginTop: 0, marginBottom: 10 },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 5,
    marginBottom: 10,
    height: 20,
  },
  loadingText: { marginLeft: 10, fontSize: 14, color: colors.textSecondary },
  errorText: {
    color: colors.danger,
    textAlign: 'center',
    marginTop: 5,
    marginBottom: 10,
    fontSize: 14,
    minHeight: 18,
  },
});

export const AssignTaskModal: React.FC<AssignTaskModalProps> = ({
  visible,
  onClose,
  preselectedStudentId,
}) => {
  const { currentUserId } = useAuth();
  const queryClient = useQueryClient();

  const [step, setStep] = useState(1);
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(
    preselectedStudentId || null
  );
  const [selectedLibraryTask, setSelectedLibraryTask] = useState<TaskLibraryItem | null>(null);
  const [isAdHocMode, setIsAdHocMode] = useState(false);
  const [adHocTitle, setAdHocTitle] = useState('');
  const [adHocDescription, setAdHocDescription] = useState('');
  const [adHocBasePoints, setAdHocBasePoints] = useState<number | ''>('');
  const [studentSearchTerm, setStudentSearchTerm] = useState('');

  const { data: taskLibrary = [], isLoading: isLoadingLibrary } = useQuery({
    queryKey: ['task-library'],
    queryFn: fetchTaskLibrary,
    staleTime: 10 * 60 * 1000,
    enabled: visible && step === 2 && !isAdHocMode,
  });

  const {
    data: studentListResult,
    isLoading: isLoadingStudents,
    isError: isErrorStudents,
    error: errorStudents,
  } = useQuery({
    queryKey: ['students', { filter: 'active', context: 'assignTaskModal' }],
    queryFn: () => fetchStudents({ filter: 'active', page: 1 }),
    enabled: visible && step === 1 && !preselectedStudentId,
    staleTime: 5 * 60 * 1000,
  });

  const mutation = useMutation({
    mutationFn: createAssignedTask,
    onSuccess: createdAssignment => {
      console.log('Task assigned successfully via mutation:', createdAssignment);
      queryClient.invalidateQueries({ queryKey: ['assigned-tasks'] });
      queryClient.invalidateQueries({
        queryKey: ['assigned-tasks', { studentId: createdAssignment.studentId }],
      });
      onClose();
    },
    onError: error => {
      console.error('Error assigning task via mutation:', error);
      Alert.alert(
        'Error',
        `Failed to assign task: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    },
  });

  const sortedTasks = useMemo(
    () => [...taskLibrary].sort((a, b) => a.title.localeCompare(b.title)),
    [taskLibrary]
  );

  const availableStudents = studentListResult?.students ?? [];
  const filteredStudents = useMemo(() => {
    const searchTermLower = studentSearchTerm.toLowerCase().trim();
    if (!searchTermLower) {
      return [...availableStudents].sort((a, b) => a.name.localeCompare(b.name));
    }
    return availableStudents
      .filter(student => student.name.toLowerCase().includes(searchTermLower))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [availableStudents, studentSearchTerm]);

  useEffect(() => {
    if (visible) {
      setIsAdHocMode(false);
      setAdHocTitle('');
      setAdHocDescription('');
      setAdHocBasePoints('');
      setSelectedLibraryTask(null);
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
    setStep(3);
  };
  const handleAdHocSubmit = () => {
    const numericPoints =
      typeof adHocBasePoints === 'number'
        ? adHocBasePoints
        : parseInt(String(adHocBasePoints || '0'), 10);
    if (
      !adHocTitle.trim() ||
      !adHocDescription.trim() ||
      isNaN(numericPoints) ||
      numericPoints < 0
    ) {
      Alert.alert(
        'Validation Error',
        'Please fill in Title, Description, and valid Points for custom tasks.'
      );
      return;
    }
    setSelectedLibraryTask(null);
    setStep(3);
  };

  const handleConfirm = () => {
    if (!selectedStudentId || !currentUserId) {
      Alert.alert('Error', 'Student or assigner ID missing.');
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
          : parseInt(String(adHocBasePoints || '0'), 10);
      if (
        !adHocTitle.trim() ||
        !adHocDescription.trim() ||
        isNaN(numericPoints) ||
        numericPoints < 0
      ) {
        Alert.alert('Validation Error', 'Invalid custom task details.');
        return;
      }
      assignmentData = {
        studentId: selectedStudentId,
        assignedById: currentUserId,
        taskTitle: adHocTitle.trim(),
        taskDescription: adHocDescription.trim(),
        taskBasePoints: numericPoints,
      };
    } else if (selectedLibraryTask) {
      assignmentData = {
        studentId: selectedStudentId,
        assignedById: currentUserId,
        taskTitle: selectedLibraryTask.title,
        taskDescription: selectedLibraryTask.description,
        taskBasePoints: selectedLibraryTask.baseTickets,
      };
    } else {
      Alert.alert('Error', 'No task selected or defined.');
      return;
    }
    mutation.mutate(assignmentData);
  };

  const goBack = () => {
    if (step === 3) {
      setStep(2);
    } else if (step === 2 && !preselectedStudentId) {
      setStep(1);
    } else {
      onClose();
    }
  };

  const renderStepContent = () => {
    if (step === 1 && !preselectedStudentId) {
      return (
        <>
          <Text style={modalStyles.stepTitle}>Step 1: Select Student</Text>
          <TextInput
            style={modalStyles.searchInput}
            placeholder="Search Active Students..."
            value={studentSearchTerm}
            onChangeText={setStudentSearchTerm}
            placeholderTextColor={colors.textLight}
            autoCapitalize="none"
            autoCorrect={false}
          />
          {isLoadingStudents && (
            <ActivityIndicator color={colors.primary} style={{ marginVertical: 10 }} />
          )}
          {isErrorStudents && (
            <Text style={modalStyles.errorText}>
              Error loading students: {errorStudents?.message}
            </Text>
          )}
          {!isLoadingStudents && !isErrorStudents && (
            <FlatList
              style={modalStyles.contentScrollView}
              data={filteredStudents}
              keyExtractor={item => item.id}
              renderItem={({ item }) => (
                <TouchableOpacity onPress={() => handleStudentSelect(item.id)}>
                  <View style={modalStyles.listItem}>
                    <Text style={modalStyles.listItemText}>{item.name}</Text>
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
      const studentName =
        availableStudents.find(s => s.id === selectedStudentId)?.name ||
        `ID: ${selectedStudentId}` ||
        'Selected Student';
      return (
        <>
          <Text style={modalStyles.stepTitle}>
            {' '}
            Step {preselectedStudentId ? 1 : 2}: Assign Task to {studentName}{' '}
          </Text>
          <View style={modalStyles.modeSwitchContainer}>
            <Text style={modalStyles.label}>Select from Library</Text>
            <Switch
              trackColor={{ false: colors.secondary, true: colors.primary }}
              thumbColor={colors.backgroundPrimary}
              ios_backgroundColor={colors.secondary}
              onValueChange={setIsAdHocMode}
              value={isAdHocMode}
            />
            <Text style={modalStyles.label}>Create Custom Task</Text>
          </View>
          <ScrollView style={modalStyles.contentScrollView}>
            {isAdHocMode ? (
              <View>
                <Text style={modalStyles.label}>Custom Task Title:</Text>
                <TextInput
                  style={modalStyles.input}
                  value={adHocTitle}
                  onChangeText={setAdHocTitle}
                  placeholder="e.g., Help setup for recital"
                  placeholderTextColor={colors.textLight}
                  editable={!mutation.isPending}
                />
                <Text style={modalStyles.label}>Custom Task Description:</Text>
                <TextInput
                  style={[modalStyles.input, modalStyles.textArea]}
                  value={adHocDescription}
                  onChangeText={setAdHocDescription}
                  placeholder="Describe the task briefly"
                  placeholderTextColor={colors.textLight}
                  multiline={true}
                  editable={!mutation.isPending}
                />
                <Text style={modalStyles.label}>Base Points:</Text>
                <TextInput
                  style={modalStyles.input}
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
                {isLoadingLibrary && <ActivityIndicator style={{ marginTop: 10 }} />}
                {!isLoadingLibrary && (
                  <FlatList
                    data={sortedTasks}
                    keyExtractor={item => item.id}
                    renderItem={({ item }) => (
                      <TouchableOpacity onPress={() => handleLibraryTaskSelect(item)}>
                        <View style={modalStyles.listItem}>
                          <Text style={modalStyles.taskItemText}>
                            {item.title} ({item.baseTickets} pts)
                          </Text>
                          <Text style={modalStyles.taskDescription}>{item.description}</Text>
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
      const studentName =
        availableStudents.find(s => s.id === selectedStudentId)?.name ||
        `ID: ${selectedStudentId}` ||
        'Unknown Student';
      const taskTitle = isAdHocMode ? adHocTitle : selectedLibraryTask?.title;
      const taskPoints = isAdHocMode ? adHocBasePoints : selectedLibraryTask?.baseTickets;
      return (
        <>
          <Text style={modalStyles.stepTitle}>
            {' '}
            Step {preselectedStudentId ? 2 : 3}: Confirm Assignment{' '}
          </Text>
          <Text style={modalStyles.confirmationText}>
            {' '}
            Assign task "{taskTitle || 'N/A'}" ({taskPoints ?? '?'} points) to "{studentName}"?{' '}
          </Text>
        </>
      );
    }
    return null;
  };

  return (
    <Modal animationType="slide" transparent={true} visible={visible} onRequestClose={onClose}>
      <View style={modalStyles.centeredView}>
        <View style={modalStyles.modalView}>
          <Text style={modalStyles.modalTitle}>Assign Task</Text>
          {renderStepContent()}
          {mutation.isPending && (
            <View style={modalStyles.loadingContainer}>
              {' '}
              <ActivityIndicator size="small" color={colors.primary} />{' '}
              <Text style={modalStyles.loadingText}>Assigning Task...</Text>{' '}
            </View>
          )}
          {mutation.isError && (
            <Text style={modalStyles.errorText}>
              {' '}
              Error:{' '}
              {mutation.error instanceof Error
                ? mutation.error.message
                : 'Failed to assign task'}{' '}
            </Text>
          )}
          {step === 3 && (
            <View style={modalStyles.footerButton}>
              <Button
                title={mutation.isPending ? 'Assigning...' : 'Confirm & Assign'}
                onPress={handleConfirm}
                disabled={
                  mutation.isPending || !selectedStudentId || (!selectedLibraryTask && !isAdHocMode)
                }
              />
            </View>
          )}
          <View style={modalStyles.buttonContainer}>
            {(step > 1 && !preselectedStudentId) ||
            step === 3 ||
            (step === 2 && preselectedStudentId) ? (
              <Button
                title="Back"
                onPress={goBack}
                color={colors.secondary}
                disabled={mutation.isPending}
              />
            ) : (
              <View />
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

export default AssignTaskModal;
