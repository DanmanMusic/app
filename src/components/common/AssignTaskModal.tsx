// src/components/common/AssignTaskModal.tsx
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
} from 'react-native';
import Toast from 'react-native-toast-message';

// API Imports
import { createAssignedTask } from '../../api/assignedTasks'; // Use the updated API function
import { fetchTaskLibrary } from '../../api/taskLibrary';
import { fetchStudents } from '../../api/users';

// Context & Hooks
import { useAuth } from '../../contexts/AuthContext';

// Type Imports
import { AssignedTask, TaskLibraryItem, User, SimplifiedStudent } from '../../types/dataTypes';
import { AssignTaskModalProps } from '../../types/componentProps';

// Style & Helper Imports
import { appSharedStyles } from '../../styles/appSharedStyles';
import { colors } from '../../styles/colors';
import { commonSharedStyles } from '../../styles/commonSharedStyles';

export const AssignTaskModal: React.FC<AssignTaskModalProps> = ({
  visible,
  onClose,
  preselectedStudentId,
}) => {
  const { currentUserId: assignerId, currentUserRole } = useAuth(); // assignerId used for filtering students if teacher
  const queryClient = useQueryClient();

  // State for modal steps and selections
  const [step, setStep] = useState(1);
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [selectedLibraryTask, setSelectedLibraryTask] = useState<TaskLibraryItem | null>(null);
  const [isAdHocMode, setIsAdHocMode] = useState(false);

  // State for Ad-Hoc task details
  const [adHocTitle, setAdHocTitle] = useState('');
  const [adHocDescription, setAdHocDescription] = useState('');
  const [adHocBasePoints, setAdHocBasePoints] = useState<number | ''>('');

  // State for student search
  const [studentSearchTerm, setStudentSearchTerm] = useState('');

  // Query for Task Library
  const {
    data: taskLibrary = [],
    isLoading: isLoadingLibrary,
    isError: isErrorLibrary,
    error: errorLibrary,
  } = useQuery<TaskLibraryItem[], Error>({
    queryKey: ['task-library'],
    queryFn: fetchTaskLibrary,
    staleTime: 10 * 60 * 1000,
    enabled: visible && step === 2 && !isAdHocMode, // Only fetch when needed
  });

  // Determine if we need to filter students by teacher ID
  const filterTeacherId = currentUserRole === 'teacher' ? assignerId : undefined;

  // Query for Students (active only, potentially filtered by teacher)
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
        teacherId: filterTeacherId, // Apply filter if teacher
        limit: 500, // Fetch a reasonable limit for selection
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
    // Only run if modal is visible, on step 1, no student preselected, and assignerId is available
    enabled: visible && step === 1 && !preselectedStudentId && !!assignerId,
    staleTime: 5 * 60 * 1000,
  });

  // Memoized sorted task library
  const sortedTasks = useMemo(
    () => [...taskLibrary].sort((a, b) => a.title.localeCompare(b.title)),
    [taskLibrary]
  );

  // Memoized list of available students from query result
  const availableStudents: SimplifiedStudent[] = useMemo(() => {
    return studentListResult?.students ?? [];
  }, [studentListResult]);

  // Memoized list of students filtered by search term
  const filteredStudents = useMemo(() => {
    const searchTermLower = studentSearchTerm.toLowerCase().trim();
    if (!searchTermLower) {
      // Sort alphabetically if no search term
      return [...availableStudents].sort((a, b) => a.name.localeCompare(b.name));
    }
    // Filter and sort if search term exists
    return availableStudents
      .filter(student => student.name.toLowerCase().includes(searchTermLower))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [availableStudents, studentSearchTerm]);

  // Memoized display name of the selected student
  const selectedStudentName = useMemo(() => {
    if (!selectedStudentId) return 'Unknown Student';
    const student = availableStudents.find(s => s.id === selectedStudentId);
    return student?.name || `ID: ${selectedStudentId}`; // Fallback to ID
  }, [selectedStudentId, availableStudents]);

  // Mutation for assigning the task (calls the API function which calls the Edge Function)
  const mutation = useMutation({
    mutationFn: createAssignedTask, // Uses the API function
    onSuccess: createdAssignment => {
      console.log(
        '[AssignTaskModal] Task assigned successfully (via Edge Function):',
        createdAssignment
      );
      queryClient.invalidateQueries({ queryKey: ['assigned-tasks'] }); // Broad invalidation
      queryClient.invalidateQueries({
        queryKey: ['assigned-tasks', { studentId: createdAssignment.studentId }],
      }); // Specific student invalidation
      onClose(); // Close modal on success
      Toast.show({ type: 'success', text1: 'Success', text2: 'Task assigned successfully.' });
    },
    onError: (error: Error) => {
      // Explicitly type error
      console.error('[AssignTaskModal] Error assigning task:', error);
      Toast.show({
        type: 'error',
        text1: 'Assignment Failed',
        text2: error.message || 'Could not assign task.',
        position: 'bottom',
        visibilityTime: 5000,
      });
    },
  });

  // Effect to reset state when modal visibility changes or preselected student changes
  useEffect(() => {
    if (visible) {
      // Reset common state
      setIsAdHocMode(false);
      setSelectedLibraryTask(null);
      setAdHocTitle('');
      setAdHocDescription('');
      setAdHocBasePoints('');
      setStudentSearchTerm('');
      mutation.reset();

      // Handle preselection or initial step
      if (preselectedStudentId) {
        setSelectedStudentId(preselectedStudentId);
        setStep(2); // Go directly to task selection
      } else {
        setSelectedStudentId(null);
        setStep(1); // Start at student selection
      }
    } else {
      // Clear all state when modal is hidden
      setStep(1);
      setSelectedStudentId(null);
      setSelectedLibraryTask(null);
      setIsAdHocMode(false);
      setAdHocTitle('');
      setAdHocDescription('');
      setAdHocBasePoints('');
      setStudentSearchTerm('');
    }
  }, [visible, preselectedStudentId]); // Rerun when visibility or preselection changes

  // Handlers for UI actions
  const handleStudentSelect = (studentId: string) => {
    setSelectedStudentId(studentId);
    setStep(2); // Move to task selection
  };

  const handleLibraryTaskSelect = (task: TaskLibraryItem) => {
    setSelectedLibraryTask(task);
    setIsAdHocMode(false); // Ensure not in AdHoc mode
    setStep(3); // Move to confirmation
  };

  const handleAdHocSubmit = () => {
    // Validate AdHoc fields before proceeding
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
        text2: 'Please fill in valid Title, Description, and Points.',
      });
      return;
    }
    setSelectedLibraryTask(null); // Ensure no library task is selected
    setIsAdHocMode(true); // Confirm AdHoc mode
    setStep(3); // Move to confirmation
  };

  // Handler for the final confirmation and mutation trigger
  const handleConfirm = () => {
    if (!selectedStudentId) {
      // Assignee ID comes from token in Edge Function
      Toast.show({ type: 'error', text1: 'Error', text2: 'Student ID missing.' });
      return;
    }

    // Prepare payload for the client API function createAssignedTask
    let assignmentPayload: Omit<
      AssignedTask,
      'id' | 'assignedById' | 'assignedDate' | 'isComplete' | 'verificationStatus'
    >;

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
      assignmentPayload = {
        studentId: selectedStudentId,
        taskTitle: adHocTitle.trim(),
        taskDescription: adHocDescription.trim(),
        taskBasePoints: numericPoints,
      };
    } else if (selectedLibraryTask) {
      assignmentPayload = {
        studentId: selectedStudentId,
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

    console.log('[AssignTaskModal] Calling mutation with payload:', assignmentPayload);
    mutation.mutate(assignmentPayload); // Trigger the mutation
  };

  // Handler for going back between steps
  const goBack = () => {
    if (step === 3) {
      setStep(2); // Go back to task selection
    } else if (step === 2 && !preselectedStudentId) {
      setStep(1); // Go back to student selection (if not preselected)
      setSelectedStudentId(null); // Clear student selection
    } else {
      onClose(); // Otherwise, close modal
    }
  };

  // Function to render content based on the current step
  const renderStepContent = () => {
    // Step 1: Select Student (only if not preselected)
    if (step === 1 && !preselectedStudentId) {
      return (
        <>
          <Text style={commonSharedStyles.stepTitle}>Step 1: Select Student</Text>
          <TextInput
            style={appSharedStyles.searchInput}
            placeholder={
              filterTeacherId ? 'Search Your Students...' : 'Search All Active Students...'
            }
            value={studentSearchTerm}
            onChangeText={setStudentSearchTerm}
            placeholderTextColor={colors.textLight}
            autoCapitalize="none"
            autoCorrect={false}
          />
          {isLoadingStudents && <ActivityIndicator color={colors.primary} />}
          {isErrorStudents && (
            <Text style={commonSharedStyles.errorText}>
              Error loading students: {errorStudents?.message}
            </Text>
          )}
          {!isLoadingStudents && !isErrorStudents && (
            <FlatList
              style={commonSharedStyles.contentScrollView}
              data={filteredStudents}
              keyExtractor={item => item.id}
              renderItem={({ item }) => (
                <TouchableOpacity onPress={() => handleStudentSelect(item.id)}>
                  <View style={appSharedStyles.listItem}>
                    <Text style={appSharedStyles.listItemText}>{item.name}</Text>
                  </View>
                </TouchableOpacity>
              )}
              ListEmptyComponent={
                <Text style={commonSharedStyles.baseEmptyText}>
                  {studentSearchTerm ? 'No students match search.' : 'No active students found.'}
                </Text>
              }
            />
          )}
        </>
      );
    }

    // Step 2: Select Task (Library or Ad-Hoc)
    if (step === 2) {
      return (
        <>
          <Text style={commonSharedStyles.stepTitle}>
            Step {preselectedStudentId ? 1 : 2}: Assign Task to {selectedStudentName}
          </Text>
          <View style={appSharedStyles.containerRowFull}>
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
          <ScrollView style={commonSharedStyles.contentScrollView}>
            {isAdHocMode ? (
              // Ad-Hoc Task Input Fields
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
              // Task Library List
              <>
                {isLoadingLibrary && <ActivityIndicator />}
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
                        <View style={appSharedStyles.listItem}>
                          <Text style={appSharedStyles.taskItemText}>
                            {item.title} ({item.baseTickets} pts)
                          </Text>
                          <Text style={appSharedStyles.taskDescription}>{item.description}</Text>
                        </View>
                      </TouchableOpacity>
                    )}
                    ListEmptyComponent={
                      <Text style={commonSharedStyles.baseEmptyText}>Task library is empty.</Text>
                    }
                  />
                )}
              </>
            )}
          </ScrollView>
        </>
      );
    }

    // Step 3: Confirmation
    if (step === 3) {
      const taskTitle = isAdHocMode ? adHocTitle : selectedLibraryTask?.title;
      const taskPoints = isAdHocMode ? adHocBasePoints : selectedLibraryTask?.baseTickets;
      return (
        <>
          <Text style={commonSharedStyles.stepTitle}>
            Step {preselectedStudentId ? 2 : 3}: Confirm Assignment
          </Text>
          <Text style={appSharedStyles.confirmationText}>
            Assign task "{taskTitle || 'N/A'}" ({taskPoints ?? '?'} points) to "
            {selectedStudentName}"?
          </Text>
          {/* Removed the deferred info text */}
        </>
      );
    }
    return null; // Should not happen
  };

  return (
    <Modal animationType="slide" transparent={true} visible={visible} onRequestClose={onClose}>
      <View style={commonSharedStyles.centeredView}>
        <View style={commonSharedStyles.modalView}>
          <Text style={commonSharedStyles.modalTitle}>Assign Task</Text>

          {/* Render content based on current step */}
          {renderStepContent()}

          {/* Loading/Error for mutation */}
          {mutation.isPending && (
            <View style={commonSharedStyles.baseRowCentered}>
              <ActivityIndicator size="small" color={colors.primary} />
              <Text style={commonSharedStyles.baseSecondaryText}>Assigning Task...</Text>
            </View>
          )}
          {mutation.isError && (
            <Text style={[commonSharedStyles.errorText, { marginTop: 10 }]}>
              Error:{' '}
              {mutation.error instanceof Error ? mutation.error.message : 'Failed to assign task'}
            </Text>
          )}

          {/* Footer Buttons */}
          <View style={commonSharedStyles.full}>
            {step === 3 && (
              <Button
                title={mutation.isPending ? 'Assigning...' : 'Confirm & Assign'}
                onPress={handleConfirm}
                disabled={mutation.isPending} // Only disable if mutation is running
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

export default AssignTaskModal;
