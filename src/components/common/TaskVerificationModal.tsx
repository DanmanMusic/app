// src/components/common/TaskVerificationModal.tsx
import React, { useState, useEffect } from 'react';
import Slider from '@react-native-community/slider';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Modal, View, Text, Button, ActivityIndicator, StyleSheet } from 'react-native'; // Added StyleSheet

// API Imports (fetchUserProfile is Supabase, update/create are deferred)
import { updateAssignedTask, createAssignedTask } from '../../api/assignedTasks'; // APIs are deferred
import { fetchUserProfile } from '../../api/users'; // Use Supabase API

import { useAuth } from '../../contexts/AuthContext'; // For verifier ID
import { AssignedTask, TaskVerificationStatus, User } from '../../types/dataTypes';
import { colors } from '../../styles/colors';
import { TaskVerificationModalProps } from '../../types/componentProps';
import { getUserDisplayName } from '../../utils/helpers';
import { modalSharedStyles } from '../../styles/modalSharedStyles';
import { commonSharedStyles } from '../../styles/commonSharedStyles';
import Toast from 'react-native-toast-message';

const TaskVerificationModal: React.FC<TaskVerificationModalProps> = ({
  visible,
  task,
  onClose,
}) => {
  const { currentUserId: verifierId } = useAuth(); // Get ID of user performing verification
  const studentId = task?.studentId; // Get studentId from the task prop
  const queryClient = useQueryClient();

  // --- State Management ---
  const [currentStep, setCurrentStep] = useState(1); // 1: Select Status, 2: Set Points, 3: Confirm/Reassign
  const [selectedStatus, setSelectedStatus] = useState<TaskVerificationStatus>(undefined);
  const [awardedPoints, setAwardedPoints] = useState<number>(0);
  const [baseTickets, setBaseTickets] = useState<number>(0); // Store base tickets locally
  // --- End State ---


  // --- Data Fetching ---
  // Fetch Student Profile for display name
  const {
    data: student,
    isLoading: isLoadingStudent,
    isError: studentFetchError,
    error: studentFetchErrorMsg,
  } = useQuery<User | null, Error>({
    queryKey: ['userProfile', studentId, { context: 'verificationModal' }], // Use profile key, add context
    queryFn: () => fetchUserProfile(studentId!), // Use Supabase API
    enabled: !!visible && !!studentId, // Fetch only when modal visible and studentId available
    staleTime: 5 * 60 * 1000,
  });
  // --- End Data Fetching ---


  // --- Mutations (Point to deferred APIs) ---
  // Kept for potential UI state management, but mutate calls are disabled
  const verifyMutation = useMutation({
    mutationFn: updateAssignedTask, // Points to API where verification logic is deferred
    onSuccess: (updatedTask) => {
        // Won't be reached currently
        console.log(`[TaskVerificationModal] Task ${updatedTask.id} verified (Simulated).`);
        // Invalidate relevant queries if API call were made
        queryClient.invalidateQueries({ queryKey: ['assigned-tasks', { studentId: updatedTask.studentId }] });
        queryClient.invalidateQueries({ queryKey: ['assigned-tasks'] });
        // queryClient.invalidateQueries({ queryKey: ['balance', updatedTask.studentId] }); // Deferred
        // queryClient.invalidateQueries({ queryKey: ['ticket-history', { studentId: updatedTask.studentId }] }); // Deferred
        setCurrentStep(3); // Move to final step on success
    },
    onError: (error: Error, variables) => {
        // This WILL be reached if mutate is called
        console.error(`[TaskVerificationModal] Error verifying task ${variables.assignmentId}:`, error);
        Toast.show({ type: 'error', text1: 'Verification Not Implemented', text2: error.message || 'Could not verify task.' });
    },
  });

  const reassignMutation = useMutation({
    mutationFn: createAssignedTask, // Points to deferred API
    onSuccess: (createdAssignment) => {
        // Won't be reached currently
        console.log(`[TaskVerificationModal] Task re-assigned (Simulated): ${createdAssignment.id}`);
        queryClient.invalidateQueries({ queryKey: ['assigned-tasks', { studentId: createdAssignment.studentId }] });
        queryClient.invalidateQueries({ queryKey: ['assigned-tasks'] });
        onClose(); // Close modal after reassigning
        Toast.show({ type: 'success', text1: 'Success', text2: `Task "${createdAssignment.taskTitle}" re-assign simulated.` });
    },
    onError: (error: Error) => {
        // This WILL be reached if mutate is called
        console.error('[TaskVerificationModal] Error re-assigning task:', error);
        Toast.show({ type: 'error', text1: 'Re-assign Not Implemented', text2: error.message || 'Could not re-assign task.' });
    },
  });
  // --- End Mutations ---


  // Effect to reset state when modal opens or task changes
  useEffect(() => {
    if (visible && task) {
      setCurrentStep(1);
      setSelectedStatus(undefined);
      const taskBasePoints = task.taskBasePoints || 0;
      setBaseTickets(taskBasePoints); // Store base points from task
      setAwardedPoints(0); // Reset awarded points
      verifyMutation.reset();
      reassignMutation.reset();
    } else {
       // Clear state if modal closed or no task
       setCurrentStep(1);
       setSelectedStatus(undefined);
       setAwardedPoints(0);
       setBaseTickets(0);
    }
  }, [visible, task]); // Rerun when visibility or task changes


  // --- Event Handlers ---
  const handleStatusSelect = (status: TaskVerificationStatus) => {
    let initialPoints = 0;
    // Set initial points based on selected status and stored baseTickets
    switch (status) {
      case 'verified': initialPoints = baseTickets; break;
      case 'partial': initialPoints = Math.round(baseTickets * 0.5); break;
      case 'incomplete': initialPoints = 0; break;
    }
    setSelectedStatus(status);
    setAwardedPoints(initialPoints);
    setCurrentStep(2); // Move to points adjustment step
  };

  // Handle Confirm Tickets Button - NOW SHOWS INFO/ERROR
  const handleConfirmTickets = () => {
    if (!selectedStatus || !verifierId || !task) {
      Toast.show({ type: 'error', text1: 'Error', text2: 'Status, Verifier ID, or Task missing.' });
      return;
    }
    if (verifyMutation.isPending) return; // Prevent double clicks (though button disabled)

    // --- DEFERRED ACTION ---
    Toast.show({
        type: 'info',
        text1: 'Feature Not Implemented',
        text2: 'Task verification/point awarding requires server-side logic.',
        visibilityTime: 5000,
    });
     console.warn("Attempted task verification, but API implementation is deferred.");
    // const finalPoints = Math.min(baseTickets, Math.max(0, awardedPoints));
    // const updates: Partial<Pick<...>> = { ... };
    // verifyMutation.mutate({ assignmentId: task.id, updates }); // DO NOT CALL YET
    // --- END DEFERRED ACTION ---

     // Simulate success for UI flow ONLY (Optional)
     // setCurrentStep(3);
  };

  // Handle Reassign Button - NOW SHOWS INFO/ERROR
  const handleReassignTask = () => {
    if (!task || !verifierId) {
      Toast.show({ type: 'error', text1: 'Error', text2: 'Original task data or Assigner ID missing.' });
      return;
    }
    if (reassignMutation.isPending) return; // Prevent double clicks

    // --- DEFERRED ACTION ---
    Toast.show({
        type: 'info',
        text1: 'Feature Not Implemented',
        text2: 'Task re-assignment requires server-side logic.',
        visibilityTime: 5000,
    });
    console.warn("Attempted task re-assignment, but API implementation is deferred.");
    // const assignmentData = { studentId: task.studentId, assignedById: verifierId, ... };
    // reassignMutation.mutate(assignmentData); // DO NOT CALL YET
    // --- END DEFERRED ACTION ---
  };


  // --- Render Logic ---
  // Don't render if not visible or task missing
  if (!visible || !task) {
    return null;
  }

  // Get student display name with loading/error handling
  const studentNameDisplay = isLoadingStudent ? 'Loading student...'
                           : studentFetchError ? 'Error loading student'
                           : student ? getUserDisplayName(student)
                           : 'Unknown Student';

  const taskTitle = task.taskTitle;
  const completedDateTime = task.completedDate ? new Date(task.completedDate).toLocaleString() : 'N/A';
  const basePointsDisplay = baseTickets; // Use state value


  // Step 1: Select Verification Status
  if (currentStep === 1) {
    return (
      <Modal animationType="slide" transparent={true} visible={visible} onRequestClose={onClose}>
        <View style={modalSharedStyles.centeredView}>
          <View style={modalSharedStyles.modalView}>
            <Text style={modalSharedStyles.modalTitle}>Verify Task</Text>
            <Text style={modalSharedStyles.taskTitle}>{taskTitle}</Text>
            <Text>Student: {studentNameDisplay}</Text>
            <Text>Potential Tickets: {basePointsDisplay}</Text>
            <Text style={{ marginBottom: 20 }}>Completed: {completedDateTime}</Text>

            <Text style={modalSharedStyles.stepTitle}>Step 1: Select Status</Text>
            {isLoadingStudent && <ActivityIndicator color={colors.primary} />}
            {studentFetchError && <Text style={commonSharedStyles.errorText}>Error: {studentFetchErrorMsg?.message}</Text>}

            <View style={modalSharedStyles.buttonContainer}>
              <Button title="Verified" onPress={() => handleStatusSelect('verified')} disabled={isLoadingStudent} />
              <Button title="Partial" onPress={() => handleStatusSelect('partial')} color={colors.warning} disabled={isLoadingStudent} />
              <Button title="Incomplete" onPress={() => handleStatusSelect('incomplete')} color={colors.danger} disabled={isLoadingStudent} />
            </View>
            <View style={modalSharedStyles.footerButton}>
              <Button title="Cancel" onPress={onClose} color={colors.secondary} />
            </View>
          </View>
        </View>
      </Modal>
    );
  }

  // Step 2: Adjust Awarded Points
  if (currentStep === 2 && selectedStatus) {
    // Determine button state (always disabled for confirm)
    const isConfirmDisabled = true; // Always disable confirm as API is deferred
    // const isConfirmDisabled = verifyMutation.isPending;

    return (
      <Modal animationType="slide" transparent={true} visible={visible} onRequestClose={onClose}>
        <View style={modalSharedStyles.centeredView}>
          <View style={modalSharedStyles.modalView}>
            <Text style={modalSharedStyles.modalTitle}>Verify Task</Text>
            <Text style={modalSharedStyles.taskTitle}>{taskTitle}</Text>
            <Text>Student: {studentNameDisplay}</Text>
            <Text style={{ marginBottom: 10 }}>
              Status Selected:{' '}
              <Text style={[styles.statusText, {
                  color: selectedStatus === 'verified' ? colors.success : selectedStatus === 'partial' ? colors.warning : colors.danger
              }]}>
                {selectedStatus?.toUpperCase()}
              </Text>
            </Text>

            <Text style={modalSharedStyles.stepTitle}>Step 2: Award Tickets</Text>
            {/* Disable slider/points input if status is incomplete */}
            {selectedStatus !== 'incomplete' ? (
              <>
                <View style={modalSharedStyles.pointsInputContainer}>
                  <Text style={{ fontSize: 16 }}>Tickets Awarded:</Text>
                  <Text style={modalSharedStyles.awardedPointsText}>{awardedPoints}</Text>
                </View>
                <Slider
                  style={modalSharedStyles.slider}
                  minimumValue={0}
                  maximumValue={Math.max(1, basePointsDisplay)} // Ensure max is at least 1 for slider to render properly
                  step={1}
                  value={awardedPoints} // Use state value
                  onValueChange={value => setAwardedPoints(Math.round(value))}
                  minimumTrackTintColor={colors.gold}
                  maximumTrackTintColor={colors.borderPrimary}
                  thumbTintColor={colors.primary}
                  disabled={verifyMutation.isPending} // Disable slider if mutation *could* run
                />
                <View style={modalSharedStyles.rangeText}>
                  <Text>0</Text>
                  <Text>Max: {basePointsDisplay}</Text>
                </View>
              </>
            ) : (
              <Text style={styles.infoText}>No points awarded for 'Incomplete' status.</Text>
            )}

            <Text style={styles.infoText}>Note: Point awarding requires server-side setup and is currently disabled.</Text>

             {/* Remove mutation loading/error display */}
             {/* {verifyMutation.isPending && ... } */}
             {/* {verifyMutation.isError && ... } */}

            <View style={modalSharedStyles.buttonContainer}>
              <Button
                title={"Confirm Tickets (Disabled)"} // Update text
                onPress={handleConfirmTickets} // Still calls validation/shows info
                disabled={isConfirmDisabled} // Always disabled
              />
              <Button title="Back to Status" onPress={() => setCurrentStep(1)} color={colors.secondary} disabled={verifyMutation.isPending} />
            </View>
            <View style={modalSharedStyles.footerButton}>
              <Button title="Cancel Verification" onPress={onClose} color={colors.secondary} disabled={verifyMutation.isPending} />
            </View>
          </View>
        </View>
      </Modal>
    );
  }

  // Step 3: Confirmation / Re-assign Option
  if (currentStep === 3) {
     // Determine button states (always disabled)
     const isReassignDisabled = true;
     // const isReassignDisabled = reassignMutation.isPending;

    return (
      <Modal animationType="slide" transparent={true} visible={visible} onRequestClose={onClose}>
        <View style={modalSharedStyles.centeredView}>
          <View style={modalSharedStyles.modalView}>
            {/* Show success message based on simulated outcome */}
            <Text style={modalSharedStyles.modalTitle}>Verification Step Complete</Text>
            <Text style={modalSharedStyles.taskTitle}>{taskTitle}</Text>
            <Text>Student: {studentNameDisplay}</Text>
            <Text style={{ marginBottom: 20 }}>
              Status Recorded As: <Text style={{ fontWeight: 'bold' }}>{selectedStatus?.toUpperCase()}</Text>
              {' - '} Points Set To: <Text style={{ fontWeight: 'bold', color: awardedPoints > 0 ? colors.success : colors.textSecondary }}>{awardedPoints}</Text>
            </Text>
            <Text style={styles.infoText}>(Note: Points were not actually awarded yet)</Text>


            <Text style={modalSharedStyles.stepTitle}>Step 3: Re-assign?</Text>
            <Text style={styles.infoText}>Note: Re-assigning requires server-side setup and is currently disabled.</Text>

             {/* Remove mutation loading/error display */}
             {/* {reassignMutation.isPending && ... } */}
             {/* {reassignMutation.isError && ... } */}

            <View style={modalSharedStyles.buttonContainer}>
              <Button
                title={"Re-assign Task (Disabled)"} // Update text
                onPress={handleReassignTask} // Still calls validation/shows info
                disabled={isReassignDisabled} // Always disabled
              />
            </View>
            <View style={modalSharedStyles.buttonContainer}>
              <Button title="Done" onPress={onClose} disabled={reassignMutation.isPending} />
            </View>
          </View>
        </View>
      </Modal>
    );
  }

  return null; // Fallback if state is unexpected
};

// Local styles
const styles = StyleSheet.create({
    statusText: {
        fontWeight: 'bold',
        // Color is set inline
    },
    infoText: {
        fontSize: 12,
        color: colors.textLight,
        textAlign: 'center',
        marginBottom: 15,
        fontStyle: 'italic',
    }
});

export default TaskVerificationModal;