
import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  Button,
  ActivityIndicator, 
  Alert, 
} from 'react-native';
import Slider from '@react-native-community/slider';
import { useMutation, useQueryClient } from '@tanstack/react-query'; 


import { updateAssignedTask } from '../api/assignedTasks'; 
import { AssignedTask, TaskVerificationStatus } from '../mocks/mockAssignedTasks';
import { User } from '../types/userTypes'; 


import { useAuth } from '../contexts/AuthContext';


import { getUserDisplayName } from '../utils/helpers';
import { colors } from '../styles/colors';


interface TaskVerificationModalProps {
  visible: boolean;
  task: AssignedTask | null;
  allUsers: User[];
  onClose: () => void;
  
  onReassignTaskMock: (originalTask: AssignedTask) => void; 
}

const TaskVerificationModal: React.FC<TaskVerificationModalProps> = ({
  visible,
  task,
  allUsers,
  onClose,
  
  onReassignTaskMock,
}) => {
  const { currentUserId } = useAuth(); 
  const queryClient = useQueryClient();

  
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

  
  useEffect(() => {
    if (visible && task) {
      setCurrentStep(1);
      setSelectedStatus(undefined);
      const taskBasePoints = task.taskBasePoints || 0;
      setBaseTickets(taskBasePoints);
      setAwardedPoints(0);
      verifyMutation.reset(); 
    }
  }, [visible, task]);

  if (!visible || !task) {
    return null;
  }

  const taskTitle = task.taskTitle;
  const student = allUsers.find(user => user.id === task.studentId);
  const studentName = student ? getUserDisplayName(student) : task.studentId;
  const completedDateTime = task.completedDate
    ? new Date(task.completedDate).toLocaleString()
    : 'N/A';

  
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
      Alert.alert('Error', 'Status or Verifier missing.');
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

  
  if (currentStep === 2 && selectedStatus) {
    const sliderMaxValue = baseTickets >= 0 ? baseTickets : 0;
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
              <Text>Max: {baseTickets}</Text>
            </View>

            {}
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
            <Text>Student: {studentName}</Text>
            <Text style={{ marginBottom: 20 }}>
              Status: <Text style={{ fontWeight: 'bold' }}>{selectedStatus?.toUpperCase()}</Text>
              {' - '}
              Tickets Awarded:{' '}
              <Text
                style={{
                  fontWeight: 'bold',
                  color: awardedPoints > 0 ? colors.success : colors.danger,
                }}
              >
                {awardedPoints}
              </Text>
            </Text>

            <Text style={modalStyles.stepTitle}>Step 3: Re-assign?</Text>

            <View style={modalStyles.buttonContainer}>
              <Button
                title="Re-assign Task (Mock)"
                onPress={() => {
                  onReassignTaskMock(task); 
                  onClose(); 
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

  return null;
};


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
