// Import necessary React and React Native components
import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  Button,
  ActivityIndicator,
  Alert, // Keep Alert for now, or replace with a better feedback mechanism later
} from 'react-native';
// Import the slider component
import Slider from '@react-native-community/slider';
// Import TanStack Query mutation hook and query client hook
import { useMutation, useQueryClient } from '@tanstack/react-query';

// Import API functions for updating and creating tasks
import { updateAssignedTask, createAssignedTask } from '../api/assignedTasks';
// Import data types
import { AssignedTask, TaskVerificationStatus } from '../mocks/mockAssignedTasks';
import { User } from '../types/userTypes';

// Import authentication context to get the current user ID (verifier/assigner)
import { useAuth } from '../contexts/AuthContext';

// Import utils and styles
import { getUserDisplayName } from '../utils/helpers';
import { colors } from '../styles/colors';

// Define the props for the component
interface TaskVerificationModalProps {
  visible: boolean;
  task: AssignedTask | null; // The task being verified/managed
  allUsers: User[]; // List of all users for displaying names
  onClose: () => void; // Function to close the modal
  // Removed onVerifyTask and onReassignTaskMock props
}

// The TaskVerificationModal component
const TaskVerificationModal: React.FC<TaskVerificationModalProps> = ({
  visible,
  task,
  allUsers,
  onClose,
}) => {
  // Get the current user's ID from the Auth context
  const { currentUserId } = useAuth();
  // Get the Query Client instance to invalidate queries on success
  const queryClient = useQueryClient();

  // --- State Management ---
  const [currentStep, setCurrentStep] = useState(1); // Controls the modal step (1: Status, 2: Points, 3: Re-assign?)
  const [selectedStatus, setSelectedStatus] = useState<TaskVerificationStatus>(undefined); // Status chosen in Step 1
  const [awardedPoints, setAwardedPoints] = useState<number>(0); // Points awarded (used in Step 2)
  const [baseTickets, setBaseTickets] = useState<number>(0); // Base points from the original task

  // --- Mutations ---

  // Mutation hook for handling the task verification/update API call
  const verifyMutation = useMutation({
    mutationFn: updateAssignedTask, // The API function to call
    onSuccess: (updatedTask) => {
      // Function to run on successful mutation
      console.log(`Task ${updatedTask.id} verified successfully via mutation.`);

      // Invalidate relevant queries to refetch data
      // Invalidate the general list of assigned tasks
      queryClient.invalidateQueries({ queryKey: ['assigned-tasks'] });
      // Invalidate tasks specific to the student involved
      queryClient.invalidateQueries({
        queryKey: ['assigned-tasks', { studentId: updatedTask.studentId }],
      });
      // Invalidate the student's balance as it might have changed
      queryClient.invalidateQueries({ queryKey: ['balance', updatedTask.studentId] });
      // Invalidate the student's history (and potentially global history)
      queryClient.invalidateQueries({
        queryKey: ['ticket-history', { studentId: updatedTask.studentId }],
      });
      queryClient.invalidateQueries({ queryKey: ['ticket-history'] }); // Global history

      // Move to the next step in the modal (confirmation/re-assign step)
      setCurrentStep(3);
    },
    onError: (error, variables) => {
      // Function to run on mutation error
      console.error(`Error verifying task ${variables.assignmentId} via mutation:`, error);
      Alert.alert(
        'Error',
        `Failed to verify task: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
      // Optionally reset state or keep the user on the current step
    },
  });

  // Mutation hook for handling the task re-assignment API call
  const reassignMutation = useMutation({
    mutationFn: createAssignedTask, // Use the standard create task API function
    onSuccess: (createdAssignment) => {
      // Function to run on successful re-assignment
      console.log(`Task re-assigned successfully via mutation (New ID: ${createdAssignment.id})`);
      Alert.alert('Success', `Task "${createdAssignment.taskTitle}" re-assigned successfully.`);

      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ['assigned-tasks'] });
      queryClient.invalidateQueries({
        queryKey: ['assigned-tasks', { studentId: createdAssignment.studentId }],
      });

      // Close the modal after successful re-assignment
      onClose();
    },
    onError: (error) => {
      // Function to run on re-assignment error
      console.error('Error re-assigning task via mutation:', error);
      Alert.alert(
        'Error',
        `Failed to re-assign task: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
      // Keep the modal open or handle as appropriate
    },
  });

  // --- Effects ---

  // Effect to reset the modal state when it becomes visible or the task changes
  useEffect(() => {
    if (visible && task) {
      setCurrentStep(1); // Start at Step 1
      setSelectedStatus(undefined); // Clear previous status
      const taskBasePoints = task.taskBasePoints || 0;
      setBaseTickets(taskBasePoints); // Store original base points
      setAwardedPoints(0); // Reset awarded points
      verifyMutation.reset(); // Reset verification mutation state
      reassignMutation.reset(); // Reset re-assign mutation state
    }
  }, [visible, task]); // Dependencies: run when modal visibility or task changes

  // --- Render Logic ---

  // Don't render anything if modal is not visible or no task is provided
  if (!visible || !task) {
    return null;
  }

  // Helper variables for display
  const taskTitle = task.taskTitle;
  const student = allUsers.find(user => user.id === task.studentId);
  const studentName = student ? getUserDisplayName(student) : task.studentId;
  const completedDateTime = task.completedDate
    ? new Date(task.completedDate).toLocaleString()
    : 'N/A';

  // --- Event Handlers ---

  // Handle selection of verification status in Step 1
  const handleStatusSelect = (status: TaskVerificationStatus) => {
    let initialPoints = 0;
    switch (status) {
      case 'verified':
        initialPoints = baseTickets; // Default to full points
        break;
      case 'partial':
        initialPoints = Math.round(baseTickets * 0.5); // Default to half points
        break;
      case 'incomplete':
        initialPoints = 0; // Default to zero points
        break;
    }
    setSelectedStatus(status);
    setAwardedPoints(initialPoints); // Set initial points based on status
    setCurrentStep(2); // Move to Step 2 (Points Adjustment)
  };

  // Handle confirmation of points in Step 2, triggering the verification mutation
  const handleConfirmTickets = () => {
    // Basic validation
    if (!selectedStatus || !currentUserId) {
      Alert.alert('Error', 'Status or Verifier ID missing.');
      return;
    }
    // Prevent double submission
    if (verifyMutation.isPending) return;

    // Ensure points are within valid range (0 to baseTickets)
    const finalPoints = Math.min(baseTickets, Math.max(0, awardedPoints));

    // Prepare the payload for the PATCH request
    const updates: Partial<
      Pick<
        AssignedTask,
        'verificationStatus' | 'verifiedById' | 'verifiedDate' | 'actualPointsAwarded'
      >
    > = {
      verificationStatus: selectedStatus,
      verifiedById: currentUserId, // Set the verifier ID
      // MSW handler will add verifiedDate, but you could add it here too:
      // verifiedDate: new Date().toISOString(),
      // Award points only if status is 'verified' or 'partial'
      actualPointsAwarded:
        selectedStatus === 'verified' || selectedStatus === 'partial' ? finalPoints : undefined,
    };

    // Execute the mutation
    verifyMutation.mutate({ assignmentId: task.id, updates });
  };

  // Handle the "Re-assign Task" button click in Step 3
  const handleReassignTask = () => {
    // Basic validation
    if (!task || !currentUserId) {
      Alert.alert('Error', 'Original task data or Assigner ID missing.');
      return;
    }
    // Prevent double submission
    if (reassignMutation.isPending) return;

    // Prepare payload for the POST request (creating a new task)
    const assignmentData = {
      studentId: task.studentId,
      assignedById: currentUserId, // Current user re-assigns
      taskTitle: task.taskTitle, // Use original details
      taskDescription: task.taskDescription,
      taskBasePoints: task.taskBasePoints,
    };

    // Execute the re-assignment mutation
    reassignMutation.mutate(assignmentData);
  };

  // --- Conditional Rendering for Steps ---

  // Step 1: Select Status
  if (currentStep === 1) {
    return (
      <Modal animationType="slide" transparent={true} visible={visible} onRequestClose={onClose}>
        <View style={modalStyles.centeredView}>
          <View style={modalStyles.modalView}>
            <Text style={modalStyles.modalTitle}>Verify Task</Text>
            <Text style={modalStyles.taskTitle}>{taskTitle}</Text>
            <Text>Student: {studentName}</Text>
            <Text>Potential Tickets: {baseTickets}</Text>
            <Text style={{ marginBottom: 20 }}>Completed: {completedDateTime}</Text>
            <Text style={modalStyles.stepTitle}>Step 1: Select Status</Text>
            <View style={modalStyles.buttonContainer}>
              <Button title="Verified" onPress={() => handleStatusSelect('verified')} />
              <Button
                title="Partial"
                onPress={() => handleStatusSelect('partial')}
                color={colors.warning}
              />
              <Button
                title="Incomplete"
                onPress={() => handleStatusSelect('incomplete')}
                color={colors.danger}
              />
            </View>
            <View style={modalStyles.footerButton}>
              <Button title="Cancel" onPress={onClose} color={colors.secondary} />
            </View>
          </View>
        </View>
      </Modal>
    );
  }

  // Step 2: Adjust/Confirm Points
  if (currentStep === 2 && selectedStatus) {
    // Ensure slider max value is at least 0 (or 1 for visual representation if 0)
    const sliderMaxValue = baseTickets >= 0 ? baseTickets : 0;
    // Slider component might have issues with max=0, so set to 1 if base is 0
    const effectiveSliderMaxValue = sliderMaxValue === 0 ? 1 : sliderMaxValue;

    return (
      <Modal animationType="slide" transparent={true} visible={visible} onRequestClose={onClose}>
        <View style={modalStyles.centeredView}>
          <View style={modalStyles.modalView}>
            <Text style={modalStyles.modalTitle}>Verify Task</Text>
            <Text style={modalStyles.taskTitle}>{taskTitle}</Text>
            <Text>Student: {studentName}</Text>
            <Text style={{ marginBottom: 10 }}>
              Status Selected:{' '}
              <Text
                style={{ /* Status color styling */
                  fontWeight: 'bold',
                  color:
                    selectedStatus === 'verified'
                      ? colors.success
                      : selectedStatus === 'partial'
                        ? colors.warning
                        : colors.danger,
                }}
              >
                {selectedStatus?.toUpperCase()}
              </Text>
            </Text>

            <Text style={modalStyles.stepTitle}>Step 2: Award Tickets</Text>

            {/* Display current awarded points */}
            <View style={modalStyles.pointsInputContainer}>
              <Text style={{ fontSize: 16 }}>Tickets Awarded:</Text>
              <Text style={modalStyles.awardedPointsText}>{awardedPoints}</Text>
            </View>

            {/* Slider for points adjustment */}
            <Slider
              style={modalStyles.slider}
              minimumValue={0}
              maximumValue={effectiveSliderMaxValue} // Use effective max value
              step={1}
              // Ensure slider value stays within bounds
              value={Math.min(effectiveSliderMaxValue, Math.max(0, awardedPoints))}
              // Update awardedPoints state when slider changes
              onValueChange={value => setAwardedPoints(Math.round(value))}
              minimumTrackTintColor={colors.gold}
              maximumTrackTintColor={colors.borderPrimary}
              thumbTintColor={colors.primary}
              // Disable slider while mutation is pending
              disabled={verifyMutation.isPending}
            />
            {/* Display slider range */}
            <View style={modalStyles.rangeText}>
              <Text>0</Text>
              <Text>Max: {baseTickets}</Text>
            </View>

            {/* Loading and Error indicators for verification mutation */}
            {verifyMutation.isPending && (
              <View style={modalStyles.loadingContainer}>
                <ActivityIndicator size="small" color={colors.primary} />
                <Text style={modalStyles.loadingText}>Confirming...</Text>
              </View>
            )}
            {verifyMutation.isError && (
              <Text style={modalStyles.errorText}>
                Error:{' '}
                {verifyMutation.error instanceof Error
                  ? verifyMutation.error.message
                  : 'Failed to verify'}
              </Text>
            )}

            {/* Action Buttons */}
            <View style={modalStyles.buttonContainer}>
              <Button
                title={verifyMutation.isPending ? 'Confirming...' : 'Confirm Tickets'}
                onPress={handleConfirmTickets}
                disabled={verifyMutation.isPending} // Disable while mutation is running
              />
              <Button
                title="Back to Status"
                onPress={() => setCurrentStep(1)} // Go back to Step 1
                color={colors.secondary}
                disabled={verifyMutation.isPending}
              />
            </View>

            {/* Cancel Button */}
            <View style={modalStyles.footerButton}>
              <Button
                title="Cancel Verification"
                onPress={onClose}
                color={colors.secondary}
                disabled={verifyMutation.isPending}
              />
            </View>
          </View>
        </View>
      </Modal>
    );
  }

  // Step 3: Confirmation & Re-assign Option
  if (currentStep === 3) {
    return (
      <Modal animationType="slide" transparent={true} visible={visible} onRequestClose={onClose}>
        <View style={modalStyles.centeredView}>
          <View style={modalStyles.modalView}>
            <Text style={modalStyles.modalTitle}>Verification Complete!</Text>
            <Text style={modalStyles.taskTitle}>{taskTitle}</Text>
            <Text>Student: {studentName}</Text>
            <Text style={{ marginBottom: 20 }}>
              Status: <Text style={{ fontWeight: 'bold' }}>{selectedStatus?.toUpperCase()}</Text>
              {' - '}
              Tickets Awarded:{' '}
              <Text
                style={{ /* Points awarded styling */
                  fontWeight: 'bold',
                  color: awardedPoints > 0 ? colors.success : colors.danger,
                }}
              >
                {awardedPoints}
              </Text>
            </Text>

            <Text style={modalStyles.stepTitle}>Step 3: Re-assign?</Text>

            {/* Loading/Error indicator for re-assign mutation */}
            {reassignMutation.isPending && (
               <View style={modalStyles.loadingContainer}>
                <ActivityIndicator size="small" color={colors.primary} />
                <Text style={modalStyles.loadingText}>Re-assigning...</Text>
              </View>
            )}
             {reassignMutation.isError && (
              <Text style={modalStyles.errorText}>
                Re-assign Error:{' '}
                {reassignMutation.error instanceof Error
                  ? reassignMutation.error.message
                  : 'Failed'}
              </Text>
            )}

            {/* Action Buttons */}
            <View style={modalStyles.buttonContainer}>
              <Button
                title={reassignMutation.isPending ? 'Re-assigning...' : 'Re-assign Task'}
                onPress={handleReassignTask} // Trigger re-assignment mutation
                disabled={reassignMutation.isPending} // Disable while pending
              />
            </View>
            <View style={modalStyles.buttonContainer}>
              <Button
                title="Done"
                onPress={onClose} // Close the modal
                disabled={reassignMutation.isPending} // Disable if re-assign is happening
              />
            </View>
          </View>
        </View>
      </Modal>
    );
  }

  // Fallback if state is somehow invalid
  return null;
};

// Styles for the modal (assuming these are mostly unchanged)
const modalStyles = StyleSheet.create({
  centeredView: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalView: {
    margin: 20,
    backgroundColor: colors.backgroundPrimary,
    borderRadius: 20,
    padding: 35,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
    width: '90%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 15,
    textAlign: 'center',
    color: colors.textPrimary,
  },
  taskTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
    textAlign: 'center',
    color: colors.textPrimary,
  },
  stepTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: 15,
    marginBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderPrimary,
    paddingBottom: 5,
    width: '100%',
    textAlign: 'center',
    color: colors.textPrimary,
  },
  buttonContainer: { flexDirection: 'column', width: '100%', marginTop: 10, gap: 10 },
  footerButton: { width: '100%', marginTop: 20 },
  pointsInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
    gap: 10,
  },
  awardedPointsText: { fontSize: 20, fontWeight: 'bold', color: colors.gold },
  slider: { width: '100%', height: 40, marginTop: 10 },
  rangeText: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    paddingHorizontal: 5,
    marginTop: -5,
    marginBottom: 5,
    fontSize: 12,
    color: colors.textSecondary,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 20,
    marginBottom: 10,
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

export default TaskVerificationModal;