// src/views/TeacherView.tsx
import React from 'react';
import { View, Text, StyleSheet, ScrollView, Button, Alert, FlatList, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { User } from '../mocks/mockUsers';
import { AssignedTask, TaskVerificationStatus } from '../mocks/mockAssignedTasks';
import { TaskLibraryItem } from '../mocks/mockTaskLibrary';
import { RewardItem } from '../mocks/mockRewards';
import { Instrument } from '../mocks/mockInstruments';

import { getTaskTitle, getInstrumentNames } from '../utils/helpers';

import { PupilViewProps } from './PupilView';

import { appSharedStyles } from '../styles/appSharedStyles';
import { colors } from '../styles/colors';
import { adminSharedStyles } from '../components/admin/adminSharedStyles';


interface SimplifiedStudent {
  id: string;
  name: string;
  instrumentIds?: string[];
  balance: number;
}

interface AssignedTaskSimplified {
  id: string;
  taskId: string;
  studentId: string;
  studentName?: string;
  assignedDate: string;
  isComplete: boolean;
  completedDate?: string;
  verificationStatus?: TaskVerificationStatus;
  actualPointsAwarded?: number;
}

interface TeacherViewProps {
  user: User;
  allStudents: SimplifiedStudent[];
  studentsLinkedToTeacher: SimplifiedStudent[];
  pendingVerifications: AssignedTask[];
  taskLibrary: TaskLibraryItem[];
  allAssignedTasks: AssignedTask[];
  rewardsCatalog: RewardItem[];
  mockInstruments: Instrument[];
  onVerifyTask: (taskId: string, status: TaskVerificationStatus, points: number) => void;
  onAssignTask: (taskId: string, studentId: string) => void;
  onReassignTaskMock: (taskId: string, studentId: string) => void;
  onInitiateVerificationModal: (task: AssignedTask) => void;

  onEditAssignedTask?: (assignedTaskId: string, updates: any) => void;
  onDeleteAssignedTask?: (assignedTaskId: string) => void;
  getStudentData: (studentId: string) => PupilViewProps | undefined;
}

const PendingVerificationItem = ({
  task,
  studentName,
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
    <View style={adminSharedStyles.pendingItem}>
      <Text style={adminSharedStyles.pendingTitle}>Task: {taskTitle}</Text>
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

const StudentListItem = ({
  student,
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
    <Text style={appSharedStyles.itemTitle}>{student.name}</Text>
    <Text style={appSharedStyles.itemDetailText}>Instrument(s): {getInstrumentNames(student.instrumentIds, mockInstruments)}</Text>
    <Text style={[appSharedStyles.itemDetailText, appSharedStyles.textGold]}>Balance: {student.balance} Tickets</Text>
    <View style={styles.studentActions}>
      <Button title="View Profile (Mock)" onPress={() => onViewProfile(student.id)} />
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
  user,
  allStudents,
  studentsLinkedToTeacher,
  pendingVerifications,
  taskLibrary,
  allAssignedTasks,
  rewardsCatalog,
  mockInstruments,
  onVerifyTask,
  onAssignTask,
  onReassignTaskMock,
  onInitiateVerificationModal,
  getStudentData,
}) => {
  const [viewingSection, setViewingSection] = React.useState<
    'dashboard' | 'students' | 'tasks' | 'catalog' | 'studentProfile'
  >('dashboard');
  const [viewingStudentId, setViewingStudentId] = React.useState<string | null>(null);
  const viewingStudentData = viewingStudentId ? getStudentData(viewingStudentId) : null;


  const handleAssignTaskToStudent = (studentId: string) => {
    Alert.prompt(
      'Mock Assign Task',
      `Assign which task (ID) from library to student ${studentId}? (e.g., tasklib-1)`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Assign',
          onPress: taskId => {
            if (taskId && taskLibrary.some(t => t.id === taskId)) {
              onAssignTask(taskId, studentId);
              Alert.alert('Mock Assign', `Task ${taskId} assigned to student ${studentId}`);
            } else {
              Alert.alert('Invalid Task ID', 'Please enter a valid task library ID.');
            }
          },
        },
      ],
      Platform.OS === 'ios' ? 'default' : 'plain-text'
    );
  };

  const handleInitiateAssignTask = () => {
    Alert.alert(
      'Mock Assign Task Flow',
      'Simulate initiating assignment: First select student(s), then select a task.'
    );
  };


  if (viewingStudentId && viewingStudentData) {
    return (
      <SafeAreaView style={appSharedStyles.safeArea}>
        <View style={appSharedStyles.headerContainer}>
          <Button
            title="← Back to Teacher"
            onPress={() => {
              setViewingStudentId(null);
              setViewingSection('students');
            }}
          />
          <Text style={appSharedStyles.header}>{viewingStudentData.user.name}'s Profile</Text>
          <View style={{ width: 50 }} />
        </View>
        <ScrollView style={appSharedStyles.container}>
          <Text style={appSharedStyles.sectionTitle}>Student Details</Text>
          <Text style={appSharedStyles.itemDetailText}>Name: {viewingStudentData.user.name}</Text>
          <Text style={appSharedStyles.itemDetailText}>
            Instrument(s):{' '}
            {getInstrumentNames(viewingStudentData.user.instrumentIds, mockInstruments)}
          </Text>
          <Text style={[appSharedStyles.itemDetailText, appSharedStyles.textGold]}>Balance: {viewingStudentData.balance} Tickets</Text>

          <View style={{ marginTop: 20, marginBottom: 20, alignItems: 'flex-start' }}>
            <Button
              title={`Assign Task to ${viewingStudentData.user.name} (Mock)`}
              onPress={() => handleAssignTaskToStudent(viewingStudentData.user.id)}
            />
          </View>

          <Text style={appSharedStyles.sectionTitle}>
            Assigned Tasks ({viewingStudentData.assignedTasks.length})
          </Text>
          {viewingStudentData.assignedTasks.length > 0 ? (
            <FlatList
              data={viewingStudentData.assignedTasks.sort(
                (a, b) => new Date(b.assignedDate).getTime() - new Date(a.assignedDate).getTime()
              )}
              keyExtractor={item => item.id}
              renderItem={({ item }) => (
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
                              title="Verify (Mock)"
                              onPress={() => onInitiateVerificationModal(item)}
                          />
                      )}
                       <Button
                           title="Delete (Mock)"
                           onPress={() =>
                               Alert.alert(
                                   'Mock Delete Task',
                                   `Simulate deleting assigned task ${item.id}`
                               )
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
                Alert.alert(
                  'Mock View History',
                  `Simulate viewing full history for ${viewingStudentData.user.name}`
                )
              }
            />
            <Button
              title="View Catalog (Mock)"
              onPress={() =>
                Alert.alert(
                  'Mock View Catalog',
                  `Simulate viewing rewards catalog in ${viewingStudentData.user.name}'s context`
                )
              }
            />
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={appSharedStyles.safeArea}>
      <View style={appSharedStyles.headerContainer}>
        <Text style={appSharedStyles.header}>Teacher Dashboard: {user.name}</Text>
      </View>
      <ScrollView style={appSharedStyles.container}>
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
                  const student = allStudents.find(s => s.id === item.studentId);
                  const taskDetail = taskLibrary.find(t => t.id === item.taskId);
                  return (
                    <PendingVerificationItem
                      task={item}
                      studentName={student?.name || 'Unknown Student'}
                      taskTitle={getTaskTitle(item.taskId, taskLibrary)}
                      taskLibrary={taskLibrary}
                      onInitiateVerification={onInitiateVerificationModal}
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

        {viewingSection === 'students' && (
          <View>
            <Text style={appSharedStyles.sectionTitle}>My Students ({studentsLinkedToTeacher.length})</Text>
            {studentsLinkedToTeacher.length > 0 ? (
              <FlatList
                data={studentsLinkedToTeacher.sort((a, b) => a.name.localeCompare(b.name))}
                keyExtractor={item => item.id}
                renderItem={({ item }) => (
                  <StudentListItem
                    student={item}
                    mockInstruments={mockInstruments}
                    onViewProfile={setViewingStudentId}
                    onAssignTask={handleAssignTaskToStudent}
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

            <View style={{ marginTop: 20, alignItems: 'flex-start' }}>
              <Button
                title="View All Students (Mock)"
                onPress={() =>
                  Alert.alert(
                    'View All Students',
                    'Simulate viewing a list of all students (requires permission).'
                  )
                }
              />
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
    </SafeAreaView>
  );
};

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
    justifyContent: 'space-around',
    marginTop: 10,
    gap: 5,
  },
  taskLibraryItemTickets: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 5,
    fontStyle: 'italic',
  },
});