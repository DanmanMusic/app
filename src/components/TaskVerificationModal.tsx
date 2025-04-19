// src/components/TaskVerificationModal.tsx
import React, { useState, useEffect } from 'react';
import { Modal, View, Text, StyleSheet, Button, Alert, TextInput, Platform } from 'react-native';
import Slider from '@react-native-community/slider'; // Import Slider

import { AssignedTask, TaskVerificationStatus } from '../mocks/mockAssignedTasks';
import { TaskLibraryItem } from '../mocks/mockTaskLibrary';
import { getTaskTitle } from '../utils/helpers';

interface TaskVerificationModalProps {
    visible: boolean;
    task: AssignedTask | null;
    taskLibrary: TaskLibraryItem[];
    onClose: () => void;
    onVerifyTask: (taskId: string, status: TaskVerificationStatus, points: number) => void;
    onReassignTaskMock: (taskId: string, studentId: string) => void;
}

const TaskVerificationModal: React.FC<TaskVerificationModalProps> = ({
    visible,
    task,
    taskLibrary,
    onClose,
    onVerifyTask,
    onReassignTaskMock,
}) => {
    const [currentStep, setCurrentStep] = useState(1); // 1: Status, 2: Points, 3: Reassign/Done
    const [selectedStatus, setSelectedStatus] = useState<TaskVerificationStatus>(undefined);
    const [awardedPoints, setAwardedPoints] = useState<number>(0);
    const [basePoints, setBasePoints] = useState<number>(0);

    // Reset state and set initial points based on default status
    useEffect(() => {
        if (visible && task) {
            setCurrentStep(1);
            setSelectedStatus(undefined); // Reset status initially
            const libraryTask = taskLibrary.find(item => item.id === task.taskId);
            const taskBasePoints = libraryTask ? libraryTask.basePoints : 0;
            setBasePoints(taskBasePoints);

             // Points are set in Step 1 handlers based on the button pressed
             setAwardedPoints(0); // Reset points on modal open

        } else if (!visible) {
            // Reset fully when closing
            setCurrentStep(1);
            setSelectedStatus(undefined);
            setAwardedPoints(0);
            setBasePoints(0);
        }
    }, [visible, task, taskLibrary]);

    if (!visible || !task) {
        return null;
    }

    const taskTitle = getTaskTitle(task.taskId, taskLibrary);
    const studentName = task.studentId; // Placeholder - replace with actual student name if available

    // --- Handle point initialization and step transition in Step 1 buttons ---
     const handleStatusSelect = (status: TaskVerificationStatus) => {
         let initialPoints = 0;
         switch (status) {
             case 'verified':
                 initialPoints = basePoints; // Default 100%
                 break;
             case 'partial':
                 initialPoints = Math.round(basePoints * 0.5); // Default 50%
                 break;
             case 'incomplete':
                 initialPoints = 0; // Default 0%
                 break;
         }
         setSelectedStatus(status);
         setAwardedPoints(initialPoints);
         setCurrentStep(2); // Move to Step 2 (Points)
     };


    // --- Step 1: Select Status ---
    if (currentStep === 1) {
        return (
            <Modal
                animationType="slide"
                transparent={true}
                visible={visible}
                onRequestClose={onClose}
            >
                <View style={modalStyles.centeredView}>
                    <View style={modalStyles.modalView}>
                        <Text style={modalStyles.modalTitle}>Verify Task</Text>
                        <Text style={modalStyles.taskTitle}>{taskTitle}</Text>
                        <Text>Student: {studentName}</Text>
                        <Text style={{marginBottom: 20}}>Completed: {task.completedDate ? new Date(task.completedDate).toLocaleDateString() : 'N/A'}</Text>

                        <Text style={modalStyles.stepTitle}>Step 1: Select Status</Text>

                        <View style={modalStyles.buttonContainer}>
                            {/* Call new handler */}
                            <Button title="Verified" onPress={() => handleStatusSelect('verified')} />
                            <Button title="Partial" onPress={() => handleStatusSelect('partial')} color="orange" />
                            <Button title="Incomplete" onPress={() => handleStatusSelect('incomplete')} color="red" />
                        </View>

                        <View style={modalStyles.footerButton}>
                            <Button title="Cancel" onPress={onClose} color="gray" />
                        </View>
                    </View>
                </View>
            </Modal>
        );
    }

    // --- Step 2: Adjust Points ---
    if (currentStep === 2 && selectedStatus) {

        // Determine slider max value (ensure it's at least the base points if basePoints > 0, or 1 if basePoints is 0)
        // NOTE: Standard sliders inherently bind to min/max. The request "can give more than base and less than zero" contradicts a slider [0, basePoints].
        // Implementing slider with range [0, basePoints] as the most standard interpretation for task awards.
        // If arbitrary values are *required*, the input method needs reconsideration.
         const sliderMaxValue = basePoints >= 0 ? basePoints : 0; // Ensure max is not negative

        return (
            <Modal
                animationType="slide"
                transparent={true}
                visible={visible}
                onRequestClose={onClose}
            >
                <View style={modalStyles.centeredView}>
                    <View style={modalStyles.modalView}>
                         <Text style={modalStyles.modalTitle}>Verify Task</Text>
                         <Text style={modalStyles.taskTitle}>{taskTitle}</Text>
                         <Text style={{marginBottom: 20}}>Status Selected: <Text style={{fontWeight: 'bold', color: selectedStatus === 'verified' ? 'green' : selectedStatus === 'partial' ? 'orange' : 'red'}}>{selectedStatus?.toUpperCase()}</Text></Text>

                        <Text style={modalStyles.stepTitle}>Step 2: Award Tickets</Text>
                        <Text>Base Points: {basePoints}</Text>

                        <View style={modalStyles.pointsInputContainer}>
                             <Text style={{fontSize: 16}}>Tickets Awarded:</Text>
                              <Text style={modalStyles.awardedPointsText}>{awardedPoints}</Text>
                        </View>

                        {/* Slider for adjusting points */}
                        <Slider
                            style={modalStyles.slider}
                            minimumValue={0}
                            maximumValue={sliderMaxValue > 0 ? sliderMaxValue : 1} // Ensure max is >= min (>=0), at least 1 if base is 0 for interaction
                             step={1} // Whole numbers for tickets
                            value={awardedPoints}
                            onValueChange={value => setAwardedPoints(Math.round(value))} // Round to nearest integer
                             minimumTrackTintColor="gold" // Color of the track to the left of the thumb
                             maximumTrackTintColor="#ccc" // Color of the track to the right of the thumb
                             thumbTintColor="blue" // Color of the slider thumb
                        />
                         {/* Display range */}
                         <View style={modalStyles.rangeText}>
                             <Text>0</Text>
                             <Text>{basePoints}</Text>
                         </View>


                        <View style={modalStyles.buttonContainer}>
                            <Button title="Confirm Points" onPress={() => {
                                if (selectedStatus) {
                                    // Clamp points between 0 and basePoints before sending to App.tsx
                                    // This enforces the range even if the slider/input allowed temporary out-of-range values (though slider prevents it)
                                    const finalPoints = Math.max(0, awardedPoints); // Ensure not negative
                                    // No upper clamp needed if slider max is basePoints
                                    // const finalPoints = Math.min(basePoints, Math.max(0, awardedPoints)); // Clamp between 0 and basePoints if needed

                                    onVerifyTask(task.id, selectedStatus, finalPoints);
                                    setCurrentStep(3); // Move to reassign step
                                }
                            }} />
                             <Button title="Back to Status" onPress={() => setCurrentStep(1)} color="gray" />
                        </View>

                         <View style={modalStyles.footerButton}>
                             <Button title="Cancel Verification" onPress={onClose} color="gray" />
                         </View>
                    </View>
                </View>
            </Modal>
        );
    }

     // --- Step 3: Reassign Option ---
    if (currentStep === 3) {
        return (
             <Modal
                animationType="slide"
                transparent={true}
                visible={visible}
                onRequestClose={onClose}
            >
                 <View style={modalStyles.centeredView}>
                    <View style={modalStyles.modalView}>
                         <Text style={modalStyles.modalTitle}>Verification Complete!</Text>
                          <Text style={modalStyles.taskTitle}>{taskTitle}</Text>
                          <Text>Status: <Text style={{fontWeight: 'bold'}}>{selectedStatus?.toUpperCase()}</Text></Text>
                          <Text style={{marginBottom: 20}}>Tickets Awarded: <Text style={{fontWeight: 'bold', color: awardedPoints > 0 ? 'green' : 'red'}}>{awardedPoints}</Text></Text>

                        <Text style={modalStyles.stepTitle}>Step 3: Re-assign?</Text>

                         <View style={modalStyles.buttonContainer}>
                             <Button title="Re-assign Task (Mock)" onPress={() => {
                                 // In the mock, we're re-assigning the original task *library* item
                                 // A real implementation might clone the assigned task details.
                                 // Using original task.taskId here as per previous mock logic.
                                 onReassignTaskMock(task.taskId, task.studentId);
                                 onClose(); // Close modal after action
                             }} />
                         </View>
                        <View style={modalStyles.buttonContainer}>
                             <Button title="Done" onPress={onClose} />
                         </View>

                    </View>
                 </View>
            </Modal>
        );
    }

    return null; // Should not reach here
};

// --- Modal Styles ---
const modalStyles = StyleSheet.create({
    centeredView: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: 'rgba(0,0,0,0.5)',
    },
    modalView: {
        margin: 20,
        backgroundColor: "white",
        borderRadius: 20,
        padding: 35,
        alignItems: "center",
        shadowColor: "#000",
        shadowOffset: {
            width: 0,
            height: 2
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
     },
     taskTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 10,
        textAlign: 'center',
     },
    stepTitle: {
        fontSize: 16,
        fontWeight: '600',
        marginTop: 15,
        marginBottom: 10,
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
        paddingBottom: 5,
        width: '100%',
        textAlign: 'center',
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
         justifyContent: 'center', // Center the points display
         marginBottom: 10,
         gap: 10,
     },
      awardedPointsText: {
         fontSize: 20,
         fontWeight: 'bold',
         color: 'gold',
     },
     slider: {
         width: '100%',
         height: 40, // Standard height for slider touch target
         marginTop: 10,
     },
      rangeText: {
         flexDirection: 'row',
         justifyContent: 'space-between',
         width: '100%', // Match slider width
         paddingHorizontal: 5, // Add padding to align text with slider ends
         marginTop: -5, // Pull up closer to slider
         marginBottom: 10,
         fontSize: 12,
         color: '#555',
      }
});

export default TaskVerificationModal;