import React, { useState, useEffect } from 'react';
import Slider from '@react-native-community/slider';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Modal, View, Text, StyleSheet, Button, ActivityIndicator, Alert } from 'react-native';

import { updateAssignedTask, createAssignedTask } from '../api/assignedTasks';
import { useAuth } from '../contexts/AuthContext';
import { AssignedTask, TaskVerificationStatus } from '../mocks/mockAssignedTasks';
import { colors } from '../styles/colors';
import { TaskVerificationModalProps } from '../types/componentProps';
import { User } from '../types/userTypes';
import { getUserDisplayName } from '../utils/helpers';

const TaskVerificationModal: React.FC<TaskVerificationModalProps> = ({
  visible,
  task,
  onClose,
}) => {
  const { currentUserId } = useAuth();
  const studentId = task?.studentId;
  const queryClient = useQueryClient();

  const { data: student, isLoading: isLoadingStudent } = useQuery<User, Error>({
    queryKey: ['user', studentId],
    queryFn: async () => {
      if (!studentId) throw new Error('No student ID for verification modal');
      const response = await fetch(`/api/users/${studentId}`);
      if (!response.ok) throw new Error('Failed to fetch student for modal');
      return response.json();
    },
    enabled: !!visible && !!studentId,
    staleTime: 5 * 60 * 1000,
  });

  const [currentStep, setCurrentStep] = useState(1);
  const [selectedStatus, setSelectedStatus] = useState<TaskVerificationStatus>(undefined);
  const [awardedPoints, setAwardedPoints] = useState<number>(0);
  const [baseTickets, setBaseTickets] = useState<number>(0);

  const verifyMutation = useMutation({
    mutationFn: updateAssignedTask,
    onSuccess: updatedTask => {
      console.log(`Task ${updatedTask.id} verified successfully via mutation.`);
      queryClient.invalidateQueries({ queryKey: ['assigned-tasks'] });
      queryClient.invalidateQueries({
        queryKey: ['assigned-tasks', { studentId: updatedTask.studentId }],
      });
      queryClient.invalidateQueries({ queryKey: ['balance', updatedTask.studentId] });
      queryClient.invalidateQueries({
        queryKey: ['ticket-history', { studentId: updatedTask.studentId }],
      });
      queryClient.invalidateQueries({ queryKey: ['ticket-history'] });
      setCurrentStep(3);
    },
    onError: (error, variables) => {
      console.error(`Error verifying task ${variables.assignmentId} via mutation:`, error);
      Alert.alert(
        'Error',
        `Failed to verify task: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    },
  });

  const reassignMutation = useMutation({
    mutationFn: createAssignedTask,
    onSuccess: createdAssignment => {
      console.log(`Task re-assigned successfully via mutation (New ID: ${createdAssignment.id})`);
      Alert.alert('Success', `Task "${createdAssignment.taskTitle}" re-assigned successfully.`);
      queryClient.invalidateQueries({ queryKey: ['assigned-tasks'] });
      queryClient.invalidateQueries({
        queryKey: ['assigned-tasks', { studentId: createdAssignment.studentId }],
      });
      onClose();
    },
    onError: error => {
      console.error('Error re-assigning task via mutation:', error);
      Alert.alert(
        'Error',
        `Failed to re-assign task: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
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
    }
  }, [visible, task, verifyMutation, reassignMutation]);

  if (!visible || !task) {
    return null;
  }

  const studentNameDisplay = isLoadingStudent
    ? 'Loading...'
    : student
      ? getUserDisplayName(student)
      : 'Unknown Student';
  const taskTitle = task.taskTitle;
  const completedDateTime = task.completedDate
    ? new Date(task.completedDate).toLocaleString()
    : 'N/A';
  const basePointsDisplay = baseTickets;

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
    if (!selectedStatus || !currentUserId) {
      Alert.alert('Error', 'Status or Verifier ID missing.');
      return;
    }
    if (verifyMutation.isPending) return;
    const finalPoints = Math.min(baseTickets, Math.max(0, awardedPoints));
    const updates: Partial<
      Pick<
        AssignedTask,
        'verificationStatus' | 'verifiedById' | 'verifiedDate' | 'actualPointsAwarded'
      >
    > = {
      verificationStatus: selectedStatus,
      verifiedById: currentUserId,
      actualPointsAwarded:
        selectedStatus === 'verified' || selectedStatus === 'partial' ? finalPoints : undefined,
    };
    verifyMutation.mutate({ assignmentId: task.id, updates });
  };

  const handleReassignTask = () => {
    if (!task || !currentUserId) {
      Alert.alert('Error', 'Original task data or Assigner ID missing.');
      return;
    }
    if (reassignMutation.isPending) return;
    const assignmentData = {
      studentId: task.studentId,
      assignedById: currentUserId,
      taskTitle: task.taskTitle,
      taskDescription: task.taskDescription,
      taskBasePoints: task.taskBasePoints,
    };
    reassignMutation.mutate(assignmentData);
  };

  if (currentStep === 1) {
    return (
      <Modal animationType="slide" transparent={true} visible={visible} onRequestClose={onClose}>
        <View style={modalStyles.centeredView}>
          <View style={modalStyles.modalView}>
            <Text style={modalStyles.modalTitle}>Verify Task</Text>
            <Text style={modalStyles.taskTitle}>{taskTitle}</Text>
            <Text>Student: {studentNameDisplay}</Text>
            <Text>Potential Tickets: {basePointsDisplay}</Text>
            <Text style={{ marginBottom: 20 }}>Completed: {completedDateTime}</Text>
            <Text style={modalStyles.stepTitle}>Step 1: Select Status</Text>
            <View style={modalStyles.buttonContainer}>
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
            <View style={modalStyles.footerButton}>
              <Button title="Cancel" onPress={onClose} color={colors.secondary} />
            </View>
          </View>
        </View>
      </Modal>
    );
  }

  if (currentStep === 2 && selectedStatus) {
    const sliderMaxValue = basePointsDisplay >= 0 ? basePointsDisplay : 0;
    const effectiveSliderMaxValue = sliderMaxValue === 0 ? 1 : sliderMaxValue;
    return (
      <Modal animationType="slide" transparent={true} visible={visible} onRequestClose={onClose}>
        <View style={modalStyles.centeredView}>
          <View style={modalStyles.modalView}>
            <Text style={modalStyles.modalTitle}>Verify Task</Text>
            <Text style={modalStyles.taskTitle}>{taskTitle}</Text>
            <Text>Student: {studentNameDisplay}</Text>
            <Text style={{ marginBottom: 10 }}>
              {' '}
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
                {' '}
                {selectedStatus?.toUpperCase()}{' '}
              </Text>{' '}
            </Text>
            <Text style={modalStyles.stepTitle}>Step 2: Award Tickets</Text>
            <View style={modalStyles.pointsInputContainer}>
              <Text style={{ fontSize: 16 }}>Tickets Awarded:</Text>
              <Text style={modalStyles.awardedPointsText}>{awardedPoints}</Text>
            </View>
            <Slider
              style={modalStyles.slider}
              minimumValue={0}
              maximumValue={effectiveSliderMaxValue}
              step={1}
              value={Math.min(effectiveSliderMaxValue, Math.max(0, awardedPoints))}
              onValueChange={value => setAwardedPoints(Math.round(value))}
              minimumTrackTintColor={colors.gold}
              maximumTrackTintColor={colors.borderPrimary}
              thumbTintColor={colors.primary}
              disabled={verifyMutation.isPending}
            />
            <View style={modalStyles.rangeText}>
              <Text>0</Text>
              <Text>Max: {basePointsDisplay}</Text>
            </View>
            {verifyMutation.isPending && (
              <View style={modalStyles.loadingContainer}>
                <ActivityIndicator size="small" color={colors.primary} />
                <Text style={modalStyles.loadingText}>Confirming...</Text>
              </View>
            )}
            {verifyMutation.isError && (
              <Text style={modalStyles.errorText}>
                {' '}
                Error:{' '}
                {verifyMutation.error instanceof Error
                  ? verifyMutation.error.message
                  : 'Failed to verify'}{' '}
              </Text>
            )}
            <View style={modalStyles.buttonContainer}>
              <Button
                title={verifyMutation.isPending ? 'Confirming...' : 'Confirm Tickets'}
                onPress={handleConfirmTickets}
                disabled={verifyMutation.isPending}
              />
              <Button
                title="Back to Status"
                onPress={() => setCurrentStep(1)}
                color={colors.secondary}
                disabled={verifyMutation.isPending}
              />
            </View>
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

  if (currentStep === 3) {
    return (
      <Modal animationType="slide" transparent={true} visible={visible} onRequestClose={onClose}>
        <View style={modalStyles.centeredView}>
          <View style={modalStyles.modalView}>
            <Text style={modalStyles.modalTitle}>Verification Complete!</Text>
            <Text style={modalStyles.taskTitle}>{taskTitle}</Text>
            <Text>Student: {studentNameDisplay}</Text>
            <Text style={{ marginBottom: 20 }}>
              {' '}
              Status: <Text style={{ fontWeight: 'bold' }}>
                {selectedStatus?.toUpperCase()}
              </Text>{' '}
              {' - '} Tickets Awarded:{' '}
              <Text
                style={{
                  fontWeight: 'bold',
                  color: awardedPoints > 0 ? colors.success : colors.danger,
                }}
              >
                {' '}
                {awardedPoints}{' '}
              </Text>{' '}
            </Text>
            <Text style={modalStyles.stepTitle}>Step 3: Re-assign?</Text>
            {reassignMutation.isPending && (
              <View style={modalStyles.loadingContainer}>
                <ActivityIndicator size="small" color={colors.primary} />
                <Text style={modalStyles.loadingText}>Re-assigning...</Text>
              </View>
            )}
            {reassignMutation.isError && (
              <Text style={modalStyles.errorText}>
                {' '}
                Re-assign Error:{' '}
                {reassignMutation.error instanceof Error
                  ? reassignMutation.error.message
                  : 'Failed'}{' '}
              </Text>
            )}
            <View style={modalStyles.buttonContainer}>
              <Button
                title={reassignMutation.isPending ? 'Re-assigning...' : 'Re-assign Task'}
                onPress={handleReassignTask}
                disabled={reassignMutation.isPending}
              />
            </View>
            <View style={modalStyles.buttonContainer}>
              <Button title="Done" onPress={onClose} disabled={reassignMutation.isPending} />
            </View>
          </View>
        </View>
      </Modal>
    );
  }

  return null;
};

// --- Styles ---
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
