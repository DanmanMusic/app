// src/views/TeacherView.tsx
import React from 'react';
import { View, Text, StyleSheet, ScrollView, Button, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// Import types for mock data
import { User } from '../mocks/mockUsers';
import { AssignedTask, TaskVerificationStatus } from '../mocks/mockAssignedTasks';
import { TaskLibraryItem } from '../mocks/mockTaskLibrary';
import { RewardItem } from '../mocks/mockRewards';
import { Instrument } from '../mocks/mockInstruments';

// Import helpers
import { getTaskTitle, getInstrumentNames } from '../utils/helpers'; // IMPORT HELPERS

// Import PupilViewProps if reusing PupilView for viewing student profile
import { PupilView, PupilViewProps } from './PupilView'; // Assuming PupilView is in the same directory

// Simplified student data for lists in Teacher/Parent/Admin views
interface SimplifiedStudent {
    id: string;
    name: string;
    instrumentIds?: string[]; // Include instrument IDs
    balance: number;
}


interface TeacherViewProps {
    user: User;
    allStudents: SimplifiedStudent[]; // Simplified list of all students
    studentsLinkedToTeacher: SimplifiedStudent[]; // Simplified list of students linked to THIS teacher
    pendingVerifications: AssignedTask[];
    taskLibrary: TaskLibraryItem[];
    allAssignedTasks: AssignedTask[];
    rewardsCatalog: RewardItem[];
    mockInstruments: Instrument[]; // Pass instruments list
    // Mock functions for actions
    onVerifyTask: (taskId: string, status: TaskVerificationStatus, points: number) => void;
    onAssignTask: (taskId: string, studentId: string) => void; // Simplified mock assign
    getStudentData: (studentId: string) => PupilViewProps | undefined; // Helper to get full student mock data for drill-down
}

export const TeacherView: React.FC<TeacherViewProps> = ({
    user,
    allStudents, // All students for general view if needed
    studentsLinkedToTeacher, // Students linked to this teacher
    pendingVerifications,
    taskLibrary,
    allAssignedTasks,
    rewardsCatalog,
    mockInstruments, // Use instruments list
    onVerifyTask,
    onAssignTask,
    getStudentData
}) => {

    // State for drilling down to a specific student's full view
    const [viewingStudentId, setViewingStudentId] = React.useState<string | null>(null);
    const viewingStudentData = viewingStudentId ? getStudentData(viewingStudentId) : null;

    // If we are viewing a specific student's profile (using mock drill-down)
    if (viewingStudentData) {
         // Render the actual PupilView component with the student's data
         // Pass action props down if the Teacher should be able to Mark Complete etc from this view (unlikely)
         // Or pass Teacher-specific actions like Assign Task
         return (
              <SafeAreaView style={styles.safeArea}>
                  <View style={styles.headerContainer}>
                    <Button title="← Back to Dashboard" onPress={() => setViewingStudentId(null)} />
                     <Text style={styles.header}>{viewingStudentData.user.name}'s Profile</Text>
                     <View style={{width: 50}}/> {/* Spacer */}
                  </View>
                  {/* Render the PupilView component but maybe hide/disable actions that only Pupil/Parent should do */}
                  {/* For this mock, let's just show key info */}
                  <ScrollView style={styles.container}>
                       <Text style={styles.sectionTitle}>Student Details</Text>
                       <Text>Name: {viewingStudentData.user.name}</Text>
                       <Text>Instrument(s): {getInstrumentNames(viewingStudentData.user.instrumentIds, mockInstruments)}</Text> {/* Use helper */}
                        <Text>Balance: {viewingStudentData.balance} Tickets</Text>

                        {/* Button to assign new task to this student */}
                         <View style={{marginTop: 20, marginBottom: 20}}>
                             <Button title={`Assign Task to ${viewingStudentData.user.name} (Mock)`} onPress={() => onAssignTask('tasklib-1', viewingStudentData.user.id)} /> {/* Example mock call */}
                         </View>

                       <Text style={styles.sectionTitle}>Assigned Tasks ({viewingStudentData.assignedTasks.length})</Text>
                        {viewingStudentData.assignedTasks.length > 0 ? (
                           viewingStudentData.assignedTasks.map((task: AssignedTask) => ( // Added (task: AssignedTask) type annotation
                                <View key={task.id} style={styles.taskItem}>
                                     <Text style={styles.taskItemTitle}>{getTaskTitle(task.taskId, taskLibrary)}</Text> {/* Use helper */}
                                     <Text>Status: {task.isComplete ? (task.verificationStatus === 'pending' ? 'Complete (Pending Verification)' : `Verified`) : 'Assigned'}</Text>
                                     {task.actualPointsAwarded !== undefined && task.verificationStatus !== 'pending' && <Text>Awarded: {task.actualPointsAwarded} points</Text>}
                                     {task.isComplete && task.verificationStatus === 'pending' && <Text style={styles.pendingNote}>Awaiting verification...</Text>}
                                </View>
                           ))
                        ) : (<Text>No tasks assigned.</Text>)}

                      {/* Teacher could also view history, catalog for this student */}


                  </ScrollView>
              </SafeAreaView>
         );
    }

    // Default Teacher Dashboard View
    return (
        <SafeAreaView style={styles.safeArea}>
             <View style={styles.headerContainer}>
                 <Text style={styles.header}>Teacher Dashboard: {user.name}</Text>
             </View>
            <ScrollView style={styles.container}>

                <Text style={styles.sectionTitle}>Pending Verifications ({pendingVerifications.length})</Text>
                {pendingVerifications.length > 0 ? (
                    pendingVerifications.map((task: AssignedTask) => { // Added (task: AssignedTask) type annotation
                        // Find the student and task details for display
                        const student = allStudents.find(s => s.id === task.studentId);

                        return (
                            <View key={task.id} style={styles.verificationItem}>
                                <Text style={styles.verificationTitle}>Task: {getTaskTitle(task.taskId, taskLibrary)}</Text> {/* Use helper */}
                                <Text>Student: {student?.name || 'Unknown Student'}</Text>
                                <Text>Completed: {task.completedDate ? new Date(task.completedDate).toLocaleDateString() : 'N/A'}</Text>
                                {/* Placeholder for verification actions */}
                                 <View style={styles.verificationActions}>
                                    {/* Mock buttons with sample point values - will need a modal/input later */}
                                    <Button title="Verify (100%)" onPress={() => onVerifyTask(task.id, 'verified', taskLibrary.find(t => t.id === task.taskId)?.basePoints || 0)} /> {/* Mock: 100% base points */}
                                    <Button title="Partial (50%)" onPress={() => onVerifyTask(task.id, 'partial', Math.round((taskLibrary.find(t => t.id === task.taskId)?.basePoints || 0) * 0.5))} color="orange" /> {/* Mock: 50% base points */}
                                    <Button title="Incomplete (0%)" onPress={() => onVerifyTask(task.id, 'incomplete', 0)} color="red" /> {/* Mock: 0% */}
                                 </View>
                                  {/* Add mock button for Re-assign here */}
                            </View>
                        );
                    })
                ) : (
                    <Text style={styles.emptyListText}>No tasks pending verification.</Text>
                )}

                <Text style={styles.sectionTitle}>My Students ({studentsLinkedToTeacher.length})</Text>
                 {studentsLinkedToTeacher.length > 0 ? (
                     studentsLinkedToTeacher.map(student => (
                         <View key={student.id} style={styles.studentItem}>
                             <Text style={styles.studentName}>{student.name}</Text>
                             <Text>Instrument(s): {getInstrumentNames(student.instrumentIds, mockInstruments)}</Text> {/* Use helper */}
                             <Text>Balance: {student.balance} Tickets</Text>
                              <View style={styles.studentActions}>
                                  <Button title="View Profile (Mock)" onPress={() => setViewingStudentId(student.id)} />
                                   <Button title="Assign Task (Mock)" onPress={() => onAssignTask('tasklib-1', student.id)} /> {/* Example mock call */}
                              </View>
                         </View>
                     ))
                 ) : (<Text style={styles.emptyListText}>No students linked to you.</Text>)}

                 {/* Optional: Section for all students if permission allows */}
                 {/* This could be a separate screen navigable from here */}
                 {/*
                 <Text style={styles.sectionTitle}>All Students ({allStudents.length})</Text>
                  {allStudents.map(student => (
                       <Text key={student.id}>{student.name} ({getInstrumentNames(student.instrumentIds, mockInstruments)}) - {student.balance} tickets</Text>
                  ))}
                  */}


            </ScrollView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: '#f8f8f8',
    },
    container: {
        flex: 1,
        padding: 15,
    },
     headerContainer: {
         flexDirection: 'row',
         justifyContent: 'space-between',
         alignItems: 'center',
         paddingHorizontal: 15,
         paddingTop: 10,
         paddingBottom: 5,
         borderBottomWidth: 1,
         borderBottomColor: '#ccc',
     },
    header: {
        fontSize: 22,
        fontWeight: 'bold',
        flexShrink: 1,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        marginTop: 20,
        marginBottom: 10,
        borderBottomWidth: 1,
        borderBottomColor: '#ccc',
        paddingBottom: 5,
    },
    emptyListText: {
        textAlign: 'center',
        color: '#777',
        marginTop: 5,
    },
    // Verification Item Styles
    verificationItem: {
        backgroundColor: '#fff',
        padding: 12,
        marginBottom: 10,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: 'orange', // Highlight pending
    },
    verificationTitle: {
         fontSize: 16,
         fontWeight: 'bold',
         marginBottom: 5,
    },
     verificationActions: {
         flexDirection: 'row',
         justifyContent: 'space-around',
         marginTop: 10,
     },
    // Student List Item Styles (Teacher View)
    studentItem: {
         backgroundColor: '#fff',
        padding: 12,
        marginBottom: 10,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#ddd',
    },
    studentName: {
        fontSize: 16,
        fontWeight: 'bold',
        marginBottom: 5,
    },
     studentActions: {
         flexDirection: 'row',
         justifyContent: 'space-around',
         marginTop: 10,
     },
      // Task Item Styles (reused when viewing student profile from Teacher)
      taskItem: {
        backgroundColor: '#fff',
        padding: 10,
        marginBottom: 8, // Less space when in a list
        borderRadius: 6,
        borderWidth: 1,
        borderColor: '#eee',
    },
    taskItemTitle: {
        fontSize: 15, // Slightly smaller when in a list
        fontWeight: 'bold',
        marginBottom: 3,
    },
    taskItemStatus: {
         fontSize: 13,
         color: '#555',
         marginBottom: 3,
     },
    taskItemPoints: {
        fontSize: 13,
        fontWeight: 'bold',
        color: 'green',
    },
     pendingNote: {
         fontSize: 12,
         color: 'orange',
         fontStyle: 'italic',
     },

});