import React, { useState, useEffect } from 'react';
import Slider from '@react-native-community/slider';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Modal, View, Text, Button, ActivityIndicator, StyleSheet } from 'react-native';

import { updateAssignedTask, createAssignedTask } from '../../api/assignedTasks';
import { fetchUserProfile } from '../../api/users';

import { useAuth } from '../../contexts/AuthContext';
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
  const { currentUserId: verifierId } = useAuth();
  const studentId = task?.studentId;
  const queryClient = useQueryClient();

  const [currentStep, setCurrentStep] = useState(1);
  const [selectedStatus, setSelectedStatus] = useState<TaskVerificationStatus>(undefined);
  const [awardedPoints, setAwardedPoints] = useState<number>(0);
  const [baseTickets, setBaseTickets] = useState<number>(0);

  const {
    data: student,
    isLoading: isLoadingStudent,
    isError: studentFetchError,
    error: studentFetchErrorMsg,
  } = useQuery<User | null, Error>({
    queryKey: ['userProfile', studentId, { context: 'verificationModal' }],
    queryFn: () => fetchUserProfile(studentId!),
    enabled: !!visible && !!studentId,
    staleTime: 5 * 60 * 1000,
  });

  const verifyMutation = useMutation({
    mutationFn: updateAssignedTask,
    onSuccess: updatedTask => {
      console.log(`[TaskVerificationModal] Task ${updatedTask.id} verified (Simulated).`);

      queryClient.invalidateQueries({
        queryKey: ['assigned-tasks', { studentId: updatedTask.studentId }],
      });
      queryClient.invalidateQueries({ queryKey: ['assigned-tasks'] });

      setCurrentStep(3);
    },
    onError: (error: Error, variables) => {
      console.error(
        `[TaskVerificationModal] Error verifying task ${variables.assignmentId}:`,
        error
      );
      Toast.show({
        type: 'error',
        text1: 'Verification Not Implemented',
        text2: error.message || 'Could not verify task.',
      });
    },
  });

  const reassignMutation = useMutation({
    mutationFn: createAssignedTask,
    onSuccess: createdAssignment => {
      console.log(`[TaskVerificationModal] Task re-assigned (Simulated): ${createdAssignment.id}`);
      queryClient.invalidateQueries({
        queryKey: ['assigned-tasks', { studentId: createdAssignment.studentId }],
      });
      queryClient.invalidateQueries({ queryKey: ['assigned-tasks'] });
      onClose();
      Toast.show({
        type: 'success',
        text1: 'Success',
        text2: `Task "${createdAssignment.taskTitle}" re-assign simulated.`,
      });
    },
    onError: (error: Error) => {
      console.error('[TaskVerificationModal] Error re-assigning task:', error);
      Toast.show({
        type: 'error',
        text1: 'Re-assign Not Implemented',
        text2: error.message || 'Could not re-assign task.',
      });
    },
  });

  useEffect(() => {
    if (visible && task) {
      setCurrentStep(1);
      setSelectedStatus(undefined);
      const taskBasePoints = task.taskBasePoints || 0;
      setBaseTickets(taskBasePoints);
      setAwardedPoints(0);
      verifyMutation.reset();
      reassignMutation.reset();
    } else {
      setCurrentStep(1);
      setSelectedStatus(undefined);
      setAwardedPoints(0);
      setBaseTickets(0);
    }
  }, [visible, task]);

  const handleStatusSelect = (status: TaskVerificationStatus) => {
    let initialPoints = 0;

    switch (status) {
      case 'verified':
        initialPoints = baseTickets;
        break;
      case 'partial':
        initialPoints = Math.round(baseTickets * 0.5);
        break;
      case 'incomplete':
        initialPoints = 0;
        break;
    }
    setSelectedStatus(status);
    setAwardedPoints(initialPoints);
    setCurrentStep(2);
  };

  const handleConfirmTickets = () => {
    if (!selectedStatus || !verifierId || !task) {
      Toast.show({ type: 'error', text1: 'Error', text2: 'Status, Verifier ID, or Task missing.' });
      return;
    }
    if (verifyMutation.isPending) return;

    Toast.show({
      type: 'info',
      text1: 'Feature Not Implemented',
      text2: 'Task verification/point awarding requires server-side logic.',
      visibilityTime: 5000,
    });
    console.warn('Attempted task verification, but API implementation is deferred.');
  };

  const handleReassignTask = () => {
    if (!task || !verifierId) {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Original task data or Assigner ID missing.',
      });
      return;
    }
    if (reassignMutation.isPending) return;

    Toast.show({
      type: 'info',
      text1: 'Feature Not Implemented',
      text2: 'Task re-assignment requires server-side logic.',
      visibilityTime: 5000,
    });
    console.warn('Attempted task re-assignment, but API implementation is deferred.');
  };

  if (!visible || !task) {
    return null;
  }

  const studentNameDisplay = isLoadingStudent
    ? 'Loading student...'
    : studentFetchError
      ? 'Error loading student'
      : student
        ? getUserDisplayName(student)
        : 'Unknown Student';

  const taskTitle = task.taskTitle;
  const completedDateTime = task.completedDate
    ? new Date(task.completedDate).toLocaleString()
    : 'N/A';
  const basePointsDisplay = baseTickets;

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
            {studentFetchError && (
              <Text style={commonSharedStyles.errorText}>
                Error: {studentFetchErrorMsg?.message}
              </Text>
            )}

            <View style={modalSharedStyles.buttonContainer}>
              <Button
                title="Verified"
                onPress={() => handleStatusSelect('verified')}
                disabled={isLoadingStudent}
              />
              <Button
                title="Partial"
                onPress={() => handleStatusSelect('partial')}
                color={colors.warning}
                disabled={isLoadingStudent}
              />
              <Button
                title="Incomplete"
                onPress={() => handleStatusSelect('incomplete')}
                color={colors.danger}
                disabled={isLoadingStudent}
              />
            </View>
            <View style={modalSharedStyles.footerButton}>
              <Button title="Cancel" onPress={onClose} color={colors.secondary} />
            </View>
          </View>
        </View>
      </Modal>
    );
  }

  if (currentStep === 2 && selectedStatus) {
    const isConfirmDisabled = true;

    return (
      <Modal animationType="slide" transparent={true} visible={visible} onRequestClose={onClose}>
        <View style={modalSharedStyles.centeredView}>
          <View style={modalSharedStyles.modalView}>
            <Text style={modalSharedStyles.modalTitle}>Verify Task</Text>
            <Text style={modalSharedStyles.taskTitle}>{taskTitle}</Text>
            <Text>Student: {studentNameDisplay}</Text>
            <Text style={{ marginBottom: 10 }}>
              Status Selected:{' '}
              <Text
                style={[
                  styles.statusText,
                  {
                    color:
                      selectedStatus === 'verified'
                        ? colors.success
                        : selectedStatus === 'partial'
                          ? colors.warning
                          : colors.danger,
                  },
                ]}
              >
                {selectedStatus?.toUpperCase()}
              </Text>
            </Text>

            <Text style={modalSharedStyles.stepTitle}>Step 2: Award Tickets</Text>
            {selectedStatus !== 'incomplete' ? (
              <>
                <View style={modalSharedStyles.pointsInputContainer}>
                  <Text style={{ fontSize: 16 }}>Tickets Awarded:</Text>
                  <Text style={modalSharedStyles.awardedPointsText}>{awardedPoints}</Text>
                </View>
                <Slider
                  style={modalSharedStyles.slider}
                  minimumValue={0}
                  maximumValue={Math.max(1, basePointsDisplay)}
                  step={1}
                  value={awardedPoints}
                  onValueChange={value => setAwardedPoints(Math.round(value))}
                  minimumTrackTintColor={colors.gold}
                  maximumTrackTintColor={colors.borderPrimary}
                  thumbTintColor={colors.primary}
                  disabled={verifyMutation.isPending}
                />
                <View style={modalSharedStyles.rangeText}>
                  <Text>0</Text>
                  <Text>Max: {basePointsDisplay}</Text>
                </View>
              </>
            ) : (
              <Text style={styles.infoText}>No points awarded for 'Incomplete' status.</Text>
            )}

            <Text style={styles.infoText}>
              Note: Point awarding requires server-side setup and is currently disabled.
            </Text>
            <View style={modalSharedStyles.buttonContainer}>
              <Button
                title={'Confirm Tickets (Disabled)'}
                onPress={handleConfirmTickets}
                disabled={isConfirmDisabled}
              />
              <Button
                title="Back to Status"
                onPress={() => setCurrentStep(1)}
                color={colors.secondary}
                disabled={verifyMutation.isPending}
              />
            </View>
            <View style={modalSharedStyles.footerButton}>
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

  if (currentStep === 3) {
    const isReassignDisabled = true;

    return (
      <Modal animationType="slide" transparent={true} visible={visible} onRequestClose={onClose}>
        <View style={modalSharedStyles.centeredView}>
          <View style={modalSharedStyles.modalView}>
            <Text style={modalSharedStyles.modalTitle}>Verification Step Complete</Text>
            <Text style={modalSharedStyles.taskTitle}>{taskTitle}</Text>
            <Text>Student: {studentNameDisplay}</Text>
            <Text style={{ marginBottom: 20 }}>
              Status Recorded As:{' '}
              <Text style={{ fontWeight: 'bold' }}>{selectedStatus?.toUpperCase()}</Text>
              {' - '} Points Set To:{' '}
              <Text
                style={{
                  fontWeight: 'bold',
                  color: awardedPoints > 0 ? colors.success : colors.textSecondary,
                }}
              >
                {awardedPoints}
              </Text>
            </Text>
            <Text style={styles.infoText}>(Note: Points were not actually awarded yet)</Text>

            <Text style={modalSharedStyles.stepTitle}>Step 3: Re-assign?</Text>
            <Text style={styles.infoText}>
              Note: Re-assigning requires server-side setup and is currently disabled.
            </Text>
            <View style={modalSharedStyles.buttonContainer}>
              <Button
                title={'Re-assign Task (Disabled)'}
                onPress={handleReassignTask}
                disabled={isReassignDisabled}
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

  return null;
};

const styles = StyleSheet.create({
  statusText: {
    fontWeight: 'bold',
  },
  infoText: {
    fontSize: 12,
    color: colors.textLight,
    textAlign: 'center',
    marginBottom: 15,
    fontStyle: 'italic',
  },
});

export default TaskVerificationModal;
