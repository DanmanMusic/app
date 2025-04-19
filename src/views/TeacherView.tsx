// src/views/TeacherView.tsx
import React from 'react';
import { View, Text, StyleSheet, ScrollView, Button, Alert, FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// Import types for mock data
import { User } from '../mocks/mockUsers';
import { AssignedTask, TaskVerificationStatus } from '../mocks/mockAssignedTasks';
import { TaskLibraryItem } from '../mocks/mockTaskLibrary';
import { RewardItem } from '../mocks/mockRewards';
import { Instrument } from '../mocks/mockInstruments';

// Import helpers
import { getTaskTitle, getInstrumentNames } from '../utils/helpers';

// Import PupilViewProps if reusing PupilView for viewing student profile,
// or define necessary interfaces if rendering simplified data directly.
import { PupilViewProps } from './PupilView'; // Assuming PupilView is in the same directory

// Import the new verification modal component
import TaskVerificationModal from '../components/TaskVerificationModal';


// Simplified student data for lists in Teacher/Parent/Admin views
interface SimplifiedStudent {
    id: string;
    name: string;
    instrumentIds?: string[]; // Include instrument IDs
    balance: number;
}

// Define a simplified structure for Assigned Tasks when listing for Teacher/Admin
// Keeping this interface but it's not strictly used for rendering in the list itself
interface AssignedTaskSimplified {
    id: string;
    taskId: string;
    studentId: string;
    studentName?: string; // Added for easier display
    assignedDate: string;
    isComplete: boolean;
    completedDate?: string;
    verificationStatus?: TaskVerificationStatus;
    actualPointsAwarded?: number;
}


interface TeacherViewProps {
    user: User;
    allStudents: SimplifiedStudent[]; // Simplified list of all students (for assignment/reference)
    studentsLinkedToTeacher: SimplifiedStudent[]; // Simplified list of students linked to THIS teacher (for quick access)
    pendingVerifications: AssignedTask[]; // Tasks needing verification
    taskLibrary: TaskLibraryItem[];
    allAssignedTasks: AssignedTask[]; // Full list of assigned tasks (potentially for 'View All' screen)
    rewardsCatalog: RewardItem[]; // Needed if teacher can view catalog? (SPEC says yes)
    mockInstruments: Instrument[]; // Pass instruments list
    // Mock functions for actions
    onVerifyTask: (taskId: string, status: TaskVerificationStatus, points: number) => void;
    onAssignTask: (taskId: string, studentId: string) => void; // Simplified mock assign
    onReassignTaskMock: (taskId: string, studentId: string) => void; // Mock reassign action, passed to modal
    // Assuming Admin/Teacher can also delete/edit assigned tasks? (SPEC is unclear, add mock placeholders)
    onEditAssignedTask?: (assignedTaskId: string, updates: any) => void; // Mock placeholder
    onDeleteAssignedTask?: (assignedTaskId: string) => void; // Mock placeholder
    getStudentData: (studentId: string) => PupilViewProps | undefined; // Helper to get full student mock data for drill-down
}

// Render item for FlatList of Pending Verifications - Modified to open modal
const PendingVerificationItem = ({ task, studentName, taskTitle, onInitiateVerification }: {
    task: AssignedTask;
    studentName: string;
    taskTitle: string;
    onInitiateVerification: (task: AssignedTask) => void; // New prop to trigger modal
}) => {
    return (
        <View style={styles.verificationItem}>
            <Text style={styles.verificationTitle}>Task: {taskTitle}</Text>
            <Text>Student: {studentName}</Text>
            <Text>Completed: {task.completedDate ? new Date(task.completedDate).toLocaleDateString() : 'N/A'}</Text>
             {/* Button to open the verification modal */}
             <View style={{marginTop: 10}}>
                <Button title="Verify Task" onPress={() => onInitiateVerification(task)} />
             </View>
        </View>
    );
};

// Render item for FlatList of Students (My Students / All Students)
const StudentListItem = ({ student, mockInstruments, onViewProfile, onAssignTask }: {
    student: SimplifiedStudent;
    mockInstruments: Instrument[];
    onViewProfile: (studentId: string) => void;
    onAssignTask: (studentId: string) => void; // Simplified handler for assigning to THIS student
}) => (
    <View style={styles.studentItem}>
        <Text style={styles.studentName}>{student.name}</Text>
        <Text>Instrument(s): {getInstrumentNames(student.instrumentIds, mockInstruments)}</Text>
        <Text>Balance: {student.balance} Tickets</Text>
        <View style={styles.studentActions}>
            <Button title="View Profile (Mock)" onPress={() => onViewProfile(student.id)} />
            <Button title="Assign Task (Mock)" onPress={() => onAssignTask(student.id)} /> {/* Trigger assign flow for this student */}
        </View>
    </View>
);

// Render item for FlatList of Task Library Items
const TaskLibraryItemTeacher = ({ item }: { item: TaskLibraryItem }) => (
    <View style={styles.taskLibraryItem}>
        <Text style={styles.taskLibraryItemTitle}>{item.title}</Text>
        <Text>{item.description}</Text>
        <Text style={styles.taskLibraryItemPoints}>{item.basePoints} Base Points</Text>
    </View>
);


export const TeacherView: React.FC<TeacherViewProps> = ({
    user,
    allStudents,
    studentsLinkedToTeacher,
    pendingVerifications,
    taskLibrary,
    allAssignedTasks, // Not currently used in this basic view, but available
    rewardsCatalog,
    mockInstruments,
    onVerifyTask,
    onAssignTask,
    onReassignTaskMock, // Destructure the new prop
    getStudentData
}) => {

    // State for managing sections within Teacher View
    const [viewingSection, setViewingSection] = React.useState<'dashboard' | 'students' | 'tasks' | 'catalog' | 'studentProfile'>('dashboard');
    // State for drilling down to a specific student's full view
    const [viewingStudentId, setViewingStudentId] = React.useState<string | null>(null);
    const viewingStudentData = viewingStudentId ? getStudentData(viewingStudentId) : null;

    // State for the verification modal
    const [isVerificationModalVisible, setIsVerificationModalVisible] = React.useState(false);
    const [taskToVerify, setTaskToVerify] = React.useState<AssignedTask | null>(null);


    // --- Mock Handlers for UI actions ---

    // Handler to open the verification modal
    const handleInitiateVerification = (task: AssignedTask) => {
        setTaskToVerify(task);
        setIsVerificationModalVisible(true);
    };

    // Handler to close the verification modal
    const handleCloseVerificationModal = () => {
        setIsVerificationModalVisible(false);
        setTaskToVerify(null); // Clear the task being verified
    };

    // Handler for the "Assign Task" button next to a student
    const handleAssignTaskToStudent = (studentId: string) => {
        Alert.prompt(
            "Mock Assign Task",
            `Assign which task (ID) from library to student ${studentId}? (e.g., tasklib-1)`,
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Assign",
                    onPress: (taskId) => {
                        if (taskId && taskLibrary.some(t => t.id === taskId)) {
                            onAssignTask(taskId, studentId);
                            Alert.alert("Mock Assign", `Task ${taskId} assigned to student ${studentId}`);
                        } else {
                            Alert.alert("Invalid Task ID", "Please enter a valid task library ID.");
                        }
                    }
                },
            ],
             Platform.OS === 'ios' ? 'default' : 'plain-text'
        );
    };

     // Handler for initiating a generic "Assign Task" flow (not specific to a student yet)
     const handleInitiateAssignTask = () => {
         Alert.alert("Mock Assign Task Flow", "Simulate initiating assignment: First select student(s), then select a task.");
         // setViewingSection('students'); // Option: navigate to student list for selection
     };


    // --- Render Logic ---

    // If we are viewing a specific student's profile (mock drill-down)
    if (viewingStudentId && viewingStudentData) {
         return (
              <SafeAreaView style={styles.safeArea}>
                  <View style={styles.headerContainer}>
                    <Button title="← Back to Teacher" onPress={() => { setViewingStudentId(null); setViewingSection('students'); }} />
                     <Text style={styles.header}>{viewingStudentData.user.name}'s Profile</Text>
                     <View style={{width: 50}}/> {/* Spacer */}
                  </View>
                  <ScrollView style={styles.container}>
                       <Text style={styles.sectionTitle}>Student Details</Text>
                       <Text>Name: {viewingStudentData.user.name}</Text>
                       <Text>Instrument(s): {getInstrumentNames(viewingStudentData.user.instrumentIds, mockInstruments)}</Text>
                       <Text>Balance: {viewingStudentData.balance} Tickets</Text>

                         <View style={{marginTop: 20, marginBottom: 20, alignItems: 'flex-start'}}>
                             <Button title={`Assign Task to ${viewingStudentData.user.name} (Mock)`} onPress={() => handleAssignTaskToStudent(viewingStudentData.user.id)} />
                         </View>

                       <Text style={styles.sectionTitle}>Assigned Tasks ({viewingStudentData.assignedTasks.length})</Text>
                        {viewingStudentData.assignedTasks.length > 0 ? (
                           <FlatList
                               data={viewingStudentData.assignedTasks.sort((a,b) => new Date(b.assignedDate).getTime() - new Date(a.assignedDate).getTime())}
                               keyExtractor={(item) => item.id}
                               renderItem={({ item }) => (
                                    <View style={styles.taskItem}>
                                         <Text style={styles.taskItemTitle}>{getTaskTitle(item.taskId, taskLibrary)}</Text>
                                         <Text style={styles.taskItemStatus}>
                                             Status: {item.isComplete ? (item.verificationStatus === 'pending' ? 'Complete (Pending Verification)' : `Verified (${item.verificationStatus})`) : 'Assigned'}
                                         </Text>
                                          {item.completedDate && <Text style={styles.taskItemDetail}>Completed: {new Date(item.completedDate).toLocaleDateString()}</Text>}
                                           {item.verifiedDate && <Text style={styles.taskItemDetail}>Verified: {new Date(item.verifiedDate).toLocaleDateString()}</Text>}
                                         {item.actualPointsAwarded !== undefined && item.verificationStatus !== 'pending' && (
                                              <Text style={styles.taskItemDetail}>Awarded: {item.actualPointsAwarded ?? 0} points</Text>
                                         )}
                                         {item.isComplete && item.verificationStatus === 'pending' && (
                                              <Text style={styles.pendingNote}>Awaiting verification...</Text>
                                         )}
                                           <View style={styles.assignedTaskActions}>
                                                <Button title="Delete (Mock)" onPress={() => Alert.alert("Mock Delete Task", `Simulate deleting assigned task ${item.id}`)} color="red" />
                                           </View>
                                    </View>
                               )}
                               scrollEnabled={false}
                               ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
                                ListEmptyComponent={() => <Text style={styles.emptyListText}>No tasks assigned.</Text>}
                            />

                        ) : (<Text style={styles.emptyListText}>No tasks assigned.</Text>)}

                       <View style={{marginTop: 20, marginBottom: 20, flexDirection: 'row', justifyContent: 'space-around'}}>
                            <Button title="View History (Mock)" onPress={() => Alert.alert("Mock View History", `Simulate viewing full history for ${viewingStudentData.user.name}`)} />
                            <Button title="View Catalog (Mock)" onPress={() => Alert.alert("Mock View Catalog", `Simulate viewing rewards catalog in ${viewingStudentData.user.name}'s context`)} />
                       </View>


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

                 {/* Simple Navigation between Teacher sections */}
                 <View style={styles.teacherNav}>
                     <Button title="Dashboard" onPress={() => setViewingSection('dashboard')} color={viewingSection === 'dashboard' ? 'blue' : 'gray'} />
                     <Button title="My Students" onPress={() => setViewingSection('students')} color={viewingSection === 'students' ? 'blue' : 'gray'} />
                     <Button title="Tasks" onPress={() => setViewingSection('tasks')} color={viewingSection === 'tasks' ? 'blue' : 'gray'} />
                 </View>


                {/* Render content based on selected section */}
                {viewingSection === 'dashboard' && (
                    <View>
                         <Text style={styles.sectionTitle}>Pending Verifications ({pendingVerifications.length})</Text>
                         {pendingVerifications.length > 0 ? (
                             <FlatList
                                data={pendingVerifications.sort((a, b) => new Date(a.completedDate || a.assignedDate).getTime() - new Date(b.completedDate || b.assignedDate).getTime())}
                                keyExtractor={(item) => item.id}
                                renderItem={({ item }) => {
                                    const student = allStudents.find(s => s.id === item.studentId);
                                    const taskDetail = taskLibrary.find(t => t.id === item.taskId);
                                     return (
                                         <PendingVerificationItem
                                             task={item}
                                             studentName={student?.name || 'Unknown Student'}
                                             taskTitle={getTaskTitle(item.taskId, taskLibrary)}
                                             onInitiateVerification={handleInitiateVerification} // Pass the handler to open modal
                                         />
                                     );
                                }}
                                scrollEnabled={false}
                                ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
                                ListEmptyComponent={() => <Text style={styles.emptyListText}>No tasks pending verification.</Text>}
                            />
                        ) : (
                            <Text style={styles.emptyListText}>No tasks pending verification.</Text>
                        )}

                         {/* Add other dashboard elements like recent activity, stats etc. */}
                    </View>
                )}

                {viewingSection === 'students' && (
                    <View>
                         <Text style={styles.sectionTitle}>My Students ({studentsLinkedToTeacher.length})</Text>
                         {studentsLinkedToTeacher.length > 0 ? (
                              <FlatList
                                data={studentsLinkedToTeacher.sort((a, b) => a.name.localeCompare(b.name))}
                                keyExtractor={(item) => item.id}
                                renderItem={({item}) => (
                                     <StudentListItem
                                         student={item}
                                         mockInstruments={mockInstruments}
                                         onViewProfile={setViewingStudentId}
                                         onAssignTask={handleAssignTaskToStudent}
                                     />
                                )}
                                scrollEnabled={false}
                                ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
                                 ListEmptyComponent={() => <Text style={styles.emptyListText}>No students linked to you.</Text>}
                             />
                        ) : (
                            <Text style={styles.emptyListText}>No students linked to you. Ask an Admin to link your students.</Text>
                        )}

                         <View style={{marginTop: 20, alignItems: 'flex-start'}}>
                             <Button title="View All Students (Mock)" onPress={() => Alert.alert("View All Students", "Simulate viewing a list of all students (requires permission).")} />
                         </View>
                    </View>
                )}

                 {viewingSection === 'tasks' && (
                     <View>
                          <Text style={styles.sectionTitle}>Task Management</Text>

                           <View style={{alignItems: 'flex-start', marginBottom: 20}}>
                                <Button title="Assign Task (Mock Flow)" onPress={handleInitiateAssignTask} />
                           </View>


                          <Text style={styles.sectionSubTitle}>Task Library ({taskLibrary.length})</Text>
                           {taskLibrary.length > 0 ? (
                               <FlatList
                                    data={taskLibrary.sort((a, b) => a.title.localeCompare(b.title))}
                                    keyExtractor={(item) => item.id}
                                    renderItem={({item}) => <TaskLibraryItemTeacher item={item} />}
                                    scrollEnabled={false}
                                    ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
                                     ListEmptyComponent={() => <Text style={styles.emptyListText}>No task library items found.</Text>}
                                />
                           ) : (
                               <Text style={styles.emptyListText}>Task library is empty.</Text>
                           )}
                     </View>
                 )}

            </ScrollView>

             {/* Render the verification modal */}
             <TaskVerificationModal
                 visible={isVerificationModalVisible}
                 task={taskToVerify}
                 taskLibrary={taskLibrary}
                 onClose={handleCloseVerificationModal}
                 onVerifyTask={onVerifyTask} // Pass the prop from App.tsx
                 onReassignTaskMock={onReassignTaskMock} // Pass the new prop from App.tsx
             />

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
     sectionSubTitle: {
         fontSize: 16,
         fontWeight: 'bold',
         marginTop: 15,
         marginBottom: 10,
         color: '#555',
     },
    emptyListText: {
        textAlign: 'center',
        color: '#777',
        marginTop: 5,
    },
     teacherNav: {
         flexDirection: 'row',
         flexWrap: 'wrap',
         justifyContent: 'center',
         marginBottom: 20,
         gap: 8,
     },
    // Verification Item Styles - Simplified as action is now in modal
    verificationItem: {
        backgroundColor: '#fff',
        padding: 12,
        marginBottom: 10,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: 'orange',
    },
    verificationTitle: {
         fontSize: 16,
         fontWeight: 'bold',
         marginBottom: 5,
    },
     // verificationActions removed as buttons are in modal
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
          gap: 5,
     },
     // Task Library Item Styles (Teacher View)
     taskLibraryItem: {
         backgroundColor: '#fff',
         padding: 12,
         marginBottom: 10,
         borderRadius: 8,
         borderWidth: 1,
         borderColor: '#eee',
     },
      taskLibraryItemTitle: {
         fontSize: 15,
         fontWeight: 'bold',
         marginBottom: 3,
      },
       taskLibraryItemPoints: {
         fontSize: 13,
         color: '#555',
         marginTop: 5,
         fontStyle: 'italic',
       },
      // Assigned Task Styles (reused when viewing student profile from Teacher)
      taskItem: {
        backgroundColor: '#fff',
        padding: 10,
        marginBottom: 8,
        borderRadius: 6,
        borderWidth: 1,
        borderColor: '#eee',
    },
    taskItemTitle: {
        fontSize: 15,
        fontWeight: 'bold',
        marginBottom: 3,
    },
     taskItemStatus: {
         fontSize: 13,
         color: '#555',
         marginBottom: 3,
     },
     taskItemDetail: {
        fontSize: 12,
        color: '#666',
        marginBottom: 2,
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
         marginTop: 5,
     },
      assignedTaskActions: {
          flexDirection: 'row',
          justifyContent: 'flex-end',
          marginTop: 8,
           gap: 5,
      }

});