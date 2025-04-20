// src/components/TaskVerificationModal.tsx
import React, { useState, useEffect } from 'react';
import { Modal, View, Text, StyleSheet, Button, Alert, TextInput, Platform } from 'react-native';
import Slider from '@react-native-community/slider';

import { AssignedTask, TaskVerificationStatus } from '../mocks/mockAssignedTasks';
import { TaskLibraryItem } from '../mocks/mockTaskLibrary';
import { User } from '../mocks/mockUsers';
import { getTaskTitle } from '../utils/helpers';

import { colors } from '../styles/colors';


interface TaskVerificationModalProps {
  visible: boolean;
  task: AssignedTask | null;
  taskLibrary: TaskLibraryItem[];
  allUsers: User[];
  onClose: () => void;
  onVerifyTask: (taskId: string, status: TaskVerificationStatus, points: number) => void;
  onReassignTaskMock: (taskId: string, studentId: string) => void;
}

const TaskVerificationModal: React.FC<TaskVerificationModalProps> = ({
  visible,
  task,
  taskLibrary,
  allUsers,
  onClose,
  onVerifyTask,
  onReassignTaskMock,
}) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [selectedStatus, setSelectedStatus] = useState<TaskVerificationStatus>(undefined);
  const [awardedPoints, setAwardedPoints] = useState<number>(0);
  const [baseTickets, setbaseTickets] = useState<number>(0);

  useEffect(() => {
    if (visible && task) {
      setCurrentStep(1);
      setSelectedStatus(undefined);
      const libraryTask = taskLibrary.find(item => item.id === task.taskId);
      const taskbaseTickets = libraryTask ? libraryTask.baseTickets : 0;
      setbaseTickets(taskbaseTickets);

      setAwardedPoints(0);
    } else if (!visible) {
      setCurrentStep(1);
      setSelectedStatus(undefined);
      setAwardedPoints(0);
      setbaseTickets(0);
    }
  }, [visible, task, taskLibrary]);

  if (!visible || !task) {
    return null;
  }

  const taskTitle = getTaskTitle(task.taskId, taskLibrary);
  const studentName = allUsers.find(user => user.id === task.studentId)?.name || task.studentId;

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

  if (currentStep === 1) {
    return (
      <Modal animationType="slide" transparent={true} visible={visible} onRequestClose={onClose}>
        <View style={modalStyles.centeredView}>
          <View style={modalStyles.modalView}>
            <Text style={modalStyles.modalTitle}>Verify Task</Text>
            <Text style={modalStyles.taskTitle}>{taskTitle}</Text>
            <Text>Student: {studentName}</Text>
            <Text>Potential Tickets: {baseTickets}</Text>
            <Text style={{ marginBottom: 20 }}>
              Completed: {completedDateTime}
            </Text>

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

            <View style={modalStyles.pointsInputContainer}>
              <Text style={{ fontSize: 16 }}>Tickets Awarded:</Text>
              <Text style={modalStyles.awardedPointsText}>{awardedPoints}</Text>
            </View>

            <Slider
              style={modalStyles.slider}
              minimumValue={0}
              maximumValue={effectiveSliderMaxValue}
              step={1}
              value={awardedPoints > effectiveSliderMaxValue ? effectiveSliderMaxValue : (awardedPoints < 0 ? 0 : awardedPoints)}
              onValueChange={value => setAwardedPoints(Math.round(value))}
              minimumTrackTintColor={colors.gold}
              maximumTrackTintColor={colors.borderPrimary}
              thumbTintColor={colors.primary}
            />
            <View style={modalStyles.rangeText}>
              <Text>0</Text>
              <Text>Max: {baseTickets}</Text>
            </View>

            <View style={modalStyles.buttonContainer}>
              <Button
                title="Confirm Tickets"
                onPress={() => {
                  if (selectedStatus) {
                     const finalPoints = Math.min(baseTickets, Math.max(0, awardedPoints));

                    onVerifyTask(task.id, selectedStatus, finalPoints);
                    setCurrentStep(3);
                  }
                }}
              />
              <Button title="Back to Status" onPress={() => setCurrentStep(1)} color={colors.secondary} />
            </View>

            <View style={modalStyles.footerButton}>
              <Button title="Cancel Verification" onPress={onClose} color={colors.secondary} />
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
              <Text style={{ fontWeight: 'bold', color: awardedPoints > 0 ? colors.success : colors.danger }}>
                {awardedPoints}
              </Text>
            </Text>


            <Text style={modalStyles.stepTitle}>Step 3: Re-assign?</Text>

            <View style={modalStyles.buttonContainer}>
              <Button
                title="Re-assign Task (Mock)"
                onPress={() => {
                  onReassignTaskMock(task.taskId, task.studentId);
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