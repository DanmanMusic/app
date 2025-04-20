// src/components/TaskVerificationModal.tsx
import React, { useState, useEffect } from 'react';
import { Modal, View, Text, StyleSheet, Button, Platform } from 'react-native'; // Removed Alert, TextInput not used
import Slider from '@react-native-community/slider';

// Import required types
import { AssignedTask, TaskVerificationStatus } from '../mocks/mockAssignedTasks';
import { TaskLibraryItem } from '../mocks/mockTaskLibrary';
// Import NEW user type
import { User } from '../types/userTypes';
// Import NEW helper for display names
import { getTaskTitle, getUserDisplayName } from '../utils/helpers';

// Import styles and colors
import { colors } from '../styles/colors';


// Props interface uses the new User type for the allUsers array
interface TaskVerificationModalProps {
  visible: boolean;
  task: AssignedTask | null;
  taskLibrary: TaskLibraryItem[];
  allUsers: User[]; // Use new User type
  onClose: () => void;
  onVerifyTask: (taskId: string, status: TaskVerificationStatus, points: number) => void;
  onReassignTaskMock: (taskId: string, studentId: string) => void; // Renamed from originalTaskId for clarity
}

const TaskVerificationModal: React.FC<TaskVerificationModalProps> = ({
  visible,
  task,
  taskLibrary,
  allUsers, // Receives array of full User objects
  onClose,
  onVerifyTask,
  onReassignTaskMock,
}) => {
  // State for modal flow and data
  const [currentStep, setCurrentStep] = useState(1);
  const [selectedStatus, setSelectedStatus] = useState<TaskVerificationStatus>(undefined);
  const [awardedPoints, setAwardedPoints] = useState<number>(0);
  const [baseTickets, setBaseTickets] = useState<number>(0); // Base tickets for the task

  // Effect to reset state and calculate base points when task/visibility changes
  useEffect(() => {
    if (visible && task) {
      setCurrentStep(1); // Always start at step 1 when modal opens
      setSelectedStatus(undefined); // Reset status selection
      const libraryTask = taskLibrary.find(item => item.id === task.taskId);
      const taskBaseTickets = libraryTask ? libraryTask.baseTickets : 0;
      setBaseTickets(taskBaseTickets); // Set the base tickets for the current task
      setAwardedPoints(0); // Reset awarded points
    } else if (!visible) {
      // Optional: Reset state when modal is fully closed (might not be necessary)
      // setCurrentStep(1);
      // setSelectedStatus(undefined);
      // setAwardedPoints(0);
      // setBaseTickets(0);
    }
  }, [visible, task, taskLibrary]); // Dependencies array includes relevant props

  // Don't render anything if not visible or no task provided
  if (!visible || !task) {
    return null;
  }

  // Get task title using helper
  const taskTitle = getTaskTitle(task.taskId, taskLibrary);
  // Find the student's full User object from the provided list
  const student = allUsers.find(user => user.id === task.studentId);
  // Get the student's display name using the helper (fallback to ID if not found)
  const studentName = student ? getUserDisplayName(student) : task.studentId;

  // Format the completion date/time string
  const completedDateTime = task.completedDate
     ? new Date(task.completedDate).toLocaleString() // Use locale string for readability
     : 'N/A';


  // Handler for selecting the verification status in Step 1
  const handleStatusSelect = (status: TaskVerificationStatus) => {
    let initialPoints = 0;
    // Set initial points based on selected status and task's base tickets
    switch (status) {
      case 'verified':
        initialPoints = baseTickets;
        break;
      case 'partial':
        initialPoints = Math.round(baseTickets * 0.5); // Default to 50% for partial
        break;
      case 'incomplete':
        initialPoints = 0; // No points for incomplete
        break;
    }
    setSelectedStatus(status);
    setAwardedPoints(initialPoints); // Set initial awarded points for the slider
    setCurrentStep(2); // Move to Step 2 (point adjustment)
  };

  // Render Step 1: Status Selection
  if (currentStep === 1) {
    return (
      <Modal animationType="slide" transparent={true} visible={visible} onRequestClose={onClose}>
        <View style={modalStyles.centeredView}>
          <View style={modalStyles.modalView}>
            <Text style={modalStyles.modalTitle}>Verify Task</Text>
            <Text style={modalStyles.taskTitle}>{taskTitle}</Text>
            {/* Use derived student display name */}
            <Text>Student: {studentName}</Text>
            <Text>Potential Tickets: {baseTickets}</Text>
            <Text style={{ marginBottom: 20 }}>
              Completed: {completedDateTime}
            </Text>

            <Text style={modalStyles.stepTitle}>Step 1: Select Status</Text>

            {/* Status selection buttons */}
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

            {/* Cancel Button */}
            <View style={modalStyles.footerButton}>
              <Button title="Cancel" onPress={onClose} color={colors.secondary} />
            </View>
          </View>
        </View>
      </Modal>
    );
  }

   // Render Step 2: Point Adjustment
  if (currentStep === 2 && selectedStatus) {
     // Determine slider max value (ensure it's non-negative)
     const sliderMaxValue = baseTickets >= 0 ? baseTickets : 0;
     // Handle edge case where max value is 0 for the slider component (must be > 0)
     const effectiveSliderMaxValue = sliderMaxValue === 0 ? 1 : sliderMaxValue;


    return (
      <Modal animationType="slide" transparent={true} visible={visible} onRequestClose={onClose}>
        <View style={modalStyles.centeredView}>
          <View style={modalStyles.modalView}>
            <Text style={modalStyles.modalTitle}>Verify Task</Text>
            <Text style={modalStyles.taskTitle}>{taskTitle}</Text>
             {/* Use derived student display name */}
             <Text>Student: {studentName}</Text>
            {/* Display selected status */}
            <Text style={{ marginBottom: 20 }}>
              Status Selected:{' '}
              <Text
                style={{
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

            {/* Slider for point adjustment */}
             {/* Ensure slider value is clamped between 0 and effective max */}
            <Slider
              style={modalStyles.slider}
              minimumValue={0}
              maximumValue={effectiveSliderMaxValue}
              step={1}
              value={Math.min(effectiveSliderMaxValue, Math.max(0, awardedPoints))} // Clamp value
              onValueChange={value => setAwardedPoints(Math.round(value))} // Update state on change
              minimumTrackTintColor={colors.gold}
              maximumTrackTintColor={colors.borderPrimary}
              thumbTintColor={colors.primary}
            />
            {/* Display slider range */}
            <View style={modalStyles.rangeText}>
              <Text>0</Text>
              <Text>Max: {baseTickets}</Text> {/* Show actual base tickets */}
            </View>

            {/* Action Buttons */}
            <View style={modalStyles.buttonContainer}>
              <Button
                title="Confirm Tickets"
                onPress={() => {
                  if (selectedStatus) {
                     // Ensure final points are valid before calling prop
                     const finalPoints = Math.min(baseTickets, Math.max(0, awardedPoints));
                    // Call the verification prop passed from App.tsx
                    onVerifyTask(task.id, selectedStatus, finalPoints);
                    setCurrentStep(3); // Move to Step 3 (Re-assign option)
                  }
                }}
              />
              <Button title="Back to Status" onPress={() => setCurrentStep(1)} color={colors.secondary} />
            </View>

            {/* Cancel Button */}
            <View style={modalStyles.footerButton}>
              <Button title="Cancel Verification" onPress={onClose} color={colors.secondary} />
            </View>
          </View>
        </View>
      </Modal>
    );
  }

  // Render Step 3: Re-assign Option
  if (currentStep === 3) {
    return (
      <Modal animationType="slide" transparent={true} visible={visible} onRequestClose={onClose}>
        <View style={modalStyles.centeredView}>
          <View style={modalStyles.modalView}>
            <Text style={modalStyles.modalTitle}>Verification Complete!</Text>
            <Text style={modalStyles.taskTitle}>{taskTitle}</Text>
             {/* Use derived student display name */}
             <Text>Student: {studentName}</Text>
            {/* Display final status and points */}
            <Text style={{ marginBottom: 20 }}>
              Status: <Text style={{ fontWeight: 'bold' }}>{selectedStatus?.toUpperCase()}</Text>
              {' - '}
              Tickets Awarded:{' '}
              <Text style={{ fontWeight: 'bold', color: awardedPoints > 0 ? colors.success : colors.danger }}>
                {awardedPoints}
              </Text>
            </Text>

            <Text style={modalStyles.stepTitle}>Step 3: Re-assign?</Text>

            {/* Buttons for Re-assign or Done */}
            <View style={modalStyles.buttonContainer}>
              <Button
                title="Re-assign Task (Mock)"
                onPress={() => {
                  // Call the re-assign prop passed from App.tsx
                  onReassignTaskMock(task.taskId, task.studentId);
                  onClose(); // Close modal after action
                }}
              />
            </View>
            <View style={modalStyles.buttonContainer}>
              <Button title="Done" onPress={onClose} />
            </View>
          </View>
        </View>
      </Modal>
    );
  }

  // Fallback if state is somehow invalid
  return null;
};

// Modal Styles (remain the same)
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
    shadowOffset: {
      width: 0,
      height: 2,
    },
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
  buttonContainer: {
    flexDirection: 'column',
    width: '100%',
    marginTop: 10,
    gap: 10,
  },
  footerButton: {
    width: '100%',
    marginTop: 20,
  },
  pointsInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
    gap: 10,
  },
  awardedPointsText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.gold,
  },
  slider: {
    width: '100%',
    height: 40,
    marginTop: 10,
  },
  rangeText: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    paddingHorizontal: 5,
    marginTop: -5,
    marginBottom: 10,
    fontSize: 12,
    color: colors.textSecondary,
  },
});

export default TaskVerificationModal;