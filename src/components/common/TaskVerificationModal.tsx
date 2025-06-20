// src/components/common/TaskVerificationModal.tsx
import React, { useState, useEffect } from 'react';

import { Modal, View, Text, ActivityIndicator } from 'react-native';

import Slider from '@react-native-community/slider';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import Toast from 'react-native-toast-message';

import { updateAssignedTask } from '../../api/assignedTasks';
import { fetchUserProfile } from '../../api/users';
import { useAuth } from '../../contexts/AuthContext';
import { colors } from '../../styles/colors';
import { commonSharedStyles } from '../../styles/commonSharedStyles';
import { TaskVerificationModalProps } from '../../types/componentProps';
import { User } from '../../types/dataTypes';
import { getUserDisplayName, timestampDisplay } from '../../utils/helpers';
import { CustomButton } from './CustomButton';
import { ArrowLeftIcon, CheckIcon, XCircleIcon } from 'react-native-heroicons/solid';

export const TaskVerificationModal: React.FC<TaskVerificationModalProps> = ({
  visible,
  task,
  onClose,
}) => {
  const { currentUserId: verifierId } = useAuth();
  const studentId = task?.studentId;
  const queryClient = useQueryClient();

  const [currentStep, setCurrentStep] = useState(1);
  const [selectedStatus, setSelectedStatus] = useState<VerificationStatusInput | undefined>(
    undefined
  );
  const [awardedPoints, setAwardedPoints] = useState<number>(0);
  const [baseTickets, setBaseTickets] = useState<number>(0);

  type VerificationStatusInput = 'verified' | 'partial' | 'incomplete';

  const {
    data: student,
    isLoading: isLoadingStudent,
    isError: studentFetchError,
    error: studentFetchErrorMsg,
  } = useQuery<User | null, Error>({
    queryKey: ['userProfile', studentId, { context: 'verificationModal' }],
    queryFn: () => (studentId ? fetchUserProfile(studentId) : Promise.resolve(null)),
    enabled: !!visible && !!studentId,
    staleTime: 5 * 60 * 1000,
  });

  const verifyMutation = useMutation({
    mutationFn: updateAssignedTask,
    onSuccess: updatedTask => {
      console.log(
        `[TaskVerificationModal] Task ${updatedTask.id} verification processed successfully via API/Edge Function.`
      );

      queryClient.invalidateQueries({
        queryKey: ['assigned-tasks', { studentId: updatedTask.studentId }],
      });
      queryClient.invalidateQueries({ queryKey: ['assigned-tasks'] });
      queryClient.invalidateQueries({ queryKey: ['balance', updatedTask.studentId] });
      queryClient.invalidateQueries({
        queryKey: ['ticket-history', { studentId: updatedTask.studentId }],
      });
      queryClient.invalidateQueries({ queryKey: ['ticket-history'] });
      queryClient.invalidateQueries({ queryKey: ['taskStats', 'pendingCount'] });

      setCurrentStep(3);
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
        break;
    }
    setSelectedStatus(status);
    setAwardedPoints(initialPoints);
    setCurrentStep(2);
  };

  const handleConfirmTickets = () => {
    if (!selectedStatus || !verifierId || !task) {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Missing required data for verification.',
        position: 'bottom',
      });
      return;
    }
    if (verifyMutation.isPending) return;
    if (selectedStatus === 'incomplete' && awardedPoints !== 0) {
      Toast.show({
        type: 'error',
        text1: 'Validation Error',
        text2: 'Points must be 0 for Incomplete status.',
        position: 'bottom',
      });
      return;
    }
    if (awardedPoints > baseTickets && selectedStatus !== 'verified') {
      if (awardedPoints < 0 || !Number.isInteger(awardedPoints)) {
        Toast.show({
          type: 'error',
          text1: 'Validation Error',
          text2: 'Points must be a non-negative whole number.',
          position: 'bottom',
        });
        return;
      }
    }
    if (awardedPoints < 0 || !Number.isInteger(awardedPoints)) {
      Toast.show({
        type: 'error',
        text1: 'Validation Error',
        text2: 'Points must be a non-negative whole number.',
        position: 'bottom',
      });
      return;
    }

    const updatePayload = {
      assignmentId: task.id,
      updates: {
        verificationStatus: selectedStatus,
        actualPointsAwarded: awardedPoints,
      },
    };

    console.log('[TaskVerificationModal] Calling verifyMutation with payload:', updatePayload);
    verifyMutation.mutate(updatePayload);
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
  const completedDateTime = task.completedDate ? timestampDisplay(task.completedDate) : 'N/A';
  const basePointsDisplay = baseTickets;

  if (currentStep === 1) {
    return (
      <Modal animationType="slide" transparent={true} visible={visible} onRequestClose={onClose}>
        <View style={commonSharedStyles.centeredView}>
          <View style={commonSharedStyles.modalView}>
            <Text style={commonSharedStyles.modalTitle}>Verify Task</Text>
            <Text style={commonSharedStyles.taskItemTitle}>{taskTitle}</Text>
            <Text style={commonSharedStyles.modalContextInfo}>Student: {studentNameDisplay}</Text>
            <Text style={commonSharedStyles.modalContextInfo}>
              Potential Tickets: {basePointsDisplay}
            </Text>
            <Text style={[commonSharedStyles.modalContextInfo, { marginBottom: 20 }]}>
              Completed: {completedDateTime}
            </Text>

            <Text style={commonSharedStyles.modalStepTitle}>Step 1: Select Status</Text>
            {isLoadingStudent && <ActivityIndicator color={colors.primary} />}
            {studentFetchError && (
              <Text style={commonSharedStyles.errorText}>
                Error: {studentFetchErrorMsg?.message}
              </Text>
            )}

            <View style={commonSharedStyles.full}>
              <CustomButton
                title="Verified"
                onPress={() => handleStatusSelect('verified')}
                color={colors.primary}
                disabled={isLoadingStudent || verifyMutation.isPending}
              />
              <CustomButton
                title="Partial"
                onPress={() => handleStatusSelect('partial')}
                color={colors.warning}
                disabled={isLoadingStudent || verifyMutation.isPending}
              />
              <CustomButton
                title="Incomplete"
                onPress={() => handleStatusSelect('incomplete')}
                color={colors.danger}
                disabled={isLoadingStudent || verifyMutation.isPending}
              />
            </View>
            <View style={[commonSharedStyles.full, { marginTop: 10 }]}>
              <CustomButton
                title="Cancel"
                onPress={onClose}
                color={colors.secondary}
                disabled={verifyMutation.isPending}
                leftIcon={<XCircleIcon color={colors.textWhite} size={18} />}
              />
            </View>
          </View>
        </View>
      </Modal>
    );
  }

  if (currentStep === 2 && selectedStatus) {
    const isConfirmDisabled = verifyMutation.isPending;

    return (
      <Modal animationType="slide" transparent={true} visible={visible} onRequestClose={onClose}>
        <View style={commonSharedStyles.centeredView}>
          <View style={commonSharedStyles.modalView}>
            <Text style={commonSharedStyles.modalTitle}>Verify Task</Text>
            <Text style={commonSharedStyles.taskItemTitle}>{taskTitle}</Text>
            <Text style={commonSharedStyles.modalContextInfo}>Student: {studentNameDisplay}</Text>
            <Text style={[commonSharedStyles.modalContextInfo, { marginBottom: 10 }]}>
              Status Selected:{' '}
              <Text
                style={[
                  commonSharedStyles.statusText,
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

            <Text style={commonSharedStyles.modalStepTitle}>Step 2: Award Tickets</Text>
            {selectedStatus !== 'incomplete' ? (
              <>
                <View style={commonSharedStyles.baseRowCentered}>
                  <Text style={{ fontSize: 16 }}>Tickets Awarded:</Text>
                  <Text style={commonSharedStyles.awardedPointsText}>{awardedPoints}</Text>
                </View>
                <Slider
                  style={commonSharedStyles.slider}
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
                <View style={commonSharedStyles.rangeText}>
                  <Text>0</Text>
                  <Text>Base: {basePointsDisplay}</Text>
                </View>
              </>
            ) : (
              <Text style={commonSharedStyles.infoText}>
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
              <CustomButton
                title={verifyMutation.isPending ? 'Processing...' : 'Confirm Verification'}
                onPress={handleConfirmTickets}
                color={colors.primary}
                disabled={isConfirmDisabled}
                leftIcon={
                  <CheckIcon
                    color={isConfirmDisabled ? colors.disabledText : colors.textWhite}
                    size={18}
                  />
                }
              />
              <CustomButton
                title="Back to Status"
                onPress={() => setCurrentStep(1)}
                color={colors.secondary}
                disabled={verifyMutation.isPending}
                leftIcon={
                  <ArrowLeftIcon
                    color={verifyMutation.isPending ? colors.disabledText : colors.textWhite}
                    size={18}
                  />
                }
              />
            </View>
            <View style={[commonSharedStyles.full, { marginTop: 10 }]}>
              <CustomButton
                title="Cancel Verification"
                onPress={onClose}
                color={colors.secondary}
                disabled={verifyMutation.isPending}
                leftIcon={
                  <XCircleIcon
                    color={verifyMutation.isPending ? colors.disabledText : colors.textWhite}
                    size={18}
                  />
                }
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
        <View style={commonSharedStyles.centeredView}>
          <View style={commonSharedStyles.modalView}>
            <Text style={commonSharedStyles.modalTitle}>Verification Complete</Text>
            <Text style={commonSharedStyles.taskItemTitle}>{taskTitle}</Text>
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
              <CustomButton
                title="Done"
                onPress={onClose}
                color={colors.primary}
                leftIcon={<CheckIcon color={colors.textWhite} size={18} />}
              />
            </View>
          </View>
        </View>
      </Modal>
    );
  }

  return null;
};

export default TaskVerificationModal;
