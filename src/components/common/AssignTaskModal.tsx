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
  StyleSheet, // Added StyleSheet
} from 'react-native';

// API Imports (Reads use Supabase, create is deferred)
import { createAssignedTask } from '../../api/assignedTasks'; // Deferred
import { fetchTaskLibrary } from '../../api/taskLibrary'; // Supabase
import { fetchStudents, fetchUserProfile } from '../../api/users'; // Supabase (fetchStudents used here)

// Hook & Context Imports
import { useAuth } from '../../contexts/AuthContext'; // Needed for assigner ID

// Type Imports
import { AssignedTask, TaskLibraryItem, User, SimplifiedStudent } from '../../types/dataTypes'; // Added User/SimplifiedStudent
import { AssignTaskModalProps } from '../../types/componentProps';

// Style Imports
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
  const { currentUserId: assignerId, currentUserRole } = useAuth(); // Renamed for clarity
  const queryClient = useQueryClient();

  // --- State Management ---
  const [step, setStep] = useState(1); // Current step in the modal flow
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [selectedLibraryTask, setSelectedLibraryTask] = useState<TaskLibraryItem | null>(null);
  const [isAdHocMode, setIsAdHocMode] = useState(false); // Toggle between library/custom
  // State for Ad Hoc task details
  const [adHocTitle, setAdHocTitle] = useState('');
  const [adHocDescription, setAdHocDescription] = useState('');
  const [adHocBasePoints, setAdHocBasePoints] = useState<number | ''>('');
  // State for student search
  const [studentSearchTerm, setStudentSearchTerm] = useState('');
  // --- End State Management ---


  // --- Data Fetching ---
  // Fetch Task Library (Uses Supabase)
  const {
      data: taskLibrary = [],
      isLoading: isLoadingLibrary,
      isError: isErrorLibrary, // Add error handling
      error: errorLibrary,
  } = useQuery<TaskLibraryItem[], Error>({
    queryKey: ['task-library'], // Use standard key
    queryFn: fetchTaskLibrary, // Use Supabase API
    staleTime: 10 * 60 * 1000,
    enabled: visible && step === 2 && !isAdHocMode, // Fetch only when needed
  });

  // Determine teacherId filter for student list if current user is a teacher
  const filterTeacherId = currentUserRole === 'teacher' ? assignerId : undefined;

  // Fetch Active Students (Uses Supabase fetchStudents)
  // Fetches only when step 1 is active and no student is preselected
  const {
    data: studentListResult, // Contains { students: SimplifiedStudent[], ... }
    isLoading: isLoadingStudents,
    isError: isErrorStudents,
    error: errorStudents,
  } = useQuery({
    queryKey: [
      'students', // Base key
      { // Params
        filter: 'active',
        context: 'assignTaskModal', // Context for query key uniqueness
        teacherId: filterTeacherId, // Apply teacher filter if applicable
        // No pagination needed here? Fetch all relevant students? Or paginate selector?
        // For simplicity, fetch a larger limit assuming not thousands of students per teacher/admin
        limit: 500, // Adjust limit as needed
        page: 1,
      },
    ],
    queryFn: () => fetchStudents({
        filter: 'active', // Only assign tasks to active students
        page: 1,
        limit: 500, // Match limit in key
        teacherId: filterTeacherId, // Pass teacherId if defined
        // Search term is applied client-side below for responsiveness
    }),
    enabled: visible && step === 1 && !preselectedStudentId && !!assignerId, // Conditions to enable fetch
    staleTime: 5 * 60 * 1000,
  });
  // --- End Data Fetching ---


  // --- Memoized Derived Data ---
  // Memoize sorted task library
  const sortedTasks = useMemo(
    () => [...taskLibrary].sort((a, b) => a.title.localeCompare(b.title)),
    [taskLibrary]
  );

  // Memoize the list of available students from the fetched result
  const availableStudents: SimplifiedStudent[] = useMemo(() => {
    return studentListResult?.students ?? [];
  }, [studentListResult]);

  // Memoize client-side filtering of students based on search term
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

  // Memoize student name for display in later steps
  const selectedStudentName = useMemo(() => {
      if (!selectedStudentId) return 'Unknown Student';
      // Find in the fetched list or potentially fetch individually if not found (less ideal)
      const student = availableStudents.find(s => s.id === selectedStudentId);
      return student?.name || `ID: ${selectedStudentId}`; // Fallback to ID if name not found
  }, [selectedStudentId, availableStudents]);
  // --- End Memoized Derived Data ---


  // --- Mutation (Points to deferred API) ---
  const mutation = useMutation({
    mutationFn: createAssignedTask, // This API function is deferred
    onSuccess: (createdAssignment) => {
        // This part won't execute with current setup
        console.log('[AssignTaskModal] Task assigned (Simulated):', createdAssignment);
        queryClient.invalidateQueries({ queryKey: ['assigned-tasks'] }); // Invalidate global list
        queryClient.invalidateQueries({ queryKey: ['assigned-tasks', { studentId: createdAssignment.studentId }] }); // Invalidate student-specific list
        onClose();
        Toast.show({ type: 'success', text1: 'Success', text2: 'Task assignment simulated.' });
    },
    onError: (error) => {
        // This *will* execute immediately if mutate is called
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
  // --- End Mutation ---


  // Effect to handle preselection and modal visibility changes
  useEffect(() => {
    if (visible) {
      // Reset common fields
      setIsAdHocMode(false);
      setSelectedLibraryTask(null);
      setAdHocTitle('');
      setAdHocDescription('');
      setAdHocBasePoints('');
      setStudentSearchTerm('');
      mutation.reset();

      // Handle preselection
      if (preselectedStudentId) {
        setSelectedStudentId(preselectedStudentId);
        setStep(2); // Skip student selection step
      } else {
        setSelectedStudentId(null);
        setStep(1); // Start at student selection
      }
    } else {
      // Full reset when modal closes
      setStep(1);
      setSelectedStudentId(null);
      setSelectedLibraryTask(null);
      setIsAdHocMode(false);
      setAdHocTitle('');
      setAdHocDescription('');
      setAdHocBasePoints('');
      setStudentSearchTerm('');
    }
  }, [visible, preselectedStudentId]); // Dependencies


  // --- Event Handlers ---
  const handleStudentSelect = (studentId: string) => {
    setSelectedStudentId(studentId);
    setStep(2); // Move to task selection
  };

  const handleLibraryTaskSelect = (task: TaskLibraryItem) => {
    setSelectedLibraryTask(task);
    setIsAdHocMode(false); // Ensure ad-hoc mode is off
    setStep(3); // Move to confirmation
  };

  const handleAdHocSubmit = () => {
    // Validate ad-hoc fields before proceeding
    const numericPoints = typeof adHocBasePoints === 'number' ? adHocBasePoints : parseInt(String(adHocBasePoints || '-1'), 10);
    if (!adHocTitle.trim() || !adHocDescription.trim() || isNaN(numericPoints) || numericPoints < 0) {
      Toast.show({ type: 'error', text1: 'Validation Error', text2: 'Please fill in valid Title, Description, and Points for custom tasks.' });
      return;
    }
    setSelectedLibraryTask(null); // Ensure library task is deselected
    setIsAdHocMode(true); // Ensure ad-hoc mode is on
    setStep(3); // Move to confirmation
  };

  // Handle Confirm Button Press - NOW SHOWS INFO/ERROR
  const handleConfirm = () => {
    if (!selectedStudentId || !assignerId) {
      Toast.show({ type: 'error', text1: 'Error', text2: 'Student or assigner ID missing.' });
      return;
    }

    // Prepare data structure (even though API is deferred)
    let assignmentData: Omit<AssignedTask, 'id' | 'isComplete' | 'verificationStatus' | 'assignedDate'> & { assignedById: string };

    if (isAdHocMode) {
        const numericPoints = typeof adHocBasePoints === 'number' ? adHocBasePoints : parseInt(String(adHocBasePoints || '-1'), 10);
        if (!adHocTitle.trim() || !adHocDescription.trim() || isNaN(numericPoints) || numericPoints < 0) {
            Toast.show({ type: 'error', text1: 'Validation Error', text2: 'Invalid custom task details.' }); return;
        }
        assignmentData = { studentId: selectedStudentId, assignedById: assignerId, taskTitle: adHocTitle.trim(), taskDescription: adHocDescription.trim(), taskBasePoints: numericPoints };
    } else if (selectedLibraryTask) {
        assignmentData = { studentId: selectedStudentId, assignedById: assignerId, taskTitle: selectedLibraryTask.title, taskDescription: selectedLibraryTask.description, taskBasePoints: selectedLibraryTask.baseTickets };
    } else {
        Toast.show({ type: 'error', text1: 'Validation Error', text2: 'No task selected or defined.' }); return;
    }

    // --- DEFERRED ACTION ---
     Toast.show({
        type: 'info',
        text1: 'Feature Not Implemented',
        text2: 'Task assignment requires server-side logic.',
        visibilityTime: 5000,
    });
    console.warn("[AssignTaskModal] Attempted task assignment, but API implementation is deferred.", assignmentData);
    // mutation.mutate(assignmentData); // DO NOT CALL MUTATE YET
    // --- END DEFERRED ACTION ---
  };

  // Navigate back through steps or close
  const goBack = () => {
    if (step === 3) {
      setStep(2); // Back to task selection/definition
      // Reset selection based on mode? Optional.
      // if (!isAdHocMode) setSelectedLibraryTask(null);
    } else if (step === 2 && !preselectedStudentId) {
      setStep(1); // Back to student selection (if not preselected)
      setSelectedStudentId(null); // Clear student selection
    } else {
      onClose(); // Close if on step 1, or step 2 with preselection
    }
  };


  // --- Render Logic ---
  const renderStepContent = () => {
    // Step 1: Select Student (only if not preselected)
    if (step === 1 && !preselectedStudentId) {
      return (
        <>
          <Text style={modalSharedStyles.stepTitle}>Step 1: Select Student</Text>
          <TextInput
            style={commonSharedStyles.searchInput} // Use common style
            placeholder={filterTeacherId ? "Search Your Students..." : "Search All Active Students..."}
            value={studentSearchTerm}
            onChangeText={setStudentSearchTerm}
            placeholderTextColor={colors.textLight}
            autoCapitalize="none"
            autoCorrect={false}
          />
          {isLoadingStudents && <ActivityIndicator color={colors.primary} style={styles.listLoader} />}
          {isErrorStudents && <Text style={commonSharedStyles.errorText}>Error loading students: {errorStudents?.message}</Text>}
          {!isLoadingStudents && !isErrorStudents && (
            <FlatList
              style={modalSharedStyles.contentScrollView} // Limit height
              data={filteredStudents} // Use client-side filtered list
              keyExtractor={item => item.id}
              renderItem={({ item }) => (
                <TouchableOpacity onPress={() => handleStudentSelect(item.id)}>
                  <View style={modalSharedStyles.listItem}>
                    <Text style={modalSharedStyles.listItemText}>{item.name}</Text>
                  </View>
                </TouchableOpacity>
              )}
              ListEmptyComponent={<Text style={appSharedStyles.emptyListText}>{studentSearchTerm ? 'No students match search.' : 'No active students found.'}</Text>}
            />
          )}
        </>
      );
    }

    // Step 2: Select Task (Library or Ad Hoc)
    if (step === 2) {
      return (
        <>
          <Text style={modalSharedStyles.stepTitle}>Step {preselectedStudentId ? 1 : 2}: Assign Task to {selectedStudentName}</Text>
          <View style={modalSharedStyles.modeSwitchContainer}>
            <Text style={commonSharedStyles.label}>Select from Library</Text>
            <Switch trackColor={{ false: colors.secondary, true: colors.primary }} thumbColor={colors.backgroundPrimary} ios_backgroundColor={colors.secondary} onValueChange={setIsAdHocMode} value={isAdHocMode} />
            <Text style={commonSharedStyles.label}>Create Custom Task</Text>
          </View>
          <ScrollView style={modalSharedStyles.contentScrollView}>
            {isAdHocMode ? ( // Ad Hoc Task Definition
              <View>
                <Text style={commonSharedStyles.label}>Custom Task Title:</Text>
                <TextInput style={commonSharedStyles.input} value={adHocTitle} onChangeText={setAdHocTitle} placeholder="e.g., Help setup for recital" placeholderTextColor={colors.textLight} editable={!mutation.isPending} />
                <Text style={commonSharedStyles.label}>Custom Task Description:</Text>
                <TextInput style={commonSharedStyles.textArea} value={adHocDescription} onChangeText={setAdHocDescription} placeholder="Describe the task briefly" placeholderTextColor={colors.textLight} multiline={true} editable={!mutation.isPending} />
                <Text style={commonSharedStyles.label}>Base Points:</Text>
                <TextInput style={commonSharedStyles.input} value={String(adHocBasePoints)} onChangeText={text => setAdHocBasePoints(text === '' ? '' : parseInt(text.replace(/[^0-9]/g, ''), 10) || 0)} placeholder="e.g., 50" placeholderTextColor={colors.textLight} keyboardType="numeric" editable={!mutation.isPending} />
                <Button title="Use This Custom Task" onPress={handleAdHocSubmit} disabled={mutation.isPending || !adHocTitle.trim() || !adHocDescription.trim() || adHocBasePoints === '' || adHocBasePoints < 0} />
              </View>
            ) : ( // Library Task Selection
              <>
                {isLoadingLibrary && <ActivityIndicator style={styles.listLoader} />}
                {isErrorLibrary && <Text style={commonSharedStyles.errorText}>Error loading task library: {errorLibrary?.message}</Text>}
                {!isLoadingLibrary && !isErrorLibrary && (
                  <FlatList
                    data={sortedTasks} // Already sorted
                    keyExtractor={item => item.id}
                    renderItem={({ item }) => (
                      <TouchableOpacity onPress={() => handleLibraryTaskSelect(item)}>
                        <View style={modalSharedStyles.listItem}>
                          <Text style={modalSharedStyles.taskItemText}>{item.title} ({item.baseTickets} pts)</Text>
                          <Text style={modalSharedStyles.taskDescription}>{item.description}</Text>
                        </View>
                      </TouchableOpacity>
                    )}
                    ListEmptyComponent={<Text style={appSharedStyles.emptyListText}>Task library is empty.</Text>}
                    // No scrollEnabled={false} needed here as it's inside ScrollView
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
          <Text style={modalSharedStyles.stepTitle}>Step {preselectedStudentId ? 2 : 3}: Confirm Assignment</Text>
          <Text style={modalSharedStyles.confirmationText}>
            Assign task "{taskTitle || 'N/A'}" ({taskPoints ?? '?'} points) to "{selectedStudentName}"?
          </Text>
           <Text style={styles.infoText}>Note: Task assignment requires server-side setup and is currently disabled.</Text>
        </>
      );
    }
    return null; // Should not reach here
  };


  // --- Main Modal Return ---
  return (
    <Modal animationType="slide" transparent={true} visible={visible} onRequestClose={onClose}>
      <View style={modalSharedStyles.centeredView}>
        <View style={modalSharedStyles.modalView}>
          <Text style={modalSharedStyles.modalTitle}>Assign Task</Text>

          {renderStepContent()}

          {/* Info/Error related to deferred API */}
          {/* Loading state might not be needed if mutate isn't called */}
          {/* {mutation.isPending && ... } */}
          {/* {mutation.isError && ... } */}


          {/* Footer Buttons */}
          <View style={modalSharedStyles.buttonContainer}>
             {/* Show Confirm button only on step 3 */}
              {step === 3 && (
                 <Button
                    title={"Confirm & Assign (Disabled)"}
                    onPress={handleConfirm} // Still calls validation & shows info
                    disabled={true} // Always disable for now
                 />
              )}
             {/* Back Button */}
             {((step > 1 && !preselectedStudentId) || step === 3 || (step === 2 && preselectedStudentId)) && (
                 <Button title="Back" onPress={goBack} color={colors.secondary} disabled={mutation.isPending} />
             )}
             {/* Cancel Button */}
             <Button title="Cancel" onPress={onClose} color={colors.secondary} disabled={mutation.isPending} />
          </View>
        </View>
      </View>
    </Modal>
  );
};

// Local Styles
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
    }
});

export default AssignTaskModal;