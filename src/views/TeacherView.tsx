// src/views/TeacherView.tsx
import React from 'react';
import { View, Text, StyleSheet, ScrollView, Button, FlatList, Platform } from 'react-native'; // Removed Alert as simple alert() is used
import { SafeAreaView } from 'react-native-safe-area-context';

// Import NEW user type
import { User } from '../types/userTypes';

// Other required types
import { AssignedTask, TaskVerificationStatus } from '../mocks/mockAssignedTasks';
import { TaskLibraryItem } from '../mocks/mockTaskLibrary';
// import { RewardItem } from '../mocks/mockRewards'; // Not directly used in TeacherView UI
import { Instrument } from '../mocks/mockInstruments';

// Import NEW helper for display names
import { getTaskTitle, getInstrumentNames, getUserDisplayName } from '../utils/helpers';

// PupilViewProps uses the new User type indirectly
import { PupilViewProps } from './PupilView';

// Shared styles and colors
import { appSharedStyles } from '../styles/appSharedStyles';
import { colors } from '../styles/colors';
// Import admin styles for task item consistency
import { adminSharedStyles } from '../components/admin/adminSharedStyles';


// SimplifiedStudent type uses display name implicitly
// (Assumes App.tsx provides 'name' as the formatted display name)
interface SimplifiedStudent {
  id: string;
  name: string; // Display name
  instrumentIds?: string[];
  balance: number;
}

// Props interface uses the new User type and updated SimplifiedStudent
interface TeacherViewProps {
  user: User; // Use new User type
  allStudents: SimplifiedStudent[]; // Uses display name
  studentsLinkedToTeacher: SimplifiedStudent[]; // Uses display name
  pendingVerifications: AssignedTask[];
  taskLibrary: TaskLibraryItem[];
  allAssignedTasks: AssignedTask[]; // Full list needed for potential lookups if student view logic changes
  // rewardsCatalog: RewardItem[]; // Not directly used here
  mockInstruments: Instrument[];
  onVerifyTask: (taskId: string, status: TaskVerificationStatus, points: number) => void;
  onAssignTask: (taskId: string, studentId: string) => void;
  onReassignTaskMock: (taskId: string, studentId: string) => void;
  onInitiateVerificationModal: (task: AssignedTask) => void; // To open the modal (rendered in App.tsx)
  getStudentData: (studentId: string) => PupilViewProps | undefined; // Returns type with new User structure
}

// Component to render pending verification items
const PendingVerificationItem = ({
  task,
  studentName, // Expects pre-formatted display name
  taskTitle,
  taskLibrary,
  onInitiateVerification,
}: {
  task: AssignedTask;
  studentName: string;
  taskTitle: string;
  taskLibrary: TaskLibraryItem[];
  onInitiateVerification: (task: AssignedTask) => void;
}) => {
   const taskDetail = taskLibrary.find(t => t.id === task.taskId);
   const baseTickets = taskDetail?.baseTickets ?? 0;
    const completedDateTime = task.completedDate
        ? new Date(task.completedDate).toLocaleString()
        : 'N/A';

  return (
    // Using styles consistent with Admin pending items
    <View style={adminSharedStyles.pendingItem}>
      <Text style={adminSharedStyles.pendingTitle}>Task: {taskTitle}</Text>
       {/* Display name is passed in */}
      <Text style={adminSharedStyles.pendingDetail}>Student: {studentName}</Text>
      <Text style={adminSharedStyles.pendingDetail}>
        Potential Tickets: {baseTickets}
      </Text>
      <Text style={adminSharedStyles.pendingDetail}>Completed: {completedDateTime}</Text>

      <View style={{ marginTop: 10 }}>
        <Button title="Verify Task" onPress={() => onInitiateVerification(task)} />
      </View>
    </View>
  );
};

// Component to render student items in the list
const StudentListItem = ({
  student, // Expects SimplifiedStudent with display name
  mockInstruments,
  onViewProfile,
  onAssignTask,
}: {
  student: SimplifiedStudent;
  mockInstruments: Instrument[];
  onViewProfile: (studentId: string) => void;
  onAssignTask: (studentId: string) => void;
}) => (
  <View style={appSharedStyles.itemContainer}>
    {/* Display name is already in student.name */}
    <Text style={appSharedStyles.itemTitle}>{student.name}</Text>
    <Text style={appSharedStyles.itemDetailText}>Instrument(s): {getInstrumentNames(student.instrumentIds, mockInstruments)}</Text>
    <Text style={[appSharedStyles.itemDetailText, appSharedStyles.textGold]}>Balance: {student.balance} Tickets</Text>
    <View style={styles.studentActions}>
      {/* Button text reflects action */}
      <Button title="View Profile (Mock)" onPress={() => onViewProfile(student.id)} />
      <Button title="Assign Task (Mock)" onPress={() => onAssignTask(student.id)} />
    </View>
  </View>
);

// Component to render task library items
const TaskLibraryItemTeacher = ({ item }: { item: TaskLibraryItem }) => (
  <View style={appSharedStyles.itemContainer}>
    <Text style={appSharedStyles.itemTitle}>{item.title}</Text>
    <Text style={appSharedStyles.itemDetailText}>{item.description}</Text>
    <Text style={[appSharedStyles.itemDetailText, styles.taskLibraryItemTickets]}>{item.baseTickets} Base Tickets</Text>
  </View>
);

// Main TeacherView component
export const TeacherView: React.FC<TeacherViewProps> = ({
  user, // Full user object for the logged-in teacher
  allStudents, // Simplified list with display names
  studentsLinkedToTeacher, // Simplified list with display names
  pendingVerifications,
  taskLibrary,
  allAssignedTasks, // Keep full list if needed for filtering in student profile view
  // rewardsCatalog, // Removed as not used
  mockInstruments,
  onVerifyTask,
  onAssignTask,
  onReassignTaskMock,
  onInitiateVerificationModal,
  getStudentData,
}) => {
  // State for managing the current view section and selected student
  const [viewingSection, setViewingSection] = React.useState<
    'dashboard' | 'students' | 'tasks' | 'studentProfile' // Removed 'catalog'
  >('dashboard');
  const [viewingStudentId, setViewingStudentId] = React.useState<string | null>(null);
  // getStudentData returns PupilViewProps which contains the full User object
  const viewingStudentData = viewingStudentId ? getStudentData(viewingStudentId) : null;

  // Handler to assign a task (mock implementation)
  const handleAssignTaskToStudent = (studentId: string) => {
    // Find the simplified student to get the display name for the alert
    const studentInfo = studentsLinkedToTeacher.find(s => s.id === studentId) ?? allStudents.find(s => s.id === studentId);
    const studentDisplayName = studentInfo ? studentInfo.name : studentId;

    // Use simple alert for web mock
    alert(`Mock Assign Task to ${studentDisplayName}`);
    // Could use Alert.prompt or modal later
  };

  // Handler for the general "Assign Task" flow button
  const handleInitiateAssignTask = () => {
    alert('Mock Assign Task Flow - Select student(s), then select a task.');
  };

  // Render the student profile view if a student is selected
  if (viewingStudentId && viewingStudentData) {
    // Get display name for the viewed student
    const studentDisplayName = getUserDisplayName(viewingStudentData.user);
    return (
      <SafeAreaView style={appSharedStyles.safeArea}>
        {/* Header for Student Profile */}
        <View style={appSharedStyles.headerContainer}>
          <Button
            title="← Back to Teacher"
            onPress={() => {
              setViewingStudentId(null);
              setViewingSection('students'); // Go back to the student list
            }}
          />
           {/* Use display name in header */}
          <Text style={appSharedStyles.header}>{studentDisplayName}'s Profile</Text>
          <View style={{ width: 50 }} /> {/* Spacer */}
        </View>
        {/* Scrollable content for Student Profile */}
        <ScrollView style={appSharedStyles.container}>
          <Text style={appSharedStyles.sectionTitle}>Student Details</Text>
           {/* Use display name */}
          <Text style={appSharedStyles.itemDetailText}>Name: {studentDisplayName}</Text>
          <Text style={appSharedStyles.itemDetailText}>
            Instrument(s):{' '}
            {getInstrumentNames(viewingStudentData.user.instrumentIds, mockInstruments)}
          </Text>
          <Text style={[appSharedStyles.itemDetailText, appSharedStyles.textGold]}>Balance: {viewingStudentData.balance} Tickets</Text>

          {/* Assign Task Button specific to this student */}
          <View style={{ marginTop: 20, marginBottom: 20, alignItems: 'flex-start' }}>
            <Button
               // Use display name
              title={`Assign Task to ${studentDisplayName} (Mock)`}
              onPress={() => handleAssignTaskToStudent(viewingStudentData.user.id)}
            />
          </View>

          {/* Assigned Tasks List for this student */}
          <Text style={appSharedStyles.sectionTitle}>
            Assigned Tasks ({viewingStudentData.assignedTasks.length})
          </Text>
          {/* Rendering logic uses helpers, no direct name display here */}
          {viewingStudentData.assignedTasks.length > 0 ? (
            <FlatList
              data={viewingStudentData.assignedTasks.sort(
                (a, b) => new Date(b.assignedDate).getTime() - new Date(a.assignedDate).getTime()
              )}
              keyExtractor={item => item.id}
              renderItem={({ item }) => (
                // Using adminSharedStyles for consistency in task item rendering
                <View style={adminSharedStyles.taskItem}>
                  <Text style={adminSharedStyles.taskItemTitle}>{getTaskTitle(item.taskId, taskLibrary)}</Text>
                  <Text style={adminSharedStyles.taskItemStatus}>
                    Status:{' '}
                    {item.isComplete
                      ? item.verificationStatus === 'pending'
                        ? 'Complete (Pending Verification)'
                        : `Verified (${item.verificationStatus})`
                      : 'Assigned'}
                  </Text>
                  {item.completedDate && (
                    <Text style={appSharedStyles.itemDetailText}>
                      Completed: {new Date(item.completedDate).toLocaleDateString()}
                    </Text>
                  )}
                  {item.verifiedDate && item.verificationStatus !== 'pending' && (
                    <Text style={appSharedStyles.itemDetailText}>
                      Verified: {new Date(item.verifiedDate).toLocaleDateString()}
                    </Text>
                  )}
                  {item.actualPointsAwarded !== undefined &&
                    item.verificationStatus !== 'pending' && (
                      <Text style={adminSharedStyles.taskItemTickets}>
                        Awarded: {item.actualPointsAwarded ?? 0} Tickets
                      </Text>
                    )}
                  {item.isComplete && item.verificationStatus === 'pending' && (
                    <Text style={adminSharedStyles.pendingNote}>Awaiting verification...</Text>
                  )}
                   <View style={adminSharedStyles.assignedTaskActions}>
                      {item.isComplete && item.verificationStatus === 'pending' && (
                          <Button
                              title="Verify Task" // Changed text
                              onPress={() => onInitiateVerificationModal(item)} // Call prop to open modal
                          />
                      )}
                       <Button
                           title="Delete (Mock)"
                           onPress={() =>
                               alert(`Mock Delete Task ${item.id}`) // Simple alert
                           }
                           color={colors.danger}
                       />
                   </View>
                </View>
              )}
              scrollEnabled={false}
              ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
              ListEmptyComponent={() => (
                <Text style={appSharedStyles.emptyListText}>No tasks assigned.</Text>
              )}
            />
          ) : (
            <Text style={appSharedStyles.emptyListText}>No tasks assigned.</Text>
          )}

          {/* Mock Buttons for other student actions */}
          <View
            style={{
              marginTop: 20,
              marginBottom: 20,
              flexDirection: 'row',
              justifyContent: 'space-around',
            }}
          >
            <Button
              title="View History (Mock)"
              onPress={() =>
                // Use display name
                alert(`Mock View History for ${studentDisplayName}`)
              }
            />
            <Button
              title="View Catalog (Mock)"
              onPress={() =>
                // Use display name
                alert(`Mock View Catalog in ${studentDisplayName}'s context`)
              }
            />
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // Render the main Teacher dashboard/section view
  const teacherDisplayName = getUserDisplayName(user);
  return (
    <SafeAreaView style={appSharedStyles.safeArea}>
      {/* Main Teacher Header */}
      <View style={appSharedStyles.headerContainer}>
         {/* Use display name */}
        <Text style={appSharedStyles.header}>Teacher Dashboard: {teacherDisplayName}</Text>
      </View>
      {/* Scrollable Content */}
      <ScrollView style={appSharedStyles.container}>
        {/* Navigation Buttons */}
        <View style={styles.teacherNav}>
          <Button
            title="Dashboard"
            onPress={() => setViewingSection('dashboard')}
            color={viewingSection === 'dashboard' ? colors.primary : colors.secondary}
          />
          <Button
            title="My Students"
            onPress={() => setViewingSection('students')}
            color={viewingSection === 'students' ? colors.primary : colors.secondary}
          />
          <Button
            title="Tasks"
            onPress={() => setViewingSection('tasks')}
            color={viewingSection === 'tasks' ? colors.primary : colors.secondary}
          />
        </View>

        {/* Dashboard Section */}
        {viewingSection === 'dashboard' && (
          <View>
            <Text style={appSharedStyles.sectionTitle}>
              Pending Verifications ({pendingVerifications.length})
            </Text>
            {pendingVerifications.length > 0 ? (
              <FlatList
                data={pendingVerifications.sort(
                  (a, b) =>
                    new Date(a.completedDate || a.assignedDate).getTime() -
                    new Date(b.completedDate || b.assignedDate).getTime()
                )}
                keyExtractor={item => item.id}
                renderItem={({ item }) => {
                  // Find the simplified student to get the display name
                  const studentInfo = allStudents.find(s => s.id === item.studentId);
                  return (
                    <PendingVerificationItem
                      task={item}
                      // Pass the pre-formatted display name
                      studentName={studentInfo?.name || 'Unknown Student'}
                      taskTitle={getTaskTitle(item.taskId, taskLibrary)}
                      taskLibrary={taskLibrary}
                      onInitiateVerification={onInitiateVerificationModal} // Prop to open modal
                    />
                  );
                }}
                scrollEnabled={false}
                ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
                ListEmptyComponent={() => (
                  <Text style={appSharedStyles.emptyListText}>No tasks pending verification.</Text>
                )}
              />
            ) : (
              <Text style={appSharedStyles.emptyListText}>No tasks pending verification.</Text>
            )}
          </View>
        )}

        {/* My Students Section */}
        {viewingSection === 'students' && (
          <View>
            <Text style={appSharedStyles.sectionTitle}>My Students ({studentsLinkedToTeacher.length})</Text>
            {studentsLinkedToTeacher.length > 0 ? (
              <FlatList
                // Use the simplified list which already has display names
                data={studentsLinkedToTeacher.sort((a, b) => a.name.localeCompare(b.name))}
                keyExtractor={item => item.id}
                renderItem={({ item }) => (
                  <StudentListItem
                    student={item} // Pass the simplified student object
                    mockInstruments={mockInstruments}
                    onViewProfile={setViewingStudentId} // Set state to navigate
                    onAssignTask={handleAssignTaskToStudent} // Call handler
                  />
                )}
                scrollEnabled={false}
                ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
                ListEmptyComponent={() => (
                  <Text style={appSharedStyles.emptyListText}>No students linked to you.</Text>
                )}
              />
            ) : (
              <Text style={appSharedStyles.emptyListText}>
                No students linked to you. Ask an Admin to link your students.
              </Text>
            )}

            {/* Mock Button to view all students */}
            <View style={{ marginTop: 20, alignItems: 'flex-start' }}>
              <Button
                title="View All Students (Mock)"
                onPress={() =>
                  alert('View All Students - Simulate viewing a list of all students.')
                }
              />
            </View>
          </View>
        )}

        {/* Tasks Section */}
        {viewingSection === 'tasks' && (
          <View>
            <Text style={appSharedStyles.sectionTitle}>Task Management</Text>

            <View style={{ alignItems: 'flex-start', marginBottom: 20 }}>
              <Button title="Assign Task (Mock Flow)" onPress={handleInitiateAssignTask} />
            </View>

            <Text style={adminSharedStyles.sectionSubTitle}>Task Library ({taskLibrary.length})</Text>
            {taskLibrary.length > 0 ? (
              <FlatList
                data={taskLibrary.sort((a, b) => a.title.localeCompare(b.title))}
                keyExtractor={item => item.id}
                renderItem={({ item }) => <TaskLibraryItemTeacher item={item} />}
                scrollEnabled={false}
                ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
                ListEmptyComponent={() => (
                  <Text style={appSharedStyles.emptyListText}>No task library items found.</Text>
                )}
              />
            ) : (
              <Text style={appSharedStyles.emptyListText}>Task library is empty.</Text>
            )}
          </View>
        )}
      </ScrollView>
      {/* Note: TaskVerificationModal is rendered in App.tsx */}
    </SafeAreaView>
  );
};

// Local styles for TeacherView
const styles = StyleSheet.create({
  teacherNav: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    marginBottom: 20,
    gap: 8,
  },
  studentActions: {
    flexDirection: 'row',
    justifyContent: 'space-around', // Or 'flex-end' depending on desired layout
    marginTop: 10,
    gap: 5, // Spacing between buttons
  },
  taskLibraryItemTickets: {
    fontSize: 13,
    color: colors.textSecondary, // Keep specific style for ticket display
    marginTop: 5,
    fontStyle: 'italic',
  },
});