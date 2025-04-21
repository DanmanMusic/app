
import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, Button, FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../contexts/AuthContext';
import { useData } from '../contexts/DataContext';
import { AssignedTask } from '../mocks/mockAssignedTasks';
import { TaskLibraryItem } from '../mocks/mockTaskLibrary';
import { Instrument } from '../mocks/mockInstruments';
import { SimplifiedStudent, StudentProfileData } from '../types/dataTypes';
import { getTaskTitle, getInstrumentNames, getUserDisplayName } from '../utils/helpers';
import { appSharedStyles } from '../styles/appSharedStyles';
import { colors } from '../styles/colors';
import { adminSharedStyles } from '../components/admin/adminSharedStyles';

interface TeacherViewProps {
    onInitiateVerificationModal: (task: AssignedTask) => void;
}

const PendingVerificationItem = ({
    task, studentName, taskTitle, taskLibrary, onInitiateVerification,
}: {
    task: AssignedTask; studentName: string; taskTitle: string; taskLibrary: TaskLibraryItem[]; onInitiateVerification: (task: AssignedTask) => void;
}) => {
    const taskDetail = taskLibrary.find(t => t.id === task.taskId);
    const baseTickets = taskDetail?.baseTickets ?? 0;
    const completedDateTime = task.completedDate ? new Date(task.completedDate).toLocaleString() : 'N/A';
    return (
        <View style={adminSharedStyles.pendingItem}>
            <Text style={adminSharedStyles.pendingTitle}>Task: {taskTitle}</Text>
            <Text style={adminSharedStyles.pendingDetail}>Student: {studentName}</Text>
            <Text style={adminSharedStyles.pendingDetail}>Potential Tickets: {baseTickets}</Text>
            <Text style={adminSharedStyles.pendingDetail}>Completed: {completedDateTime}</Text>
            <View style={{ marginTop: 10 }}>
                <Button title="Verify Task" onPress={() => onInitiateVerification(task)} />
            </View>
        </View>
    );
};

const StudentListItem = ({
    student, mockInstruments, onViewProfile, onAssignTask,
}: {
    student: SimplifiedStudent; mockInstruments: Instrument[]; onViewProfile: (studentId: string) => void; onAssignTask: (studentId: string) => void;
}) => (
    <View style={appSharedStyles.itemContainer}>
        <Text style={appSharedStyles.itemTitle}>{student.name}</Text>
        <Text style={appSharedStyles.itemDetailText}>Instrument(s): {getInstrumentNames(student.instrumentIds, mockInstruments)}</Text>
        <Text style={[appSharedStyles.itemDetailText, appSharedStyles.textGold]}>Balance: {student.balance} Tickets</Text>
        <View style={styles.studentActions}>
            <Button title="View Profile" onPress={() => onViewProfile(student.id)} />
            <Button title="Assign Task (Mock)" onPress={() => onAssignTask(student.id)} />
        </View>
    </View>
);

const TaskLibraryItemTeacher = ({ item }: { item: TaskLibraryItem }) => (
    <View style={appSharedStyles.itemContainer}>
        <Text style={appSharedStyles.itemTitle}>{item.title}</Text>
        <Text style={appSharedStyles.itemDetailText}>{item.description}</Text>
        <Text style={[appSharedStyles.itemDetailText, styles.taskLibraryItemTickets]}>{item.baseTickets} Base Tickets</Text>
    </View>
);

export const TeacherView: React.FC<TeacherViewProps> = ({
  onInitiateVerificationModal,
}) => {
  const { currentUserId } = useAuth();
  const {
    currentMockUsers, assignedTasks, ticketBalances, taskLibrary, mockInstruments, getMockStudentData, simulateAssignTask, simulateDeleteAssignedTask,
  } = useData();

  const [viewingSection, setViewingSection] = useState<'dashboard' | 'students' | 'tasks' | 'studentProfile'>('dashboard');
  const [viewingStudentId, setViewingStudentId] = useState<string | null>(null);

  const teacherUser = currentUserId ? currentMockUsers[currentUserId] : null;

  const allStudents = useMemo(() =>
      Object.values(currentMockUsers)
          .filter(u => u.role === 'student')
          .map(student => ({ id: student.id, name: getUserDisplayName(student), instrumentIds: student.instrumentIds, balance: ticketBalances[student.id] || 0 }))
          .sort((a, b) => a.name.localeCompare(b.name)), 
    [currentMockUsers, ticketBalances]
  );

  const studentsLinkedToTeacher = useMemo(() =>
      teacherUser ? allStudents.filter(student =>
          currentMockUsers[student.id]?.linkedTeacherIds?.includes(teacherUser.id)
      ) : [],
    [allStudents, teacherUser, currentMockUsers]
  );

  const pendingVerifications = useMemo(() =>
      teacherUser ? assignedTasks.filter(task =>
          task.isComplete &&
          task.verificationStatus === 'pending' &&
          currentMockUsers[task.studentId]?.linkedTeacherIds?.includes(teacherUser.id)
      ) : [],
    [assignedTasks, teacherUser, currentMockUsers]
  );
  
  const viewingStudentData: StudentProfileData | undefined | null = useMemo(() =>
      viewingStudentId ? getMockStudentData(viewingStudentId) : null,
    [viewingStudentId, getMockStudentData]
  );
  
  const handleAssignTaskToStudent = (studentId: string) => {
    const studentInfo = allStudents.find(s => s.id === studentId);
    const studentDisplayName = studentInfo ? studentInfo.name : studentId;
    alert(`Mock Assign Task to ${studentDisplayName}`);
  };

  const handleInitiateAssignTask = () => {
    alert('Mock Assign Task Flow - Select student(s), then select a task.');  
  };

  const handleRemoveAssignedTask = (assignmentId: string) => {
    simulateDeleteAssignedTask(assignmentId);
  };

  if (!teacherUser) {
    return <SafeAreaView style={appSharedStyles.safeArea}><Text>Loading Teacher Data...</Text></SafeAreaView>;
  }

  if (viewingStudentId && viewingStudentData) {
    
    const studentDisplayName = getUserDisplayName(viewingStudentData.user);
    return (
      <SafeAreaView style={appSharedStyles.safeArea}>
        <View style={appSharedStyles.headerContainer}>
          <Button
            title="← Back to Teacher"
            onPress={() => { setViewingStudentId(null); setViewingSection('students'); }}
          />
          <Text style={appSharedStyles.header}>{studentDisplayName}'s Profile</Text>
          <View style={{ width: 50 }} />
        </View>
        <ScrollView style={appSharedStyles.container}>
          <Text style={appSharedStyles.sectionTitle}>Student Details</Text>
          <Text style={appSharedStyles.itemDetailText}>Name: {studentDisplayName}</Text>
          <Text style={appSharedStyles.itemDetailText}>
            Instrument(s):{' '}
            {getInstrumentNames(viewingStudentData.user.instrumentIds, mockInstruments)}
          </Text>
          <Text style={[appSharedStyles.itemDetailText, appSharedStyles.textGold]}>Balance: {viewingStudentData.balance} Tickets</Text>

          <View style={{ marginTop: 20, marginBottom: 20, alignItems: 'flex-start' }}>
            <Button
              title={`Assign Task to ${studentDisplayName} (Mock)`}
              onPress={() => handleAssignTaskToStudent(viewingStudentData.user.id)}
            />
          </View>

          <Text style={appSharedStyles.sectionTitle}>
            Assigned Tasks ({viewingStudentData.assignedTasks.length})
          </Text>
          {viewingStudentData.assignedTasks.length > 0 ? (
            <FlatList
              data={viewingStudentData.assignedTasks.sort( (a, b) => new Date(b.assignedDate).getTime() - new Date(a.assignedDate).getTime() )}
              keyExtractor={item => item.id}
              renderItem={({ item }) => {
                  const allowDelete = !item.isComplete || item.verificationStatus === 'pending';
                  return (
                      <View style={adminSharedStyles.taskItem}>
                          <Text style={adminSharedStyles.taskItemTitle}>{getTaskTitle(item.taskId, taskLibrary)}</Text>
                          <Text style={adminSharedStyles.taskItemStatus}> Status:{' '} {item.isComplete ? item.verificationStatus === 'pending' ? 'Complete (Pending Verification)' : `Verified (${item.verificationStatus})` : 'Assigned'} </Text>
                          {item.completedDate && ( <Text style={appSharedStyles.itemDetailText}> Completed: {new Date(item.completedDate).toLocaleDateString()} </Text> )}
                          {item.verifiedDate && item.verificationStatus !== 'pending' && ( <Text style={appSharedStyles.itemDetailText}> Verified: {new Date(item.verifiedDate).toLocaleDateString()} </Text> )}
                          {item.actualPointsAwarded !== undefined && item.verificationStatus !== 'pending' && ( <Text style={adminSharedStyles.taskItemTickets}> Awarded: {item.actualPointsAwarded ?? 0} Tickets </Text> )}
                          {item.isComplete && item.verificationStatus === 'pending' && ( <Text style={adminSharedStyles.pendingNote}>Awaiting verification...</Text> )}
                          <View style={adminSharedStyles.assignedTaskActions}>
                              {item.isComplete && item.verificationStatus === 'pending' && ( <Button title="Verify Task" onPress={() => onInitiateVerificationModal(item)} /> )}
                              {allowDelete && ( <Button title="Remove" onPress={() => handleRemoveAssignedTask(item.id)} color={colors.danger}/> )}
                          </View>
                      </View>
                  );
              }}
              scrollEnabled={false}
              ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
              ListEmptyComponent={() => ( <Text style={appSharedStyles.emptyListText}>No tasks assigned.</Text> )}
            />
          ) : ( <Text style={appSharedStyles.emptyListText}>No tasks assigned.</Text> )}

          <View style={{ marginTop: 20, marginBottom: 20, flexDirection: 'row', justifyContent: 'space-around' }}>
            <Button title="View History (Mock)" onPress={() => alert(`Mock View History for ${studentDisplayName}`)} />
            <Button title="View Catalog (Mock)" onPress={() => alert(`Mock View Catalog in ${studentDisplayName}'s context`)} />
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  const teacherDisplayName = getUserDisplayName(teacherUser);
  return (
    <SafeAreaView style={appSharedStyles.safeArea}>
      <View style={appSharedStyles.headerContainer}>
        <Text style={appSharedStyles.header}>Teacher Dashboard: {teacherDisplayName}</Text>
      </View>
      <ScrollView style={appSharedStyles.container}>
        <View style={styles.teacherNav}>
          <Button title="Dashboard" onPress={() => setViewingSection('dashboard')} color={viewingSection === 'dashboard' ? colors.primary : colors.secondary} />
          <Button title="My Students" onPress={() => setViewingSection('students')} color={viewingSection === 'students' ? colors.primary : colors.secondary} />
          <Button title="Tasks" onPress={() => setViewingSection('tasks')} color={viewingSection === 'tasks' ? colors.primary : colors.secondary} />
        </View>

        {viewingSection === 'dashboard' && (
          <View>
            <Text style={appSharedStyles.sectionTitle}> Pending Verifications ({pendingVerifications.length}) </Text>
            {pendingVerifications.length > 0 ? (
              <FlatList
                data={pendingVerifications.sort( (a, b) => new Date(a.completedDate || a.assignedDate).getTime() - new Date(b.completedDate || b.assignedDate).getTime() )}
                keyExtractor={item => item.id}
                renderItem={({ item }) => {
                  const studentInfo = allStudents.find(s => s.id === item.studentId);
                  return ( <PendingVerificationItem task={item} studentName={studentInfo?.name || 'Unknown Student'} taskTitle={getTaskTitle(item.taskId, taskLibrary)} taskLibrary={taskLibrary} onInitiateVerification={onInitiateVerificationModal}/> );
                }}
                scrollEnabled={false}
                ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
                ListEmptyComponent={() => ( <Text style={appSharedStyles.emptyListText}>No tasks pending verification.</Text> )}
              />
            ) : ( <Text style={appSharedStyles.emptyListText}>No tasks pending verification.</Text> )}
          </View>
        )}

        {viewingSection === 'students' && (
          <View>
            <Text style={appSharedStyles.sectionTitle}>My Students ({studentsLinkedToTeacher.length})</Text>
            {studentsLinkedToTeacher.length > 0 ? (
              <FlatList
                data={studentsLinkedToTeacher} 
                keyExtractor={item => item.id}
                renderItem={({ item }) => ( <StudentListItem student={item} mockInstruments={mockInstruments} onViewProfile={setViewingStudentId} onAssignTask={handleAssignTaskToStudent}/> )}
                scrollEnabled={false}
                ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
                ListEmptyComponent={() => ( <Text style={appSharedStyles.emptyListText}>No students linked to you.</Text> )}
              />
            ) : ( <Text style={appSharedStyles.emptyListText}> No students linked to you. Ask an Admin to link your students. </Text> )}
            <View style={{ marginTop: 20, alignItems: 'flex-start' }}>
              <Button title="View All Students (Mock)" onPress={() => alert('View All Students - Simulate viewing a list of all students.')} />
            </View>
          </View>
        )}

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
                ListEmptyComponent={() => ( <Text style={appSharedStyles.emptyListText}>No task library items found.</Text> )}
              />
            ) : ( <Text style={appSharedStyles.emptyListText}>Task library is empty.</Text> )}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  teacherNav: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', marginBottom: 20, gap: 8, },
  studentActions: { flexDirection: 'row', justifyContent: 'space-around', marginTop: 10, gap: 5, },
  taskLibraryItemTickets: { fontSize: 13, color: colors.textSecondary, marginTop: 5, fontStyle: 'italic', },
});