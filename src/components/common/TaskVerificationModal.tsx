// src/components/common/TaskVerificationModal.tsx
import React, { useState, useEffect } from 'react';
import Slider from '@react-native-community/slider';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Modal, View, Text, Button, ActivityIndicator } from 'react-native';
import Toast from 'react-native-toast-message';
import { updateAssignedTask } from '../../api/assignedTasks'; // Use the API function wrapper
import { fetchUserProfile } from '../../api/users';
import { useAuth } from '../../contexts/AuthContext';
import { User } from '../../types/dataTypes';
import { TaskVerificationModalProps } from '../../types/componentProps';
import { colors } from '../../styles/colors';
import { getUserDisplayName } from '../../utils/helpers';
import { commonSharedStyles } from '../../styles/commonSharedStyles';
import { appSharedStyles } from '../../styles/appSharedStyles';

export const TaskVerificationModal: React.FC<TaskVerificationModalProps> = ({
  visible,
  task,
  onClose,
}) => {
  const { currentUserId: verifierId } = useAuth(); // Verifier is the currently logged-in user
  const studentId = task?.studentId;
  const queryClient = useQueryClient();

  // Modal state
  const [currentStep, setCurrentStep] = useState(1);
  const [selectedStatus, setSelectedStatus] = useState<VerificationStatusInput | undefined>(
    undefined
  ); // Use the specific input type
  const [awardedPoints, setAwardedPoints] = useState<number>(0);
  const [baseTickets, setBaseTickets] = useState<number>(0); // Store base tickets from task prop

  // Type expected by the Edge function/API payload
  type VerificationStatusInput = 'verified' | 'partial' | 'incomplete';

  // Query to fetch student details for display
  const {
    data: student,
    isLoading: isLoadingStudent,
    isError: studentFetchError,
    error: studentFetchErrorMsg,
  } = useQuery<User | null, Error>({
    queryKey: ['userProfile', studentId, { context: 'verificationModal' }],
    queryFn: () => (studentId ? fetchUserProfile(studentId) : Promise.resolve(null)),
    enabled: !!visible && !!studentId, // Only fetch when modal is visible with a studentId
    staleTime: 5 * 60 * 1000,
  });

  // Mutation to call the API function (which calls the Edge Function)
  const verifyMutation = useMutation({
    mutationFn: updateAssignedTask, // Use the existing API function wrapper
    onSuccess: updatedTask => {
      console.log(
        `[TaskVerificationModal] Task ${updatedTask.id} verification processed successfully via API/Edge Function.`
      );
      // Invalidate queries to refresh task lists and potentially balance/history
      queryClient.invalidateQueries({
        queryKey: ['assigned-tasks', { studentId: updatedTask.studentId }],
      });
      queryClient.invalidateQueries({ queryKey: ['assigned-tasks'] }); // Broader invalidation for lists
      queryClient.invalidateQueries({ queryKey: ['balance', updatedTask.studentId] }); // Invalidate balance
      queryClient.invalidateQueries({
        queryKey: ['ticket-history', { studentId: updatedTask.studentId }],
      }); // Invalidate history
      queryClient.invalidateQueries({ queryKey: ['ticket-history'] }); // Invalidate global history
      queryClient.invalidateQueries({ queryKey: ['taskStats', 'pendingCount'] }); // Invalidate pending count

      setCurrentStep(3); // Move to confirmation step
    },
    onError: (error: Error) => {
      console.error('[TaskVerificationModal] Error verifying task:', error);
      Toast.show({
        type: 'error',
        text1: 'Verification Failed',
        text2: error.message || 'Could not verify task.',
        position: 'bottom',
        visibilityTime: 5000,
      });
    },
  });

  useEffect(() => {
    if (visible && task) {
      console.log('[TaskVerificationModal] Opening/Resetting for task:', task.id);
      setCurrentStep(1);
      setSelectedStatus(undefined);
      const taskBasePoints = task.taskBasePoints ?? 0;
      setBaseTickets(taskBasePoints);
      setAwardedPoints(0);
      verifyMutation.reset();
    } else {
      setCurrentStep(1);
      setSelectedStatus(undefined);
      setAwardedPoints(0);
      setBaseTickets(0);
    }
  }, [visible, task]);

  const handleStatusSelect = (status: VerificationStatusInput) => {
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
        break; // Always 0 for incomplete
    }
    setSelectedStatus(status);
    setAwardedPoints(initialPoints);
    setCurrentStep(2); // Move to points adjustment step
  };

  // Handler for confirming the points and triggering the mutation
  const handleConfirmTickets = () => {
    if (!selectedStatus || !verifierId || !task) {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Missing required data for verification.',
      });
      return;
    }
    if (verifyMutation.isPending) return; // Prevent double submit
    if (selectedStatus === 'incomplete' && awardedPoints !== 0) {
      Toast.show({
        type: 'error',
        text1: 'Validation Error',
        text2: 'Points must be 0 for Incomplete status.',
      });
      return;
    }
    if (awardedPoints > baseTickets && selectedStatus !== 'verified') {
      if (awardedPoints < 0 || !Number.isInteger(awardedPoints)) {
        Toast.show({
          type: 'error',
          text1: 'Validation Error',
          text2: 'Points must be a non-negative whole number.',
        });
        return;
      }
    }
    if (awardedPoints < 0 || !Number.isInteger(awardedPoints)) {
      Toast.show({
        type: 'error',
        text1: 'Validation Error',
        text2: 'Points must be a non-negative whole number.',
      });
      return;
    }

    const updatePayload = {
      assignmentId: task.id,
      updates: {
        // Structure expected by updateAssignedTask when verifying
        verificationStatus: selectedStatus,
        actualPointsAwarded: awardedPoints,
        // verifiedById will be set by the Edge Function using the caller's token
      },
    };

    console.log('[TaskVerificationModal] Calling verifyMutation with payload:', updatePayload);
    verifyMutation.mutate(updatePayload);
  };

  // --- Rendering Logic ---

  if (!visible || !task) {
    return null;
  } // Don't render if not visible or no task

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

  // Step 1: Select Status
  if (currentStep === 1) {
    return (
      <Modal animationType="slide" transparent={true} visible={visible} onRequestClose={onClose}>
        <View style={commonSharedStyles.centeredView}>
          <View style={commonSharedStyles.modalView}>
            <Text style={commonSharedStyles.modalTitle}>Verify Task</Text>
            <Text style={appSharedStyles.taskTitle}>{taskTitle}</Text>
            <Text style={commonSharedStyles.modalContextInfo}>Student: {studentNameDisplay}</Text>
            <Text style={commonSharedStyles.modalContextInfo}>
              Potential Tickets: {basePointsDisplay}
            </Text>
            <Text style={[commonSharedStyles.modalContextInfo, { marginBottom: 20 }]}>
              Completed: {completedDateTime}
            </Text>

            <Text style={commonSharedStyles.stepTitle}>Step 1: Select Status</Text>
            {isLoadingStudent && <ActivityIndicator color={colors.primary} />}
            {studentFetchError && (
              <Text style={commonSharedStyles.errorText}>
                Error: {studentFetchErrorMsg?.message}
              </Text>
            )}

            <View style={commonSharedStyles.full}>
              <Button
                title="Verified"
                onPress={() => handleStatusSelect('verified')}
                disabled={isLoadingStudent || verifyMutation.isPending}
              />
              <Button
                title="Partial"
                onPress={() => handleStatusSelect('partial')}
                color={colors.warning}
                disabled={isLoadingStudent || verifyMutation.isPending}
              />
              <Button
                title="Incomplete"
                onPress={() => handleStatusSelect('incomplete')}
                color={colors.danger}
                disabled={isLoadingStudent || verifyMutation.isPending}
              />
            </View>
            <View style={[commonSharedStyles.full, { marginTop: 10 }]}>
              <Button
                title="Cancel"
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

  // Step 2: Adjust Points (if status selected)
  if (currentStep === 2 && selectedStatus) {
    const isConfirmDisabled = verifyMutation.isPending; // Disable only while mutation runs

    return (
      <Modal animationType="slide" transparent={true} visible={visible} onRequestClose={onClose}>
        <View style={commonSharedStyles.centeredView}>
          <View style={commonSharedStyles.modalView}>
            <Text style={commonSharedStyles.modalTitle}>Verify Task</Text>
            <Text style={appSharedStyles.taskTitle}>{taskTitle}</Text>
            <Text style={commonSharedStyles.modalContextInfo}>Student: {studentNameDisplay}</Text>
            <Text style={[commonSharedStyles.modalContextInfo, { marginBottom: 10 }]}>
              Status Selected:{' '}
              <Text
                style={[
                  appSharedStyles.statusText,
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

            <Text style={commonSharedStyles.stepTitle}>Step 2: Award Tickets</Text>
            {selectedStatus !== 'incomplete' ? (
              <>
                <View style={commonSharedStyles.baseRowCentered}>
                  <Text style={{ fontSize: 16 }}>Tickets Awarded:</Text>
                  <Text style={appSharedStyles.awardedPointsText}>{awardedPoints}</Text>
                </View>
                <Slider
                  style={appSharedStyles.slider}
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
                <View style={appSharedStyles.rangeText}>
                  <Text>0</Text>
                  <Text>Base: {basePointsDisplay}</Text>
                </View>
              </>
            ) : (
              <Text style={appSharedStyles.infoText}>
                No points awarded for 'Incomplete' status.
              </Text>
            )}

            {verifyMutation.isPending && (
              <View style={commonSharedStyles.baseRowCentered}>
                <ActivityIndicator size="small" color={colors.primary} />
                <Text style={commonSharedStyles.baseSecondaryText}>Processing Verification...</Text>
              </View>
            )}
            {verifyMutation.isError && (
              <Text style={[commonSharedStyles.errorText, { marginTop: 10 }]}>
                Verification Error:{' '}
                {verifyMutation.error instanceof Error
                  ? verifyMutation.error.message
                  : 'Unknown Error'}
              </Text>
            )}

            <View style={commonSharedStyles.full}>
              <Button
                title={verifyMutation.isPending ? 'Processing...' : 'Confirm Verification'}
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
            <View style={[commonSharedStyles.full, { marginTop: 10 }]}>
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

  // Step 3: Confirmation / Done
  if (currentStep === 3) {
    return (
      <Modal animationType="slide" transparent={true} visible={visible} onRequestClose={onClose}>
        <View style={commonSharedStyles.centeredView}>
          <View style={commonSharedStyles.modalView}>
            <Text style={commonSharedStyles.modalTitle}>Verification Complete</Text>
            <Text style={appSharedStyles.taskTitle}>{taskTitle}</Text>
            <Text style={commonSharedStyles.modalContextInfo}>Student: {studentNameDisplay}</Text>
            <Text style={[commonSharedStyles.modalContextInfo, { marginBottom: 20 }]}>
              Status Recorded As:{' '}
              <Text style={{ fontWeight: 'bold' }}>{selectedStatus?.toUpperCase()}</Text>
              {' - '} Points Awarded:{' '}
              <Text
                style={{
                  fontWeight: 'bold',
                  color: awardedPoints > 0 ? colors.success : colors.textSecondary,
                }}
              >
                {awardedPoints}
              </Text>
            </Text>
            <View style={commonSharedStyles.full}>
              <Button title="Done" onPress={onClose} />
            </View>
          </View>
        </View>
      </Modal>
    );
  }

  return null;
};

export default TaskVerificationModal;
